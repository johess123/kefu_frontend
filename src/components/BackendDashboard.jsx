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
    Search,
    BarChart2,
    Image as ImageIcon,
    Upload,
    FileSpreadsheet,
    Activity,
    Coins,
    FolderInput,
    GripVertical,
    LogOut,
    SlidersHorizontal,
    ToggleLeft,
    ToggleRight,
    MessagesSquare
} from 'lucide-react';
import Cookies from 'js-cookie';
import { DEFAULT_HANDOFF_OPTIONS, ToneType, TONE_PROMPTS } from '../types';
import InboxView from './InboxView';
import ConversationAnalystView from './ConversationAnalystView';
import CoinUsageView from './CoinUsageView';
import ActivityLogView from './ActivityLogView';
import BillingView from './BillingView';
import ConfirmDialog from './ConfirmDialog';
import ChargeConfirmDialog from './ChargeConfirmDialog';
import ImageLightbox from './ImageLightbox';
import LineDeployGuide from './LineDeployGuide';
import NotifyBanner from './NotifyBanner';
import FaqImportModal from './FaqImportModal';
import ChatLogImportModal from './ChatLogImportModal';
import FaqAddModal from './FaqAddModal';
import ProductAddModal from './ProductAddModal';
import ProductImportModal from './ProductImportModal';
import { FAQ_MAX_QUESTION, FAQ_MAX_ANSWER, FAQ_MAX_COUNT, FAQ_MAX_CATEGORY, getDefaultFaqCategory, validateFaqsForSave, validateFaqsForAnalyze, validateFaqItemForOptimize } from '../utils/faqUtils';
import SpotlightTour from './SpotlightTour';
import OnboardingChecklist from './OnboardingChecklist';
import InboxIntroModal from './InboxIntroModal';
import ActivityIntroModal from './ActivityIntroModal';
import CrmIntroModal from './CrmIntroModal';
import { useAuth } from '../context/AuthContext';
import { safeUrl } from '../utils/urlUtils';
import { isInsufficientBalanceError } from '../utils/pricing';
import CrmMemberPanel, { getTagColor } from './CrmMemberPanel';

const SUB_SECTION_MAP = {
    'knowledge-base': 'Knowledge Base',
    'product-catalog': 'Product Catalog',
    'escalation-manager': 'Escalation Manager',
    'root-admin': 'Root Admin',
    'conversation-analyst': 'Conversation Analyst',
};
const EDITING_TO_SUB = {
    'Knowledge Base': 'knowledge-base',
    'Product Catalog': 'product-catalog',
    'Escalation Manager': 'escalation-manager',
    'Root Admin': 'root-admin',
    'Conversation Analyst': 'conversation-analyst',
};


const BackendDashboard = () => {
    const { userId, userName, userEmail, userPicture, userBalance, refreshUserBalance, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [agentCount, setAgentCount] = useState(null);
    const { agentId: routeAgentId, '*': remainingPath } = useParams();
    const pathParts = (remainingPath || '').split('/').filter(Boolean);
    const section = pathParts[0] || undefined;
    const subSection = pathParts[1] || undefined;
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    useEffect(() => {
        if (userId) refreshUserBalance();
    }, [userId]);

    const activeMenu = section || 'agents';
    const [agentsMenuOpen, setAgentsMenuOpen] = useState(activeMenu === 'agents');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAgent, setCurrentAgent] = useState(location.state?.agent || null);
    const [availableSubagents, setAvailableSubagents] = useState([]);
    const [loading, setLoading] = useState(false);

    // LINE Integration states
    const [isLineModalOpen, setIsLineModalOpen] = useState(false);
    const [showLineGuide, setShowLineGuide] = useState(false);

    // Channel management overlay
    const [isChannelManageOverlayOpen, setIsChannelManageOverlayOpen] = useState(false);

    // Telegram Integration states
    const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
    const [telegramBotToken, setTelegramBotToken] = useState('');
    const [isTelegramDeploying, setIsTelegramDeploying] = useState(false);

    // Meta (FB + IG) Integration states
    const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
    const [metaPageAccessToken, setMetaPageAccessToken] = useState('');
    const [metaVerifyToken, setMetaVerifyToken] = useState('');
    const [metaFbEnabled, setMetaFbEnabled] = useState(true);
    const [metaIgDmEnabled, setMetaIgDmEnabled] = useState(true);
    const [metaIgCommentEnabled, setMetaIgCommentEnabled] = useState(false);
    const [metaIgTriggers, setMetaIgTriggers] = useState([]);
    const [isMetaDeploying, setIsMetaDeploying] = useState(false);
    const [metaDeployResult, setMetaDeployResult] = useState(null);
    const [metaCopied, setMetaCopied] = useState('');
    const [metaPostValidation, setMetaPostValidation] = useState({});  // { [idx]: {status, caption, media_id} }
    const [lineConfig, setLineConfig] = useState({
        accessToken: currentAgent?.deploy_config?.line?.access_token || currentAgent?.deploy_config?.access_token || '',
        channelSecret: currentAgent?.deploy_config?.line?.channel_secret || currentAgent?.deploy_config?.channel_secret || ''
    });
    const [isDeploying, setIsDeploying] = useState(false);

    // Playground states
    const [playgroundMessages, setPlaygroundMessages] = useState([
        { role: 'model', text: '你好！我是你的 AI 智能客服，有什麼可以幫你的嗎？' }
    ]);
    const [playgroundSessionId, setPlaygroundSessionId] = useState(null);
    const [lastResponseInfo, setLastResponseInfo] = useState(null);
    const [playgroundPendingCount, setPlaygroundPendingCount] = useState(0);
    const [playgroundInput, setPlaygroundInput] = useState('');
    const [playgroundLeftTab, setPlaygroundLeftTab] = useState('faq');
    const [playgroundExpandedCats, setPlaygroundExpandedCats] = useState(new Set());
    const [playgroundAttachedFile, setPlaygroundAttachedFile] = useState(null); // File object
    const [playgroundImagePreview, setPlaygroundImagePreview] = useState('');   // local object URL
    const [playgroundImageUploading, setPlaygroundImageUploading] = useState(false);
    const playgroundMessagesEndRef = React.useRef(null);
    const playgroundFileInputRef = React.useRef(null);

    // Edit Subagent states
    const editingSubagent = subSection ? (SUB_SECTION_MAP[subSection] ?? null) : null;
    const [editingFaqs, setEditingFaqs] = useState([]);
    const [editingProducts, setEditingProducts] = useState([]);
    const [knowledgeTab, setKnowledgeTab] = useState('faq');
    const [handoffConfig, setHandoffConfig] = useState({
        triggers: [],
        custom: ''
    });
    const [replyMode, setReplyMode] = useState('auto');   // 'auto' | 'manual'
    const [isSavingReplyMode, setIsSavingReplyMode] = useState(false);
    const [inboxAttentionCount, setInboxAttentionCount] = useState(0);  // 收件匣紅點：需處理的對話數
    const [factFixPendingCount, setFactFixPendingCount] = useState(0);  // 數據分析師紅點：AI 答錯待確認的事實修正數
    const [isSaving, setIsSaving] = useState(false);
    const [optimizingIndices, setOptimizingIndices] = useState(new Set());
    const [expandedCategories, setExpandedCategories] = useState(new Set(['常見問題']));

    // Root Admin settings states
    const [tokenStats, setTokenStats] = useState(null);
    const [rootConfig, setRootConfig] = useState({
        merchant_name: '',
        services: '',
        website_url: '',
        tone: '親切有溫度',
        tone_avoid: '',
        tone_custom: '',
        style_profile: ''
    });
    const [isRollingBackStyle, setIsRollingBackStyle] = useState(false);
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
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [uploadingFaqIdx, setUploadingFaqIdx] = useState(null);
    const [expandedFaqItems, setExpandedFaqItems] = useState(new Set());
    const [moveFaqModal, setMoveFaqModal] = useState({ open: false, idx: null, faqQuestion: '', currentCat: '' });
    const [addFaqCategoryModal, setAddFaqCategoryModal] = useState({ open: false, category: '' });
    const [categoryOrder, setCategoryOrder] = useState([]);
    const [draggedCat, setDraggedCat] = useState(null);
    const [dragOverCat, setDragOverCat] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', description: '', keywords: '', image_id: '' });
    const [expandedProductItems, setExpandedProductItems] = useState(new Set());
    const [uploadingProductIdx, setUploadingProductIdx] = useState(null);
    const [showProductImportModal, setShowProductImportModal] = useState(false);
    const [showFaqImportModal, setShowFaqImportModal] = useState(false);
    const [showChatLogImportModal, setShowChatLogImportModal] = useState(false);
    const kbCardRef = React.useRef(null);
    const escalationCardRef = React.useRef(null);
    const analystCardRef = React.useRef(null);
    const isTogglingChannelRef = React.useRef(false);
    const [showTeamTour, setShowTeamTour] = useState(
        () => !localStorage.getItem('kefu_team_tour_done_v1')
    );
    const [showInboxIntro, setShowInboxIntro] = useState(
        () => !localStorage.getItem('kefu_intro_inbox_v1')
    );
    const [showActivityIntro, setShowActivityIntro] = useState(
        () => !localStorage.getItem('kefu_intro_activity_v1')
    );
    const [showCrmIntro, setShowCrmIntro] = useState(
        () => !localStorage.getItem('kefu_intro_crm_v1')
    );
    const [productFieldSchema, setProductFieldSchema] = useState([]);
    const [keywordsEnabled, setKeywordsEnabled] = useState(true);
    const [fieldSettingsOpen, setFieldSettingsOpen] = useState(false);
    const [modalFieldLabel, setModalFieldLabel] = useState('');
    const [isSavingSchema, setIsSavingSchema] = useState(false);

    const handleConfirmImportProducts = (newProducts) => {
        const merged = [...editingProducts, ...newProducts].slice(0, 50);
        setEditingProducts(merged);
        setTimeout(() => productsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    // Lightbox state
    const [lightboxSrc, setLightboxSrc] = useState(null);

    // ConfirmDialog state
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: '確認', cancelText: '取消', variant: 'danger' });
    const openConfirm = ({ title, message, onConfirm, confirmText = '確認', cancelText = '取消', variant = 'danger' }) =>
        setConfirmDialog({ isOpen: true, title, message, onConfirm, confirmText, cancelText, variant });
    const closeConfirm = () =>
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

    // 確認扣費 dialog state
    const [chargeConfirm, setChargeConfirm] = useState({ open: false, featureKey: '', featureLabel: '', onConfirm: null });
    const closeChargeConfirm = () => setChargeConfirm(c => ({ ...c, open: false }));
    const askCharge = (featureKey, featureLabel, run) => setChargeConfirm({ open: true, featureKey, featureLabel, onConfirm: run });

    // CRM states
    const [crmUsers, setCrmUsers] = useState([]);
    const [isLoadingCrm, setIsLoadingCrm] = useState(false);
    const [notifyBannerDismissed, setNotifyBannerDismissed] = useState(false);
    const [settingNotifyId, setSettingNotifyId] = useState(null);
    const [selectedCrmUser, setSelectedCrmUser] = useState(null);
    const [notifySearch, setNotifySearch] = useState('');
    const [notifyChannel, setNotifyChannel] = useState('line');
    const [crmSearch, setCrmSearch] = useState('');
    const [crmFilterTag, setCrmFilterTag] = useState('');

    // 標籤/備註儲存成功後（CrmMemberPanel 回抛），同步 CRM 清單與 Drawer
    const handleCrmUserUpdate = (updated) => {
        setCrmUsers(prev => prev.map(u => u.line_id === updated.line_id ? { ...u, ...updated } : u));
        setSelectedCrmUser(prev => prev && prev.line_id === updated.line_id ? { ...prev, ...updated } : prev);
    };

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
                { agent_id: currentAgent._id, line_user_id: newValue, channel: notifyChannel }
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
        const uid = Cookies.get('google_user_id');
        if (!uid) return;
        axios.get(`${config.API_URL}/api/admin/agents`, { params: { userId: uid } })
            .then(res => setAgentCount(res.data.length))
            .catch(() => setAgentCount(0));
    }, []);

    useEffect(() => {
        if (currentAgent) {
            const rawConfig = currentAgent.config?.raw_config || {};
            const faqs = rawConfig.faqs || [];
            setEditingFaqs(faqs);
            const orderedCats = [...new Set(faqs.map(f => f.category || '常見問題'))];
            setCategoryOrder(orderedCats.length > 0 ? orderedCats : ['常見問題']);
            setEditingProducts((rawConfig.products || []).map((p, i) => ({ ...p, id: p.id || `prod_${i}` })));
            setProductFieldSchema(rawConfig.product_field_schema || []);
            setKeywordsEnabled(rawConfig.keywords_enabled !== false);

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
            setReplyMode(rawConfig.reply_mode === 'manual' ? 'manual' : 'auto');

            // Set root config for editing
            setRootConfig({
                merchant_name: currentAgent.name || '',
                services: rawConfig.services || '',
                website_url: rawConfig.website_url || '',
                tone: rawConfig.tone || '親切有溫度',
                tone_avoid: rawConfig.tone_avoid || '',
                tone_custom: rawConfig.tone_custom || '',
                style_profile: rawConfig.style_profile || ''
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

    // 當 currentAgent 更新時，同步串接設定欄位的預填值
    useEffect(() => {
        if (currentAgent) {
            const dc = currentAgent.deploy_config || {};
            setLineConfig({
                accessToken: dc.line?.access_token || dc.access_token || '',
                channelSecret: dc.line?.channel_secret || dc.channel_secret || '',
            });
            setTelegramBotToken(dc.telegram?.bot_token || dc.bot_token || '');
            // Meta
            if (dc.meta) {
                setMetaPageAccessToken(dc.meta.page_access_token || '');
                setMetaVerifyToken(dc.meta.verify_token || '');
                setMetaFbEnabled(dc.meta.fb_messenger_enabled !== false);
                setMetaIgDmEnabled(dc.meta.ig_dm_enabled !== false);
                setMetaIgCommentEnabled(!!dc.meta.ig_comment_enabled);
                setMetaIgTriggers(dc.meta.ig_comment_triggers || []);
            }
        }
    }, [currentAgent]);

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

    const handleDeployTelegram = async () => {
        if (!currentAgent?._id) {
            alert('Agent 資料尚未載入，請重新整理頁面後再試。');
            return;
        }
        if (!telegramBotToken) {
            alert('請輸入 Bot Token');
            return;
        }

        try {
            setIsTelegramDeploying(true);
            const response = await axios.post(`${config.API_URL}/api/deploy_telegram`, {
                agent_id: currentAgent._id,
                bot_token: telegramBotToken
            });

            if (response.data.status === 'ok') {
                alert('Telegram 部署成功！');
                setIsTelegramModalOpen(false);
                setTelegramBotToken('');
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
            } else {
                alert('部署失敗: ' + (response.data.message || '未知錯誤'));
            }
        } catch (error) {
            console.error('Failed to deploy Telegram:', error);
            const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message || '未知錯誤';
            alert('部署過程中發生錯誤: ' + detail);
        } finally {
            setIsTelegramDeploying(false);
        }
    };

    const handleDeployMeta = async () => {
        if (!currentAgent?._id) {
            alert('Agent 資料尚未載入，請重新整理頁面後再試。');
            return;
        }
        if (!metaPageAccessToken) {
            alert('請輸入 Page Access Token');
            return;
        }
        if (!metaVerifyToken) {
            alert('請輸入 Verify Token');
            return;
        }

        try {
            setIsMetaDeploying(true);
            const response = await axios.post(`${config.API_URL}/api/deploy_meta`, {
                agent_id: currentAgent._id,
                page_access_token: metaPageAccessToken,
                verify_token: metaVerifyToken,
                fb_messenger_enabled: metaFbEnabled,
                ig_dm_enabled: metaIgDmEnabled,
                ig_comment_enabled: metaIgCommentEnabled,
                ig_comment_triggers: metaIgTriggers,
            });

            if (response.data.status === 'ok') {
                setMetaDeployResult({
                    webhookUrl: response.data.webhook_url,
                    verifyToken: response.data.verify_token,
                    pageName: response.data.page_name,
                });
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
            } else {
                alert('部署失敗: ' + (response.data.message || '未知錯誤'));
            }
        } catch (error) {
            console.error('Failed to deploy Meta:', error);
            const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message || '未知錯誤';
            alert('部署過程中發生錯誤: ' + detail);
        } finally {
            setIsMetaDeploying(false);
        }
    };

    const extractShortcode = (url) => {
        const m = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
        return m ? m[1] : url.trim();
    };

    const handleValidatePost = async (idx) => {
        const trigger = metaIgTriggers[idx];
        const raw = trigger.post_url || '';
        if (!raw.trim()) return;
        const shortcode = extractShortcode(raw);

        setMetaPostValidation(prev => ({ ...prev, [idx]: { status: 'loading' } }));
        try {
            const res = await axios.post(`${config.API_URL}/api/meta/validate_post`, {
                agent_id: currentAgent._id,
                post_shortcode: shortcode,
            });
            const data = res.data;
            if (data.status === 'ok') {
                setMetaPostValidation(prev => ({
                    ...prev,
                    [idx]: { status: 'ok', caption: data.caption_preview, media_id: data.media_id },
                }));
                // 把解析到的 post_id 寫回 trigger
                const updated = [...metaIgTriggers];
                updated[idx] = { ...updated[idx], post_shortcode: shortcode, post_id: data.media_id };
                setMetaIgTriggers(updated);
            } else {
                setMetaPostValidation(prev => ({
                    ...prev,
                    [idx]: { status: 'error', message: data.message },
                }));
            }
        } catch (e) {
            setMetaPostValidation(prev => ({
                ...prev,
                [idx]: { status: 'error', message: '驗證失敗，請稍後再試' },
            }));
        }
    };

    const handleToggleChannel = async (channel, enabled) => {
        if (!currentAgent?._id || isTogglingChannelRef.current) return;
        isTogglingChannelRef.current = true;
        try {
            await axios.patch(
                `${config.API_URL}/api/agent/${currentAgent._id}/channel/${channel}/toggle`,
                { enabled }
            );
            setCurrentAgent(prev => ({
                ...prev,
                deploy_config: {
                    ...prev.deploy_config,
                    [channel]: {
                        ...prev.deploy_config?.[channel],
                        enabled
                    }
                }
            }));
        } catch (error) {
            const msg = error?.response?.data?.detail || error?.message || '未知錯誤';
            alert('切換渠道狀態失敗: ' + msg);
        } finally {
            isTogglingChannelRef.current = false;
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('已複製到剪貼簿');
        });
    };

    const storefrontPreviewUrl = routeAgentId
        ? `${window.location.origin}/store/${routeAgentId}`
        : '';

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
        if (activeMenu === 'agents') {
            setAgentsMenuOpen(true);
        }
    }, [activeMenu]);

    useEffect(() => {
        playgroundMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [playgroundMessages]);

    // 後台 playground 為測試用途，不扣費（正式 LINE / Telegram 對話才扣費）
    const handlePlaygroundSend = async (textToSend = playgroundInput) => {
        const msgText = textToSend.trim();
        const hasImage = !!playgroundAttachedFile;
        if (!msgText && !hasImage) return;
        if (!playgroundSessionId) return;

        // 立即顯示使用者訊息（含本地圖片預覽）
        const userMsg = { role: 'user', text: msgText, imagePreview: playgroundImagePreview };
        setPlaygroundMessages(prev => [...prev, userMsg]);
        setPlaygroundInput('');
        const fileToUpload = playgroundAttachedFile;
        const localPreview = playgroundImagePreview;
        setPlaygroundAttachedFile(null);
        setPlaygroundImagePreview('');
        setPlaygroundPendingCount(c => c + 1);
        setLastResponseInfo(null);

        try {
            // 若有附圖，先上傳取得 Cloudinary URL
            let uploadedImageUrl = '';
            if (fileToUpload) {
                setPlaygroundImageUploading(true);
                const formData = new FormData();
                formData.append('file', fileToUpload);
                const uploadRes = await axios.post(`${config.API_URL}/api/admin/upload_image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedImageUrl = uploadRes.data.preview_url || '';
                setPlaygroundImageUploading(false);
            }

            const line_user_id = Cookies.get('google_user_id');
            const line_user_name = Cookies.get('google_user_name');
            const response = await axios.post(`${config.API_URL}/api/chat`, {
                message: msgText || '（附圖）',
                line_user_id: line_user_id,
                user_name: line_user_name,
                agent_id: currentAgent._id,
                session_id: playgroundSessionId,
                source: 'web',
                ...(uploadedImageUrl && { image_url: uploadedImageUrl }),
            });

            const { response_text, related_faq_list, related_product_list, handoff_result, faq_image_urls, product_image_urls, storefront_url } = response.data;
            // 合併圖片順序與 LINE 一致：FAQ 圖優先，有 storefront_url 時限制 2 張
            const allImages = [...(faq_image_urls || []), ...(product_image_urls || [])];
            const displayImages = storefront_url ? allImages.slice(0, 2) : allImages.slice(0, 4);
            const newMessage = {
                role: 'model',
                text: response_text,
                related_faqs: related_faq_list || [],
                related_products: related_product_list || [],
                handoff: handoff_result,
                images: displayImages,
                storefront_url: storefront_url || '',
            };

            if (response_text) {
                setPlaygroundMessages(prev => [...prev, newMessage]);
                setLastResponseInfo(newMessage);
            }
        } catch (error) {
            console.error('Playground chat error:', error);
            setPlaygroundMessages(prev => [...prev, { role: 'model', text: '抱歉，發生錯誤，請稍後再試。' }]);
        } finally {
            setPlaygroundPendingCount(c => Math.max(0, c - 1));
            setPlaygroundImageUploading(false);
        }
    };

    const resetPlaygroundChat = () => {
        setPlaygroundMessages([{ role: 'model', text: '你好！我是你的 AI 智能客服，有什麼可以幫你的嗎？' }]);
        setLastResponseInfo(null);
        // 後端徹底重置：刪除測試 sessions 與對話，從全新 session 開始（含解除測試中誤觸的轉真人狀態）
        const resetUserId = Cookies.get('google_user_id');
        if (currentAgent?._id && resetUserId) {
            axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/playground/reset`, null, {
                params: { userId: resetUserId },
            }).catch((err) => console.error('Playground backend reset failed:', err));
        }
        axios.get(`${config.API_URL}/api/init_session`).then(res => setPlaygroundSessionId(res.data.session_id));
    };

    const handlePlaygroundFaqClick = (question) => {
        setPlaygroundInput(question);
        handlePlaygroundSend(question);
    };

    const validateAndAnalyzeFaqs = async () => {
        const analyzeError = validateFaqsForAnalyze(editingFaqs);
        if (analyzeError) { alert(analyzeError); return; }

        setIsAnalyzing(true);
        try {
            const line_user_id = Cookies.get('google_user_id');
            const response = await axios.post(`${config.API_URL}/api/analyze_faqs`, {
                businessName: currentAgent?.config?.raw_config?.merchant_name || currentAgent?.name || '',
                servicesDescription: currentAgent?.config?.raw_config?.services || '',
                faqs: editingFaqs.map((f, i) => ({ ...f, id: f.id || i.toString() })),
                line_user_id: line_user_id,
                agent_id: currentAgent?._id
            });

            if (response.data && !response.data.error) {
                setAnalysisReport(response.data);
                refreshUserBalance();
            } else {
                alert('健檢失敗：' + (response.data.error || '未知錯誤'));
            }
        } catch (error) {
            if (isInsufficientBalanceError(error)) {
                alert('點數不足，請先前往「升級方案」儲值。');
            } else {
                console.error('Failed to analyze FAQs:', error);
                alert('健檢過程中發生錯誤');
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAnalyzeFaqs = () => {
        askCharge('analyze_faqs', 'FAQ 智能健檢', validateAndAnalyzeFaqs);
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
        const optError = validateFaqItemForOptimize(faq);
        if (optError) { alert(optError); return; }

        setOptimizingIndices(prev => new Set(prev).add(idx));
        try {
            const line_user_id = Cookies.get('google_user_id');
            const response = await axios.post(`${config.API_URL}/api/optimize_faq`, {
                question: faq.question,
                answer: faq.answer,
                line_user_id: line_user_id,
                agent_id: currentAgent?._id
            });

            if (response.data && !response.data.error) {
                const newFaqs = [...editingFaqs];
                newFaqs[idx] = {
                    ...newFaqs[idx],
                    question: response.data.q,
                    answer: response.data.a
                };
                setEditingFaqs(newFaqs);
                refreshUserBalance();
            } else {
                alert('優化失敗：' + (response.data.error || '未知錯誤'));
            }
        } catch (error) {
            if (isInsufficientBalanceError(error)) {
                alert('點數不足，請先前往「升級方案」儲值。');
            } else {
                console.error('Failed to optimize FAQ:', error);
                alert('優化過程中發生錯誤');
            }
        } finally {
            setOptimizingIndices(prev => {
                const newSet = new Set(prev);
                newSet.delete(idx);
                return newSet;
            });
        }
    };

    const addFaqToCategory = (category) => {
        const cat = category || (editingFaqs.length > 0 ? (editingFaqs[editingFaqs.length - 1].category || '常見問題') : '常見問題');
        const newId = Date.now().toString();
        setEditingFaqs(prev => [...prev, { id: newId, question: '', answer: '', image_id: '', category: cat }]);
        setExpandedCategories(prev => new Set([...prev, cat]));
        setCategoryOrder(prev => prev.includes(cat) ? prev : [...prev, cat]);
        setExpandedFaqItems(prev => new Set([...prev, newId]));
        setTimeout(() => faqsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const renameFaqCategory = (oldName, newName) => {
        setEditingFaqs(prev => prev.map(f => f.category === oldName ? { ...f, category: newName } : f));
        setExpandedCategories(prev => { const next = new Set(prev); next.delete(oldName); next.add(newName); return next; });
        setCategoryOrder(prev => prev.map(c => c === oldName ? newName : c));
    };

    const deleteFaqCategory = (cat) => {
        openConfirm({
            title: '刪除分類',
            message: `確定要刪除分類「${cat}」及其所有 FAQ 嗎？儲存後才會生效。`,
            onConfirm: () => {
                setEditingFaqs(prev => prev.filter(f => (f.category || '常見問題') !== cat));
                setExpandedCategories(prev => { const next = new Set(prev); next.delete(cat); return next; });
                setCategoryOrder(prev => prev.filter(c => c !== cat));
                closeConfirm();
            }
        });
    };

    const toggleFaqCategory = (cat) => {
        setExpandedCategories(prev => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next; });
    };

    const toggleFaqItem = (faqId) => {
        setExpandedFaqItems(prev => { const next = new Set(prev); next.has(faqId) ? next.delete(faqId) : next.add(faqId); return next; });
    };

    const moveFaqToCategory = (globalIdx, targetCategory) => {
        const f = [...editingFaqs];
        f[globalIdx] = { ...f[globalIdx], category: targetCategory };
        setEditingFaqs(f);
        setExpandedCategories(prev => new Set([...prev, targetCategory]));
        setMovingFaqId(null);
    };

    const addNewFaqCategory = () => {
        setNewCategoryName('');
        setShowCategoryModal(true);
    };

    const confirmAddCategory = () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;
        const newCatId = Date.now().toString();
        setEditingFaqs(prev => [...prev, { id: newCatId, question: '', answer: '', image_id: '', category: trimmed }]);
        setExpandedCategories(prev => new Set([...prev, trimmed]));
        setCategoryOrder(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
        setExpandedFaqItems(prev => new Set([...prev, newCatId]));
        setShowCategoryModal(false);
        setTimeout(() => faqsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleSaveFaqs = async () => {
        // 按 categoryOrder 排序 FAQs，確保順序持久化
        const sortedFaqs = [...editingFaqs].sort((a, b) => {
            const ai = categoryOrder.indexOf(a.category || '常見問題');
            const bi = categoryOrder.indexOf(b.category || '常見問題');
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
        const { error, cleaned: cleanedFaqs } = validateFaqsForSave(sortedFaqs);
        if (error) { alert(error); return; }

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

    const handleConfirmImportFaqs = (newFaqs) => {
        const remaining = FAQ_MAX_COUNT - editingFaqs.length;
        if (remaining <= 0) { alert(`FAQ 問答已達 ${FAQ_MAX_COUNT} 組上限`); return; }
        const toAdd = newFaqs.slice(0, remaining);
        if (toAdd.length < newFaqs.length) alert(`已達 ${FAQ_MAX_COUNT} 組上限，僅新增 ${toAdd.length} 組`);
        setEditingFaqs(prev => [...prev, ...toAdd]);
        const newCats = [...new Set(toAdd.map(f => f.category))];
        setCategoryOrder(prev => {
            const toAddCats = newCats.filter(c => !prev.includes(c));
            return toAddCats.length > 0 ? [...prev, ...toAddCats] : prev;
        });
    };

    const handleFaqImageUpload = async (idx, file) => {
        if (!file) return;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('僅支援 jpg/png/webp 格式');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('圖片大小不可超過 2MB');
            return;
        }
        setUploadingFaqIdx(idx);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await axios.post(`${config.API_URL}/api/admin/upload_image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newFaqs = [...editingFaqs];
            newFaqs[idx] = { ...newFaqs[idx], image_id: res.data.image_id, _preview_url: res.data.preview_url };
            setEditingFaqs(newFaqs);
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('圖片上傳失敗');
        } finally {
            setUploadingFaqIdx(null);
        }
    };

    const handleFaqImageDelete = async (idx) => {
        const faq = editingFaqs[idx];
        if (!faq.image_id) return;
        try {
            await axios.post(`${config.API_URL}/api/admin/delete_image`, { image_id: faq.image_id });
        } catch (e) {
            console.error('Failed to delete image:', e);
        }
        const newFaqs = [...editingFaqs];
        newFaqs[idx] = { ...newFaqs[idx], image_id: '', _preview_url: '' };
        setEditingFaqs(newFaqs);
    };

    const handleProductImageUpload = async (idx, file) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('僅支援 jpg/png/webp 格式');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('圖片大小不可超過 2MB');
            return;
        }
        setUploadingProductIdx(idx);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await axios.post(`${config.API_URL}/api/admin/upload_image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newProducts = [...editingProducts];
            newProducts[idx] = { ...newProducts[idx], image_id: res.data.image_id, _preview_url: res.data.preview_url };
            setEditingProducts(newProducts);
        } catch (error) {
            console.error('Failed to upload product image:', error);
            alert('圖片上傳失敗');
        } finally {
            setUploadingProductIdx(null);
        }
    };

    const handleProductImageDelete = async (idx) => {
        const product = editingProducts[idx];
        if (!product.image_id) return;
        try {
            await axios.post(`${config.API_URL}/api/admin/delete_image`, { image_id: product.image_id });
        } catch (e) {
            console.error('Failed to delete product image:', e);
        }
        const newProducts = [...editingProducts];
        newProducts[idx] = { ...newProducts[idx], image_id: '', _preview_url: '' };
        setEditingProducts(newProducts);
    };

    const handleSaveSchema = async (schema, kwEnabled = keywordsEnabled) => {
        if (!currentAgent) return;
        setIsSavingSchema(true);
        try {
            await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/update_product_schema`, {
                userId: currentAgent.admin_id,
                schema,
                keywords_enabled: kwEnabled
            });
        } catch (e) {
            console.error('Failed to save field schema:', e);
        } finally {
            setIsSavingSchema(false);
        }
    };

    const addCustomField = (label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        if (productFieldSchema.length >= 8) { alert('最多新增 8 個自訂欄位'); return; }
        const key = trimmed.toLowerCase().replace(/[\s一-鿿]+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/^_+|_+$/g, '') || `field_${Date.now()}`;
        if (productFieldSchema.some(f => f.key === key)) { alert('欄位已存在'); return; }
        const newSchema = [...productFieldSchema, { key, label: trimmed, type: 'text', max_length: 100 }];
        setProductFieldSchema(newSchema);
        setModalFieldLabel('');
        handleSaveSchema(newSchema);
    };

    const removeCustomField = (key) => {
        const newSchema = productFieldSchema.filter(f => f.key !== key);
        setProductFieldSchema(newSchema);
        handleSaveSchema(newSchema);
    };

    const toggleKeywords = (enabled) => {
        setKeywordsEnabled(enabled);
        handleSaveSchema(productFieldSchema, enabled);
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

    // 收件匣紅點：每 12 秒輪詢「需要真人處理的對話數」，不論目前在哪個頁面都更新
    useEffect(() => {
        const aId = currentAgent?._id;
        const adminId = currentAgent?.admin_id;
        if (!aId || !adminId) return;
        let cancelled = false;
        const fetchCount = async () => {
            try {
                const res = await axios.get(`${config.API_URL}/api/inbox/agents/${aId}/attention-count?userId=${adminId}`);
                if (!cancelled) setInboxAttentionCount(res.data?.count || 0);
            } catch (e) { /* 靜默失敗，不影響主畫面 */ }
            try {
                const sres = await axios.get(`${config.API_URL}/api/analysis/${aId}/stats`);
                if (!cancelled) setFactFixPendingCount(sres.data?.edit_feedback_pending_count || 0);
            } catch (e) { /* 靜默失敗 */ }
        };
        fetchCount();
        const id = setInterval(fetchCount, 12000);
        return () => { cancelled = true; clearInterval(id); };
    }, [currentAgent?._id, currentAgent?.admin_id]);

    const handleSaveReplyMode = async (mode) => {
        const prev = replyMode;
        setReplyMode(mode);   // 樂觀更新
        try {
            setIsSavingReplyMode(true);
            const res = await axios.post(`${config.API_URL}/api/admin/agent/${currentAgent._id}/update_reply_mode`, {
                userId: currentAgent.admin_id,
                reply_mode: mode
            });
            if (res.data.status === 'ok') {
                const agentRes = await axios.get(`${config.API_URL}/api/admin/agent/${currentAgent._id}`, {
                    params: { userId: currentAgent.admin_id }
                });
                setCurrentAgent(agentRes.data);
            } else {
                throw new Error('update_reply_mode failed');
            }
        } catch (error) {
            console.error('Failed to save reply mode:', error);
            setReplyMode(prev);   // 回滾
            alert('回覆模式儲存失敗，請稍後再試。');
        } finally {
            setIsSavingReplyMode(false);
        }
    };

    const handleRollbackStyle = async () => {
        if (!window.confirm('確定要還原上一次 AI 自動學到的風格嗎？這會回到學習前的版本。')) return;
        try {
            setIsRollingBackStyle(true);
            const res = await axios.post(
                `${config.API_URL}/api/evolution/${currentAgent._id}/rollback`,
                { agent_id: currentAgent._id },
                { params: { userId: currentAgent.admin_id } }
            );
            const restored = res.data?.restored_style_profile ?? '';
            setRootConfig(prev => ({ ...prev, style_profile: restored }));
            alert('已還原到上一次自動學習前的風格。');
        } catch (error) {
            console.error('Rollback style failed:', error);
            alert(error.response?.data?.detail || '還原失敗，可能尚無可還原的自動學習紀錄。');
        } finally {
            setIsRollingBackStyle(false);
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
        "Sales Agent": <LineChart size={24} className="text-slate-400" />,
        "Conversation Analyst": <BarChart2 size={24} className="text-purple-600" />
    };

    const bgColorMap = {
        "Knowledge Base": 'bg-blue-50',
        "Product Catalog": 'bg-green-50',
        "Escalation Manager": 'bg-orange-50',
        "Order Agent": 'bg-slate-50',
        "Sales Agent": 'bg-slate-50',
        "Conversation Analyst": 'bg-purple-50'
    };

    const teamSubagents = (currentAgent?.used_subagent_details || [])
        .filter(sa => sa.name !== 'Product Catalog')
        .map(sa => ({
            ...sa,
            // 合併後的 Knowledge Base 卡片涵蓋 FAQ + 商品庫
            ...(sa.name === 'Knowledge Base' ? {
                title: '客服專員',
                description: '處理常見問題，管理商品目錄，AI 會優先檢索這裡的內容來回答客戶。',
            } : {}),
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
                { id: 'agents', label: '虛擬團隊 (Agents)', icon: <Users size={20} />, badge: factFixPendingCount > 0 ? (factFixPendingCount > 99 ? '99+' : factFixPendingCount) : undefined },
                { id: 'activity-logs', label: '團隊運作日誌', icon: <Activity size={20} /> }
            ]
        },
        {
            group: '客戶互動', items: [
                { id: 'inbox', label: '對話收件匣', icon: <MessageSquare size={20} />, badge: inboxAttentionCount > 0 ? (inboxAttentionCount > 99 ? '99+' : inboxAttentionCount) : undefined },
                { id: 'crm', label: '客戶管理 (CRM)', icon: <UserCircle size={20} /> },
                { id: 'channels', label: '渠道串接', icon: <Globe size={20} /> }
            ]
        },
        {
            group: '帳務', items: [
                { id: 'coin-usage', label: '點數紀錄', icon: <Coins size={20} /> }
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
                                        <div key={item.id}>
                                            <button
                                                onClick={() => {
                                                    if (item.isLocked) return;
                                                    if (item.id === 'agents') {
                                                        setAgentsMenuOpen(prev => !prev);
                                                        navigate('/agent/' + routeAgentId + '/agents');
                                                    } else {
                                                        navigate('/agent/' + routeAgentId + '/' + item.id);
                                                    }
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
                                                ) : item.id === 'agents' ? (
                                                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${agentsMenuOpen ? 'rotate-180' : ''}`} />
                                                ) : item.badge ? (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                        {item.badge}
                                                    </span>
                                                ) : null}
                                            </button>
                                            {item.id === 'agents' && agentsMenuOpen && (
                                                <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-0.5">
                                                    {teamSubagents.filter(sub => sub.enabled).map((sub) => {
                                                        const subPath = EDITING_TO_SUB[sub.name];
                                                        const isActive = editingSubagent === sub.name;
                                                        return (
                                                            <button
                                                                key={sub.name}
                                                                onClick={() => {
                                                                    if (subPath) navigate('/agent/' + routeAgentId + '/agents/' + subPath);
                                                                    setIsSidebarOpen(false);
                                                                }}
                                                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left ${
                                                                    isActive
                                                                        ? 'bg-brand-50 text-brand-700 font-medium'
                                                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                                                }`}
                                                            >
                                                                <span className={`flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400'}`}>
                                                                    {React.cloneElement(sub.icon, { size: 15 })}
                                                                </span>
                                                                <span className="text-[13px] truncate">{sub.title || sub.name}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
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
                                {agentCount > 1 && (
                                    <button
                                        onClick={() => navigate('/')}
                                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 font-medium transition-colors flex-shrink-0"
                                        title="切換虛擬團隊"
                                    >
                                        <LayoutGrid size={13} />
                                        切換
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-slate-100">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">🪙</span>
                                    <span className="text-xs font-bold text-slate-700">{userBalance?.toLocaleString() || 0}</span>
                                </div>
                                <button
                                    onClick={() => navigate('/agent/' + routeAgentId + '/billing')}
                                    className="text-slate-400 hover:text-brand-600"
                                >
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
                        <button
                            onClick={() => navigate('/wizard/new')}
                            className="hidden sm:flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-md shadow-brand-100 active:scale-95 text-sm"
                        >
                            <Plus size={16} />
                            建立新團隊
                        </button>
                        <div className="relative hidden sm:block border-l border-slate-100 pl-4 ml-4">
                            <button
                                onClick={() => setShowUserMenu(v => !v)}
                                className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            >
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
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showUserMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <p className="text-xs font-semibold text-slate-800">{userName}</p>
                                            <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                openConfirm({ title: '確認登出', message: '確定要登出嗎？', onConfirm: logout, confirmText: '登出', variant: 'danger' });
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                        >
                                            <LogOut size={15} />
                                            登出
                                        </button>
                                    </div>
                                </>
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
                                                                    onClick={() => setShowFaqImportModal(true)}
                                                                    className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                                                                >
                                                                    <Upload size={18} className="text-brand-500" />
                                                                    <span className="hidden sm:inline">匯入 FAQ</span>
                                                                </button>
                                                                <button
                                                                    onClick={addNewFaqCategory}
                                                                    className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
                                                                >
                                                                    <Plus size={18} />
                                                                    <span className="hidden sm:inline">新增分類</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (editingFaqs.length >= FAQ_MAX_COUNT) { alert(`FAQ 問答已達 ${FAQ_MAX_COUNT} 組上限`); return; }
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
                                                            {(() => {
                                                                const grouped = {};
                                                                editingFaqs.forEach((faq, globalIdx) => {
                                                                    const cat = faq.category || '常見問題';
                                                                    if (!grouped[cat]) grouped[cat] = [];
                                                                    grouped[cat].push({ faq, globalIdx });
                                                                });
                                                                const cats = categoryOrder.filter(cat => grouped[cat]);

                                                                if (cats.length === 0) return (
                                                                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                            <BookOpen size={32} className="text-slate-200" />
                                                                        </div>
                                                                        <h4 className="text-slate-800 font-bold mb-1">知識庫目前為空</h4>
                                                                        <p className="text-xs text-slate-400">點擊上方「新增問答」開始建立 AI 的知識庫。</p>
                                                                    </div>
                                                                );

                                                                return cats.map(cat => {
                                                                    const isExpanded = expandedCategories.has(cat);
                                                                    const items = grouped[cat];
                                                                    return (
                                                                        <div key={cat} className={`border rounded-2xl overflow-hidden transition-all duration-150 ${dragOverCat === cat && draggedCat !== cat ? 'border-brand-400 ring-2 ring-brand-200' : 'border-slate-200'}`} onDragOver={(e) => { e.preventDefault(); setDragOverCat(cat); }} onDrop={() => { if (draggedCat && draggedCat !== cat) { setCategoryOrder(prev => { const arr = [...prev]; const from = arr.indexOf(draggedCat); const to = arr.indexOf(cat); arr.splice(from, 1); arr.splice(to, 0, draggedCat); return arr; }); } setDraggedCat(null); setDragOverCat(null); }} onDragEnd={() => { setDraggedCat(null); setDragOverCat(null); }}>
                                                                            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 cursor-pointer select-none" onClick={() => toggleFaqCategory(cat)}>
                                                                                <span draggable={true} onDragStart={(e) => { e.stopPropagation(); setDraggedCat(cat); }} onClick={(e) => e.stopPropagation()} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0 px-1" title="拖拉排序"><GripVertical size={14} /></span>
                                                                                {isExpanded ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />}
                                                                                <input
                                                                                    type="text"
                                                                                    value={cat}
                                                                                    maxLength={FAQ_MAX_CATEGORY}
                                                                                    onChange={(e) => renameFaqCategory(cat, e.target.value)}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="flex-1 bg-transparent font-bold text-slate-700 text-sm focus:outline-none focus:border-b focus:border-brand-400 min-w-0"
                                                                                />
                                                                                <span className="text-xs text-slate-400 flex-shrink-0">{items.length} 組</span>
                                                                                <button onClick={(e) => { e.stopPropagation(); if (editingFaqs.length >= FAQ_MAX_COUNT) { alert(`FAQ 問答已達 ${FAQ_MAX_COUNT} 組上限`); return; } setAddFaqCategoryModal({ open: true, category: cat }); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-brand-600 flex-shrink-0" title="新增此分類 FAQ"><Plus size={14} /></button>
                                                                                <button onClick={(e) => { e.stopPropagation(); deleteFaqCategory(cat); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 flex-shrink-0" title="刪除此分類"><Trash2 size={14} /></button>
                                                                            </div>
                                                                            {isExpanded && (
                                                                                <div className="p-4 space-y-6">
                                                                                    {items.map(({ faq, globalIdx: idx }, catIdx) => {
                                                                                        const isItemExpanded = expandedFaqItems.has(faq.id);
                                                                                        return (
                                                                                            <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden hover:border-brand-200 transition-all duration-200">
                                                                                                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-100/50 transition-colors select-none" onClick={() => toggleFaqItem(faq.id)}>
                                                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm flex-shrink-0">Q{catIdx + 1}</span>
                                                                                                    <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0 max-w-[80px] truncate">{cat}</span>
                                                                                                    <span className="flex-1 text-sm font-semibold text-slate-700 truncate min-w-0">{faq.question ? faq.question : <span className="text-slate-300 font-normal italic">未填寫問題...</span>}</span>
                                                                                                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                                                        <button onClick={() => askCharge('optimize_faq', '優化單筆 FAQ', () => handleOptimizeFaq(idx))} disabled={optimizingIndices.has(idx)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-brand-600 rounded-lg transition-all disabled:opacity-50" title="AI 優化">
                                                                                                            {optimizingIndices.has(idx) ? <Loader2 size={13} className="animate-spin text-brand-600" /> : <Sparkles size={13} />}
                                                                                                        </button>
                                                                                                        <button onClick={() => setMoveFaqModal({ open: true, idx, faqQuestion: faq.question, currentCat: cat })} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-brand-500 rounded-lg transition-all" title="移動到其他分類">
                                                                                                            <FolderInput size={13} />
                                                                                                        </button>
                                                                                                        <button onClick={() => openConfirm({ title: '刪除 FAQ', message: `確定要刪除 FAQ「${faq.question || ''}」嗎？儲存後才會生效。`, confirmText: '確定刪除', onConfirm: () => { setEditingFaqs(editingFaqs.filter((_, i) => i !== idx)); closeConfirm(); } })} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-lg transition-all" title="刪除">
                                                                                                            <Trash2 size={13} />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                    <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isItemExpanded ? 'rotate-180' : ''}`} />
                                                                                                </div>
                                                                                                {isItemExpanded && (
                                                                                                    <div className="px-4 sm:px-6 pb-5 pt-3 space-y-4 border-t border-slate-100 bg-white">
                                                                                                        <div>
                                                                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Question</div>
                                                                                                            <input type="text" value={faq.question} maxLength={FAQ_MAX_QUESTION} onChange={(e) => { const f = [...editingFaqs]; f[idx] = { ...f[idx], question: e.target.value }; setEditingFaqs(f); }} placeholder="輸入常見問題..." className="w-full bg-transparent text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none p-0" />
                                                                                                            <div className="text-[10px] text-slate-300 text-right mt-1">{faq.question?.length || 0}/{FAQ_MAX_QUESTION}</div>
                                                                                                        </div>
                                                                                                        {analysisReport && analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()) && (
                                                                                                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                                                                                                <div className="flex items-start gap-2 mb-2">
                                                                                                                    <AlertCircle size={14} className="text-amber-500 mt-0.5" />
                                                                                                                    <p className="text-xs text-amber-700 italic">{analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()).suggestion}</p>
                                                                                                                </div>
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    <div className="flex-1 p-2 bg-white/80 border border-amber-200 rounded-lg text-xs text-amber-800">
                                                                                                                        <div className="font-bold mb-0.5">Q: {analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()).optimized_q}</div>
                                                                                                                        <div className="line-clamp-2">A: {analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()).optimized_a}</div>
                                                                                                                    </div>
                                                                                                                    <button onClick={() => { const s = analysisReport.suggestions.find(s => s.id.toString() === (faq.id || idx.toString()).toString()); applySuggestion(idx, s.optimized_q, s.optimized_a); }} className="flex items-center gap-1 px-3 py-2 bg-white border border-amber-300 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-50 whitespace-nowrap"><RotateCcw size={12} />快速取代</button>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}
                                                                                                        <div>
                                                                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Answer</div>
                                                                                                            <textarea value={faq.answer} maxLength={FAQ_MAX_ANSWER} onChange={(e) => { const f = [...editingFaqs]; f[idx] = { ...f[idx], answer: e.target.value }; setEditingFaqs(f); }} placeholder="輸入預設回覆回答內容..." className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-600 text-sm leading-relaxed min-h-[100px] focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-inner resize-none" />
                                                                                                            <div className="text-[10px] text-slate-300 text-right mt-1">{faq.answer?.length || 0}/{FAQ_MAX_ANSWER}</div>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Image</span>
                                                                                                                <span className="text-[10px] text-slate-300">(選填)</span>
                                                                                                            </div>
                                                                                                            {faq.image_id ? (
                                                                                                                <div className="flex items-center gap-3">
                                                                                                                    <img src={faq._preview_url || faq.preview_url || ''} alt="FAQ 附圖" className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-90" onClick={() => setLightboxSrc(faq._preview_url || faq.preview_url || '')} onError={(e) => { e.target.style.display = 'none'; }} />
                                                                                                                    <button onClick={() => openConfirm({ title: '移除附圖', message: '確定要移除這張 FAQ 附圖嗎？此操作無法復原。', confirmText: '確定移除', onConfirm: () => { handleFaqImageDelete(idx); closeConfirm(); } })} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50"><Trash2 size={14} />移除圖片</button>
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                <label className="flex items-center gap-2 px-4 py-3 bg-white border border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-all">
                                                                                                                    {uploadingFaqIdx === idx ? <Loader2 size={16} className="animate-spin text-brand-500" /> : <Upload size={16} className="text-slate-400" />}
                                                                                                                    <span className="text-xs text-slate-500">{uploadingFaqIdx === idx ? '上傳中...' : '上傳附圖 (jpg/png/webp, 2MB)'}</span>
                                                                                                                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFaqImageUpload(idx, e.target.files[0])} disabled={uploadingFaqIdx === idx} />
                                                                                                                </label>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                            <div ref={faqsEndRef} />
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
                                                                    type="button"
                                                                    onClick={() => window.open(storefrontPreviewUrl, '_blank', 'noopener,noreferrer')}
                                                                    disabled={!storefrontPreviewUrl}
                                                                    className="flex items-center gap-2 px-3 sm:px-5 py-2.5 border border-amber-200 text-amber-700 bg-amber-50 rounded-xl text-sm font-bold hover:bg-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <ExternalLink size={16} />
                                                                    <span className="hidden sm:inline">查看商品頁</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(storefrontPreviewUrl)}
                                                                    disabled={!storefrontPreviewUrl}
                                                                    className="flex items-center gap-2 px-3 sm:px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-xl text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <Copy size={16} />
                                                                    <span className="hidden sm:inline">複製連結</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowProductImportModal(true)}
                                                                    className="flex items-center gap-2 px-3 sm:px-5 py-2.5 border border-green-200 text-green-700 rounded-xl text-sm font-bold hover:bg-green-50 transition-all"
                                                                >
                                                                    <FileSpreadsheet size={16} />
                                                                    <span className="hidden sm:inline">匯入檔案</span>
                                                                </button>
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

                                                        {/* 欄位設定按鈕 */}
                                                        <div className="px-4 sm:px-8 py-3 border-b border-slate-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                                <span className="font-bold">欄位</span>
                                                                <span className="text-slate-300">名稱・說明{keywordsEnabled ? '・別名' : ''}{productFieldSchema.map(f => `・${f.label}`).join('')}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setFieldSettingsOpen(true)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
                                                            >
                                                                {isSavingSchema ? <Loader2 size={11} className="animate-spin text-green-400" /> : <Settings size={11} />}
                                                                欄位設定
                                                            </button>
                                                        </div>

                                                        <div className="p-4 sm:p-6 space-y-3">
                                                            {editingProducts.map((product, idx) => {
                                                                const pid = product.id || `prod_${idx}`;
                                                                const isExpanded = expandedProductItems.has(pid);
                                                                return (
                                                                    <div key={pid} className="border border-slate-200 rounded-2xl overflow-hidden hover:border-green-200 transition-all duration-200">
                                                                        {/* Collapsed Header */}
                                                                        <div
                                                                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                                                                            onClick={() => setExpandedProductItems(prev => { const next = new Set(prev); next.has(pid) ? next.delete(pid) : next.add(pid); return next; })}
                                                                        >
                                                                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm flex-shrink-0">P{idx + 1}</span>
                                                                            <span className="flex-1 text-sm font-semibold text-slate-700 truncate min-w-0">
                                                                                {product.name ? product.name : <span className="text-slate-300 font-normal italic">未填寫商品名稱...</span>}
                                                                            </span>
                                                                            {product.image_id && (
                                                                                <img src={product._preview_url || product.preview_url || ''} alt="" className="w-6 h-6 rounded object-cover border border-slate-200 flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                                                                            )}
                                                                            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                                <button
                                                                                    onClick={() => openConfirm({
                                                                                        title: '刪除商品',
                                                                                        message: `確定要刪除商品「${product.name || ''}」嗎？儲存後才會生效。`,
                                                                                        onConfirm: () => { setEditingProducts(editingProducts.filter((_, i) => i !== idx)); closeConfirm(); },
                                                                                    })}
                                                                                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                                                                    title="刪除"
                                                                                >
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            </div>
                                                                            <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                        </div>

                                                                        {/* Expanded Edit Area */}
                                                                        {isExpanded && (
                                                                            <div className="px-4 sm:px-6 pb-5 pt-3 space-y-4 border-t border-slate-100 bg-white">
                                                                                <div>
                                                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">商品名稱</div>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={product.name}
                                                                                        maxLength={50}
                                                                                        onChange={(e) => {
                                                                                            const newProducts = [...editingProducts];
                                                                                            newProducts[idx] = { ...newProducts[idx], name: e.target.value };
                                                                                            setEditingProducts(newProducts);
                                                                                        }}
                                                                                        placeholder="輸入商品名稱..."
                                                                                        className="w-full bg-transparent text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none p-0"
                                                                                    />
                                                                                    <div className="text-[10px] text-slate-300 text-right mt-1">{product.name?.length || 0}/50</div>
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">菜單/規格說明</div>
                                                                                    <textarea
                                                                                        value={product.description}
                                                                                        maxLength={400}
                                                                                        onChange={(e) => {
                                                                                            const newProducts = [...editingProducts];
                                                                                            newProducts[idx] = { ...newProducts[idx], description: e.target.value };
                                                                                            setEditingProducts(newProducts);
                                                                                        }}
                                                                                        placeholder="輸入商品說明、規格、價格等..."
                                                                                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-600 text-sm leading-relaxed min-h-[100px] focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all shadow-inner resize-none"
                                                                                    />
                                                                                    <div className="text-[10px] text-slate-300 text-right mt-1">{product.description?.length || 0}/400</div>
                                                                                </div>
                                                                                {keywordsEnabled && (
                                                                                    <div>
                                                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">關鍵字/別名 <span className="text-slate-300 normal-case font-normal">(選填)</span></div>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={product.keywords || ''}
                                                                                            maxLength={100}
                                                                                            onChange={(e) => {
                                                                                                const newProducts = [...editingProducts];
                                                                                                newProducts[idx] = { ...newProducts[idx], keywords: e.target.value };
                                                                                                setEditingProducts(newProducts);
                                                                                            }}
                                                                                            placeholder="例：珍奶、波霸、大杯紅茶..."
                                                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-600 text-sm focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all shadow-inner"
                                                                                        />
                                                                                        <div className="text-[10px] text-slate-300 text-right mt-1">{(product.keywords || '').length}/100</div>
                                                                                    </div>
                                                                                )}
                                                                                {/* 自訂欄位 */}
                                                                                {productFieldSchema.map(f => (
                                                                                    <div key={f.key}>
                                                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label} <span className="text-slate-300 normal-case font-normal">(選填)</span></div>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={(product.custom_fields || {})[f.key] || ''}
                                                                                            maxLength={f.max_length}
                                                                                            onChange={(e) => {
                                                                                                const newProducts = [...editingProducts];
                                                                                                newProducts[idx] = { ...newProducts[idx], custom_fields: { ...(newProducts[idx].custom_fields || {}), [f.key]: e.target.value } };
                                                                                                setEditingProducts(newProducts);
                                                                                            }}
                                                                                            placeholder={`輸入${f.label}...`}
                                                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-600 text-sm focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all shadow-inner"
                                                                                        />
                                                                                        <div className="text-[10px] text-slate-300 text-right mt-1">{((product.custom_fields || {})[f.key] || '').length}/{f.max_length}</div>
                                                                                    </div>
                                                                                ))}
                                                                                <div>
                                                                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Image</span>
                                                                                        <span className="text-[10px] text-slate-300">(選填)</span>
                                                                                    </div>
                                                                                    {product.image_id ? (
                                                                                        <div className="flex items-center gap-3">
                                                                                            <img
                                                                                                src={product._preview_url || product.preview_url || ''}
                                                                                                alt="商品附圖"
                                                                                                className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                                                                                                onClick={() => setLightboxSrc(product._preview_url || product.preview_url || '')}
                                                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                                                            />
                                                                                            <button
                                                                                                onClick={() => openConfirm({
                                                                                                    title: '移除附圖',
                                                                                                    message: '確定要移除這張商品附圖嗎？此操作無法復原。',
                                                                                                    onConfirm: () => { handleProductImageDelete(idx); closeConfirm(); },
                                                                                                })}
                                                                                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50"
                                                                                            >
                                                                                                <Trash2 size={14} />移除圖片
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <label className="flex items-center gap-2 px-4 py-3 bg-white border border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-green-300 hover:bg-green-50/50 transition-all">
                                                                                            {uploadingProductIdx === idx ? <Loader2 size={16} className="animate-spin text-green-500" /> : <Upload size={16} className="text-slate-400" />}
                                                                                            <span className="text-xs text-slate-500">{uploadingProductIdx === idx ? '上傳中...' : '上傳附圖 (jpg/png/webp, 2MB)'}</span>
                                                                                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleProductImageUpload(idx, e.target.files[0])} disabled={uploadingProductIdx === idx} />
                                                                                        </label>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            <div ref={productsEndRef} />

                                                            {editingProducts.length === 0 && (
                                                                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                        <Package size={32} className="text-slate-200" />
                                                                    </div>
                                                                    <h4 className="text-slate-800 font-bold mb-1">商品庫目前為空</h4>
                                                                    <p className="text-xs text-slate-400">點擊上方「新增商品」手動建立，或「匯入 Excel/CSV」批次匯入。</p>
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

                                            {/* 回覆模式切換（綁整個機器人，全域生效） */}
                                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden mb-6">
                                                <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                                    <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                                        <Shield size={18} className="text-brand-600" />
                                                        回覆模式（整個機器人生效）
                                                    </h3>
                                                    <p className="text-slate-500 text-xs mt-2">
                                                        切換 AI 回答要直接送出，還是先由真人在「對話收件匣」審核後再送。
                                                    </p>
                                                </div>
                                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {[
                                                        { key: 'auto', title: 'AI 自動回覆', desc: '客戶一問，AI 立即回答並送出（現況）。AI 無法處理時會依設定轉接真人。' },
                                                        { key: 'manual', title: '人工審核後送出', desc: 'AI 產生草稿但不送出，真人在收件匣編輯／確認後才發送給客戶。此模式下停用自動轉接真人。' },
                                                    ].map(opt => {
                                                        const active = replyMode === opt.key;
                                                        return (
                                                            <button
                                                                key={opt.key}
                                                                disabled={isSavingReplyMode || active}
                                                                onClick={() => handleSaveReplyMode(opt.key)}
                                                                className={`text-left p-5 rounded-2xl border transition-all ${active
                                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 shadow-sm'
                                                                    } disabled:cursor-default`}
                                                            >
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'bg-brand-500 border-brand-500' : 'bg-slate-50 border-slate-300'}`}>
                                                                        {active && <Check size={11} className="text-white" />}
                                                                    </div>
                                                                    <span className="text-sm font-bold">{opt.title}</span>
                                                                </div>
                                                                <p className={`text-xs leading-relaxed ${active ? 'text-slate-300' : 'text-slate-400'}`}>{opt.desc}</p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {replyMode === 'manual' && (
                                                    <div className="px-8 pb-6 -mt-2">
                                                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                                                            人工審核模式已啟用：所有 AI 回答會以「草稿」形式出現在對話收件匣，需真人按下發送才會送給客戶；此模式下不會自動轉接真人。
                                                        </p>
                                                    </div>
                                                )}
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
                                            {!notifyBannerDismissed && !isLoadingCrm && crmUsers.length > 0 && !crmUsers.some(u => u.is_notify_target) && (
                                                <NotifyBanner onDismiss={() => setNotifyBannerDismissed(true)} />
                                            )}
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
                                                            指派通知接收者後，當顧客轉人工客服，系統會透過 LINE 或 Telegram 通知該成員。請先選擇通知管道，再指定接收者。曾與 Bot 互動過的成員才會顯示於此。
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 mb-4">
                                                        {['line', 'telegram'].map(ch => (
                                                            <button
                                                                key={ch}
                                                                onClick={() => setNotifyChannel(ch)}
                                                                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${notifyChannel === ch ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                            >
                                                                {ch === 'telegram' ? 'Telegram' : 'LINE'}
                                                            </button>
                                                        ))}
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
                                                    ) : crmUsers.filter(u => (u.channel || 'line') === notifyChannel && u.user_name.toLowerCase().includes(notifySearch.toLowerCase())).length === 0 ? (
                                                        <div className="py-8 text-center text-slate-400 text-sm">
                                                            {notifySearch ? '找不到符合的成員' : `尚無 ${notifyChannel === 'telegram' ? 'Telegram' : 'LINE'} 用戶紀錄，請先向 Bot 發送訊息`}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                                            {crmUsers
                                                                .filter(u => (u.channel || 'line') === notifyChannel && u.user_name.toLowerCase().includes(notifySearch.toLowerCase()))
                                                                .map((user) => (
                                                                    <div key={user.line_id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-slate-200 transition-all">
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                                                <span className="text-brand-600 font-bold text-sm">{user.user_name.charAt(0).toUpperCase()}</span>
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <p className="text-sm font-semibold text-slate-800 truncate">{user.user_name}</p>
                                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${(user.channel || 'line') === 'telegram' ? 'bg-sky-100 text-sky-600' : 'bg-green-100 text-green-600'}`}>
                                                                                        {(user.channel || 'line') === 'telegram' ? 'TG' : 'LINE'}
                                                                                    </span>
                                                                                </div>
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

                                if (editingSubagent === 'Conversation Analyst') {
                                    return <ConversationAnalystView agentId={routeAgentId} adminId={currentAgent?.admin_id} onFaqUpdated={fetchAgentData} faqCategories={[...new Set((currentAgent?.config?.raw_config?.faqs || []).map(f => f.category || '常見問題'))]} />;
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
                                                                    <div className="flex flex-wrap gap-3 mb-4">
                                                                        {Object.values(ToneType).map(t => (
                                                                            <button
                                                                                key={t}
                                                                                onClick={() => setRootConfig({ ...rootConfig, tone: t })}
                                                                                className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${rootConfig.tone === t ? 'bg-brand-50 border-brand-500 text-brand-600 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                                                            >
                                                                                {t}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    {rootConfig.tone === '自定義' ? (
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">自定義語氣指令</label>
                                                                            <div className="relative">
                                                                                <textarea
                                                                                    value={rootConfig.tone_custom}
                                                                                    maxLength={200}
                                                                                    rows={3}
                                                                                    onChange={(e) => setRootConfig({ ...rootConfig, tone_custom: e.target.value })}
                                                                                    className="w-full px-6 py-4 bg-slate-900 text-white rounded-2xl outline-none placeholder:text-slate-600 border border-slate-800 focus:border-brand-500 transition-all text-sm resize-none"
                                                                                    placeholder="描述 AI 應該如何回覆，例如：以台灣在地化的語氣，用詞親切但不失禮貌，適時加入輕鬆的表達..."
                                                                                />
                                                                                <div className="text-[10px] text-slate-500 text-right pr-4 mt-1">{(rootConfig.tone_custom || '').length}/200</div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
                                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Prompt 預覽</div>
                                                                            <p className="text-sm text-slate-600">{TONE_PROMPTS[rootConfig.tone] || ''}</p>
                                                                        </div>
                                                                    )}
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

                                                                {/* AI 自動學到的風格（Track B 進化結果，可見可編輯可還原） */}
                                                                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <label className="text-xs font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                                                                            ✨ AI 自動學到的風格
                                                                        </label>
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleRollbackStyle}
                                                                            disabled={isRollingBackStyle}
                                                                            className="text-[11px] font-bold text-amber-600 hover:text-amber-800 disabled:opacity-40 transition-colors"
                                                                        >
                                                                            {isRollingBackStyle ? '還原中...' : '↩ 還原上次自動學習'}
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-[11px] text-amber-600/80 mb-3">
                                                                        系統會從真人客服在收件匣的編輯習慣，自動學習你的品牌語氣（如表情符號、排版偏好）。你可以在此微調或清空。
                                                                    </p>
                                                                    <textarea
                                                                        value={rootConfig.style_profile}
                                                                        maxLength={300}
                                                                        rows={3}
                                                                        onChange={(e) => setRootConfig({ ...rootConfig, style_profile: e.target.value })}
                                                                        className="w-full px-4 py-3 bg-white text-slate-800 rounded-xl outline-none border border-amber-200 focus:border-amber-400 transition-all text-sm resize-none placeholder:text-slate-400"
                                                                        placeholder="（尚未學到任何風格。當真人在收件匣編輯 AI 草稿、累積一致的風格修改後，這裡會自動出現學到的風格。）"
                                                                    />
                                                                    <div className="text-[10px] text-amber-500/70 text-right mt-1">{(rootConfig.style_profile || '').length}/300</div>
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
                                    <>
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
                                                                    {isStatsLoading ? '...' : (tokenStats?.daily_stats?.today_chats ?? 0)}
                                                                </div>
                                                            </div>
                                                            <div className="w-px h-10 bg-white/10 hidden md:block"></div>
                                                            <div className="px-2">
                                                                <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">健康度</div>
                                                                <div className="text-2xl font-bold text-[#4ade80] tracking-tight">
                                                                    {isStatsLoading ? '...' : (tokenStats?.daily_stats?.health_score ?? 0)}%
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
                                                            ref={idx === 0 ? kbCardRef : idx === 1 ? escalationCardRef : idx === 2 ? analystCardRef : null}
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
                                        <SpotlightTour
                                            isOpen={showTeamTour && teamSubagents.length > 0}
                                            onClose={() => {
                                                localStorage.setItem('kefu_team_tour_done_v1', '1');
                                                setShowTeamTour(false);
                                            }}
                                            steps={[
                                                {
                                                    targetRef: kbCardRef,
                                                    title: '客服專員（Knowledge Base）',
                                                    description: '管理 FAQ 知識庫與商品目錄，是 AI 回答客戶問題的核心依據。先在這裡新增您的常見問答，AI 才能準確回覆客戶。',
                                                },
                                                {
                                                    targetRef: escalationCardRef,
                                                    title: '協作專員（Escalation Manager）',
                                                    description: '設定轉人工的觸發條件，並指定通知接收者。當顧客需要真人協助時，系統會自動通知指定的團隊成員。',
                                                },
                                                {
                                                    targetRef: analystCardRef,
                                                    title: '數據分析師（Conversation Analyst）',
                                                    description: '自動分析對話紀錄，找出 FAQ 覆蓋不足的問題並生成改善建議，幫助您持續優化 AI 客服品質。',
                                                    ctaLabel: '開始設定客服專員',
                                                    onCta: () => {
                                                        localStorage.setItem('kefu_team_tour_done_v1', '1');
                                                        setShowTeamTour(false);
                                                        navigate(`/agent/${routeAgentId}/agents/knowledge-base`);
                                                    },
                                                },
                                            ]}
                                        />
                                    </>
                                );
                            case 'crm':
                                const filteredCrmUsers = crmUsers.filter(user => {
                                    const matchSearch = !crmSearch || user.user_name.toLowerCase().includes(crmSearch.toLowerCase());
                                    const matchTag = !crmFilterTag || (user.tags || []).includes(crmFilterTag);
                                    return matchSearch && matchTag;
                                });
                                const allUsedTags = [...new Set(crmUsers.flatMap(u => u.tags || []))];
                                return (
                                    <>
                                        {/* CRM 主列表 */}
                                        <div className="max-w-4xl">
                                            <div className="mb-8">
                                                <h1 className="text-3xl font-bold text-slate-900 mb-2">客戶管理 (CRM)</h1>
                                                <p className="text-slate-500">管理所有渠道互動過的會員</p>
                                            </div>

                                            {/* 搜尋與篩選 */}
                                            {crmUsers.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-3 mb-5">
                                                    <div className="relative flex-1 min-w-[200px]">
                                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            value={crmSearch}
                                                            onChange={(e) => setCrmSearch(e.target.value)}
                                                            placeholder="搜尋客戶名稱..."
                                                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                    {allUsedTags.length > 0 && (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <button
                                                                onClick={() => setCrmFilterTag('')}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!crmFilterTag ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                            >
                                                                全部
                                                            </button>
                                                            {allUsedTags.map(tag => (
                                                                <button
                                                                    key={tag}
                                                                    onClick={() => setCrmFilterTag(crmFilterTag === tag ? '' : tag)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${crmFilterTag === tag ? getTagColor(tag) : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                                >
                                                                    {tag}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isLoadingCrm ? (
                                                <div className="flex items-center justify-center py-20 text-slate-400">
                                                    <Loader2 size={28} className="animate-spin mr-3" />
                                                    載入中...
                                                </div>
                                            ) : crmUsers.length === 0 ? (
                                                <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center text-center">
                                                    <UserCircle size={48} className="text-slate-300 mb-4" />
                                                    <p className="text-slate-500 font-medium">尚無會員紀錄</p>
                                                    <p className="text-slate-400 text-sm mt-1">有人傳訊給 Bot 後就會出現在這裡</p>
                                                </div>
                                            ) : filteredCrmUsers.length === 0 ? (
                                                <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center text-center">
                                                    <Search size={36} className="text-slate-300 mb-3" />
                                                    <p className="text-slate-500 font-medium">找不到符合條件的客戶</p>
                                                    <p className="text-slate-400 text-sm mt-1">請調整搜尋或篩選條件</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="text-xs text-slate-400 mb-2 px-1">共 {filteredCrmUsers.length} 位客戶</div>
                                                    {filteredCrmUsers.map((user) => {
                                                        const ch = user.channel || 'line';
                                                        return (
                                                            <button
                                                                key={user.line_id}
                                                                onClick={() => setSelectedCrmUser(user)}
                                                                className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between hover:border-brand-300 hover:shadow-md transition-all group"
                                                            >
                                                                <div className="flex items-center gap-4 min-w-0">
                                                                    <div className="w-11 h-11 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                                                                        <span className="text-brand-600 font-bold text-base">
                                                                            {user.user_name.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-left min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="font-semibold text-slate-800">{user.user_name}</span>
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${ch === 'telegram' ? 'bg-sky-100 text-sky-600' : 'bg-green-100 text-green-600'}`}>
                                                                                {ch === 'telegram' ? 'TG' : 'LINE'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-xs text-slate-400 mt-0.5">
                                                                            {user.last_time ? `上次互動：${user.last_time}` : '無互動紀錄'}
                                                                        </div>
                                                                        {(user.tags || []).length > 0 && (
                                                                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                                                {user.tags.map(tag => (
                                                                                    <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getTagColor(tag)}`}>
                                                                                        {tag}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
                                                            </button>
                                                        );
                                                    })}
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
                                                <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                                                    {/* Drawer Header */}
                                                    <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <span className="text-brand-600 font-bold text-lg">
                                                                {selectedCrmUser.user_name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h2 className="text-lg font-bold text-slate-900 truncate">{selectedCrmUser.user_name}</h2>
                                                                {(() => {
                                                                    const ch = selectedCrmUser.channel || 'line';
                                                                    return (
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${ch === 'telegram' ? 'bg-sky-100 text-sky-600' : 'bg-green-100 text-green-600'}`}>
                                                                            {ch === 'telegram' ? 'TG' : 'LINE'}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <p className="text-xs text-slate-400 font-mono truncate">{selectedCrmUser.line_id}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setSelectedCrmUser(null)}
                                                            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
                                                        >
                                                            <X size={18} className="text-slate-500" />
                                                        </button>
                                                    </div>

                                                    {/* Drawer Content（共用 CRM 詳情面板） */}
                                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                                        <CrmMemberPanel
                                                            user={selectedCrmUser}
                                                            currentAgent={currentAgent}
                                                            onUserUpdate={handleCrmUserUpdate}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        <CrmIntroModal
                                            isOpen={showCrmIntro}
                                            onClose={() => {
                                                localStorage.setItem('kefu_intro_crm_v1', '1');
                                                setShowCrmIntro(false);
                                            }}
                                        />
                                    </>
                                );
                            case 'coin-usage':
                                return (
                                    <CoinUsageView agentId={routeAgentId} userId={userId} agentName={currentAgent?.name || ''} />
                                );
                            case 'activity-logs':
                                return (
                                    <>
                                        <ActivityLogView agentId={routeAgentId} userId={currentAgent?.admin_id} />
                                        <ActivityIntroModal
                                            isOpen={showActivityIntro}
                                            onClose={() => {
                                                localStorage.setItem('kefu_intro_activity_v1', '1');
                                                setShowActivityIntro(false);
                                            }}
                                        />
                                    </>
                                );
                            case 'inbox':
                                return (
                                    <>
                                        <InboxView currentAgent={currentAgent} />
                                        <InboxIntroModal
                                            isOpen={showInboxIntro}
                                            onClose={() => {
                                                localStorage.setItem('kefu_intro_inbox_v1', '1');
                                                setShowInboxIntro(false);
                                            }}
                                        />
                                    </>
                                );
                            case 'billing':
                                return <BillingView />;
                            case 'channels':
                                return (
                                    <div className="max-w-6xl">
                                        <div className="mb-10 flex items-start justify-between">
                                            <div>
                                                <h1 className="text-3xl font-bold text-slate-900 mb-2">渠道串接 (Channels)</h1>
                                                <p className="text-slate-500">選擇您要部署 AI 客服的通訊平台。</p>
                                            </div>
                                            <button
                                                onClick={() => setIsChannelManageOverlayOpen(true)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:border-brand-300 hover:text-brand-600 shadow-sm transition-all"
                                            >
                                                <SlidersHorizontal size={16} />
                                                管理渠道
                                            </button>
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
                                                {(currentAgent?.deploy_config?.line || currentAgent?.deploy_type === 'line') ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        {currentAgent?.deploy_config?.line?.enabled === false ? (
                                                            <div className="bg-slate-100 text-slate-500 px-5 py-2 rounded-full text-[13px] font-bold border border-slate-200 flex items-center gap-2">
                                                                <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                                                                已暫停
                                                            </div>
                                                        ) : (
                                                            <div className="bg-blue-50 text-blue-600 px-5 py-2 rounded-full text-[13px] font-bold border border-blue-100 flex items-center gap-2">
                                                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                                                已連接
                                                            </div>
                                                        )}
                                                        {(currentAgent?.deploy_config?.line?.display_name || currentAgent?.deploy_config?.display_name) && (
                                                            <span className="text-xs text-slate-400">{currentAgent?.deploy_config?.line?.display_name || currentAgent?.deploy_config?.display_name}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="bg-green-50 text-green-600 px-5 py-2 rounded-full text-[13px] font-bold border border-green-100 flex items-center gap-2 group-hover:bg-green-100 transition-colors">
                                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                        可串接
                                                    </div>
                                                )}
                                            </div>

                                            {/* Telegram */}
                                            <div
                                                onClick={() => setIsTelegramModalOpen(true)}
                                                className="bg-white rounded-[32px] p-10 border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#0088cc]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#0088cc]/10 transition-colors"></div>
                                                <div className="relative w-20 h-20 bg-sky-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#0088cc">
                                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.87 8.818c-.141.621-.51.772-1.033.479l-2.85-2.099-1.375 1.322c-.153.153-.281.281-.575.281l.204-2.895 5.272-4.762c.229-.204-.05-.316-.356-.113l-6.516 4.103-2.801-.875c-.61-.19-.621-.61.127-.905l10.94-4.217c.507-.187.951.116.833.103v.203z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-2xl font-bold text-slate-900 mb-3">Telegram</h3>
                                                <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-[280px]">
                                                    Connect your bot to Telegram chats and groups.
                                                </p>
                                                {(currentAgent?.deploy_config?.telegram || currentAgent?.deploy_type === 'telegram') ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        {currentAgent?.deploy_config?.telegram?.enabled === false ? (
                                                            <div className="bg-slate-100 text-slate-500 px-5 py-2 rounded-full text-[13px] font-bold border border-slate-200 flex items-center gap-2">
                                                                <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                                                                已暫停
                                                            </div>
                                                        ) : (
                                                            <div className="bg-blue-50 text-blue-600 px-5 py-2 rounded-full text-[13px] font-bold border border-blue-100 flex items-center gap-2">
                                                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                                                已連接
                                                            </div>
                                                        )}
                                                        {(currentAgent?.deploy_config?.telegram?.bot_username || currentAgent?.deploy_config?.bot_username) && (
                                                            <span className="text-xs text-slate-400">@{currentAgent?.deploy_config?.telegram?.bot_username || currentAgent?.deploy_config?.bot_username}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="bg-green-50 text-green-600 px-5 py-2 rounded-full text-[13px] font-bold border border-green-100 flex items-center gap-2 group-hover:bg-green-100 transition-colors">
                                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                        可串接
                                                    </div>
                                                )}
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
                                                <p className="text-slate-500">測試您的 AI Agent 對話邏輯與 FAQ、商品命中情況。</p>
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
                                            {/* Left Column: FAQ / Product List */}
                                            <div className="col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                                                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setPlaygroundLeftTab('faq')}
                                                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${playgroundLeftTab === 'faq' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                        >
                                                            <MessageCircle size={13} />
                                                            FAQ
                                                        </button>
                                                        <button
                                                            onClick={() => setPlaygroundLeftTab('product')}
                                                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${playgroundLeftTab === 'product' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                        >
                                                            <Package size={13} />
                                                            商品庫
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                    {playgroundLeftTab === 'faq' ? (
                                                        (() => {
                                                            const faqs = currentAgent?.config?.raw_config?.faqs || [];
                                                            if (faqs.length === 0) {
                                                                return <div className="text-center py-10 text-slate-400 text-xs italic">尚未設定任何 FAQ</div>;
                                                            }
                                                            const grouped = {};
                                                            faqs.forEach(faq => {
                                                                const cat = faq.category || '常見問題';
                                                                if (!grouped[cat]) grouped[cat] = [];
                                                                grouped[cat].push(faq);
                                                            });
                                                            const cats = [...new Set(faqs.map(f => f.category || '常見問題'))];
                                                            let counter = 0;
                                                            return cats.map(cat => {
                                                                const catFaqs = grouped[cat];
                                                                const isExpanded = playgroundExpandedCats.has(cat);
                                                                const startIdx = counter;
                                                                counter += catFaqs.length;
                                                                return (
                                                                    <div key={cat} className="mb-1">
                                                                        <button
                                                                            className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                                                            onClick={() => setPlaygroundExpandedCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}
                                                                        >
                                                                            <span className="text-sm font-semibold text-slate-700 truncate text-left">{cat}</span>
                                                                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                                                <span className="text-xs text-slate-400">{catFaqs.length}</span>
                                                                                <ChevronRight size={12} className={`text-slate-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                                            </div>
                                                                        </button>
                                                                        {isExpanded && catFaqs.map((faq, i) => (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => handlePlaygroundFaqClick(faq.question)}
                                                                                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-brand-300 hover:bg-brand-50/50 transition-all group mb-2"
                                                                            >
                                                                                <div className="flex items-start gap-2">
                                                                                    {faq.preview_url && (
                                                                                        <img src={faq.preview_url} alt="" className="w-8 h-8 object-cover rounded-lg flex-shrink-0 border border-slate-100" />
                                                                                    )}
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="text-[10px] font-bold text-slate-400 mb-0.5 group-hover:text-brand-500 uppercase tracking-widest">FAQ {startIdx + i + 1}</div>
                                                                                        <p className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 leading-relaxed line-clamp-2">
                                                                                            {faq.question}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            });
                                                        })()
                                                    ) : (
                                                        <>
                                                            {(currentAgent?.config?.raw_config?.products || []).map((product, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => handlePlaygroundFaqClick(`請問「${product.name}」有什麼特色或詳細資訊？`)}
                                                                    className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-green-300 hover:bg-green-50/50 transition-all group"
                                                                >
                                                                    <div className="flex items-start gap-2">
                                                                        {product.preview_url && (
                                                                            <img src={product.preview_url} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0 border border-slate-100" />
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-[10px] font-bold text-slate-400 mb-0.5 group-hover:text-green-600 uppercase tracking-widest">商品 {idx + 1}</div>
                                                                            <p className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 leading-relaxed">
                                                                                {product.name}
                                                                            </p>
                                                                            {product.description && (
                                                                                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{product.description}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                            {(!currentAgent?.config?.raw_config?.products || currentAgent.config.raw_config.products.length === 0) && (
                                                                <div className="text-center py-10 text-slate-400 text-xs italic">尚未設定任何商品</div>
                                                            )}
                                                        </>
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
                                                                <div className={`rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                                                    ? 'bg-brand-600 text-white rounded-tr-none overflow-hidden'
                                                                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 overflow-hidden'
                                                                    }`}>
                                                                    {/* 使用者附圖顯示（本地預覽） */}
                                                                    {msg.role === 'user' && msg.imagePreview && (
                                                                        <img
                                                                            src={msg.imagePreview}
                                                                            alt="附圖"
                                                                            className="w-full max-w-xs object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                                            style={{ maxHeight: '200px' }}
                                                                            onClick={() => setLightboxSrc(msg.imagePreview)}
                                                                        />
                                                                    )}
                                                                    <div className={`p-4 whitespace-pre-wrap ${!msg.text && msg.imagePreview ? 'hidden' : ''}`}>
                                                                        {msg.text}
                                                                        {msg.storefront_url && (
                                                                            <a
                                                                                href={safeUrl(msg.storefront_url)}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="mt-3 flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-semibold text-xs underline underline-offset-2"
                                                                            >
                                                                                <Package size={13} />
                                                                                商品網站 →
                                                                            </a>
                                                                        )}
                                                                        {msg.role === 'model' && (
                                                                            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-right">
                                                                                By AI客服
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {msg.images && msg.images.length > 0 && (
                                                                        <div className={`grid gap-1 ${msg.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                                            {msg.images.map((img, i) => (
                                                                                <img
                                                                                    key={i}
                                                                                    src={img.preview_url || img.url}
                                                                                    alt=""
                                                                                    className="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                                                    style={{ maxHeight: '200px' }}
                                                                                    onClick={() => setLightboxSrc(img.url)}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {playgroundPendingCount > 0 && (
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

                                                <div className="p-4 bg-white border-t border-slate-100">
                                                    {/* 圖片預覽列 */}
                                                    {playgroundImagePreview && (
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <div className="relative inline-block">
                                                                <img
                                                                    src={playgroundImagePreview}
                                                                    alt="附圖預覽"
                                                                    className="h-16 w-16 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80"
                                                                    onClick={() => setLightboxSrc(playgroundImagePreview)}
                                                                />
                                                                <button
                                                                    onClick={() => { setPlaygroundAttachedFile(null); setPlaygroundImagePreview(''); }}
                                                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                                                                >✕</button>
                                                            </div>
                                                            <span className="text-xs text-slate-400">已附圖，傳送後 AI 會分析此圖片</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 relative">
                                                        {/* Hidden file input */}
                                                        <input
                                                            ref={playgroundFileInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const f = e.target.files?.[0];
                                                                if (!f) return;
                                                                setPlaygroundAttachedFile(f);
                                                                setPlaygroundImagePreview(URL.createObjectURL(f));
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                        {/* 附圖按鈕 */}
                                                        <button
                                                            onClick={() => playgroundFileInputRef.current?.click()}
                                                            disabled={playgroundPendingCount > 0}
                                                            title="附上圖片"
                                                            className="flex-shrink-0 p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            <ImageIcon size={20} />
                                                        </button>
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="text"
                                                                value={playgroundInput}
                                                                onChange={(e) => setPlaygroundInput(e.target.value.slice(0, 100))}
                                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) handlePlaygroundSend(); }}
                                                                placeholder={playgroundAttachedFile ? '可選：加入文字說明...' : '輸入測試訊息內容...'}
                                                                maxLength={100}
                                                                className="w-full pl-4 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                                                            />
                                                            <div className="absolute right-14 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">
                                                                {playgroundInput.length}/100
                                                            </div>
                                                            <button
                                                                onClick={() => handlePlaygroundSend()}
                                                                disabled={!playgroundInput.trim() && !playgroundAttachedFile}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-100 active:scale-95"
                                                            >
                                                                {playgroundImageUploading || playgroundPendingCount > 0 ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={20} />}
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
                                                                            <span className="text-[11px] font-bold uppercase tracking-wider">未命中知識庫</span>
                                                                        </div>
                                                                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                                                                            <div className="bg-amber-100 w-8 h-8 rounded-xl text-amber-600 flex items-center justify-center shrink-0">
                                                                                <Lightbulb size={18} />
                                                                            </div>
                                                                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                                                                Agent 目前正根據商家簡介進行一般性回覆。若希望更精準回答，請在管理頁面新增 FAQ 或商品資料。
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
                                {currentAgent?.deploy_config?.line && (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="font-bold text-slate-700 text-sm">渠道啟用</p>
                                            <p className="text-xs text-slate-400 mt-0.5 truncate">關閉後 LINE Bot 將停止回應訊息</p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleChannel('line', currentAgent.deploy_config.line.enabled === false)}
                                            className={`relative w-12 h-6 flex-none rounded-full transition-colors ${currentAgent.deploy_config.line.enabled !== false ? 'bg-[#06C755]' : 'bg-slate-300'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${currentAgent.deploy_config.line.enabled !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 block">Channel Access Token</label>
                                        <input
                                            type="text"
                                            value={lineConfig.accessToken}
                                            onChange={(e) => setLineConfig({ ...lineConfig, accessToken: e.target.value })}
                                            placeholder="輸入 Channel Access Token"
                                            maxLength={256}
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
                                            maxLength={128}
                                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#06C755]/20 focus:border-[#06C755] outline-none transition-all text-slate-700 font-medium placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                    <div className="text-amber-500 mt-0.5"><Lightbulb size={20} /></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-amber-800 text-sm mb-1">不知道去哪裡找？</h4>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            我們準備了完整教學，
                                            <button
                                                onClick={() => setShowLineGuide(true)}
                                                className="underline font-bold hover:text-amber-900 mx-1"
                                            >
                                                點此查看如何取得 Token 與 Secret
                                            </button>
                                            。
                                        </p>
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
                {/* Telegram Integration Modal */}
                {isTelegramModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-2xl"
                            onClick={() => setIsTelegramModalOpen(false)}
                        />
                        <div className="relative bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#0088cc] rounded-xl flex items-center justify-center text-white">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.87 8.818c-.141.621-.51.772-1.033.479l-2.85-2.099-1.375 1.322c-.153.153-.281.281-.575.281l.204-2.895 5.272-4.762c.229-.204-.05-.316-.356-.113l-6.516 4.103-2.801-.875c-.61-.19-.621-.61.127-.905l10.94-4.217c.507-.187.951.116.833.103v.203z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">串接 Telegram Bot</h2>
                                </div>
                                <button
                                    onClick={() => setIsTelegramModalOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-10 space-y-8">
                                {currentAgent?.deploy_config?.telegram && (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="font-bold text-slate-700 text-sm">渠道啟用</p>
                                            <p className="text-xs text-slate-400 mt-0.5 truncate">關閉後 Telegram Bot 將停止回應訊息</p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleChannel('telegram', currentAgent.deploy_config.telegram.enabled === false)}
                                            className={`relative w-12 h-6 flex-none rounded-full transition-colors ${currentAgent.deploy_config.telegram.enabled !== false ? 'bg-[#0088cc]' : 'bg-slate-300'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${currentAgent.deploy_config.telegram.enabled !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                )}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 block">Bot Token</label>
                                    <input
                                        type="password"
                                        value={telegramBotToken}
                                        onChange={(e) => setTelegramBotToken(e.target.value)}
                                        placeholder="123456:ABC-DEF..."
                                        maxLength={256}
                                        autoComplete="new-password"
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] outline-none transition-all text-slate-700 font-medium placeholder:text-slate-300"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">從 @BotFather 取得，格式如 123456:ABC-DEF...</p>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center gap-4">
                                <button
                                    onClick={() => setIsTelegramModalOpen(false)}
                                    className="text-slate-500 hover:text-slate-700 font-bold px-6 py-4 rounded-2xl transition-all"
                                >
                                    取消
                                </button>
                                <button
                                    disabled={isTelegramDeploying}
                                    onClick={handleDeployTelegram}
                                    className="bg-[#0088cc] hover:bg-[#0077b5] disabled:opacity-50 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-[#0088cc]/20 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {isTelegramDeploying ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <Check size={20} />
                                    )}
                                    確認部署
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Meta (FB + IG) Modal */}
                {isMetaModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsMetaModalOpen(false)}
                        />
                        <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                            {/* Header */}
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0084FF 0%, #E4405F 100%)' }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                                            <path d="M12 2C6.47715 2 2 6.145 2 11.257c0 2.913 1.45 5.514 3.714 7.222V22l3.39-1.858c.905.251 1.868.388 2.896.388 5.52285 0 10-4.145 10-9.257C22 6.145 17.52285 2 12 2zm1.09 12.338l-2.607-2.78-5.084 2.78 5.587-5.93 2.67 2.78 5.022-2.78-5.588 5.93z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">串接 Facebook & Instagram</h2>
                                </div>
                                <button
                                    onClick={() => setIsMetaModalOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-8 space-y-6 overflow-y-auto flex-1">
                                {/* 已連接：顯示 toggle */}
                                {currentAgent?.deploy_config?.meta && (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="font-bold text-slate-700 text-sm">渠道啟用</p>
                                            <p className="text-xs text-slate-400 mt-0.5">關閉後 FB / IG 訊息將停止自動回覆</p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleChannel('meta', currentAgent.deploy_config.meta.enabled === false)}
                                            className={`relative w-12 h-6 flex-none rounded-full transition-colors ${currentAgent.deploy_config.meta.enabled !== false ? 'bg-blue-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${currentAgent.deploy_config.meta.enabled !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                )}

                                {/* Page Access Token */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 block">Page Access Token</label>
                                    <input
                                        type="password"
                                        value={metaPageAccessToken}
                                        onChange={(e) => setMetaPageAccessToken(e.target.value)}
                                        placeholder="EAAxxxxxxxxxx..."
                                        maxLength={512}
                                        autoComplete="new-password"
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700 font-mono text-sm placeholder:text-slate-300"
                                    />
                                    <p className="text-xs text-slate-400 mt-1.5">從 Meta for Developers → 您的粉絲專頁 → 取得 Page Access Token</p>
                                </div>

                                {/* Verify Token */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 block">Webhook Verify Token</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            value={metaVerifyToken}
                                            onChange={(e) => setMetaVerifyToken(e.target.value)}
                                            placeholder="自訂一組驗證密碼..."
                                            maxLength={256}
                                            autoComplete="new-password"
                                            className="flex-1 px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700 font-mono text-sm placeholder:text-slate-300"
                                        />
                                        <button
                                            onClick={() => setMetaVerifyToken(Math.random().toString(36).slice(2, 18))}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-2xl transition-all whitespace-nowrap"
                                        >
                                            自動產生
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5">部署後將顯示 Webhook URL，請至 Meta App Dashboard 填入此 Token 完成驗證</p>
                                </div>

                                {/* 功能開關 */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">功能設定</p>
                                    {[
                                        { label: 'Facebook Messenger 自動回覆', desc: '粉絲專頁訊息 → AI 自動回覆', value: metaFbEnabled, setter: setMetaFbEnabled, color: 'bg-blue-500' },
                                        { label: 'Instagram DM 自動回覆', desc: 'IG 私訊 → AI 自動回覆', value: metaIgDmEnabled, setter: setMetaIgDmEnabled, color: 'bg-pink-500' },
                                        { label: 'IG 留言關鍵字觸發 DM', desc: '用戶在貼文留言指定關鍵字 → 自動傳送 DM', value: metaIgCommentEnabled, setter: setMetaIgCommentEnabled, color: 'bg-purple-500' },
                                    ].map(({ label, desc, value, setter, color }) => (
                                        <div key={label} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="font-bold text-slate-700 text-sm">{label}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                            </div>
                                            <button
                                                onClick={() => setter(!value)}
                                                className={`relative w-12 h-6 flex-none rounded-full transition-colors ${value ? color : 'bg-slate-300'}`}
                                            >
                                                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* IG 留言關鍵字規則 */}
                                {metaIgCommentEnabled && (
                                    <div className="space-y-3">
                                        {/* 標題列 */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">關鍵字觸發規則</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">指定貼文規則優先比對，再比對全部貼文規則</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setMetaIgTriggers(prev => [...prev, {
                                                        keyword: '', match_type: 'contains',
                                                        post_scope: 'all', post_url: '', post_shortcode: '', post_id: '',
                                                        public_reply: '', reply_message: '',
                                                    }]);
                                                }}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                                            >
                                                <Plus size={14} />
                                                新增規則
                                            </button>
                                        </div>

                                        {metaIgTriggers.length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-2xl">
                                                尚未新增規則，點擊「新增規則」開始設定
                                            </p>
                                        )}

                                        {/* 指定貼文規則（優先） */}
                                        {metaIgTriggers.some(t => t.post_scope === 'specific') && (
                                            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1">
                                                <span className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-black text-[9px]">1</span>
                                                指定貼文規則（優先）
                                            </p>
                                        )}

                                        {metaIgTriggers.map((trigger, idx) => {
                                            if (trigger.post_scope !== 'specific') return null;
                                            const validation = metaPostValidation[idx] || {};
                                            return (
                                                <div key={idx} className="p-4 rounded-2xl border border-purple-100 bg-purple-50/30 space-y-3">
                                                    {/* 標頭：適用範圍 + 刪除 */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-2">
                                                            {['all', 'specific'].map(scope => (
                                                                <button
                                                                    key={scope}
                                                                    onClick={() => {
                                                                        const updated = [...metaIgTriggers];
                                                                        updated[idx] = { ...updated[idx], post_scope: scope };
                                                                        setMetaIgTriggers(updated);
                                                                        if (scope === 'all') {
                                                                            setMetaPostValidation(prev => { const n = { ...prev }; delete n[idx]; return n; });
                                                                        }
                                                                    }}
                                                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${trigger.post_scope === scope ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300'}`}
                                                                >
                                                                    {scope === 'all' ? '🌐 全部貼文' : '📄 指定貼文'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setMetaIgTriggers(prev => prev.filter((_, i) => i !== idx));
                                                                setMetaPostValidation(prev => { const n = { ...prev }; delete n[idx]; return n; });
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>

                                                    {/* 貼文 URL */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">IG 貼文網址</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={trigger.post_url || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...metaIgTriggers];
                                                                    updated[idx] = { ...updated[idx], post_url: e.target.value, post_id: '', post_shortcode: '' };
                                                                    setMetaIgTriggers(updated);
                                                                    setMetaPostValidation(prev => { const n = { ...prev }; delete n[idx]; return n; });
                                                                }}
                                                                placeholder="https://www.instagram.com/p/Cxxxxxxxx/"
                                                                maxLength={500}
                                                                className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-purple-400 transition-colors font-mono"
                                                            />
                                                            <button
                                                                onClick={() => handleValidatePost(idx)}
                                                                disabled={!trigger.post_url || validation.status === 'loading'}
                                                                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0"
                                                            >
                                                                {validation.status === 'loading'
                                                                    ? <Loader2 size={13} className="animate-spin" />
                                                                    : <Check size={13} />}
                                                                驗證
                                                            </button>
                                                        </div>
                                                        {validation.status === 'ok' && (
                                                            <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                                                                <CheckCircle2 size={12} />
                                                                驗證成功｜「{validation.caption || '（無說明文字）'}」
                                                            </p>
                                                        )}
                                                        {validation.status === 'error' && (
                                                            <p className="text-[11px] text-red-500 mt-1">❌ {validation.message}</p>
                                                        )}
                                                        {!validation.status && trigger.post_id && (
                                                            <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                                                                <CheckCircle2 size={12} />
                                                                已驗證（media_id: {trigger.post_id.slice(0, 8)}...）
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* 關鍵字 + 比對方式 */}
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">關鍵字</label>
                                                            <input
                                                                type="text"
                                                                value={trigger.keyword}
                                                                onChange={(e) => { const u = [...metaIgTriggers]; u[idx] = { ...u[idx], keyword: e.target.value }; setMetaIgTriggers(u); }}
                                                                placeholder="例：報名"
                                                                maxLength={100}
                                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-purple-400 transition-colors"
                                                            />
                                                        </div>
                                                        <div className="w-28">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">比對方式</label>
                                                            <select
                                                                value={trigger.match_type}
                                                                onChange={(e) => { const u = [...metaIgTriggers]; u[idx] = { ...u[idx], match_type: e.target.value }; setMetaIgTriggers(u); }}
                                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-purple-400 transition-colors"
                                                            >
                                                                <option value="contains">包含</option>
                                                                <option value="exact">完全符合</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* 公開留言回覆 */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                                                            公開留言回覆 <span className="text-slate-300 font-normal normal-case">（選填，所有人可見）</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={trigger.public_reply || ''}
                                                            onChange={(e) => { const u = [...metaIgTriggers]; u[idx] = { ...u[idx], public_reply: e.target.value }; setMetaIgTriggers(u); }}
                                                            placeholder="謝謝你的留言！已為你發送詳細資訊 😊"
                                                            maxLength={150}
                                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-purple-400 transition-colors"
                                                        />
                                                    </div>

                                                    {/* 私訊 DM */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                                                            私訊 DM 內容 <span className="text-red-400">*</span>
                                                        </label>
                                                        <textarea
                                                            value={trigger.reply_message}
                                                            onChange={(e) => { const u = [...metaIgTriggers]; u[idx] = { ...u[idx], reply_message: e.target.value }; setMetaIgTriggers(u); }}
                                                            placeholder="您好！活動報名連結在這裡：https://..."
                                                            rows={2}
                                                            maxLength={1000}
                                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-purple-400 transition-colors resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* 全部貼文規則 */}
                                        {metaIgTriggers.some(t => t.post_scope !== 'specific') && (
                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1 mt-1">
                                                <span className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-[9px]">
                                                    {metaIgTriggers.some(t => t.post_scope === 'specific') ? '2' : '1'}
                                                </span>
                                                全部貼文規則
                                            </p>
                                        )}

                                        {metaIgTriggers.map((trigger, idx) => {
                                            if (trigger.post_scope === 'specific') return null;
                                            return (
                                                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                                                    {/* 標頭：適用範圍 + 刪除 */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-2">
                                                            {['all', 'specific'].map(scope => (
                                                                <button
                                                                    key={scope}
                                                                    onClick={() => {
                                                                        const updated = [...metaIgTriggers];
                                                                        updated[idx] = { ...updated[idx], post_scope: scope };
                                                                        setMetaIgTriggers(updated);
                                                                    }}
                                                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${trigger.post_scope === scope ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-blue-300'}`}
                                                                >
                                                                    {scope === 'all' ? '🌐 全部貼文' : '📄 指定貼文'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            onClick={() => setMetaIgTriggers(prev => prev.filter((_, i) => i !== idx))}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>

                                                    {/* 關鍵字 + 比對方式 */}
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">關鍵字</label>
                                                            <input
                                                                type="text"
                                                                value={trigger.keyword}
                                                                onChange={(e) => { const u = [...metaIgTriggers]; u[idx] = { ...u[idx], keyword: e.target.value }; setMetaIgTriggers(u); }}
                                                                placeholder="例：網站"
                                                                maxLength={100}
                                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-blue-400 transition-colors"
                                                            />
                                                        </div>
                                                        <div className="w-28">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">比對方式</label>
                                                            <select
                                                                value={trigger.match_type}
                                                                onChange={(e) => { const u = [...metaIgTriggers]; u[idx] = { ...u[idx], match_type: e.target.value }; setMetaIgTriggers(u); }}
                                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-blue-400 transition-colors"
                                                            >
                                                                <option value="contains">包含</option>
                                                                <option value="exact">完全符合</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* 公開留言回覆 */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                                                            公開留言回覆 <span className="text-slate-300 font-normal normal-case">（選填，所有人可見）</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={trigger.public_reply || ''}
                                                            onChange={(e) => { const u = [...metaIgTriggers]; u[idx] = { ...u[idx], public_reply: e.target.value }; setMetaIgTriggers(u); }}
                                                            placeholder="謝謝你的留言！已為你發送詳細資訊 😊"
                                                            maxLength={150}
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-blue-400 transition-colors"
                                                        />
                                                    </div>

                                                    {/* 私訊 DM */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                                                            私訊 DM 內容 <span className="text-red-400">*</span>
                                                        </label>
                                                        <textarea
                                                            value={trigger.reply_message}
                                                            onChange={(e) => { const u = [...metaIgTriggers]; u[idx] = { ...u[idx], reply_message: e.target.value }; setMetaIgTriggers(u); }}
                                                            placeholder="您好！這是我們的官網連結：https://..."
                                                            rows={2}
                                                            maxLength={1000}
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-blue-400 transition-colors resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 部署後顯示 Webhook 資訊 */}
                                {metaDeployResult && (
                                    <div className="p-5 bg-green-50 border border-green-100 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                                            <CheckCircle2 size={18} />
                                            部署成功！請至 Meta App Dashboard 完成 Webhook 設定
                                        </div>
                                        {[
                                            { label: 'Webhook URL', value: metaDeployResult.webhookUrl, key: 'url' },
                                            { label: 'Verify Token', value: metaDeployResult.verifyToken, key: 'token' },
                                        ].map(({ label, value, key }) => (
                                            <div key={key}>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</p>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-xs bg-white border border-green-100 px-3 py-2 rounded-xl text-slate-700 font-mono break-all">{value}</code>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(value); setMetaCopied(key); setTimeout(() => setMetaCopied(''), 2000); }}
                                                        className="w-8 h-8 flex-none flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-100 rounded-lg transition-all"
                                                    >
                                                        {metaCopied === key ? <Check size={15} /> : <Copy size={15} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            前往 <strong>Meta for Developers → 您的 App → Webhooks</strong>，新增上方 URL 並填入 Verify Token，訂閱 <code className="bg-white px-1 rounded">messages</code> 欄位後按儲存。
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center gap-4 shrink-0">
                                <button
                                    onClick={() => setIsMetaModalOpen(false)}
                                    className="text-slate-500 hover:text-slate-700 font-bold px-6 py-4 rounded-2xl transition-all"
                                >
                                    {metaDeployResult ? '關閉' : '取消'}
                                </button>
                                <button
                                    disabled={isMetaDeploying}
                                    onClick={handleDeployMeta}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {isMetaDeploying ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <Check size={20} />
                                    )}
                                    {metaDeployResult ? '重新部署' : '確認部署'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Channel Management Overlay */}
                {isChannelManageOverlayOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsChannelManageOverlayOpen(false)}
                        />
                        <div className="relative bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                                        <SlidersHorizontal size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">管理渠道開關</h2>
                                </div>
                                <button
                                    onClick={() => setIsChannelManageOverlayOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-3">
                                {/* LINE */}
                                {(() => {
                                    const lineConnected = !!(currentAgent?.deploy_config?.line || currentAgent?.deploy_type === 'line');
                                    const lineEnabled = currentAgent?.deploy_config?.line?.enabled !== false;
                                    return (
                                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-9 h-9 bg-[#06C755]/10 rounded-xl flex-none flex items-center justify-center">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#06C755"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.052.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.893 2.572-5.992z" /></svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm truncate">LINE</p>
                                                    <p className="text-xs text-slate-400">{lineConnected ? (lineEnabled ? '已啟用' : '已暫停') : '尚未設定'}</p>
                                                </div>
                                            </div>
                                            {lineConnected ? (
                                                <button
                                                    onClick={() => handleToggleChannel('line', !lineEnabled)}
                                                    className={`relative w-12 h-6 flex-none rounded-full transition-colors ${lineEnabled ? 'bg-[#06C755]' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${lineEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            ) : (
                                                <span className="text-xs flex-none text-slate-400 bg-slate-100 px-3 py-1 rounded-full">請先設定</span>
                                            )}
                                        </div>
                                    );
                                })()}
                                {/* Telegram */}
                                {(() => {
                                    const tgConnected = !!(currentAgent?.deploy_config?.telegram || currentAgent?.deploy_type === 'telegram');
                                    const tgEnabled = currentAgent?.deploy_config?.telegram?.enabled !== false;
                                    return (
                                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-9 h-9 bg-sky-50 rounded-xl flex-none flex items-center justify-center">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0088cc"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.87 8.818c-.141.621-.51.772-1.033.479l-2.85-2.099-1.375 1.322c-.153.153-.281.281-.575.281l.204-2.895 5.272-4.762c.229-.204-.05-.316-.356-.113l-6.516 4.103-2.801-.875c-.61-.19-.621-.61.127-.905l10.94-4.217c.507-.187.951.116.833.103v.203z" /></svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm truncate">Telegram</p>
                                                    <p className="text-xs text-slate-400">{tgConnected ? (tgEnabled ? '已啟用' : '已暫停') : '尚未設定'}</p>
                                                </div>
                                            </div>
                                            {tgConnected ? (
                                                <button
                                                    onClick={() => handleToggleChannel('telegram', !tgEnabled)}
                                                    className={`relative w-12 h-6 flex-none rounded-full transition-colors ${tgEnabled ? 'bg-[#0088cc]' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${tgEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            ) : (
                                                <span className="text-xs flex-none text-slate-400 bg-slate-100 px-3 py-1 rounded-full">請先設定</span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

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
                <FaqAddModal
                    open={showFaqModal}
                    onClose={() => setShowFaqModal(false)}
                    categories={[...new Set(editingFaqs.map(f => f.category || '常見問題'))]}
                    defaultCategory={getDefaultFaqCategory(editingFaqs)}
                    onSubmit={(faq) => {
                        const newId = Date.now().toString();
                        setEditingFaqs([...editingFaqs, { id: newId, ...faq }]);
                        setExpandedCategories(prev => new Set([...prev, faq.category]));
                        setCategoryOrder(prev => prev.includes(faq.category) ? prev : [...prev, faq.category]);
                        setExpandedFaqItems(prev => new Set([...prev, newId]));
                        setShowFaqModal(false);
                        setTimeout(() => { faqsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
                    }}
                />

                {/* Add FAQ to Category Modal */}
                <FaqAddModal
                    open={addFaqCategoryModal.open}
                    onClose={() => setAddFaqCategoryModal(prev => ({ ...prev, open: false }))}
                    categories={[addFaqCategoryModal.category]}
                    defaultCategory={addFaqCategoryModal.category}
                    categoryFixed={true}
                    onSubmit={(faq) => {
                        const newId = Date.now().toString();
                        setEditingFaqs([...editingFaqs, { id: newId, ...faq }]);
                        setExpandedCategories(prev => new Set([...prev, faq.category]));
                        setCategoryOrder(prev => prev.includes(faq.category) ? prev : [...prev, faq.category]);
                        setExpandedFaqItems(prev => new Set([...prev, newId]));
                        setAddFaqCategoryModal(prev => ({ ...prev, open: false }));
                        setTimeout(() => { faqsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
                    }}
                />

                {/* Add Category Modal */}
                {showCategoryModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
                        <div className="relative bg-white w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800">新增分類</h2>
                                <button onClick={() => setShowCategoryModal(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">分類名稱</label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    maxLength={FAQ_MAX_CATEGORY}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && confirmAddCategory()}
                                    placeholder="例如：訂購規範與流程"
                                    autoFocus
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none"
                                />
                                <div className="text-[10px] text-slate-300 text-right mt-1">{newCategoryName.length}/{FAQ_MAX_CATEGORY}</div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setShowCategoryModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">取消</button>
                                <button
                                    onClick={confirmAddCategory}
                                    disabled={!newCategoryName.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} />
                                    新增
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Product Modal */}
                <ProductAddModal
                    open={showProductModal}
                    onClose={() => setShowProductModal(false)}
                    onSubmit={(newProd) => {
                        const newProdId = Date.now().toString();
                        const initCustomFields = Object.fromEntries(productFieldSchema.map(f => [f.key, '']));
                        setEditingProducts([...editingProducts, {
                            id: newProdId,
                            name: newProd.name,
                            description: newProd.description,
                            keywords: newProd.keywords,
                            image_id: newProd.image_id,
                            _preview_url: newProd._preview_url,
                            custom_fields: initCustomFields
                        }]);
                        setExpandedProductItems(prev => new Set([...prev, newProdId]));
                        setShowProductModal(false);
                        setTimeout(() => {
                            productsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                    }}
                />

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

            {/* 圖片放大燈箱 */}
            <ImageLightbox
                isOpen={!!lightboxSrc}
                src={lightboxSrc}
                alt="FAQ 附圖"
                onClose={() => setLightboxSrc(null)}
            />

            {/* 移動分類彈窗 */}
            {showFaqImportModal && (
                <FaqImportModal
                    onClose={() => setShowFaqImportModal(false)}
                    onConfirm={handleConfirmImportFaqs}
                    brandDescription={currentAgent?.brand_description || ''}
                    existingCategories={categoryOrder}
                    agentId={routeAgentId}
                    onOpenChatLogImport={() => {
                        setShowFaqImportModal(false);
                        setShowChatLogImportModal(true);
                    }}
                />
            )}

            {showChatLogImportModal && (
                <ChatLogImportModal
                    onClose={() => setShowChatLogImportModal(false)}
                    agentId={routeAgentId}
                    adminId={currentAgent?.admin_id}
                    merchantName={currentAgent?.config?.raw_config?.merchant_name || currentAgent?.name || ''}
                    existingCategories={categoryOrder}
                    onConfirm={handleConfirmImportFaqs}
                        existingFaqCount={editingFaqs.length}
                    />
            )}

            {showProductImportModal && (
                <ProductImportModal
                    onClose={() => setShowProductImportModal(false)}
                    onConfirm={handleConfirmImportProducts}
                    brandDescription={currentAgent?.config?.raw_config?.merchant_name || ''}
                    fieldSchema={productFieldSchema}
                    agentId={routeAgentId}
                />
            )}

            {moveFaqModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setMoveFaqModal({ open: false, idx: null, faqQuestion: '', currentCat: '' })}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-1">
                            <h3 className="text-base font-bold text-slate-800">移動問答到其他分類</h3>
                            <button onClick={() => setMoveFaqModal({ open: false, idx: null, faqQuestion: '', currentCat: '' })} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 truncate">「{moveFaqModal.faqQuestion || '此問答'}」</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {categoryOrder.filter(c => c !== moveFaqModal.currentCat && editingFaqs.some(f => (f.category || '常見問題') === c || c === moveFaqModal.currentCat)).filter(c => c !== moveFaqModal.currentCat).length === 0 ? (
                                <p className="text-sm text-slate-400 italic text-center py-6">沒有其他分類</p>
                            ) : categoryOrder.filter(c => c !== moveFaqModal.currentCat).map(targetCat => (
                                <button key={targetCat} onClick={() => { const closeModal = () => setMoveFaqModal({ open: false, idx: null, faqQuestion: '', currentCat: '' }); closeModal(); openConfirm({ title: '移動問答', message: `確定要將「${moveFaqModal.faqQuestion || '此問答'}」移動到「${targetCat}」嗎？`, confirmText: '確定移動', onConfirm: () => { moveFaqToCategory(moveFaqModal.idx, targetCat); closeConfirm(); } }); }} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-100 hover:border-brand-200 rounded-xl text-sm font-medium text-slate-700 transition-all">
                                    {targetCat}
                                </button>
                            ))}
                        </div>
                        <div className="mt-5 flex justify-end">
                            <button onClick={() => setMoveFaqModal({ open: false, idx: null, faqQuestion: '', currentCat: '' })} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">取消</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 共用確認彈窗 */}
            {showLineGuide && (
                <LineDeployGuide
                    onClose={() => setShowLineGuide(false)}
                    lineConfig={lineConfig}
                    setLineConfig={setLineConfig}
                />
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                cancelText={confirmDialog.cancelText}
                variant={confirmDialog.variant}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />

            <ChargeConfirmDialog
                isOpen={chargeConfirm.open}
                featureKey={chargeConfirm.featureKey}
                featureLabel={chargeConfirm.featureLabel}
                balance={userBalance}
                onConfirm={() => { closeChargeConfirm(); chargeConfirm.onConfirm?.(); }}
                onCancel={closeChargeConfirm}
            />

            {/* 欄位設定 Modal */}
            {fieldSettingsOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[130]" onClick={() => { setFieldSettingsOpen(false); setModalFieldLabel(''); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-96 mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-slate-700">欄位設定</div>
                                <div className="text-xs text-slate-400 mt-0.5">設定商品卡片顯示的欄位</div>
                            </div>
                            {isSavingSchema && <Loader2 size={14} className="animate-spin text-green-400" />}
                        </div>
                        <div className="px-6 py-5 space-y-5">
                            {/* 固定欄位 */}
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">固定欄位</div>
                                <div className="flex gap-2">
                                    {['名稱', '說明'].map(label => (
                                        <span key={label} className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold">{label}</span>
                                    ))}
                                </div>
                            </div>
                            {/* 選用欄位 */}
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">選用欄位</div>
                                <div className="flex flex-wrap gap-2">
                                    {keywordsEnabled ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-bold">
                                            別名
                                            <button onClick={() => toggleKeywords(false)} className="text-green-400 hover:text-red-500 transition-colors"><X size={11} /></button>
                                        </span>
                                    ) : (
                                        <button onClick={() => toggleKeywords(true)} className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-slate-300 text-slate-400 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                                            <Plus size={11} />別名
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* 自訂欄位 */}
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">自訂欄位 <span className="text-slate-300 normal-case font-normal">({productFieldSchema.length}/8)</span></div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {productFieldSchema.map(f => (
                                        <span key={f.key} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-bold">
                                            {f.label}
                                            <button onClick={() => removeCustomField(f.key)} className="text-green-400 hover:text-red-500 transition-colors"><X size={11} /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={modalFieldLabel}
                                        onChange={(e) => setModalFieldLabel(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addCustomField(modalFieldLabel); } }}
                                        placeholder="輸入欄位名稱..."
                                        maxLength={20}
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                    />
                                    <button
                                        onClick={() => addCustomField(modalFieldLabel)}
                                        className="px-3 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
                                    >
                                        新增
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                            <button onClick={() => { setFieldSettingsOpen(false); setModalFieldLabel(''); }} className="px-5 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors">完成</button>
                        </div>
                    </div>
                </div>
            )}

            <OnboardingChecklist
                agentId={routeAgentId}
                navigate={navigate}
                isDeployed={!!currentAgent?.line_channel_id}
                inboxVisited={!showInboxIntro}
                activityVisited={!showActivityIntro}
                crmVisited={!showCrmIntro}
            />
        </div>
    );
};

export default BackendDashboard;
