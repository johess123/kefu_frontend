import React, { useState } from 'react';
import { Bot, ArrowLeft, ArrowRight, Trash2, Plus, CheckCircle2, Globe, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';
import { ToneType, DEFAULT_HANDOFF_OPTIONS } from '../types';

const StepWizard = ({ formData, setFormData, onComplete }) => {
    const [qIndex, setQIndex] = useState(0);
    const [isGeneratingFaqs, setIsGeneratingFaqs] = useState(false);
    const [urlError, setUrlError] = useState('');
    const [optimizingFaqIds, setOptimizingFaqIds] = useState(new Set());

    const totalQuestions = 4;

    const handleNext = () => {
        if (qIndex === 2) {
            // 過濾掉 Q 跟 A 都是空的 FAQ 組
            const filteredFaqs = formData.faqs.filter(f => f.question.trim() !== '' || f.answer.trim() !== '');
            setFormData(prev => ({ ...prev, faqs: filteredFaqs }));
        }

        if (qIndex < totalQuestions - 1) {
            setQIndex(qIndex + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (qIndex > 0) {
            setQIndex(qIndex - 1);
        }
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateUrl = (url) => {
        if (!url) {
            setUrlError('');
            return true;
        }
        if (!url.startsWith('https://')) {
            setUrlError('網址必須以 https:// 開頭');
            return false;
        }
        setUrlError('');
        return true;
    };

    const renderQ1 = () => (
        <div className="space-y-4">
            <textarea
                className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[120px]"
                placeholder="例如：手機維修｜甜點工作室｜健身教練｜塔羅占卜｜餐酒館…"
                value={formData.brandDescription}
                onChange={(e) => updateField('brandDescription', e.target.value)}
            />
            <div className="mt-4">
                <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                    <Globe size={16} />
                    網站連結（選填）
                </label>
                <input
                    type="url"
                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-500 transition-all ${urlError ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                    placeholder="https://your-website.com"
                    value={formData.websiteUrl || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        updateField('websiteUrl', val);
                        validateUrl(val);
                    }}
                />
                {urlError ? (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {urlError}
                    </p>
                ) : (
                    <p className="mt-2 text-xs text-slate-400">
                        * 貼上你的官網或產品頁，未來我們會自動爬取內容來產生更精準的 FAQ。
                    </p>
                )}
            </div>
        </div>
    );

    const renderQ2 = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(ToneType).map((tone) => (
                    <label key={tone} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.tone === tone ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}`}>
                        <input
                            type="radio"
                            name="tone"
                            value={tone}
                            checked={formData.tone === tone}
                            onChange={() => updateField('tone', tone)}
                            className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                        />
                        <span className="ml-3 text-slate-700">{tone}</span>
                    </label>
                ))}
            </div>
            <div className="mt-4">
                <label className="block text-sm font-medium text-slate-600 mb-2">你希望避免的語氣/用詞？（選填）</label>
                <input
                    type="text"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500"
                    placeholder="例如：不要太油條、不要用簡體中文..."
                    value={formData.toneAvoid}
                    onChange={(e) => updateField('toneAvoid', e.target.value)}
                />
            </div>
        </div>
    );

    const renderQ3 = () => {
        const addFAQ = () => {
            const newFAQ = { id: Date.now().toString(), question: '', answer: '' };
            updateField('faqs', [...formData.faqs, newFAQ]);
        };

        const removeFAQ = (id) => {
            updateField('faqs', formData.faqs.filter(f => f.id !== id));
        };

        const updateFAQ = (id, field, value) => {
            updateField('faqs', formData.faqs.map(f => f.id === id ? { ...f, [field]: value } : f));
        };

        const handleGenerateFaqs = async () => {
            if (!formData.brandDescription.trim()) {
                alert('請先填寫第一題的品牌描述');
                setQIndex(0);
                return;
            }

            setIsGeneratingFaqs(true);
            try {
                const line_user_id = Cookies.get('line_user_id');
                const response = await axios.post(`${config.API_URL}/api/generate_faqs`, {
                    brandDescription: formData.brandDescription,
                    websiteUrl: formData.websiteUrl || '',
                    line_user_id: line_user_id
                });

                if (response.data && response.data.faqs) {
                    const newFaqs = response.data.faqs.map(f => ({
                        id: Math.random().toString(36).substr(2, 9),
                        question: f.q,
                        answer: f.a
                    }));
                    updateField('faqs', [...formData.faqs, ...newFaqs]);
                }
            } catch (error) {
                console.error('Failed to generate FAQs:', error);
                alert('自動產生失敗，請手動輸入或稍後再試。');
            } finally {
                setIsGeneratingFaqs(false);
            }
        };

        const handleOptimizeFaq = async (faqId) => {
            const faq = formData.faqs.find(f => f.id === faqId);
            if (!faq.question.trim() && !faq.answer.trim()) {
                alert('請先輸入問題或回答內容');
                return;
            }

            setOptimizingFaqIds(prev => new Set(prev).add(faqId));
            try {
                const line_user_id = Cookies.get('line_user_id');
                const response = await axios.post(`${config.API_URL}/api/optimize_faq`, {
                    question: faq.question,
                    answer: faq.answer,
                    line_user_id: line_user_id
                });

                if (response.data && !response.data.error) {
                    const updatedFaqs = formData.faqs.map(f =>
                        f.id === faqId ? { ...f, question: response.data.q, answer: response.data.a } : f
                    );
                    updateField('faqs', updatedFaqs);
                } else {
                    alert('優化失敗：' + (response.data.error || '未知錯誤'));
                }
            } catch (error) {
                console.error('Failed to optimize FAQ:', error);
                alert('優化過程中發生錯誤');
            } finally {
                setOptimizingFaqIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(faqId);
                    return newSet;
                });
            }
        };

        return (
            <div className="space-y-4">
                {/* AI suggestion block */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <Bot size={20} className="text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-indigo-900 mb-1">不知道客人會問什麼？</h4>
                            <p className="text-xs text-indigo-600 mb-3">沒關係，我們會幫你產生一組常見問題，你只要微調即可。</p>
                            <button
                                onClick={handleGenerateFaqs}
                                disabled={isGeneratingFaqs}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
                            >
                                {isGeneratingFaqs ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Sparkles size={14} />
                                )}
                                <span>一鍵產生常見問題</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                    {formData.faqs.map((faq) => (
                        <div key={faq.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm relative group">
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                <button
                                    onClick={() => handleOptimizeFaq(faq.id)}
                                    disabled={optimizingFaqIds.has(faq.id)}
                                    className="text-slate-400 hover:text-brand-600 p-1 disabled:opacity-50"
                                    title="AI 優化"
                                >
                                    {optimizingFaqIds.has(faq.id) ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={14} />
                                    )}
                                </button>
                                <button
                                    onClick={() => removeFAQ(faq.id)}
                                    className="text-slate-400 hover:text-red-500 p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-300 uppercase">Q</span>
                                    <input
                                        type="text"
                                        placeholder="例如：價格多少？怎麼預約？"
                                        className="w-full p-2 border-b border-slate-200 focus:border-brand-500 focus:outline-none text-sm font-medium"
                                        value={faq.question}
                                        onChange={(e) => updateFAQ(faq.id, 'question', e.target.value)}
                                    />
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-xs font-black text-slate-300 uppercase mt-2">A</span>
                                    <textarea
                                        placeholder="例如：單色 899 起..."
                                        className="w-full p-2 bg-slate-50 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-300 resize-none"
                                        rows={2}
                                        value={faq.answer}
                                        onChange={(e) => updateFAQ(faq.id, 'answer', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {formData.faqs.length === 0 && !isGeneratingFaqs && (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">
                            尚未新增 FAQ，點擊上方按鈕開始
                        </div>
                    )}
                </div>

                {formData.faqs.length < 3 && (
                    <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        💡 建議至少 3 組，Step 3 效果會更好
                    </div>
                )}

                <button
                    onClick={addFAQ}
                    className="w-full py-3 flex items-center justify-center space-x-2 border-2 border-dashed border-brand-300 text-brand-600 rounded-xl hover:bg-brand-50 hover:border-brand-500 transition-colors"
                >
                    <Plus size={18} />
                    <span>新增問答組</span>
                </button>
            </div>
        );
    };

    const renderQ4 = () => {
        const options = DEFAULT_HANDOFF_OPTIONS;

        const toggleTrigger = (trigger) => {
            const current = formData.handoffTriggers;
            if (current.includes(trigger)) {
                updateField('handoffTriggers', current.filter(t => t !== trigger));
            } else {
                updateField('handoffTriggers', [...current, trigger]);
            }
        };

        return (
            <div className="space-y-3">
                {options.map(opt => (
                    <label key={opt} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-gray-300"
                            checked={formData.handoffTriggers.includes(opt)}
                            onChange={() => toggleTrigger(opt)}
                        />
                        <span className="text-slate-700">{opt}</span>
                    </label>
                ))}
                <div className="mt-4 pt-2 border-t border-slate-100">
                    <label className="flex items-center space-x-3 mb-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!formData.handoffCustomTrigger}
                            onChange={() => updateField('handoffCustomTrigger', formData.handoffCustomTrigger ? '' : '其他')}
                            className="w-5 h-5 text-brand-600 rounded"
                        />
                        <span className="text-slate-700">其他</span>
                    </label>
                    {formData.handoffCustomTrigger !== '' && (
                        <textarea
                            className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                            placeholder="請描述其他轉人工情況..."
                            value={formData.handoffCustomTrigger === '其他' ? '' : formData.handoffCustomTrigger}
                            onChange={(e) => updateField('handoffCustomTrigger', e.target.value)}
                        />
                    )}
                </div>
            </div>
        );
    };

    const questions = [
        { title: '品牌基礎', render: renderQ1, prompt: '第一題，請用一句話介紹你的品牌/店家：你提供什麼服務或商品？（必填）' },
        { title: '品牌口吻', render: renderQ2, prompt: '第二題，你希望 AI 用什麼口吻回覆客人？' },
        { title: '常見問題 FAQ', render: renderQ3, prompt: '第三題，請新增至少 3 組「常見問題」與「你的回答」（越多越準）。' },
        { title: '轉人工條件', render: renderQ4, prompt: '第四題，什麼情況你希望「轉真人客服」處理？（可複選）' },
    ];

    const currentQ = questions[qIndex];

    return (
        <div className="max-w-2xl mx-auto w-full px-4 pb-20 pt-6">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Step 1－問卷建立</h2>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{qIndex + 1} / {totalQuestions}</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 w-full">
                    <div
                        className="h-full bg-brand-500 transition-all duration-300 ease-out"
                        style={{ width: `${((qIndex + 1) / totalQuestions) * 100}%` }}
                    />
                </div>

                <div className="p-6 md:p-8">
                    {/* AI Bubble */}
                    <div className="flex items-start gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-600">
                            <Bot size={24} />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 text-slate-700 leading-relaxed shadow-sm">
                            {currentQ.prompt}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="pl-0 md:pl-14">
                        {currentQ.render()}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                    <button
                        onClick={handlePrev}
                        disabled={qIndex === 0}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${qIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        <ArrowLeft size={18} />
                        <span>上一步</span>
                    </button>

                    <div className="flex items-center space-x-3">
                        {qIndex !== 0 && (
                            <button
                                onClick={handleNext}
                                className="text-slate-400 text-sm hover:text-slate-600 px-2"
                            >
                                跳過此題
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={(qIndex === 0 && !formData.brandDescription.trim()) || (qIndex === 0 && !!urlError)}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl transition-all transform active:scale-95 ${(qIndex === 0 && !formData.brandDescription.trim()) || (qIndex === 0 && !!urlError)
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-200'
                                }`}
                        >
                            <span>{qIndex === totalQuestions - 1 ? '完成' : '下一題'}</span>
                            {qIndex === totalQuestions - 1 ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepWizard;
