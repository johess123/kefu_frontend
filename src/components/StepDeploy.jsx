import React, { useState, useRef } from 'react';
import config from '../config';
import { Rocket, CheckCircle2, MessageCircle, ShieldCheck, Loader2, Key, Lock, ArrowRight, Home, X, Lightbulb, ExternalLink } from 'lucide-react';

const DEPLOY_GUIDES = [
    {
        step: 1,
        title: "登入開發者後台",
        content: (
            <>
                前往 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold hover:underline">LINE Developers Console</a> 並使用您的 LINE 帳號登入。
            </>
        ),
        image: null
    },
    {
        step: 2,
        title: "建立 Provider",
        content: "如果您還沒有 Provider，請先點選首頁的「Create a new provider」按鈕建立一個。",
        image: "/line_deploy_doc/step1.png"
    },
    {
        step: 3,
        title: "輸入 Provider 名稱",
        content: "輸入您喜歡的 Provider 名稱（例如公司名稱或個人品牌名稱），然後按下 Create。",
        image: "/line_deploy_doc/step2.png"
    },
    {
        step: 4,
        title: "建立 Messaging API Channel",
        content: "在 Provider 頁面中，點選「Create a Messaging API channel」圖示。",
        image: "/line_deploy_doc/step3.png"
    },
    {
        step: 5,
        title: "創立新的 LINE 官方帳號",
        content: "系統會引導您填寫 Channel 資訊，請繼續往下填寫。",
        image: "/line_deploy_doc/step4.png"
    },
    {
        step: 6,
        title: "輸入基本資料",
        content: "填寫 Channel name (機器人名稱)、Description (描述)、Category (類別) 等必填欄位。",
        image: "/line_deploy_doc/step5.png"
    },
    {
        step: 7,
        title: "建立成功確認",
        content: "確認資訊無誤後送出，您會看到 Channel 建立成功的畫面。",
        image: "/line_deploy_doc/step6.png"
    },
    {
        step: 8,
        title: "稍後進行認證",
        content: "該頁面往下滑，點選「稍後進行認證」即可（不需要馬上申請藍盾/灰盾）。",
        image: "/line_deploy_doc/step7.png"
    },
    {
        step: 9,
        title: "前往回應設定畫面",
        content: "點選「聊天」圖示，會跳出彈窗，請點選連結「前往回應設定畫面」。",
        image: "/line_deploy_doc/step8.png"
    },
    {
        step: 10,
        title: "啟用 Messaging API",
        content: "在設定頁面中找到 Messaging API 選項，點擊「啟用 Messaging API」。",
        image: "/line_deploy_doc/step9.png"
    },
    {
        step: 11,
        title: "選擇 Provider",
        content: "點選剛剛輸入 Provider 設定的名稱，並點選同意。",
        image: "/line_deploy_doc/step10.png"
    },
    {
        step: 12,
        title: "確認隱私權條款",
        content: "隱私權政策與服務條款可留空，直接點選「確定」。",
        image: "/line_deploy_doc/step11.png"
    },
    {
        step: 13,
        title: "再次確認",
        content: "點選「確定」以完成啟用。",
        image: "/line_deploy_doc/step12.png"
    },
    {
        step: 14,
        title: "回到 Developers Console",
        content: (
            <>這樣就成功啟用 Messaging API 了。請點選 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold hover:underline">LINE Developers Console</a> 回到主控台。</>
        ),
        image: "/line_deploy_doc/step13.png"
    },
    {
        step: 15,
        title: "選擇剛建立的 Channel",
        content: "在 Console 首頁找到剛剛設定好的 Channel，點選進入。",
        image: "/line_deploy_doc/step14.png"
    },
    {
        step: 16,
        title: "取得 Channel Secret",
        content: "在 Basic settings 頁籤下方，找到 Channel secret 區塊，複製並貼到下方欄位。",
        image: "/line_deploy_doc/step15.png"
    },
    {
        step: 17,
        title: "取得 Access Token",
        content: "切換到 Messaging API 頁籤，滑到最下方找到 Channel access token，點擊 Issue 並貼到下方。",
        image: "/line_deploy_doc/step16.png"
    }
];

const StepDeploy = ({ formData, sessionId, agentId, onHome }) => {
    const [isDeploying, setIsDeploying] = useState(false);
    const [isDeployed, setIsDeployed] = useState(false);
    const [deployedChannelId, setDeployedChannelId] = useState('');
    const [lineConfig, setLineConfig] = useState({
        accessToken: '',
        channelSecret: ''
    });
    const [showGuide, setShowGuide] = useState(false);
    const step9Ref = useRef(null);

    const handleDeploy = async () => {
        if (!lineConfig.accessToken || !lineConfig.channelSecret) {
            alert('請填寫 LINE Bot 的正確金鑰資訊');
            return;
        }

        setIsDeploying(true);
        try {
            const response = await fetch(`${config.API_URL}/api/deploy_line`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    access_token: lineConfig.accessToken,
                    channel_secret: lineConfig.channelSecret
                })
            });
            const data = await response.json();
            if (data.status === 'ok') {
                setDeployedChannelId(data.channel_id);
                setIsDeployed(true);
            } else {
                alert('部署失敗：' + data.message);
            }
        } catch (error) {
            console.error('Deployment error:', error);
            alert('無法連線到伺服器進行部署');
        } finally {
            setIsDeploying(false);
        }
    };

    const scrollToStep9 = () => {
        if (step9Ref.current) {
            step9Ref.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="max-w-5xl mx-auto w-full px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-2xl text-brand-600 mb-4 shadow-sm">
                    <Rocket size={32} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-3">部署到 LINE 官方帳號</h2>
                <p className="text-slate-500 max-w-xl mx-auto">
                    請填入 LINE Developers Console 的串接資訊，即可完成 AI 客服部署。
                </p>
            </div>

            {!isDeployed ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Configuration Form (8 cols) */}
                    <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-green-100">
                                    <MessageCircle size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">LINE Bot 設定</h3>
                                    <p className="text-sm text-slate-500">Messaging API Channel Settings</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                        <Key size={16} className="text-brand-500" />
                                        Channel Access Token (long-lived)
                                    </label>
                                    <textarea
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-600 text-sm font-mono min-h-[100px] transition-all"
                                        placeholder="請貼上 Channel Access Token..."
                                        value={lineConfig.accessToken}
                                        onChange={(e) => setLineConfig({ ...lineConfig, accessToken: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                        <Lock size={16} className="text-brand-500" />
                                        Channel Secret
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-600 text-sm font-mono transition-all"
                                        placeholder="請輸入 Channel Secret..."
                                        value={lineConfig.channelSecret}
                                        onChange={(e) => setLineConfig({ ...lineConfig, channelSecret: e.target.value })}
                                    />
                                </div>

                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                    <div className="text-amber-500 mt-1">
                                        <Lightbulb size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-amber-800 text-sm mb-1">不知道去哪裡找？</h4>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            我們準備了完整教學，
                                            <button
                                                onClick={() => setShowGuide(true)}
                                                className="underline font-bold hover:text-amber-900 mx-1"
                                            >
                                                點此查看如何取得 Token 與 Secret
                                            </button>
                                            。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-sm text-slate-400 font-medium">
                            <span>當前階段：AI 邏輯已就緒</span>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Summary & Action (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <ShieldCheck className="text-brand-500" />
                                部署清單
                            </h3>
                            <div className="flex-1 space-y-5">
                                <div className="pb-5 border-b border-slate-100">
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">對象平台</p>
                                    <p className="text-sm font-bold text-slate-700">LINE Messaging API</p>
                                </div>
                                <div className="pb-5 border-b border-slate-100">
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">AI 設定庫</p>
                                    <p className="text-sm font-bold text-slate-700">{formData.faqs.length} 題知識庫</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">轉人工邏輯</p>
                                    <p className="text-sm font-bold text-slate-700">{formData.handoffTriggers.length + (formData.handoffCustomTrigger ? 1 : 0)} 項觸發規則</p>
                                </div>
                            </div>

                            <button
                                onClick={handleDeploy}
                                disabled={isDeploying}
                                className="w-full mt-10 bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-brand-200 active:scale-95 flex items-center justify-center gap-3"
                            >
                                {isDeploying ? (
                                    <>
                                        <Loader2 className="animate-spin w-5 h-5" />
                                        部署中...
                                    </>
                                ) : (
                                    <>
                                        <span>開始部署服務</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="bg-slate-800 rounded-3xl p-6 text-white overflow-hidden relative">
                            <div className="relative z-10">
                                <h4 className="font-bold mb-2">需要開發支援？</h4>
                                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                    如果您在串接過程遇到困難，我們的工程團隊隨時在線提供協助。
                                </p>
                                <a
                                    href="https://line.me/R/ti/p/@304dgdjo"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-white"
                                >
                                    聯絡技術支援
                                </a>
                            </div>
                            <MessageCircle className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 text-center animate-in zoom-in duration-500 overflow-hidden relative">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-50 rounded-full -ml-12 -mb-12"></div>

                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-100 ring-8 ring-green-50">
                                <CheckCircle2 size={48} />
                            </div>
                            <h3 className="text-4xl font-black text-slate-800 mb-4">部署成功！</h3>
                            <p className="text-slate-500 mb-10 text-lg">
                                您的 LINE AI 客服已正式啟動，您現在可以回到首頁管理您的 Agent 或進行其他設定。
                            </p>

                            <div className="space-y-4 mb-10">
                                <div className="text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">部署狀態</label>
                                    <div className="flex items-center gap-3 text-green-600 font-bold bg-green-50/50 px-5 py-4 rounded-2xl border border-green-100 shadow-sm">
                                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm">Connected to LINE Messaging API</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={onHome}
                                    className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-100 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Home size={20} />
                                    回到首頁
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Teaching Modal */}
            {showGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-10 relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">LINE 金鑰取得教學</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-2">
                                        共 17 個步驟
                                        <span className="text-slate-300">|</span>
                                        <button
                                            onClick={scrollToStep9}
                                            className="text-brand-600 font-bold hover:underline flex items-center gap-1"
                                        >
                                            已有官方帳號？點此跳至步驟 9 <ArrowRight size={12} />
                                        </button>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowGuide(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 scroll-smooth">
                            <div className="max-w-2xl mx-auto space-y-12 pb-24">
                                {DEPLOY_GUIDES.map((step, idx) => (
                                    <div
                                        key={idx}
                                        id={step.step === 9 ? "guide-step-9" : undefined}
                                        ref={step.step === 9 ? step9Ref : undefined}
                                        className="relative pl-12"
                                    >
                                        {/* Step Indicator */}
                                        <div className="absolute left-0 top-0 w-8 h-8 bg-white border-2 border-slate-200 text-slate-400 rounded-full flex items-center justify-center font-bold text-sm z-10 shadow-sm">
                                            {step.step}
                                        </div>
                                        {/* Connecting Line */}
                                        {idx !== DEPLOY_GUIDES.length - 1 && (
                                            <div className="absolute left-4 top-8 bottom-[-48px] w-0.5 bg-slate-200 z-0"></div>
                                        )}

                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">{step.content}</p>
                                            </div>

                                            {step.image && (
                                                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md">
                                                    <img src={step.image} alt={step.title} className="w-full h-auto" />
                                                </div>
                                            )}

                                            {/* Special Inputs for Step 16 & 17 */}
                                            {step.step === 16 && (
                                                <div className="mt-4 flex items-center w-full p-3 bg-yellow-50 border-2 border-yellow-400 rounded-xl transition-all">
                                                    <Lock size={18} className="text-slate-400 mr-2 flex-shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={lineConfig.channelSecret}
                                                        onChange={(e) => setLineConfig({ ...lineConfig, channelSecret: e.target.value })}
                                                        placeholder="貼上您的 Channel Secret"
                                                        className="w-full bg-transparent border-none outline-none text-slate-600 placeholder:text-slate-400 text-sm font-medium font-mono"
                                                    />
                                                </div>
                                            )}
                                            {step.step === 17 && (
                                                <div className="mt-4 flex items-start w-full p-3 bg-yellow-50 border-2 border-yellow-400 rounded-xl transition-all">
                                                    <Key size={18} className="text-slate-400 mr-2 mt-0.5 flex-shrink-0" />
                                                    <textarea
                                                        value={lineConfig.accessToken}
                                                        onChange={(e) => setLineConfig({ ...lineConfig, accessToken: e.target.value })}
                                                        placeholder="貼上您的 Channel Access Token"
                                                        className="w-full bg-transparent border-none outline-none text-slate-600 placeholder:text-slate-400 text-sm font-medium font-mono min-h-[100px] resize-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center relative z-10 shrink-0">
                            <p className="text-xs text-slate-400 font-medium">請依照步驟取得並填寫金鑰</p>
                            <button
                                onClick={() => setShowGuide(false)}
                                className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                自動帶入並完成
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StepDeploy;
