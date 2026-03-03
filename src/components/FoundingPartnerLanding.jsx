import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Bot, Zap, ShieldCheck, Users, Sparkles } from 'lucide-react';

const FoundingPartnerLanding = ({ isVerifying, onGoogleSuccess }) => {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

                .kefu-landing * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }

                /* Aurora orbs */
                @keyframes orb-a {
                    0%,100% { transform: translate(0,0) scale(1);     opacity:.55; }
                    50%      { transform: translate(50px,-35px) scale(1.18); opacity:.75; }
                }
                @keyframes orb-b {
                    0%,100% { transform: translate(0,0) scale(1.1);   opacity:.45; }
                    50%      { transform: translate(-45px,55px) scale(.92); opacity:.65; }
                }
                @keyframes orb-c {
                    0%,100% { transform: translate(0,0) scale(.95);   opacity:.35; }
                    33%      { transform: translate(35px,25px) scale(1.1);  opacity:.55; }
                    66%      { transform: translate(-25px,-15px) scale(1.05);opacity:.45; }
                }

                /* Entrance animations */
                @keyframes fade-up {
                    from { opacity:0; transform:translateY(20px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes badge-float {
                    0%,100% { transform:translateY(0); }
                    50%      { transform:translateY(-5px); }
                }
                @keyframes card-glow-amber {
                    0%,100% { box-shadow: 0 0 30px rgba(245,158,11,.2), 0 0 80px rgba(245,158,11,.07); }
                    50%      { box-shadow: 0 0 45px rgba(245,158,11,.35), 0 0 120px rgba(245,158,11,.12); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position:  200% center; }
                }

                .au1 { animation: orb-a 13s ease-in-out infinite; }
                .au2 { animation: orb-b 17s ease-in-out infinite; }
                .au3 { animation: orb-c 11s ease-in-out infinite; }
                .au4 { animation: orb-a 20s ease-in-out infinite reverse; }

                .fade1 { animation: fade-up .65s ease .0s both; }
                .fade2 { animation: fade-up .65s ease .1s both; }
                .fade3 { animation: fade-up .65s ease .2s both; }
                .fade4 { animation: fade-up .65s ease .3s both; }
                .fade5 { animation: fade-up .65s ease .4s both; }

                .badge-anim { animation: badge-float 3.2s ease-in-out infinite; }
                .card-glow  { animation: card-glow-amber 3.5s ease-in-out infinite; }

                .gradient-text {
                    background: linear-gradient(90deg, #FCD34D, #FB923C, #F43F5E);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: shimmer 4s linear infinite;
                }

                .chip { transition: background .2s, transform .2s; }
                .chip:hover {
                    background: rgba(245,158,11,.08) !important;
                    transform: translateX(5px);
                }

                /* Make Google button fill its container */
                .g-wrap iframe { width: 100% !important; }
            `}</style>

            <div className="kefu-landing min-h-screen text-white flex flex-col lg:flex-row relative overflow-hidden"
                style={{ background: '#0A0805' }}>

                {/* ── Aurora background ── */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {/* Amber orb — top-left */}
                    <div className="au1 absolute" style={{
                        top: '5%', left: '8%', width: 480, height: 480,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(245,158,11,.5) 0%, transparent 70%)',
                        filter: 'blur(65px)',
                    }}/>
                    {/* Orange orb — mid-left */}
                    <div className="au2 absolute" style={{
                        top: '45%', left: '3%', width: 360, height: 360,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(251,146,60,.4) 0%, transparent 70%)',
                        filter: 'blur(70px)',
                    }}/>
                    {/* Rose orb — bottom-right */}
                    <div className="au3 absolute" style={{
                        top: '58%', right: '15%', width: 320, height: 320,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(244,63,94,.3) 0%, transparent 70%)',
                        filter: 'blur(60px)',
                    }}/>
                    {/* Golden orb — bottom-left */}
                    <div className="au4 absolute" style={{
                        bottom: '8%', right: '38%', width: 280, height: 280,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(252,211,77,.25) 0%, transparent 70%)',
                        filter: 'blur(55px)',
                    }}/>
                    {/* Dot grid */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                    }}/>
                    {/* Top vignette */}
                    <div className="absolute inset-x-0 top-0 h-40"
                        style={{ background: 'linear-gradient(to bottom, #0A0805, transparent)' }}/>
                </div>

                {/* ══════════════════════════════
                    LEFT — Brand & marketing
                ══════════════════════════════ */}
                <div className="relative z-10 flex-1 flex flex-col justify-center
                                px-8 py-16 lg:px-16 lg:py-0 lg:max-w-[56%]">

                    {/* Logo */}
                    <div className="fade1 flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #FCD34D, #F59E0B)' }}>
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A0805">
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight">KeFu</span>
                        <span className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: 'rgba(245,158,11,.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,.3)' }}>
                            Beta
                        </span>
                    </div>

                    {/* Founding badge */}
                    <div className="fade2 badge-anim mb-5 w-fit">
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest"
                            style={{
                                background: 'linear-gradient(90deg,rgba(252,211,77,.12),rgba(251,146,60,.12))',
                                border: '1px solid rgba(252,211,77,.28)',
                                color: '#FCD34D',
                            }}>
                            <Sparkles size={11} className="fill-yellow-300" />
                            Founding Partner Access
                        </div>
                    </div>

                    {/* Hero headline */}
                    <h1 className="fade3 font-black leading-[1.1] mb-5"
                        style={{ fontSize: 'clamp(2.2rem, 4vw, 3.5rem)' }}>
                        讓 AI 客服，<br/>
                        <span className="gradient-text">成為你最強的業務員</span>
                    </h1>

                    <p className="fade4 mb-8 max-w-md leading-relaxed"
                        style={{ color: 'rgba(255,255,255,.5)', fontSize: '1rem' }}>
                        5 分鐘建立專屬 AI 客服，自動回覆、無縫轉接真人，<br/>
                        讓你的團隊專注在更重要的事。
                    </p>

                    {/* Feature list */}
                    <div className="fade5 space-y-3 mb-10">
                        {[
                            { icon: Bot,         color: '#F59E0B', bg: 'rgba(245,158,11,.12)', label: '建立識別', desc: '定義品牌語氣，注入 AI 靈魂' },
                            { icon: Zap,         color: '#FB923C', bg: 'rgba(251,146,60,.12)', label: '即時回覆', desc: '24/7 全天候自動回應' },
                            { icon: ShieldCheck, color: '#F43F5E', bg: 'rgba(244,63,94,.12)',  label: '智慧轉接', desc: '精確判斷，無縫切換真人服務' },
                        ].map(({ icon: Icon, color, bg, label, desc }) => (
                            <div key={label} className="chip flex items-center gap-4 px-4 py-3 rounded-xl cursor-default"
                                style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: bg }}>
                                    <Icon size={17} style={{ color }} />
                                </div>
                                <div>
                                    <span className="font-semibold text-sm text-white">{label}</span>
                                    <span className="text-sm ml-2" style={{ color: 'rgba(255,255,255,.4)' }}>{desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Social proof */}
                    <div className="fade5 flex items-center gap-6">
                        <div className="flex items-center gap-2.5">
                            <div className="flex -space-x-2">
                                {['#F59E0B','#FB923C','#F43F5E','#FCD34D'].map((c,i)=>(
                                    <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center"
                                        style={{ background:`${c}30`, border:`2px solid #0A0805` }}>
                                        <Users size={12} style={{ color: c }}/>
                                    </div>
                                ))}
                            </div>
                            <span className="text-sm" style={{ color:'rgba(255,255,255,.45)' }}>
                                <span className="text-white font-bold">20+</span> 商家已上線
                            </span>
                        </div>
                        <div className="h-4 w-px" style={{ background:'rgba(255,255,255,.1)' }}/>
                        <div className="text-sm" style={{ color:'rgba(255,255,255,.45)' }}>
                            <span className="text-white font-bold">98%</span> 客戶滿意度
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════
                    RIGHT — Login card
                ══════════════════════════════ */}
                <div className="relative z-10 flex items-center justify-center
                                px-8 py-12 lg:py-0 lg:px-16 lg:w-[44%]">

                    <div className="card-glow w-full max-w-[340px] rounded-3xl p-8"
                        style={{
                            background: 'rgba(255,255,255,.04)',
                            backdropFilter: 'blur(28px)',
                            WebkitBackdropFilter: 'blur(28px)',
                            border: '1px solid rgba(245,158,11,.18)',
                        }}>

                        {/* Card icon */}
                        <div className="text-center mb-7">
                            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg,rgba(245,158,11,.25),rgba(251,146,60,.25))',
                                    border: '1px solid rgba(245,158,11,.3)',
                                }}>
                                <Bot size={26} style={{ color: '#F59E0B' }}/>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">登入你的工作台</h2>
                            <p className="text-sm" style={{ color:'rgba(255,255,255,.4)' }}>
                                使用 Google 帳號安全登入
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex-1 h-px" style={{ background:'rgba(245,158,11,.15)' }}/>
                            <span className="text-xs" style={{ color:'rgba(255,255,255,.25)' }}>繼續使用</span>
                            <div className="flex-1 h-px" style={{ background:'rgba(245,158,11,.15)' }}/>
                        </div>

                        {/* Google login */}
                        <div className="g-wrap flex justify-center mb-5">
                            {isVerifying ? (
                                <div className="flex items-center gap-2 py-3">
                                    <svg className="animate-spin w-5 h-5" style={{ color:'#F59E0B' }}
                                        viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="4" strokeOpacity=".25"/>
                                        <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                    </svg>
                                    <span className="text-sm" style={{ color:'rgba(255,255,255,.4)' }}>驗證中...</span>
                                </div>
                            ) : (
                                <GoogleLogin
                                    onSuccess={onGoogleSuccess}
                                    onError={()=>console.error('Google Login Failed')}
                                    theme="filled_black"
                                    size="large"
                                    text="continue_with"
                                    shape="rectangular"
                                    width="280"
                                />
                            )}
                        </div>

                        {/* Mini trust badges */}
                        <div className="flex justify-center gap-5 mb-5">
                            {[
                                { icon: ShieldCheck, text: '安全加密' },
                                { icon: Zap,         text: '即時同步' },
                            ].map(({ icon: Icon, text }) => (
                                <div key={text} className="flex items-center gap-1.5">
                                    <Icon size={12} style={{ color:'rgba(245,158,11,.6)' }}/>
                                    <span className="text-xs" style={{ color:'rgba(255,255,255,.3)' }}>{text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <p className="text-center text-[11px] leading-relaxed"
                            style={{ color:'rgba(255,255,255,.2)' }}>
                            登入即代表你同意我們的服務條款及隱私政策
                        </p>
                    </div>
                </div>

            </div>
        </>
    );
};

export default FoundingPartnerLanding;
