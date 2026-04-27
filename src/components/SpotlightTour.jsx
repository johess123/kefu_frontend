import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ChevronRight } from 'lucide-react';

/**
 * Multi-step spotlight tour component.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 *   steps    StepDef[]
 *
 * StepDef:
 *   targetRef   React.RefObject — element to spotlight
 *   title       string
 *   description string
 *   ctaLabel?   string          — finish button label override (last step only)
 *   onCta?      () => void      — called when finish button is clicked (last step)
 */
const SpotlightTour = ({ isOpen, onClose, steps = [] }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [highlightRect, setHighlightRect] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, below: true });

    const currentStep = steps[stepIndex];
    const isLast = stepIndex === steps.length - 1;

    const computePos = useCallback(() => {
        const el = currentStep?.targetRef?.current;
        if (!el) return;
        requestAnimationFrame(() => {
            const r = el.getBoundingClientRect();
            if (!r.width && !r.height) return;

            setHighlightRect({
                top: r.top - 6,
                left: r.left - 6,
                width: r.width + 12,
                height: r.height + 12,
            });

            const tooltipW = 340;
            const tooltipH = 260;
            const below = r.bottom + 16 + tooltipH < window.innerHeight;
            const top = below ? r.bottom + 16 : r.top - tooltipH - 16;
            const left = Math.max(16, Math.min(r.left, window.innerWidth - tooltipW - 16));
            setTooltipPos({ top, left, below });
        });
    }, [currentStep]);

    // On step change: scroll target into view, then compute position after scroll settles
    useEffect(() => {
        if (!isOpen) return;
        const el = currentStep?.targetRef?.current;
        if (!el) return;

        // Scroll target to center of viewport, then wait for scroll animation
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const timer = setTimeout(computePos, 380); // ~300ms for smooth scroll
        return () => clearTimeout(timer);
    }, [isOpen, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // Recompute on window resize
    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('resize', computePos);
        return () => window.removeEventListener('resize', computePos);
    }, [isOpen, computePos]);

    // Elevate only current step's target above the overlay
    useEffect(() => {
        if (!isOpen) {
            steps.forEach(s => {
                if (s.targetRef?.current) {
                    s.targetRef.current.style.zIndex = '';
                    s.targetRef.current.style.position = '';
                }
            });
            return;
        }
        steps.forEach((s, i) => {
            if (!s.targetRef?.current) return;
            s.targetRef.current.style.zIndex = i === stepIndex ? '51' : '';
            s.targetRef.current.style.position = i === stepIndex ? 'relative' : '';
        });
    }, [isOpen, stepIndex, steps]);

    // Reset to first step whenever tour opens
    useEffect(() => {
        if (isOpen) setStepIndex(0);
    }, [isOpen]);

    // ESC to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen || !currentStep) return null;

    const handleNext = () => {
        if (isLast) {
            currentStep.onCta?.();
            onClose();
        } else {
            setStepIndex(i => i + 1);
        }
    };

    return (
        <>
            {/* Dark overlay */}
            <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />

            {/* Pulsing highlight ring */}
            {highlightRect && (
                <div
                    className="fixed z-[51] rounded-[36px] pointer-events-none"
                    style={{
                        top: highlightRect.top,
                        left: highlightRect.left,
                        width: highlightRect.width,
                        height: highlightRect.height,
                        boxShadow: '0 0 0 3px #4f46e5, 0 0 0 8px rgba(79,70,229,0.2)',
                        animation: 'spotlight-pulse 2s ease-in-out infinite',
                    }}
                />
            )}

            {/* Tooltip card */}
            <div
                className="fixed z-[52] bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-[340px] animate-[fadeInScale_0.2s_ease-out]"
                style={{ top: tooltipPos.top, left: tooltipPos.left }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                    <div className={`w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0 ${tooltipPos.below ? '' : 'rotate-180'} transition-transform duration-300`}>
                        <ArrowRight size={18} className="text-brand-600 -rotate-90" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-0.5">
                            步驟 {stepIndex + 1} / {steps.length}
                        </p>
                        <h4 className="font-bold text-slate-800 text-base leading-tight">{currentStep.title}</h4>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 leading-relaxed mb-5">{currentStep.description}</p>

                {/* Progress dots */}
                {steps.length > 1 && (
                    <div className="flex justify-center gap-1.5 mb-4">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-200'}`}
                            />
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                        稍後再說
                    </button>
                    <button
                        onClick={handleNext}
                        className="flex-1 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                        {isLast ? (currentStep.ctaLabel || '完成') : '下一個'}
                        {isLast ? <ArrowRight size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes spotlight-pulse {
                    0%, 100% { box-shadow: 0 0 0 3px #4f46e5, 0 0 0 8px rgba(79,70,229,0.2); }
                    50%       { box-shadow: 0 0 0 3px #4f46e5, 0 0 0 16px rgba(79,70,229,0.08); }
                }
            `}</style>
        </>
    );
};

export default SpotlightTour;
