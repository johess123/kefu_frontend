import React, { useRef } from 'react';
import { CheckCircle2, Key, Lock, ArrowRight, X } from 'lucide-react';

export const DEPLOY_GUIDES = [
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

const LineDeployGuide = ({ onClose, lineConfig, setLineConfig }) => {
    const step9Ref = useRef(null);

    const scrollToStep9 = () => {
        if (step9Ref.current) {
            step9Ref.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
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
                                    className="text-green-600 font-bold hover:underline flex items-center gap-1"
                                >
                                    已有官方帳號？點此跳至步驟 9 <ArrowRight size={12} />
                                </button>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
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
                                <div className="absolute left-0 top-0 w-8 h-8 bg-white border-2 border-slate-200 text-slate-400 rounded-full flex items-center justify-center font-bold text-sm z-10 shadow-sm">
                                    {step.step}
                                </div>
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
                                    {step.step === 16 && lineConfig && setLineConfig && (
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
                                    {step.step === 17 && lineConfig && setLineConfig && (
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
                        onClick={onClose}
                        className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2"
                    >
                        <CheckCircle2 size={18} />
                        完成
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LineDeployGuide;
