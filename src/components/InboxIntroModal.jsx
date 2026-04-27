import React from 'react';
import { MessageSquare, Send } from 'lucide-react';
import TourModal, { TourStepList, TourNote } from './TourModal';

const STEPS = [
    {
        icon: <MessageSquare size={36} className="text-blue-600" />,
        iconBg: 'bg-blue-50',
        title: '什麼是對話收件匣？',
        content: (
            <>
                <p className="text-sm text-slate-600 leading-relaxed">
                    當顧客在 LINE 或 Telegram 觸發「轉人工」後，對話會自動流入這裡，等待真人客服接手處理。
                </p>
                <TourStepList color="blue" items={[
                    '「待處理」分頁：尚未結案、需要回覆的對話',
                    '「已結案」分頁：已完成處理的歷史紀錄',
                    '支援 LINE 與 Telegram 雙渠道，統一在此管理',
                ]} />
            </>
        ),
    },
    {
        icon: <Send size={36} className="text-green-600" />,
        iconBg: 'bg-green-50',
        title: '如何回覆客戶？',
        content: (
            <>
                <TourStepList numbered color="green" items={[
                    '點選左側列表中的對話，查看完整訊息紀錄',
                    '在下方輸入框輸入回覆內容',
                    '點擊送出，訊息即時推播到客戶的 LINE 或 Telegram',
                    '處理完畢後可將對話標為「已結案」',
                ]} />
                <TourNote>提示：LINE 推播訊息有每月配額限制，可在頁面頂部查看目前用量。</TourNote>
            </>
        ),
    },
];

const InboxIntroModal = ({ isOpen, onClose }) => (
    <TourModal
        isOpen={isOpen}
        onClose={onClose}
        steps={STEPS}
        label="功能介紹"
        finishLabel="開始使用"
    />
);

export default InboxIntroModal;
