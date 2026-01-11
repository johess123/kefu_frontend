import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { Loader2, MessageSquare, UserCheck, ArrowRight, Plus, Trash2, Save, CheckCircle, ChevronRight, Edit3 } from 'lucide-react';

const StepReview = ({ onNext, onEdit, formData, setFormData, sessionId, reviewData, setReviewData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFaqIndex, setSelectedFaqIndex] = useState(0);
    const [isEditingFaq, setIsEditingFaq] = useState(false);
    const [editingFaq, setEditingFaq] = useState({ question: '', answer: '' });

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.API_URL}/api/generate_prompt`, formData);
            setReviewData(response.data);
            if (response.data.faqs && response.data.faqs.length > 0) {
                setSelectedFaqIndex(0);
                setEditingFaq(response.data.faqs[0]);
            }
        } catch (error) {
            console.error('Error generating data:', error);
            alert('生成失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!reviewData && !isLoading) {
            handleGenerate();
        }
    }, []);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            // In a real app, we might want to save the edited FAQs back to the server here
            // For now, we'll just proceed with the reviewData session
            await axios.post(`${config.API_URL}/api/confirm_setup`, {
                config_id: reviewData.config_id,
                session_id: sessionId,
                faqs: reviewData.faqs, // Pass potential edits
                handoff_triggers: reviewData.handoff_triggers,
                handoff_preview: reviewData.handoff_preview
            });
            // Update global formData with edits
            setFormData({
                ...formData,
                faqs: reviewData.faqs,
                handoffTriggers: reviewData.handoff_triggers,
            });
            onNext();
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
    };

    const handleAddFaq = () => {
        const newFaq = { id: Date.now().toString(), question: '', answer: '' };
        const newFaqs = [...reviewData.faqs, newFaq];
        setReviewData({ ...reviewData, faqs: newFaqs });
        setFormData(prev => ({ ...prev, faqs: newFaqs })); // Sync to global state
        setSelectedFaqIndex(newFaqs.length - 1);
        setEditingFaq(newFaq);
        setIsEditingFaq(true);
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
        const newFaqs = [...reviewData.faqs];
        newFaqs[selectedFaqIndex] = editingFaq;
        setReviewData({ ...reviewData, faqs: newFaqs });
        setFormData(prev => ({ ...prev, faqs: newFaqs })); // Sync to global state
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
                            onClick={handleAddFaq}
                            className="p-1.5 hover:bg-brand-100 text-brand-600 rounded-lg transition-colors border border-brand-200"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {reviewData.faqs.map((faq, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSelectFaq(idx)}
                                className={`w-full text-left p-3 rounded-xl transition-all group ${selectedFaqIndex === idx
                                    ? 'bg-brand-50 border-brand-200 border shadow-sm'
                                    : 'hover:bg-slate-50 border-transparent border'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className={`text-[10px] font-black mt-1 ${selectedFaqIndex === idx ? 'text-brand-600' : 'text-slate-400'}`}>
                                        {String(idx + 1).padStart(2, '0')}
                                    </span>
                                    <p className={`text-sm font-medium line-clamp-2 ${selectedFaqIndex === idx ? 'text-brand-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                        {faq.question}
                                    </p>
                                </div>
                            </button>
                        ))}
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
                                        onClick={() => setIsEditingFaq(false)}
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
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">使用者可能問的問題</label>
                            {isEditingFaq ? (
                                <textarea
                                    value={editingFaq.question}
                                    onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-bold min-h-[100px]"
                                />
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-bold text-lg leading-relaxed">
                                    {currentFaq?.question}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">AI 回答方式</label>
                            {isEditingFaq ? (
                                <textarea
                                    value={editingFaq.answer}
                                    onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-600 text-sm leading-relaxed min-h-[250px]"
                                />
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
