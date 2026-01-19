import React, { useState } from 'react';
import config from '../config';
import { Rocket, CheckCircle2, Copy, ExternalLink, MessageCircle, ShieldCheck, Loader2, Key, Lock, ArrowRight, Home } from 'lucide-react';

const StepDeploy = ({ formData, sessionId, agentId, onHome }) => {
    const [isDeploying, setIsDeploying] = useState(false);
    const [isDeployed, setIsDeployed] = useState(false);
    const [deployedChannelId, setDeployedChannelId] = useState('');
    const [lineConfig, setLineConfig] = useState({
        accessToken: '',
        channelSecret: ''
    });

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

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('已複製到剪貼簿');
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
                                    <div className="text-amber-500 mt-0.5">💡</div>
                                    <div className="text-xs text-amber-700 leading-relaxed">
                                        <strong>如何取得？</strong> 請至 <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-800">LINE Developers</a> 登入後，在 Messaging API 頁面下方即可找到對應的金鑰資訊。
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
                                <button className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
                                    聯絡技術支援
                                </button>
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
        </div>
    );
};

export default StepDeploy;
