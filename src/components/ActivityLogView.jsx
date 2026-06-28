import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import {
    ChevronLeft,
    ChevronRight,
    ChevronRight as ChevronExpand,
    ArrowLeft,
    RefreshCcw,
    Loader2,
    MessageSquareText,
    MessagesSquare,
    Zap,
    FileJson2,
    Timer,
    Coins,
    Package,
    HelpCircle,
    PhoneForwarded,
    Wrench,
    Sparkles,
    Stethoscope,
    Globe,
    FileText,
    BarChart3,
    Upload,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   Constants
   ════════════════════════════════════════════════════════════ */

/* Chat channels (source values written by the backend) */
const CHANNEL_META = {
    LINE: { label: 'LINE', pill: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    Telegram: { label: 'Telegram', pill: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
    // 後台測試聊天現行存成 "web"；"test" 為早期沒帶 source 時的 fallback 殘留，兩者同義。
    web: { label: '後台測試', pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
    test: { label: '後台測試', pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};
const channelMeta = (s) => CHANNEL_META[s] || { label: s || '未知', pill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' };

const CHANNEL_OPTIONS = [
    { value: '', label: '所有渠道' },
    { value: 'LINE', label: 'LINE' },
    { value: 'Telegram', label: 'Telegram' },
    { value: 'web', label: '後台測試' },
];

/* Build / config log types */
const BUILD_META = {
    build_faq: { label: '生成 FAQ', icon: Sparkles, pill: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    build_faq_optimize: { label: '優化 FAQ', icon: Wrench, pill: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
    build_faq_health: { label: 'FAQ 健檢', icon: Stethoscope, pill: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
    build_crawl: { label: '爬取網站', icon: Globe, pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    build_form: { label: '解析表單', icon: FileText, pill: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
    build_services_optimize: { label: '優化服務內容', icon: Zap, pill: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
    build_faq_import: { label: '匯入 FAQ', icon: Upload, pill: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    build_product_import: { label: '匯入商品', icon: Upload, pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    analysis: { label: '對話分析', icon: BarChart3, pill: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
};
const buildMeta = (t) => BUILD_META[t] || { label: '建置操作', icon: Wrench, pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };

const BUILD_TYPE_OPTIONS = [
    { value: '', label: '所有類型' },
    { value: 'build_faq', label: '生成 FAQ' },
    { value: 'build_faq_optimize', label: '優化 FAQ' },
    { value: 'build_faq_health', label: 'FAQ 健檢' },
    { value: 'build_crawl', label: '爬取網站' },
    { value: 'build_form', label: '解析表單' },
    { value: 'build_services_optimize', label: '優化服務內容' },
    { value: 'build_faq_import', label: '匯入 FAQ' },
    { value: 'build_product_import', label: '匯入商品' },
    { value: 'analysis', label: '對話分析' },
];

const PAGE_SIZE = 20;

/* ════════════════════════════════════════════════════════════
   Shared helpers
   ════════════════════════════════════════════════════════════ */

const formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
};

const formatClock = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

// 商家可見的計費單位為「點數(coins)」；token 為開發者內部指標，不在此頁顯示。
// coins_used 為 null（多為早期未記錄的資料）時顯示「—」。
const formatCoins = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');

const truncateSession = (id) => (id ? `S-${id.slice(-4).toUpperCase()}` : '—');

/* Normalize a matched product entry — backend used to store plain names
   (string), now stores { id, name, description }. Support both. */
const normalizeProduct = (p) => {
    if (typeof p === 'string') return { name: p, description: '' };
    if (p && typeof p === 'object') return { id: p.id, name: p.name || '', description: p.description || '' };
    return { name: String(p ?? ''), description: '' };
};

/* Normalize a matched FAQ entry — shape may be {Q,A} or {question,answer}. */
const normalizeFaq = (f) => ({
    q: f?.Q || f?.question || '',
    a: f?.A || f?.answer || '',
});

/* Build the retrieval / reasoning model from a chat log's events. */
function extractRetrieval(events = []) {
    const result = { faqs: [], faqMiss: false, products: [], handoff: null, handoffChecked: false };
    for (const evt of events) {
        switch (evt.action) {
            case 'faq_matched':
                result.faqs = (evt.detail?.matched_faqs || []).map(normalizeFaq).filter(f => f.q);
                break;
            case 'faq_no_match':
                result.faqMiss = true;
                break;
            case 'product_matched':
                result.products = (evt.detail?.matched_products || []).map(normalizeProduct).filter(p => p.name);
                break;
            case 'handoff_triggered':
                result.handoff = { triggered: true, reason: evt.detail?.reason || '' };
                break;
            case 'handoff_not_triggered':
                result.handoffChecked = true;
                result.handoff = { triggered: false, reason: evt.detail?.reason || '' };
                break;
            default:
                break;
        }
    }
    return result;
}

/* ════════════════════════════════════════════════════════════
   Section label
   ════════════════════════════════════════════════════════════ */

const SectionLabel = ({ icon: Icon, children }) => (
    <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className="text-slate-400" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{children}</span>
    </div>
);

/* ════════════════════════════════════════════════════════════
   Chat turn detail (one execution record inside a session)
   ════════════════════════════════════════════════════════════ */

const ChatTurnDetail = ({ log }) => {
    const r = extractRetrieval(log.events);
    const [showJson, setShowJson] = useState(false);
    const isHandoff = r.handoff?.triggered;

    return (
        <div className="mt-3 space-y-4 pb-1">
            {/* Retrieval: FAQ */}
            {r.faqs.length > 0 && (
                <div>
                    <SectionLabel icon={HelpCircle}>檢索到的 FAQ ({r.faqs.length})</SectionLabel>
                    <div className="space-y-1.5">
                        {r.faqs.map((f, i) => (
                            <div key={i} className="bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
                                <p className="text-[13px] font-medium text-slate-700">Q：{f.q}</p>
                                {f.a && <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">A：{f.a}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {r.faqMiss && r.faqs.length === 0 && (
                <p className="text-[12px] text-slate-400 italic">檢索知識庫，未找到匹配的 FAQ。</p>
            )}

            {/* Retrieval: Products */}
            {r.products.length > 0 && (
                <div>
                    <SectionLabel icon={Package}>檢索到的商品 ({r.products.length})</SectionLabel>
                    <div className="space-y-1.5">
                        {r.products.map((p, i) => (
                            <div key={i} className="bg-emerald-50/60 border border-emerald-100 rounded-lg px-3 py-2">
                                <p className="text-[13px] font-medium text-slate-700">{p.name}</p>
                                {p.description && <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{p.description}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Handoff */}
            {r.handoff && (
                <div>
                    <SectionLabel icon={PhoneForwarded}>轉接判斷</SectionLabel>
                    <div className={`border rounded-lg px-3 py-2 text-[13px] ${isHandoff ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        {isHandoff ? '已攔截並轉交真人客服。' : '已檢查轉接條件，未觸發轉接。'}
                        {r.handoff.reason && <span className="block text-[12px] mt-0.5 opacity-80">原因：{r.handoff.reason}</span>}
                    </div>
                </div>
            )}

            {/* AI response */}
            {log.ai_response && (
                <div>
                    <SectionLabel icon={Zap}>Agent 回覆</SectionLabel>
                    <div className={`border rounded-lg px-3.5 py-2.5 ${isHandoff ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{log.ai_response}</p>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    {typeof log.duration_ms === 'number' && (
                        <span className="flex items-center gap-1"><Timer size={11} />{log.duration_ms.toLocaleString()}ms</span>
                    )}
                    <span className="flex items-center gap-1"><Coins size={11} />{formatCoins(log.coins_used)} 點</span>
                </div>
                <button
                    onClick={() => setShowJson(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                    <FileJson2 size={12} />{showJson ? '隱藏' : '查看原始'} JSON
                </button>
            </div>
            {showJson && (
                <pre className="bg-slate-900 text-slate-300 text-[11px] rounded-lg p-3 overflow-x-auto max-h-64">
                    {JSON.stringify(log, null, 2)}
                </pre>
            )}
        </div>
    );
};

/* One turn = user bubble row + expandable execution detail */
const ChatTurn = ({ log }) => {
    const [open, setOpen] = useState(false);
    const r = extractRetrieval(log.events);
    const isHandoff = r.handoff?.triggered;

    // tiny tags summarizing what happened this turn
    const tags = [];
    if (r.faqs.length) tags.push({ label: `FAQ ×${r.faqs.length}`, cls: 'bg-blue-50 text-blue-600' });
    if (r.products.length) tags.push({ label: `商品 ×${r.products.length}`, cls: 'bg-emerald-50 text-emerald-600' });
    if (isHandoff) tags.push({ label: '轉真人', cls: 'bg-red-50 text-red-600' });

    return (
        <div className={`rounded-xl border transition-all ${open ? 'border-slate-200 shadow-sm bg-white' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
            <button onClick={() => setOpen(v => !v)} className="w-full text-left px-4 py-3 cursor-pointer">
                <div className="flex items-start gap-3">
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums pt-0.5 flex-shrink-0 w-[52px]">
                        {formatClock(log.created_at)}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">{log.user_message || <span className="italic text-slate-400">（無使用者訊息）</span>}</p>
                        <p className="text-[12px] text-slate-400 truncate mt-0.5">{log.ai_response}</p>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {tags.map((t, i) => (
                                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.cls}`}>{t.label}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <ChevronExpand size={16} className={`text-slate-300 flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-90' : ''}`} />
                </div>
            </button>
            {open && <div className="px-4"><ChatTurnDetail log={log} /></div>}
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   Chat tab — session list + session detail
   ════════════════════════════════════════════════════════════ */

const ChatTab = ({ agentId, userId }) => {
    const [channel, setChannel] = useState('');
    const [sessions, setSessions] = useState([]);
    const [sessLoading, setSessLoading] = useState(false);
    const [sessPage, setSessPage] = useState(1);
    const [sessTotal, setSessTotal] = useState(0);
    const [activeSession, setActiveSession] = useState(null); // {session_id, source}

    const fetchSessions = useCallback(async () => {
        if (!agentId || !userId) return;
        setSessLoading(true);
        try {
            const params = { agentId, userId, page: sessPage, limit: PAGE_SIZE };
            if (channel) params.source = channel;
            const res = await axios.get(`${config.API_URL}/api/activity/sessions`, { params });
            setSessions(res.data.sessions || []);
            setSessTotal(res.data.total || 0);
        } catch (e) {
            console.error('Failed to fetch sessions', e);
        } finally {
            setSessLoading(false);
        }
    }, [agentId, userId, sessPage, channel]);

    useEffect(() => { if (!activeSession) fetchSessions(); }, [fetchSessions, activeSession]);
    useEffect(() => { setSessPage(1); }, [channel]);

    if (activeSession) {
        return <SessionDetail agentId={agentId} userId={userId} session={activeSession} onBack={() => setActiveSession(null)} />;
    }

    const totalPages = Math.ceil(sessTotal / PAGE_SIZE);

    return (
        <div>
            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-4">
                <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                >
                    {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="text-[12px] text-slate-400">{sessTotal} 段對話</span>
                <button
                    onClick={fetchSessions}
                    className="ml-auto p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    title="重新整理"
                >
                    <RefreshCcw size={18} />
                </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {sessLoading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-300" size={28} /></div>
                ) : sessions.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-16">尚無對話紀錄</div>
                ) : (
                    <div className="space-y-1.5">
                        {sessions.map((s) => {
                            const cm = channelMeta(s.source);
                            return (
                                <button
                                    key={s.session_id}
                                    onClick={() => setActiveSession({ session_id: s.session_id, source: s.source })}
                                    className="w-full text-left flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 cursor-pointer transition-all"
                                >
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${cm.pill}`}>{cm.label}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-800 truncate">{s.last_user_message || <span className="italic text-slate-400">（無訊息）</span>}</p>
                                        <p className="text-[12px] text-slate-400 truncate mt-0.5">{s.last_ai_response}</p>
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0 gap-1">
                                        <span className="text-[11px] text-slate-400 tabular-nums">{formatDateTime(s.last_activity)}</span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><MessagesSquare size={11} />{s.total_logs} 則</span>
                                    </div>
                                    <ChevronExpand size={16} className="text-slate-300 flex-shrink-0" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {sessTotal > PAGE_SIZE && (
                <Pagination page={sessPage} totalPages={totalPages} onPrev={() => setSessPage(p => p - 1)} onNext={() => setSessPage(p => p + 1)} />
            )}
        </div>
    );
};

const SessionDetail = ({ agentId, userId, session, onBack }) => {
    const [turns, setTurns] = useState([]);
    const [loading, setLoading] = useState(false);
    const cm = channelMeta(session.source);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const params = { agentId, userId, sessionId: session.session_id, category: 'chat', sort: 'asc', limit: 200 };
                const res = await axios.get(`${config.API_URL}/api/activity/logs`, { params });
                if (!cancelled) setTurns(res.data.logs || []);
            } catch (e) {
                console.error('Failed to fetch session turns', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [agentId, userId, session.session_id]);

    const hasCoins = turns.some(t => typeof t.coins_used === 'number');
    const totalCoins = turns.reduce((sum, t) => sum + (t.coins_used || 0), 0);

    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 cursor-pointer">
                    <ArrowLeft size={16} />返回對話列表
                </button>
            </div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cm.pill}`}>{cm.label}</span>
                <span className="text-sm font-mono text-slate-500" title={session.session_id}>{truncateSession(session.session_id)}</span>
                <span className="text-[12px] text-slate-400">· {turns.length} 則往來</span>
                {hasCoins && <span className="text-[12px] text-slate-400 flex items-center gap-1"><Coins size={12} />共 {formatCoins(totalCoins)} 點</span>}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {loading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-300" size={28} /></div>
                ) : turns.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-16">此對話沒有執行紀錄</div>
                ) : (
                    <div className="space-y-2">
                        {turns.map((log) => <ChatTurn key={log._id} log={log} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   Build tab — build / config activity timeline
   ════════════════════════════════════════════════════════════ */

function buildSummary(log) {
    const evt = (log.events || [])[0] || {};
    const d = evt.detail || {};
    switch (log.log_type) {
        case 'build_faq': return `生成 FAQ ${d.count ?? 0} 筆`;
        case 'build_faq_optimize': return `優化 FAQ：${d.original_q || ''}`;
        case 'build_faq_health': return `FAQ 健檢：評分 ${d.score ?? 0} 分，建議 ${d.suggestion_count ?? 0} 則`;
        case 'build_crawl': return `爬取網站：${d.url || ''}`;
        case 'build_form': return `解析表單：${d.merchant_name || ''}`;
        case 'build_services_optimize': return `優化服務內容：${d.business_name || ''}`;
        case 'build_faq_import': return `匯入 FAQ ${d.count ?? 0} 筆`;
        case 'build_product_import': return `匯入商品 ${d.count ?? 0} 筆`;
        case 'analysis': return `分析 ${d.total_conversations ?? 0} 則對話，覆蓋率 ${d.coverage_rate ?? 0}%`;
        default: return '執行建置 / 調整操作';
    }
}

const BuildDetail = ({ log }) => {
    const evt = (log.events || [])[0] || {};
    const d = evt.detail || {};
    const [showJson, setShowJson] = useState(false);

    return (
        <div className="mt-3 space-y-4 pb-1">
            {log.log_type === 'build_faq_optimize' && (d.original_q || d.optimized_q) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-slate-400 mb-0.5">原始問題</p>
                        <p className="text-[13px] text-slate-600">{d.original_q || '—'}</p>
                    </div>
                    <div className="bg-violet-50/60 border border-violet-100 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-violet-500 mb-0.5">優化後</p>
                        <p className="text-[13px] text-slate-700">{d.optimized_q || '—'}</p>
                    </div>
                </div>
            )}

            {log.log_type === 'build_faq_health' && (
                <div className="flex items-center gap-4">
                    <div className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-2 text-center">
                        <p className="text-2xl font-bold text-teal-600 tabular-nums">{d.score ?? 0}</p>
                        <p className="text-[11px] text-slate-400">健檢評分</p>
                    </div>
                    <p className="text-sm text-slate-600">產生 <span className="font-semibold">{d.suggestion_count ?? 0}</span> 則優化建議</p>
                </div>
            )}

            {log.log_type === 'analysis' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                        { k: '對話數', v: d.total_conversations ?? 0 },
                        { k: '命中', v: d.faq_hits ?? 0 },
                        { k: '未命中', v: d.faq_misses ?? 0 },
                        { k: '覆蓋率', v: `${d.coverage_rate ?? 0}%` },
                    ].map((s, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-center">
                            <p className="text-lg font-bold text-slate-700 tabular-nums">{s.v}</p>
                            <p className="text-[11px] text-slate-400">{s.k}</p>
                        </div>
                    ))}
                </div>
            )}

            {(log.log_type === 'build_crawl' && d.url) && (
                <div className="bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-amber-600 mb-0.5">來源網址</p>
                    <p className="text-[13px] text-slate-700 break-all">{d.url}</p>
                </div>
            )}

            {(log.log_type === 'build_form' && d.merchant_name) && (
                <div className="bg-cyan-50/60 border border-cyan-100 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-cyan-600 mb-0.5">識別商家</p>
                    <p className="text-[13px] text-slate-700">{d.merchant_name}</p>
                </div>
            )}

            {(log.log_type === 'build_services_optimize' && d.business_name) && (
                <div className="bg-rose-50/60 border border-rose-100 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-rose-600 mb-0.5">商家</p>
                    <p className="text-[13px] text-slate-700">{d.business_name}</p>
                </div>
            )}

            {(log.log_type === 'build_faq' && d.count != null) && (
                <p className="text-sm text-slate-600">AI 共生成 <span className="font-semibold">{d.count}</span> 筆 FAQ。</p>
            )}

            {(log.log_type === 'build_faq_import' && d.count != null) && (
                <p className="text-sm text-slate-600">AI 解析並匯入 <span className="font-semibold">{d.count}</span> 筆 FAQ。</p>
            )}

            {(log.log_type === 'build_product_import' && d.count != null) && (
                <p className="text-sm text-slate-600">AI 解析並匯入 <span className="font-semibold">{d.count}</span> 筆商品。</p>
            )}

            <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    {typeof log.duration_ms === 'number' && (
                        <span className="flex items-center gap-1"><Timer size={11} />{log.duration_ms.toLocaleString()}ms</span>
                    )}
                    <span className="flex items-center gap-1"><Coins size={11} />{formatCoins(log.coins_used)} 點</span>
                </div>
                <button onClick={() => setShowJson(v => !v)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                    <FileJson2 size={12} />{showJson ? '隱藏' : '查看原始'} JSON
                </button>
            </div>
            {showJson && (
                <pre className="bg-slate-900 text-slate-300 text-[11px] rounded-lg p-3 overflow-x-auto max-h-64">
                    {JSON.stringify(log, null, 2)}
                </pre>
            )}
        </div>
    );
};

const BuildRow = ({ log }) => {
    const [open, setOpen] = useState(false);
    const m = buildMeta(log.log_type);
    const Icon = m.icon;

    return (
        <div className={`rounded-xl border transition-all ${open ? 'border-slate-200 shadow-sm bg-white' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
            <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left">
                <span className="text-[12px] font-mono text-slate-400 tabular-nums w-[88px] flex-shrink-0">{formatDateTime(log.created_at)}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                    <Icon size={14} className="text-slate-400" />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.pill}`}>{m.label}</span>
                </span>
                <span className="text-sm text-slate-600 truncate flex-1 min-w-0">{buildSummary(log)}</span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 flex-shrink-0"><Coins size={11} />{formatCoins(log.coins_used)} 點</span>
                <ChevronExpand size={16} className={`text-slate-300 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>
            {open && <div className="px-4"><BuildDetail log={log} /></div>}
        </div>
    );
};

const BuildTab = ({ agentId, userId }) => {
    const [logType, setLogType] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchLogs = useCallback(async () => {
        if (!agentId || !userId) return;
        setLoading(true);
        try {
            const params = { agentId, userId, category: 'build', page, limit: PAGE_SIZE };
            if (logType) params.logType = logType;
            const res = await axios.get(`${config.API_URL}/api/activity/logs`, { params });
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch (e) {
            console.error('Failed to fetch build logs', e);
        } finally {
            setLoading(false);
        }
    }, [agentId, userId, page, logType]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useEffect(() => { setPage(1); }, [logType]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <select
                    value={logType}
                    onChange={(e) => setLogType(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                >
                    {BUILD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="text-[12px] text-slate-400">{total} 筆紀錄</span>
                <button onClick={fetchLogs} className="ml-auto p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors" title="重新整理">
                    <RefreshCcw size={18} />
                </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {loading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-slate-300" size={28} /></div>
                ) : logs.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-16">尚無建置 / 調整紀錄</div>
                ) : (
                    <div className="space-y-1.5">
                        {logs.map((log) => <BuildRow key={log._id} log={log} />)}
                    </div>
                )}
            </div>

            {total > PAGE_SIZE && (
                <Pagination page={page} totalPages={totalPages} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   Pagination
   ════════════════════════════════════════════════════════════ */

const Pagination = ({ page, totalPages, onPrev, onNext }) => (
    <div className="flex items-center justify-center gap-3 mt-4 py-3">
        <button disabled={page <= 1} onClick={onPrev} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors">
            <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-slate-500 tabular-nums">{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={onNext} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors">
            <ChevronRight size={16} />
        </button>
    </div>
);

/* ════════════════════════════════════════════════════════════
   Main component
   ════════════════════════════════════════════════════════════ */

const TABS = [
    { key: 'chat', label: '對話執行紀錄', icon: MessageSquareText, desc: '使用者與 Agent 的聊天執行紀錄，含檢索到的 FAQ、商品與轉接判斷。' },
    { key: 'build', label: '建置 / 調整紀錄', icon: Wrench, desc: '建置與調整 Agent 設定時的 AI 操作：生成 / 優化 / 健檢 FAQ、爬站、解析表單與對話分析。' },
];

const ActivityLogView = ({ agentId, userId }) => {
    const [tab, setTab] = useState('chat');
    const activeTab = TABS.find(t => t.key === tab);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">團隊運作日誌 (Activity Logs)</h2>
                <p className="text-sm text-slate-500 mt-1">{activeTab.desc}</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5 border-b border-slate-200">
                {TABS.map(t => {
                    const Icon = t.icon;
                    const active = t.key === tab;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px cursor-pointer transition-colors ${active ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <Icon size={15} />{t.label}
                        </button>
                    );
                })}
            </div>

            {tab === 'chat'
                ? <ChatTab agentId={agentId} userId={userId} />
                : <BuildTab agentId={agentId} userId={userId} />}
        </div>
    );
};

export default ActivityLogView;
