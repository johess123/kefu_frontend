import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * 共用確認彈窗
 *
 * Props:
 *   isOpen      {boolean}  是否顯示
 *   title       {string}   標題
 *   message     {string}   說明文字
 *   confirmText {string}   確認按鈕文字（預設「確認」）
 *   cancelText  {string}   取消按鈕文字（預設「取消」）
 *   variant     {string}   'danger' | 'default'（預設 'danger'）
 *   zIndexClass {string}   外層 z-index class（預設 'z-50'；疊在其他 modal 上時傳更高值）
 *   onConfirm   {function} 點擊確認的 callback
 *   onCancel    {function} 點擊取消或背景的 callback
 */
export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = '確認',
    cancelText = '取消',
    variant = 'danger',
    zIndexClass = 'z-50',
    onConfirm,
    onCancel,
}) {
    // ESC 關閉
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <div
            className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4`}
            onClick={onCancel}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Dialog */}
            <div
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-[fadeInScale_0.15s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 關閉按鈕 */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={16} />
                </button>

                {/* 圖示 + 標題 */}
                <div className="flex items-start gap-3 mb-3">
                    {isDanger && (
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle size={18} className="text-red-500" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-bold text-slate-800">{title}</h3>
                        {message && (
                            <p className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</p>
                        )}
                    </div>
                </div>

                {/* 按鈕 */}
                <div className="flex gap-2 mt-5 justify-end">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors ${
                            isDanger
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-brand-500 hover:bg-brand-600'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
