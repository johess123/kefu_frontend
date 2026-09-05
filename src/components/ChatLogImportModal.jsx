import React, { useState, useRef, useMemo } from 'react';
import axios from 'axios';
import config from '../config';
import ChargeConfirmDialog from './ChargeConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { isInsufficientBalanceError } from '../utils/pricing';
import {
    X, Loader2, FolderOpen, FileSpreadsheet, CheckCircle2, AlertTriangle, ShieldCheck,
    User, Bot, HelpCircle, ChevronLeft, ChevronRight, Sparkles, RotateCcw, Play,
    Inbox, ChevronUp, ChevronDown, Trash2, Plus, Wand2,
} from 'lucide-react';
import {
    FLAG_LABELS, REJECT_LABELS, TAG_LABELS, cleanFiles,
} from '../utils/conversationCleaner';
import { FAQ_MAX_QUESTION, FAQ_MAX_ANSWER, FAQ_MAX_CATEGORY, FAQ_MAX_COUNT } from '../utils/faqUtils';

const PAGE_SIZE = 20;

// 一次能選幾個檔案。清洗全在瀏覽器跑，2000 個檔案約 44 MB、記憶體無壓力。
// 實測 1913 個檔案產出 5,865 組真人問答（771 個檔案是 1,000 組）。
//
// 後端原本有 3000 組的上限，2026-08-25 已移除（5,865 組會被擋死，
// 而要商家手工刪到 3000 組不現實）。
// 真正的天花板是知識庫只收 200 條 FAQ —— 約 1300 個檔案就會產滿，
// 再多的輸入只增加費用、不增加可用產出。這個浪費要靠 select_for_llm() 解，
// 詳見 backend/doc/plan_faq_import_cost_ceiling.md。
const MAX_FILES = 2000;

// 真人問答太少就先勸退 —— 實測整批 771 個檔案是 1000 組真人問答、最後產出 236 條，
// 大約每 4 組才變 1 條 FAQ。低於這個數字幾乎一定是 0 條，但還是會照打 LLM 花錢。
const TOO_FEW_PAIRS = 20;

// 後端階段代號 → 給商家看的說法。商家不需要知道「分類／分群／撰寫」，
// 輕鬆知道現在大概在做什麼、還要等多久。
const STAGE_TEXT = {
    classify: '正在篩選適合建立 FAQ 的顧客問題...',
    cluster: '正在合併相似語意的問答內容...',
    compose: '正在生成標準格式的常見問答...',
    save: '常見問答整理完成！',
};

const BUCKET_TABS = [
    {
        key: 'human', Icon: User, label: '客服親自回答',
        hint: '顧客提問與真人客服回覆。整理常見問答之主要來源',
    },
    {
        key: 'auto_reply', Icon: Bot, label: '系統自動回覆',
        hint: '設定之關鍵字自動回覆。多半為行銷活動流程，預設不使用',
    },
    {
        key: 'unanswered', Icon: HelpCircle, label: '缺少回答',
        hint: '顧客提問但無客服回覆、或僅回覆圖片。可檢視是否遺漏重要問題',
    },
    {
        key: 'filtered', Icon: Inbox, label: '已過濾訊息',
        hint: '因字數過短、僅有貼圖或寒暄而被系統判定自動過濾的對話。必要時可補寫回答並加入整理。',
    },
];

const fmtBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtWait = (sec) => {
    if (sec === null || sec === undefined) return '—';
    if (sec < 60) return `${sec} 秒`;
    if (sec < 3600) return `${Math.round(sec / 60)} 分`;
    return `${(sec / 3600).toFixed(1)} 小時`;
};

/** 
 * 解決分類名稱編輯時會因為 state 實時更新導致父元件重整分類列表、進而使 input 失去焦點的 Bug。
 * 使用本地 localVal 控制輸入，僅在 onBlur 或按下 Enter 時觸發 onChange。
 */
function CategoryInput({ value, onChange }) {
    const [localVal, setLocalVal] = useState(value);

    React.useEffect(() => {
        setLocalVal(value);
    }, [value]);

    return (
        <input
            list="chatlog-import-cats"
            value={localVal}
            maxLength={FAQ_MAX_CATEGORY}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={() => {
                if (localVal.trim() !== value.trim()) {
                    onChange(localVal);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
            placeholder="分類名稱"
            className="text-[11px] font-bold text-brand-600 bg-brand-50 border border-brand-100 rounded-full px-2.5 py-0.5 outline-none focus:border-brand-400 focus:bg-white transition-colors w-36"
        />
    );
}

export default function ChatLogImportModal({
    onClose, agentId, adminId, merchantName = '', onConfirm, existingCategories = [],
    existingFaqCount = 0,
}) {
    // select → cleaning → result / failed → composing（統整進度）→ picking（勾選）
    const [step, setStep] = useState('select');
    const [runId, setRunId] = useState(null);
    const [run, setRun] = useState(null);
    // 統整產出。跟「匯入 FAQ」一樣：拿到結果就進 React state 讓商家直接改，
    // 勾選完交給知識庫，伺服器上的暫存會被刪掉。
    const [items, setItems] = useState([]);
    const [picked, setPicked] = useState(() => new Set());
    const [openTopics, setOpenTopics] = useState(() => new Set());

    // 知識庫寫死 FAQ_MAX_COUNT 條上限。勾選畫面原本對它一無所知，商家全選
    // 236 條、按下去才被 alert「僅新增 N 組」，超出的靜默丟掉 —— 不透明。
    // 這裡先算出還剩多少額度，讓他在按之前就能自己取捨。
    const quotaLeft = Math.max(0, FAQ_MAX_COUNT - existingFaqCount);
    const overQuota = Math.max(0, picked.size - quotaLeft);

    /** 依重要程度自動勾選，剛好填滿知識庫額度。
     *
     * 排序依據：被問次數多的優先；次數相同時，把「會過期」與「和其他條重複」
     * 的往後排 —— 那兩種本來就要人再確認，額度不夠時先讓位給乾淨的。
     * 同一個重複議題只留次數最高的那一條，不然額度會被同義問答吃掉。
     */
    const autoPick = () => {
        const seenGroup = new Set();
        const order = items
            .map((f, i) => ({ i, f }))
            .sort((a, b) =>
                (b.f.frequency || 1) - (a.f.frequency || 1)
                || ((a.f.time_bomb ? 1 : 0) + (a.f.duplicate_group ? 1 : 0))
                 - ((b.f.time_bomb ? 1 : 0) + (b.f.duplicate_group ? 1 : 0)));
        const chosen = new Set();
        for (const { i, f } of order) {
            if (chosen.size >= quotaLeft) break;
            if (f.duplicate_group) {
                if (seenGroup.has(f.duplicate_group)) continue;
                seenGroup.add(f.duplicate_group);
            }
            chosen.add(i);
        }
        setPicked(chosen);
    };

    const updateItem = (i, field, val) =>
        setItems(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f));

    const handleUpdateItem = (globalIndex, field, value) => {
        setResult(prev => {
            if (!prev) return prev;
            if (tab === 'unanswered' || tab === 'filtered') {
                const newUnanswered = [...prev.unanswered];
                newUnanswered[globalIndex] = {
                    ...newUnanswered[globalIndex],
                    [field]: value
                };
                return { ...prev, unanswered: newUnanswered };
            } else {
                const newPairs = [...prev.pairs];
                newPairs[globalIndex] = {
                    ...newPairs[globalIndex],
                    [field]: value
                };
                return { ...prev, pairs: newPairs };
            }
        });
    };

    const handleDeleteItem = (globalIndex, isUnanswered) => {
        setResult(prev => {
            if (!prev) return prev;
            if (isUnanswered) {
                const newUnanswered = prev.unanswered.filter((_, idx) => idx !== globalIndex);
                return { ...prev, unanswered: newUnanswered };
            } else {
                const newPairs = prev.pairs.filter((_, idx) => idx !== globalIndex);
                return { ...prev, pairs: newPairs };
            }
        });
    };

    const handleAddItem = () => {
        setResult(prev => {
            if (!prev) return prev;
            const newPair = {
                conversationId: 'manual',
                question: '',
                answer: '',
                bucket: tab === 'auto_reply' ? 'auto_reply' : 'human',
                frequency: 1,
                flags: [],
                qRows: [],
                aRows: []
            };
            if (tab === 'unanswered' || tab === 'filtered') {
                setTab('human');
                setPage(0);
            } else {
                setPage(0);
            }
            const newPairs = [newPair, ...prev.pairs];
            return { ...prev, pairs: newPairs };
        });
    };

    const [files, setFiles] = useState([]);
    const [progress, setProgress] = useState(0);
    const [result, setResultState] = useState(null);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('human');
    const [page, setPage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showChargeConfirm, setShowChargeConfirm] = useState(false);
    const { userBalance, refreshUserBalance } = useAuth();

    const fileRef = useRef(null);
    const dirRef = useRef(null);

    const [isDragActive, setIsDragActive] = useState(false);
    const dragCounter = useRef(0);

    const processFiles = (fileList) => {
        setError('');

        // 1. 過濾出 .csv 檔案
        const csvs = fileList.filter(f => f.name.toLowerCase().endsWith('.csv'));
        if (!csvs.length) {
            const msg = '沒有選擇或拖入任何 .csv 檔案';
            setError(msg);
            alert(msg);
            return;
        }

        // 2. 限制單檔大於 1MB 
        const OVERSIZED_LIMIT = 1024 * 1024;
        const oversized = csvs.filter(f => f.size > OVERSIZED_LIMIT);
        if (oversized.length > 0) {
            const msg = `部分檔案超過 1MB 限制，請重新選擇（例如：${oversized[0].name}）`;
            setError(msg);
            alert(msg);
            return;
        }

        // 3. 數量上限，並進行重複性過濾
        const mergedTemp = [...files];
        csvs.forEach(newFile => {
            const dup = mergedTemp.some(f => f.name === newFile.name && f.size === newFile.size);
            if (!dup) mergedTemp.push(newFile);
        });

        if (mergedTemp.length > MAX_FILES) {
            const msg = `最多僅支援匯入 ${MAX_FILES} 個 CSV 檔案`;
            setError(msg);
            alert(msg);
            return;
        }
        setFiles(mergedTemp);
    };

    const pickFiles = (e) => {
        const picked = Array.from(e.target.files || []);
        if (picked.length > 0) {
            processFiles(picked);
        }
        if (e.target) e.target.value = '';
    };

    const removeFile = (idx) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    // ── 清理：全部在瀏覽器裡跑，原始對話不上傳 ──────────────────────────
    const startClean = async () => {
        setStep('cleaning');
        setProgress(0);
        setError('');
        try {
            const cleaned = await cleanFiles(files, {
                onProgress: (done) => setProgress(done),
            });
            setResult(cleaned);
            setStep('result');
        } catch (e) {
            const msg = e?.message || '清理失敗';
            setError(msg);
            alert(msg);
            setStep('failed');
        }
    };

    const humanPairs = useMemo(
        () => (result?.pairs || []).filter(p => p.bucket === 'human'),
        [result]
    );
    const autoPairs = useMemo(
        () => (result?.pairs || []).filter(p => p.bucket === 'auto_reply'),
        [result]
    );
    const [includeAuto, setIncludeAuto] = useState(false);
    const pairsToSend = useMemo(() => {
        if (!result) return [];
        const h = (result.pairs || []).filter(p => p.bucket === 'human');
        const a = (result.pairs || []).filter(p => p.bucket === 'auto_reply');
        const u = (result.unanswered || [])
            .filter(p => p.answer && p.answer.trim())
            .map(p => ({
                ...p,
                bucket: 'human',
                answer: p.answer.trim()
            }));
        return includeAuto ? [...h, ...a, ...u] : [...h, ...u];
    }, [result, includeAuto]);

    const submitToAi = async () => {
        if (!pairsToSend.length) return;
        if (!agentId || !adminId) {
            setError('缺少 agent 資訊，請重新整理頁面再試');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const res = await axios.post(
                `${config.API_URL}/api/analysis/${agentId}/import-history`,
                {
                    userId: adminId,
                    merchant: merchantName || '',
                    pairs: pairsToSend.map(p => ({
                        question: p.question,
                        answer: p.answer,
                        frequency: p.frequency || 1,
                        bucket: p.bucket,
                        flags: p.flags || [],
                        conversationId: p.conversationId || '',
                    })),
                    source_stats: {
                        files: result?.report?.files || 0,
                        conversations: result?.report?.conversations || 0,
                        messages: result?.report?.messages || 0,
                        human_pairs: humanPairs.length,
                        auto_reply_pairs: includeAuto ? autoPairs.length : 0,
                    },
                }
            );
            setRunId(res.data.run_id);
            setStep('composing');
            refreshUserBalance();
        } catch (e) {
            let msg = '';
            if (isInsufficientBalanceError(e)) {
                msg = '點數不足，請先前往「升級方案」儲值後再試。';
            } else {
                msg = e.response?.data?.detail || '送出失敗，請稍後再試';
            }
            setError(msg);
            alert(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 統整進度輪詢。跑完就停，畫面換成「已產出 N 條」。
    React.useEffect(() => {
        if (step !== 'composing' || !runId) return;
        if (run && run.status !== 'running') return;
        const timer = setInterval(async () => {
            try {
                const res = await axios.get(
                    `${config.API_URL}/api/analysis/${agentId}/import-history/${runId}`
                );
                setRun(res.data);
                if (res.data.status !== 'running') {
                    clearInterval(timer);
                    const rs = res.data.results || [];
                    if (rs.length) {
                        const withCat = rs.map(f => ({
                            ...f, category: f.topic || '常見問題',
                        }));
                        setItems(withCat);
                        setPicked(new Set(withCat.map((_, i) => i)));
                        setOpenTopics(new Set([withCat[0].category]));
                        setStep('picking');
                    }
                }
            } catch (e) {
                clearInterval(timer);
                setError('讀取進度失敗，請關掉視窗後重新開啟查看');
            }
        }, 2000);
        return () => clearInterval(timer);
    }, [step, runId, run?.status, agentId]);

    const allCategories = useMemo(
        () => [...new Set([...existingCategories, ...items.map(f => f.category).filter(Boolean)])],
        [existingCategories, items]
    );

    const confirmPicked = async () => {
        const chosen = items.filter((_, i) => picked.has(i))
            .filter(f => f.question.trim() && f.answer.trim());
        if (!chosen.length) return;
        if (onConfirm) {
            onConfirm(chosen.map(f => ({
                id: Math.random().toString(36).substr(2, 9),
                question: f.question.trim(),
                answer: f.answer.trim(),
                image_id: '',
                category: (f.category || '').trim() || '常見問題',
            })));
        }
        await discardRun();
        onClose();
    };

    const discardRun = async () => {
        if (!runId) return;
        try {
            await axios.delete(
                `${config.API_URL}/api/analysis/${agentId}/import-history/${runId}`);
        } catch (e) {
            // 刪不掉不影響商家
        }
    };

    const reset = () => {
        setStep('select');
        setFiles([]);
        setProgress(0);
        setResult(null);
        setPage(0);
        setTab('human');
        setError('');
        setRunId(null);
        setRun(null);
    };

    const totalBytes = files.reduce((s, f) => s + f.size, 0);
    const report = result?.report;

    const currentList = useMemo(() => {
        if (!result) return [];
        if (tab === 'unanswered') {
            return result.unanswered
                .map((u, index) => ({ ...u, _globalIndex: index }))
                .filter(u => u.reason === 'no_reply' || u.reason === 'answer_image');
        }
        if (tab === 'filtered') {
            return result.unanswered
                .map((u, index) => ({ ...u, _globalIndex: index }))
                .filter(u => u.reason !== 'no_reply' && u.reason !== 'answer_image');
        }
        return result.pairs
            .map((p, index) => ({ ...p, _globalIndex: index }))
            .filter(p => p.bucket === tab);
    }, [result, tab]);

    const setResult = (val) => {
        setResultState(val);
    };

    const pageItems = currentList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const maxPage = Math.max(0, Math.ceil(currentList.length / PAGE_SIZE) - 1);

    const tabCount = (key) => {
        if (!report || !result) return 0;
        if (key === 'unanswered') {
            return result.unanswered.filter(u => u.reason === 'no_reply' || u.reason === 'answer_image').length;
        }
        if (key === 'filtered') {
            return result.unanswered.filter(u => u.reason !== 'no_reply' && u.reason !== 'answer_image').length;
        }
        return result.pairs.filter(p => p.bucket === key).length;
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (step === 'select') {
            if (e.type === "dragenter") {
                dragCounter.current++;
                setIsDragActive(true);
            } else if (e.type === "dragleave") {
                dragCounter.current--;
                if (dragCounter.current <= 0) {
                    setIsDragActive(false);
                }
            }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        dragCounter.current = 0;

        if (step === 'select') {
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
                processFiles(Array.from(e.dataTransfer.files));
            }
        }
    };

    return (
        <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            {/* 刻意不做「點外面關閉」—— 這個流程有付費步驟和 2～3 分鐘的等待，
                誤觸關掉就取不回結果了。只能按右上角的叉叉或頁尾的關閉。 */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[88vh] overflow-hidden">
                {isDragActive && (
                    <div className="absolute inset-0 bg-brand-500/10 backdrop-blur-[2px] border-4 border-dashed border-brand-500 rounded-2xl z-50 flex flex-col items-center justify-center pointer-events-none transition-all duration-150">
                        <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-3">
                            <FileSpreadsheet size={32} className="text-brand-600 animate-bounce" />
                        </div>
                        <p className="text-sm font-bold text-brand-700">放開檔案以匯入聊天紀錄</p>
                    </div>
                )}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">匯入 LINE 聊天紀錄</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            LINE 官方帳號的對話紀錄整理成常見問題
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* ── 選檔 ─────────────────────────────────────────── */}
                    {step === 'select' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 rounded-2xl hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                                >
                                    <FileSpreadsheet size={24} className="text-slate-300 mb-2" />
                                    <span className="text-sm font-semibold text-slate-600">選擇多個 CSV</span>
                                </button>
                                <button
                                    onClick={() => dirRef.current?.click()}
                                    className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 rounded-2xl hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                                >
                                    <FolderOpen size={24} className="text-slate-300 mb-2" />
                                    <span className="text-sm font-semibold text-slate-600">選擇整個資料夾</span>
                                </button>
                            </div>
                            <input ref={fileRef} type="file" accept=".csv" multiple className="hidden" onChange={pickFiles} />
                            <input ref={dirRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={pickFiles} />

                            {files.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-base font-bold text-slate-700 mb-3">
                                        已選擇 {files.length} 個 CSV（{fmtBytes(totalBytes)}）
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1.5">
                                        {files.map((f, i) => (
                                            <div key={i} className="relative flex items-center gap-3 border border-slate-200 rounded-2xl px-4 py-3 bg-white hover:bg-slate-50 transition-all pr-10">
                                                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                                    <FileSpreadsheet size={18} className="text-emerald-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-slate-700 truncate">{f.name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{fmtBytes(f.size)}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(i)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 hover:text-rose-650 text-slate-455 flex items-center justify-center transition-colors"
                                                    title="移除此檔案"
                                                >
                                                    <X size={12} className="stroke-[2.5]" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── 清理中 ───────────────────────────────────────── */}
                    {step === 'cleaning' && (
                        <div className="py-10 flex flex-col items-center">
                            <Loader2 size={28} className="animate-spin text-brand-500 mb-4" />
                            <p className="text-base font-bold text-slate-700">整理中 {progress} / {files.length}</p>
                            <div className="w-full max-w-sm h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                                <div
                                    className="h-full bg-brand-500 transition-all duration-200"
                                    style={{ width: `${files.length ? (progress / files.length) * 100 : 0}%` }}
                                />
                            </div>
                            <p className="text-sm text-slate-500 mt-3 text-center">於本機瀏覽器安全處理，原始對話內容不會上傳至伺服器</p>
                        </div>
                    )}

                    {/* ── 交給 AI 整理後的進度 ─────────────────────────── */}
                    {step === 'composing' && (
                        <div className="py-10 flex flex-col items-center">
                            {run?.status === 'failed' ? (
                                <>
                                    <AlertTriangle size={28} className="text-rose-500 mb-4" />
                                    <p className="text-base font-bold text-slate-700">整理失敗</p>
                                    <p className="text-sm text-slate-600 mt-2 max-w-md text-center">
                                        {run.error || '請稍後再試'}
                                    </p>
                                </>
                            ) : run?.status === 'completed' && !run.stats?.suggestions ? (
                                <>
                                    <Inbox size={28} className="text-slate-400 mb-4" />
                                    <p className="text-base font-bold text-slate-700 text-center max-w-md">這批對話紀錄中，暫時沒有適合建立常見問題 (FAQ) 的內容</p>
                                    <div className="text-sm text-slate-600 mt-4 max-w-md text-left leading-relaxed space-y-2">
                                        <p>系統分析後發現，送出的 {run.stats?.qa_pairs ?? 0} 組對話主要屬於以下狀況，因而被自動過濾：</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>個人專屬問題</strong>：例如詢問特定訂單進度、個人帳號綁定或售後個案。</li>
                                            <li><strong>日常寒暄與附和</strong>：例如「謝謝」、「好的」等問候。</li>
                                        </ul>
                                        <p className="text-slate-400 text-[11px] mt-2 pt-2 border-t border-slate-100">
                                            💡 <strong>小建議</strong>：<br />
                                            AI 需要分析更多通用的顧客提問才能提煉出精準的常見問題。建議您可以先累積更多與顧客的對話紀錄，或是匯入時選擇<strong>整個對話資料夾</strong>，讓我們能從更豐富的真人客服對話中找到常見問題！
                                        </p>
                                    </div>
                                </>
                            ) : run?.status === 'completed' ? (
                                <>
                                    <CheckCircle2 size={28} className="text-emerald-500 mb-4" />
                                    <p className="text-sm font-bold text-slate-700">
                                        整理出 {run.stats?.suggestions ?? 0} 組常見問答
                                    </p>
                                    <div className="mt-4 grid grid-cols-3 gap-6 text-center">
                                        <div>
                                            <p className="text-[11px] text-slate-400">送去整理</p>
                                            <p className="text-sm font-bold text-slate-700">{run.stats?.qa_pairs ?? 0} 組</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-400">可以做成問答</p>
                                            <p className="text-sm font-bold text-slate-700">{run.stats?.classified_faq ?? 0} 組</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-400">AI 處理次數</p>
                                            <p className="text-sm font-bold text-slate-700">{run.stats?.llm_calls ?? 0} 次</p>
                                        </div>
                                    </div>
                                    {run.stats?.time_bombs > 0 && (
                                        <p className="text-xs text-amber-700 mt-4">
                                            其中 {run.stats.time_bombs} 條答案寫了當下庫存或活動，會過期，已標記待確認
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-3">
                                        全部問答皆需經由審核確認後，才會匯入知識庫
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Loader2 size={28} className="animate-spin text-brand-500 mb-4" />
                                    <p className="text-sm font-bold text-slate-700">
                                        {STAGE_TEXT[run?.stage] || 'AI 整理中'}
                                    </p>
                                    <div className="w-full max-w-sm h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                                        <div
                                            className="h-full bg-brand-500 transition-all duration-500"
                                            style={{ width: `${run?.progress || 0}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3">{run?.stage_note || ''}</p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        大約需要幾分鐘，請不要關閉這個視窗
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── 勾選要加入知識庫的問答 ───────────────────────── */}
                    {step === 'picking' && (() => {
                        const byCat = {};
                        items.forEach((f, i) => {
                            const k = (f.category || '').trim() || '常見問題';
                            (byCat[k] = byCat[k] || []).push(i);
                        });
                        // 每個分類內部依「被問次數」由多到少排 —— 知識庫只收 200 條，
                        // 商家常常得從 236 條裡砍掉幾十條，把多人問過的放最上面才方便取捨。
                        // 次數相同時把「會過期」與「有重複」的往後排（那些更可能被捨棄）。
                        const rank = (i) => {
                            const f = items[i];
                            const penalty = (f.time_bomb ? 1 : 0) + (f.duplicate_group ? 1 : 0);
                            return [-(f.frequency || 1), penalty];
                        };
                        Object.values(byCat).forEach(list => list.sort((a, b) => {
                            const [fa, pa] = rank(a), [fb, pb] = rank(b);
                            return fa - fb || pa - pb;
                        }));
                        // 分類本身也依「最常被問的那一條」排，讓重要的分類浮到最上面；
                        // 一樣才比條數。
                        const topFreq = (cat) =>
                            Math.max(...byCat[cat].map(i => items[i].frequency || 1));
                        const cats = Object.keys(byCat).sort(
                            (a, b) => topFreq(b) - topFreq(a) || byCat[b].length - byCat[a].length);
                        const needCheck = items.filter(f => f.time_bomb || f.duplicate_group).length;
                        // duplicate_group → 這一組有哪些條目（同組的可能被分類拆散到不同區塊）
                        const peers = {};
                        items.forEach((f, i) => {
                            if (f.duplicate_group > 0) {
                                (peers[f.duplicate_group] = peers[f.duplicate_group] || []).push(i);
                            }
                        });
                        return (
                            <div>
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                                    <p className="text-sm font-semibold text-slate-700">
                                        整理出 {items.length} 組常見問答
                                    </p>
                                    <span className="text-xs text-slate-400">
                                        勾選要加入的，也可以直接修改內容與分類
                                    </span>
                                    {/* 超額不是錯誤：超出的部分會進草稿庫、不會遺失，所以用琥珀提醒而非紅色警示 */}
                                    <span className={`text-xs font-bold ml-auto ${overQuota ? 'text-amber-600' : 'text-slate-500'}`}>
                                        已選 {picked.size} 組 · 知識庫還可加入 {quotaLeft} 組
                                    </span>
                                </div>
                                {overQuota > 0 && (
                                    <p className="text-xs text-amber-600 mb-2 leading-snug">
                                        超出 {overQuota} 組。知識庫上限 {FAQ_MAX_COUNT} 組
                                        （目前已有 {existingFaqCount} 組），
                                        超出的 {overQuota} 組會存入備用草稿庫，不會遺失，之後可從草稿庫加回正式 FAQ。
                                    </p>
                                )}
                                {needCheck > 0 && (
                                    <p className="text-xs text-amber-700 mb-3">
                                        其中 {items.filter(f => f.time_bomb).length} 條可能會過期、
                                        {Object.values(peers).filter(p => p.length > 1).length} 組內容重複，
                                        建議先確認這些（畫面上有標色）
                                    </p>
                                )}

                                <datalist id="chatlog-import-cats">
                                    {allCategories.map(c => <option key={c} value={c} />)}
                                </datalist>

                                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                    {cats.map(cat => {
                                        const idxs = byCat[cat];
                                        const allOn = idxs.every(i => picked.has(i));
                                        const open = openTopics.has(cat);
                                        return (
                                            <div key={cat} className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                                                    <button
                                                        onClick={() => setOpenTopics(p2 => {
                                                            const n = new Set(p2);
                                                            n.has(cat) ? n.delete(cat) : n.add(cat);
                                                            return n;
                                                        })}
                                                        className="flex items-center gap-1.5 text-sm font-bold text-slate-700"
                                                    >
                                                        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        {cat}
                                                        <span className="text-xs font-normal text-slate-400">
                                                            已選 {idxs.filter(i => picked.has(i)).length}/{idxs.length}
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => setPicked(p2 => {
                                                            const n = new Set(p2);
                                                            idxs.forEach(i => allOn ? n.delete(i) : n.add(i));
                                                            return n;
                                                        })}
                                                        className="text-xs font-bold text-brand-600 hover:text-brand-700"
                                                    >
                                                        {allOn ? '全部不要' : '全選'}
                                                    </button>
                                                </div>

                                                {open && (
                                                    <div className="divide-y divide-slate-100">
                                                        {idxs.map(i => {
                                                            const f = items[i];
                                                            const on = picked.has(i);
                                                            return (
                                                                <div key={i} className={`flex items-start gap-2.5 px-3 py-3 ${on ? '' : 'opacity-50'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={on}
                                                                        onChange={() => setPicked(p2 => {
                                                                            const n = new Set(p2);
                                                                            n.has(i) ? n.delete(i) : n.add(i);
                                                                            return n;
                                                                        })}
                                                                        className="mt-1.5 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 shrink-0"
                                                                    />
                                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                                        {/* 第一列：問題（主角，粗體較大）→ 提示標籤 → 分類（置右）。
                                                                            分類放最右邊，讓視線先落在問題上。 */}
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <input
                                                                                type="text"
                                                                                value={f.question}
                                                                                maxLength={FAQ_MAX_QUESTION}
                                                                                onChange={(e) => updateItem(i, 'question', e.target.value)}
                                                                                placeholder="問題..."
                                                                                className="flex-1 min-w-[12rem] text-base font-bold text-slate-800 bg-transparent border-b border-slate-100 focus:border-brand-400 outline-none py-0.5 transition-colors"
                                                                            />
                                                                            {f.frequency > 1 && (
                                                                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                                                                                    被問 {f.frequency} 次
                                                                                </span>
                                                                            )}
                                                                            {f.time_bomb && (
                                                                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                                                                    內容時效性提示，請確認
                                                                                </span>
                                                                            )}
                                                                            {peers[f.duplicate_group]?.length > 1 && (
                                                                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold">
                                                                                    和另 {peers[f.duplicate_group].length - 1} 條重複
                                                                                </span>
                                                                            )}
                                                                            <div className="shrink-0 ml-auto">
                                                                                <CategoryInput
                                                                                    value={f.category}
                                                                                    onChange={(val) => updateItem(i, 'category', val)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <textarea
                                                                            rows={2}
                                                                            value={f.answer}
                                                                            maxLength={FAQ_MAX_ANSWER}
                                                                            onChange={(e) => updateItem(i, 'answer', e.target.value)}
                                                                            placeholder="答案..."
                                                                            className="w-full text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 resize-none outline-none focus:bg-white focus:ring-1 focus:ring-brand-200 transition-colors"
                                                                        />

                                                                        {/* 同一議題的其他條。分組是在資料層算的，但畫面依「分類」折疊，
                                                                            同組成員可能被拆到不同區塊 —— 只顯示一個標籤的話，
                                                                            商家看得到提示卻找不到對方，等於白算。 */}
                                                                        {peers[f.duplicate_group]?.length > 1 && (
                                                                            <div className="rounded-lg bg-orange-50 border border-orange-100 px-2 py-1.5">
                                                                                <p className="text-[11px] font-bold text-orange-800">
                                                                                    這幾條在講同一件事，請確認要留哪些：
                                                                                </p>
                                                                                <ul className="mt-0.5 space-y-0.5">
                                                                                    {peers[f.duplicate_group]
                                                                                        .filter(j => j !== i)
                                                                                        .slice(0, 4)
                                                                                        .map(j => (
                                                                                            <li key={j} className="text-[11px] text-orange-900/80 leading-snug">
                                                                                                ·{' '}
                                                                                                {items[j].category !== f.category && (
                                                                                                    <span className="text-orange-700">［{items[j].category}］</span>
                                                                                                )}
                                                                                                {items[j].question}
                                                                                                {!picked.has(j) && (
                                                                                                    <span className="text-slate-400">（未勾選）</span>
                                                                                                )}
                                                                                            </li>
                                                                                        ))}
                                                                                    {peers[f.duplicate_group].length > 5 && (
                                                                                        <li className="text-[11px] text-orange-900/60">
                                                                                            · 還有 {peers[f.duplicate_group].length - 5} 條
                                                                                        </li>
                                                                                    )}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {run?.stats?.skipped_existing > 0 && (
                                    <p className="mt-3 text-xs text-slate-400">
                                        另外有 {run.stats.skipped_existing} 組與現有的常見問答重複，已經略過
                                    </p>
                                )}
                            </div>
                        );
                    })()}

                    {/* ── 失敗 ─────────────────────────────────────────── */}
                    {step === 'failed' && (
                        <div className="py-10 flex flex-col items-center">
                            <AlertTriangle size={28} className="text-rose-500 mb-4" />
                            <p className="text-sm font-bold text-slate-700">整理失敗</p>
                            <p className="text-xs text-slate-500 mt-2 max-w-md text-center">{error}</p>
                        </div>
                    )}

                    {/* ── 結果 ─────────────────────────────────────────── */}
                    {step === 'result' && report && (() => {
                        const tags = Object.entries(TAG_LABELS).map(([key, label]) => {
                            const count = report.tagCounts[key] || 0;
                            const pct = report.messages ? (count / report.messages) * 100 : 0;
                            return { key, label, count, pct };
                        }).filter(t => t.count > 0);

                        const tagLabels = {
                            keep: '可用問答對話',
                            no_content: '圖片與貼圖等非文字',
                            auto_reply: '系統自動回覆',
                            broadcast: '群發推播訊息',
                            system_notice: '系統通知訊息',
                            echo: '重複記錄對話',
                            ignore_role: '無法識別的訊息',
                        };

                        const totalMessages = report.messages || 1;
                        const tagColors = {
                            keep: '#10b981',          // 翠綠
                            auto_reply: '#6366f1',    // 靛藍
                            broadcast: '#94a3b8',     // 石板深灰
                            system_notice: '#cbd5e1',  // 銀灰
                            no_content: '#e2e8f0',     // 淡灰
                            echo: '#f1f5f9',          // 極淺灰
                            ignore_role: '#475569',    // 深暗灰
                        };

                        const slices = [];
                        let accum = 0;
                        const orderKeys = ['keep', 'auto_reply', 'broadcast', 'system_notice', 'no_content', 'echo', 'ignore_role'];
                        orderKeys.forEach(key => {
                            const count = report.tagCounts[key] || 0;
                            if (count > 0) {
                                const pct = (count / totalMessages) * 100;
                                const color = tagColors[key] || '#94a3b8';
                                slices.push(`${color} ${accum.toFixed(1)}% ${(accum + pct).toFixed(1)}%`);
                                accum += pct;
                            }
                        });

                        const conicGradientStyle = {
                            background: slices.length > 0
                                ? `conic-gradient(${slices.join(', ')})`
                                : '#f1f5f9'
                        };

                        return (
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                    <p className="text-sm font-bold text-slate-700">
                                        讀完 {report.files} 個檔案的對話紀錄
                                    </p>
                                    {report.failedFiles > 0 && (
                                        <span className="text-xs text-rose-500">
                                            {report.failedFiles} 個檔案格式不符，已略過
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {/* 卡片 1：真人客服 */}
                                    <div className="rounded-2xl border border-emerald-100 bg-white flex flex-col justify-between overflow-hidden shadow-sm">
                                        <div className="p-4 pb-3 flex-1 flex flex-col justify-between">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-bold text-emerald-800">客服親自回答的對話</p>
                                                <div className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 shrink-0">已納入</div>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-800 mt-2">{report.uniquePairsByBucket.human}</p>
                                            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                                                顧客與真人客服的對話，是 AI 提煉常見問題的主要素材。
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between min-h-[44px]">
                                            <span className="text-xs font-bold text-slate-500">整理狀態</span>
                                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">● 預設處理</span>
                                        </div>
                                    </div>

                                    {/* 卡片 2：自動回覆 */}
                                    <div className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-200 ${includeAuto ? 'border-brand-200 shadow-sm' : 'border-slate-200'}`}>
                                        <div className="p-4 pb-3 flex-1 flex flex-col justify-between">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-bold text-slate-700">系統自動回覆</p>
                                                <div className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition-colors border ${includeAuto ? 'bg-brand-50 text-brand-700 border-brand-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                    {includeAuto ? '已納入' : '不納入'}
                                                </div>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-800 mt-2">{report.uniquePairsByBucket.auto_reply}</p>
                                            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                                                包含關鍵字自動回覆。多為行銷活動，預設不處理。
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between min-h-[44px]">
                                            <span className="text-xs font-bold text-slate-500">納入 AI 整理範圍</span>
                                            <button
                                                onClick={() => setIncludeAuto(!includeAuto)}
                                                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${includeAuto ? 'bg-brand-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${includeAuto ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 卡片 3：缺少回答 */}
                                    <div className="rounded-2xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-sm">
                                        <div className="p-4 pb-3 flex-1 flex flex-col justify-between">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-bold text-amber-800">顧客提問但無回覆</p>
                                                <div className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/50 shrink-0">補答後處理</div>
                                            </div>
                                            <p className="text-3xl font-extrabold text-slate-800 mt-2">{report.uniqueUnanswered}</p>
                                            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                                                預設不處理。若在下方分頁為其補寫回答，將自動加入 AI 整理。
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between min-h-[44px]">
                                            <span className="text-xs font-bold text-slate-500">整理狀態</span>
                                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">● 補寫後處理</span>
                                        </div>
                                    </div>
                                </div>

                                {includeAuto && (
                                    <p className="text-xs text-brand-600 bg-brand-50/50 border border-brand-100/30 rounded-lg px-3 py-2 leading-relaxed">
                                        💡 提示：系統自動回覆多半是行銷活動或暫時性的優惠碼。如果確實將「營業時間」、「退換貨政策」等常駐資訊設在關鍵字自動回覆中，勾選此項能幫助 AI 整理得更完整。
                                    </p>
                                )}

                                <details className="group border border-slate-100 rounded-xl p-4 bg-slate-50/20">
                                    <summary className="text-sm font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none flex items-center gap-1.5">
                                        <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-slate-400" />
                                        分析詳情
                                    </summary>
                                    <div className="mt-4 space-y-6 pt-4 border-t border-slate-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 mb-3">📊 對話紀錄分析結果</p>
                                            <div className="flex flex-col sm:flex-row items-center gap-8 py-2 bg-white rounded-2xl p-4 border border-slate-100/50">
                                                {/* 左側：實心圓餅圖 */}
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className="w-32 h-32 rounded-full shadow-md animate-fade-in" style={conicGradientStyle} />
                                                    <span className="text-[11px] font-bold text-slate-500 mt-3.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                                                        共 {report.messages} 則對話
                                                    </span>
                                                </div>

                                                {/* 右側：分類圖例 */}
                                                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2.5 w-full">
                                                    {tags.map(t => {
                                                        const dotColor = tagColors[t.key] || '#94a3b8';
                                                        return (
                                                            <div key={t.key} className="flex items-center gap-2 text-xs">
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                                                <span className="text-slate-600 truncate max-w-[120px] font-medium">
                                                                    {tagLabels[t.key] || t.label}
                                                                </span>
                                                                <span className="text-slate-400 ml-auto shrink-0 font-semibold">
                                                                    {t.count} 則 ({t.pct.toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {Object.keys(report.rejectCounts).length > 0 && (
                                                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                                                    <p className="text-xs font-bold text-slate-600 mb-2">🚫 已自動過濾的非問答訊息</p>
                                                    <div className="space-y-1.5">
                                                        {Object.entries(report.rejectCounts).map(([key, count]) => (
                                                            <div key={key} className="flex justify-between text-xs text-slate-500">
                                                                <span className="font-medium">{REJECT_LABELS[key] || key}</span>
                                                                <span className="font-semibold text-slate-600">{count} 組</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {Object.keys(report.flagCounts).length > 0 && (
                                                <div className="bg-amber-50/30 rounded-xl p-3 border border-amber-100/30">
                                                    <p className="text-xs font-bold text-amber-800 mb-2">⚠️ 匯入提示與建議</p>
                                                    <div className="space-y-1.5">
                                                        {Object.entries(report.flagCounts)
                                                            .filter(([key]) => key !== 'long_wait')
                                                            .map(([key, count]) => (
                                                                <div key={key} className="flex justify-between text-xs text-amber-700">
                                                                    <span className="font-medium">{FLAG_LABELS[key] || key}</span>
                                                                    <span className="font-semibold">{count} 組</span>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </details>

                                {/* 建議 Banner 警告區 */}
                                {pairsToSend.length > 0 && pairsToSend.length < TOO_FEW_PAIRS && (
                                    <div className="bg-amber-50 rounded-xl p-3.5 text-xs text-amber-850 flex items-start gap-2.5">
                                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                                        <div className="space-y-1">
                                            <p className="font-bold">整理提示</p>
                                            <p className="leading-relaxed text-slate-500">目前僅有 {pairsToSend.length} 組對話可以整理。由於數量較少，AI 統整的效果可能有限，但仍會產生整理費用。建議累積更多對話紀錄後再行整理，或選擇整個對話資料夾匯入。</p>
                                        </div>
                                    </div>
                                )}

                                {/* 逐筆清單 */}
                                <div>
                                    <div className="flex border-b border-slate-100 flex-shrink-0 w-full">
                                        {BUCKET_TABS.map(t => (
                                            <button
                                                key={t.key}
                                                onClick={() => { setTab(t.key); setPage(0); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors ${tab === t.key
                                                    ? 'text-brand-600 border-b-2 border-brand-500 font-bold'
                                                    : 'text-slate-400 hover:text-slate-650'
                                                    }`}
                                            >
                                                <t.Icon size={14} className="shrink-0" />
                                                <span className="truncate">{t.label}</span>
                                                <span className="text-xs font-normal shrink-0">({tabCount(t.key)})</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between gap-4 mt-3.5 mb-2.5 px-1">
                                        <p className="text-sm text-slate-500 font-medium">
                                            {BUCKET_TABS.find(t => t.key === tab)?.hint}
                                        </p>

                                        {/* 手動新增對話按鈕移至第 2 行靠右 */}
                                        <button
                                            onClick={handleAddItem}
                                            disabled={tab === 'unanswered' || tab === 'filtered'}
                                            className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg transition-all border border-brand-100 disabled:opacity-40 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-150 disabled:cursor-not-allowed bg-brand-50 text-brand-600 hover:bg-brand-100/60 shrink-0"
                                        >
                                            <Plus size={14} />
                                            手動新增對話
                                        </button>
                                    </div>

                                    {/* 固定高度＋內部滾動：清單很長時換頁鍵才不會被推到畫面外，
                                        否則每次換頁都得再滾回底部找按鈕。 */}
                                    <div className="mt-3 space-y-2 h-[46vh] min-h-[280px] overflow-y-auto pr-1">
                                        {pageItems.length === 0 && (
                                            <p className="py-8 text-center text-sm text-slate-400">此分類尚無資料</p>
                                        )}
                                        {pageItems.map((it, i) => (
                                            <div key={`${it.conversationId}-${it.qRows.join()}-${i}`} className="border border-slate-100 rounded-xl p-3.5 relative bg-slate-50/10 hover:bg-white hover:shadow-sm transition-all duration-200">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                                    <span className="text-xs font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                                        出現 {it.frequency} 次
                                                    </span>
                                                    {it.reason && (
                                                        <span className="text-xs font-bold px-1.5 py-0.5 bg-rose-50 text-rose-650 rounded">
                                                            {REJECT_LABELS[it.reason] || it.reason}
                                                        </span>
                                                    )}
                                                    {(it.flags || [])
                                                        .filter(f => f !== 'long_wait')
                                                        .map(f => (
                                                            <span key={f} className="text-xs font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                                                {FLAG_LABELS[f] || f}
                                                            </span>
                                                        ))}
                                                    {/* 刪除對話組按鈕 */}
                                                    <button
                                                        onClick={() => handleDeleteItem(it._globalIndex, tab === 'unanswered' || tab === 'filtered')}
                                                        title="刪除此對話組"
                                                        className="ml-auto text-slate-400 hover:text-rose-650 transition-colors p-1 rounded hover:bg-rose-50 hover:border-rose-100/50"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                                {tab !== 'unanswered' && tab !== 'filtered' ? (
                                                    <div className="space-y-2 mt-2">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-sm font-bold text-slate-400 mt-2 shrink-0 w-4 text-center">Q</span>
                                                            <textarea
                                                                rows={1}
                                                                value={it.question}
                                                                onChange={(e) => handleUpdateItem(it._globalIndex, 'question', e.target.value)}
                                                                placeholder="問題內容..."
                                                                className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 transition-colors resize-y min-h-[36px]"
                                                            />
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-sm font-bold text-slate-400 mt-2 shrink-0 w-4 text-center">A</span>
                                                            <textarea
                                                                rows={2}
                                                                value={it.answer}
                                                                onChange={(e) => handleUpdateItem(it._globalIndex, 'answer', e.target.value)}
                                                                placeholder="回答內容..."
                                                                className="w-full text-sm text-slate-700 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 transition-colors resize-y min-h-[54px]"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 mt-2">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-sm font-bold text-slate-400 mt-2 shrink-0 w-4 text-center">Q</span>
                                                            <textarea
                                                                rows={1}
                                                                value={it.question}
                                                                onChange={(e) => handleUpdateItem(it._globalIndex, 'question', e.target.value)}
                                                                placeholder="問題內容..."
                                                                className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 transition-colors resize-y min-h-[36px]"
                                                            />
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-sm font-bold text-slate-400 mt-2 shrink-0 w-4 text-center">A</span>
                                                            <textarea
                                                                rows={2}
                                                                value={it.answer || ''}
                                                                onChange={(e) => handleUpdateItem(it._globalIndex, 'answer', e.target.value)}
                                                                placeholder="填寫回答以加入整理..."
                                                                className="w-full text-sm text-slate-700 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 transition-colors resize-y min-h-[54px]"
                                                            />
                                                        </div>
                                                        {!it.answer?.trim() && (
                                                            <p className="text-xs text-slate-500 ml-6">
                                                                💡 填寫回答後，此問答將自動被納入「交給 AI 整理」的範圍。
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {currentList.length > PAGE_SIZE && (
                                        <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-slate-100">
                                            <button
                                                disabled={page === 0}
                                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span className="text-xs text-slate-500">
                                                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, currentList.length)} / {currentList.length}
                                            </span>
                                            <button
                                                disabled={page >= maxPage}
                                                onClick={() => setPage(p => Math.min(maxPage, p + 1))}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="shrink-0 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        關閉
                    </button>

                    {/* 右邊：按鈕組。永遠不縮 */}
                    <div className="flex items-center gap-2 shrink-0">
                        {step === 'select' && (
                            <button
                                onClick={startClean}
                                disabled={!files.length}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-40 whitespace-nowrap"
                            >
                                <Play size={16} />
                                開始整理（{files.length} 個檔案）
                            </button>
                        )}

                        {step === 'composing' && (
                            run?.status === 'completed' || run?.status === 'failed' ? (
                                <button
                                    onClick={reset}
                                    className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all whitespace-nowrap"
                                >
                                    <RotateCcw size={14} />
                                    重新選擇檔案
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 whitespace-nowrap"
                                >
                                    <Loader2 size={16} className="animate-spin" />
                                    整理中…
                                </button>
                            )
                        )}

                        {step === 'picking' && items.length > quotaLeft && (
                            <button
                                onClick={autoPick}
                                title="依被問次數由多到少挑選，剛好填滿額度；同一個重複議題只留一條"
                                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap"
                            >
                                <Wand2 size={15} className="text-brand-600" />
                                自動挑 {quotaLeft} 組
                            </button>
                        )}

                        {step === 'picking' && (
                            <button
                                onClick={confirmPicked}
                                disabled={!picked.size}
                                title={overQuota ? `超出知識庫上限 ${overQuota} 組，這些會存入備用草稿庫` : ''}
                                className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40 whitespace-nowrap ${overQuota ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'
                                    }`}
                            >
                                <Sparkles size={16} />
                                {!picked.size
                                    ? '請先勾選'
                                    : overQuota
                                        ? `加入 ${quotaLeft} 組，其餘 ${overQuota} 組進草稿庫`
                                        : `加入知識庫（${picked.size} 組）`}
                            </button>
                        )}

                        {(step === 'result' || step === 'failed') && (
                            <>
                                <button
                                    onClick={reset}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
                                >
                                    <RotateCcw size={14} />
                                    重選檔案
                                </button>
                                {step === 'result' && (
                                    <button
                                        onClick={() => setShowChargeConfirm(true)}
                                        disabled={isSubmitting || !pairsToSend.length}
                                        title="交給 AI 將這些對話整理為標準常見問答。整理完畢後可逐條篩選、修改，確認後才匯入知識庫。"
                                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all disabled:opacity-40 whitespace-nowrap"
                                    >
                                        {isSubmitting
                                            ? <Loader2 size={16} className="animate-spin" />
                                            : <Sparkles size={16} />}
                                        {isSubmitting
                                            ? '送出中…'
                                            : `交給 AI 整理（${pairsToSend.length} 組）`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ChargeConfirmDialog
                isOpen={showChargeConfirm}
                featureKey="history_import"
                featureLabel={`整理 ${pairsToSend.length} 組問答`}
                balance={userBalance}
                onConfirm={() => { setShowChargeConfirm(false); submitToAi(); }}
                onCancel={() => setShowChargeConfirm(false)}
            />
        </div>
    );
}
