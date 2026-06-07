import React, { useState, useEffect, useRef } from 'react';
import { Package, X, Plus, Upload, Trash2, Loader2 } from 'lucide-react';
import axios from 'axios';
import config from '../config';

export default function ProductAddModal({ open, onClose, onSubmit }) {
    const [form, setForm] = useState({ name: '', description: '', keywords: '', image_id: '', _preview_url: '' });
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
            setForm({ name: '', description: '', keywords: '', image_id: '', _preview_url: '' });
            setUploading(false);
            setIsDragActive(false);
            dragCounter.current = 0;
        }
    }, [open]);

    if (!open) return null;

    const handleSubmit = () => {
        onSubmit({ ...form });
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
                    <div className="absolute inset-0 bg-green-500/10 backdrop-blur-[2px] border-4 border-dashed border-green-500 rounded-[32px] z-50 flex flex-col items-center justify-center pointer-events-none transition-all duration-150">
                        <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-3">
                            <Upload size={32} className="text-green-600 animate-bounce" />
                        </div>
                        <p className="text-sm font-bold text-green-700">放開圖片以進行上傳</p>
                    </div>
                )}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100">
                            <Package size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">新增商品</h2>
                            <p className="text-slate-400 text-xs mt-0.5">建立一筆商品資料</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">商品名稱</label>
                        <input type="text" value={form.name} maxLength={50}
                            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="輸入商品名稱..."
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-800 font-bold text-base focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all" />
                        <div className="text-[10px] text-slate-300 text-right">{form.name.length}/50</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">菜單/規格說明</label>
                        <textarea value={form.description} maxLength={400}
                            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="輸入商品說明、規格、價格等..."
                            className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-slate-600 text-sm leading-relaxed min-h-[120px] focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all resize-none" />
                        <div className="text-[10px] text-slate-300 text-right">{form.description.length}/400</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">關鍵字/別名 (選填)</label>
                        <input type="text" value={form.keywords} maxLength={100}
                            onChange={(e) => setForm(f => ({ ...f, keywords: e.target.value }))}
                            placeholder="例：珍奶、波霸、大杯紅茶..."
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-600 text-sm focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all" />
                        <div className="text-[10px] text-slate-300 text-right">{(form.keywords || '').length}/100</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">商品圖片 <span className="text-slate-300 normal-case">(選填)</span></label>
                        {form.image_id ? (
                            <div className="flex items-center gap-3">
                                <img src={form._preview_url} alt="商品附圖" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                                <button onClick={() => setForm(f => ({ ...f, image_id: '', _preview_url: '' }))}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all">
                                    <Trash2 size={14} /> 移除圖片
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center gap-2 px-4 py-3 bg-white border border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-green-300 hover:bg-green-50/50 transition-all">
                                {uploading ? <Loader2 size={16} className="animate-spin text-green-500" /> : <Upload size={16} className="text-slate-400" />}
                                <span className="text-xs text-slate-500">{uploading ? '上傳中...' : '上傳圖片 (jpg/png/webp, 2MB)'}</span>
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
                                    } catch {
                                        alert('圖片上傳失敗');
                                    } finally {
                                        setUploading(false);
                                    }
                                }} />
                            </label>
                        )}
                    </div>
                </div>
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">取消</button>
                    <button onClick={handleSubmit}
                        disabled={!form.name.trim() || !form.description.trim() || uploading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <Plus size={16} />
                        新增
                    </button>
                </div>
            </div>
        </div>
    );
}
