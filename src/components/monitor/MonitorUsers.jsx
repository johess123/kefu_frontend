import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';

Chart.register(...registerables);

const API = `${config.API_URL}/api/monitor`;

const MonitorUsers = () => {
    const { userId } = useAuth();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [adminDetails, setAdminDetails] = useState(null);
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [sessions, setSessions] = useState(null);
    const [messages, setMessages] = useState(null);
    const [expandedConfigs, setExpandedConfigs] = useState({});

    const dailyCanvasRef = useRef(null);
    const dailyChartRef = useRef(null);
    const chatBoxRef = useRef(null);

    const fetchAdmins = async () => {
        try {
            const res = await fetch(`${API}/users?search=${encodeURIComponent(search)}&userId=${userId}`);
            if (!res.ok) return;
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const selectAdmin = async (user) => {
        setSelectedAdmin(user);
        setSelectedAgentId(null);
        setSessions(null);
        setMessages(null);
        setAdminDetails(null);

        try {
            const res = await fetch(`${API}/users/${user.id}/details?userId=${userId}`);
            const data = await res.json();
            setAdminDetails(data);
        } catch (err) {
            console.error('Error fetching admin details:', err);
        }
    };

    // Render daily chart when details change
    useEffect(() => {
        if (!adminDetails || !dailyCanvasRef.current) return;

        if (dailyChartRef.current) dailyChartRef.current.destroy();

        dailyChartRef.current = new Chart(dailyCanvasRef.current, {
            type: 'line',
            data: {
                labels: adminDetails.daily_usage.map(d => d.date),
                datasets: [{
                    label: '每日使用量',
                    data: adminDetails.daily_usage.map(d => d.usage),
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });

        return () => { if (dailyChartRef.current) dailyChartRef.current.destroy(); };
    }, [adminDetails]);

    // Scroll chat to bottom when messages change
    useEffect(() => {
        if (chatBoxRef.current && messages) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    const selectAgent = async (agentId) => {
        setSelectedAgentId(agentId);
        setMessages(null);
        setSessions(null);
        try {
            const res = await fetch(`${API}/agents/${agentId}/chats?userId=${userId}`);
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (err) {
            console.error('Error fetching agent chats:', err);
        }
    };

    const selectSession = async (sessionId) => {
        try {
            const res = await fetch(`${API}/sessions/${sessionId}/messages?userId=${userId}`);
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const toggleConfig = (agentId) => {
        setExpandedConfigs(prev => ({ ...prev, [agentId]: !prev[agentId] }));
    };

    const closeDetail = () => {
        setSelectedAdmin(null);
        setAdminDetails(null);
        setSelectedAgentId(null);
        setSessions(null);
        setMessages(null);
    };

    return (
        <>
            <header>
                <div className="page-title">
                    <h1>使用者管理</h1>
                    <p>管理所有 Admin、Agent 與查看通訊紀錄</p>
                </div>
                <div className="filters">
                    <input
                        type="text"
                        placeholder="搜尋名稱或 ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onInput={() => fetchAdmins()}
                    />
                    <button onClick={fetchAdmins}>重新整理</button>
                </div>
            </header>

            <div className="page-container">
                {/* Admin List */}
                <div className="chart-container">
                    <div className="section-title">Admin 列表</div>
                    <div className="admin-list-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>名稱</th>
                                    <th>Line ID</th>
                                    <th>建立時間</th>
                                    <th>Agent 數</th>
                                    <th>總 Token 用量</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr
                                        key={u.id}
                                        className="clickable"
                                        onClick={() => selectAdmin(u)}
                                        style={{ background: selectedAdmin?.id === u.id ? 'var(--hover-bg)' : undefined }}
                                    >
                                        <td>{u.name}</td>
                                        <td><code style={{ fontSize: '0.8rem' }}>{u.google_id || 'N/A'}</code></td>
                                        <td>{u.created_at}</td>
                                        <td>{u.agent_count}</td>
                                        <td style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                                            {u.total_tokens.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Pane */}
                {selectedAdmin && (
                    <div className="detail-pane">
                        <div className="detail-header">
                            <h2>{selectedAdmin.name}</h2>
                            <button className="close-btn" onClick={closeDetail}>&times;</button>
                        </div>

                        <div className="grid-2">
                            {/* Left: Agents */}
                            <div>
                                <div className="section-title">🤖 管理的 Agent</div>
                                {adminDetails ? (
                                    adminDetails.agents.map(a => (
                                        <AgentCard
                                            key={a.id}
                                            agent={a}
                                            expanded={expandedConfigs[a.id] || false}
                                            onToggleConfig={() => toggleConfig(a.id)}
                                            onSelectAgent={() => selectAgent(a.id)}
                                        />
                                    ))
                                ) : (
                                    <div style={{ color: 'var(--text-secondary)' }}>載入中...</div>
                                )}
                            </div>

                            {/* Right: Stats & Chats */}
                            <div>
                                <div className="section-title">📊 數據統計</div>
                                <div className="stats-summary">
                                    <div className="stat-item">
                                        <span className="label">累積 Token</span>
                                        <span className="value">
                                            {selectedAdmin.total_tokens.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="chart-container daily-chart-wrapper">
                                    <div style={{ position: 'relative', height: '220px' }}>
                                        <canvas ref={dailyCanvasRef}></canvas>
                                    </div>
                                </div>

                                {/* Sessions */}
                                {sessions !== null && (
                                    <div>
                                        <div className="section-title">💬 聊天使用者</div>
                                        {sessions.length === 0 ? (
                                            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>無對話紀錄</div>
                                        ) : (
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>名稱</th>
                                                            <th>最後訊息</th>
                                                            <th style={{ width: '100px' }}>時間</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sessions.map(s => (
                                                            <tr
                                                                key={s.session_id}
                                                                className="clickable"
                                                                onClick={() => selectSession(s.session_id)}
                                                            >
                                                                <td>{s.user_name}</td>
                                                                <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {s.last_message}
                                                                </td>
                                                                <td>{s.time}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Chat Messages */}
                                {messages !== null && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div className="section-title">🗨️ 對話紀錄</div>
                                        <div className="chat-history" ref={chatBoxRef}>
                                            {messages.map((m, i) => (
                                                <div
                                                    key={i}
                                                    className={`chat-msg ${m.sender === 'user' ? 'user' : 'assistant'}`}
                                                >
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '0.2rem' }}>
                                                        {m.sender === 'user' ? 'User' : 'Agent'} | {m.time}
                                                    </div>
                                                    <div style={{ wordBreak: 'break-all' }}>{m.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const AgentCard = ({ agent, expanded, onToggleConfig, onSelectAgent }) => {
    const conf = agent.config || {};
    const raw = conf.raw_config || {};
    const faqs = raw.faqs || [];

    return (
        <div className="agent-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                    <strong style={{ color: 'var(--accent-blue)', fontSize: '1.1rem' }}>{agent.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        ID: {agent.id} | 用量: {agent.total_tokens.toLocaleString()} tokens
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span className="badge badge-type">{agent.deploy_type}</span>
                    <button
                        className="btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        onClick={onSelectAgent}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        查看對話
                    </button>
                </div>
            </div>

            <div className="config-container">
                <div className="config-header" onClick={onToggleConfig}>
                    <span>⚙️ Agent 設定 (點擊展開)</span>
                    <span>{expanded ? '▲' : '▼'}</span>
                </div>
                {expanded && (
                    <div className="config-content">
                        <div className="config-section">
                            <span className="config-section-title">基本資訊</span>
                            <div className="info-grid">
                                <div className="info-label">商家名稱</div><div>{raw.merchant_name || 'N/A'}</div>
                                <div className="info-label">服務內容</div><div style={{ fontSize: '0.8rem' }}>{raw.services || 'N/A'}</div>
                                <div className="info-label">官網</div><div>{raw.website_url || 'N/A'}</div>
                                <div className="info-label">語氣設定</div><div>{raw.tone || 'N/A'}</div>
                                <div className="info-label">啟用轉接</div><div>{conf.enable_handoff ? '✅ 是' : '❌ 否'}</div>
                            </div>
                        </div>

                        <div className="config-section">
                            <span className="config-section-title">FAQ 列表 ({faqs.length})</span>
                            {faqs.length === 0
                                ? <div className="instruction-box">無 FAQ 項目</div>
                                : faqs.map((f, i) => (
                                    <div key={i} className="faq-item">
                                        <span className="faq-q">Q{i + 1}: {f.question}</span>
                                        <span className="faq-a">A{i + 1}: {f.answer}</span>
                                    </div>
                                ))
                            }
                        </div>

                        <div className="config-section">
                            <span className="config-section-title">轉接邏輯</span>
                            <div className="instruction-box">{raw.handoff_logic || '未設定'}</div>
                        </div>

                        <div className="config-section">
                            <span className="config-section-title">Router 指令</span>
                            <div className="instruction-box">{conf.router_instruction || 'N/A'}</div>
                        </div>

                        <div className="config-section">
                            <span className="config-section-title">FAQ 助手指令</span>
                            <div className="instruction-box">{conf.faq_instruction || 'N/A'}</div>
                        </div>

                        <div className="config-section">
                            <span className="config-section-title">轉接助手指令</span>
                            <div className="instruction-box">{conf.handoff_instruction || 'N/A'}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonitorUsers;
