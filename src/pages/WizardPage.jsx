import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { AppStep, DEFAULT_FORM_DATA, DEFAULT_HANDOFF_OPTIONS } from '../types';
import StepWizard from '../components/StepWizard';
import StepReview from '../components/StepReview';
import StepDemo from '../components/StepDemo';
import StepDeploy from '../components/StepDeploy';
import { MessageSquare, ListChecks, PlayCircle, RefreshCw, Rocket, Loader2, Home } from 'lucide-react';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../context/AuthContext';

const StepTab = ({ active, icon, label, disabled, onClick }) => (
    <button
        onClick={disabled ? undefined : onClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${active
            ? 'bg-brand-50 text-brand-700 font-bold'
            : disabled
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-500 hover:text-slate-700'
            }`}
    >
        {icon}
        <span className="text-sm hidden sm:inline">{label}</span>
    </button>
);

const WizardPage = () => {
    const { agentId: routeAgentId } = useParams();
    const { userBalance } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(AppStep.WIZARD);
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
    const [reviewData, setReviewData] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [agentId, setAgentId] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const didInit = useRef(false);

    const handleStartFilling = async (currentAgentId = null) => {
        const response = await fetch(`${config.API_URL}/api/init_session`);
        const data = await response.json();
        if (!data.session_id) throw new Error('初始化會話失敗');
        setSessionId(data.session_id);
        if (currentAgentId) {
            setAgentId(currentAgentId);
        } else {
            setFormData(DEFAULT_FORM_DATA);
            const lineUserId = (await import('js-cookie')).default.get('google_user_id');
            const draftRes = await axios.post(`${config.API_URL}/api/agents/draft`, { line_user_id: lineUserId });
            setAgentId(draftRes.data.agent_id);
        }
        setCurrentStep(AppStep.WIZARD);
    };

    const parseAndLoadAgent = (agent) => {
        const rawConfig = agent.config?.raw_config;
        if (!rawConfig) return agent._id; // draft agent，沒有 config，直接帶 id 進 wizard
        let handoffTriggers = [];
        let handoffCustomTrigger = '';
        if (rawConfig.handoff_logic) {
            const match = rawConfig.handoff_logic.match(/當使用者提到以下任何一項時轉接：(.*)/);
            if (match) {
                const allTriggers = match[1].split(', ');
                handoffTriggers = allTriggers.filter(t => DEFAULT_HANDOFF_OPTIONS.includes(t));
                const custom = allTriggers.filter(t => !DEFAULT_HANDOFF_OPTIONS.includes(t));
                if (custom.length > 0) handoffCustomTrigger = custom.join('、');
            }
        }
        setFormData({
            businessName: rawConfig.merchant_name || '',
            servicesDescription: rawConfig.services || '',
            websiteUrl: rawConfig.website_url || '',
            tone: rawConfig.tone || '親切自然',
            toneAvoid: rawConfig.tone_avoid || '',
            faqs: rawConfig.faqs || [],
            // 必須一併載入 —— 精靈送出時會覆蓋 faq_drafts，
            // 沒讀進來的話重跑精靈會清空商家既有的草稿
            faqDrafts: rawConfig.faq_drafts || [],
            pendingImageDeletes: [],
            originalImageIds: [
                ...new Set(
                    [...(rawConfig.faqs || []), ...(rawConfig.products || []), ...(rawConfig.faq_drafts || [])]
                        .map(item => item?.image_id)
                        .filter(Boolean)
                ),
            ],
            products: rawConfig.products || [],
            handoffTriggers,
            handoffCustomTrigger
        });
        return agent._id;
    };

    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;
        const init = async () => {
            try {
                if (routeAgentId) {
                    const agentData = location.state?.agentData;
                    if (agentData) {
                        const id = parseAndLoadAgent(agentData);
                        await handleStartFilling(id);
                    } else {
                        const res = await axios.get(`${config.API_URL}/api/admin/agents`);
                        const agent = res.data.find(a => a._id === routeAgentId);
                        if (agent) {
                            const id = parseAndLoadAgent(agent);
                            await handleStartFilling(id);
                        } else {
                            alert('找不到 Agent，返回首頁。');
                            navigate('/');
                        }
                    }
                } else {
                    await handleStartFilling();
                }
            } catch (error) {
                console.error('Error initializing wizard:', error);
                alert('無法連線到伺服器，請確保後端已啟動。');
            } finally {
                setIsInitializing(false);
            }
        };
        init();
    }, []);

    const goToStep1 = () => {
        const standardOptions = DEFAULT_HANDOFF_OPTIONS;
        const currentTriggers = formData.handoffTriggers || [];
        const filteredStandard = currentTriggers.filter(t => standardOptions.includes(t));
        const nonStandard = currentTriggers.filter(t => !standardOptions.includes(t));
        let newCustomTrigger = formData.handoffCustomTrigger || '';
        if (nonStandard.length > 0 && !newCustomTrigger) {
            newCustomTrigger = nonStandard.join('、');
        }
        setFormData(prev => ({
            ...prev,
            handoffTriggers: filteredStandard,
            handoffCustomTrigger: newCustomTrigger
        }));
        setCurrentStep(AppStep.WIZARD);
    };

    const resetDemo = () => {
        if (window.confirm('確定要清空所有設定重新開始嗎？')) {
            setFormData(DEFAULT_FORM_DATA);
            setReviewData(null);
            setCurrentStep(AppStep.WIZARD);
            setSessionId(null);
            setAgentId(null);
            handleStartFilling().catch(console.error);
        }
    };

    if (isInitializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            </div>
        );
    }

    const renderStep = () => {
        switch (currentStep) {
            case AppStep.WIZARD:
                return (
                    <StepWizard
                        formData={formData}
                        setFormData={setFormData}
                        agentId={agentId}
                        onComplete={() => {
                            setReviewData(null);
                            setCurrentStep(AppStep.REVIEW);
                        }}
                    />
                );
            case AppStep.REVIEW:
                return (
                    <StepReview
                        formData={formData}
                        setFormData={setFormData}
                        reviewData={reviewData}
                        setReviewData={setReviewData}
                        sessionId={sessionId}
                        agentId={agentId}
                        setAgentId={setAgentId}
                        onNext={() => setCurrentStep(AppStep.DEMO)}
                        onEdit={goToStep1}
                    />
                );
            case AppStep.DEMO:
                return (
                    <StepDemo
                        formData={formData}
                        sessionId={sessionId}
                        setSessionId={setSessionId}
                        agentId={agentId}
                        onNext={() => setCurrentStep(AppStep.DEPLOY)}
                        setCurrentStep={setCurrentStep}
                    />
                );
            case AppStep.DEPLOY:
                return (
                    <StepDeploy
                        formData={formData}
                        sessionId={sessionId}
                        agentId={agentId}
                        onHome={() => navigate('/')}
                    />
                );
            default:
                return <div>Error</div>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-50">
                <div
                    className="flex-1 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate('/')}
                >
                    <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                        <Home size={20} />
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight hidden sm:block">首頁</span>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-8 flex-shrink-0">
                    <StepTab
                        active={currentStep === AppStep.WIZARD}
                        icon={<ListChecks size={18} />}
                        label="1. 問卷建立"
                        onClick={goToStep1}
                    />
                    <div className="w-8 h-[1px] bg-slate-200 hidden sm:block"></div>
                    <StepTab
                        active={currentStep === AppStep.REVIEW}
                        icon={<MessageSquare size={18} />}
                        label="2. 整理 FAQ"
                        disabled={currentStep === AppStep.WIZARD}
                        onClick={() => setCurrentStep(AppStep.REVIEW)}
                    />
                    <div className="w-8 h-[1px] bg-slate-200 hidden sm:block"></div>
                    <StepTab
                        active={currentStep === AppStep.DEMO}
                        icon={<PlayCircle size={18} />}
                        label="3. AI 示範"
                        disabled={currentStep < AppStep.DEMO}
                        onClick={() => setCurrentStep(AppStep.DEMO)}
                    />
                    <div className="w-8 h-[1px] bg-slate-200 hidden sm:block"></div>
                    <StepTab
                        active={currentStep === AppStep.DEPLOY}
                        icon={<Rocket size={18} />}
                        label="4. 一鍵部署"
                        disabled={currentStep < AppStep.DEPLOY}
                        onClick={() => setCurrentStep(AppStep.DEPLOY)}
                    />
                </div>

                <div className="flex-1 flex items-center justify-end gap-4">
                    {/* 點數餘額 */}
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 font-bold py-1.5 px-3 rounded-xl text-sm">
                        <span className="text-amber-500">🪙</span>
                        <span>{(userBalance || 0).toLocaleString()}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-slate-600">AI 夥伴在線</span>
                    </div>
                    <button
                        onClick={resetDemo}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="重新開始"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            <main className="flex-1">
                {renderStep()}
            </main>
        </div>
    );
};

export default WizardPage;
