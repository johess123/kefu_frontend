import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import {
    ChevronLeft,
    ChevronRight,
    ChevronRight as ChevronExpand,
    RefreshCcw,
    Loader2,
    Search,
    MessageSquareText,
    BrainCircuit,
    Zap,
    FileJson2,
    CheckCircle2,
    AlertTriangle,
    Minus,
    BarChart3,
    Package,
    Timer,
} from 'lucide-react';

/* ── Action badge types ── */

const ACTION_BADGES = {
    handoff: { label: 'HANDOFF', className: 'bg-red-100 text-red-700' },
    reply: { label: 'REPLY', className: 'bg-blue-100 text-blue-700' },
    analysis: { label: 'ANALYSIS', className: 'bg-purple-100 text-purple-700' },
    build: { label: 'BUILD', className: 'bg-indigo-100 text-indigo-700' },
};

/* ── Agent identity mapping ── */

const AGENT_IDENTITY = {
    faq_expert: { name: 'FAQ 客服專員', dot: 'bg-blue-500' },
    product_expert: { name: '商品庫專員', dot: 'bg-emerald-500' },
    handoff_expert: { name: '協作專員', dot: 'bg-orange-500' },
    conversation_analyst: { name: '數據分析師', dot: 'bg-purple-500' },
    builder: { name: 'Agent 建置', dot: 'bg-indigo-500' },
};

const SUBAGENT_PILL = {
    faq_expert: 'bg-blue-50 text-blue-700 border-blue-200',
    product_expert: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    handoff_expert: 'bg-orange-50 text-orange-700 border-orange-200',
    conversation_analyst: 'bg-purple-50 text-purple-700 border-purple-200',
    builder: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const SOURCE_DOT = {
    LINE: 'bg-green-500',
    Telegram: 'bg-blue-500',
    test: 'bg-slate-400',
    analysis: 'bg-purple-500',
    build: 'bg-indigo-500',
};

/* ── Derive card metadata from log entry ── */

function deriveCardMeta(log) {
    const events = log.events || [];
    const isAnalysis = log.log_type === 'analysis';
    const isBuild = log.source === 'build' || (log.log_type && log.log_type.startsWith('build_'));

    // Find primary event (priority: handoff > product > faq > analysis > build)
    const handoffEvt = events.find(e => e.action === 'handoff_triggered');
    const productEvt = events.find(e => e.action === 'product_matched');
    const faqEvt = events.find(e => e.action === 'faq_matched');
    const analysisEvt = events.find(e => e.action === 'analysis_completed');
    const buildEvt = events.find(e => ['faq_generated', 'faq_optimized', 'faq_health_checked', 'website_crawled', 'form_parsed'].includes(e.action));

    let agentKey = 'faq_expert';
    let actionType = 'reply';
    let summary = '';

    if (isBuild || buildEvt) {
        agentKey = 'builder';
        actionType = 'build';
        const d = buildEvt?.detail || {};
        if (buildEvt?.action === 'faq_generated') summary = `生成 FAQ ${d.count ?? 0} 筆`;
        else if (buildEvt?.action === 'faq_optimized') summary = `優化 FAQ：${d.original_q || ''}`;
        else if (buildEvt?.action === 'faq_health_checked') summary = `FAQ 健檢：評分 ${d.score ?? 0} 分，建議 ${d.suggestion_count ?? 0} 則`;
        else if (buildEvt?.action === 'website_crawled') summary = `爬取網站：${d.url || ''}`;
        else if (buildEvt?.action === 'form_parsed') summary = `解析表單：${d.merchant_name || ''}`;
        else summary = '執行 Agent 建置操作';
    } else if (isAnalysis || analysisEvt) {
        agentKey = 'conversation_analyst';
        actionType = 'analysis';
        const d = analysisEvt?.detail || {};
        summary = `執行對話分析：${d.total_conversations ?? 0} 則對話，覆蓋率 ${d.coverage_rate ?? 0}%`;
    } else if (handoffEvt) {
        agentKey = 'handoff_expert';
        actionType = 'handoff';
        summary = `偵測到轉接需求，已攔截並轉交真人`;
    } else if (productEvt) {
        agentKey = 'product_expert';
        actionType = 'reply';
        const names = productEvt.detail?.matched_products || [];
        summary = `匹配商品: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}`;
    } else if (faqEvt) {
        agentKey = 'faq_expert';
        actionType = 'reply';
        const faqs = faqEvt.detail?.matched_faqs || [];
        const q = faqs[0]?.Q || faqs[0]?.question || '';
        summary = q ? `回答 FAQ: ${q}` : '回答 FAQ 相關問題';
    } else {
        summary = log.ai_response ? log.ai_response.slice(0, 60) + (log.ai_response.length > 60 ? '...' : '') : '處理使用者訊息';
    }

    const agent = AGENT_IDENTITY[agentKey] || { name: 'AI 主控', dot: 'bg-slate-400' };
    const badge = ACTION_BADGES[actionType];

    return { agent, badge, summary, agentKey, actionType, events, isAnalysis, isBuild, handoffEvt, faqEvt, productEvt, analysisEvt, buildEvt };
}

/* ── Build reasoning lines from events ── */

function buildReasoning(events) {
    const lines = [];
    const pills = [];

    for (const evt of events) {
        if (evt.action === 'faq_matched') {
            const faqs = evt.detail?.matched_faqs || [];
            lines.push(`檢索知識庫發現 ${faqs.length} 筆高關聯 FAQ。`);
            faqs.slice(0, 4).forEach(f => {
                const q = f.Q || f.question || '';
                if (q) pills.push({ label: q, type: 'faq_expert' });
            });
        } else if (evt.action === 'faq_no_match') {
            lines.push('檢索知識庫，未找到匹配的 FAQ。');
        } else if (evt.action === 'product_matched') {
            const names = evt.detail?.matched_products || [];
            lines.push(`匹配到 ${names.length} 項商品。`);
            names.slice(0, 4).forEach(n => {
                pills.push({ label: n, type: 'product_expert' });
            });
        } else if (evt.action === 'handoff_triggered') {
            const reason = evt.detail?.reason || '';
            lines.push(`觸發轉接規則。${reason ? `原因: ${reason}` : ''}`);
            if (reason) pills.push({ label: `Rule: ${reason.slice(0, 30)}`, type: 'handoff_expert' });
        } else if (evt.action === 'handoff_not_triggered') {
            lines.push('已檢查轉接條件，未觸發轉接。');
        } else if (evt.action === 'analysis_completed') {
            const d = evt.detail || {};
            lines.push(`分析 ${d.total_conversations ?? 0} 則對話，覆蓋率 ${d.coverage_rate ?? 0}%，產生 ${d.suggestions_generated ?? 0} 則建議。`);
        } else if (evt.action === 'faq_generated') {
            const d = evt.detail || {};
            lines.push(`AI 生成 ${d.count ?? 0} 筆 FAQ。`);
        } else if (evt.action === 'faq_optimized') {
            const d = evt.detail || {};
            lines.push(`優化 FAQ 問題。`);
            if (d.original_q) pills.push({ label: `原始: ${d.original_q.slice(0, 30)}`, type: 'builder' });
            if (d.optimized_q) pills.push({ label: `優化後: ${d.optimized_q.slice(0, 30)}`, type: 'builder' });
        } else if (evt.action === 'faq_health_checked') {
            const d = evt.detail || {};
            lines.push(`FAQ 健檢完成，評分 ${d.score ?? 0} 分，產生 ${d.suggestion_count ?? 0} 則優化建議。`);
        } else if (evt.action === 'website_crawled') {
            const d = evt.detail || {};
            lines.push(`爬取商家網站內容。`);
            if (d.url) pills.push({ label: d.url.slice(0, 40), type: 'builder' });
        } else if (evt.action === 'form_parsed') {
            const d = evt.detail || {};
            lines.push(`解析商家表單，識別商家名稱：${d.merchant_name || ''}。`);
        }
    }

    return { lines, pills };
}

/* ── helpers ── */

const truncateSession = (id) => {
    if (!id) return '';
    return `S-${id.slice(-4).toUpperCase()}`;
};

/* ── Detail Card (expanded) ── */

const LogDetail = ({ log, meta }) => {
    const { isAnalysis, actionType } = meta;
    const reasoning = buildReasoning(meta.events);
    const [showJson, setShowJson] = useState(false);

    const outputBg = actionType === 'handoff'
        ? 'bg-red-50 border-red-100'
        : 'bg-slate-50 border-slate-100';

    return (
        <div className="mt-3 ml-[72px] mr-4 space-y-4 pb-1">
            {/* TRIGGER / INPUT */}
            {!isAnalysis && log.user_message && (
                <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <MessageSquareText size={13} className="text-slate-400" />
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trigger / Input</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-2.5">
                        <p className="text-sm text-slate-700 leading-relaxed">{log.user_message}</p>
                    </div>
                </div>
            )}

            {/* AI REASONING */}
            {reasoning.lines.length > 0 && (
                <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <BrainCircuit size={13} className="text-slate-400" />
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Reasoning (思維鏈)</span>
                    </div>
                    <div className="space-y-2">
                        {reasoning.lines.map((line, i) => (
                            <p key={i} className="text-sm text-slate-600 leading-relaxed">{line}</p>
                        ))}
                        {reasoning.pills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {reasoning.pills.map((pill, i) => (
                                    <span
                                        key={i}
                                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border cursor-default ${SUBAGENT_PILL[pill.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                    >
                                        {pill.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ACTION / OUTPUT */}
            {!isAnalysis && log.ai_response && (
                <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Zap size={13} className="text-slate-400" />
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action / Output</span>
                    </div>
                    <div className={`border rounded-lg px-3.5 py-2.5 ${outputBg}`}>
                        <p className="text-sm text-slate-700 leading-relaxed">{log.ai_response}</p>
                    </div>
                </div>
            )}

            {/* Footer: stats + JSON toggle */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                        <Timer size={11} />
                        {log.duration_ms?.toLocaleString()}ms
                    </span>
                </div>
                <button
                    onClick={() => setShowJson(!showJson)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                    <FileJson2 size={12} />
                    {showJson ? '隱藏' : '查看原始'} JSON
                </button>
            </div>

            {/* Raw JSON */}
            {showJson && (
                <pre className="bg-slate-900 text-slate-300 text-[11px] rounded-lg p-3 overflow-x-auto max-h-64">
                    {JSON.stringify(log, null, 2)}
                </pre>
            )}
        </div>
    );
};

/* ── Main component ── */

const ActivityLogView = ({ agentId, userId }) => {
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logPage, setLogPage] = useState(1);
    const [logTotal, setLogTotal] = useState(0);
    const [sourceFilter, setSourceFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState(new Set());

    const fetchLogs = useCallback(async () => {
        if (!agentId || !userId) return;
        setLogsLoading(true);
        try {
            const params = { agentId, userId, page: logPage, limit: 30 };
            const res = await axios.get(`${config.API_URL}/api/activity/logs`, { params });
            setLogs(res.data.logs || []);
            setLogTotal(res.data.total || 0);
        } catch (e) {
            console.error('Failed to fetch logs', e);
        } finally {
            setLogsLoading(false);
        }
    }, [agentId, userId, logPage]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const formatTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    // Client-side filters
    const filteredLogs = logs.filter(log => {
        if (sourceFilter && log.source !== sourceFilter) return false;
        if (actionFilter) {
            const meta = deriveCardMeta(log);
            if (meta.actionType !== actionFilter) return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const searchable = [
                log.user_message,
                log.ai_response,
                log.session_id,
                log.trace_id,
            ].filter(Boolean).join(' ').toLowerCase();
            if (!searchable.includes(q)) return false;
        }
        return true;
    });

    const totalPages = Math.ceil(logTotal / 30);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                    團隊運作日誌 (Team Activity Logs)
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    即時監控每位 Agent 的決策邏輯、資料引用與執行結果，確保行為可追溯。
                </p>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
                <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                >
                    <option value="">所有來源</option>
                    <option value="LINE">LINE</option>
                    <option value="Telegram">Telegram</option>
                    <option value="test">測試</option>
                    <option value="analysis">分析</option>
                    <option value="build">建置</option>
                </select>
                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                >
                    <option value="">所有動作</option>
                    <option value="reply">REPLY</option>
                    <option value="handoff">HANDOFF</option>
                    <option value="analysis">ANALYSIS</option>
                </select>
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜尋 Session ID、客戶訊息或內容..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                </div>
                <button
                    onClick={fetchLogs}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors duration-200"
                    title="重新整理"
                >
                    <RefreshCcw size={18} />
                </button>
            </div>

            {/* Timeline */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                {logsLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="animate-spin text-slate-300" size={28} />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-16">尚無活動紀錄</div>
                ) : (
                    <div className="space-y-px">
                        {filteredLogs.map((log) => {
                            const meta = deriveCardMeta(log);
                            const isExpanded = expandedIds.has(log._id);

                            return (
                                <div
                                    key={log._id}
                                    className={`bg-white border border-slate-100 rounded-xl transition-all duration-200 ${isExpanded ? 'shadow-sm ring-1 ring-slate-200' : 'hover:bg-slate-50'}`}
                                >
                                    {/* ── Collapsed header row ── */}
                                    <button
                                        onClick={() => toggleExpand(log._id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
                                    >
                                        {/* Timestamp */}
                                        <span className="text-[12px] font-mono text-slate-400 tabular-nums w-[72px] flex-shrink-0">
                                            {formatTime(log.created_at)}
                                        </span>

                                        {/* Agent dot + name */}
                                        <span className="flex items-center gap-1.5 w-[100px] flex-shrink-0">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.agent.dot}`} />
                                            <span className="text-sm font-medium text-slate-700 truncate">
                                                {meta.agent.name}
                                            </span>
                                        </span>

                                        {/* Action badge */}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 tracking-wide ${meta.badge.className}`}>
                                            {meta.badge.label}
                                        </span>

                                        {/* Summary */}
                                        <span className="text-sm text-slate-600 truncate flex-1 min-w-0">
                                            {meta.summary}
                                        </span>

                                        {/* Right side: session ID + source dot + expand icon */}
                                        <span className="flex items-center gap-2.5 flex-shrink-0">
                                            {log.session_id && (
                                                <span className="text-[11px] font-mono text-slate-400" title={log.session_id}>
                                                    {truncateSession(log.session_id)}
                                                </span>
                                            )}
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SOURCE_DOT[log.source] || SOURCE_DOT.test}`} title={log.source} />
                                            <ChevronExpand
                                                size={16}
                                                className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                            />
                                        </span>
                                    </button>

                                    {/* ── Expanded detail ── */}
                                    {isExpanded && (
                                        <LogDetail log={log} meta={meta} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {logTotal > 30 && (
                <div className="flex items-center justify-center gap-3 mt-4 py-3">
                    <button
                        disabled={logPage <= 1}
                        onClick={() => setLogPage(p => p - 1)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors duration-200"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-slate-500 tabular-nums">
                        {logPage} / {totalPages}
                    </span>
                    <button
                        disabled={logPage * 30 >= logTotal}
                        onClick={() => setLogPage(p => p + 1)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors duration-200"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityLogView;
