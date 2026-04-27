import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, ChevronUp, ChevronDown, ArrowRight, X, Rocket, PartyPopper } from 'lucide-react';

const TASKS = [
    {
        id: 'faq',
        label: '設定 FAQ 知識庫',
        description: '新增常見問答，AI 才能準確回覆客戶',
        path: 'agents/knowledge-base',
    },
    {
        id: 'notify',
        label: '設定通知接收者',
        description: '指定接收「轉人工」通知的成員',
        path: 'agents/escalation-manager',
    },
    {
        id: 'deploy',
        label: '部署到 LINE',
        description: '連接 LINE 官方帳號，正式上線服務',
        path: 'channels',
    },
    {
        id: 'playground',
        label: '測試 AI 回覆',
        description: '在 Playground 發訊息確認 AI 表現',
        path: 'playground',
    },
];

const DEFAULT_STATE = { faq: false, notify: false, deploy: false, playground: false };

const OnboardingChecklist = ({ agentId, navigate, isDeployed }) => {
    const storageKey = `kefu_checklist_v1_${agentId}`;

    const [tasks, setTasks] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : { ...DEFAULT_STATE };
        } catch {
            return { ...DEFAULT_STATE };
        }
    });
    const [isOpen, setIsOpen] = useState(false);
    const [celebrated, setCelebrated] = useState(false);
    const [hidden, setHidden] = useState(false);

    const doneCount = Object.values(tasks).filter(Boolean).length;
    const allDone = doneCount === TASKS.length;

    // Auto-detect deploy completion
    useEffect(() => {
        if (isDeployed && !tasks.deploy) {
            setTasks(prev => {
                const next = { ...prev, deploy: true };
                localStorage.setItem(storageKey, JSON.stringify(next));
                return next;
            });
        }
    }, [isDeployed]); // eslint-disable-line react-hooks/exhaustive-deps

    // Celebrate then hide when all done
    useEffect(() => {
        if (allDone && !celebrated && !hidden) {
            setCelebrated(true);
            setIsOpen(true);
            const timer = setTimeout(() => setHidden(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [allDone, celebrated, hidden]);

    const toggle = useCallback((id) => {
        setTasks(prev => {
            const next = { ...prev, [id]: !prev[id] };
            localStorage.setItem(storageKey, JSON.stringify(next));
            return next;
        });
    }, [storageKey]);

    const goTo = useCallback((path) => {
        navigate('/agent/' + agentId + '/' + path);
        setIsOpen(false);
    }, [navigate, agentId]);

    if (hidden || !agentId) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">

            {/* Expanded panel */}
            {isOpen && (
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-[360px] overflow-hidden animate-[fadeInScale_0.2s_ease-out]">

                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Rocket size={16} className="text-brand-600" />
                                <span className="font-bold text-slate-800 text-sm">新手設定清單</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-600 rounded-full transition-all duration-500"
                                    style={{ width: `${(doneCount / TASKS.length) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs font-bold text-slate-500 shrink-0">
                                {doneCount} / {TASKS.length}
                            </span>
                        </div>
                    </div>

                    {/* Celebration state */}
                    {allDone ? (
                        <div className="px-6 py-8 text-center">
                            <PartyPopper size={36} className="text-brand-600 mx-auto mb-3" />
                            <p className="font-bold text-slate-800 text-base mb-1">設定全部完成！</p>
                            <p className="text-sm text-slate-500">您的 AI 客服已準備就緒，開始服務客戶吧。</p>
                        </div>
                    ) : (
                        /* Task list */
                        <ul className="py-2">
                            {TASKS.map((task) => {
                                const done = tasks[task.id];
                                return (
                                    <li
                                        key={task.id}
                                        className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggle(task.id)}
                                            className="shrink-0 mt-0.5 transition-colors"
                                        >
                                            {done
                                                ? <CheckCircle2 size={20} className="text-brand-600" />
                                                : <Circle size={20} className="text-slate-300 group-hover:text-slate-400" />
                                            }
                                        </button>

                                        {/* Text */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold leading-tight ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                {task.label}
                                            </p>
                                            {!done && (
                                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                                    {task.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Navigate button */}
                                        {!done && (
                                            <button
                                                onClick={() => goTo(task.path)}
                                                className="shrink-0 w-7 h-7 rounded-lg bg-slate-100 hover:bg-brand-600 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {/* Pill button */}
            {!allDone && (
                <button
                    onClick={() => setIsOpen(o => !o)}
                    className="flex items-center gap-2.5 bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-full shadow-xl shadow-brand-600/30 transition-all active:scale-95 font-semibold text-sm"
                >
                    <Rocket size={15} />
                    新手設定
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {doneCount}/{TASKS.length}
                    </span>
                    {isOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </button>
            )}
        </div>
    );
};

export default OnboardingChecklist;
