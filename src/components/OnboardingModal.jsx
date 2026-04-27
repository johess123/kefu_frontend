import React from 'react';
import { Bot, Bell, BookOpen } from 'lucide-react';
import TourModal, { TourHighlightBox, TourStepList, TourPathSteps, TourNote } from './TourModal';

const ONBOARDING_STEPS = [
    {
        icon: <Bot size={36} className="text-brand-600" />,
        iconBg: 'bg-brand-50',
        title: '歡迎使用 KeFu AI 客服平台！',
        content: (
            <>
                <p className="text-sm text-slate-600 leading-relaxed">
                    KeFu 讓您輕鬆建立一間「虛擬客服公司」，由 AI 擔任全天候客服人員，自動回覆顧客訊息。
                </p>
                <TourStepList numbered color="brand" items={[
                    '每一個「Agent」就是一位虛擬客服，可部署到您的 LINE 官方帳號',
                    '設定好 FAQ 知識庫後，AI 會依據內容自動回答顧客問題',
                    '遇到需要真人處理的情境，AI 會自動轉接並通知您的團隊成員',
                ]} />
            </>
        ),
    },
    {
        icon: <Bell size={36} className="text-amber-500" />,
        iconBg: 'bg-amber-50',
        badge: '重要',
        title: '設定「轉人工」通知接收者',
        content: (
            <>
                <TourHighlightBox color="amber">
                    ⚠️ 若未設定接收者，轉人工通知將靜默失敗，顧客的請求無人知道！
                </TourHighlightBox>
                <p className="text-sm text-slate-600 leading-relaxed">
                    當顧客輸入轉人工關鍵字時，AI 會自動通知您指定的真人客服。設定路徑：
                </p>
                <TourPathSteps color="amber" steps={[
                    '進入 Agent 後台',
                    '點選左側選單「AI 團隊管理」',
                    '點選「人機協作專員（Escalation Manager）」',
                    '在「通知設定」區塊指定接收者',
                ]} />
                <TourNote>提示：接收者需先主動傳送一則訊息給 Bot，才會顯示於列表中。</TourNote>
            </>
        ),
    },
    {
        icon: <BookOpen size={36} className="text-blue-600" />,
        iconBg: 'bg-blue-50',
        title: '如何編輯 FAQ 知識庫？',
        content: (
            <>
                <p className="text-sm text-slate-600 leading-relaxed">
                    FAQ 是 AI 回答問題的核心依據。若答案有誤或需要補充，請直接在後台修改。設定路徑：
                </p>
                <TourPathSteps color="blue" steps={[
                    '進入 Agent 後台',
                    '點選左側選單「AI 團隊管理」',
                    '點選「客服部專員（Knowledge Base）」',
                    '在「FAQ 知識庫管理」中新增或修改問答',
                ]} />
                <p className="text-sm text-slate-600 leading-relaxed">
                    完成設定後，AI 會立即使用最新的 FAQ 內容回答顧客。
                </p>
            </>
        ),
    },
];

const OnboardingModal = ({ isOpen, onClose }) => (
    <TourModal
        isOpen={isOpen}
        onClose={onClose}
        steps={ONBOARDING_STEPS}
        label="新手指引"
        finishLabel="完成設定，開始使用"
    />
);

export default OnboardingModal;
