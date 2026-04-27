import React, { useState, useRef } from 'react';
import { Bot, ArrowLeft, ArrowRight, Trash2, Plus, CheckCircle2, Globe, Sparkles, Loader2, AlertCircle, Stethoscope, RotateCcw, Upload, Package, FileSpreadsheet, X } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';
import { ToneType, DEFAULT_HANDOFF_OPTIONS } from '../types';

const StepWizard = ({ formData, setFormData, agentId, onComplete }) => {
    const [qIndex, setQIndex] = useState(0);
    const [isGeneratingFaqs, setIsGeneratingFaqs] = useState(false);
    const [urlError, setUrlError] = useState('');
    const [optimizingFaqIds, setOptimizingFaqIds] = useState(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState(null);
    const [uploadingFaqId, setUploadingFaqId] = useState(null);
    const [isParsingProducts, setIsParsingProducts] = useState(false);
    const [productFileName, setProductFileName] = useState('');
    const productFileRef = useRef(null);

    const totalQuestions = 5;

    const handleNext = () => {
        if (qIndex === 2) {
            // 過濾掉全空的 FAQ 組
            const cleanedFaqs = formData.faqs.filter(f => f.question.trim() !== '' || f.answer.trim() !== '');

            if (cleanedFaqs.length === 0) {
                alert('請至少新增一組 FAQ 並填寫內容');
                return;
            }

            if (cleanedFaqs.length > 20) {
                alert('FAQ 組數上限為 20 組');
                return;
            }

            // 檢查是否有半殘的 FAQ (只有 Q 或只有 A) 以及字數限制
            const hasIncomplete = cleanedFaqs.some(f => !f.question.trim() || !f.answer.trim());
            if (hasIncomplete) {
                alert('請填寫所有 FAQ 的問題與回答，或是刪除未填寫完整的組別');
                return;
            }

            const tooLong = cleanedFaqs.some(f => f.question.length > 50 || f.answer.length > 200);
            if (tooLong) {
                alert('部分內容超過字數限制 (問題 50 字，回答 200 字)');
                return;
            }

            setFormData(prev => ({ ...prev, faqs: cleanedFaqs }));
        }

        if (qIndex === 3) {
            // 過濾掉沒有名稱的空商品
            const cleanedProducts = (formData.products || []).filter(p => p.name.trim());
            setFormData(prev => ({ ...prev, products: cleanedProducts }));
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
            <div className="relative">
                <textarea
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[120px]"
                    placeholder="例如：手機維修｜甜點工作室｜健身教練｜塔羅占卜｜餐酒館…"
                    value={formData.brandDescription}
                    maxLength={200}
                    onChange={(e) => updateField('brandDescription', e.target.value)}
                />
                <div className="text-[10px] text-slate-300 text-right pr-2">{formData.brandDescription.length}/200</div>
            </div>
            <div className="mt-4">
                <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                    <Globe size={16} />
                    網站連結（選填）
                </label>
                <div className="relative">
                    <input
                        type="url"
                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-500 transition-all ${urlError ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                        placeholder="https://your-website.com"
                        value={formData.websiteUrl || ''}
                        maxLength={100}
                        onChange={(e) => {
                            const val = e.target.value;
                            updateField('websiteUrl', val);
                            validateUrl(val);
                        }}
                    />
                    <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{(formData.websiteUrl || '').length}/100</div>
                </div>
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
                <div className="relative">
                    <input
                        type="text"
                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500"
                        placeholder="例如：不要太油條、不要用簡體中文..."
                        value={formData.toneAvoid}
                        maxLength={50}
                        onChange={(e) => updateField('toneAvoid', e.target.value)}
                    />
                    <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{(formData.toneAvoid || '').length}/50</div>
                </div>
            </div>
        </div>
    );

    const renderQ3 = () => {
        const addFAQ = () => {
            if (formData.faqs.length >= 20) {
                alert('最多只能新增 20 組 FAQ');
                return;
            }
            const newFAQ = { id: Date.now().toString(), question: '', answer: '', image_id: '' };
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
                const line_user_id = Cookies.get('google_user_id');
                const response = await axios.post(`${config.API_URL}/api/generate_faqs`, {
                    brandDescription: formData.brandDescription,
                    websiteUrl: formData.websiteUrl || '',
                    line_user_id: line_user_id,
                    agent_id: agentId
                });

                if (response.data && response.data.faqs) {
                    const newFaqs = response.data.faqs.map(f => ({
                        id: Math.random().toString(36).substr(2, 9),
                        question: f.q,
                        answer: f.a,
                        image_id: ''
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
            if (!faq.question.trim() || !faq.answer.trim()) {
                alert('請先輸入完整的問題與回答內容才能進行優化');
                return;
            }
            if (faq.question.length > 50 || faq.answer.length > 200) {
                alert('內容超過字數限制 (問題 50 字，回答 200 字)');
                return;
            }

            setOptimizingFaqIds(prev => new Set(prev).add(faqId));
            try {
                const line_user_id = Cookies.get('google_user_id');
                const response = await axios.post(`${config.API_URL}/api/optimize_faq`, {
                    question: faq.question,
                    answer: faq.answer,
                    line_user_id: line_user_id,
                    agent_id: agentId
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

        const handleAnalyzeFaqs = async () => {
            if (formData.faqs.length === 0) {
                alert('請先新增問答組');
                return;
            }

            if (formData.faqs.length > 20) {
                alert('FAQ 組數上限為 20 組');
                return;
            }

            const hasIncomplete = formData.faqs.some(f => !f.question.trim() || !f.answer.trim());
            if (hasIncomplete) {
                alert('請填寫所有 FAQ 的問題與回答，再進行健檢');
                return;
            }

            const tooLong = formData.faqs.some(f => f.question.length > 50 || f.answer.length > 200);
            if (tooLong) {
                alert('部分內容超過字數限制 (問題 50 字，回答 200 字)');
                return;
            }

            if (!formData.brandDescription.trim()) {
                alert('請先填寫品牌描述');
                setQIndex(0);
                return;
            }

            setIsAnalyzing(true);
            try {
                const line_user_id = Cookies.get('google_user_id');
                const response = await axios.post(`${config.API_URL}/api/analyze_faqs`, {
                    brandDescription: formData.brandDescription,
                    faqs: formData.faqs,
                    line_user_id: line_user_id,
                    agent_id: agentId
                });

                if (response.data && !response.data.error) {
                    setAnalysisReport(response.data);
                } else {
                    alert('健檢失敗：' + (response.data.error || '未知錯誤'));
                }
            } catch (error) {
                console.error('Failed to analyze FAQs:', error);
                alert('健檢過程中發生錯誤');
            } finally {
                setIsAnalyzing(false);
            }
        };

        const applySuggestion = (faqId, optimizedQ, optimizedA) => {
            updateField('faqs', formData.faqs.map(f =>
                f.id === faqId ? { ...f, question: optimizedQ, answer: optimizedA } : f
            ));
            // Remove suggestion from report after applying
            if (analysisReport) {
                setAnalysisReport(prev => ({
                    ...prev,
                    suggestions: prev.suggestions.filter(s => s.id !== faqId)
                }));
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

                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-6 custom-scrollbar pt-4">
                    {formData.faqs.map((faq, index) => (
                        <div key={faq.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm relative group pt-6">
                            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-black text-slate-400 uppercase tracking-wider shadow-sm z-10">
                                FAQ {index + 1}
                            </div>
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
                                        maxLength={50}
                                        onChange={(e) => updateFAQ(faq.id, 'question', e.target.value)}
                                    />
                                    <div className="text-[10px] text-slate-300 ml-2">{faq.question.length}/50</div>
                                </div>

                                {analysisReport && analysisReport.suggestions.find(s => s.id === faq.id) && (
                                    <div className="ml-6 p-3 bg-amber-50 border border-amber-100 rounded-xl relative">
                                        <div className="flex items-start gap-2 mb-2">
                                            <AlertCircle size={14} className="text-amber-500 mt-0.5" />
                                            <p className="text-xs text-amber-700 font-medium">
                                                建議優化：{analysisReport.suggestions.find(s => s.id === faq.id).suggestion}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                className="flex-1 p-2 bg-white border border-amber-200 rounded text-xs text-amber-800"
                                                value={analysisReport.suggestions.find(s => s.id === faq.id).optimized_q}
                                            />
                                            <button
                                                onClick={() => {
                                                    const s = analysisReport.suggestions.find(s => s.id === faq.id);
                                                    applySuggestion(faq.id, s.optimized_q, s.optimized_a);
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-50 transition-all shadow-sm whitespace-nowrap"
                                            >
                                                <RotateCcw size={12} />
                                                <span>取代</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-2">
                                    <span className="text-xs font-black text-slate-300 uppercase mt-2">A</span>
                                    <textarea
                                        placeholder="例如：單色 899 起..."
                                        className="w-full p-2 bg-slate-50 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-300 resize-none"
                                        rows={2}
                                        value={faq.answer}
                                        maxLength={200}
                                        onChange={(e) => updateFAQ(faq.id, 'answer', e.target.value)}
                                    />
                                </div>
                                <div className="text-[10px] text-slate-300 text-right pr-2">{faq.answer.length}/200</div>

                                {/* FAQ 附加圖片 */}
                                <div className="flex items-start gap-2 mt-1">
                                    <span className="text-xs font-black text-slate-300 uppercase mt-2">IMG</span>
                                    {faq.image_id ? (
                                        <div className="flex items-center gap-2">
                                            <img src={faq._preview_url} alt="附圖" className="w-14 h-14 object-cover rounded-lg border border-slate-200" onError={(e) => { e.target.style.display = 'none'; }} />
                                            <button
                                                onClick={() => updateFAQ(faq.id, 'image_id', '')}
                                                className="text-xs text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-brand-300 transition-all">
                                            {uploadingFaqId === faq.id ? (
                                                <Loader2 size={14} className="animate-spin text-brand-500" />
                                            ) : (
                                                <Upload size={14} className="text-slate-400" />
                                            )}
                                            <span className="text-[11px] text-slate-400">{uploadingFaqId === faq.id ? '上傳中...' : '上傳附圖'}</span>
                                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingFaqId === faq.id} onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                if (file.size > 2 * 1024 * 1024) { alert('圖片不可超過 2MB'); return; }
                                                setUploadingFaqId(faq.id);
                                                try {
                                                    const fd = new FormData();
                                                    fd.append('file', file);
                                                    const res = await axios.post(`${config.API_URL}/api/admin/upload_image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                    updateFAQ(faq.id, 'image_id', res.data.image_id);
                                                    updateField('faqs', formData.faqs.map(f => f.id === faq.id ? { ...f, image_id: res.data.image_id, _preview_url: res.data.preview_url } : f));
                                                } catch { alert('圖片上傳失敗'); }
                                                finally { setUploadingFaqId(null); }
                                            }} />
                                        </label>
                                    )}
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

                <div className="flex gap-3">
                    <button
                        onClick={addFAQ}
                        className="flex-1 py-3 flex items-center justify-center space-x-2 border-2 border-dashed border-brand-300 text-brand-600 rounded-xl hover:bg-brand-50 hover:border-brand-500 transition-colors"
                    >
                        <Plus size={18} />
                        <span>手動新增一組</span>
                    </button>
                    <button
                        onClick={handleAnalyzeFaqs}
                        disabled={isAnalyzing || formData.faqs.length === 0}
                        className="px-6 py-3 flex items-center justify-center space-x-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        {isAnalyzing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Stethoscope size={18} />
                        )}
                        <span>AI 智能健檢</span>
                    </button>
                </div>

                {analysisReport && (
                    <div className="mt-4 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl relative">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                            <h4 className="font-bold text-emerald-900">
                                AI 健檢報告 (得分: {analysisReport.score})
                            </h4>
                        </div>
                        <p className="text-sm text-emerald-800 leading-relaxed mb-3">
                            {analysisReport.report}
                        </p>
                        <p className="text-xs text-emerald-600 italic">
                            * 請查看上方卡片中的具體優化建議，點擊「取代」即可快速修正。
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderQ4 = () => {
        const addProduct = () => {
            if ((formData.products || []).length >= 50) {
                alert('最多只能新增 50 項商品');
                return;
            }
            const newProduct = { id: Date.now().toString(), name: '', description: '', keywords: '' };
            updateField('products', [...(formData.products || []), newProduct]);
        };

        const removeProduct = (id) => {
            updateField('products', (formData.products || []).filter(p => p.id !== id));
        };

        const updateProduct = (id, field, value) => {
            updateField('products', (formData.products || []).map(p => p.id === id ? { ...p, [field]: value } : p));
        };

        const handleParseProducts = async (file) => {
            if (!file) return;
            if (file.size > 512 * 1024) {
                alert('檔案大小不得超過 500KB');
                return;
            }
            const ext = file.name.toLowerCase().split('.').pop();
            if (!['xlsx', 'csv', 'json'].includes(ext)) {
                alert('僅支援 .xlsx、.csv 或 .json 格式');
                return;
            }

            setIsParsingProducts(true);
            setProductFileName(file.name);
            try {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('brandDescription', formData.brandDescription || '');
                fd.append('line_user_id', Cookies.get('google_user_id') || '');
                const res = await axios.post(`${config.API_URL}/api/parse_products`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data.error) {
                    alert('解析失敗：' + res.data.error);
                } else if (res.data.products) {
                    const newProducts = res.data.products.map(p => ({
                        id: Math.random().toString(36).substr(2, 9),
                        name: p.name,
                        description: p.description,
                        keywords: p.keywords || '',
                    }));
                    updateField('products', [...(formData.products || []), ...newProducts]);
                }
            } catch (err) {
                console.error('Failed to parse products:', err);
                alert('解析失敗，請檢查檔案格式或稍後再試');
            } finally {
                setIsParsingProducts(false);
                if (productFileRef.current) productFileRef.current.value = '';
            }
        };

        const products = formData.products || [];

        return (
            <div className="space-y-4">
                {/* 上傳區 */}
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <FileSpreadsheet size={20} className="text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-green-900 mb-1">上傳你的商品資料</h4>
                            <p className="text-xs text-green-600 mb-3">支援 Excel (.xlsx)、CSV 或 JSON 檔案，AI 會自動幫你整理成結構化的商品目錄。</p>
                            <div className="flex items-center gap-3">
                                <label className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-md shadow-green-100 cursor-pointer ${isParsingProducts ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isParsingProducts ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Upload size={14} />
                                    )}
                                    <span>{isParsingProducts ? 'AI 解析中...' : '上傳檔案'}</span>
                                    <input
                                        ref={productFileRef}
                                        type="file"
                                        accept=".xlsx,.csv,.json"
                                        className="hidden"
                                        disabled={isParsingProducts}
                                        onChange={(e) => handleParseProducts(e.target.files[0])}
                                    />
                                </label>
                                {productFileName && !isParsingProducts && (
                                    <span className="text-xs text-green-700 flex items-center gap-1">
                                        <CheckCircle2 size={12} />
                                        {productFileName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 商品列表 */}
                <div className="max-h-[350px] overflow-y-auto pr-2 space-y-4 custom-scrollbar pt-2">
                    {products.map((product, index) => (
                        <div key={product.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm relative group pt-6">
                            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-white border border-green-200 rounded-md text-[10px] font-black text-green-500 uppercase tracking-wider shadow-sm z-10">
                                P{index + 1}
                            </div>
                            <button
                                onClick={() => removeProduct(product.id)}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                            >
                                <Trash2 size={16} />
                            </button>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-green-400 uppercase w-8">名稱</span>
                                    <input
                                        type="text"
                                        placeholder="商品名稱"
                                        className="w-full p-2 border-b border-slate-200 focus:border-green-500 focus:outline-none text-sm font-medium"
                                        value={product.name}
                                        maxLength={50}
                                        onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                    />
                                    <div className="text-[10px] text-slate-300 ml-1 shrink-0">{product.name.length}/50</div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-xs font-black text-green-400 uppercase mt-2 w-8">說明</span>
                                    <textarea
                                        placeholder="規格、價格、特色..."
                                        className="w-full p-2 bg-slate-50 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-green-300 resize-none"
                                        rows={2}
                                        value={product.description}
                                        maxLength={400}
                                        onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                                    />
                                </div>
                                <div className="text-[10px] text-slate-300 text-right pr-2">{product.description.length}/400</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-green-400 uppercase w-8">別名</span>
                                    <input
                                        type="text"
                                        placeholder="關鍵字/別名（選填）"
                                        className="w-full p-2 border-b border-slate-200 focus:border-green-500 focus:outline-none text-sm"
                                        value={product.keywords || ''}
                                        maxLength={100}
                                        onChange={(e) => updateProduct(product.id, 'keywords', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {products.length === 0 && !isParsingProducts && (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">
                            <Package size={32} className="mx-auto mb-2 text-slate-300" />
                            尚未新增商品，上傳檔案或手動新增
                        </div>
                    )}
                </div>

                {products.length > 0 && (
                    <div className="text-xs text-slate-400 text-right">
                        共 {products.length} 項商品（上限 50）
                    </div>
                )}

                <button
                    onClick={addProduct}
                    className="w-full py-3 flex items-center justify-center space-x-2 border-2 border-dashed border-green-300 text-green-600 rounded-xl hover:bg-green-50 hover:border-green-500 transition-colors"
                >
                    <Plus size={18} />
                    <span>手動新增商品</span>
                </button>
            </div>
        );
    };

    const renderQ5 = () => {
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
                        <div className="relative">
                            <textarea
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                                placeholder="請描述其他轉人工情況..."
                                value={formData.handoffCustomTrigger === '其他' ? '' : formData.handoffCustomTrigger}
                                maxLength={50}
                                onChange={(e) => updateField('handoffCustomTrigger', e.target.value)}
                            />
                            <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{(formData.handoffCustomTrigger === '其他' ? '' : formData.handoffCustomTrigger).length}/50</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const questions = [
        { title: '品牌基礎', render: renderQ1, prompt: '第一題，請用一句話介紹你的品牌/店家：你提供什麼服務或商品？（必填）' },
        { title: '品牌口吻', render: renderQ2, prompt: '第二題，你希望 AI 用什麼口吻回覆客人？' },
        { title: '常見問題 FAQ', render: renderQ3, prompt: '第三題，請新增至少 3 組「常見問題」與「你的回答」（越多越準）。' },
        { title: '商品目錄', render: renderQ4, prompt: '第四題，上傳你的商品資料，AI 會自動整理成目錄來回覆客戶的商品問題。（可跳過）' },
        { title: '轉人工條件', render: renderQ5, prompt: '第五題，什麼情況你希望「轉真人客服」處理？（可複選）' },
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
