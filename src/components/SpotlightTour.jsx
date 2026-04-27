import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight } from 'lucide-react';

/**
 * Generic spotlight tour component.
 * Elevates a target element above a dark overlay and shows a positioned tooltip.
 *
 * Props:
 *   isOpen      boolean
 *   onClose     () => void
 *   targetRef   React.RefObject — element to spotlight
 *   title       string
 *   description string
 *   ctaLabel?   string
 *   onCta?      () => void
 */
const SpotlightTour = ({ isOpen, onClose, targetRef, title, description, ctaLabel, onCta }) => {
    const [highlightRect, setHighlightRect] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, below: true });

    const computePositions = useCallback(() => {
        if (!targetRef?.current) return;
        const rect = targetRef.current.getBoundingClientRect();
        setHighlightRect({
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
        });
        const tooltipHeight = 220;
        const below = rect.bottom + 16 + tooltipHeight < window.innerHeight;
        setTooltipPos({
            top: below ? rect.bottom + 16 : rect.top - tooltipHeight - 16,
            left: Math.min(rect.left, window.innerWidth - 360),
            below,
        });
    }, [targetRef]);

    // Elevate target element above overlay
    useEffect(() => {
        if (!targetRef?.current) return;
        if (isOpen) {
            targetRef.current.style.zIndex = '51';
            targetRef.current.style.position = 'relative';
        }
        return () => {
            if (targetRef?.current) {
                targetRef.current.style.zIndex = '';
                targetRef.current.style.position = '';
            }
        };
    }, [isOpen, targetRef]);

    // Compute highlight & tooltip positions
    useEffect(() => {
        if (!isOpen) return;
        computePositions();
        window.addEventListener('resize', computePositions);
        return () => window.removeEventListener('resize', computePositions);
    }, [isOpen, computePositions]);

    // ESC to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Dark overlay */}
            <div
                className="fixed inset-0 z-50 bg-black/60"
                onClick={onClose}
            />

            {/* Pulsing highlight ring at target position */}
            {highlightRect && (
                <div
                    className="fixed z-[51] rounded-[36px] pointer-events-none"
                    style={{
                        top: highlightRect.top,
                        left: highlightRect.left,
                        width: highlightRect.width,
                        height: highlightRect.height,
                        boxShadow: '0 0 0 3px #4f46e5, 0 0 0 6px rgba(79,70,229,0.25)',
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
                {/* Arrow indicator */}
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                        <ArrowRight size={18} className={`text-brand-600 ${tooltipPos.below ? '-rotate-90' : 'rotate-90'} transition-transform`} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-0.5">從這裡開始</p>
                        <h4 className="font-bold text-slate-800 text-base leading-tight">{title}</h4>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-5">{description}</p>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                        稍後再說
                    </button>
                    {ctaLabel && onCta && (
                        <button
                            onClick={onCta}
                            className="flex-1 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                            {ctaLabel}
                            <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spotlight-pulse {
                    0%, 100% { box-shadow: 0 0 0 3px #4f46e5, 0 0 0 6px rgba(79,70,229,0.25); }
                    50% { box-shadow: 0 0 0 3px #4f46e5, 0 0 0 12px rgba(79,70,229,0.1); }
                }
            `}</style>
        </>
    );
};

export default SpotlightTour;
