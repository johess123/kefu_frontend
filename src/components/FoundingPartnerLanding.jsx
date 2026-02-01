import React from 'react';
import { Target, Zap, Fingerprint, Cpu, ShieldCheck, Power, MoreHorizontal, Loader2 } from 'lucide-react';

const FoundingPartnerLanding = ({ isVerifying, onLaunch }) => {
    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-10"
                style={{
                    backgroundImage: `linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}>
            </div>

            {/* Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] z-0"></div>

            <div className="max-w-xl w-full bg-[#1e293b]/50 backdrop-blur-xl border border-slate-700/50 rounded-[32px] overflow-hidden shadow-2xl relative z-10">
                {/* Mock Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-700/30">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[#fbbf24] rounded-lg flex items-center justify-center">
                            <Target className="text-[#0f172a] w-4 h-4" />
                        </div>
                        <span className="font-bold tracking-tight text-slate-200">KeFu</span>
                    </div>
                    <MoreHorizontal className="text-slate-500" />
                </div>

                <div className="p-6 text-center flex flex-col items-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold mb-4 uppercase tracking-widest">
                        <Zap size={12} className="fill-yellow-500" />
                        Founding Partner Access
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black mb-4 leading-tight">
                        歡迎加入 <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-indigo-400">KeFu 創始夥伴計畫</span>
                    </h1>

                    <p className="text-slate-400 text-sm md:text-base mb-3 leading-relaxed">
                        你將帶著 KeFu 上線第一位虛擬員工，<br />
                        並一起把團隊擴編完成。
                    </p>

                    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 mb-3 italic max-w-sm">
                        <p className="text-yellow-500/90 text-xs leading-relaxed">
                            「系統會跟著你的聊天紀錄與回饋每週迭代，<br />
                            讓流程越來越省力。」
                        </p>
                    </div>

                    <div className="text-indigo-400 font-bold mb-3 text-[12px] tracking-wide uppercase">
                        5 分鐘完成：讓第一位虛擬員工上工
                    </div>

                    {/* Steps */}
                    <div className="space-y-3 mb-8 text-left w-full">
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 transition-all hover:bg-slate-800/50 group">
                            <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors shrink-0">
                                <Fingerprint className="text-indigo-400 w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-200 text-sm">建立識別</h3>
                                <p className="text-slate-500 text-xs">定義品牌語氣，注入 AI 靈魂。</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 transition-all hover:bg-slate-800/50 group">
                            <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors shrink-0">
                                <Cpu className="text-purple-400 w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-200 text-sm">匯入知識</h3>
                                <p className="text-slate-500 text-xs">建立 FAQ，讓 AI 學會回答。</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 transition-all hover:bg-slate-800/50 group">
                            <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-pink-500/20 transition-colors shrink-0">
                                <ShieldCheck className="text-pink-400 w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-200 text-sm">設定規則</h3>
                                <p className="text-slate-500 text-xs">決定何時該轉接真人。</p>
                            </div>
                        </div>
                    </div>

                    {/* Launch Button */}
                    <button
                        onClick={onLaunch}
                        disabled={isVerifying}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-base shadow-xl shadow-indigo-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isVerifying ? (
                            <Loader2 className="animate-spin w-5 h-5" />
                        ) : (
                            <Power className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        )}
                        <span>讓第一位虛擬員工上工</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FoundingPartnerLanding;
