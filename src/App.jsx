import React, { useState, useEffect } from 'react';
import config from './config';
import { AppStep, DEFAULT_FORM_DATA, DEFAULT_HANDOFF_OPTIONS } from './types';
import StepWizard from './components/StepWizard';
import StepReview from './components/StepReview';
import StepDemo from './components/StepDemo';
import StepDeploy from './components/StepDeploy';
import AgentHome from './components/AgentHome';
import BackendDashboard from './components/BackendDashboard';
import { Layout, MessageSquare, ListChecks, PlayCircle, RefreshCw, ArrowRight, Rocket, Loader2, Home } from 'lucide-react';
import liff from '@line/liff';
import axios from 'axios';
import Cookies from 'js-cookie';

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

const App = () => {
    const [currentStep, setCurrentStep] = useState(AppStep.WIZARD);
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
    const [reviewData, setReviewData] = useState(null);
    const [showLanding, setShowLanding] = useState(true);
    const [sessionId, setSessionId] = useState(null);
    const [agentId, setAgentId] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [lineUserId, setLineUserId] = useState(null);
    const [lineUserName, setLineUserName] = useState(null);
    const [showDashboard, setShowDashboard] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);

    useEffect(() => {
        const initLIFF = async () => {
            try {
                await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
                if (!liff.isLoggedIn()) {
                    liff.login();
                    return;
                }
                const profile = await liff.getProfile();
                const userId = profile.userId;

                // 將 userId 存入 Cookie (有效期 7 天)
                Cookies.set('line_user_id', userId, { expires: 7 });
                Cookies.set('line_user_name', profile.displayName, { expires: 7 });

                // 呼叫後端登入驗證
                const response = await axios.post(`${config.API_URL}/api/admin/login`, {
                    userId: profile.userId,
                    name: profile.displayName
                });
                if (response.data.isAdmin) {
                    setIsAuthorized(true);
                    setLineUserId(userId);
                    setLineUserName(profile.displayName);
                } else {
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error('LIFF 初始化失敗:', error);
                setIsAuthorized(false);
            } finally {
                setIsVerifying(false);
            }
        };
        initLIFF();
    }, []);

    const goToStep1 = () => {
        const standardOptions = DEFAULT_HANDOFF_OPTIONS;
        const currentTriggers = formData.handoffTriggers || [];

        // 區分標準選項與自定義選項
        const filteredStandard = currentTriggers.filter(t => standardOptions.includes(t));
        const nonStandard = currentTriggers.filter(t => !standardOptions.includes(t));

        // 如果有非標準選項，且目前 custom 欄位是空的，嘗試把非標準選項塞進去
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
            setShowLanding(true);
            setSessionId(null);
            setAgentId(null);
        }
    };

    const handleStartFilling = async (currentAgentId = null) => {
        try {
            const response = await fetch(`${config.API_URL}/api/init_session`);
            const data = await response.json();
            if (data.session_id) {
                setSessionId(data.session_id);
                setShowLanding(false);
                if (currentAgentId) {
                    setAgentId(currentAgentId);
                } else {
                    setFormData(DEFAULT_FORM_DATA);
                    setAgentId(null);
                }
                setCurrentStep(AppStep.WIZARD);
            } else {
                alert('初始化會話失敗，請稍後再試。');
            }
        } catch (error) {
            console.error('Error initializing session:', error);
            alert('無法連線到伺服器，請確保後端已啟動。');
        }
    };

    const handleEditAgent = async (agent) => {
        const rawConfig = agent.config.raw_config;

        // 解析 handoff_logic 回填至 formData
        let handoffTriggers = [];
        let handoffCustomTrigger = '';

        if (rawConfig.handoff_logic) {
            const match = rawConfig.handoff_logic.match(/當使用者提到以下任何一項時轉接：(.*)/);
            if (match) {
                const triggerStr = match[1];
                const allTriggers = triggerStr.split(', ');
                handoffTriggers = allTriggers.filter(t => DEFAULT_HANDOFF_OPTIONS.includes(t));
                const customTriggers = allTriggers.filter(t => !DEFAULT_HANDOFF_OPTIONS.includes(t));
                if (customTriggers.length > 0) {
                    handoffCustomTrigger = customTriggers.join('、');
                }
            }
        }

        setFormData({
            brandDescription: rawConfig.merchant_name + " " + (rawConfig.services || ''),
            websiteUrl: rawConfig.website_url || '',
            tone: rawConfig.tone || '親切自然',
            toneAvoid: rawConfig.tone_avoid || '',
            faqs: rawConfig.faqs || [],
            handoffTriggers: handoffTriggers,
            handoffCustomTrigger: handoffCustomTrigger
        });

        handleStartFilling(agent._id);
    };

    const handleEnterDashboard = (agent) => {
        setSelectedAgent(agent);
        setShowDashboard(true);
    };

    const handleBackFromDashboard = () => {
        setShowDashboard(false);
        setSelectedAgent(null);
    };

    const renderStep = () => {
        switch (currentStep) {
            case AppStep.WIZARD:
                return (
                    <StepWizard
                        formData={formData}
                        setFormData={setFormData}
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
                        onHome={() => setShowLanding(true)}
                    />
                );
            default:
                return <div>Error</div>;
        }
    };

    const renderLanding = () => {
        if (showDashboard) {
            return (
                <BackendDashboard
                    agent={selectedAgent}
                    onBack={handleBackFromDashboard}
                />
            );
        }
        return (
            <AgentHome
                userId={lineUserId}
                userName={lineUserName}
                onStartNew={() => handleStartFilling()}
                onEditAgent={handleEditAgent}
                onEnterDashboard={handleEnterDashboard}
            />
        );
    };

    if (isVerifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layout size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">權限不足</h2>
                    <p className="text-slate-600">您目前不具備管理員權限，無法進入此系統。</p>
                    <p className="text-slate-400 text-sm mt-4">請聯繫管理員協助。</p>
                </div>
            </div>
        );
    }

    if (showLanding) return renderLanding();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Topbar */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-50">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowLanding(true)}>
                    <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                        <Home size={20} />
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight hidden sm:block">首頁</span>
                </div>

                {/* Steps */}
                <div className="flex items-center space-x-1 sm:space-x-8">
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

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-slate-600">AI 夥伴在線</span>
                    </div>
                    <button onClick={resetDemo} className="text-slate-400 hover:text-red-500 transition-colors" title="重新開始">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {renderStep()}
            </main>
        </div>
    );
};

export default App;
