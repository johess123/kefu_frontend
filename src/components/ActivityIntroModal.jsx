import React from 'react';
import { Activity, Search } from 'lucide-react';
import TourModal, { TourStepList, TourNote } from './TourModal';

const STEPS = [
    {
        icon: <Activity size={36} className="text-purple-600" />,
        iconBg: 'bg-purple-50',
        title: '什麼是團隊運作日誌？',
        content: (
            <>
                <p className="text-sm text-slate-600 leading-relaxed">
                    AI 虛擬團隊每次執行動作時都會即時記錄在這裡，讓您完整掌握每筆對話的處理過程。
                </p>
                <TourStepList color="brand" items={[
                    '查看哪位 AI 專員負責處理這則訊息',
                    '比對到哪條 FAQ、推理過程與最終回覆內容',
                    '轉人工的時機點與觸發原因',
                    '對話分析師自動生成 FAQ 缺口建議的過程',
                ]} />
            </>
        ),
    },
    {
        icon: <Search size={36} className="text-slate-600" />,
        iconBg: 'bg-slate-50',
        title: '如何解讀日誌？',
        content: (
            <>
                <p className="text-sm text-slate-600 leading-relaxed">
                    點擊任一紀錄卡片可展開完整細節：
                </p>
                <TourStepList numbered color="slate" items={[
                    '觸發訊息（顧客說了什麼）',
                    'AI 推理鏈（比對哪條 FAQ、判斷邏輯）',
                    '最終動作（回覆內容或轉人工通知）',
                    '耗時與 Token 用量統計',
                ]} />
                <TourNote>可依來源（LINE／Telegram）或動作類型（回覆／轉人工／分析）篩選紀錄。</TourNote>
            </>
        ),
    },
];

const ActivityIntroModal = ({ isOpen, onClose }) => (
    <TourModal
        isOpen={isOpen}
        onClose={onClose}
        steps={STEPS}
        label="功能介紹"
        finishLabel="開始使用"
    />
);

export default ActivityIntroModal;
