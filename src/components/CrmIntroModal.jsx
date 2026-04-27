import React from 'react';
import { Users, Tag } from 'lucide-react';
import TourModal, { TourStepList, TourNote } from './TourModal';

const STEPS = [
    {
        icon: <Users size={36} className="text-orange-500" />,
        iconBg: 'bg-orange-50',
        title: '什麼是客戶管理？',
        content: (
            <>
                <p className="text-sm text-slate-600 leading-relaxed">
                    所有曾透過 LINE 或 Telegram 與您的 AI 客服互動過的用戶，都會自動彙整在這裡。
                </p>
                <TourStepList color="amber" items={[
                    '查看每位客戶的基本資料與互動渠道',
                    '瀏覽該客戶與 AI 的歷史對話紀錄',
                    '支援 LINE 與 Telegram 雙渠道用戶統一管理',
                ]} />
            </>
        ),
    },
    {
        icon: <Tag size={36} className="text-yellow-500" />,
        iconBg: 'bg-yellow-50',
        title: '你能做什麼？',
        content: (
            <>
                <TourStepList numbered color="brand" items={[
                    '為客戶加上自訂標籤，方便分群管理',
                    '寫下私人備註，記錄重要溝通細節',
                    '主動發送 Flex Message 到客戶的 LINE，不需等待客戶先傳訊息',
                ]} />
                <TourNote>點擊客戶列表中的任一筆資料，即可開啟詳細抽屜進行操作。</TourNote>
            </>
        ),
    },
];

const CrmIntroModal = ({ isOpen, onClose }) => (
    <TourModal
        isOpen={isOpen}
        onClose={onClose}
        steps={STEPS}
        label="功能介紹"
        finishLabel="開始使用"
    />
);

export default CrmIntroModal;
