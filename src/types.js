export const AppStep = {
    WIZARD: 1,
    REVIEW: 2,
    DEMO: 3,
    DEPLOY: 4,
};

export const ToneType = {
    WARM: '親切有溫度',
    PROFESSIONAL: '專業簡潔',
    FRIENDLY: '像朋友聊天',
    LIVELY: '活潑可愛',
};

export const DEFAULT_FORM_DATA = {
    brandDescription: '',
    websiteUrl: '',
    tone: ToneType.WARM,
    toneAvoid: '',
    faqs: [],
    handoffTriggers: [],
    handoffCustomTrigger: '',
};

export const DEFAULT_HANDOFF_OPTIONS = [
    '客訴/負評/情緒激動',
    '退款/退貨/爭議款項',
    '客製/報價（需要人工判斷）',
    '合作邀約/媒體採訪/B2B',
    '催單/急件（需要查狀態）',
];
