import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const NotifyBanner = ({ onDismiss }) => (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">尚未設定通知接收者</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    顧客發出「轉人工」請求時，系統找不到任何接收者，通知將靜默失敗。
                    請在下方「通知設定」區塊，指定至少一位 LINE 或 Telegram 接收者。
                </p>
            </div>
            <button
                onClick={onDismiss}
                className="p-1 text-amber-400 hover:text-amber-600 transition-colors shrink-0"
            >
                <X size={16} />
            </button>
        </div>
    </div>
);

export default NotifyBanner;
