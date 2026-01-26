import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import {
    Loader2,
    LayoutGrid,
    Users,
    MessageSquare,
    Settings,
    ChevronRight,
    Menu,
    X,
    Bell,
    TrendingUp,
    Zap,
    UserCircle,
    Globe,
    ExternalLink,
    Clock,
    Plus,
    Lock,
    BookOpen,
    Shield,
    PieChart,
    Package,
    LineChart,
    Copy,
    Check,
    Send,
    User,
    Bot,
    RotateCcw,
    MessageCircle,
    Info,
    ShieldAlert,
    CheckCircle2,
    Lightbulb,
    HelpCircle,
    ChevronLeft,
    ChevronUp,
    ChevronDown,
    Trash2,
    Sparkles,
    Stethoscope
} from 'lucide-react';
import Cookies from 'js-cookie';
import { DEFAULT_HANDOFF_OPTIONS } from '../types';

const BackendDashboard = ({ agent, onBack }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAgent, setCurrentAgent] = useState(agent);
    const [availableSubagents, setAvailableSubagents] = useState([]);
    const [loading, setLoading] = useState(false);

    // LINE Integration states
    const [isLineModalOpen, setIsLineModalOpen] = useState(false);
    const [lineConfig, setLineConfig] = useState({
        accessToken: currentAgent?.deploy_config?.access_token || '',
        channelSecret: currentAgent?.deploy_config?.channel_secret || ''
    });
    const [isDeploying, setIsDeploying] = useState(false);

    // Playground states
    const [playgroundMessages, setPlaygroundMessages] = useState([
        { role: 'model', text: '你好！我是你的 AI 智能客服，有什麼可以幫你的嗎？' }
    ]);
    const [playgroundSessionId, setPlaygroundSessionId] = useState(null);
    const [lastResponseInfo, setLastResponseInfo] = useState(null);
    const [isPlaygroundLoading, setIsPlaygroundLoading] = useState(false);
    const [playgroundInput, setPlaygroundInput] = useState('');
    const playgroundMessagesEndRef = React.useRef(null);

    // Edit Subagent states
    const [editingSubagent, setEditingSubagent] = useState(null); // 'Knowledge Base' | 'Escalation Manager'
    const [editingFaqs, setEditingFaqs] = useState([]);
    const [handoffConfig, setHandoffConfig] = useState({
        triggers: [],
        custom: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [optimizingIndices, setOptimizingIndices] = useState(new Set());

    // Root Admin settings states
    const [tokenStats, setTokenStats] = useState(null);
    const [rootConfig, setRootConfig] = useState({
        merchant_name: '',
        services: '',
        website_url: '',
        tone: '親切有溫度',
        tone_avoid: ''
    });
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [showAllHistory, setShowAllHistory] = useState(false);

    const formatToken = (val) => {
        if (val === undefined || val === null) return '0';
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
        return val.toLocaleString();
    };

    useEffect(() => {
        if (currentAgent) {
            const rawConfig = currentAgent.config?.raw_config || {};
            setEditingFaqs(rawConfig.faqs || []);

            // Parse handoff_logic
            let triggers = [];
            let custom = '';
            if (rawConfig.handoff_logic) {
                const match = rawConfig.handoff_logic.match(/當使用者提到以下任何一項時轉接：(.*)/);
                if (match) {
                    const allTriggers = match[1].split(', ');
                    triggers = allTriggers.filter(t => DEFAULT_HANDOFF_OPTIONS.includes(t));
                    custom = allTriggers.filter(t => !DEFAULT_HANDOFF_OPTIONS.includes(t)).join('、');
                }
            }
            setHandoffConfig({ triggers, custom });

            // Set root config for editing
            setRootConfig({
                merchant_name: currentAgent.name || '',
                services: rawConfig.services || '',
                website_url: rawConfig.website_url || '',
                tone: rawConfig.tone || '親切有溫度',
                tone_avoid: rawConfig.tone_avoid || ''
            });
        }
    }, [currentAgent]);

    const fetchTokenStats = async () => {
        if (!currentAgent?._id) return;
        setIsStatsLoading(true);
        try {
            const res = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}/stats`, {
                params: { userId: currentAgent.admin_id }
            });
            setTokenStats(res.data);
        } catch (error) {
            console.error('Failed to fetch token stats:', error);
        } finally {
            setIsStatsLoading(false);
        }
    };

    useEffect(() => {
        if (editingSubagent === 'Root Admin' || (activeMenu === 'agents' && !editingSubagent)) {
            fetchTokenStats();
        }
    }, [editingSubagent, activeMenu]);

    const fetchAgentData = async () => {
        if (!currentAgent?._id) return;
        try {
            // Fetch full agent data to get used_subagent
            const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                params: { userId: currentAgent.admin_id }
            });
            setCurrentAgent(agentRes.data);

            // Fetch available subagents for market
            const availableRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}/available_subagents`);
            setAvailableSubagents(availableRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        }
    };

    useEffect(() => {
        fetchAgentData();
    }, [agent?._id]);

    useEffect(() => {
        if (editingSubagent === 'Root Admin') {
            fetchAgentData();
        }
    }, [editingSubagent]);

    const handleUnlockSubagent = async (subagentId) => {
        try {
            setLoading(true);
            await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/add_subagent`, {
                subagent_id: subagentId
            });

            // Refresh data
            const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                params: { userId: currentAgent.admin_id }
            });
            setCurrentAgent(agentRes.data);

            const availableRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}/available_subagents`);
            setAvailableSubagents(availableRes.data);

            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to unlock subagent:', error);
            alert('解除鎖定失敗，請稍後再試。');
        } finally {
            setLoading(false);
        }
    };

    const handleDeployLine = async () => {
        if (!lineConfig.accessToken || !lineConfig.channelSecret) {
            alert('請輸入 Channel Access Token 與 Channel Secret');
            return;
        }

        try {
            setIsDeploying(true);
            const response = await axios.post(`${config.API_URL}/api/deploy_line`, {
                agent_id: currentAgent._id,
                access_token: lineConfig.accessToken,
                channel_secret: lineConfig.channelSecret
            });

            if (response.data.status === 'ok') {
                alert('LINE 部署成功！');
                setIsLineModalOpen(false);
                // Refresh agent data
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
            } else {
                alert('部署失敗: ' + (response.data.message || '未知錯誤'));
            }
        } catch (error) {
            console.error('Failed to deploy LINE:', error);
            alert('部署過程中發生錯誤');
        } finally {
            setIsDeploying(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('已複製到剪貼簿');
        });
    };

    // Playground logic
    const initPlaygroundSession = async () => {
        if (playgroundSessionId) return;
        try {
            const res = await axios.get(`${config.API_URL}/api/init_session`);
            setPlaygroundSessionId(res.data.session_id);
        } catch (error) {
            console.error('Failed to init playground session:', error);
        }
    };

    useEffect(() => {
        if (activeMenu === 'playground') {
            initPlaygroundSession();
        }
    }, [activeMenu]);

    useEffect(() => {
        playgroundMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [playgroundMessages]);

    const handlePlaygroundSend = async (textToSend = playgroundInput) => {
        const msgText = textToSend.trim();
        if (!msgText || !playgroundSessionId) return;

        setPlaygroundMessages(prev => [...prev, { role: 'user', text: msgText }]);
        setPlaygroundInput('');
        setIsPlaygroundLoading(true);
        setLastResponseInfo(null);

        try {
            const line_user_id = Cookies.get('line_user_id');
            const line_user_name = Cookies.get('line_user_name');
            const response = await axios.post(`${config.API_URL}/api/chat`, {
                message: msgText,
                history: playgroundMessages,
                line_user_id: line_user_id,
                user_name: line_user_name,
                agent_id: currentAgent._id,
                session_id: playgroundSessionId
            });

            const { response_text, related_faq_list, handoff_result } = response.data;
            const newMessage = {
                role: 'model',
                text: response_text,
                related_faqs: related_faq_list || [],
                handoff: handoff_result
            };

            setPlaygroundMessages(prev => [...prev, newMessage]);
            setLastResponseInfo(newMessage);
        } catch (error) {
            console.error('Playground chat error:', error);
            setPlaygroundMessages(prev => [...prev, { role: 'model', text: '抱歉，發生錯誤，請稍後再試。' }]);
        } finally {
            setIsPlaygroundLoading(false);
        }
    };

    const resetPlaygroundChat = () => {
        setPlaygroundMessages([{ role: 'model', text: '你好！我是你的 AI 智能客服，有什麼可以幫你的嗎？' }]);
        setLastResponseInfo(null);
        // Optional: refresh session ID
        axios.get(`${config.API_URL}/api/init_session`).then(res => setPlaygroundSessionId(res.data.session_id));
    };

    const handlePlaygroundFaqClick = (question) => {
        setPlaygroundInput(question);
        handlePlaygroundSend(question);
    };

    const handleOptimizeFaq = async (idx) => {
        const faq = editingFaqs[idx];
        if (!faq.question.trim() && !faq.answer.trim()) {
            alert('請先輸入問題或回答內容');
            return;
        }

        setOptimizingIndices(prev => new Set(prev).add(idx));
        try {
            const line_user_id = Cookies.get('line_user_id');
            const response = await axios.post(`${config.API_URL}/api/optimize_faq`, {
                question: faq.question,
                answer: faq.answer,
                line_user_id: line_user_id
            });

            if (response.data && !response.data.error) {
                const newFaqs = [...editingFaqs];
                newFaqs[idx] = {
                    ...newFaqs[idx],
                    question: response.data.q,
                    answer: response.data.a
                };
                setEditingFaqs(newFaqs);
            } else {
                alert('優化失敗：' + (response.data.error || '未知錯誤'));
            }
        } catch (error) {
            console.error('Failed to optimize FAQ:', error);
            alert('優化過程中發生錯誤');
        } finally {
            setOptimizingIndices(prev => {
                const newSet = new Set(prev);
                newSet.delete(idx);
                return newSet;
            });
        }
    };

    const handleSaveFaqs = async () => {
        try {
            setIsSaving(true);
            const res = await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/update_faqs`, {
                userId: currentAgent.admin_id,
                faqs: editingFaqs
            });
            if (res.data.status === 'ok') {
                alert('FAQ 更新成功！');
                setEditingSubagent(null);
                // Refresh agent data
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
            }
        } catch (error) {
            console.error('Failed to save FAQs:', error);
            alert('儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveHandoff = async () => {
        try {
            setIsSaving(true);
            const res = await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/update_handoff`, {
                userId: currentAgent.admin_id,
                handoff_triggers: handoffConfig.triggers,
                handoff_custom: handoffConfig.custom
            });
            if (res.data.status === 'ok') {
                alert('轉接設定更新成功！');
                setEditingSubagent(null);
                // Refresh agent data
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
            }
        } catch (error) {
            console.error('Failed to save Handoff:', error);
            alert('儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRootConfig = async () => {
        try {
            setIsSaving(true);
            const res = await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/update_config`, {
                userId: currentAgent.admin_id,
                updates: rootConfig
            });
            if (res.data.status === 'ok') {
                alert('基本設定更新成功！');
                setEditingSubagent(null);
                // Refresh agent data
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
            }
        } catch (error) {
            console.error('Failed to save root config:', error);
            alert('儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const iconMap = {
        "Knowledge Base": <BookOpen size={24} className="text-blue-600" />,
        "Escalation Manager": <Shield size={24} className="text-orange-600" />,
        "Order Agent": <Package size={24} className="text-slate-400" />,
        "Sales Agent": <LineChart size={24} className="text-slate-400" />
    };

    const bgColorMap = {
        "Knowledge Base": 'bg-blue-50',
        "Escalation Manager": 'bg-orange-50',
        "Order Agent": 'bg-slate-50',
        "Sales Agent": 'bg-slate-50'
    };

    const teamSubagents = (currentAgent?.used_subagent_details || [])
        .map(sa => ({
            ...sa,
            icon: iconMap[sa.name] || <PieChart size={24} className="text-brand-600" />,
            bgColor: bgColorMap[sa.name] || 'bg-slate-50',
            enabled: true
        }));

    const stats = [
        {
            label: '今日對話數',
            value: '128',
            change: '+ 12%',
            trend: 'up',
            icon: <MessageSquare className="text-blue-500" size={24} />
        },
        {
            label: 'AI 解決率',
            value: '92%',
            change: '+ 3.5%',
            trend: 'up',
            icon: <Zap className="text-purple-500" size={24} />
        },
        {
            label: '轉人工請求',
            value: '12',
            change: '- 2',
            trend: 'down',
            icon: <UserCircle className="text-orange-500" size={24} />
        },
        {
            label: '預估節省工時',
            value: '5.3h',
            badge: '本日',
            icon: <Clock className="text-indigo-500" size={24} />
        }
    ];

    const menuItems = [
        {
            group: '', items: [
                { id: 'dashboard', label: '營運儀表板', icon: <LayoutGrid size={20} />, active: true }
            ]
        },
        {
            group: 'AI 團隊管理', items: [
                { id: 'agents', label: '虛擬團隊 (Agents)', icon: <Users size={20} /> }
            ]
        },
        {
            group: '客戶互動', items: [
                { id: 'inbox', label: '對話收件匣', icon: <MessageSquare size={20} />, badge: '1' },
                { id: 'crm', label: '客戶管理 (CRM)', icon: <UserCircle size={20} /> },
                { id: 'channels', label: '渠道串接', icon: <Globe size={20} /> }
            ]
        },
        {
            group: '', items: [
                { id: 'playground', label: 'Playground 測試', icon: <Zap size={20} /> }
            ]
        }
    ];

    const getActiveMenuLabel = () => {
        const item = menuItems.flatMap(g => g.items).find(i => i.id === activeMenu);
        return item ? item.label : '營運儀表板';
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC] flex">
            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-full flex flex-col p-4">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
                            <LayoutGrid size={24} />
                            <span>商家後台</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6">
                        {menuItems.map((group, idx) => (
                            <div key={idx}>
                                {group.group && (
                                    <h5 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                        {group.group}
                                    </h5>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveMenu(item.id);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={`
                                                w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all
                                                ${activeMenu === item.id
                                                    ? 'bg-brand-50 text-brand-700 font-medium'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.icon}
                                                <span>{item.label}</span>
                                            </div>
                                            {item.badge && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar Footer - User Profile */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="bg-slate-50 rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    商
                                </div>
                                <div className="flex-1">
                                    <h6 className="text-sm font-bold text-slate-900">商家管理員</h6>
                                    <p className="text-[10px] text-slate-500">Pro Plan</p>
                                </div>
                                <button onClick={onBack} className="text-slate-400 hover:text-slate-600">
                                    <ExternalLink size={16} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-slate-100">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">🪙</span>
                                    <span className="text-xs font-bold text-slate-700">1,250</span>
                                </div>
                                <button className="text-slate-400 hover:text-brand-600">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2 text-brand-600 font-bold">
                            <LayoutGrid size={24} />
                            <span>商家後台</span>
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <div className="flex items-center gap-3">
                            {editingSubagent && (
                                <button
                                    onClick={() => setEditingSubagent(null)}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors border border-slate-100"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingSubagent ? editingSubagent : getActiveMenuLabel()}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="hidden sm:flex items-center gap-4 border-l border-slate-100 pl-4 ml-4">
                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-900">商家管理員</div>
                                <div className="text-[10px] text-slate-400">ID: 8820412</div>
                            </div>
                            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                        </div>
                        {/* Menu icon in top right as per Image 3/4 */}
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-600">
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {(() => {
                        switch (activeMenu) {
                            case 'dashboard':
                                return (
                                    <>
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                            {stats.map((stat, idx) => (
                                                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                                                            {stat.icon}
                                                        </div>
                                                        {stat.change && (
                                                            <div className={`
                                                                flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full
                                                                ${stat.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
                                                            `}>
                                                                {stat.trend === 'up' ? <TrendingUp size={12} /> : null}
                                                                {stat.change}
                                                            </div>
                                                        )}
                                                        {stat.badge && (
                                                            <div className="bg-green-50 text-green-600 text-[11px] font-bold px-2 py-1 rounded-full">
                                                                {stat.badge}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-slate-500 text-sm font-medium mb-1">{stat.label}</div>
                                                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Chart/Main Section Placeholder */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 min-h-[400px] relative overflow-hidden">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-slate-900 mb-1">熱門詢問話題 (Top Topics)</h3>
                                                        <p className="text-sm text-slate-400 flex items-center gap-2">
                                                            <Clock size={14} /> 最後更新：10分鐘前
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Blurred Content to match Image 3 */}
                                                <div className="space-y-6 filter blur-[4px] opacity-20 select-none">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <div key={i} className="flex items-center gap-6">
                                                            <div className="w-12 h-4 bg-slate-200 rounded"></div>
                                                            <div className="flex-1 h-4 bg-slate-100 rounded"></div>
                                                            <div className="w-20 h-4 bg-slate-200 rounded"></div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Lock Overlay */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px]">
                                                    <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-4 border border-brand-100">
                                                        <Lock size={32} />
                                                    </div>
                                                    <h4 className="text-lg font-bold text-slate-800 mb-2">進階數據分析</h4>
                                                    <p className="text-slate-500 text-sm mb-6 text-center max-w-xs">
                                                        升級至企業版以解鎖詳細的話題分析、情緒偵測與對話留存報告。
                                                    </p>
                                                    <button className="bg-brand-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95">
                                                        立即升級
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            case 'agents':
                                if (editingSubagent === 'Knowledge Base') {
                                    return (
                                        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {/* Header Section */}
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm">
                                                        <BookOpen size={24} />
                                                    </div>
                                                    <div>
                                                        <h1 className="text-2xl font-bold text-slate-900">客服部專員 (FAQ Agent)</h1>
                                                        <p className="text-slate-500 text-sm">這是「客服部專員」的大腦。AI 會優先檢索這裡的內容來回答客戶。</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-red-50 text-red-500 px-4 py-2 rounded-2xl flex items-center gap-2 border border-red-100 shadow-sm">
                                                        <Bell size={18} className="animate-pulse" />
                                                        <span className="text-sm font-bold">待處理 (1)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* FAQ Content Area */}
                                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                                                <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">FAQ 知識庫管理</h3>
                                                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Manage Knowledge Base</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
                                                            <Stethoscope size={18} className="text-blue-500" />
                                                            健康檢查
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingFaqs([...editingFaqs, { question: '', answer: '' }])}
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-md shadow-brand-100"
                                                        >
                                                            <Plus size={18} />
                                                            新增問答
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-10 space-y-8">
                                                    {editingFaqs.map((faq, idx) => (
                                                        <div key={idx} className="group relative bg-slate-50/50 rounded-3xl p-8 border border-slate-100 hover:border-brand-200 hover:bg-white transition-all duration-300">
                                                            <div className="absolute -top-3 left-8 bg-white border border-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                                                                Q{idx + 1}
                                                            </div>
                                                            <div className="absolute top-6 right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleOptimizeFaq(idx)}
                                                                    disabled={optimizingIndices.has(idx)}
                                                                    className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-brand-600 rounded-xl shadow-sm transition-all hover:scale-105 disabled:opacity-50"
                                                                >
                                                                    {optimizingIndices.has(idx) ? (
                                                                        <Loader2 size={16} className="animate-spin text-brand-600" />
                                                                    ) : (
                                                                        <Sparkles size={16} />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingFaqs(editingFaqs.filter((_, i) => i !== idx))}
                                                                    className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-red-500 rounded-xl shadow-sm transition-all hover:scale-105"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <input
                                                                    type="text"
                                                                    value={faq.question}
                                                                    onChange={(e) => {
                                                                        const newFaqs = [...editingFaqs];
                                                                        newFaqs[idx].question = e.target.value;
                                                                        setEditingFaqs(newFaqs);
                                                                    }}
                                                                    placeholder="輸入常見問題..."
                                                                    className="w-full bg-transparent text-lg font-bold text-slate-800 placeholder:text-slate-300 outline-none"
                                                                />
                                                                <textarea
                                                                    value={faq.answer}
                                                                    onChange={(e) => {
                                                                        const newFaqs = [...editingFaqs];
                                                                        newFaqs[idx].answer = e.target.value;
                                                                        setEditingFaqs(newFaqs);
                                                                    }}
                                                                    placeholder="輸入預設回覆回答內容..."
                                                                    className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-slate-600 text-sm leading-relaxed min-h-[120px] focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-inner"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {editingFaqs.length === 0 && (
                                                        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                <BookOpen size={32} className="text-slate-200" />
                                                            </div>
                                                            <h4 className="text-slate-800 font-bold mb-1">知識庫目前為空</h4>
                                                            <p className="text-xs text-slate-400">點擊上方「新增問答」開始建立 AI 的知識庫。</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                                    <button
                                                        disabled={isSaving}
                                                        onClick={handleSaveFaqs}
                                                        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-10 py-3.5 rounded-2xl shadow-lg shadow-brand-200 transition-all active:scale-95 flex items-center gap-2"
                                                    >
                                                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                                        儲存設定
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (editingSubagent === 'Escalation Manager') {
                                    return (
                                        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {/* Header Section */}
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center border border-orange-100 shadow-sm">
                                                        <Shield size={24} />
                                                    </div>
                                                    <div>
                                                        <h1 className="text-2xl font-bold text-slate-900">人機協作專員 (Escalation Manager)</h1>
                                                        <p className="text-slate-500 text-sm">管理 AI 轉接真人的邏輯。AI 會根據此設定決定何時尋求人類協助。</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Banner */}
                                            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-orange-100 shrink-0 shadow-sm">
                                                    <Shield size={20} className="text-orange-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-orange-800">防守型策略中心</h4>
                                                    <p className="text-xs text-orange-600 leading-relaxed mt-1">
                                                        這裡定義人機協作專員的行為。當偵測到風險或回答不出來時，<span className="font-bold">Agent 會自動轉接並建立工單 (Ticket)</span>，確保你不會漏掉任何重要客戶。
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Config Section */}
                                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                                                <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                                    <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                                        <Info size={18} className="text-brand-600" />
                                                        1. 觸發條件 (When to Escalate)
                                                    </h3>
                                                </div>

                                                <div className="p-10 space-y-10">
                                                    <div>
                                                        <label className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest mb-6">
                                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                                            高風險意圖偵測
                                                        </label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {DEFAULT_HANDOFF_OPTIONS.map((option, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        const isSelected = handoffConfig.triggers.includes(option);
                                                                        if (isSelected) {
                                                                            setHandoffConfig({ ...handoffConfig, triggers: handoffConfig.triggers.filter(t => t !== option) });
                                                                        } else {
                                                                            setHandoffConfig({ ...handoffConfig, triggers: [...handoffConfig.triggers, option] });
                                                                        }
                                                                    }}
                                                                    className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${handoffConfig.triggers.includes(option)
                                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 shadow-sm'
                                                                        }`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${handoffConfig.triggers.includes(option)
                                                                        ? 'bg-brand-500 border-brand-500'
                                                                        : 'bg-slate-50 border-slate-200'
                                                                        }`}>
                                                                        {handoffConfig.triggers.includes(option) && <Check size={14} className="text-white" />}
                                                                    </div>
                                                                    <span className="text-sm font-bold">{option}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">其他自訂關鍵字 (例如：發票、匯款)...</label>
                                                        <input
                                                            type="text"
                                                            value={handoffConfig.custom}
                                                            onChange={(e) => setHandoffConfig({ ...handoffConfig, custom: e.target.value })}
                                                            placeholder="手動輸入關鍵字，以「、」或逗號隔開"
                                                            className="w-full bg-slate-900 text-white rounded-2xl p-5 text-sm outline-none placeholder:text-slate-600 border border-slate-800 focus:border-brand-500 transition-all shadow-2xl"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                                    <button
                                                        disabled={isSaving}
                                                        onClick={handleSaveHandoff}
                                                        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-10 py-3.5 rounded-2xl shadow-lg shadow-brand-200 transition-all active:scale-95 flex items-center gap-2"
                                                    >
                                                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                                        儲存設定
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (editingSubagent === 'Root Admin') {
                                    return (
                                        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {/* Header Section */}
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-yellow-400/10 text-yellow-500 rounded-xl flex items-center justify-center border border-yellow-400/20 shadow-sm">
                                                        <Settings size={24} />
                                                    </div>
                                                    <div>
                                                        <h1 className="text-2xl font-bold text-slate-900">AI 營運總監 (Root Admin)</h1>
                                                        <p className="text-slate-500 text-sm">管理品牌核心設定、金流與 Agent 角色個性。</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-red-50 text-red-500 px-4 py-2 rounded-2xl flex items-center gap-2 border border-red-100 shadow-sm">
                                                        <Bell size={18} className="animate-pulse" />
                                                        <span className="text-sm font-bold">待處理 (1)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Token Usage Section - Image 2 */}
                                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-8">
                                                <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                                    <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                                        <Zap size={18} className="text-brand-600" />
                                                        點數用量 (Point Usage)
                                                    </h3>
                                                </div>
                                                <div className="p-8">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">本月消耗點數</div>
                                                            <div className="flex items-end gap-2">
                                                                <span className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                                                                    <span className="text-yellow-500 text-xl">🪙</span>
                                                                    {isStatsLoading ? '...' : (tokenStats?.monthly_usage?.points || 0).toLocaleString()}
                                                                </span>
                                                                <span className="text-xs text-slate-400 mb-1">當前餘額: 1,250 點</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Input Tokens</div>
                                                            <div className="flex items-end gap-2">
                                                                <span className="text-2xl font-bold text-slate-900">
                                                                    {isStatsLoading ? '...' : formatToken(tokenStats?.monthly_usage?.input_tokens)}
                                                                </span>
                                                                <span className="text-xs text-slate-400 mb-1">Token 使用量</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Output Tokens</div>
                                                            <div className="flex items-end gap-2">
                                                                <span className="text-2xl font-bold text-slate-900">
                                                                    {isStatsLoading ? '...' : formatToken(tokenStats?.monthly_usage?.output_tokens)}
                                                                </span>
                                                                <span className="text-xs text-slate-400 mb-1">生成內容數量</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end">
                                                        <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-md shadow-brand-100">
                                                            <Plus size={18} />
                                                            立即儲值
                                                        </button>
                                                    </div>

                                                    <hr className="my-8 border-slate-100" />

                                                    <div>
                                                        <h4 className="font-bold text-slate-700 flex items-center gap-3 mb-6">
                                                            <Clock size={18} className="text-slate-400" />
                                                            近期交易紀錄 (Transaction History)
                                                        </h4>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left">
                                                                <thead>
                                                                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                                                        <th className="py-4">時間</th>
                                                                        <th className="py-4">項目</th>
                                                                        <th className="py-4 text-center">變動</th>
                                                                        <th className="py-4 text-right">結餘</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {isStatsLoading ? (
                                                                        <tr><td colSpan="4" className="py-8 text-center text-slate-400">載入中...</td></tr>
                                                                    ) : (showAllHistory ? (tokenStats?.history || []) : (tokenStats?.history || []).slice(0, 5)).map((record, i) => (
                                                                        <tr key={i} className="text-sm">
                                                                            <td className="py-4 text-slate-400">{record.time}</td>
                                                                            <td className="py-4 font-bold text-slate-700 flex items-center gap-2">
                                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${record.change > 0 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                                    {record.change > 0 ? <TrendingUp size={14} /> : <ChevronRight size={14} />}
                                                                                </div>
                                                                                {record.item}
                                                                            </td>
                                                                            <td className={`py-4 text-center font-bold ${record.change > 0 ? 'text-green-500' : 'text-slate-900'}`}>{record.change > 0 ? `+${record.change}` : record.change}</td>
                                                                            <td className="py-4 text-right text-slate-400">{record.balance.toLocaleString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                    {(!tokenStats?.history || tokenStats.history.length === 0) && !isStatsLoading && (
                                                                        <tr><td colSpan="4" className="py-8 text-center text-slate-400 italic">尚無交易紀錄</td></tr>
                                                                    )}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr>
                                                                        <td colSpan="4" className="py-4 text-center">
                                                                            <button
                                                                                onClick={() => setShowAllHistory(!showAllHistory)}
                                                                                className="text-xs font-bold text-slate-400 hover:text-brand-600 flex items-center gap-1 mx-auto transition-colors"
                                                                            >
                                                                                {showAllHistory ? '隱藏部分紀錄' : '查看全部紀錄'}
                                                                                {showAllHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Basic Info & Persona - Image 3 */}
                                            <div className="space-y-8">
                                                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                                                    <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                                        <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                                            <Package size={18} className="text-brand-600" />
                                                            品牌基本資訊
                                                        </h3>
                                                    </div>
                                                    <div className="p-8 space-y-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">商家名稱 / 管理員暱稱</label>
                                                            <div className="relative">
                                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                                <input
                                                                    type="text"
                                                                    value={rootConfig.merchant_name}
                                                                    onChange={(e) => setRootConfig({ ...rootConfig, merchant_name: e.target.value })}
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-700"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">品牌/服務描述 (最高指令)</label>
                                                            <textarea
                                                                rows={4}
                                                                value={rootConfig.services}
                                                                onChange={(e) => setRootConfig({ ...rootConfig, services: e.target.value })}
                                                                className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-sm leading-relaxed text-slate-600"
                                                                placeholder="描述您所提供的服務內容..."
                                                            />
                                                            <p className="text-[10px] text-slate-400 mt-2 ml-2">這會是所有 Agent 理解你業務的核心依據。</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">網站連結 (選填)</label>
                                                            <div className="relative">
                                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                                <input
                                                                    type="text"
                                                                    value={rootConfig.website_url}
                                                                    onChange={(e) => setRootConfig({ ...rootConfig, website_url: e.target.value })}
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-500"
                                                                    placeholder="https://..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                                                    <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                                        <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                                            <Sparkles size={18} className="text-brand-600" />
                                                            語氣與人設 (Persona)
                                                        </h3>
                                                    </div>
                                                    <div className="p-8 space-y-8">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">選擇語氣</label>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                {['親切有溫度', '專業簡潔', '像朋友聊天', '活潑可愛'].map(t => (
                                                                    <button
                                                                        key={t}
                                                                        onClick={() => setRootConfig({ ...rootConfig, tone: t })}
                                                                        className={`py-4 rounded-2xl font-bold text-sm transition-all border ${rootConfig.tone === t ? 'bg-brand-50 border-brand-500 text-brand-600 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                                                    >
                                                                        {t}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">避免用詞 (Negative Prompt)</label>
                                                            <input
                                                                type="text"
                                                                value={rootConfig.tone_avoid}
                                                                onChange={(e) => setRootConfig({ ...rootConfig, tone_avoid: e.target.value })}
                                                                className="w-full px-6 py-5 bg-slate-900 text-white rounded-2xl outline-none placeholder:text-slate-600 border border-slate-800 focus:border-brand-500 transition-all text-sm"
                                                                placeholder="例如：不要太油條、禁止使用簡體字..."
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                                        <button
                                                            disabled={isSaving}
                                                            onClick={handleSaveRootConfig}
                                                            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-10 py-3.5 rounded-2xl shadow-lg shadow-brand-200 transition-all active:scale-95 flex items-center gap-2"
                                                        >
                                                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                                            儲存設定
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="max-w-6xl animate-in fade-in duration-500">
                                        <div className="mb-10">
                                            <h1 className="text-3xl font-bold text-slate-900 mb-2">AI 團隊管理</h1>
                                            <p className="text-slate-500">配置您的 AI 虛擬員工，啟用或停用不同職能的 Agent。</p>
                                        </div>
                                        <div className="mb-12">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                                                <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                                管理核心 (MANAGEMENT CORE)
                                            </div>
                                            <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-colors"></div>
                                                <div className="flex items-center gap-6 z-10">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                                                        <LayoutGrid className="text-white" size={32} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-2xl font-bold">營運總監 (Root Admin)</h3>
                                                            <span className="bg-yellow-400/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-400/30">核心核心</span>
                                                        </div>
                                                        <p className="text-slate-400 text-sm">掌管品牌設定、計費與全域規則。</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8 md:border-l md:border-white/10 md:pl-8 z-10 w-full md:w-auto">
                                                    <div className="flex-1 md:flex-none">
                                                        <div className="text-slate-400 text-xs mb-1">今日對話</div>
                                                        <div className="text-2xl font-bold">
                                                            {isStatsLoading ? '...' : (tokenStats?.daily_stats?.today_chats || 0)}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 md:flex-none">
                                                        <div className="text-slate-400 text-xs mb-1">健康度</div>
                                                        <div className="text-2xl font-bold text-green-400">
                                                            {isStatsLoading ? '...' : (tokenStats?.daily_stats?.health_score || 100)}%
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setEditingSubagent('Root Admin')}
                                                        className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                                                    >
                                                        <Settings size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Your Team Members */}
                                        <div>
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                                                <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                                                您的團隊成員 (YOUR TEAM)
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                                {teamSubagents.map((sub, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setEditingSubagent(sub.name)}
                                                        className={`bg-white rounded-3xl p-8 border ${sub.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'} shadow-sm flex flex-col h-full relative group cursor-pointer hover:border-brand-300 hover:shadow-xl hover:shadow-brand-100 transition-all duration-300`}
                                                    >
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className={`w-14 h-14 ${sub.bgColor} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                                {sub.icon}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`flex items-center gap-2 ${sub.enabled ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400'} px-3 py-1 rounded-full border border-green-100`}>
                                                                    {sub.enabled && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                                                                    <span className="text-xs font-bold">{sub.enabled ? 'Enabled' : 'Disabled'}</span>
                                                                </div>
                                                                <button className={`${sub.enabled ? 'text-blue-600' : 'text-slate-300'} hover:scale-110 transition-transform`}>
                                                                    <Zap size={20} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="mb-2">
                                                            <h4 className="text-xl font-bold text-slate-900 uppercase group-hover:text-brand-600 transition-colors">{sub.name}</h4>
                                                            <div className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">{sub.title}</div>
                                                        </div>
                                                        <p className="text-slate-500 text-sm mb-8 flex-1 leading-relaxed">
                                                            {sub.description}
                                                        </p>
                                                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between group-hover:border-slate-100 transition-colors">
                                                            <button className="text-xs font-bold text-slate-400 group-hover:text-brand-600">設定與詳情</button>
                                                            <div className={`w-10 h-10 ${sub.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'} rounded-full flex items-center justify-center transition-all group-hover:translate-x-1 group-hover:bg-brand-600 group-hover:text-white`}>
                                                                <ChevronRight size={20} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Add Agent Button */}
                                                <button
                                                    onClick={() => setIsModalOpen(true)}
                                                    className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-brand-400 hover:bg-brand-50/30 transition-all group"
                                                >
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                                                        <Plus size={32} className="text-slate-400 group-hover:text-brand-600" />
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xl font-bold text-slate-800 mb-1">新增 Agent</div>
                                                        <p className="text-xs text-slate-400">瀏覽 Agent 市場，擴充您的 AI 團隊能力</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            case 'channels':
                                return (
                                    <div className="max-w-6xl animate-in fade-in duration-500">
                                        <div className="mb-10">
                                            <h1 className="text-3xl font-bold text-slate-900 mb-2">渠道串接 (Channels)</h1>
                                            <p className="text-slate-500">選擇您要部署 AI 客服的通訊平台。</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* LINE */}
                                            <div
                                                onClick={() => setIsLineModalOpen(true)}
                                                className="bg-white rounded-[32px] p-10 border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#06C755]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#06C755]/10 transition-colors"></div>
                                                <div className="relative w-20 h-20 bg-[#06C755]/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#06C755">
                                                        <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.052.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.893 2.572-5.992z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-2xl font-bold text-slate-900 mb-3">LINE</h3>
                                                <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-[280px]">
                                                    Enable users to chat with your AI Agent via LINE.
                                                </p>
                                                <div className="bg-green-50 text-green-600 px-5 py-2 rounded-full text-[13px] font-bold border border-green-100 flex items-center gap-2 group-hover:bg-green-100 transition-colors">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                    可串接
                                                </div>
                                            </div>

                                            {/* Messenger */}
                                            <div className="bg-white rounded-[32px] p-10 border border-slate-100 opacity-60 flex flex-col items-center text-center grayscale">
                                                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#0084FF">
                                                        <path d="M12 2C6.47715 2 2 6.145 2 11.257c0 2.913 1.45 5.514 3.714 7.222V22l3.39-1.858c.905.251 1.868.388 2.896.388 5.52285 0 10-4.145 10-9.257C22 6.145 17.52285 2 12 2zm1.09 12.338l-2.607-2.78-5.084 2.78 5.587-5.93 2.67 2.78 5.022-2.78-5.588 5.93z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-2xl font-bold text-slate-400 mb-3">Messenger</h3>
                                                <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[280px]">
                                                    Allow your users to talk to your AI Agent via Facebook.
                                                </p>
                                                <div className="bg-slate-50 text-slate-400 px-5 py-2 rounded-full text-[13px] font-bold border border-slate-100">
                                                    即將推出
                                                </div>
                                            </div>

                                            {/* Instagram */}
                                            <div className="bg-white rounded-[32px] p-10 border border-slate-100 opacity-60 flex flex-col items-center text-center grayscale">
                                                <div className="w-20 h-20 bg-pink-50 rounded-3xl flex items-center justify-center mb-6">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#E4405F">
                                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-2xl font-bold text-slate-400 mb-3">Instagram</h3>
                                                <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[280px]">
                                                    Automate replies for your Instagram Business account.
                                                </p>
                                                <div className="bg-slate-50 text-slate-400 px-5 py-2 rounded-full text-[13px] font-bold border border-slate-100">
                                                    即將推出
                                                </div>
                                            </div>

                                            {/* Telegram */}
                                            <div className="bg-white rounded-[32px] p-10 border border-slate-100 opacity-60 flex flex-col items-center text-center grayscale">
                                                <div className="w-20 h-20 bg-sky-50 rounded-3xl flex items-center justify-center mb-6">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#0088cc">
                                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.87 8.818c-.141.621-.51.772-1.033.479l-2.85-2.099-1.375 1.322c-.153.153-.281.281-.575.281l.204-2.895 5.272-4.762c.229-.204-.05-.316-.356-.113l-6.516 4.103-2.801-.875c-.61-.19-.621-.61.127-.905l10.94-4.217c.507-.187.951.116.833.103v.203z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-2xl font-bold text-slate-400 mb-3">Telegram</h3>
                                                <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[280px]">
                                                    Connect your bot to Telegram chats and groups.
                                                </p>
                                                <div className="bg-slate-50 text-slate-400 px-5 py-2 rounded-full text-[13px] font-bold border border-slate-100">
                                                    即將推出
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            case 'playground':
                                return (
                                    <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-500">
                                        <div className="mb-6 flex justify-between items-center">
                                            <div>
                                                <h1 className="text-3xl font-bold text-slate-900 mb-1">Playground 測試</h1>
                                                <p className="text-slate-500">測試您的 AI Agent 對話邏輯與 FAQ 命中情況。</p>
                                            </div>
                                            <button
                                                onClick={resetPlaygroundChat}
                                                className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-brand-600 font-bold transition-colors"
                                            >
                                                <RotateCcw size={18} />
                                                重置對話
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                                            {/* Left Column: FAQ List */}
                                            <div className="col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                                        <MessageCircle size={18} className="text-brand-600" />
                                                        測試問題清單
                                                    </h3>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                    {(currentAgent?.config?.raw_config?.faqs || []).map((faq, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handlePlaygroundFaqClick(faq.question)}
                                                            disabled={isPlaygroundLoading}
                                                            className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-brand-300 hover:bg-brand-50/50 transition-all group"
                                                        >
                                                            <div className="text-[10px] font-bold text-slate-400 mb-1 group-hover:text-brand-500 uppercase tracking-widest">FAQ {idx + 1}</div>
                                                            <p className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 leading-relaxed">
                                                                {faq.question}
                                                            </p>
                                                        </button>
                                                    ))}
                                                    {(!currentAgent?.config?.raw_config?.faqs || currentAgent.config.raw_config.faqs.length === 0) && (
                                                        <div className="text-center py-10 text-slate-400 text-xs italic">尚未設定任和 FAQ</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Middle Column: Chat Interface */}
                                            <div className="col-span-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                                                    {playgroundMessages.map((msg, idx) => (
                                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-brand-600 text-white'}`}>
                                                                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                                                </div>
                                                                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                                                    ? 'bg-brand-600 text-white rounded-tr-none'
                                                                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                                                    }`}>
                                                                    {msg.text}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {isPlaygroundLoading && (
                                                        <div className="flex justify-start animate-pulse">
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm">
                                                                    <Bot size={18} />
                                                                </div>
                                                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                                                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div ref={playgroundMessagesEndRef} />
                                                </div>

                                                <div className="p-6 bg-white border-t border-slate-100">
                                                    <div className="flex items-center gap-3 relative">
                                                        <input
                                                            type="text"
                                                            value={playgroundInput}
                                                            onChange={(e) => setPlaygroundInput(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePlaygroundSend()}
                                                            placeholder="輸入測試訊息內容..."
                                                            className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                                                            disabled={isPlaygroundLoading}
                                                        />
                                                        <button
                                                            onClick={() => handlePlaygroundSend()}
                                                            disabled={!playgroundInput.trim() || isPlaygroundLoading}
                                                            className="absolute right-2 p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-100 active:scale-95"
                                                        >
                                                            <Send size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column: Analysis */}
                                            <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
                                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                                                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                                            <Info size={18} className="text-brand-600" />
                                                            回應分析
                                                        </h3>
                                                    </div>
                                                    <div className="flex-1 p-6 overflow-y-auto">
                                                        {!lastResponseInfo ? (
                                                            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4 border border-slate-100">
                                                                    <Bot size={32} />
                                                                </div>
                                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">目前尚無分析數據<br />請先在對話框輸入訊息</p>
                                                            </div>
                                                        ) : (
                                                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                                                {lastResponseInfo.related_faqs && lastResponseInfo.related_faqs.length > 0 &&
                                                                    lastResponseInfo.related_faqs.map((faq, i) => (
                                                                        <div key={`faq-${i}`} className="space-y-3">
                                                                            <div className="flex items-center gap-2 text-green-600">
                                                                                <CheckCircle2 size={16} />
                                                                                <span className="text-xs font-bold uppercase tracking-wider">成功命中 FAQ</span>
                                                                            </div>
                                                                            <div className="bg-green-50/30 border border-green-100 rounded-2xl p-4">
                                                                                <div className="text-[10px] font-black text-green-600 uppercase mb-3 tracking-widest opacity-70">參考來源</div>
                                                                                <div className="text-xs space-y-3">
                                                                                    <div className="flex gap-2">
                                                                                        <span className="font-bold text-slate-700 shrink-0">Q:</span>
                                                                                        <span className="text-slate-600 leading-relaxed">{faq.Q}</span>
                                                                                    </div>
                                                                                    <div className="flex gap-2">
                                                                                        <span className="font-bold text-slate-700 shrink-0">A:</span>
                                                                                        <span className="text-slate-600 leading-relaxed">{faq.A}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <hr className="my-4 border-green-100/50" />
                                                                                <div className="bg-white/80 p-3 rounded-xl border border-green-50 text-[11px] text-green-700 font-medium flex items-start gap-2">
                                                                                    <Lightbulb size={14} className="mt-0.5 shrink-0" />
                                                                                    <div>
                                                                                        <span className="font-bold mr-1">建議：</span>
                                                                                        此問題精準命中，回答質量穩定。
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                }

                                                                {lastResponseInfo.handoff?.hand_off && (
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2 text-red-500">
                                                                            <ShieldAlert size={16} />
                                                                            <span className="text-xs font-bold uppercase tracking-wider">觸發轉人工</span>
                                                                        </div>
                                                                        <div className="bg-red-50/30 border border-red-100 rounded-2xl p-4">
                                                                            <div className="text-[10px] font-black text-red-500 uppercase mb-2 tracking-widest opacity-70">攔截原因</div>
                                                                            <div className="text-xs font-bold text-slate-800 mb-3 leading-relaxed">{lastResponseInfo.handoff.reason}</div>
                                                                            <div className="px-3 py-1.5 bg-white border border-red-100 rounded-lg text-[10px] text-red-600 font-bold inline-flex items-center gap-2 shadow-sm">
                                                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                                                                已中斷 AI 並標記轉接
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {(!lastResponseInfo.related_faqs || lastResponseInfo.related_faqs.length === 0) && !lastResponseInfo.handoff?.hand_off && (
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center gap-2 text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-lg w-fit">
                                                                            <HelpCircle size={14} />
                                                                            <span className="text-[11px] font-bold uppercase tracking-wider">未命中 FAQ</span>
                                                                        </div>
                                                                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                                                                            <div className="bg-amber-100 w-8 h-8 rounded-xl text-amber-600 flex items-center justify-center shrink-0">
                                                                                <Lightbulb size={18} />
                                                                            </div>
                                                                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                                                                Agent 目前正根據商家簡介進行一般性回覆。若希望更精準回答，請在管理頁面新增 FAQ。
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            default:
                                return <div className="flex items-center justify-center h-full text-slate-400">目前開發中...</div>;
                        }
                    })()}
                </div>

                {/* LINE Integration Modal */}
                {isLineModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-2xl"
                            onClick={() => setIsLineModalOpen(false)}
                        />
                        <div className="relative bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#06C755] rounded-xl flex items-center justify-center text-white">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.052.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.893 2.572-5.992z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">LINE 官方帳號設定</h2>
                                </div>
                                <button
                                    onClick={() => setIsLineModalOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-10 space-y-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 block">Channel Access Token</label>
                                        <input
                                            type="text"
                                            value={lineConfig.accessToken}
                                            onChange={(e) => setLineConfig({ ...lineConfig, accessToken: e.target.value })}
                                            placeholder="輸入 Channel Access Token"
                                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#06C755]/20 focus:border-[#06C755] outline-none transition-all text-slate-700 font-medium placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 block">Channel Secret</label>
                                        <input
                                            type="password"
                                            value={lineConfig.channelSecret}
                                            onChange={(e) => setLineConfig({ ...lineConfig, channelSecret: e.target.value })}
                                            placeholder="輸入 Channel Secret"
                                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#06C755]/20 focus:border-[#06C755] outline-none transition-all text-slate-700 font-medium placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center gap-4">
                                <button
                                    disabled={isDeploying}
                                    onClick={handleDeployLine}
                                    className="bg-[#06C755] hover:bg-[#05B04A] disabled:opacity-50 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-[#06C755]/20 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {isDeploying ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <Check size={20} />
                                    )}
                                    儲存並啟用
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* LINE Integration Modal ... (existing code) */}
                {/* Pre-existing LINE Modal code ends around 1293 */}

                {/* Subagent Market Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <div className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">Agent 市場</h2>
                                        <p className="text-slate-400 text-sm">解鎖新的 AI 專員，強化您的團隊能力。</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {availableSubagents.map((sub, idx) => (
                                        <div
                                            key={idx}
                                            className={`group bg-white rounded-3xl p-6 border ${sub.enabled ? 'border-slate-100' : 'border-slate-50 opacity-60'} hover:border-brand-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`w-14 h-14 ${bgColorMap[sub.name] || 'bg-slate-50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                    {iconMap[sub.name] || <PieChart size={24} className="text-brand-600" />}
                                                </div>
                                                {sub.enabled ? (
                                                    <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-bold border border-green-100">
                                                        AVAILABLE
                                                    </div>
                                                ) : (
                                                    <div className="bg-slate-50 text-slate-400 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-100">
                                                        COMING SOON
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-900 mb-1">{sub.name}</h4>
                                            <p className="text-slate-500 text-xs mb-6 flex-1 leading-relaxed">
                                                {sub.description}
                                            </p>
                                            <button
                                                disabled={!sub.enabled || loading}
                                                onClick={() => handleUnlockSubagent(sub._id)}
                                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${sub.enabled
                                                    ? 'bg-slate-900 text-white hover:bg-brand-600 shadow-lg'
                                                    : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                                    }`}
                                            >
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                                {sub.enabled ? '立即解鎖' : '開發中'}
                                            </button>
                                        </div>
                                    ))}
                                    {availableSubagents.length === 0 && (
                                        <div className="col-span-2 text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                            <p className="text-slate-400 text-sm italic">目前沒有可解鎖的新 Agent</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Notification to match Image 3 */}
                <div className="fixed bottom-8 right-8 lg:bottom-12 lg:right-12">
                    <div className="bg-white rounded-2xl shadow-2xl border border-red-50 p-4 flex items-center gap-4 animate-bounce">
                        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                            <Bell className="animate-pulse" size={24} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-red-500 uppercase tracking-widest">待處理 (1)</div>
                            <div className="text-sm font-bold text-slate-800">有 1 則訊息等待人工回覆</div>
                        </div>
                        <ChevronRight className="text-slate-300" size={20} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BackendDashboard;
