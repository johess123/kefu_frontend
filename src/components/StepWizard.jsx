import React, { useState, useRef, useEffect } from 'react';
import { Bot, ArrowLeft, ArrowRight, Trash2, Plus, CheckCircle2, Globe, Sparkles, Loader2, AlertCircle, Stethoscope, RotateCcw, Upload, Package, FileSpreadsheet, X, ChevronDown, ChevronRight, GripVertical, FolderInput } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';
import { ToneType, TONE_PROMPTS, DEFAULT_HANDOFF_OPTIONS } from '../types';

const StepWizard = ({ formData, setFormData, agentId, onComplete }) => {
    const [qIndex, setQIndex] = useState(0);
    const [isGeneratingFaqs, setIsGeneratingFaqs] = useState(false);
    const [urlError, setUrlError] = useState('');
    const [optimizingFaqIds, setOptimizingFaqIds] = useState(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isOptimizingServices, setIsOptimizingServices] = useState(false);
    const [analysisReport, setAnalysisReport] = useState(null);
    const [uploadingFaqId, setUploadingFaqId] = useState(null);
    const [isParsingProducts, setIsParsingProducts] = useState(false);
    const [productFileName, setProductFileName] = useState('');
    const productFileRef = useRef(null);
    const [expandedCategories, setExpandedCategories] = useState(new Set(['常見問題']));
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [schemaInputVisible, setSchemaInputVisible] = useState(false);
    const [showWizardFaqImportModal, setShowWizardFaqImportModal] = useState(false);
    const [wizardFaqImportTab, setWizardFaqImportTab] = useState('file');
    const [wizardFaqImportText, setWizardFaqImportText] = useState('');
    const wizardFaqImportFileRef = useRef(null);
    const [isParsingWizardFaqs, setIsParsingWizardFaqs] = useState(false);
    const [parsedWizardFaqPreview, setParsedWizardFaqPreview] = useState(null);
    const [wizardCategoryOrder, setWizardCategoryOrder] = useState(['常見問題']);
    const [wizardDraggedCat, setWizardDraggedCat] = useState(null);
    const [wizardDragOverCat, setWizardDragOverCat] = useState(null);
    const [wizardExpandedFaqItems, setWizardExpandedFaqItems] = useState(new Set());
    const [wizardMoveFaqModal, setWizardMoveFaqModal] = useState({ open: false, faqId: null, faqQuestion: '', currentCat: '' });

    useEffect(() => {
        const allCats = [...new Set((formData.faqs || []).map(f => f.category || '常見問題'))];
        setWizardCategoryOrder(prev => {
            const kept = prev.filter(c => allCats.includes(c));
            const newCats = allCats.filter(c => !prev.includes(c));
            return kept.length === 0 && newCats.length === 0 ? ['常見問題'] : [...kept, ...newCats];
        });
    }, [formData.faqs]);

    const totalQuestions = 5;

    const handleNext = () => {
        if (qIndex === 2) {
            // 過濾掉全空的 FAQ 組
            const cleanedFaqs = formData.faqs.filter(f => f.question.trim() !== '' || f.answer.trim() !== '');

            if (cleanedFaqs.length === 0) {
                alert('請至少新增一組 FAQ 並填寫內容');
                return;
            }

            // 檢查是否有半殘的 FAQ (只有 Q 或只有 A) 以及字數限制
            const hasIncomplete = cleanedFaqs.some(f => !f.question.trim() || !f.answer.trim());
            if (hasIncomplete) {
                alert('請填寫所有 FAQ 的問題與回答，或是刪除未填寫完整的組別');
                return;
            }

            const tooLong = cleanedFaqs.some(f => f.question.length > 100 || f.answer.length > 500);
            if (tooLong) {
                alert('部分內容超過字數限制 (問題 100 字，回答 500 字)');
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

    const handleOptimizeServices = async () => {
        if (!formData.servicesDescription.trim()) return;
        setIsOptimizingServices(true);
        try {
            const line_user_id = Cookies.get('google_user_id');
            const response = await axios.post(`${config.API_URL}/api/optimize_services`, {
                businessName: formData.businessName,
                servicesDescription: formData.servicesDescription,
                line_user_id,
                agent_id: agentId
            });
            if (response.data && !response.data.error) {
                updateField('servicesDescription', response.data.services);
            } else {
                alert('優化失敗：' + (response.data.error || '未知錯誤'));
            }
        } catch (error) {
            console.error('Failed to optimize services:', error);
            alert('優化過程中發生錯誤');
        } finally {
            setIsOptimizingServices(false);
        }
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
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">商家名稱（必填，20 字以內）</label>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="例如：手機維修、甜點工作室、塔羅占卜…"
                        value={formData.businessName}
                        maxLength={20}
                        onChange={(e) => updateField('businessName', e.target.value)}
                    />
                    <div className="text-[10px] text-slate-300 text-right pr-2 mt-1">{formData.businessName.length}/20</div>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-600">服務內容（必填，200 字以內）</label>
                    <button
                        type="button"
                        onClick={handleOptimizeServices}
                        disabled={isOptimizingServices || !formData.servicesDescription.trim()}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isOptimizingServices ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        AI 優化
                    </button>
                </div>
                <div className="relative">
                    <textarea
                        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[100px]"
                        placeholder="例如：提供 iPhone / Android 手機螢幕、電池、主機板維修，備有現貨零件可當日取件…"
                        value={formData.servicesDescription}
                        maxLength={200}
                        onChange={(e) => updateField('servicesDescription', e.target.value)}
                    />
                    <div className="text-[10px] text-slate-300 text-right pr-2">{formData.servicesDescription.length}/200</div>
                </div>
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
            <div className="flex flex-wrap gap-2">
                {Object.values(ToneType).map((tone) => (
                    <button
                        key={tone}
                        type="button"
                        onClick={() => updateField('tone', tone)}
                        className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${formData.tone === tone ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-slate-50'}`}
                    >
                        {tone}
                    </button>
                ))}
            </div>
            {formData.tone === '自定義' ? (
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">自定義語氣指令</label>
                    <div className="relative">
                        <textarea
                            rows={3}
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 text-sm resize-none"
                            placeholder="描述 AI 應該如何回覆，例如：以台灣在地化的語氣，用詞親切但不失禮貌，適時加入輕鬆的表達..."
                            value={formData.toneCustom || ''}
                            maxLength={200}
                            onChange={(e) => updateField('toneCustom', e.target.value)}
                        />
                        <div className="text-[10px] text-slate-400 text-right pr-2 mt-1">{(formData.toneCustom || '').length}/200</div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Prompt 預覽</div>
                    <p className="text-sm text-slate-600">{TONE_PROMPTS[formData.tone] || ''}</p>
                </div>
            )}
            <div className="mt-2">
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
        const addFAQ = (category = '') => {
            const cat = category || (formData.faqs.length > 0 ? (formData.faqs[formData.faqs.length - 1].category || '常見問題') : '常見問題');
            const newId = Date.now().toString();
            const newFAQ = { id: newId, question: '', answer: '', image_id: '', category: cat };
            updateField('faqs', [...formData.faqs, newFAQ]);
            setExpandedCategories(prev => new Set([...prev, cat]));
            setWizardExpandedFaqItems(prev => new Set([...prev, newId]));
        };

        const renameCategory = (oldName, newName) => {
            updateField('faqs', formData.faqs.map(f => f.category === oldName ? { ...f, category: newName } : f));
            setExpandedCategories(prev => {
                const next = new Set(prev);
                next.delete(oldName);
                next.add(newName);
                return next;
            });
            setWizardCategoryOrder(prev => prev.map(c => c === oldName ? newName : c));
        };

        const deleteCategory = (cat) => {
            if (!window.confirm(`確定要刪除分類「${cat}」及其所有 FAQ 嗎？`)) return;
            updateField('faqs', formData.faqs.filter(f => (f.category || '常見問題') !== cat));
            setExpandedCategories(prev => { const next = new Set(prev); next.delete(cat); return next; });
            setWizardCategoryOrder(prev => prev.filter(c => c !== cat));
        };

        const toggleCategory = (cat) => {
            setExpandedCategories(prev => {
                const next = new Set(prev);
                next.has(cat) ? next.delete(cat) : next.add(cat);
                return next;
            });
        };

        const addNewCategory = () => {
            const name = window.prompt('請輸入新分類名稱：');
            if (!name || !name.trim()) return;
            const trimmed = name.trim();
            const newId = Date.now().toString();
            const newFAQ = { id: newId, question: '', answer: '', image_id: '', category: trimmed };
            updateField('faqs', [...formData.faqs, newFAQ]);
            setExpandedCategories(prev => new Set([...prev, trimmed]));
            setWizardCategoryOrder(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
            setWizardExpandedFaqItems(prev => new Set([...prev, newId]));
        };

        const toggleWizardFaqItem = (id) =>
            setWizardExpandedFaqItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

        const removeFAQ = (id) => {
            updateField('faqs', formData.faqs.filter(f => f.id !== id));
        };

        const updateFAQ = (id, field, value) => {
            updateField('faqs', formData.faqs.map(f => f.id === id ? { ...f, [field]: value } : f));
        };

        const handleGenerateFaqs = async () => {
            if (!formData.businessName.trim() || !formData.servicesDescription.trim()) {
                alert('請先填寫第一題的商家名稱與服務內容');
                setQIndex(0);
                return;
            }

            setIsGeneratingFaqs(true);
            try {
                const line_user_id = Cookies.get('google_user_id');
                const response = await axios.post(`${config.API_URL}/api/generate_faqs`, {
                    businessName: formData.businessName,
                    servicesDescription: formData.servicesDescription,
                    websiteUrl: formData.websiteUrl || '',
                    line_user_id: line_user_id,
                    agent_id: agentId
                });

                if (response.data && response.data.faqs) {
                    const newFaqs = response.data.faqs.map(f => ({
                        id: Math.random().toString(36).substr(2, 9),
                        question: f.q,
                        answer: f.a,
                        image_id: '',
                        category: f.category || '常見問題'
                    }));
                    updateField('faqs', [...formData.faqs, ...newFaqs]);
                    const newCats = new Set(newFaqs.map(f => f.category));
                    setExpandedCategories(prev => new Set([...prev, ...newCats]));
                    if (response.data.mode === 'extracted') {
                        alert(`已從網站擷取 ${newFaqs.length} 筆 FAQ，共 ${newCats.size} 個分類`);
                    }
                } else if (response.data && response.data.error) {
                    alert('自動產生失敗：' + response.data.error);
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
            if (faq.question.length > 100 || faq.answer.length > 500) {
                alert('內容超過字數限制 (問題 100 字，回答 500 字)');
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

            const hasIncomplete = formData.faqs.some(f => !f.question.trim() || !f.answer.trim());
            if (hasIncomplete) {
                alert('請填寫所有 FAQ 的問題與回答，再進行健檢');
                return;
            }

            const tooLong = formData.faqs.some(f => f.question.length > 100 || f.answer.length > 500);
            if (tooLong) {
                alert('部分內容超過字數限制 (問題 100 字，回答 500 字)');
                return;
            }

            if (!formData.businessName.trim() || !formData.servicesDescription.trim()) {
                alert('請先填寫第一題的商家名稱與服務內容');
                setQIndex(0);
                return;
            }

            setIsAnalyzing(true);
            try {
                const line_user_id = Cookies.get('google_user_id');
                const response = await axios.post(`${config.API_URL}/api/analyze_faqs`, {
                    businessName: formData.businessName,
                    servicesDescription: formData.servicesDescription,
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
            if (analysisReport) {
                setAnalysisReport(prev => ({
                    ...prev,
                    suggestions: prev.suggestions.filter(s => s.id !== faqId)
                }));
            }
        };

        const handleWizardImportFaqs = async (source) => {
            setIsParsingWizardFaqs(true);
            try {
                const fd = new FormData();
                fd.append('brandDescription', formData.brandDescription || '');
                fd.append('line_user_id', Cookies.get('google_user_id') || '');
                if (source === 'file') {
                    const file = wizardFaqImportFileRef.current?.files?.[0];
                    if (!file) { alert('請選擇檔案'); setIsParsingWizardFaqs(false); return; }
                    if (file.size > 512 * 1024) { alert('檔案大小不得超過 500KB'); setIsParsingWizardFaqs(false); return; }
                    const ext = file.name.toLowerCase().split('.').pop();
                    if (!['xlsx', 'csv'].includes(ext)) { alert('僅支援 .xlsx 或 .csv 格式'); setIsParsingWizardFaqs(false); return; }
                    fd.append('file', file);
                } else {
                    if (!wizardFaqImportText.trim()) { alert('請貼上 FAQ 文字內容'); setIsParsingWizardFaqs(false); return; }
                    fd.append('text', wizardFaqImportText);
                }
                const res = await axios.post(`${config.API_URL}/api/parse_faqs`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data.error) {
                    alert('解析失敗：' + res.data.error);
                } else if (res.data.faqs) {
                    setParsedWizardFaqPreview(res.data.faqs);
                    if (wizardFaqImportFileRef.current) wizardFaqImportFileRef.current.value = '';
                }
            } catch (err) {
                console.error('FAQ import failed:', err);
                alert('解析失敗，請稍後再試');
            } finally {
                setIsParsingWizardFaqs(false);
            }
        };

        const handleConfirmWizardImportFaqs = () => {
            if (!parsedWizardFaqPreview?.length) return;
            const newFaqs = parsedWizardFaqPreview.map(f => ({
                id: Math.random().toString(36).substr(2, 9),
                question: f.question,
                answer: f.answer,
                image_id: '',
                category: f.category || '常見問題',
            }));
            updateField('faqs', [...formData.faqs, ...newFaqs]);
            const newCats = new Set(newFaqs.map(f => f.category));
            setExpandedCategories(prev => new Set([...prev, ...newCats]));
            setShowWizardFaqImportModal(false);
            setParsedWizardFaqPreview(null);
            setWizardFaqImportText('');
            setWizardFaqImportTab('file');
        };

        const updateWizardPreviewFaq = (i, field, val) =>
            setParsedWizardFaqPreview(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f));

        const removeWizardPreviewFaq = (i) =>
            setParsedWizardFaqPreview(prev => prev.filter((_, idx) => idx !== i));

        const availableWizardCategories = [...new Set([
            ...[...new Set(formData.faqs.map(f => f.category || '常見問題'))],
            ...(parsedWizardFaqPreview || []).map(f => f.category || '常見問題')
        ])];

        return (
            <div className="space-y-4">
                {/* Top Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    {formData.faqs.length === 0 && (
                        <button onClick={handleGenerateFaqs} disabled={isGeneratingFaqs}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all disabled:opacity-50">
                            {isGeneratingFaqs ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            一鍵產生常見問題
                        </button>
                    )}
                    {formData.faqs.length > 0 && <div />}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={handleAnalyzeFaqs} disabled={isAnalyzing || formData.faqs.length === 0}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
                            {isAnalyzing ? <Loader2 size={16} className="text-blue-500 animate-spin" /> : <Stethoscope size={16} className="text-blue-500" />}
                            <span className="hidden sm:inline">AI 智能健檢</span>
                        </button>
                        <button onClick={() => { setShowWizardFaqImportModal(true); setParsedWizardFaqPreview(null); setWizardFaqImportText(''); setWizardFaqImportTab('file'); }}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
                            <Upload size={16} className="text-brand-500" />
                            <span className="hidden sm:inline">匯入 FAQ</span>
                        </button>
                        <button onClick={addNewCategory}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
                            <Plus size={16} />
                            <span className="hidden sm:inline">新增分類</span>
                        </button>
                        <button onClick={() => addFAQ()}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-md shadow-brand-100">
                            <Plus size={16} />
                            新增問答
                        </button>
                    </div>
                </div>

                {/* Analysis Report */}
                {analysisReport && (
                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                            <h4 className="font-bold text-emerald-900">AI 健檢報告 (得分: {analysisReport.score})</h4>
                        </div>
                        <p className="text-sm text-emerald-800 leading-relaxed mb-3">{analysisReport.report}</p>
                        <p className="text-xs text-emerald-600 italic">* 請查看各問答項目中的具體優化建議，點擊「取代」即可快速修正。</p>
                    </div>
                )}

                {/* FAQ Category List */}
                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scrollbar pt-1">
                    {(() => {
                        const grouped = {};
                        formData.faqs.forEach(faq => {
                            const cat = faq.category || '常見問題';
                            if (!grouped[cat]) grouped[cat] = [];
                            grouped[cat].push(faq);
                        });

                        const renderFaqCard = (faq, catIdx) => {
                            const isExpanded = wizardExpandedFaqItems.has(faq.id);
                            return (
                                <div key={faq.id} className="border-b border-slate-100 last:border-b-0">
                                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                                        onClick={() => toggleWizardFaqItem(faq.id)}>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">Q{catIdx + 1}</span>
                                        <span className="flex-1 text-sm font-semibold text-slate-700 truncate min-w-0">
                                            {faq.question || <span className="text-slate-300 font-normal italic">未填寫問題...</span>}
                                        </span>
                                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleOptimizeFaq(faq.id)} disabled={optimizingFaqIds.has(faq.id)}
                                                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-brand-600 rounded-lg disabled:opacity-50" title="AI 優化">
                                                {optimizingFaqIds.has(faq.id) ? <Loader2 size={13} className="animate-spin text-brand-600" /> : <Sparkles size={13} />}
                                            </button>
                                            <button onClick={() => setWizardMoveFaqModal({ open: true, faqId: faq.id, faqQuestion: faq.question, currentCat: faq.category || '常見問題' })}
                                                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-brand-500 rounded-lg" title="移動到其他分類">
                                                <FolderInput size={13} />
                                            </button>
                                            <button onClick={() => { if (window.confirm(`確定刪除「${faq.question || '此問答'}」？`)) removeFAQ(faq.id); }}
                                                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-lg" title="刪除">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                        <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                    {isExpanded && (
                                        <div className="px-4 pb-5 pt-3 space-y-4 border-t border-slate-100 bg-white">
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Question</div>
                                                <input type="text" value={faq.question} maxLength={100}
                                                    onChange={(e) => updateFAQ(faq.id, 'question', e.target.value)}
                                                    placeholder="輸入常見問題..."
                                                    className="w-full bg-transparent text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none p-0" />
                                                <div className="text-[10px] text-slate-300 text-right mt-1">{faq.question?.length || 0}/100</div>
                                            </div>
                                            {analysisReport && analysisReport.suggestions.find(s => s.id === faq.id) && (
                                                <div className="ml-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <AlertCircle size={14} className="text-amber-500 mt-0.5" />
                                                        <p className="text-xs text-amber-700 font-medium">{analysisReport.suggestions.find(s => s.id === faq.id).suggestion}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input readOnly className="flex-1 p-2 bg-white border border-amber-200 rounded text-xs text-amber-800"
                                                            value={analysisReport.suggestions.find(s => s.id === faq.id).optimized_q} />
                                                        <button onClick={() => { const s = analysisReport.suggestions.find(sg => sg.id === faq.id); applySuggestion(faq.id, s.optimized_q, s.optimized_a); }}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-50 whitespace-nowrap">
                                                            <RotateCcw size={12} /><span>取代</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Answer</div>
                                                <textarea value={faq.answer} maxLength={500} rows={3}
                                                    onChange={(e) => updateFAQ(faq.id, 'answer', e.target.value)}
                                                    placeholder="輸入回覆內容..."
                                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-600 text-sm leading-relaxed focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-inner resize-none" />
                                                <div className="text-[10px] text-slate-300 text-right mt-1">{faq.answer?.length || 0}/500</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Image <span className="text-slate-300 font-normal">(選填)</span></div>
                                                {faq.image_id ? (
                                                    <div className="flex items-center gap-3">
                                                        <img src={faq._preview_url} alt="附圖" className="w-14 h-14 object-cover rounded-xl border border-slate-200" onError={(e) => { e.target.style.display = 'none'; }} />
                                                        <button onClick={() => updateFAQ(faq.id, 'image_id', '')} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50"><Trash2 size={14} />移除圖片</button>
                                                    </div>
                                                ) : (
                                                    <label className="flex items-center gap-2 px-4 py-3 bg-white border border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-all">
                                                        {uploadingFaqId === faq.id ? <Loader2 size={16} className="animate-spin text-brand-500" /> : <Upload size={16} className="text-slate-400" />}
                                                        <span className="text-xs text-slate-500">{uploadingFaqId === faq.id ? '上傳中...' : '上傳附圖 (jpg/png/webp, 2MB)'}</span>
                                                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={!!uploadingFaqId}
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0]; if (!file) return;
                                                                if (file.size > 2 * 1024 * 1024) { alert('圖片不可超過 2MB'); return; }
                                                                setUploadingFaqId(faq.id);
                                                                try {
                                                                    const fd = new FormData(); fd.append('file', file);
                                                                    const res = await axios.post(`${config.API_URL}/api/admin/upload_image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                                    updateField('faqs', formData.faqs.map(f => f.id === faq.id ? { ...f, image_id: res.data.image_id, _preview_url: res.data.preview_url } : f));
                                                                } catch { alert('圖片上傳失敗'); }
                                                                finally { setUploadingFaqId(null); }
                                                            }} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        };

                        const cats = wizardCategoryOrder.filter(c => grouped[c]);

                        if (cats.length === 0) {
                            return !isGeneratingFaqs && (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">
                                    尚未新增 FAQ，點擊上方按鈕開始
                                </div>
                            );
                        }

                        return cats.map(cat => {
                            const isExpanded = expandedCategories.has(cat);
                            const catFaqs = grouped[cat];
                            return (
                                <div key={cat}
                                    className={`border rounded-xl overflow-hidden transition-all ${wizardDragOverCat === cat && wizardDraggedCat !== cat ? 'border-brand-400 ring-2 ring-brand-200' : 'border-slate-200'}`}
                                    onDragOver={(e) => { e.preventDefault(); setWizardDragOverCat(cat); }}
                                    onDrop={() => {
                                        if (wizardDraggedCat && wizardDraggedCat !== cat) {
                                            setWizardCategoryOrder(prev => {
                                                const arr = [...prev];
                                                const from = arr.indexOf(wizardDraggedCat);
                                                const to = arr.indexOf(cat);
                                                arr.splice(from, 1); arr.splice(to, 0, wizardDraggedCat);
                                                return arr;
                                            });
                                        }
                                        setWizardDraggedCat(null); setWizardDragOverCat(null);
                                    }}
                                    onDragEnd={() => { setWizardDraggedCat(null); setWizardDragOverCat(null); }}
                                >
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 cursor-pointer select-none" onClick={() => toggleCategory(cat)}>
                                        <span draggable onDragStart={(e) => { e.stopPropagation(); setWizardDraggedCat(cat); }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 px-1 flex-shrink-0">
                                            <GripVertical size={14} />
                                        </span>
                                        {isExpanded ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />}
                                        <input
                                            type="text"
                                            value={cat}
                                            onChange={(e) => renameCategory(cat, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 bg-transparent font-bold text-slate-700 text-sm focus:outline-none focus:border-b focus:border-brand-400 min-w-0"
                                        />
                                        <span className="text-xs text-slate-400 flex-shrink-0">{catFaqs.length} 組</span>
                                        <button onClick={(e) => { e.stopPropagation(); addFAQ(cat); }} className="text-slate-400 hover:text-brand-600 p-1 flex-shrink-0" title="新增此分類 FAQ"><Plus size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat); }} className="text-slate-400 hover:text-red-500 p-1 flex-shrink-0" title="刪除此分類"><Trash2 size={14} /></button>
                                    </div>
                                    {isExpanded && (
                                        <div className="divide-y divide-slate-50">
                                            {catFaqs.map((faq, idx) => renderFaqCard(faq, idx))}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>

                {formData.faqs.length > 0 && formData.faqs.length < 3 && (
                    <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        💡 建議至少 3 組，Step 3 效果會更好
                    </div>
                )}

                {showWizardFaqImportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowWizardFaqImportModal(false)}>
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">匯入 FAQ</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">AI 自動解析並整理為知識庫格式</p>
                                </div>
                                <button onClick={() => setShowWizardFaqImportModal(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                            </div>
                            <div className="flex border-b border-slate-100 flex-shrink-0">
                                <button onClick={() => { setWizardFaqImportTab('file'); setParsedWizardFaqPreview(null); }} className={`flex-1 py-3 text-sm font-semibold transition-colors ${wizardFaqImportTab === 'file' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-600'}`}>上傳檔案</button>
                                <button onClick={() => { setWizardFaqImportTab('text'); setParsedWizardFaqPreview(null); }} className={`flex-1 py-3 text-sm font-semibold transition-colors ${wizardFaqImportTab === 'text' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-600'}`}>貼上文字</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {wizardFaqImportTab === 'file' && !parsedWizardFaqPreview && (
                                    <div>
                                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                                            <Upload size={28} className="text-slate-300 mb-2" />
                                            <span className="text-sm font-semibold text-slate-500">點擊選擇或拖放檔案</span>
                                            <span className="text-xs text-slate-400 mt-1">支援 .xlsx / .csv，最大 500KB</span>
                                            <input ref={wizardFaqImportFileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={() => setParsedWizardFaqPreview(null)} />
                                        </label>
                                        <p className="text-xs text-slate-400 mt-3 text-center">AI 會自動識別問題與回答欄位，每次最多解析 50 組</p>
                                    </div>
                                )}
                                {wizardFaqImportTab === 'text' && !parsedWizardFaqPreview && (
                                    <div>
                                        <textarea
                                            value={wizardFaqImportText}
                                            onChange={(e) => setWizardFaqImportText(e.target.value)}
                                            placeholder={'請貼上網站 FAQ 內容...\n\n例如：\nQ: 如何退換貨？\nA: 商品到貨 7 天內可申請退換。\n\nQ: 運費怎麼計算？\nA: 滿 500 元免運。'}
                                            className="w-full h-52 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4 resize-none outline-none focus:border-brand-400 focus:bg-white transition-colors"
                                        />
                                        <p className="text-xs text-slate-400 mt-2">AI 會自動識別問答結構，支援 Q&A、數字編號、中文標點等各種格式</p>
                                    </div>
                                )}
                                {parsedWizardFaqPreview && (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700 mb-3">解析結果：共 {parsedWizardFaqPreview.length} 組 FAQ <span className="text-xs font-normal text-slate-400">（可直接編輯或刪除）</span></p>
                                        <datalist id="wizard-faq-import-cats">
                                            {availableWizardCategories.map(c => <option key={c} value={c} />)}
                                        </datalist>
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {parsedWizardFaqPreview.map((f, i) => (
                                                <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            list="wizard-faq-import-cats"
                                                            value={f.category || '常見問題'}
                                                            onChange={(e) => updateWizardPreviewFaq(i, 'category', e.target.value)}
                                                            className="flex-1 text-[11px] font-bold text-brand-600 bg-brand-50 border border-brand-100 rounded-full px-2.5 py-0.5 outline-none focus:border-brand-400 focus:bg-white transition-colors min-w-0"
                                                            placeholder="分類名稱"
                                                        />
                                                        <button onClick={() => removeWizardPreviewFaq(i)} className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors" title="移除此 FAQ">
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={f.question}
                                                            maxLength={100}
                                                            onChange={(e) => updateWizardPreviewFaq(i, 'question', e.target.value)}
                                                            className="w-full text-sm font-semibold text-slate-800 bg-transparent border-b border-slate-100 focus:border-brand-400 outline-none py-0.5 transition-colors"
                                                            placeholder="問題..."
                                                        />
                                                        <div className="text-[10px] text-slate-300 text-right">{f.question?.length || 0}/100</div>
                                                    </div>
                                                    <div>
                                                        <textarea
                                                            rows={2}
                                                            value={f.answer}
                                                            maxLength={500}
                                                            onChange={(e) => updateWizardPreviewFaq(i, 'answer', e.target.value)}
                                                            className="w-full text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5 resize-none outline-none focus:bg-white focus:ring-1 focus:ring-brand-200 transition-colors"
                                                            placeholder="回答..."
                                                        />
                                                        <div className="text-[10px] text-slate-300 text-right">{f.answer?.length || 0}/500</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
                                <button onClick={() => setShowWizardFaqImportModal(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">取消</button>
                                {!parsedWizardFaqPreview ? (
                                    <button
                                        onClick={() => handleWizardImportFaqs(wizardFaqImportTab)}
                                        disabled={isParsingWizardFaqs}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-50"
                                    >
                                        {isParsingWizardFaqs ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        {isParsingWizardFaqs ? 'AI 解析中...' : '開始解析'}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setParsedWizardFaqPreview(null)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">重新解析</button>
                                        <button onClick={handleConfirmWizardImportFaqs} disabled={!parsedWizardFaqPreview?.length} className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-40">
                                            {parsedWizardFaqPreview?.length ? `加入知識庫（${parsedWizardFaqPreview.length} 組）` : '已無可加入的 FAQ'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {wizardMoveFaqModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setWizardMoveFaqModal({ open: false, faqId: null, faqQuestion: '', currentCat: '' })}>
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-start justify-between mb-1">
                                <h3 className="text-base font-bold text-slate-800">移動問答到其他分類</h3>
                                <button onClick={() => setWizardMoveFaqModal({ open: false, faqId: null, faqQuestion: '', currentCat: '' })} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                            </div>
                            <p className="text-xs text-slate-400 mb-4 truncate">「{wizardMoveFaqModal.faqQuestion || '此問答'}」</p>
                            <div className="space-y-2">
                                {wizardCategoryOrder.filter(c => c !== wizardMoveFaqModal.currentCat).length === 0 ? (
                                    <p className="text-sm text-slate-400 italic text-center py-6">沒有其他分類</p>
                                ) : wizardCategoryOrder.filter(c => c !== wizardMoveFaqModal.currentCat).map(targetCat => (
                                    <button key={targetCat}
                                        onClick={() => {
                                            updateField('faqs', formData.faqs.map(f =>
                                                f.id === wizardMoveFaqModal.faqId ? { ...f, category: targetCat } : f
                                            ));
                                            setExpandedCategories(prev => new Set([...prev, targetCat]));
                                            setWizardMoveFaqModal({ open: false, faqId: null, faqQuestion: '', currentCat: '' });
                                        }}
                                        className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-100 hover:border-brand-200 rounded-xl text-sm font-medium text-slate-700 transition-all">
                                        {targetCat}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-5 flex justify-end">
                                <button onClick={() => setWizardMoveFaqModal({ open: false, faqId: null, faqQuestion: '', currentCat: '' })} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">取消</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderQ4 = () => {
        const fieldSchema = formData.productFieldSchema || [];

        const addCustomField = (label) => {
            const trimmed = label.trim();
            if (!trimmed) return;
            if (fieldSchema.length >= 8) {
                alert('最多新增 8 個自訂欄位');
                return;
            }
            const key = trimmed.toLowerCase().replace(/[\s一-龥]+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/^_+|_+$/g, '') || `field_${Date.now()}`;
            if (fieldSchema.some(f => f.key === key)) {
                alert('欄位已存在');
                return;
            }
            updateField('productFieldSchema', [...fieldSchema, { key, label: trimmed, type: 'text', max_length: 100 }]);
            setNewFieldLabel('');
            setSchemaInputVisible(false);
        };

        const removeCustomField = (key) => {
            updateField('productFieldSchema', fieldSchema.filter(f => f.key !== key));
        };

        const addProduct = () => {
            if ((formData.products || []).length >= 50) {
                alert('最多只能新增 50 項商品');
                return;
            }
            const initCustomFields = Object.fromEntries(fieldSchema.map(f => [f.key, '']));
            const newProduct = { id: Date.now().toString(), name: '', description: '', keywords: '', custom_fields: initCustomFields };
            updateField('products', [...(formData.products || []), newProduct]);
        };

        const removeProduct = (id) => {
            updateField('products', (formData.products || []).filter(p => p.id !== id));
        };

        const updateProduct = (id, field, value) => {
            updateField('products', (formData.products || []).map(p => p.id === id ? { ...p, [field]: value } : p));
        };

        const updateProductCustomField = (id, key, value) => {
            updateField('products', (formData.products || []).map(p =>
                p.id === id ? { ...p, custom_fields: { ...(p.custom_fields || {}), [key]: value } } : p
            ));
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
                fd.append('brandDescription', `${formData.businessName} ${formData.servicesDescription}`.trim());
                fd.append('line_user_id', Cookies.get('google_user_id') || '');
                if (fieldSchema.length > 0) {
                    fd.append('field_schema', JSON.stringify(fieldSchema));
                }
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
                        custom_fields: p.custom_fields || {},
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
                {/* 欄位設定 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">欄位設定</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {/* 固定欄位 */}
                        {['名稱', '說明', '別名'].map(label => (
                            <span key={label} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-bold">{label}</span>
                        ))}
                        {/* 自訂欄位 */}
                        {fieldSchema.map(f => (
                            <span key={f.key} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-bold">
                                {f.label}
                                <button onClick={() => removeCustomField(f.key)} className="ml-0.5 text-green-400 hover:text-red-500 transition-colors"><X size={10} /></button>
                            </span>
                        ))}
                        {/* 新增欄位按鈕 */}
                        {!schemaInputVisible ? (
                            <button onClick={() => setSchemaInputVisible(true)} className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-green-300 text-green-500 rounded-full text-xs font-bold hover:bg-green-50 transition-colors">
                                <Plus size={10} />新增欄位
                            </button>
                        ) : (
                            <div className="flex items-center gap-1">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newFieldLabel}
                                    onChange={(e) => setNewFieldLabel(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') addCustomField(newFieldLabel); if (e.key === 'Escape') { setSchemaInputVisible(false); setNewFieldLabel(''); } }}
                                    placeholder="欄位名稱"
                                    maxLength={20}
                                    className="w-24 px-2 py-1 border border-green-300 rounded-full text-xs focus:outline-none focus:border-green-500"
                                />
                                <button onClick={() => addCustomField(newFieldLabel)} className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-600">確認</button>
                                <button onClick={() => { setSchemaInputVisible(false); setNewFieldLabel(''); }} className="px-2 py-1 text-slate-400 text-xs hover:text-slate-600">取消</button>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-300">固定欄位不可刪除，最多可新增 8 個自訂欄位</p>
                </div>

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
                                {/* 自訂欄位 */}
                                {fieldSchema.map(f => (
                                    <div key={f.key} className="flex items-center gap-2">
                                        <span className="text-xs font-black text-green-400 truncate w-8 shrink-0" title={f.label}>{f.label.slice(0, 2)}</span>
                                        <input
                                            type="text"
                                            placeholder={`${f.label}（選填）`}
                                            className="w-full p-2 border-b border-slate-200 focus:border-green-500 focus:outline-none text-sm"
                                            value={(product.custom_fields || {})[f.key] || ''}
                                            maxLength={f.max_length}
                                            onChange={(e) => updateProductCustomField(product.id, f.key, e.target.value)}
                                        />
                                        <div className="text-[10px] text-slate-300 ml-1 shrink-0">{((product.custom_fields || {})[f.key] || '').length}/{f.max_length}</div>
                                    </div>
                                ))}
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
        { title: '品牌基礎', render: renderQ1, prompt: '第一題，請填寫你的商家名稱與服務內容。（必填）' },
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
                            disabled={(qIndex === 0 && (!formData.businessName.trim() || !formData.servicesDescription.trim())) || (qIndex === 0 && !!urlError)}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl transition-all transform active:scale-95 ${(qIndex === 0 && (!formData.businessName.trim() || !formData.servicesDescription.trim())) || (qIndex === 0 && !!urlError)
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
