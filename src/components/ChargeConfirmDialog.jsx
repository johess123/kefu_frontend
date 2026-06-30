import React, { useEffect } from 'react';
import { Coins } from 'lucide-react';
import { getFeaturePrice } from '../utils/pricing';

/**
 * 確認扣費彈窗：執行耗點功能前顯示「使用功能 / 消耗點數 / 目前餘額」。
 *
 * Props:
 *   isOpen       {boolean}
 *   featureKey   {string}   後端 feature_key（用於查定價）
 *   featureLabel {string}   功能中文名稱
 *   balance      {number}   目前餘額（coins）
 *   onConfirm    {function}
 *   onCancel     {function}
 */
export default function ChargeConfirmDialog({ isOpen, featureKey, featureLabel, balance, onConfirm, onCancel }) {
    // ESC 關閉
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const price = getFeaturePrice(featureKey);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Dialog */}
            <div
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center animate-[fadeInScale_0.15s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 點數圖示 */}
                <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                    <Coins size={30} className="text-amber-500" />
                </div>

                {/* 標題：使用功能 */}
                <h3 className="text-2xl font-black text-slate-800 mb-3">
                    確認使用 {featureLabel}？
                </h3>

                {/* 消耗點數 */}
                <p className="text-base text-slate-500 leading-relaxed">
                    此功能將會消耗 <span className="font-black text-amber-500">{price.toLocaleString()} 點</span>。
                </p>

                {/* 目前餘額 */}
                {typeof balance === 'number' && (
                    <p className="mt-1 text-base text-slate-500">
                        目前餘額：<span className="font-bold text-slate-700">{balance.toLocaleString()} 點</span>
                    </p>
                )}

                {/* 按鈕（維持原樣式） */}
                <div className="flex gap-2 mt-7 justify-center">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors"
                    >
                        確認扣費
                    </button>
                </div>
            </div>
        </div>
    );
}
