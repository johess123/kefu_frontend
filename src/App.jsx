import React, { useState } from 'react';
import config from './config';
import { AppStep, DEFAULT_FORM_DATA, DEFAULT_HANDOFF_OPTIONS } from './types';
import StepWizard from './components/StepWizard';
import StepReview from './components/StepReview';
import StepDemo from './components/StepDemo';
import StepDeploy from './components/StepDeploy';
import { Layout, MessageSquare, ListChecks, PlayCircle, RefreshCw, ArrowRight, Rocket } from 'lucide-react';

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
        }
    };

    const handleStartFilling = async () => {
        try {
            const response = await fetch(`${config.API_URL}/api/init_session`);
            const data = await response.json();
            if (data.session_id) {
                setSessionId(data.session_id);
                setShowLanding(false);
            } else {
                alert('初始化會話失敗，請稍後再試。');
            }
        } catch (error) {
            console.error('Error initializing session:', error);
            alert('無法連線到伺服器，請確保後端已啟動。');
        }
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
                        onNext={() => setCurrentStep(AppStep.DEMO)}
                        onEdit={goToStep1}
                    />
                );
            case AppStep.DEMO:
                return (
                    <StepDemo
                        formData={formData}
                        sessionId={sessionId}
                        onNext={() => setCurrentStep(AppStep.DEPLOY)}
                        setCurrentStep={setCurrentStep}
                    />
                );
            case AppStep.DEPLOY:
                return <StepDeploy formData={formData} sessionId={sessionId} />;
            default:
                return <div>Error</div>;
        }
    };

    const renderLanding = () => (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-brand-600 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Layout size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-1">KeFu Demo v1</h1>
                    <p className="text-brand-100 text-sm">快速建立你的 AI 客服 MVP</p>
                </div>
                <div className="p-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Step 1－問卷建立</h2>
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        花 3～5 分鐘，KeFu 會幫你整理出第一版 FAQ，並設定「轉人工客服」的條件。
                    </p>

                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">👋</span>
                            <span className="font-bold text-slate-700">我是 KeFu 的 AI 夥伴</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">接下來會問你幾個問題，讓我快速整理：</p>
                        <ul className="space-y-2 text-sm text-slate-600 pl-2">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                                你的品牌在做什麼
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                                常見問題怎麼回答
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                                什麼情況需要轉真人
                            </li>
                        </ul>
                    </div>

                    <button
                        onClick={handleStartFilling}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-brand-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                        開始填寫 <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );

    if (showLanding) return renderLanding();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Topbar */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                        <Layout size={20} />
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight hidden sm:block">KeFu Demo</span>
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
