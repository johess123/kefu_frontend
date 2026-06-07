import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, File, FileSpreadsheet, FileCode } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';

const getFileIconInfo = (fileName) => {
    if (!fileName) return { Icon: File, color: '#6B7280' };
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
        case 'xls':
        case 'xlsx':
        case 'csv':
            return { Icon: FileSpreadsheet, color: '#059669' };
        case 'json':
            return { Icon: FileCode, color: '#0F766E' };
        default:
            return { Icon: File, color: '#6B7280' };
    }
};

export default function ProductImportModal({ onClose, onConfirm, brandDescription = '', fieldSchema = [], agentId }) {
    const [tab, setTab] = useState('file');
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState('');
    const fileRef = useRef(null);
    const [isParsing, setIsParsing] = useState(false);
    const [preview, setPreview] = useState(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const dragCounter = useRef(0);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (tab === 'file' && !preview) {
            if (e.type === "dragenter") {
                dragCounter.current++;
                setIsDragActive(true);
            } else if (e.type === "dragleave") {
                dragCounter.current--;
                if (dragCounter.current <= 0) {
                    setIsDragActive(false);
                }
            }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        dragCounter.current = 0;
        if (tab === 'file' && !preview) {
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                const ext = file.name.toLowerCase().split('.').pop();
                if (!['xlsx', 'csv'].includes(ext)) {
                    alert('僅支援 .xlsx 或 .csv 格式');
                    return;
                }
                if (file.size > 512 * 1024) {
                    alert('檔案大小不得超過 500KB');
                    return;
                }
                setPreview(null);
                setFileName(file.name);
                if (fileRef.current) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileRef.current.files = dataTransfer.files;
                }
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const ext = file.name.toLowerCase().split('.').pop();
        if (!['xlsx', 'csv'].includes(ext)) {
            alert('僅支援 .xlsx 或 .csv 格式');
            if (fileRef.current) fileRef.current.value = '';
            return;
        }
        if (file.size > 512 * 1024) {
            alert('檔案大小不得超過 500KB');
            if (fileRef.current) fileRef.current.value = '';
            return;
        }
        
        setPreview(null);
        setFileName(file.name);
    };

    React.useEffect(() => {
        setIsDragActive(false);
        dragCounter.current = 0;
    }, [tab, preview]);

    const handleClose = () => {
        if (fileRef.current) fileRef.current.value = '';
        onClose();
    };

    const handleParse = async () => {
        setIsParsing(true);
        try {
            const fd = new FormData();
            fd.append('brandDescription', brandDescription);
            fd.append('line_user_id', Cookies.get('google_user_id') || '');
            fd.append('agent_id', agentId || '');
            if (fieldSchema.length > 0) {
                fd.append('field_schema', JSON.stringify(fieldSchema));
            }
            if (tab === 'file') {
                const file = fileRef.current?.files?.[0];
                if (!file) { alert('請選擇檔案'); setIsParsing(false); return; }
                if (file.size > 512 * 1024) { alert('檔案大小不得超過 500KB'); setIsParsing(false); return; }
                const ext = file.name.toLowerCase().split('.').pop();
                if (!['xlsx', 'csv'].includes(ext)) { alert('僅支援 .xlsx 或 .csv 格式'); setIsParsing(false); return; }
                fd.append('file', file);
            } else {
                if (!text.trim()) { alert('請貼上商品資料內容'); setIsParsing(false); return; }
                fd.append('text', text);
            }
            const res = await axios.post(`${config.API_URL}/api/parse_products`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.error) {
                alert('解析失敗：' + res.data.error);
            } else if (res.data.products) {
                setPreview(res.data.products);
                if (fileRef.current) fileRef.current.value = '';
            }
        } catch (err) {
            console.error('Product import failed:', err);
            alert('解析失敗，請稍後再試');
        } finally {
            setIsParsing(false);
        }
    };

    const updatePreview = (i, field, val) =>
        setPreview(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

    const removePreview = (i) =>
        setPreview(prev => prev.filter((_, idx) => idx !== i));

    const handleConfirm = () => {
        if (!preview?.length) return;
        const newProducts = preview.map(p => ({
            id: Math.random().toString(36).substr(2, 9),
            name: p.name || '',
            description: p.description || '',
            keywords: p.keywords || '',
            custom_fields: p.custom_fields || {},
        }));
        onConfirm(newProducts);
        onClose();
    };

    return (
        <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" 
            onClick={handleClose}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                {isDragActive && (
                    <div className="absolute inset-0 bg-brand-500/10 backdrop-blur-[2px] border-4 border-dashed border-brand-500 rounded-2xl z-50 flex flex-col items-center justify-center pointer-events-none transition-all duration-150">
                        <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-3">
                            <Upload size={32} className="text-brand-600 animate-bounce" />
                        </div>
                        <p className="text-sm font-bold text-brand-700">放開檔案以進行解析</p>
                    </div>
                )}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">匯入商品</h3>
                        <p className="text-xs text-slate-400 mt-0.5">AI 自動解析並整理為商品目錄格式</p>
                    </div>
                    <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                </div>
                <div className="flex border-b border-slate-100 flex-shrink-0">
                    <button onClick={() => { setTab('file'); setPreview(null); setFileName(''); }} className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'file' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-600'}`}>上傳檔案</button>
                    <button onClick={() => { setTab('text'); setPreview(null); setFileName(''); }} className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'text' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-600'}`}>貼上文字</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {tab === 'file' && !preview && (
                        <div>
                            <label 
                                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                                    fileName 
                                        ? 'border-brand-400 bg-brand-50/50' 
                                        : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/30'
                                }`}
                            >
                                {fileName ? (
                                    (() => {
                                        const { Icon, color } = getFileIconInfo(fileName);
                                        return (
                                            <>
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${color}15` }}>
                                                    <Icon size={20} style={{ color }} />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 max-w-[240px] truncate px-2">{fileName}</span>
                                                <span className="text-xs text-slate-400 mt-1">點擊可重新選擇</span>
                                            </>
                                        );
                                    })()
                                ) : (
                                    <>
                                        <Upload size={28} className="text-slate-300 mb-2" />
                                        <span className="text-sm font-semibold text-slate-500">點擊選擇或拖放檔案</span>
                                        <span className="text-xs text-slate-400 mt-1">支援 .xlsx / .csv，最大 500KB</span>
                                    </>
                                )}
                                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
                            </label>
                            <p className="text-xs text-slate-400 mt-3 text-center">AI 會自動識別商品名稱與說明，每次最多解析 50 項</p>
                        </div>
                    )}
                    {tab === 'text' && !preview && (
                        <div>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                maxLength={30000}
                                placeholder={'請貼上商品資料...\n\n例如：\n商品名稱：無線藍牙耳機\n說明：支援主動降噪，續航 30 小時\n\n商品名稱：手機殼\n說明：適用 iPhone 15，矽膠材質'}
                                className="w-full h-52 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4 resize-none outline-none focus:border-brand-400 focus:bg-white transition-colors"
                            />
                            <div className="text-[10px] text-slate-300 text-right">{text.length}/30000</div>
                            <p className="text-xs text-slate-400 mt-2">AI 會自動識別商品結構，支援各種常見格式</p>
                        </div>
                    )}
                    {preview && (
                        <div>
                            <p className="text-sm font-semibold text-slate-700 mb-3">解析結果：共 {preview.length} 項商品 <span className="text-xs font-normal text-slate-400">（可直接編輯或刪除）</span></p>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {preview.map((p, i) => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2">
                                        <div className="flex items-center justify-end">
                                            <button onClick={() => removePreview(i)} className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors" title="移除此商品">
                                                <X size={13} />
                                            </button>
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={p.name}
                                                maxLength={50}
                                                onChange={(e) => updatePreview(i, 'name', e.target.value)}
                                                className="w-full text-sm font-semibold text-slate-800 bg-transparent border-b border-slate-100 focus:border-brand-400 outline-none py-0.5 transition-colors"
                                                placeholder="商品名稱..."
                                            />
                                            <div className="text-[10px] text-slate-300 text-right">{p.name?.length || 0}/50</div>
                                        </div>
                                        <div>
                                            <textarea
                                                rows={2}
                                                value={p.description}
                                                maxLength={400}
                                                onChange={(e) => updatePreview(i, 'description', e.target.value)}
                                                className="w-full text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5 resize-none outline-none focus:bg-white focus:ring-1 focus:ring-brand-200 transition-colors"
                                                placeholder="商品說明..."
                                            />
                                            <div className="text-[10px] text-slate-300 text-right">{p.description?.length || 0}/400</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
                    <button onClick={handleClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">取消</button>
                    {!preview ? (
                        <button
                            onClick={handleParse}
                            disabled={isParsing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-50"
                        >
                            {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {isParsing ? 'AI 解析中...' : '開始解析'}
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={() => setPreview(null)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">重新解析</button>
                            <button onClick={handleConfirm} disabled={!preview?.length} className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-40">
                                {preview?.length ? `加入商品庫（${preview.length} 項）` : '已無可加入的商品'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
