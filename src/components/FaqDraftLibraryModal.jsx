import React, { useState, useMemo, useEffect } from 'react';
import { Archive, X, Search, Pencil, ArrowUpCircle, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { FAQ_MAX_COUNT } from '../utils/faqUtils';

/**
 * 備用草稿庫管理視窗。
 *
 * 草稿不會被 AI 使用、也不佔正式 FAQ 額度，所以刻意不設數量上限；
 * 也因為不設上限，搜尋框是必要而非加分項 —— 沒有它，累積幾百筆後這個
 * 視窗就沒法用了。
 *
 * 本元件是純呈現：不改資料、不做移轉，只把意圖往父層拋。
 */
export default function FaqDraftLibraryModal({
    open,
    drafts = [],
    faqCount = 0,
    onClose,
    onEdit,
    onRestore,
    onDelete,
    onPreviewImage,
}) {
    const [keyword, setKeyword] = useState('');
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    // 這個元件是常駐掛載的（open 只是切換 render），關閉不會讓 state 消失。
    // 不重置的話，再次開啟會沿用上次的搜尋字，商家看到的是一個沒有解釋的空清單。
    useEffect(() => {
        if (open) setKeyword('');
    }, [open]);

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return drafts;
        return drafts.filter(d =>
            (d.question || '').toLowerCase().includes(kw) ||
            (d.answer || '').toLowerCase().includes(kw) ||
            (d.category || '').toLowerCase().includes(kw)
        );
    }, [drafts, keyword]);

    const grouped = useMemo(() => {
        const map = new Map();
        filtered.forEach(d => {
            const cat = d.category || '常見問題';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat).push(d);
        });
        return [...map.entries()];
    }, [filtered]);

    if (!open) return null;

    const toggleCat = (cat) => setCollapsed(prev => {
        const next = new Set(prev);
        next.has(cat) ? next.delete(cat) : next.add(cat);
        return next;
    });

    const toggleItem = (id) => setExpandedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const quotaFull = faqCount >= FAQ_MAX_COUNT;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

                <div className="p-6 sm:p-8 border-b border-slate-100 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                            <Archive size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-slate-800">備用草稿庫</h2>
                            <p className="text-slate-400 text-xs mt-0.5">
                                不會被 AI 使用，也不佔正式 FAQ 額度 · 共 {drafts.length} 組
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {drafts.length > 0 && (
                    <div className="px-6 sm:px-8 py-4 border-b border-slate-100 bg-slate-50/40">
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="搜尋問題、回答或分類..."
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                            />
                        </div>
                        {quotaFull && (
                            <p className="text-xs text-amber-600 mt-3">
                                正式 FAQ 已達 {FAQ_MAX_COUNT} 組上限，需要先將一組目前不使用的 FAQ 移至此處，才能加入新的。
                            </p>
                        )}
                    </div>
                )}

                <div className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                    {drafts.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Archive size={30} className="text-slate-200" />
                            </div>
                            <p className="text-sm text-slate-500 px-6 leading-relaxed">
                                尚無備用草稿。您可以將暫時不使用的正式 FAQ 移至此處保存。
                            </p>
                        </div>
                    ) : grouped.length === 0 ? (
                        <div className="text-center py-16 text-sm text-slate-400">
                            找不到符合「{keyword}」的草稿。
                        </div>
                    ) : grouped.map(([cat, items]) => {
                        const isOpen = !collapsed.has(cat);
                        return (
                            <div key={cat} className="border border-slate-200 rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 cursor-pointer select-none" onClick={() => toggleCat(cat)}>
                                    {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                    <span className="flex-1 font-bold text-slate-700 text-sm truncate">{cat}</span>
                                    <span className="text-xs text-slate-400">{items.length} 組</span>
                                </div>
                                {isOpen && (
                                    <div className="p-4 space-y-4">
                                        {items.map(draft => {
                                            const itemOpen = expandedIds.has(draft.id);
                                            return (
                                                <div key={draft.id} className="border border-slate-100 rounded-2xl overflow-hidden hover:border-amber-200 transition-all">
                                                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/70 select-none" onClick={() => toggleItem(draft.id)}>
                                                        <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 max-w-[90px] truncate">{cat}</span>
                                                        <span className="flex-1 text-sm font-semibold text-slate-700 truncate min-w-0">{draft.question}</span>
                                                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                            <button onClick={() => onEdit(draft)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-brand-600 rounded-lg transition-all" title="編輯">
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button onClick={() => onRestore(draft)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-emerald-600 rounded-lg transition-all" title="加入正式 FAQ">
                                                                <ArrowUpCircle size={14} />
                                                            </button>
                                                            <button onClick={() => onDelete(draft)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-lg transition-all" title="永久刪除">
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${itemOpen ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    {itemOpen && (
                                                        <div className="px-4 sm:px-6 pb-5 pt-3 space-y-4 border-t border-slate-100">
                                                            <div>
                                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Answer</div>
                                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{draft.answer}</p>
                                                            </div>
                                                            {draft.image_id && (
                                                                <div>
                                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Image</div>
                                                                    <img
                                                                        src={draft._preview_url || draft.preview_url || ''}
                                                                        alt="草稿附圖"
                                                                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:opacity-90"
                                                                        onClick={() => onPreviewImage?.(draft._preview_url || draft.preview_url || '')}
                                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex flex-wrap gap-2 pt-1">
                                                                <button onClick={() => onEdit(draft)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50">
                                                                    <Pencil size={13} />編輯
                                                                </button>
                                                                <button onClick={() => onRestore(draft)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-50">
                                                                    <ArrowUpCircle size={13} />加入正式 FAQ
                                                                </button>
                                                                <button onClick={() => onDelete(draft)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50">
                                                                    <Trash2 size={13} />永久刪除
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="px-6 sm:px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">關閉</button>
                </div>
            </div>
        </div>
    );
}
