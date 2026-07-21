import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';
import { Send, X, Check, Loader2 } from 'lucide-react';

export const FLEX_TEMPLATE_OPTIONS = [
    { id: 'renewal', label: '續保提醒', description: '到期提醒與續保 CTA' },
    { id: 'birthday', label: '生日祝福', description: '祝福訊息與專屬優惠' },
    { id: 'notice', label: '一般通知', description: '通用公告與活動訊息' },
];

export const FLEX_BUTTON_TYPE_OPTIONS = [
    { value: 'uri', label: '開啟網址' },
    { value: 'message', label: '傳送文字訊息' },
];

export const DEFAULT_FLEX_THEME_COLOR = '#1F7AE0';
export const FLEX_COLOR_PRESETS = [
    '#1F7AE0',
    '#0F766E',
    '#D97706',
    '#BE185D',
    '#7C3AED',
    '#1D4ED8',
];

export const normalizeFlexHexColor = (value) => {
    const raw = String(value || DEFAULT_FLEX_THEME_COLOR).trim();
    if (!raw) return DEFAULT_FLEX_THEME_COLOR;
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : DEFAULT_FLEX_THEME_COLOR;
};

const hexToRgb = (hex) => {
    const normalized = normalizeFlexHexColor(hex).replace('#', '');
    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
    };
};

const rgbToHex = ({ r, g, b }) =>
    `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const mixWithWhite = (hex, ratio) => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex({
        r: r + (255 - r) * ratio,
        g: g + (255 - g) * ratio,
        b: b + (255 - b) * ratio,
    });
};

const getContrastTextColor = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 170 ? '#111827' : '#FFFFFF';
};

const getFlexThemePalette = (themeColor) => {
    const primary = normalizeFlexHexColor(themeColor);
    const primaryText = getContrastTextColor(primary);
    const { r, g, b } = hexToRgb(primary);

    return {
        primary,
        primaryText,
        primaryMutedText: primaryText === '#FFFFFF' ? mixWithWhite(primary, 0.78) : '#E5E7EB',
        secondaryBg: mixWithWhite(primary, 0.9),
        secondaryText: primary,
        tintBg: mixWithWhite(primary, 0.93),
        tintText: primary,
        shellGlow: `rgba(${r}, ${g}, ${b}, 0.18)`,
        previewBg: `linear-gradient(180deg, ${mixWithWhite(primary, 0.82)} 0%, #F8FBFF 35%, ${mixWithWhite(primary, 0.9)} 100%)`,
    };
};

export const FLEX_TEMPLATE_FIELDS = {
    renewal: [
        { name: 'brand_name', label: '品牌名稱', placeholder: '例如：KeFu 保險', maxLength: 30 },
        { name: 'customer_name', label: '客戶稱呼', placeholder: '例如：王大明', maxLength: 30 },
        { name: 'expiry_date', label: '到期日期', placeholder: '例如：2027-02-22', maxLength: 30, type: 'date' },
        { name: 'headline', label: '標題', placeholder: '例如：保單到期提醒', maxLength: 40 },
        { name: 'body_text', label: '提醒內容', placeholder: '輸入提醒說明...', maxLength: 160, multiline: true },
    ],
    birthday: [
        { name: 'brand_name', label: '品牌名稱', placeholder: '例如：KeFu 保險', maxLength: 30 },
        { name: 'customer_name', label: '客戶稱呼', placeholder: '例如：王大明', maxLength: 30 },
        { name: 'headline', label: '祝福標題', placeholder: '例如：生日快樂', maxLength: 40 },
        { name: 'body_text', label: '祝福內容', placeholder: '輸入祝福內容...', maxLength: 160, multiline: true },
        { name: 'offer_text', label: '補充優惠', placeholder: '例如：本月享有生日專屬優惠', maxLength: 80, multiline: true },
    ],
    notice: [
        { name: 'brand_name', label: '品牌名稱', placeholder: '例如：KeFu 保險', maxLength: 30 },
        { name: 'headline', label: '標題', placeholder: '例如：服務通知', maxLength: 40 },
        { name: 'subheadline', label: '副標', placeholder: '例如：重要提醒', maxLength: 50 },
        { name: 'body_text', label: '通知內容', placeholder: '輸入通知內容...', maxLength: 180, multiline: true },
    ],
};

export const getFlexInitialFormData = (templateType, userName = '', brandName = '') => {
    const safeName = userName || '{{name}}';

    if (templateType === 'renewal') {
        return {
            theme_color: DEFAULT_FLEX_THEME_COLOR,
            brand_name: brandName,
            customer_name: safeName,
            expiry_date: '',
            headline: '保單到期提醒',
            body_text: '您的保單即將到期，請盡快與我們聯繫續保，避免保障中斷。',
            primary_button_label: '立即聯繫專員',
            primary_button_type: 'uri',
            primary_button_value: 'https://line.me/',
            secondary_button_label: '我要詢問',
            secondary_button_type: 'message',
            secondary_button_value: '您好，我想詢問續保內容',
        };
    }

    if (templateType === 'birthday') {
        return {
            theme_color: DEFAULT_FLEX_THEME_COLOR,
            brand_name: brandName,
            customer_name: safeName,
            headline: '生日快樂',
            body_text: '祝您生日快樂，願您平安順心，也謝謝您一直以來的信任與支持。',
            offer_text: '回覆這則訊息即可了解本月專屬祝福內容。',
            primary_button_label: '查看祝福內容',
            primary_button_type: 'uri',
            primary_button_value: 'https://line.me/',
            secondary_button_label: '我要詢問',
            secondary_button_type: 'message',
            secondary_button_value: '您好，我想了解生日祝福內容',
        };
    }

    return {
        theme_color: DEFAULT_FLEX_THEME_COLOR,
        brand_name: brandName,
        headline: '一般通知',
        subheadline: '最新訊息',
        body_text: '這裡是要通知客戶的重要內容，您可以自訂這段文字。',
        primary_button_label: '查看詳情',
        primary_button_type: 'uri',
        primary_button_value: 'https://line.me/',
        secondary_button_label: '回覆訊息',
        secondary_button_type: 'message',
        secondary_button_value: '您好，我收到了通知，想進一步了解',
    };
};

export const mergeSharedFlexFields = (templateType, defaults, previousFormData) => {
    if (!previousFormData) return defaults;

    const merged = { ...defaults };
    const sharedKeys = [
        'theme_color',
        'brand_name',
        'primary_button_label',
        'primary_button_type',
        'primary_button_value',
        'secondary_button_label',
        'secondary_button_type',
        'secondary_button_value',
    ];

    sharedKeys.forEach((key) => {
        if (previousFormData[key] !== undefined) merged[key] = previousFormData[key];
    });

    if (templateType !== 'notice' && previousFormData.customer_name !== undefined) {
        merged.customer_name = previousFormData.customer_name;
    }

    if (templateType === 'renewal' && previousFormData.expiry_date !== undefined) {
        merged.expiry_date = previousFormData.expiry_date;
    }

    return merged;
};

const getFlexPreviewModel = (templateType, formData, userName, brandName) => {
    const safeBrandName = formData.brand_name?.trim() || brandName || '品牌通知';
    const safeUserName = formData.customer_name?.trim() || userName || '客戶';
    const headline = formData.headline?.trim() || FLEX_TEMPLATE_OPTIONS.find(item => item.id === templateType)?.label || '通知';
    const bodyText = formData.body_text?.trim() || '請在左側輸入內容。';

    if (templateType === 'renewal') {
        return {
            brandName: safeBrandName,
            badge: '續保提醒',
            title: headline,
            subtitle: '保單到期提醒',
            greeting: `${safeUserName} 您好，`,
            body: bodyText,
            accentLabel: '保單到期日',
            accentValue: formData.expiry_date?.trim() || '{{date}}',
        };
    }

    if (templateType === 'birthday') {
        return {
            brandName: safeBrandName,
            badge: '生日祝福',
            title: headline,
            subtitle: '生日快樂',
            greeting: `${safeUserName}，生日快樂！`,
            body: bodyText,
            accentLabel: '生日專屬內容',
            accentValue: formData.offer_text?.trim() || '可在這裡補充優惠或祝福內容',
        };
    }

    return {
        brandName: safeBrandName,
        badge: '一般通知',
        title: headline,
        subtitle: formData.subheadline?.trim() || '最新訊息',
        greeting: null,
        body: bodyText,
        accentLabel: null,
        accentValue: null,
    };
};

export const FlexPreviewCard = ({ templateType, formData, userName, brandName, showSecondaryButton = true }) => {
    const preview = getFlexPreviewModel(templateType, formData, userName, brandName);
    const palette = getFlexThemePalette(formData.theme_color);

    return (
        <div className="mx-auto w-full max-w-[320px] rounded-[36px] bg-slate-900 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="rounded-[28px] p-4" style={{ background: palette.previewBg }}>
                <div className="mb-3 flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>LINE 預覽</span>
                    <span>{preview.badge}</span>
                </div>
                <div className="overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: `0 22px 44px ${palette.shellGlow}` }}>
                    <div className="px-5 py-4" style={{ backgroundColor: palette.primary, color: palette.primaryText }}>
                        <div className="text-[28px] leading-none">◉</div>
                        <div className="mt-2 text-2xl font-black tracking-tight">{preview.brandName}</div>
                        <div className="mt-1 text-sm" style={{ color: palette.primaryMutedText }}>{preview.subtitle}</div>
                    </div>
                    <div className="space-y-4 px-5 py-5">
                        <div className="text-2xl font-black leading-tight text-slate-900">{preview.title}</div>
                        {preview.greeting && (
                            <div className="text-lg font-bold text-slate-900">{preview.greeting}</div>
                        )}
                        <div className="text-base leading-8 text-slate-600 whitespace-pre-wrap">{preview.body}</div>
                        {preview.accentLabel && (
                            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: palette.secondaryBg, backgroundColor: palette.tintBg }}>
                                <div className="text-xs font-bold tracking-widest" style={{ color: palette.tintText }}>{preview.accentLabel}</div>
                                <div className="mt-1 text-lg font-black text-slate-900">{preview.accentValue}</div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3 px-5 pb-5">
                        <div className="rounded-2xl px-4 py-3 text-center text-base font-bold" style={{ backgroundColor: palette.primary, color: palette.primaryText }}>
                            {formData.primary_button_label?.trim() || '主按鈕'}
                        </div>
                        {showSecondaryButton && formData.secondary_button_label?.trim() && (
                            <div className="rounded-2xl px-4 py-3 text-center text-base font-bold" style={{ backgroundColor: palette.secondaryBg, color: palette.secondaryText }}>
                                {formData.secondary_button_label.trim()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * 發送 Flex Message 的全螢幕 Modal（限 LINE 用戶）。
 * 自行管理表單狀態並呼叫既有 API：
 * POST /api/inbox/agents/{agent_id}/members/{line_id}/flex-message
 */
export default function FlexMessageModal({ user, currentAgent, onClose }) {
    const agentBrandName = currentAgent?.config?.raw_config?.merchant_name || currentAgent?.name || '';
    const [flexTemplateType, setFlexTemplateType] = useState('renewal');
    const [flexFormData, setFlexFormData] = useState(() =>
        getFlexInitialFormData('renewal', user?.user_name || '', agentBrandName)
    );
    const [isSecondaryFlexButtonEnabled, setIsSecondaryFlexButtonEnabled] = useState(() => {
        const initial = getFlexInitialFormData('renewal', user?.user_name || '', agentBrandName);
        return Boolean(initial.secondary_button_label || initial.secondary_button_value);
    });
    const [isSendingFlexMessage, setIsSendingFlexMessage] = useState(false);
    const [flexModalError, setFlexModalError] = useState('');

    if (!user) return null;

    const handleFlexTemplateChange = (templateType) => {
        setFlexTemplateType(templateType);
        setFlexFormData((prev) =>
            mergeSharedFlexFields(templateType, getFlexInitialFormData(templateType, user?.user_name || ''), prev)
        );
        setFlexModalError('');
    };

    const handleFlexFieldChange = (fieldName, value) => {
        setFlexFormData(prev => ({ ...prev, [fieldName]: value }));
        if (flexModalError) setFlexModalError('');
    };

    const handleSendFlexMessage = async () => {
        setIsSendingFlexMessage(true);
        setFlexModalError('');
        const sendFormData = {
            ...flexFormData,
            theme_color: normalizeFlexHexColor(flexFormData.theme_color),
        };
        if (!isSecondaryFlexButtonEnabled) {
            sendFormData.secondary_button_label = '';
            sendFormData.secondary_button_type = '';
            sendFormData.secondary_button_value = '';
        }
        try {
            await axios.post(
                `${config.API_URL}/api/inbox/agents/${currentAgent._id}/members/${user.line_id}/flex-message?userId=${currentAgent.admin_id}`,
                {
                    template_type: flexTemplateType,
                    form_data: sendFormData,
                }
            );
            alert('Flex Message 已成功發送');
            onClose();
        } catch (error) {
            console.error('Failed to send Flex Message:', error);
            setFlexModalError(error?.response?.data?.detail || '發送失敗，請稍後再試');
        } finally {
            setIsSendingFlexMessage(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600">
                            <Send size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">發送 Flex Message</h2>
                            <p className="mt-0.5 text-xs text-slate-400">
                                收件人：{user.user_name} ({user.line_id})
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid max-h-[calc(90vh-84px)] grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.2fr)_380px]">
                    <div className="space-y-6 p-6 md:p-8">
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">選擇模板</h3>
                                <div className="text-[10px] font-bold text-slate-300">固定模板 MVP</div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                {FLEX_TEMPLATE_OPTIONS.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleFlexTemplateChange(template.id)}
                                        className={`rounded-2xl border p-4 text-left transition-all ${flexTemplateType === template.id
                                            ? 'border-brand-500 bg-brand-50 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="font-bold text-slate-800">{template.label}</div>
                                        <div className="mt-1 text-xs leading-relaxed text-slate-500">{template.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">內容欄位</h3>
                                <div className="text-[10px] text-slate-300">可用變數：name</div>
                            </div>
                            <div className="mb-5 rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">主色設定</h3>
                                        <p className="mt-1 text-xs text-slate-400">同時影響卡片 header、主按鈕與預覽色彩。</p>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                                        <input
                                            type="color"
                                            value={normalizeFlexHexColor(flexFormData.theme_color)}
                                            onChange={(e) => handleFlexFieldChange('theme_color', e.target.value)}
                                            className="h-8 w-8 cursor-pointer rounded-md border-0 bg-transparent p-0"
                                        />
                                        <input
                                            type="text"
                                            value={normalizeFlexHexColor(flexFormData.theme_color)}
                                            readOnly
                                            className="w-24 bg-transparent text-sm font-semibold text-slate-600 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {FLEX_COLOR_PRESETS.map((preset) => {
                                        const isActive = normalizeFlexHexColor(flexFormData.theme_color) === preset;
                                        return (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => handleFlexFieldChange('theme_color', preset)}
                                                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${isActive ? 'border-slate-900 scale-110' : 'border-white hover:scale-105'
                                                    }`}
                                                style={{ backgroundColor: preset, boxShadow: '0 8px 18px rgba(15,23,42,0.12)' }}
                                                title={preset}
                                            >
                                                {isActive && <Check size={14} className="text-white" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {FLEX_TEMPLATE_FIELDS[flexTemplateType].map((field) => (
                                    <div key={field.name} className={field.multiline ? 'md:col-span-2' : ''}>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {field.label}
                                        </label>
                                        {field.multiline ? (
                                            <textarea
                                                value={flexFormData[field.name] || ''}
                                                maxLength={field.maxLength}
                                                onChange={(e) => handleFlexFieldChange(field.name, e.target.value)}
                                                placeholder={field.placeholder}
                                                className="min-h-[108px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                            />
                                        ) : (
                                            <input
                                                type={field.type || 'text'}
                                                value={flexFormData[field.name] || ''}
                                                maxLength={field.maxLength}
                                                onChange={(e) => handleFlexFieldChange(field.name, e.target.value)}
                                                placeholder={field.placeholder}
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                            />
                                        )}
                                        <div className="mt-1 text-right text-[10px] text-slate-300">
                                            {(flexFormData[field.name] || '').length}/{field.maxLength}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">主按鈕</h3>
                                <span className="text-[10px] text-slate-300">必填</span>
                            </div>
                            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">按鈕文字</label>
                                    <input
                                        type="text"
                                        value={flexFormData.primary_button_label || ''}
                                        maxLength={20}
                                        onChange={(e) => handleFlexFieldChange('primary_button_label', e.target.value)}
                                        placeholder="例如：立即聯繫專員"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">動作類型</label>
                                    <select
                                        value={flexFormData.primary_button_type || 'uri'}
                                        onChange={(e) => handleFlexFieldChange('primary_button_type', e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                    >
                                        {FLEX_BUTTON_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                                        {flexFormData.primary_button_type === 'message' ? '文字訊息內容' : '網址'}
                                    </label>
                                    <input
                                        type="text"
                                        value={flexFormData.primary_button_value || ''}
                                        maxLength={300}
                                        onChange={(e) => handleFlexFieldChange('primary_button_value', e.target.value)}
                                        placeholder={flexFormData.primary_button_type === 'message' ? '例如：您好，我想進一步了解' : 'https://...'}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">次按鈕</h3>
                                    <p className="mt-1 text-xs text-slate-400">有需要時再開啟，避免表單過長。</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSecondaryFlexButtonEnabled((prev) => !prev)}
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all ${isSecondaryFlexButtonEnabled
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-white text-slate-500 border border-slate-200'
                                        }`}
                                >
                                    <span
                                        className={`h-2.5 w-2.5 rounded-full ${isSecondaryFlexButtonEnabled ? 'bg-white' : 'bg-slate-300'}`}
                                    />
                                    {isSecondaryFlexButtonEnabled ? '已開啟' : '點此新增'}
                                </button>
                            </div>

                            {isSecondaryFlexButtonEnabled ? (
                                <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">按鈕文字</label>
                                        <input
                                            type="text"
                                            value={flexFormData.secondary_button_label || ''}
                                            maxLength={20}
                                            onChange={(e) => handleFlexFieldChange('secondary_button_label', e.target.value)}
                                            placeholder="例如：我要詢問"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">動作類型</label>
                                        <select
                                            value={flexFormData.secondary_button_type || 'message'}
                                            onChange={(e) => handleFlexFieldChange('secondary_button_type', e.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                        >
                                            {FLEX_BUTTON_TYPE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {flexFormData.secondary_button_type === 'message' ? '文字訊息內容' : '網址'}
                                        </label>
                                        <input
                                            type="text"
                                            value={flexFormData.secondary_button_value || ''}
                                            maxLength={300}
                                            onChange={(e) => handleFlexFieldChange('secondary_button_value', e.target.value)}
                                            placeholder={flexFormData.secondary_button_type === 'message' ? '例如：您好，我想進一步了解' : 'https://...'}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-400">
                                    目前只會送出一顆主按鈕，表單會更精簡。
                                </div>
                            )}
                        </div>

                        {flexModalError && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                {flexModalError}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                            <button
                                onClick={onClose}
                                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSendFlexMessage}
                                disabled={isSendingFlexMessage}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSendingFlexMessage ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                                發送訊息
                            </button>
                        </div>
                    </div>

                    <div className="border-l border-slate-100 bg-slate-50/70 p-6 md:p-8">
                        <div className="mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">即時預覽</h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                此預覽用來確認文案與按鈕配置，實際 LINE 顯示會依裝置略有差異。
                            </p>
                        </div>
                        <FlexPreviewCard
                            templateType={flexTemplateType}
                            formData={flexFormData}
                            userName={user.user_name}
                            brandName={agentBrandName}
                            showSecondaryButton={isSecondaryFlexButtonEnabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
