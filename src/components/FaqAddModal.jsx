import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, Plus, Upload, Trash2, Loader2 } from 'lucide-react';
import axios from 'axios';
import config from '../config';
import { FAQ_MAX_QUESTION, FAQ_MAX_ANSWER } from '../utils/faqUtils';

export default function FaqAddModal({ open, onClose, categories = [], defaultCategory = '常見問題', categoryFixed = false, onSubmit }) {
    const [form, setForm] = useState({ question: '', answer: '', image_id: '', _preview_url: '', category: defaultCategory });
    const [uploading, setUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const dragCounter = useRef(0);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter") {
            dragCounter.current++;
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            dragCounter.current--;
            if (dragCounter.current <= 0) {
                setIsDragActive(false);
            }
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { 
                alert('僅支援 jpg/png/webp 格式'); 
                return; 
            }
            if (file.size > 2 * 1024 * 1024) { alert('圖片大小不可超過 2MB'); return; }
            setUploading(true);
            const fd = new FormData();
            fd.append('file', file);
            try {
                const res = await axios.post(`${config.API_URL}/api/admin/upload_image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                setForm(f => ({ ...f, image_id: res.data.image_id, _preview_url: res.data.preview_url }));
            } catch {
                alert('圖片上傳失敗');
            } finally {
                setUploading(false);
            }
        }
    };

    useEffect(() => {
        if (open) {
            setForm({ question: '', answer: '', image_id: '', _preview_url: '', category: defaultCategory || categories[0] || '常見問題' });
            setUploading(false);
            setIsDragActive(false);
            dragCounter.current = 0;
        }
    }, [open, defaultCategory]);

    if (!open) return null;

    const handleSubmit = () => {
        onSubmit({ ...form, category: form.category?.trim() || '常見問題' });
    };

    return (
        <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div 
                className="relative bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
                {isDragActive && (
                    <div className="absolute inset-0 bg-brand-500/10 backdrop-blur-[2px] border-4 border-dashed border-brand-500 rounded-[32px] z-50 flex flex-col items-center justify-center pointer-events-none transition-all duration-150">
                        <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-3">
                            <Upload size={32} className="text-brand-600 animate-bounce" />
                        </div>
                        <p className="text-sm font-bold text-brand-700">放開圖片以進行上傳</p>
                    </div>
                )}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center border border-brand-100">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">新增問答</h2>
                            <p className="text-slate-400 text-xs mt-0.5">建立一組 FAQ 問答</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category 分類</label>
                        {categoryFixed ? (
                            <input type="text" value={form.category} disabled
                                className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-500 text-sm outline-none cursor-not-allowed" />
                        ) : (
                            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-700 text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer">
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                {categories.length === 0 && <option value="常見問題">常見問題</option>}
                            </select>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question</label>
                        <input type="text" value={form.question} maxLength={FAQ_MAX_QUESTION}
                            onChange={(e) => setForm(f => ({ ...f, question: e.target.value }))}
                            placeholder="輸入常見問題..."
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-800 font-bold text-base focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all" />
                        <div className="text-[10px] text-slate-300 text-right">{form.question.length}/{FAQ_MAX_QUESTION}</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Answer</label>
                        <textarea value={form.answer} maxLength={FAQ_MAX_ANSWER}
                            onChange={(e) => setForm(f => ({ ...f, answer: e.target.value }))}
                            placeholder="輸入預設回覆回答內容..."
                            className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-slate-600 text-sm leading-relaxed min-h-[120px] focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all" />
                        <div className="text-[10px] text-slate-300 text-right">{form.answer.length}/{FAQ_MAX_ANSWER}</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Image <span className="text-slate-300 normal-case">(選填)</span></label>
                        {form.image_id ? (
                            <div className="flex items-center gap-3">
                                <img src={form._preview_url} alt="FAQ 附圖" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                                <button onClick={() => setForm(f => ({ ...f, image_id: '', _preview_url: '' }))}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50">
                                    <Trash2 size={12} /> 移除
                                </button>
                            </div>
                        ) : (
                            <label 
                                className="flex items-center gap-2 px-4 py-3 bg-white border border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-all"
                            >
                                {uploading ? <Loader2 size={16} className="animate-spin text-brand-500" /> : <Upload size={16} className="text-slate-400" />}
                                <span className="text-xs text-slate-500">{uploading ? '上傳中...' : '上傳附圖 (jpg/png/webp, 2MB)'}</span>
                                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    if (file.size > 2 * 1024 * 1024) { alert('圖片大小不可超過 2MB'); return; }
                                    setUploading(true);
                                    const fd = new FormData();
                                    fd.append('file', file);
                                    try {
                                        const res = await axios.post(`${config.API_URL}/api/admin/upload_image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                        setForm(f => ({ ...f, image_id: res.data.image_id, _preview_url: res.data.preview_url }));
                                    } catch { alert('圖片上傳失敗'); }
                                    finally { setUploading(false); }
                                }} />
                            </label>
                        )}
                    </div>
                </div>
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">取消</button>
                    <button onClick={handleSubmit}
                        disabled={!form.question.trim() || !form.answer.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <Plus size={16} />
                        新增
                    </button>
                </div>
            </div>
        </div>
    );
}
