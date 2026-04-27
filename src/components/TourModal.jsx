import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

// ── Content building blocks ────────────────────────────────────────────────
// Import these in any TourModal steps for consistent visual style.

const COLOR_MAP = {
    brand:  { bg: 'bg-brand-100',  text: 'text-brand-600',  dot: 'text-brand-400'  },
    amber:  { bg: 'bg-amber-100',  text: 'text-amber-600',  dot: 'text-amber-400'  },
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-600',   dot: 'text-blue-400'   },
    green:  { bg: 'bg-green-100',  text: 'text-green-600',  dot: 'text-green-400'  },
    red:    { bg: 'bg-red-100',    text: 'text-red-600',    dot: 'text-red-400'    },
    slate:  { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'text-slate-400'  },
};

const HIGHLIGHT_BG = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue:  'bg-blue-50  border-blue-200  text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red:   'bg-red-50   border-red-200   text-red-800',
    brand: 'bg-brand-50 border-brand-200 text-brand-800',
};

/** Highlighted info / warning box */
export const TourHighlightBox = ({ color = 'amber', children }) => (
    <div className={`border rounded-xl px-4 py-3 text-sm font-semibold leading-relaxed ${HIGHLIGHT_BG[color] ?? HIGHLIGHT_BG.amber}`}>
        {children}
    </div>
);

/** Numbered or bulleted list of feature points */
export const TourStepList = ({ items = [], numbered = false, color = 'brand' }) => {
    const c = COLOR_MAP[color] ?? COLOR_MAP.brand;
    return (
        <ul className="space-y-2.5">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    {numbered ? (
                        <div className={`w-5 h-5 rounded-full ${c.bg} ${c.text} flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold`}>
                            {i + 1}
                        </div>
                    ) : (
                        <div className={`w-1.5 h-1.5 rounded-full ${c.bg.replace('bg-', 'bg-').replace('-100', '-400')} shrink-0 mt-1.5`} />
                    )}
                    {item}
                </li>
            ))}
        </ul>
    );
};

/** Navigation path steps (used for "how to navigate to X") */
export const TourPathSteps = ({ steps = [], color = 'blue' }) => {
    const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
    return (
        <ol className="space-y-1.5">
            {steps.map((step, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <ChevronRight size={14} className={`${c.dot} shrink-0`} />
                    {step}
                </li>
            ))}
        </ol>
    );
};

/** Small footnote / tip text */
export const TourNote = ({ children }) => (
    <p className="text-xs text-slate-400 leading-relaxed">{children}</p>
);

// ── TourModal shell ────────────────────────────────────────────────────────

/**
 * Generic multi-step tour modal.
 *
 * Props:
 *   isOpen       boolean
 *   onClose      () => void   — called on X / ESC / backdrop / finish
 *   steps        StepDef[]
 *   label        string       — header eyebrow text (default: 'KeFu 指引')
 *   finishLabel  string       — last-step button text (default: '完成')
 *
 * StepDef shape:
 *   icon    ReactNode
 *   iconBg  string (tailwind bg class, e.g. 'bg-brand-50')
 *   badge?  string (small pill text shown above title)
 *   title   string
 *   content ReactNode
 */
const TourModal = ({
    isOpen,
    onClose,
    steps = [],
    label = 'KeFu 指引',
    finishLabel = '完成',
}) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) setStep(0);
    }, [isOpen]);

    if (!isOpen || steps.length === 0) return null;

    const current = steps[step];
    const isLast = step === steps.length - 1;
    const total = steps.length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 animate-[fadeInScale_0.2s_ease-out]">

                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-7 pb-0">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {label}
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-8 pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`w-14 h-14 ${current.iconBg} rounded-2xl flex items-center justify-center shrink-0`}>
                            {current.icon}
                        </div>
                        <div className="flex-1">
                            {current.badge && (
                                <span className="inline-block text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full mb-1 uppercase tracking-wide">
                                    {current.badge}
                                </span>
                            )}
                            <h3 className="text-lg font-bold text-slate-800 leading-tight">
                                {current.title}
                            </h3>
                        </div>
                    </div>
                    <div className="space-y-3 text-left">
                        {current.content}
                    </div>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 py-3">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-brand-600' : 'w-1.5 bg-slate-200'}`}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-8 pb-7 pt-1">
                    <span className="text-xs text-slate-400 font-medium">
                        步驟 {step + 1} / {total}
                    </span>
                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                            >
                                <ChevronLeft size={15} />
                                上一步
                            </button>
                        )}
                        <button
                            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
                            className="flex items-center gap-1 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                        >
                            {isLast ? finishLabel : '下一步'}
                            {!isLast && <ChevronRight size={15} />}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TourModal;
