import React, { useState, useEffect } from 'react';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';

const API = `${config.API_URL}/api/monitor`;
const LIMIT = 10;

const PROMPT_TABS = [
    { key: 'router_instruction', label: 'Router 指令', match: null },
    { key: 'faq_instruction', label: 'FAQ 助手指令', match: '客服專員' },
    { key: 'product_instruction', label: '商品助手指令', match: '商品' },
    { key: 'handoff_instruction', label: '轉接助手指令', match: '協作' },
];

const isTabUsed = (tab, subagents) => {
    if (tab.match === null) return true;
    if (!subagents || subagents.length === 0) return false;
    return subagents.some(sa => sa.includes(tab.match));
};

const MonitorRecords = () => {
    const { userId } = useAuth();
    const [records, setRecords] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [usageType, setUsageType] = useState('全部');
    const [adminQuery, setAdminQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetchRecords = async (page = currentPage) => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API}/records?page=${page}&limit=${LIMIT}&usage_type=${encodeURIComponent(usageType)}&admin_query=${encodeURIComponent(adminQuery)}&userId=${userId}`
            );
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

    useEffect(() => {
        fetchRecords(currentPage);
    }, [currentPage, usageType]);

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
                    <p>查看使用者對話與 AI 生成細節</p>
                </div>
                <div className="filters">
                    <input
                        type="text"
                        placeholder="搜尋 Admin ID 或名稱..."
                        value={adminQuery}
                        onChange={e => setAdminQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                    />
                    <select value={usageType} onChange={e => { setUsageType(e.target.value); setCurrentPage(1); }}>
                        <option value="全部">全部類別</option>
                        <option value="解析表單">解析表單</option>
                        <option value="爬取商家網站">爬取商家網站</option>
                        <option value="生成 FAQ">生成 FAQ</option>
                        <option value="優化 FAQ">優化 FAQ</option>
                        <option value="AI 健檢 FAQ">AI 健檢 FAQ</option>
                        <option value="聊天">聊天</option>
                    </select>
                    <button onClick={handleSearch}>重新整理</button>
                </div>
            </header>

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
    const [showPrompt, setShowPrompt] = useState(false);
    const [activeTab, setActiveTab] = useState('router_instruction');
    const [copyFeedback, setCopyFeedback] = useState('');

    const prompts = rec.prompt_snapshot || null;

    const tokens = rec.tokens || {};
    const hasTokens = Object.keys(tokens).length > 0;

    const sessionDisplay = rec.session_id
        ? `🆔 Session: ${rec.session_id.substring(0, 8)}...`
        : '🆔 Session: N/A';

    const togglePrompt = () => {
        setShowPrompt(prev => !prev);
    };

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
        <div className="record-card">
            <div className="record-header">
                <div className="record-meta">
                    <span>🕒 {rec.time}</span>
                    <span>{sessionDisplay}</span>
                    <span className="badge badge-model">{rec.model}</span>
                    <span className="badge badge-type">{rec.usage_type}</span>
                </div>
            </div>
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
            <div className="token-info">
                {hasTokens ? (
                    <>
                        <span className="badge badge-token-in">📥 In: {tokens.input_token || 0}</span>
                        <span className="badge badge-token-out">📤 Out: {tokens.output_token || 0}</span>
                        <span className="badge badge-token-tool">🛠️ Tool: {tokens.tool_token || 0}</span>
                        <span className="badge badge-token-thought">🧠 Thought: {tokens.thought_token || 0}</span>
                    </>
                ) : (
                    <span className="badge">📊 無 Token 資訊</span>
                )}
                {rec.cost !== undefined && (
                    <span className="badge badge-cost">💰 Est. Cost: ${rec.cost.toFixed(5)}</span>
                )}
                {rec.subagents && rec.subagents.length > 0
                    ? rec.subagents.map((sa, i) => (
                        <span key={i} className="badge badge-subagent">🤖 {sa}</span>
                    ))
                    : <span className="badge">無使用 Subagent</span>
                }
                {prompts && (
                    <button
                        className="badge badge-prompt-btn"
                        onClick={togglePrompt}
                    >
                        {showPrompt ? '收合 Prompt' : '📄 查看 Prompt'}
                    </button>
                )}
            </div>

            {showPrompt && prompts && (
                <div className="prompt-section">
                    <div className="prompt-tabs">
                        {PROMPT_TABS.map(tab => {
                            const used = isTabUsed(tab, rec.subagents);
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
                        <button
                            className="copy-btn"
                            onClick={() => copyToClipboard(prompts[activeTab] || '')}
                        >
                            {copyFeedback || '複製'}
                        </button>
                        <div className="prompt-display">
                            {prompts[activeTab] || '（無內容）'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonitorRecords;
