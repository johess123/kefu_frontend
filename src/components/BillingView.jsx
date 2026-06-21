import React, { useState, useEffect } from 'react';
import { Zap, Target, Sparkles, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import config from '../config';
import { fetchPricing } from '../utils/pricing';
import { useSearchParams, useParams } from 'react-router-dom';

// 各套餐的展示樣式（價格與點數一律以後端 /api/pricing 為準）
const PLAN_STYLES = {
    starter: {
        subtitle: '主打：一杯咖啡錢，試水溫',
        badge: '超值單體驗',
        themeColor: 'from-blue-500 to-indigo-600',
        shadowColor: 'shadow-blue-200',
        extraFeatures: ['無期限使用', '全功能開放', 'Line / Telegram 部署支援'],
    },
    business: {
        subtitle: '週末無憂，代班必備',
        badge: '人氣首選',
        featured: true,
        themeColor: 'from-brand-500 to-purple-600',
        shadowColor: 'shadow-brand-200',
        extraFeatures: ['每百點單價更低（約 9 折）', '無期限使用，彈性十足', '熱門方案，CP 值最高'],
    },
    enterprise: {
        subtitle: '最長期的夥伴，最省的回饋',
        badge: '點數最多',
        themeColor: 'from-amber-400 to-orange-500',
        shadowColor: 'shadow-amber-200',
        extraFeatures: ['每百點單價最低（約 83 折）', '常態營運最划算選擇', '大用量商家首選'],
    },
};

const buildPlan = (pkg) => {
    const style = PLAN_STYLES[pkg.id] || {};
    return {
        id: pkg.id,
        title: pkg.title,
        price: pkg.price,
        points: pkg.coins.toLocaleString(),
        rawPoints: pkg.coins,
        subtitle: style.subtitle || '',
        badge: style.badge || '方案',
        featured: !!style.featured,
        themeColor: style.themeColor || 'from-slate-400 to-slate-600',
        shadowColor: style.shadowColor || 'shadow-slate-200',
        features: [`${pkg.coins.toLocaleString()} 點 AI 額度`, ...(style.extraFeatures || [])],
    };
};

const BillingView = () => {
    const { userId, refreshUserBalance } = useAuth();
    const { agentId } = useParams();
    const [searchParams] = useSearchParams();
    const [loadingPlan, setLoadingPlan] = useState(null);
    const [message, setMessage] = useState(null);
    const [plans, setPlans] = useState([]);

    useEffect(() => {
        fetchPricing().then((pricing) => {
            setPlans((pricing.packages || []).map(buildPlan));
        });
    }, []);

    useEffect(() => {
        const result = searchParams.get('result');
        if (result === 'success') {
            setMessage({ type: 'success', text: '付款成功！點數已存入您的帳戶。' });
            refreshUserBalance();
        } else if (result === 'error') {
            setMessage({ type: 'error', text: '付款失敗或已取消，請稍後再試。' });
        }
    }, [searchParams]);

    const handleBuyPlan = async (plan) => {
        if (!userId) {
            alert('請先登入後再進行購買');
            return;
        }

        setLoadingPlan(plan.id);
        try {
            const response = await axios.post(`${config.API_URL}/api/create-payment`, {
                amount: plan.price,
                itemName: plan.title,
                userId: userId,
                agentId: agentId
            });

            const { actionUrl, MerchantID, Version, TradeInfo, TradeSha } = response.data;

            // 建立隱藏表單並提交至藍新金流
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = actionUrl;

            const fields = {
                MerchantID,
                Version,
                TradeInfo,
                TradeSha,
                RespondType: 'JSON'
            };

            for (const [key, value] of Object.entries(fields)) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            }

            document.body.appendChild(form);
            form.submit();

        } catch (error) {
            console.error('Failed to initiate payment:', error);
            alert('建立訂單失敗，請稍後再試。');
            setLoadingPlan(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {message && (
                <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">
                        <Zap size={16} />
                    </button>
                </div>
            )}

            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 text-brand-600 text-xs font-bold uppercase tracking-widest mb-4">
                    <Zap size={14} />
                    升級方案
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">升級您的 AI 團隊能力</h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                    選擇最適合您的營運包，讓 AI 成為您最強大的 24/7 數位助理。
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Background ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-500/5 blur-[120px] pointer-events-none rounded-full"></div>

                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`group relative flex flex-col h-full bg-white rounded-[40px] p-8 border ${plan.featured ? 'border-brand-500 border-2' : 'border-slate-100'} shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden`}
                    >
                        {/* Plan Header */}
                        <div className="mb-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${plan.featured ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-slate-50 text-slate-400'}`}>
                                    {plan.badge}
                                </div>
                                {plan.featured && <Sparkles className="text-brand-500 animate-pulse" size={24} />}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 truncate group-hover:text-brand-600 transition-colors">
                                {plan.title}
                            </h3>
                            <p className="text-slate-400 text-sm font-medium">{plan.subtitle}</p>
                        </div>

                        {/* Price Section */}
                        <div className="mb-10 p-8 rounded-3xl bg-slate-50 group-hover:bg-brand-50/30 transition-colors relative overflow-hidden">
                            <div className="relative z-10 flex items-baseline gap-1">
                                <span className="text-slate-500 text-lg font-bold">NT$</span>
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                    {plan.price}
                                </span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${plan.themeColor}`}></div>
                                <span className="text-sm font-bold text-slate-700">
                                    獲得 <span className="text-lg text-slate-900">{plan.points}</span> 點數
                                </span>
                            </div>
                            {plan.bonus && (
                                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100/80 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    含贈送 {plan.bonus} 點
                                </div>
                            )}
                        </div>

                        {/* Features */}
                        <div className="space-y-4 mb-10 flex-1">
                            {plan.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-slate-600 group-hover:text-slate-900 transition-colors">
                                    <div className={`p-1 rounded-full ${plan.featured ? 'bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-400'}`}>
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <span className="text-sm font-medium leading-relaxed">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* Action Button */}
                        <button
                            disabled={loadingPlan !== null}
                            onClick={() => handleBuyPlan(plan)}
                            className={`w-full py-4.5 rounded-[22px] font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${plan.featured
                                ? `bg-gradient-to-br ${plan.themeColor} text-white shadow-lg ${plan.shadowColor}`
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-100'
                                } ${loadingPlan !== null ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {loadingPlan === plan.id ? <Loader2 className="animate-spin" size={20} /> : '立即購買'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-20 p-10 bg-white/50 border border-slate-100 rounded-[42px] flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-brand-50 rounded-[22px] flex items-center justify-center text-brand-600 shrink-0">
                        <Target size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-slate-900 mb-1">需要客製化方案？</h4>
                        <p className="text-slate-500 text-sm">若您是高用量企業或有特殊串接需求，歡迎聯繫顧問諮詢。</p>
                    </div>
                </div>
                <button className="px-8 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-bold hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                    預約諮詢
                </button>
            </div>
        </div>
    );
};

export default BillingView;
