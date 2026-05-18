import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config';
import { Loader2, MessageSquare, UserCheck, ArrowRight, Plus, Trash2, Save, CheckCircle, ChevronRight, ChevronDown, Edit3, Package } from 'lucide-react';

import Cookies from 'js-cookie';

const StepReview = ({ onNext, onEdit, formData, setFormData, sessionId, agentId, reviewData, setReviewData, setAgentId }) => {
    const initializedRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFaqIndex, setSelectedFaqIndex] = useState(0);
    const [isEditingFaq, setIsEditingFaq] = useState(false);
    const [editingFaq, setEditingFaq] = useState({ question: '', answer: '' });
    const [isNewFaq, setIsNewFaq] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState(new Set());

    const toggleCategory = (cat) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
        });
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const line_user_id = Cookies.get('google_user_id');
            const response = await axios.post(`${config.API_URL}/api/generate_prompt`, {
                ...formData,
                line_user_id,
                agent_id: agentId
            });
            if (response.data && !response.data.error) {
                setReviewData(response.data);
                if (response.data.faqs && response.data.faqs.length > 0) {
                    setSelectedFaqIndex(0);
                    setEditingFaq(response.data.faqs[0]);
                }
            } else {
                alert('生成失敗：' + (response.data.error || '未知錯誤'));
                if (onEdit) onEdit();
            }
        } catch (error) {
            console.error('Error generating data:', error);
            alert('生成失敗，請稍後再試');
            if (onEdit) onEdit();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!reviewData && !isLoading && !initializedRef.current) {
            initializedRef.current = true;
            handleGenerate();
        }
    }, []);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            const line_user_id = Cookies.get('google_user_id');
            const res = await axios.post(`${config.API_URL}/api/confirm_setup`, {
                config_id: reviewData.config_id,
                session_id: sessionId,
                line_user_id: line_user_id,
                agent_id: agentId, // Pass agentId for update
                faqs: reviewData.faqs, // Pass potential edits
                products: formData.products || [], // Pass products from wizard Q4
                product_field_schema: formData.productFieldSchema || [],
                handoff_triggers: reviewData.handoff_triggers,
                handoff_preview: reviewData.handoff_preview
            });

            if (res.data.status === 'ok') {
                setAgentId(res.data.agent_id);
                // Update global formData with edits
                setFormData({
                    ...formData,
                    faqs: reviewData.faqs,
                    handoffTriggers: reviewData.handoff_triggers,
                });
                onNext();
            } else {
                alert(res.data.message || '設定失敗');
            }
        } catch (error) {
            console.error('Error confirming setup:', error);
            alert('設定失敗');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectFaq = (index) => {
        setSelectedFaqIndex(index);
        setEditingFaq(reviewData.faqs[index]);
        setIsEditingFaq(false);
        setIsNewFaq(false);
    };

    const handleAddFaq = (category = null) => {
        const defaultCat = category ||
            (reviewData.faqs.length > 0 ? (reviewData.faqs[reviewData.faqs.length - 1].category || '常見問題') : '常見問題');
        const newFaq = { id: Date.now().toString(), question: '', answer: '', category: defaultCat };
        const newFaqs = [...reviewData.faqs, newFaq];
        setReviewData({ ...reviewData, faqs: newFaqs });
        setFormData(prev => ({ ...prev, faqs: newFaqs }));
        setSelectedFaqIndex(newFaqs.length - 1);
        setEditingFaq(newFaq);
        setIsEditingFaq(true);
        setIsNewFaq(true);
    };

    const handleDeleteFaq = (index) => {
        if (reviewData.faqs.length <= 1) {
            alert('至少需要保留一組 FAQ');
            return;
        }
        const newFaqs = reviewData.faqs.filter((_, i) => i !== index);
        setReviewData({ ...reviewData, faqs: newFaqs });
        setFormData(prev => ({ ...prev, faqs: newFaqs })); // Sync to global state
        const nextIndex = Math.max(0, index - 1);
        setSelectedFaqIndex(nextIndex);
        setEditingFaq(newFaqs[nextIndex]);
    };

    const handleSaveFaq = () => {
        if (editingFaq.question.length > 100 || editingFaq.answer.length > 500) {
            alert('內容超過字數限制 (問題 100 字，回答 500 字)');
            return;
        }
        const newFaqs = [...reviewData.faqs];
        newFaqs[selectedFaqIndex] = editingFaq;
        setReviewData({ ...reviewData, faqs: newFaqs });
        setFormData(prev => ({ ...prev, faqs: newFaqs }));
        setIsEditingFaq(false);
        setIsNewFaq(false);
    };

    const handleCancelEdit = () => {
        if (isNewFaq) {
            const newFaqs = reviewData.faqs.filter((_, i) => i !== selectedFaqIndex);
            setReviewData({ ...reviewData, faqs: newFaqs });
            setFormData(prev => ({ ...prev, faqs: newFaqs }));
            const nextIndex = Math.max(0, selectedFaqIndex - 1);
            setSelectedFaqIndex(nextIndex);
            if (newFaqs.length > 0) setEditingFaq(newFaqs[nextIndex]);
            setIsNewFaq(false);
        }
        setIsEditingFaq(false);
    };

    if (isLoading || !reviewData) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px]">
                <Loader2 className="animate-spin text-brand-600 w-12 h-12 mb-4" />
                <span className="text-lg font-medium text-slate-600">正在處理中...</span>
            </div>
        );
    }

    const currentFaq = reviewData.faqs[selectedFaqIndex];

    return (
        <div className="max-w-[1400px] mx-auto w-full px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Step 2－整理 FAQ</h2>
                <p className="text-slate-600">請確認並編輯 AI 產生的 FAQ 與轉接規則</p>
            </div>

            <div className="grid grid-cols-12 gap-6 h-[600px]">
                {/* Left Column: FAQ List (Width 3/12) */}
                <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                            <MessageSquare size={16} className="text-brand-600" />
                            FAQ 列表
                        </h3>
                        <button
                            onClick={() => handleAddFaq()}
                            className="p-1.5 hover:bg-brand-100 text-brand-600 rounded-lg transition-colors border border-brand-200"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-3">
                        {(() => {
                            const grouped = {};
                            const catOrder = [];
                            reviewData.faqs.forEach((faq, idx) => {
                                const cat = faq.category || '常見問題';
                                if (!grouped[cat]) { grouped[cat] = []; catOrder.push(cat); }
                                grouped[cat].push({ faq, idx });
                            });
                            return catOrder.map(cat => {
                                const isCollapsed = collapsedCategories.has(cat);
                                return (
                                    <div key={cat}>
                                        <div
                                            className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors select-none"
                                            onClick={() => toggleCategory(cat)}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {isCollapsed
                                                    ? <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
                                                    : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
                                                }
                                                <span className="text-sm font-bold text-slate-700 truncate">{cat}</span>
                                                <span className="text-[10px] text-slate-400 flex-shrink-0">({grouped[cat].length})</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAddFaq(cat); }}
                                                className="p-0.5 hover:text-brand-600 text-slate-400 rounded transition-colors flex-shrink-0"
                                                title={`在「${cat}」新增 FAQ`}
                                            >
                                                <Plus size={13} />
                                            </button>
                                        </div>
                                        {!isCollapsed && (
                                            <div className="space-y-1 mt-1">
                                                {grouped[cat].map(({ faq, idx }) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSelectFaq(idx)}
                                                        className={`w-full text-left p-3 rounded-xl transition-all group ${selectedFaqIndex === idx
                                                            ? 'bg-brand-50 border-brand-200 border shadow-sm'
                                                            : 'hover:bg-slate-50 border-transparent border'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <span className={`text-[10px] font-black mt-1 flex-shrink-0 ${selectedFaqIndex === idx ? 'text-brand-600' : 'text-slate-400'}`}>
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <p className={`text-sm font-medium line-clamp-2 ${selectedFaqIndex === idx ? 'text-brand-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                                                {faq.question || <span className="text-slate-300 italic font-normal">未填寫...</span>}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Middle Column: FAQ Editor (Width 5/12) */}
                <div className="col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                            <Edit3 size={16} className="text-brand-600" />
                            編輯 FAQ 內容
                        </h3>
                        <div className="flex gap-2">
                            {isEditingFaq ? (
                                <>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleSaveFaq}
                                        className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-1"
                                    >
                                        <Save size={14} /> 儲存變更
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleDeleteFaq(selectedFaqIndex)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setIsEditingFaq(true)}
                                        className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
                                    >
                                        <Edit3 size={14} /> 編輯
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">所屬分類</label>
                            {isEditingFaq ? (
                                <>
                                    <input
                                        value={editingFaq.category ?? ''}
                                        onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 text-sm"
                                        placeholder="輸入分類名稱"
                                    />
                                    {[...new Set(reviewData.faqs.map(f => f.category || '常見問題'))].length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {[...new Set(reviewData.faqs.map(f => f.category || '常見問題'))].map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setEditingFaq({ ...editingFaq, category: cat })}
                                                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${(editingFaq.category ?? '') === cat ? 'bg-brand-100 border-brand-300 text-brand-700 font-bold' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600'}`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="inline-block px-3 py-1 bg-brand-50 text-brand-600 text-xs font-bold rounded-full border border-brand-100">
                                    {currentFaq?.category || '常見問題'}
                                </span>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">使用者可能問的問題</label>
                            {isEditingFaq ? (
                                <div className="relative">
                                    <textarea
                                        value={editingFaq.question}
                                        maxLength={100}
                                        onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-bold min-h-[100px]"
                                    />
                                    <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{editingFaq.question.length}/100</div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-bold text-lg leading-relaxed">
                                    {currentFaq?.question}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">AI 回答方式</label>
                            {isEditingFaq ? (
                                <div className="relative">
                                    <textarea
                                        value={editingFaq.answer}
                                        maxLength={500}
                                        onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-600 text-sm leading-relaxed min-h-[250px]"
                                    />
                                    <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{editingFaq.answer.length}/500</div>
                                </div>
                            ) : (
                                <div className="p-5 bg-brand-50/30 rounded-xl border border-brand-100 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                    {currentFaq?.answer}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Handoff Rules (Width 3/12) */}
                <div className="col-span-3 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                                <UserCheck size={16} className="text-red-500" />
                                轉人工客服規則
                            </h3>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block tracking-widest">當使用者提到...</label>
                                <div className="flex flex-wrap gap-2">
                                    {reviewData.handoff_triggers.map((t, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-red-50 text-red-600 text-[11px] font-bold rounded-full border border-red-100">
                                            {t}
                                        </span>
                                    ))}
                                    {reviewData.handoff_triggers.length === 0 && (
                                        <span className="text-xs text-slate-400 italic">無設定觸發條件</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block tracking-widest">AI 如何回應</label>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                                    <p className="text-xs text-slate-600 leading-relaxed italic">
                                        "{reviewData.handoff_preview}"
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                <p className="text-[11px] text-yellow-700 leading-relaxed">
                                    <strong>提示：</strong> 這些規則將被系統優先識別，一旦符合將直接引導至轉接程序。
                                </p>
                            </div>

                            {/* 商品摘要 */}
                            {(formData.products || []).length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block tracking-widest">商品目錄</label>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Package size={14} className="text-green-600" />
                                            <span className="text-xs font-bold text-green-700">已新增 {formData.products.length} 項商品</span>
                                        </div>
                                        <div className="space-y-1 max-h-[120px] overflow-y-auto">
                                            {formData.products.map((p, idx) => (
                                                <div key={idx} className="text-[11px] text-green-700 truncate">
                                                    {idx + 1}. {p.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 flex justify-center items-center gap-4 z-50">
                <button
                    onClick={onEdit}
                    className="px-8 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                    回去修改
                </button>
                <button
                    onClick={handleConfirm}
                    className="flex items-center space-x-2 bg-brand-600 text-white px-10 py-3 rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 transition-transform active:scale-95 font-bold"
                >
                    <span>開始測試對話</span>
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default StepReview;
