import React, { useState, useEffect } from 'react';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';

const API = `${config.API_URL}/api/monitor`;

const TABS = [
    { key: 'router_instruction', label: 'Router 指令' },
    { key: 'faq_instruction', label: 'FAQ 助手指令' },
    { key: 'product_instruction', label: '商品助手指令' },
    { key: 'handoff_instruction', label: '轉接助手指令' },
];

const MonitorPrompts = () => {
    const { userId } = useAuth();
    const [agents, setAgents] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [activeTab, setActiveTab] = useState('router_instruction');
    const [copyFeedback, setCopyFeedback] = useState('');

    const fetchAgents = async () => {
        try {
            const res = await fetch(`${API}/prompts?search=${encodeURIComponent(search)}&userId=${userId}`);
            if (!res.ok) return;
            const data = await res.json();
            setAgents(data.agents || []);
        } catch (err) {
            console.error('Error fetching agent prompts:', err);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const selectAgent = (agent) => {
        if (selectedAgent?.id === agent.id) {
            setSelectedAgent(null);
        } else {
            setSelectedAgent(agent);
            setActiveTab('router_instruction');
        }
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

    const closeDetail = () => {
        setSelectedAgent(null);
    };

    const raw = selectedAgent?.config?.raw_config || {};

    return (
        <>
            <header>
                <div className="page-title">
                    <h1>Prompt 檢視</h1>
                    <p>檢視所有 Agent 的組合提示詞，方便 Debug</p>
                </div>
                <div className="filters">
                    <input
                        type="text"
                        placeholder="搜尋 Agent 名稱或 Admin..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onInput={() => fetchAgents()}
                    />
                    <button onClick={fetchAgents}>重新整理</button>
                </div>
            </header>

            <div className="page-container">
                {/* Agent List */}
                <div className="chart-container">
                    <div className="section-title">Agent 列表</div>
                    <div className="admin-list-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Agent 名稱</th>
                                    <th>Admin</th>
                                    <th>部署類型</th>
                                    <th>建立時間</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agents.map(a => (
                                    <tr
                                        key={a.id}
                                        className="clickable"
                                        onClick={() => selectAgent(a)}
                                        style={{ background: selectedAgent?.id === a.id ? 'var(--hover-bg)' : undefined }}
                                    >
                                        <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{a.name}</td>
                                        <td>{a.admin_name}</td>
                                        <td><span className="badge badge-type">{a.deploy_type || 'N/A'}</span></td>
                                        <td>{a.created_at}</td>
                                    </tr>
                                ))}
                                {agents.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                            無符合條件的 Agent
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Prompt Detail Pane */}
                {selectedAgent && (
                    <div className="detail-pane">
                        <div className="detail-header">
                            <div>
                                <h2>{selectedAgent.name}</h2>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    Admin: {selectedAgent.admin_name} | ID: {selectedAgent.id}
                                </div>
                            </div>
                            <button className="close-btn" onClick={closeDetail}>&times;</button>
                        </div>

                        {/* Tabs */}
                        <div className="prompt-tabs">
                            {TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    className={`prompt-tab-btn${activeTab === tab.key ? ' active' : ''}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Prompt Content */}
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <button
                                className="copy-btn"
                                onClick={() => copyToClipboard(selectedAgent.config[activeTab] || '')}
                            >
                                {copyFeedback || '複製'}
                            </button>
                            <div className="prompt-display">
                                {selectedAgent.config[activeTab] || '（無內容）'}
                            </div>
                        </div>

                        {/* Raw Config Info */}
                        <div className="config-section" style={{ marginTop: '1.5rem' }}>
                            <span className="config-section-title">基本資訊 (raw_config)</span>
                            <div className="info-grid">
                                <div className="info-label">商家名稱</div><div>{raw.merchant_name || 'N/A'}</div>
                                <div className="info-label">服務內容</div><div style={{ fontSize: '0.8rem' }}>{raw.services || 'N/A'}</div>
                                <div className="info-label">語氣設定</div><div>{raw.tone || 'N/A'}</div>
                                <div className="info-label">避免用語</div><div>{raw.tone_avoid || 'N/A'}</div>
                                <div className="info-label">轉接邏輯</div><div>{raw.handoff_logic || '未設定'}</div>
                                <div className="info-label">啟用轉接</div><div>{selectedAgent.config.enable_handoff ? '是' : '否'}</div>
                                <div className="info-label">FAQ 數量</div><div>{(raw.faqs || []).length}</div>
                                <div className="info-label">商品數量</div><div>{(raw.products || []).length}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default MonitorPrompts;
