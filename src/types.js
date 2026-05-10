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
    CUSTOM: '自定義',
};

export const TONE_PROMPTS = {
    '親切有溫度': '以親切有溫度的語氣回覆，保持溫暖、關懷的態度，讓客戶感受到被重視與理解。',
    '專業簡潔': '以專業簡潔的語氣回覆，提供精確、有條理的資訊，避免過多寒暄。',
    '像朋友聊天': '以輕鬆自然的朋友語氣回覆，親近隨和，拉近與客戶的距離。',
    '活潑可愛': '以活潑可愛的語氣回覆，使用生動有趣的表達方式，讓對話更有活力。',
    '自定義': '',
};

export const DEFAULT_FORM_DATA = {
    businessName: '',
    servicesDescription: '',
    websiteUrl: '',
    tone: ToneType.WARM,
    toneAvoid: '',
    toneCustom: '',
    faqs: [],
    products: [],
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
