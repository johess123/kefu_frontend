import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * 圖片燈箱（點擊放大檢視）
 *
 * Props:
 *   isOpen  {boolean}  是否顯示
 *   src     {string}   圖片 URL
 *   alt     {string}   圖片 alt 文字
 *   onClose {function} 關閉 callback
 */
export default function ImageLightbox({ isOpen, src, alt = '圖片', onClose }) {
    // ESC 關閉
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen || !src) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* 關閉按鈕 */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            >
                <X size={18} />
            </button>

            {/* 圖片 */}
            <img
                src={src}
                alt={alt}
                className="relative max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain animate-[fadeInScale_0.2s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}
