import React, { useState, useEffect } from 'react';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';

const API = `${config.API_URL}/api/monitor`;
const LIMIT = 10;

const SOURCE_LABELS = {
    LINE: 'LINE',
    Telegram: 'Telegram',
    web: '後台測試',
    test: '後台測試',
    build: '建置',
    analysis: '數據分析',
};

const BUILD_ACTION_LABELS = {
    faq_generated: 'FAQ 生成',
    faq_optimized: 'FAQ 優化',
    faq_health_checked: 'FAQ 健檢',
    website_crawled: '網站爬取',
    form_parsed: '表單解析',
    services_optimized: '商家服務內容優化',
    faq_imported: 'FAQ 匯入',
    product_imported: '商品匯入',
    analysis_completed: '對話分析',
    faq_matched: 'FAQ 匹配',
    faq_no_match: 'FAQ 未匹配',
    product_matched: '商品匹配',
    handoff_triggered: '觸發轉接',
    handoff_not_triggered: '未觸發轉接',
};

const PROMPT_TABS = [
    { key: 'router_instruction', label: 'Router 指令', match: null },
    { key: 'faq_instruction', label: 'FAQ 助手指令', match: '客服專員' },
    { key: 'product_instruction', label: '商品助手指令', match: '商品' },
    { key: 'handoff_instruction', label: '轉接助手指令', match: '協作' },
];

// 建置 / 調整 Tab 的細分類型（對應 used_token.usage_type）。
// 補齊先前下拉漏掉的：對話分析、解析商品目錄(匯入商品)、解析FAQ匯入(匯入 FAQ)。
const USAGE_TYPE_OPTIONS = [
    '全部',
    '解析表單',
    '爬取商家網站',
    '生成 FAQ',
    '優化 FAQ',
    'AI 健檢 FAQ',
    '優化商家服務內容',
    '解析FAQ匯入',
    '解析商品目錄',
    '對話分析',
];

const CHANNEL_OPTIONS = [
    { value: '', label: '全部渠道' },
    { value: 'LINE', label: 'LINE' },
    { value: 'Telegram', label: 'Telegram' },
    { value: 'web', label: '後台測試' },
];

const TABS = [
    { key: 'chat', label: '💬 對話執行紀錄' },
    { key: 'build', label: '🔧 建置 / 調整紀錄' },
];

const isTabUsed = (tab, subagents) => {
    if (tab.match === null) return true;
    if (!subagents || subagents.length === 0) return false;
    return subagents.some(sa => sa.includes(tab.match));
};

const MonitorRecords = () => {
    const { userId } = useAuth();
    const [tab, setTab] = useState('chat');
    const [records, setRecords] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [usageType, setUsageType] = useState('全部');
    const [channel, setChannel] = useState('');
    const [adminQuery, setAdminQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetchRecords = async (page = currentPage) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(LIMIT),
                category: tab,
                admin_query: adminQuery,
                userId,
            });
            if (tab === 'build' && usageType !== '全部') params.set('usage_type', usageType);
            if (tab === 'chat' && channel) params.set('source', channel);

            const res = await fetch(`${API}/records?${params.toString()}`);
            const data = await res.json();
            setRecords(data.records || []);
            setHasMore((data.records || []).length >= LIMIT);
        } catch (err) {
            console.error('Error fetching records:', err);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    // 切 tab / 改篩選 → 回到第 1 頁重撈
    useEffect(() => {
        setCurrentPage(1);
        fetchRecords(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, usageType, channel]);

    useEffect(() => {
        fetchRecords(currentPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    const handleSearch = () => {
        setCurrentPage(1);
        fetchRecords(1);
    };

    const changePage = (delta) => {
        const next = Math.max(1, currentPage + delta);
        setCurrentPage(next);
        window.scrollTo(0, 0);
    };

    return (
        <>
            <header>
                <div className="page-title">
                    <h1>生成紀錄</h1>
                    <p>查看使用者對話與 AI 生成細節（開發者檢視）</p>
                </div>
                <div className="filters">
                    <input
                        type="text"
                        placeholder="搜尋 Admin ID 或名稱..."
                        value={adminQuery}
                        onChange={e => setAdminQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSearch(); }}
                    />
                    {tab === 'chat' ? (
                        <select value={channel} onChange={e => setChannel(e.target.value)}>
                            {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    ) : (
                        <select value={usageType} onChange={e => setUsageType(e.target.value)}>
                            {USAGE_TYPE_OPTIONS.map(t => (
                                <option key={t} value={t}>{t === '全部' ? '全部類別' : t}</option>
                            ))}
                        </select>
                    )}
                    <button onClick={handleSearch}>重新整理</button>
                </div>
            </header>

            <div className="rec-tabs">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`rec-tab${tab === t.key ? ' active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        正在載入紀錄...
                    </div>
                ) : records.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        查無紀錄
                    </div>
                ) : (
                    records.map(rec => <RecordCard key={rec.id} rec={rec} />)
                )}
            </div>

            <div className="pagination">
                <button onClick={() => changePage(-1)} disabled={currentPage === 1}>上一頁</button>
                <span className="page-info">第 {currentPage} 頁</span>
                <button onClick={() => changePage(1)} disabled={!hasMore}>下一頁</button>
            </div>
        </>
    );
};

const RecordCard = ({ rec }) => {
    const prompts = rec.prompt_snapshot || null;
    const tokens = rec.tokens || {};
    const hasTokens = Object.keys(tokens).length > 0;
    const hasEvents = rec.events && rec.events.length > 0;

    // 卡內子分頁：結果 / Token・成本 / 思維鏈 / Prompt（後兩者有資料才出現）
    const subtabs = [
        { key: 'result', label: '結果' },
        { key: 'cost', label: 'Token・成本' },
        ...(hasEvents ? [{ key: 'reasoning', label: '思維鏈' }] : []),
        ...(prompts ? [{ key: 'prompt', label: 'Prompt' }] : []),
    ];
    const [activeSub, setActiveSub] = useState('result');

    const sessionDisplay = rec.session_id
        ? `🆔 ${rec.session_id.substring(0, 8)}...`
        : '🆔 N/A';

    return (
        <div className="record-card">
            <div className="record-header">
                <div className="record-meta">
                    <span>🕒 {rec.time}</span>
                    <span>{sessionDisplay}</span>
                    <span className="badge badge-model">{rec.model}</span>
                    <span className="badge badge-type">{rec.usage_type}</span>
                    {rec.source && (
                        <span className="badge badge-source">📡 {SOURCE_LABELS[rec.source] || rec.source}</span>
                    )}
                    {rec.duration_ms != null && (
                        <span className="badge">⏱️ {rec.duration_ms.toLocaleString()} ms</span>
                    )}
                </div>
            </div>

            <div className="subtabs">
                {subtabs.map(s => (
                    <button
                        key={s.key}
                        className={`subtab${activeSub === s.key ? ' active' : ''}`}
                        onClick={() => setActiveSub(s.key)}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="subtab-panel">
                {activeSub === 'result' && (
                    <div className="record-body">
                        <div className="msg-section user-msg">
                            <span className="msg-label">Input (輸入)</span>
                            <div className="msg-content">{rec.user_message}</div>
                        </div>
                        <div className="msg-section ai-msg">
                            <span className="msg-label">Output (輸出)</span>
                            <div className="msg-content">{rec.ai_response}</div>
                        </div>
                    </div>
                )}

                {activeSub === 'cost' && (
                    <div>
                        {hasTokens ? (
                            <table className="token-table">
                                <thead>
                                    <tr><th>項目</th><th style={{ textAlign: 'right' }}>Tokens</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><span className="dot" style={{ background: '#94a3b8' }} />Input 輸入</td><td className="num">{(tokens.input_token || 0).toLocaleString()}</td></tr>
                                    <tr><td><span className="dot" style={{ background: 'var(--accent-blue)' }} />Output 輸出</td><td className="num">{(tokens.output_token || 0).toLocaleString()}</td></tr>
                                    <tr><td><span className="dot" style={{ background: 'var(--accent-orange)' }} />Tool 工具</td><td className="num">{(tokens.tool_token || 0).toLocaleString()}</td></tr>
                                    <tr><td><span className="dot" style={{ background: 'var(--accent-pink)' }} />Thought 思考</td><td className="num">{(tokens.thought_token || 0).toLocaleString()}</td></tr>
                                    <tr className="total-row"><td>Σ Total 總計</td><td className="num">{(tokens.total_token || 0).toLocaleString()}</td></tr>
                                </tbody>
                            </table>
                        ) : (
                            <p className="reason-note">📊 無 Token 資訊</p>
                        )}
                        <div className="cost-extras">
                            {rec.cost !== undefined && (
                                <span className="badge badge-cost">💰 Est. Cost: ${rec.cost.toFixed(5)}</span>
                            )}
                            {rec.subagents && rec.subagents.length > 0
                                ? rec.subagents.map((sa, i) => (
                                    <span key={i} className="badge badge-subagent">🤖 {sa}</span>
                                ))
                                : <span className="badge">無使用 Subagent</span>
                            }
                        </div>
                    </div>
                )}

                {activeSub === 'reasoning' && hasEvents && (
                    <ReasoningView events={rec.events} />
                )}

                {activeSub === 'prompt' && prompts && (
                    <PromptInspector prompts={prompts} subagents={rec.subagents} />
                )}
            </div>
        </div>
    );
};

// 將單一事件的 detail 結構化呈現（取代原本的 JSON dump）
const EventDetail = ({ action, detail }) => {
    const d = detail || {};
    switch (action) {
        case 'faq_matched': {
            const faqs = d.matched_faqs || [];
            if (!faqs.length) return <p className="reason-note">未帶出 FAQ 內容。</p>;
            return faqs.map((f, i) => (
                <div key={i} className="faq-item">
                    <span className="faq-q">Q：{f.Q || f.question || ''}</span>
                    <span className="faq-a">{f.A || f.answer || ''}</span>
                </div>
            ));
        }
        case 'faq_no_match':
            return <p className="reason-note">檢索知識庫，未找到匹配的 FAQ。</p>;
        case 'product_matched': {
            const prods = d.matched_products || [];
            if (!prods.length) return <p className="reason-note">未帶出商品內容。</p>;
            return prods.map((p, i) => {
                const prod = typeof p === 'string' ? { name: p } : (p || {});
                return (
                    <div key={i} className="reason-item">
                        <div className="ri-title">{prod.name}</div>
                        {prod.description && <div className="ri-desc">{prod.description}</div>}
                    </div>
                );
            });
        }
        case 'handoff_triggered':
            return <p className="reason-note">已攔截並轉交真人客服。{d.reason ? `原因：${d.reason}` : ''}</p>;
        case 'handoff_not_triggered':
            return <p className="reason-note">已檢查轉接條件，未觸發轉接。{d.reason ? `原因：${d.reason}` : ''}</p>;
        case 'analysis_completed':
            return (
                <div className="reason-stats">
                    <div className="reason-stat"><div className="rs-val">{d.total_conversations ?? 0}</div><div className="rs-label">對話數</div></div>
                    <div className="reason-stat"><div className="rs-val">{d.faq_hits ?? 0}</div><div className="rs-label">命中</div></div>
                    <div className="reason-stat"><div className="rs-val">{d.faq_misses ?? 0}</div><div className="rs-label">未命中</div></div>
                    <div className="reason-stat"><div className="rs-val">{d.coverage_rate ?? 0}%</div><div className="rs-label">覆蓋率</div></div>
                    <div className="reason-stat"><div className="rs-val">{d.suggestions_generated ?? 0}</div><div className="rs-label">建議數</div></div>
                </div>
            );
        case 'faq_generated':
            return <p className="reason-note">AI 生成 <b>{d.count ?? 0}</b> 筆 FAQ。</p>;
        case 'faq_imported':
            return <p className="reason-note">AI 解析並匯入 <b>{d.count ?? 0}</b> 筆 FAQ。</p>;
        case 'product_imported':
            return <p className="reason-note">AI 解析並匯入 <b>{d.count ?? 0}</b> 筆商品。</p>;
        case 'faq_optimized':
            return (
                <div>
                    {d.original_q && <div className="reason-item"><div className="ri-desc">原始：{d.original_q}</div></div>}
                    {d.optimized_q && <div className="reason-item"><div className="ri-title">優化後</div><div className="ri-desc">{d.optimized_q}</div></div>}
                </div>
            );
        case 'faq_health_checked':
            return <p className="reason-note">FAQ 健檢評分 <b>{d.score ?? 0}</b> 分，產生 <b>{d.suggestion_count ?? 0}</b> 則建議。</p>;
        case 'website_crawled':
            return <p className="reason-note">爬取網站：{d.url || ''}</p>;
        case 'form_parsed':
            return <p className="reason-note">解析表單，識別商家：{d.merchant_name || ''}</p>;
        case 'services_optimized':
            return <p className="reason-note">優化服務內容：{d.business_name || ''}</p>;
        default:
            return Object.keys(d).length > 0
                ? <div className="prompt-display">{JSON.stringify(d, null, 2)}</div>
                : null;
    }
};

const ReasoningView = ({ events }) => (
    <div>
        {events.map((evt, i) => (
            <div key={i} className="reason-step">
                <div className="reason-step-head">
                    <span className="badge badge-subagent">{evt.subagent_title || evt.subagent}</span>
                    <span className="badge">{BUILD_ACTION_LABELS[evt.action] || evt.action}</span>
                </div>
                <EventDetail action={evt.action} detail={evt.detail} />
            </div>
        ))}
    </div>
);

const PromptInspector = ({ prompts, subagents }) => {
    const [activeTab, setActiveTab] = useState('router_instruction');
    const [copyFeedback, setCopyFeedback] = useState('');

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyFeedback('已複製！');
            setTimeout(() => setCopyFeedback(''), 2000);
        } catch {
            setCopyFeedback('複製失敗');
            setTimeout(() => setCopyFeedback(''), 2000);
        }
    };

    return (
        <div>
            <div className="prompt-tabs">
                {PROMPT_TABS.map(tab => {
                    const used = isTabUsed(tab, subagents);
                    return (
                        <button
                            key={tab.key}
                            className={`prompt-tab-btn${activeTab === tab.key ? ' active' : ''}${!used ? ' dimmed' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {used && <span className="used-dot" />}
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                <button className="copy-btn" onClick={() => copyToClipboard(prompts[activeTab] || '')}>
                    {copyFeedback || '複製'}
                </button>
                <div className="prompt-display">
                    {prompts[activeTab] || '（無內容）'}
                </div>
            </div>
        </div>
    );
};

export default MonitorRecords;
