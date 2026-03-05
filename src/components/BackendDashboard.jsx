import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
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
    AlertCircle,
    CheckCircle2,
    Lightbulb,
    HelpCircle,
    ChevronLeft,
    ChevronUp,
    ChevronDown,
    Trash2,
    Sparkles,
    Stethoscope,
    Crown,
    Power,
    Search
} from 'lucide-react';
import Cookies from 'js-cookie';
import { DEFAULT_HANDOFF_OPTIONS } from '../types';
import InboxView from './InboxView';
import { useAuth } from '../context/AuthContext';

const SUB_SECTION_MAP = {
    'knowledge-base': 'Knowledge Base',
    'product-catalog': 'Product Catalog',
    'escalation-manager': 'Escalation Manager',
    'root-admin': 'Root Admin',
};
const EDITING_TO_SUB = {
    'Knowledge Base': 'knowledge-base',
    'Product Catalog': 'product-catalog',
    'Escalation Manager': 'escalation-manager',
    'Root Admin': 'root-admin',
};

const BackendDashboard = () => {
    const { userName, userEmail, userPicture } = useAuth();
    const { agentId: routeAgentId, '*': remainingPath } = useParams();
    const pathParts = (remainingPath || '').split('/').filter(Boolean);
    const section = pathParts[0] || undefined;
    const subSection = pathParts[1] || undefined;
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const activeMenu = section || 'agents';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAgent, setCurrentAgent] = useState(location.state?.agent || null);
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
    const editingSubagent = subSection ? (SUB_SECTION_MAP[subSection] ?? null) : null;
    const [editingFaqs, setEditingFaqs] = useState([]);
    const [editingProducts, setEditingProducts] = useState([]);
    const [knowledgeTab, setKnowledgeTab] = useState('faq');
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
    const [isBrandInfoExpanded, setIsBrandInfoExpanded] = useState(false);
    const [isPersonaExpanded, setIsPersonaExpanded] = useState(false);
    const faqsEndRef = React.useRef(null);
    const productsEndRef = React.useRef(null);

    // AI Health Check states
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState(null);

    // Add FAQ / Product modal states
    const [showFaqModal, setShowFaqModal] = useState(false);
    const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
    const [showProductModal, setShowProductModal] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', description: '', keywords: '' });

    // CRM states
    const [crmUsers, setCrmUsers] = useState([]);
    const [isLoadingCrm, setIsLoadingCrm] = useState(false);
    const [settingNotifyId, setSettingNotifyId] = useState(null);
    const [selectedCrmUser, setSelectedCrmUser] = useState(null);
    const [notifySearch, setNotifySearch] = useState('');

    const formatToken = (val) => {
        if (val === undefined || val === null) return '0';
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
        return val.toLocaleString();
    };

    const fetchCrmUsers = useCallback(async () => {
        if (!currentAgent?._id || !currentAgent?.admin_id) return;
        setIsLoadingCrm(true);
        try {
            const res = await axios.get(
                `${config.API_URL}/api/inbox/agents/${currentAgent._id}/users?userId=${currentAgent.admin_id}`
            );
            setCrmUsers(res.data.users || []);
        } catch (err) {
            console.error('Failed to fetch CRM users:', err);
        } finally {
            setIsLoadingCrm(false);
        }
    }, [currentAgent]);

    useEffect(() => {
        if (activeMenu === 'crm' || editingSubagent === 'Escalation Manager') fetchCrmUsers();
    }, [activeMenu, editingSubagent, fetchCrmUsers]);

    // lineId = 卡片的 line_id（用於 loading state），newValue = 實際要寫入的值（'' = 清除）
    const handleSetNotifyUser = async (lineId, newValue) => {
        setSettingNotifyId(lineId);
        try {
            await axios.post(
                `${config.API_URL}/api/inbox/agents/${currentAgent._id}/notify-user?userId=${currentAgent.admin_id}`,
                { agent_id: currentAgent._id, line_user_id: newValue }
            );
            await fetchCrmUsers();
            // 同步更新抽屜中的 is_notify_target
            setSelectedCrmUser(prev =>
                prev ? { ...prev, is_notify_target: prev.line_id === newValue } : null
            );
        } finally {
            setSettingNotifyId(null);
        }
    };

    // Fetch agent by id when navigated directly (no location state)
    useEffect(() => {
        if (!currentAgent && routeAgentId) {
            const userId = Cookies.get('google_user_id');
            axios.get(`${config.API_URL}/api/admin/agent/${routeAgentId}`, {
                params: { userId }
            })
                .then(res => {
                    if (res.data && res.data._id) setCurrentAgent(res.data);
                })
                .catch(err => console.error('Failed to fetch agent:', err));
        }
    }, []);

    useEffect(() => {
        if (currentAgent) {
            const rawConfig = currentAgent.config?.raw_config || {};
            setEditingFaqs(rawConfig.faqs || []);
            setEditingProducts(rawConfig.products || []);

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

            // Sync LINE config
            setLineConfig({
                accessToken: currentAgent.deploy_config?.access_token || '',
                channelSecret: currentAgent.deploy_config?.channel_secret || ''
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
    }, [editingSubagent, activeMenu, currentAgent?._id]);

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
    }, [currentAgent?._id]);

    useEffect(() => {
        if (editingSubagent === 'Root Admin') {
            fetchAgentData();
        }
    }, [editingSubagent]);

    useEffect(() => {
        if (editingSubagent !== 'Knowledge Base' && editingSubagent !== 'Product Catalog') {
            setAnalysisReport(null);
        }
        if (editingSubagent === 'Product Catalog') {
            setKnowledgeTab('product');
        } else if (editingSubagent === 'Knowledge Base') {
            setKnowledgeTab('faq');
        }
    }, [editingSubagent]);

    const handleUnlockSubagent = async (subagentId) => {
        try {
            setLoading(true);
            await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/add_subagent`, {
                subagent_id: subagentId
            });

            // Refresh data
            await fetchAgentData();

            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to unlock subagent:', error);
            alert('解除鎖定失敗，請稍後再試。');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSubagent = async (subagentId, currentStatus, subagentName) => {
        if (subagentName === 'Knowledge Base' && currentStatus === true) {
            alert('客服專員必須開啟，無法關閉');
            return;
        }
        try {
            setLoading(true);
            await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/toggle_subagent`, {
                userId: currentAgent.admin_id,
                subagent_id: subagentId,
                enable: !currentStatus
            });
            // Refresh data
            await fetchAgentData();
        } catch (error) {
            console.error('Failed to toggle subagent:', error);
            alert('切換狀態失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleDeployLine = async () => {
        if (!currentAgent?._id) {
            alert('Agent 資料尚未載入，請重新整理頁面後再試。');
            return;
        }
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
            const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message || '未知錯誤';
            alert('部署過程中發生錯誤: ' + detail);
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
            const line_user_id = Cookies.get('google_user_id');
            const line_user_name = Cookies.get('google_user_name');
            const response = await axios.post(`${config.API_URL}/api/chat`, {
                message: msgText,
                line_user_id: line_user_id,
                user_name: line_user_name,
                agent_id: currentAgent._id,
                session_id: playgroundSessionId,
                source: 'test'
            });

            const { response_text, related_faq_list, related_product_list, handoff_result } = response.data;
            const newMessage = {
                role: 'model',
                text: response_text,
                related_faqs: related_faq_list || [],
                related_products: related_product_list || [],
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

    const handleAnalyzeFaqs = async () => {
        if (!editingFaqs || editingFaqs.length === 0) {
            alert('請先新增問答組');
            return;
        }

        const hasIncomplete = editingFaqs.some(f => !f.question?.trim() || !f.answer?.trim());
        if (hasIncomplete) {
            alert('請填寫所有 FAQ 的問題與回答，再進行健檢');
            return;
        }

        if (editingFaqs.length > 20) {
            alert('FAQ 組數上限為 20 組');
            return;
        }

        const tooLong = editingFaqs.some(f => (f.question?.length || 0) > 50 || (f.answer?.length || 0) > 200);
        if (tooLong) {
            alert('部分內容超過字數限制 (問題 50 字，回答 200 字)');
            return;
        }

        setIsAnalyzing(true);
        try {
            const line_user_id = Cookies.get('google_user_id');
            const response = await axios.post(`${config.API_URL}/api/analyze_faqs`, {
                brandDescription: currentAgent?.config?.raw_config?.services || currentAgent?.name || '',
                faqs: editingFaqs.map((f, i) => ({ ...f, id: f.id || i.toString() })),
                line_user_id: line_user_id
            });

            if (response.data && !response.data.error) {
                setAnalysisReport(response.data);
            } else {
                alert('健檢失敗：' + (response.data.error || '未知錯誤'));
            }
        } catch (error) {
            console.error('Failed to analyze FAQs:', error);
            alert('健檢過程中發生錯誤');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applySuggestion = (idx, optimizedQ, optimizedA) => {
        const newFaqs = [...editingFaqs];
        newFaqs[idx] = {
            ...newFaqs[idx],
            question: optimizedQ,
            answer: optimizedA
        };
        setEditingFaqs(newFaqs);

        // Remove suggestion from report after applying
        if (analysisReport) {
            const faqId = (editingFaqs[idx].id || idx.toString()).toString();
            setAnalysisReport(prev => ({
                ...prev,
                suggestions: prev.suggestions.filter(s => s.id.toString() !== faqId)
            }));
        }
    };

    const handleOptimizeFaq = async (idx) => {
        const faq = editingFaqs[idx];
        if (!faq.question?.trim() || !faq.answer?.trim()) {
            alert('請先輸入完整的問題與回答內容才能進行優化');
            return;
        }
        if ((faq.question?.length || 0) > 50 || (faq.answer?.length || 0) > 200) {
            alert('內容超過字數限制 (問題 50 字，回答 200 字)');
            return;
        }

        setOptimizingIndices(prev => new Set(prev).add(idx));
        try {
            const line_user_id = Cookies.get('google_user_id');
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
        // 過濾掉全空的組別
        const cleanedFaqs = editingFaqs.filter(f => f.question?.trim() !== '' || f.answer?.trim() !== '');

        if (cleanedFaqs.length === 0) {
            alert('請至少新增一組 FAQ 並填寫內容');
            return;
        }

        const hasIncomplete = cleanedFaqs.some(f => !f.question?.trim() || !f.answer?.trim());
        if (hasIncomplete) {
            alert('請填寫所有 FAQ 的問題與回答，或是刪除未填寫完整的組別');
            return;
        }

        if (cleanedFaqs.length > 20) {
            alert('FAQ 組數上限為 20 組');
            return;
        }

        const tooLong = cleanedFaqs.some(f => (f.question?.length || 0) > 50 || (f.answer?.length || 0) > 200);
        if (tooLong) {
            alert('部分內容超過字數限制 (問題 50 字，回答 200 字)');
            return;
        }

        try {
            setIsSaving(true);
            const res = await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/update_faqs`, {
                userId: currentAgent.admin_id,
                faqs: cleanedFaqs
            });
            if (res.data.status === 'ok') {
                alert('FAQ 更新成功！');
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
                navigate('/agent/' + routeAgentId + '/agents');
            }
        } catch (error) {
            console.error('Failed to save FAQs:', error);
            alert('儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProducts = async () => {
        // 過濾掉全空的組別
        const cleanedProducts = editingProducts.filter(p => p.name?.trim() !== '' || p.description?.trim() !== '');

        // 允許空列表（清空商品庫）

        const hasIncomplete = cleanedProducts.some(p => !p.name?.trim() || !p.description?.trim());
        if (hasIncomplete) {
            alert('請填寫所有商品的名稱與說明，或是刪除未填寫完整的項目');
            return;
        }

        if (cleanedProducts.length > 50) {
            alert('商品數量上限為 50 個');
            return;
        }

        const tooLong = cleanedProducts.some(p => (p.name?.length || 0) > 50 || (p.description?.length || 0) > 400 || (p.keywords?.length || 0) > 100);
        if (tooLong) {
            alert('部分內容超過字數限制 (名稱 50 字，說明 400 字，關鍵字 100 字)');
            return;
        }

        try {
            setIsSaving(true);
            const res = await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/update_products`, {
                userId: currentAgent.admin_id,
                products: cleanedProducts
            });
            if (res.data.status === 'ok') {
                alert('商品庫更新成功！');
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
                navigate('/agent/' + routeAgentId + '/agents');
            }
        } catch (error) {
            console.error('Failed to save products:', error);
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
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
                navigate('/agent/' + routeAgentId + '/agents');
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
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
                navigate('/agent/' + routeAgentId + '/agents');
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
        "Product Catalog": <Package size={24} className="text-green-600" />,
        "Escalation Manager": <Shield size={24} className="text-orange-600" />,
        "Order Agent": <Package size={24} className="text-slate-400" />,
        "Sales Agent": <LineChart size={24} className="text-slate-400" />
    };

    const bgColorMap = {
        "Knowledge Base": 'bg-blue-50',
        "Product Catalog": 'bg-green-50',
        "Escalation Manager": 'bg-orange-50',
        "Order Agent": 'bg-slate-50',
        "Sales Agent": 'bg-slate-50'
    };

    const teamSubagents = (currentAgent?.used_subagent_details || [])
        .map(sa => ({
            ...sa,
            icon: iconMap[sa.name] || <PieChart size={24} className="text-brand-600" />,
            bgColor: bgColorMap[sa.name] || 'bg-slate-50',
            enabled: sa.enable !== undefined ? sa.enable : true
        }));

    const stats = [
        {
            label: '今日對話數',
            value: '-',
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
                { id: 'dashboard', label: '營運儀表板', icon: <LayoutGrid size={20} />, isLocked: true }
            ]
        },
        {
            group: 'AI 團隊管理', items: [
                { id: 'agents', label: '虛擬團隊 (Agents)', icon: <Users size={20} /> }
            ]
        },
        {
            group: '客戶互動', items: [
                { id: 'inbox', label: '對話收件匣', icon: <MessageSquare size={20} /> },
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
        <div className="h-screen bg-[#F8F9FC] flex overflow-hidden">
            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 shrink-0 bg-white border-r border-slate-200 lg:static lg:translate-x-0 lg:transition-none
                ${isSidebarOpen ? 'translate-x-0 transition-transform duration-300 ease-in-out' : '-translate-x-full transition-transform duration-300 ease-in-out'}
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
                                                if (item.isLocked) return;
                                                navigate('/agent/' + routeAgentId + '/' + item.id);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={`
                                                w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all
                                                ${item.isLocked ? 'cursor-not-allowed' : ''}
                                                ${activeMenu === item.id
                                                    ? 'bg-brand-50 text-brand-700 font-medium'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.icon}
                                                <span className={item.isLocked ? 'text-slate-400' : ''}>{item.label}</span>
                                            </div>
                                            {item.isLocked ? (
                                                <Lock size={14} className="text-slate-400" />
                                            ) : item.badge && (
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
                                {userPicture ? (
                                    <img src={userPicture} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {(userName || userEmail || '?')[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h6 className="text-sm font-bold text-slate-900 truncate">{userName || '管理員'}</h6>
                                    <p className="text-[10px] text-slate-500 truncate">{userEmail || ''}</p>
                                </div>
                                <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600">
                                    <ExternalLink size={16} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-slate-100">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">🪙</span>
                                    <span className="text-xs font-bold text-slate-700">Unlimited</span>
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
                                    onClick={() => navigate('/agent/' + routeAgentId + '/agents')}
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
                        {/* <button className="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button> */}
                        <div className="hidden sm:flex items-center gap-4 border-l border-slate-100 pl-4 ml-4">
                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-900">{userName || '管理員'}</div>
                                <div className="text-[10px] text-slate-400">{userEmail || ''}</div>
                            </div>
                            {userPicture ? (
                                <img src={userPicture} alt="avatar" className="w-10 h-10 rounded-xl object-cover" />
                            ) : (
                                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                    {(userName || userEmail || '?')[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        {/* Menu icon in top right as per Image 3/4 */}
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-600">
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-6">
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
                                if (editingSubagent === 'Knowledge Base' || editingSubagent === 'Product Catalog') {
                                    return (
                                        <div className="w-full max-w-5xl">
                                            {/* Header Section */}
                                            <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
                                                        <BookOpen size={22} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">客服部專員 (Knowledge Base)</h1>
                                                        <p className="text-slate-500 text-xs sm:text-sm">這是「客服部專員」的大腦。AI 會優先檢索這裡的內容來回答客戶。</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tab Bar */}
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                <button
                                                    onClick={() => { setKnowledgeTab('faq'); navigate(`/agent/${routeAgentId}/agents/knowledge-base`); }}
                                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${knowledgeTab === 'faq' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                >
                                                    <span className="flex items-center gap-2"><BookOpen size={16} /> FAQ (店規/流程)</span>
                                                </button>
                                                <button
                                                    onClick={() => { setKnowledgeTab('product'); navigate(`/agent/${routeAgentId}/agents/product-catalog`); }}
                                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${knowledgeTab === 'product' ? 'bg-green-600 text-white shadow-md shadow-green-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                >
                                                    <span className="flex items-center gap-2"><Package size={16} /> 商品庫 (菜單/規格)</span>
                                                </button>
                                            </div>

                                            {knowledgeTab === 'faq' ? (
                                            <>
                                            {/* FAQ Content Area */}
                                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                                                <div className="p-4 sm:p-8 border-b border-slate-100 bg-slate-50/30 flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">FAQ 知識庫管理</h3>
                                                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Manage Knowledge Base</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                        <button
                                                            onClick={handleAnalyzeFaqs}
                                                            disabled={isAnalyzing}
                                                            className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                                                        >
                                                            {isAnalyzing ? (
                                                                <Loader2 size={18} className="text-blue-500 animate-spin" />
                                                            ) : (
                                                                <Stethoscope size={18} className="text-blue-500" />
                                                            )}
                                                            <span className="hidden sm:inline">AI 智能健檢</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (editingFaqs.length >= 20) {
                                                                    alert('最多只能新增 20 組 FAQ');
                                                                    return;
                                                                }
                                                                setNewFaq({ question: '', answer: '' });
                                                                setShowFaqModal(true);
                                                            }}
                                                            className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-md shadow-brand-100"
                                                        >
                                                            <Plus size={18} />
                                                            新增問答
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-4 sm:p-10 space-y-8">
                                                    {analysisReport && (
                                                        <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl relative">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                                                                    <CheckCircle2 size={24} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-emerald-900">
                                                                        AI 健檢報告 (得分: {analysisReport.score})
                                                                    </h4>
                                                                    <p className="text-xs text-emerald-600">這是 AI 對目前知識庫的診斷結果。</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-emerald-800 leading-relaxed mb-3 whitespace-pre-line">
                                                                {analysisReport.report}
                                                            </p>
                                                            {analysisReport.suggestions.length > 0 && (
                                                                <p className="text-xs text-emerald-500 font-medium italic">
                                                                    * 請查看下方卡片中的具體優化建議，點擊「快速取代」即可修正。
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {editingFaqs.map((faq, idx) => (
                                                        <div key={idx} className="group relative bg-slate-50/50 rounded-3xl p-4 sm:p-8 border border-slate-100 hover:border-brand-200 hover:bg-white transition-all duration-300">
                                                            <div className="absolute -top-3 left-6 sm:left-8 bg-white border border-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                                                                Q{idx + 1}
                                                            </div>
                                                            <div className="absolute top-4 sm:top-6 right-4 sm:right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-slate-400">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Question</span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="relative">
                                                                            <input
                                                                                type="text"
                                                                                value={faq.question}
                                                                                maxLength={50}
                                                                                onChange={(e) => {
                                                                                    const newFaqs = [...editingFaqs];
                                                                                    newFaqs[idx].question = e.target.value;
                                                                                    setEditingFaqs(newFaqs);
                                                                                }}
                                                                                placeholder="輸入常見問題..."
                                                                                className="w-full bg-transparent text-lg font-bold text-slate-800 placeholder:text-slate-300 outline-none p-0"
                                                                            />
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{faq.question?.length || 0}/50</div>
                                                                    </div>
                                                                </div>

                                                                {analysisReport && analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()) && (
                                                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl relative">
                                                                        <div className="flex items-start gap-3 mb-3">
                                                                            <AlertCircle size={18} className="text-amber-500 mt-0.5" />
                                                                            <div>
                                                                                <p className="text-sm text-amber-900 font-bold mb-1">優化建議：</p>
                                                                                <p className="text-xs text-amber-700 leading-relaxed italic">
                                                                                    {analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()).suggestion}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex-1 p-2 bg-white/80 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                                                                                <div className="font-bold text-amber-900 mb-1">Q: {analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()).optimized_q}</div>
                                                                                <div className="line-clamp-2">A: {analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()).optimized_a}</div>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const s = analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString());
                                                                                    applySuggestion(idx, s.optimized_q, s.optimized_a);
                                                                                }}
                                                                                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-amber-300 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all shadow-sm whitespace-nowrap"
                                                                            >
                                                                                <RotateCcw size={14} />
                                                                                <span>快速取代</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-slate-400">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Answer</span>
                                                                    </div>
                                                                    <div className="relative">
                                                                        <textarea
                                                                            value={faq.answer}
                                                                            maxLength={200}
                                                                            onChange={(e) => {
                                                                                const newFaqs = [...editingFaqs];
                                                                                newFaqs[idx].answer = e.target.value;
                                                                                setEditingFaqs(newFaqs);
                                                                            }}
                                                                            placeholder="輸入預設回覆回答內容..."
                                                                            className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-slate-600 text-sm leading-relaxed min-h-[120px] focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-inner"
                                                                        />
                                                                        <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{faq.answer?.length || 0}/200</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div ref={faqsEndRef} />

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

                                                <div className="px-4 sm:px-10 py-6 sm:py-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
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
                                            </>
                                            ) : (
                                            <>
                                            {/* Product Content Area */}
                                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                                                <div className="p-4 sm:p-8 border-b border-slate-100 bg-slate-50/30 flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">商品庫管理</h3>
                                                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Manage Product Catalog</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => {
                                                                if (editingProducts.length >= 50) {
                                                                    alert('最多只能新增 50 個商品');
                                                                    return;
                                                                }
                                                                setNewProduct({ name: '', description: '', keywords: '' });
                                                                setShowProductModal(true);
                                                            }}
                                                            className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-md shadow-green-100"
                                                        >
                                                            <Plus size={18} />
                                                            新增商品
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-4 sm:p-10 space-y-8">
                                                    {editingProducts.map((product, idx) => (
                                                        <div key={idx} className="group relative bg-slate-50/50 rounded-3xl p-4 sm:p-8 border border-slate-100 hover:border-green-200 hover:bg-white transition-all duration-300">
                                                            <div className="absolute -top-3 left-6 sm:left-8 bg-white border border-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-green-500 uppercase tracking-widest shadow-sm">
                                                                P{idx + 1}
                                                            </div>
                                                            <div className="absolute top-4 sm:top-6 right-4 sm:right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => setEditingProducts(editingProducts.filter((_, i) => i !== idx))}
                                                                    className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-red-500 rounded-xl shadow-sm transition-all hover:scale-105"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-slate-400">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">商品名稱</span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <input
                                                                            type="text"
                                                                            value={product.name}
                                                                            maxLength={50}
                                                                            onChange={(e) => {
                                                                                const newProducts = [...editingProducts];
                                                                                newProducts[idx].name = e.target.value;
                                                                                setEditingProducts(newProducts);
                                                                            }}
                                                                            placeholder="輸入商品名稱..."
                                                                            className="w-full bg-transparent text-lg font-bold text-slate-800 placeholder:text-slate-300 outline-none p-0"
                                                                        />
                                                                        <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{product.name?.length || 0}/50</div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-slate-400">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">菜單/規格說明</span>
                                                                    </div>
                                                                    <div className="relative">
                                                                        <textarea
                                                                            value={product.description}
                                                                            maxLength={400}
                                                                            onChange={(e) => {
                                                                                const newProducts = [...editingProducts];
                                                                                newProducts[idx].description = e.target.value;
                                                                                setEditingProducts(newProducts);
                                                                            }}
                                                                            placeholder="輸入商品說明、規格、價格等..."
                                                                            className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-slate-600 text-sm leading-relaxed min-h-[120px] focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all shadow-inner"
                                                                        />
                                                                        <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{product.description?.length || 0}/400</div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-slate-400">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">關鍵字/別名 (選填)</span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <input
                                                                            type="text"
                                                                            value={product.keywords || ''}
                                                                            maxLength={100}
                                                                            onChange={(e) => {
                                                                                const newProducts = [...editingProducts];
                                                                                newProducts[idx].keywords = e.target.value;
                                                                                setEditingProducts(newProducts);
                                                                            }}
                                                                            placeholder="例：珍奶、波霸、大杯紅茶..."
                                                                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-slate-600 text-sm focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all shadow-inner"
                                                                        />
                                                                        <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{(product.keywords || '').length}/100</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div ref={productsEndRef} />

                                                    {editingProducts.length === 0 && (
                                                        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                <Package size={32} className="text-slate-200" />
                                                            </div>
                                                            <h4 className="text-slate-800 font-bold mb-1">商品庫目前為空</h4>
                                                            <p className="text-xs text-slate-400">點擊上方「新增商品」開始建立商品目錄。</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="px-4 sm:px-10 py-6 sm:py-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                                    <button
                                                        disabled={isSaving}
                                                        onClick={handleSaveProducts}
                                                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-10 py-3.5 rounded-2xl shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2"
                                                    >
                                                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                                        儲存設定
                                                    </button>
                                                </div>
                                            </div>
                                            </>
                                            )}
                                        </div>
                                    );
                                }

                                if (editingSubagent === 'Escalation Manager') {
                                    return (
                                        <div className="max-w-5xl">
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
                                            {/* <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-orange-100 shrink-0 shadow-sm">
                                                    <Shield size={20} className="text-orange-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-orange-800">防守型策略中心</h4>
                                                    <p className="text-xs text-orange-600 leading-relaxed mt-1">
                                                        這裡定義人機協作專員的行為。當偵測到風險或回答不出來時，<span className="font-bold">Agent 會自動轉接並建立工單 (Ticket)</span>，確保你不會漏掉任何重要客戶。
                                                    </p>
                                                </div>
                                            </div> */}

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
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={handoffConfig.custom}
                                                                maxLength={50}
                                                                onChange={(e) => setHandoffConfig({ ...handoffConfig, custom: e.target.value })}
                                                                placeholder="手動輸入關鍵字，以「、」或逗號隔開"
                                                                className="w-full bg-slate-900 text-white rounded-2xl p-5 text-sm outline-none placeholder:text-slate-600 border border-slate-800 focus:border-brand-500 transition-all shadow-2xl"
                                                            />
                                                            <div className="text-[10px] text-slate-500 text-right pr-4 mt-1">{(handoffConfig.custom || '').length}/50</div>
                                                        </div>
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
                                            {/* 通知設定 Card */}
                                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden mt-6">
                                                <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                                    <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                                        <Bell size={18} className="text-brand-600" />
                                                        2. 通知設定 (Who to Notify)
                                                    </h3>
                                                </div>
                                                <div className="p-8">
                                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2 mb-6">
                                                        <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                                        <p className="text-xs text-amber-700 leading-relaxed">
                                                            指派通知接收者後，當顧客轉人工客服，系統會透過 LINE 通知該成員。曾與 LINE Bot 互動過的所有用戶（含歷史紀錄）都會顯示於此；尚未傳過訊息的員工，需先向 Bot 發送一則訊息才會出現。
                                                        </p>
                                                    </div>
                                                    <div className="relative mb-4">
                                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            value={notifySearch}
                                                            onChange={(e) => setNotifySearch(e.target.value)}
                                                            placeholder="搜尋成員名稱..."
                                                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-brand-400 transition-all"
                                                        />
                                                    </div>
                                                    {isLoadingCrm ? (
                                                        <div className="flex items-center justify-center py-10 text-slate-400">
                                                            <Loader2 size={20} className="animate-spin mr-2" />
                                                            載入中...
                                                        </div>
                                                    ) : crmUsers.filter(u => u.user_name.toLowerCase().includes(notifySearch.toLowerCase())).length === 0 ? (
                                                        <div className="py-8 text-center text-slate-400 text-sm">
                                                            {notifySearch ? '找不到符合的成員' : '尚無用戶紀錄，請先向 LINE Bot 發送訊息'}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                                            {crmUsers
                                                                .filter(u => u.user_name.toLowerCase().includes(notifySearch.toLowerCase()))
                                                                .map((user) => (
                                                                    <div key={user.line_id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-slate-200 transition-all">
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                                                <span className="text-brand-600 font-bold text-sm">{user.user_name.charAt(0).toUpperCase()}</span>
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-semibold text-slate-800 truncate">{user.user_name}</p>
                                                                                <p className="text-xs text-slate-400 font-mono truncate">{user.line_id}</p>
                                                                            </div>
                                                                        </div>
                                                                        {user.is_notify_target ? (
                                                                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                                                <span className="flex items-center gap-1 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full border border-orange-200">
                                                                                    <Bell size={10} /> 目前接收者
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => handleSetNotifyUser(user.line_id, '')}
                                                                                    disabled={settingNotifyId !== null}
                                                                                    className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-red-50"
                                                                                >
                                                                                    {settingNotifyId === user.line_id ? <Loader2 size={12} className="animate-spin" /> : '取消'}
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleSetNotifyUser(user.line_id, user.line_id)}
                                                                                disabled={settingNotifyId !== null}
                                                                                className="flex-shrink-0 ml-3 text-xs font-semibold bg-brand-600 text-white px-3 py-1.5 rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                {settingNotifyId === user.line_id ? <Loader2 size={12} className="animate-spin" /> : '設為接收者'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (editingSubagent === 'Root Admin') {
                                    return (
                                        <div className="max-w-5xl">
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
                                                {/* <div className="flex items-center gap-4">
                                                    <div className="bg-red-50 text-red-500 px-4 py-2 rounded-2xl flex items-center gap-2 border border-red-100 shadow-sm">
                                                        <Bell size={18} className="animate-pulse" />
                                                        <span className="text-sm font-bold">待處理 (1)</span>
                                                    </div>
                                                </div> */}
                                            </div>

                                            {/* Token Usage Section - Image 2 */}
                                            {/* <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mb-8">
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
                                            </div> */}

                                            {/* Basic Info & Persona - Image 3 */}
                                            <div className="space-y-8">
                                                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                                                    <div
                                                        className="p-8 border-b border-slate-100 bg-slate-50/30 cursor-pointer flex items-center justify-between group"
                                                        onClick={() => setIsBrandInfoExpanded(!isBrandInfoExpanded)}
                                                    >
                                                        <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                                            <Package size={18} className="text-brand-600" />
                                                            品牌基本資訊
                                                        </h3>
                                                        <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                                            {isBrandInfoExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </div>
                                                    </div>
                                                    {isBrandInfoExpanded && (
                                                        <div className="p-8 space-y-6">
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">商家名稱 / 管理員暱稱</label>
                                                                <div className="relative">
                                                                    <div className="relative">
                                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                                        <input
                                                                            type="text"
                                                                            value={rootConfig.merchant_name}
                                                                            maxLength={20}
                                                                            onChange={(e) => setRootConfig({ ...rootConfig, merchant_name: e.target.value })}
                                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-700"
                                                                        />
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-300 text-right pr-4 mt-1">{(rootConfig.merchant_name || '').length}/20</div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">品牌/服務描述 (最高指令)</label>
                                                                <div className="relative">
                                                                    <textarea
                                                                        rows={4}
                                                                        value={rootConfig.services}
                                                                        maxLength={200}
                                                                        onChange={(e) => setRootConfig({ ...rootConfig, services: e.target.value })}
                                                                        className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-sm leading-relaxed text-slate-600"
                                                                        placeholder="描述您所提供的服務內容..."
                                                                    />
                                                                    <div className="text-[10px] text-slate-300 text-right pr-4 mt-1">{(rootConfig.services || '').length}/200</div>
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 mt-2 ml-2">這會是所有 Agent 理解你業務的核心依據。</p>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">網站連結 (選填)</label>
                                                                <div className="relative">
                                                                    <div className="relative">
                                                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                                        <input
                                                                            type="text"
                                                                            value={rootConfig.website_url}
                                                                            maxLength={100}
                                                                            onChange={(e) => setRootConfig({ ...rootConfig, website_url: e.target.value })}
                                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-slate-500"
                                                                            placeholder="https://..."
                                                                        />
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-300 text-right pr-4 mt-1">{(rootConfig.website_url || '').length}/100</div>
                                                                </div>
                                                            </div>

                                                            <div className="pt-8 border-t border-slate-100 flex justify-end">
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
                                                    )}
                                                </div>

                                                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                                                    <div
                                                        className="p-8 border-b border-slate-100 bg-slate-50/30 cursor-pointer flex items-center justify-between group"
                                                        onClick={() => setIsPersonaExpanded(!isPersonaExpanded)}
                                                    >
                                                        <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                                            <Sparkles size={18} className="text-brand-600" />
                                                            語氣與人設 (Persona)
                                                        </h3>
                                                        <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                                            {isPersonaExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </div>
                                                    </div>
                                                    {isPersonaExpanded && (
                                                        <div>
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
                                                                    <div className="relative">
                                                                        <input
                                                                            type="text"
                                                                            value={rootConfig.tone_avoid}
                                                                            maxLength={50}
                                                                            onChange={(e) => setRootConfig({ ...rootConfig, tone_avoid: e.target.value })}
                                                                            className="w-full px-6 py-5 bg-slate-900 text-white rounded-2xl outline-none placeholder:text-slate-600 border border-slate-800 focus:border-brand-500 transition-all text-sm"
                                                                            placeholder="例如：不要太油條、禁止使用簡體字..."
                                                                        />
                                                                        <div className="text-[10px] text-slate-500 text-right pr-4 mt-1">{(rootConfig.tone_avoid || '').length}/50</div>
                                                                    </div>
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
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="max-w-7xl">
                                        <div className="mb-10 flex justify-between items-start">
                                            <div>
                                                <h1 className="text-3xl font-bold text-slate-900 mb-2">AI 團隊管理</h1>
                                                <p className="text-slate-500">配置您的 AI 虛擬員工，啟用或停用不同職能的 Agent。</p>
                                            </div>
                                        </div>

                                        <div className="mb-12">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                                                <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                                管理核心 (MANAGEMENT CORE)
                                            </div>
                                            <div className="bg-[#1a1f2e] rounded-[32px] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group border border-white/5">
                                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-32 -mt-32 blur-[80px] pointer-events-none"></div>
                                                <div className="flex items-center gap-6 z-10 w-full md:w-auto">
                                                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden group/icon">
                                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent opacity-0 group-hover/icon:opacity-100 transition-opacity"></div>
                                                        <Crown className="text-yellow-400 relative z-10" size={36} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1.5 focus-within:ring-0">
                                                            <h3 className="text-2xl font-bold tracking-tight">營運總監 (Root Admin)</h3>
                                                            <span className="bg-yellow-400/10 text-yellow-400 text-[11px] font-bold px-2 py-0.5 rounded-md border border-yellow-400/20">核心</span>
                                                        </div>
                                                        <p className="text-slate-400 text-sm font-medium">掌管品牌設定、計費與全域規則。</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 z-10 w-full md:w-auto">
                                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-10 flex-1 md:flex-none">
                                                        <div className="px-2">
                                                            <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">今日對話</div>
                                                            <div className="text-2xl font-bold tracking-tight">
                                                                {isStatsLoading ? '...' : (tokenStats?.daily_stats?.today_chats || 128)}
                                                            </div>
                                                        </div>
                                                        <div className="w-px h-10 bg-white/10 hidden md:block"></div>
                                                        <div className="px-2">
                                                            <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">健康度</div>
                                                            <div className="text-2xl font-bold text-[#4ade80] tracking-tight">
                                                                {isStatsLoading ? '...' : (tokenStats?.daily_stats?.health_score || 100)}%
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => navigate('/agent/' + routeAgentId + '/agents/root-admin')}
                                                        className="w-14 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group/settings shadow-xl"
                                                    >
                                                        <Settings size={22} className="text-slate-300 group-hover:rotate-90 transition-transform duration-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Your Team Members */}
                                        <div className="mb-20">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                                                <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
                                                您的團隊成員 (YOUR TEAM)
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {teamSubagents.map((sub, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                        const sub_path = EDITING_TO_SUB[sub.name];
                                                        if (sub_path) navigate('/agent/' + routeAgentId + '/agents/' + sub_path);
                                                    }}
                                                        className={`bg-white rounded-[32px] p-8 border ${sub.enabled ? 'border-slate-100' : 'border-slate-50 opacity-60'} shadow-sm flex flex-col h-full relative group cursor-pointer hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-500/5 transition-all duration-500`}
                                                    >
                                                        <div className="flex items-start justify-between mb-8">
                                                            <div className={`w-14 h-14 ${sub.bgColor} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                                                                {sub.icon}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`flex items-center gap-2 ${sub.enabled ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'} px-3 py-1.5 rounded-full border ${sub.enabled ? 'border-green-100/50' : 'border-slate-200'}`}>
                                                                    <div className={`w-1.5 h-1.5 ${sub.enabled ? 'bg-green-500' : 'bg-slate-300'} rounded-full ${sub.enabled ? 'animate-pulse' : ''}`}></div>
                                                                    <span className="text-[11px] font-bold">{sub.enabled ? 'Enabled' : 'Disabled'}</span>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleToggleSubagent(sub._id, sub.enabled, sub.name);
                                                                    }}
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${sub.enabled ? 'bg-brand-50 text-brand-600 border border-brand-100 hover:bg-brand-100' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-200'}`}
                                                                >
                                                                    <Power size={14} className={sub.enabled ? 'text-brand-600' : 'text-slate-400'} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="mb-4">
                                                            <h4 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">{sub.title}</h4>
                                                            <div className="text-[16px] font-black text-brand-600 tracking-[0.15em] uppercase opacity-70">{sub.name}</div>
                                                        </div>

                                                        <p className="text-slate-500 text-[13px] leading-relaxed mb-8 flex-1 line-clamp-3">
                                                            {sub.description}
                                                        </p>

                                                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between mt-auto">
                                                            <button className="text-[11px] font-bold text-slate-400 group-hover:text-brand-600 transition-colors">設定與詳情</button>
                                                            <div className="w-9 h-9 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1 group-hover:bg-brand-50 group-hover:text-brand-600 border border-slate-100">
                                                                <ChevronRight size={18} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Add Agent Button */}
                                                <button
                                                    onClick={() => setIsModalOpen(true)}
                                                    className="bg-white/30 border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center gap-5 hover:border-brand-300 hover:bg-brand-50/20 transition-all duration-500 group min-h-[340px]"
                                                >
                                                    <div className="w-16 h-16 border border-slate-100 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-brand-50 group-hover:scale-110 transition-all duration-500 shadow-sm">
                                                        <Plus size={32} className="text-slate-300 group-hover:text-brand-500" />
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xl font-bold text-slate-800 mb-2">新增 Agent</div>
                                                        <p className="text-[13px] text-slate-400 max-w-[200px] leading-relaxed">瀏覽 Agent 市場，擴充您的 AI 團隊能力</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            case 'crm':
                                return (
                                    <>
                                        {/* CRM 主列表 */}
                                        <div className="max-w-4xl">
                                            <div className="mb-8">
                                                <h1 className="text-3xl font-bold text-slate-900 mb-2">客戶管理 (CRM)</h1>
                                                <p className="text-slate-500">管理與此 LINE Bot 互動過的所有會員</p>
                                            </div>
                                            {isLoadingCrm ? (
                                                <div className="flex items-center justify-center py-20 text-slate-400">
                                                    <Loader2 size={28} className="animate-spin mr-3" />
                                                    載入中...
                                                </div>
                                            ) : crmUsers.length === 0 ? (
                                                <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center text-center">
                                                    <UserCircle size={48} className="text-slate-300 mb-4" />
                                                    <p className="text-slate-500 font-medium">尚無會員紀錄</p>
                                                    <p className="text-slate-400 text-sm mt-1">有人傳訊給 LINE Bot 後就會出現在這裡</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {crmUsers.map((user) => (
                                                        <button
                                                            key={user.line_id}
                                                            onClick={() => setSelectedCrmUser(user)}
                                                            className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between hover:border-brand-300 hover:shadow-md transition-all group"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-11 h-11 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                                                                    <span className="text-brand-600 font-bold text-base">
                                                                        {user.user_name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-semibold text-slate-800">{user.user_name}</span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                                        {user.last_time ? `上次互動：${user.last_time}` : '無互動紀錄'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* 會員詳情 Drawer */}
                                        {selectedCrmUser && (
                                            <>
                                                {/* 背景遮罩 */}
                                                <div
                                                    className="fixed inset-0 bg-slate-900/40 z-[100] backdrop-blur-sm"
                                                    onClick={() => setSelectedCrmUser(null)}
                                                />
                                                {/* 抽屜面板 */}
                                                <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col">
                                                    {/* Drawer Header */}
                                                    <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <span className="text-brand-600 font-bold text-lg">
                                                                {selectedCrmUser.user_name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h2 className="text-lg font-bold text-slate-900 truncate">{selectedCrmUser.user_name}</h2>
                                                            <p className="text-xs text-slate-400 font-mono truncate">{selectedCrmUser.line_id}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setSelectedCrmUser(null)}
                                                            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
                                                        >
                                                            <X size={18} className="text-slate-500" />
                                                        </button>
                                                    </div>

                                                    {/* Drawer Content */}
                                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                                        {/* 基本資料 */}
                                                        <div>
                                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">基本資料</h3>
                                                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-slate-500">上次互動</span>
                                                                    <span className="font-medium text-slate-700">{selectedCrmUser.last_time || '無紀錄'}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-sm gap-4">
                                                                    <span className="text-slate-500 shrink-0">LINE ID</span>
                                                                    <span className="font-mono text-xs text-slate-500 truncate">{selectedCrmUser.line_id}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 標籤（即將推出） */}
                                                        <div>
                                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">🏷️ 標籤</h3>
                                                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center gap-1">
                                                                <p className="text-sm font-medium text-slate-400">即將推出</p>
                                                                <p className="text-xs text-slate-300">貼上標籤後可進行精準行銷</p>
                                                            </div>
                                                        </div>

                                                        {/* 備註（即將推出） */}
                                                        <div>
                                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">📝 備註</h3>
                                                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center gap-1">
                                                                <p className="text-sm font-medium text-slate-400">即將推出</p>
                                                                <p className="text-xs text-slate-300">紀錄會員特殊需求或偏好</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                );
                            case 'inbox':
                                return <InboxView currentAgent={currentAgent} />;
                            case 'channels':
                                return (
                                    <div className="max-w-6xl">
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
                                    <div className="h-[calc(100vh-120px)] flex flex-col">
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
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="text"
                                                                value={playgroundInput}
                                                                onChange={(e) => setPlaygroundInput(e.target.value.slice(0, 100))}
                                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePlaygroundSend()}
                                                                placeholder="輸入測試訊息內容..."
                                                                maxLength={100}
                                                                className="w-full pl-5 pr-28 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                                                                disabled={isPlaygroundLoading}
                                                            />
                                                            <div className="absolute right-14 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">
                                                                {playgroundInput.length}/100
                                                            </div>
                                                            <button
                                                                onClick={() => handlePlaygroundSend()}
                                                                disabled={!playgroundInput.trim() || isPlaygroundLoading}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-100 active:scale-95"
                                                            >
                                                                <Send size={20} />
                                                            </button>
                                                        </div>
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
                                                            <div className="space-y-6">
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

                                                                {lastResponseInfo.related_products && lastResponseInfo.related_products.length > 0 &&
                                                                    lastResponseInfo.related_products.map((product, i) => (
                                                                        <div key={`product-${i}`} className="space-y-3">
                                                                            <div className="flex items-center gap-2 text-green-600">
                                                                                <CheckCircle2 size={16} />
                                                                                <span className="text-xs font-bold uppercase tracking-wider">成功命中商品</span>
                                                                            </div>
                                                                            <div className="bg-green-50/30 border border-green-100 rounded-2xl p-4">
                                                                                <div className="text-[10px] font-black text-green-600 uppercase mb-3 tracking-widest opacity-70">商品資訊</div>
                                                                                <div className="text-xs space-y-3">
                                                                                    <div className="flex gap-2">
                                                                                        <span className="font-bold text-slate-700 shrink-0">商品:</span>
                                                                                        <span className="text-slate-600 leading-relaxed">{product.name}</span>
                                                                                    </div>
                                                                                    <div className="flex gap-2">
                                                                                        <span className="font-bold text-slate-700 shrink-0">說明:</span>
                                                                                        <span className="text-slate-600 leading-relaxed">{product.description}</span>
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

                                                                {(!lastResponseInfo.related_faqs || lastResponseInfo.related_faqs.length === 0) && (!lastResponseInfo.related_products || lastResponseInfo.related_products.length === 0) && !lastResponseInfo.handoff?.hand_off && (
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
                        <div className="relative bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl">
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
                        <div className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
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

                {/* Add FAQ Modal */}
                {showFaqModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setShowFaqModal(false)}
                        />
                        <div className="relative bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center border border-brand-100">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">新增問答</h2>
                                        <p className="text-slate-400 text-xs mt-0.5">建立一組 FAQ 問答</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowFaqModal(false)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question</label>
                                    <input
                                        type="text"
                                        value={newFaq.question}
                                        maxLength={50}
                                        onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                                        placeholder="輸入常見問題..."
                                        autoFocus
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-800 font-bold text-base focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                    />
                                    <div className="text-[10px] text-slate-300 text-right">{newFaq.question.length}/50</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Answer</label>
                                    <textarea
                                        value={newFaq.answer}
                                        maxLength={200}
                                        onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                                        placeholder="輸入預設回覆回答內容..."
                                        className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-slate-600 text-sm leading-relaxed min-h-[120px] focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                    />
                                    <div className="text-[10px] text-slate-300 text-right">{newFaq.answer.length}/200</div>
                                </div>
                            </div>
                            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowFaqModal(false)}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingFaqs([...editingFaqs, { question: newFaq.question, answer: newFaq.answer }]);
                                        setShowFaqModal(false);
                                        setTimeout(() => {
                                            faqsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                    }}
                                    disabled={!newFaq.question.trim() || !newFaq.answer.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} />
                                    新增
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Product Modal */}
                {showProductModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setShowProductModal(false)}
                        />
                        <div className="relative bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">新增商品</h2>
                                        <p className="text-slate-400 text-xs mt-0.5">建立一筆商品資料</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowProductModal(false)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">商品名稱</label>
                                    <input
                                        type="text"
                                        value={newProduct.name}
                                        maxLength={50}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                        placeholder="輸入商品名稱..."
                                        autoFocus
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-800 font-bold text-base focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                                    />
                                    <div className="text-[10px] text-slate-300 text-right">{newProduct.name.length}/50</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">菜單/規格說明</label>
                                    <textarea
                                        value={newProduct.description}
                                        maxLength={400}
                                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                        placeholder="輸入商品說明、規格、價格等..."
                                        className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-slate-600 text-sm leading-relaxed min-h-[120px] focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                                    />
                                    <div className="text-[10px] text-slate-300 text-right">{newProduct.description.length}/400</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">關鍵字/別名 (選填)</label>
                                    <input
                                        type="text"
                                        value={newProduct.keywords}
                                        maxLength={100}
                                        onChange={(e) => setNewProduct({ ...newProduct, keywords: e.target.value })}
                                        placeholder="例：珍奶、波霸、大杯紅茶..."
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-600 text-sm focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all"
                                    />
                                    <div className="text-[10px] text-slate-300 text-right">{(newProduct.keywords || '').length}/100</div>
                                </div>
                            </div>
                            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowProductModal(false)}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingProducts([...editingProducts, { name: newProduct.name, description: newProduct.description, keywords: newProduct.keywords }]);
                                        setShowProductModal(false);
                                        setTimeout(() => {
                                            productsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                    }}
                                    disabled={!newProduct.name.trim() || !newProduct.description.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} />
                                    新增
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Notification to match Image 3 */}
                {/* <div className="fixed bottom-8 right-8 lg:bottom-12 lg:right-12">
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
                </div> */}
            </main>
        </div>
    );
};

export default BackendDashboard;
