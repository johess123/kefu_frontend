import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { Send, User, Bot, Loader2, RotateCcw, ArrowRight, MessageCircle, Info, ShieldAlert, CheckCircle2, Lightbulb, HelpCircle, Package, ChevronDown, ChevronRight, Image as ImageIcon, Pencil } from 'lucide-react';
import { AppStep } from '../types';
import ImageLightbox from './ImageLightbox';
import FaqAddModal from './FaqAddModal';
import { FAQ_MAX_QUESTION, FAQ_MAX_ANSWER, mergeFaqValues, findFaqIndexForHit } from '../utils/faqUtils';

import Cookies from 'js-cookie';

const StepDemo = ({ formData, setFormData, sessionId, setSessionId, agentId, onNext, setCurrentStep }) => {
    const [messages, setMessages] = useState([
        { role: 'model', text: '你好！我是你的 AI 智能客服，有什麼可以幫你的嗎？' }
    ]);
    const [input, setInput] = useState('');
    const [pendingCount, setPendingCount] = useState(0);
    const [lastResponseInfo, setLastResponseInfo] = useState(null);
    const [leftTab, setLeftTab] = useState('faq');
    const [collapsedFaqCats, setCollapsedFaqCats] = useState(new Set());
    const messagesEndRef = useRef(null);

    const [attachedFile, setAttachedFile] = useState(null); // File object
    const [imagePreview, setImagePreview] = useState('');   // local object URL
    const [imageUploading, setImageUploading] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const fileInputRef = useRef(null);

    // 回應分析面板的「編輯此 FAQ」：faqIndex 指向 formData.faqs，
    // hitIndex 指向 lastResponseInfo.related_faqs（存檔後要就地更新，面板才不會還顯示舊文字）
    const [faqEdit, setFaqEdit] = useState({ open: false, faqIndex: -1, hitIndex: -1 });
    const [isSavingFaq, setIsSavingFaq] = useState(false);

    const toggleFaqCat = (cat) => {
        setCollapsedFaqCats(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
        });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (textToSend = input) => {
        const msgText = textToSend.trim();
        const hasImage = !!attachedFile;
        if (!msgText && !hasImage) return;

        // 立即顯示使用者訊息（含本地圖片預覽）
        const userMsg = { role: 'user', text: msgText, imagePreview: imagePreview };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        const fileToUpload = attachedFile;
        setAttachedFile(null);
        setImagePreview('');
        setPendingCount(c => c + 1);
        setLastResponseInfo(null);

        try {
            // 若有附圖，先上傳取得 Cloudinary URL
            let uploadedImageUrl = '';
            if (fileToUpload) {
                setImageUploading(true);
                const formData = new FormData();
                formData.append('file', fileToUpload);
                const uploadRes = await axios.post(`${config.API_URL}/api/admin/upload_image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedImageUrl = uploadRes.data.preview_url || '';
                setImageUploading(false);
            }

            const line_user_id = Cookies.get('google_user_id');
            const line_user_name = Cookies.get('google_user_name');
            const response = await axios.post(`${config.API_URL}/api/chat`, {
                message: msgText || '（附圖）',
                line_user_id: line_user_id,
                user_name: line_user_name,
                agent_id: agentId,
                session_id: sessionId,
                source: 'web',
                ...(uploadedImageUrl && { image_url: uploadedImageUrl }),
            });

            const { response_text, related_faq_list, related_product_list, handoff_result, faq_image_urls, product_image_urls, storefront_url } = response.data;
            const allImages = [...(faq_image_urls || []), ...(product_image_urls || [])];
            const displayImages = storefront_url ? allImages.slice(0, 2) : allImages.slice(0, 4);

            const newMessage = {
                role: 'model',
                text: response_text,
                related_faqs: related_faq_list || [],
                related_products: related_product_list || [],
                handoff: handoff_result,
                images: displayImages,
                storefront_url: storefront_url || '',
            };

            if (response_text) {
                setMessages(prev => [...prev, newMessage]);
                setLastResponseInfo(newMessage);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'model', text: '抱歉，發生錯誤，請稍後再試。' }]);
        } finally {
            setPendingCount(c => Math.max(0, c - 1));
            setImageUploading(false);
        }
    };

    // 從回應分析面板直接改一筆 FAQ。這一步 agent 已經建立（Step 3 的 confirm_setup），
    // 所以直接寫回知識庫；同時更新 formData，左側清單與後續步驟才不會是舊資料。
    // 刻意不送 faq_drafts —— 後端把「沒帶這個 key」視為不動草稿。
    const handleFaqEditSubmit = async (values) => {
        if (isSavingFaq) return;
        const { faqIndex, hitIndex } = faqEdit;
        const faqs = formData.faqs || [];
        const src = faqs[faqIndex];
        if (!src) { alert('找不到對應的 FAQ，請重新整理後再試一次。'); return; }

        const merged = mergeFaqValues(src, values);
        const q = (merged.question || '').trim();
        const a = (merged.answer || '').trim();
        if (!q || !a) { alert('問題與回答皆為必填'); return; }
        if (q.length > FAQ_MAX_QUESTION || a.length > FAQ_MAX_ANSWER) {
            alert(`內容超過字數限制 (問題 ${FAQ_MAX_QUESTION} 字，回答 ${FAQ_MAX_ANSWER} 字)`);
            return;
        }

        const nextFaqs = faqs.map((f, i) => (i === faqIndex ? merged : f));
        try {
            setIsSavingFaq(true);
            const res = await axios.post(`${config.API_URL}/api/admin/agent/${agentId}/update_faqs`, {
                userId: Cookies.get('google_user_id'),
                faqs: nextFaqs,
            });
            if (res.data.status !== 'ok') {
                // 存檔失敗時彈窗不關，使用者剛打的內容才不會憑空消失
                alert(res.data.message || '儲存失敗，請確認內容是否符合字數限制後再試一次。');
                return;
            }
            setFormData(prev => ({ ...prev, faqs: nextFaqs }));
            setLastResponseInfo(prev => {
                if (!prev || !Array.isArray(prev.related_faqs) || !prev.related_faqs[hitIndex]) return prev;
                return {
                    ...prev,
                    related_faqs: prev.related_faqs.map((f, i) =>
                        i === hitIndex ? { ...f, Q: merged.question, A: merged.answer } : f
                    ),
                };
            });
            setFaqEdit({ open: false, faqIndex: -1, hitIndex: -1 });
            alert('FAQ 已更新，接下來的測試對話會使用新內容。');
        } catch (error) {
            console.error('Failed to update FAQ from demo:', error);
            alert('儲存失敗');
        } finally {
            setIsSavingFaq(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const resetChat = () => {
        setMessages([{ role: 'model', text: '你好！我是你的 AI 智能客服，有什麼可以幫你的嗎？' }]);
        setLastResponseInfo(null);
        setAttachedFile(null);
        setImagePreview('');
        // Refresh session ID to match backend dashboard behavior
        axios.get(`${config.API_URL}/api/init_session`).then(res => {
            if (res.data.session_id) {
                setSessionId(res.data.session_id);
            }
        }).catch(err => console.error('Failed to reset session:', err));
    };

    const handleFaqClick = (question) => {
        setInput(question);
        handleSend(question);
    };

    return (
        <div className="max-w-[1400px] mx-auto w-full px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[calc(100vh-80px)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Step 3 - AI 示範與測試</h2>
                    <p className="text-slate-500 text-sm">點擊左側問題即可快速測試，右側將顯示 AI 的推論依據</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={resetChat} className="text-sm font-bold text-slate-400 hover:text-brand-600 flex items-center gap-1 transition-colors">
                        <RotateCcw size={16} /> 重置對話
                    </button>
                    <button
                        onClick={onNext}
                        className="bg-brand-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-200 flex items-center gap-2"
                    >
                        下一步：部署 <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden mb-8">
                {/* Left Column: FAQ / Product List (Width 3/12) */}
                <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setLeftTab('faq')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${leftTab === 'faq' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                            >
                                <MessageCircle size={13} />
                                FAQ
                            </button>
                            <button
                                onClick={() => setLeftTab('product')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${leftTab === 'product' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Package size={13} />
                                商品庫
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {leftTab === 'faq' ? (
                            <>
                                {(() => {
                                    const grouped = {};
                                    const catOrder = [];
                                    formData.faqs.forEach((faq, idx) => {
                                        const cat = faq.category || '常見問題';
                                        if (!grouped[cat]) { grouped[cat] = []; catOrder.push(cat); }
                                        grouped[cat].push({ faq, idx });
                                    });
                                    if (catOrder.length === 0) return (
                                        <div className="text-center py-10 text-slate-400 text-xs italic">尚未設定任何 FAQ</div>
                                    );
                                    return catOrder.map(cat => {
                                        const isCollapsed = collapsedFaqCats.has(cat);
                                        return (
                                            <div key={cat} className="space-y-1">
                                                <div
                                                    onClick={() => toggleFaqCat(cat)}
                                                    className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors select-none"
                                                >
                                                    {isCollapsed
                                                        ? <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
                                                        : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
                                                    }
                                                    <span className="text-sm font-bold text-slate-700 truncate">{cat}</span>
                                                    <span className="text-[10px] text-slate-400 flex-shrink-0">({grouped[cat].length})</span>
                                                </div>
                                                {!isCollapsed && grouped[cat].map(({ faq, idx }) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleFaqClick(faq.question)}
                                                        className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-brand-300 hover:bg-brand-50/50 transition-all group"
                                                    >
                                                        <div className="text-[10px] font-bold text-slate-400 mb-1 group-hover:text-brand-500 uppercase tracking-widest">FAQ {idx + 1}</div>
                                                        <p className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 leading-relaxed">
                                                            {faq.question}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    });
                                })()}
                            </>
                        ) : (
                            <>
                                {(formData.products || []).map((product, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleFaqClick(`請問「${product.name}」有什麼特色或詳細資訊？`)}
                                        className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-green-300 hover:bg-green-50/50 transition-all group"
                                    >
                                        <div className="text-[10px] font-bold text-slate-400 mb-0.5 group-hover:text-green-600 uppercase tracking-widest">商品 {idx + 1}</div>
                                        <p className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 leading-relaxed">
                                            {product.name}
                                        </p>
                                        {product.description && (
                                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{product.description}</p>
                                        )}
                                    </button>
                                ))}
                                {(!formData.products || formData.products.length === 0) && (
                                    <div className="text-center py-10 text-slate-400 text-xs italic">尚未設定任何商品</div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Middle Column: Chat (Width 6/12) */}
                <div className="col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-brand-600 text-white'
                                        }`}>
                                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                    </div>
                                    <div className={`rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-brand-600 text-white rounded-tr-none overflow-hidden'
                                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 overflow-hidden'
                                        }`}>
                                        {/* 使用者附圖顯示（本地預覽） */}
                                        {msg.role === 'user' && msg.imagePreview && (
                                            <img
                                                src={msg.imagePreview}
                                                alt="附圖"
                                                className="w-full max-w-xs object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                style={{ maxHeight: '200px' }}
                                                onClick={() => setLightboxSrc(msg.imagePreview)}
                                            />
                                        )}
                                        <div className={`p-4 whitespace-pre-wrap ${!msg.text && msg.imagePreview ? 'hidden' : ''}`}>
                                            {msg.text}
                                            {msg.storefront_url && (
                                                <a
                                                    href={msg.storefront_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-3 flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-semibold text-xs underline underline-offset-2"
                                                >
                                                    <Package size={13} />
                                                    商品網站 →
                                                </a>
                                            )}
                                            {msg.role === 'model' && (
                                                <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-right">
                                                    By AI客服
                                                </div>
                                            )}
                                        </div>
                                        {msg.images && msg.images.length > 0 && (
                                            <div className={`grid gap-1 ${msg.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                {msg.images.map((img, i) => (
                                                    <img
                                                        key={i}
                                                        src={img.preview_url || img.url}
                                                        alt=""
                                                        className="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                        style={{ maxHeight: '200px' }}
                                                        onClick={() => setLightboxSrc(img.url)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {pendingCount > 0 && (
                            <div className="flex justify-start animate-pulse">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm">
                                        <Bot size={18} />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        {/* 圖片預覽列 */}
                        {imagePreview && (
                            <div className="mb-3 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-250">
                                <div className="relative inline-block">
                                    <img
                                        src={imagePreview}
                                        alt="附圖預覽"
                                        className="h-16 w-16 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80"
                                        onClick={() => setLightboxSrc(imagePreview)}
                                    />
                                    <button
                                        onClick={() => { setAttachedFile(null); setImagePreview(''); }}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                                    >✕</button>
                                </div>
                                <span className="text-xs text-slate-400">已附圖，傳送後 AI 會分析此圖片</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 relative">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    setAttachedFile(f);
                                    setImagePreview(URL.createObjectURL(f));
                                    e.target.value = '';
                                }}
                            />
                            {/* 附圖按鈕 */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={pendingCount > 0}
                                title="附上圖片"
                                className="flex-shrink-0 p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value.slice(0, 100))}
                                    onKeyDown={handleKeyDown}
                                    placeholder={attachedFile ? '可選：加入文字說明...' : '輸入測試訊息內容...'}
                                    maxLength={100}
                                    className="w-full pl-5 pr-28 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                                />
                                <div className="absolute right-14 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">
                                    {input.length}/100
                                </div>
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() && !attachedFile}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-100 active:scale-95"
                                >
                                    {imageUploading || pendingCount > 0 ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Deduction (Width 3/12) */}
                <div className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Info size={16} className="text-brand-600" />
                                回應分析
                            </h3>
                        </div>
                        <div className="flex-1 p-5">
                            {!lastResponseInfo ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                        <Bot size={24} />
                                    </div>
                                    <p className="text-xs text-slate-400">目前尚無分析數據<br />請先在對話框輸入訊息</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* FAQ Hits - Each in its own block */}
                                    {lastResponseInfo.related_faqs && lastResponseInfo.related_faqs.length > 0 &&
                                        lastResponseInfo.related_faqs.map((faq, i) => {
                                            // AI 偶爾不回 id 或改寫問題文字，對不回知識庫時就不給編輯入口，
                                            // 否則會編到別題、或改了卻沒生效
                                            const matchedIdx = findFaqIndexForHit(formData.faqs, faq);
                                            return (
                                            <div key={`faq-${i}`} className="space-y-3">
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <CheckCircle2 size={16} />
                                                    <span className="text-sm font-bold">成功命中 FAQ</span>
                                                </div>
                                                <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                                                    <div className="text-[10px] font-black text-green-600 uppercase mb-2">參考來源</div>
                                                    <div className="text-xs space-y-2">
                                                        <div className="flex gap-1">
                                                            <span className="font-bold text-slate-700 flex-shrink-0">Q:</span>
                                                            <span className="text-slate-600">{faq.Q}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <span className="font-bold text-slate-700 flex-shrink-0">A:</span>
                                                            <span className="text-slate-600">{faq.A}</span>
                                                        </div>
                                                    </div>
                                                    {matchedIdx !== -1 && agentId && (
                                                        <button
                                                            onClick={() => setFaqEdit({ open: true, faqIndex: matchedIdx, hitIndex: i })}
                                                            className="mt-3 w-full py-2 rounded-xl bg-white border border-green-200 text-green-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-green-50 hover:border-green-300 transition-all"
                                                        >
                                                            <Pencil size={13} />
                                                            編輯此 FAQ
                                                        </button>
                                                    )}
                                                    <hr className="my-3 border-green-100" />
                                                    <div className="bg-white/60 p-2 rounded border border-green-50 text-[11px] text-green-700 font-medium flex items-start gap-1">
                                                        <Lightbulb size={14} className="mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <span className="font-bold mr-1">KEFU 建議：</span>
                                                            此問題命中資料庫內容，建議維持此回答口吻服務客戶。
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })
                                    }

                                    {/* Product Hits - Each in its own block */}
                                    {lastResponseInfo.related_products && lastResponseInfo.related_products.length > 0 &&
                                        lastResponseInfo.related_products.map((product, i) => (
                                            <div key={`product-${i}`} className="space-y-3">
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <CheckCircle2 size={16} />
                                                    <span className="text-xs font-bold uppercase tracking-wider">成功命中商品</span>
                                                </div>
                                                <div className="bg-green-50/30 border border-green-100 rounded-2xl p-4">
                                                    <div className="text-[10px] font-black text-green-600 uppercase mb-3 tracking-widest opacity-70">商品資訊</div>
                                                    <div className="text-xs space-y-3">
                                                        <div className="flex gap-2">
                                                            <span className="font-bold text-slate-700 shrink-0">商品:</span>
                                                            <span className="text-slate-600 leading-relaxed">{product.name}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="font-bold text-slate-700 shrink-0">說明:</span>
                                                            <span className="text-slate-600 leading-relaxed">{product.description}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }

                                    {/* Handoff Hit - Separate block */}
                                    {lastResponseInfo.handoff?.hand_off && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-red-500">
                                                <ShieldAlert size={16} />
                                                <span className="text-sm font-bold">成功攔截並轉人工</span>
                                            </div>
                                            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                                                <div className="text-[10px] font-black text-red-500 uppercase mb-1">攔截原因</div>
                                                <div className="text-sm font-bold text-slate-800 mb-2">{lastResponseInfo.handoff.reason}</div>
                                                <div className="px-2 py-1 bg-white border border-red-100 rounded text-[10px] text-red-600 font-bold inline-block">已中斷 AI 回答並轉接</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {(!lastResponseInfo.related_faqs || lastResponseInfo.related_faqs.length === 0) && (!lastResponseInfo.related_products || lastResponseInfo.related_products.length === 0) && !lastResponseInfo.handoff?.hand_off && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-lg w-fit">
                                                <HelpCircle size={16} />
                                                <span className="text-sm font-bold">未命中任何 FAQ 或商品</span>
                                            </div>

                                            <div className="pt-2">
                                                <div className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">KEFU 建議</div>
                                                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3 items-start">
                                                    <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 flex-shrink-0">
                                                        <Lightbulb size={16} />
                                                    </div>
                                                    <p className="text-xs text-slate-600 leading-relaxed">
                                                        建議前往 <button onClick={() => setCurrentStep(AppStep.REVIEW)} className="text-brand-600 font-bold hover:underline">Step 2</button> 新增一題關於 「{messages.filter(m => m.role === 'user').slice(-1)[0]?.text}」 的 FAQ 或商品資料，以優化回答覆蓋率。
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* 圖片放大燈箱 */}
            <ImageLightbox
                isOpen={!!lightboxSrc}
                src={lightboxSrc}
                alt="測試對話附圖"
                onClose={() => setLightboxSrc(null)}
            />

            {/* 回應分析：直接編輯命中的那一筆 FAQ */}
            <FaqAddModal
                open={faqEdit.open}
                onClose={() => setFaqEdit({ open: false, faqIndex: -1, hitIndex: -1 })}
                categories={[...new Set((formData.faqs || []).map(f => f.category || '常見問題'))]}
                defaultCategory={(formData.faqs || [])[faqEdit.faqIndex]?.category || '常見問題'}
                initialValues={(formData.faqs || [])[faqEdit.faqIndex] || null}
                title="編輯此 FAQ"
                subtitle="修改後會直接更新知識庫"
                submitText={isSavingFaq ? '儲存中...' : '儲存'}
                submitIcon={isSavingFaq ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                onSubmit={handleFaqEditSubmit}
            />
        </div>
    );
};

export default StepDemo;
