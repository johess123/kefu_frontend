import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import axios from 'axios';
import config from '../config';
import { Coins, AlertTriangle, Download, Loader2, Search, TrendingDown } from 'lucide-react';

Chart.register(...registerables);

const FEATURE_LABELS = {
    optimize_services: '優化商家服務內容',
    generate_faqs: '一鍵生成 FAQ',
    parse_faqs: '匯入 FAQ',
    optimize_faq: '優化單筆 FAQ',
    analyze_faqs: 'FAQ 智能健檢',
    parse_products: '匯入商品',
    generate_prompt: '解析表單',
    chat: '聊天',
    analysis_run: 'FAQ 分析',
};
const featureLabel = (k) => FEATURE_LABELS[k] || k || '其他';
const TYPE_LABELS = { deduct: '扣款', topup: '入帳', refund: '退款' };
const LOW_BALANCE = 1000;
const PAGE_SIZE = 30;

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];

const fmtDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// 期間預設 → { start, end, bucket }
const buildPeriod = (preset) => {
    const today = new Date();
    const end = fmtDate(today);
    if (preset === 'today') return { start: end, end, bucket: 'day' };
    if (preset === '7d') { const s = new Date(today); s.setDate(s.getDate() - 6); return { start: fmtDate(s), end, bucket: 'day' }; }
    if (preset === 'month') { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { start: fmtDate(s), end, bucket: 'day' }; }
    if (preset === '30d') { const s = new Date(today); s.setDate(s.getDate() - 29); return { start: fmtDate(s), end, bucket: 'day' }; }
    if (preset === '12m') { const s = new Date(today.getFullYear(), today.getMonth() - 11, 1); return { start: fmtDate(s), end, bucket: 'month' }; }
    return { start: end, end, bucket: 'day' };
};

const PRESETS = [
    { id: 'today', label: '今日' },
    { id: '7d', label: '近 7 天' },
    { id: 'month', label: '本月' },
    { id: '30d', label: '近 30 天' },
    { id: '12m', label: '近 12 月' },
    { id: 'custom', label: '自訂' },
];

const CoinUsageView = ({ agentId, userId, agentName }) => {
    const [preset, setPreset] = useState('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [trendFeature, setTrendFeature] = useState('');   // 趨勢圖功能篩選

    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    // 明細
    const [txType, setTxType] = useState('');
    const [txFeature, setTxFeature] = useState('');
    const [txOnlyThisAgent, setTxOnlyThisAgent] = useState(false);  // 明細預設帳號層級（含其他 agent）
    const [q, setQ] = useState('');
    const [txItems, setTxItems] = useState([]);
    const [txTotal, setTxTotal] = useState(0);
    const [txSkip, setTxSkip] = useState(0);
    const [loadingTx, setLoadingTx] = useState(false);
    const [exporting, setExporting] = useState(false);

    const trendCanvasRef = useRef(null);
    const pieCanvasRef = useRef(null);
    const trendChartRef = useRef(null);
    const pieChartRef = useRef(null);

    const period = preset === 'custom'
        ? { start: customStart || undefined, end: customEnd || undefined, bucket: 'day' }
        : buildPeriod(preset);

    const summaryParams = useCallback(() => {
        const p = { userId, agentId, bucket: period.bucket };
        if (period.start) p.start = period.start;
        if (period.end) p.end = period.end;
        if (trendFeature) p.feature_key = trendFeature;
        return p;
    }, [userId, agentId, period.start, period.end, period.bucket, trendFeature]);

    // 取得彙總
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        setLoadingSummary(true);
        axios.get(`${config.API_URL}/api/coin/summary`, { params: summaryParams() })
            .then(res => { if (!cancelled) setSummary(res.data); })
            .catch(err => { console.error('coin summary failed', err); if (!cancelled) setSummary(null); })
            .finally(() => { if (!cancelled) setLoadingSummary(false); });
        return () => { cancelled = true; };
    }, [summaryParams]);

    // 取得明細（重設分頁）
    const fetchTransactions = useCallback(async (skip = 0, append = false) => {
        if (!userId) return;
        setLoadingTx(true);
        try {
            const params = { userId, skip, limit: PAGE_SIZE };
            if (txOnlyThisAgent) params.agentId = agentId;  // 預設帳號層級，開關開啟才限本 agent
            if (period.start) params.start = period.start;
            if (period.end) params.end = period.end;
            if (txType) params.type = txType;
            if (txFeature) params.feature_key = txFeature;
            if (q.trim()) params.q = q.trim();
            const res = await axios.get(`${config.API_URL}/api/coin/transactions`, { params });
            setTxTotal(res.data.total || 0);
            setTxSkip(skip + (res.data.items?.length || 0));
            setTxItems(prev => append ? [...prev, ...(res.data.items || [])] : (res.data.items || []));
        } catch (err) {
            console.error('coin transactions failed', err);
        } finally {
            setLoadingTx(false);
        }
    }, [userId, agentId, txOnlyThisAgent, period.start, period.end, txType, txFeature, q]);

    useEffect(() => { fetchTransactions(0, false); /* eslint-disable-line */ }, [period.start, period.end, txType, txFeature, txOnlyThisAgent]);

    // 趨勢折線圖
    useEffect(() => {
        if (!trendCanvasRef.current || !summary) return;
        if (trendChartRef.current) trendChartRef.current.destroy();
        const labels = (summary.trend || []).map(t => t.date);
        trendChartRef.current = new Chart(trendCanvasRef.current, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: agentName || '本 Agent', data: (summary.trend || []).map(t => t.this_agent), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.3, fill: true },
                    { label: '其他 Agent', data: (summary.trend || []).map(t => t.other_agents), borderColor: '#cbd5e1', backgroundColor: 'rgba(203,213,225,0.1)', tension: 0.3, fill: true },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            },
        });
        return () => { if (trendChartRef.current) { trendChartRef.current.destroy(); trendChartRef.current = null; } };
    }, [summary, agentName]);

    // 功能占比 doughnut
    useEffect(() => {
        if (!pieCanvasRef.current || !summary) return;
        if (pieChartRef.current) pieChartRef.current.destroy();
        const data = (summary.by_feature || []).filter(f => f.coins > 0);
        pieChartRef.current = new Chart(pieCanvasRef.current, {
            type: 'doughnut',
            data: {
                labels: data.map(f => featureLabel(f.feature_key)),
                datasets: [{ data: data.map(f => f.coins), backgroundColor: PIE_COLORS, borderWidth: 0 }],
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } },
        });
        return () => { if (pieChartRef.current) { pieChartRef.current.destroy(); pieChartRef.current = null; } };
    }, [summary]);

    const exportCsv = async () => {
        setExporting(true);
        try {
            const params = { userId, skip: 0, limit: 200 };
            if (txOnlyThisAgent) params.agentId = agentId;
            if (period.start) params.start = period.start;
            if (period.end) params.end = period.end;
            if (txType) params.type = txType;
            if (txFeature) params.feature_key = txFeature;
            if (q.trim()) params.q = q.trim();
            const res = await axios.get(`${config.API_URL}/api/coin/transactions`, { params });
            const rows = res.data.items || [];
            const header = ['時間', 'Agent', '類型', '功能', '點數', '異動後餘額', '參照'];
            const body = rows.map(r => [
                r.created_at || '', r.agent_id === agentId ? '本 Agent' : '其他 Agent',
                TYPE_LABELS[r.type] || r.type || '', featureLabel(r.feature_key),
                r.amount ?? '', r.balance_after ?? '', r.reference || '',
            ]);
            const csv = [header, ...body].map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `coin-transactions-${period.start || ''}_${period.end || ''}.csv`;
            a.click(); URL.revokeObjectURL(url);
        } catch (err) {
            console.error('export csv failed', err);
        } finally {
            setExporting(false);
        }
    };

    const balance = summary?.balance ?? 0;
    const isLow = balance < LOW_BALANCE;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 期間選擇 */}
            <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPreset(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preset === p.id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        {p.label}
                    </button>
                ))}
                {preset === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
                        <span className="text-slate-400">~</span>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
                    </div>
                )}
            </div>

            {/* 統計卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 餘額卡片（帳號共用） */}
                <div className={`p-5 rounded-2xl border shadow-sm ${isLow ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">帳號餘額（共用）</span>
                        <Coins size={18} className={isLow ? 'text-red-500' : 'text-amber-500'} />
                    </div>
                    <div className={`text-2xl font-black ${isLow ? 'text-red-600' : 'text-slate-900'}`}>{balance.toLocaleString()} 點</div>
                    {isLow && (
                        <div className="mt-2 flex items-center gap-1 text-xs font-bold text-red-600">
                            <AlertTriangle size={13} /> 餘額偏低，建議盡快儲值
                        </div>
                    )}
                    {summary?.estimated_days_left != null && (
                        <div className="mt-1 text-xs text-slate-400">依近期消耗預估可用約 {summary.estimated_days_left} 天（帳號共用）</div>
                    )}
                </div>

                {/* 本期消耗（本 agent） */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">本期消耗（此 Agent）</span>
                        <TrendingDown size={18} className="text-brand-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{(summary?.total_deduct ?? 0).toLocaleString()} 點</div>
                    <div className="mt-1 text-xs text-slate-400">{period.start || '—'} ~ {period.end || '今日'}</div>
                </div>

                {/* 功能數 */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">使用功能種類</span>
                        <Coins size={18} className="text-slate-400" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{(summary?.by_feature || []).filter(f => f.coins > 0).length}</div>
                    <div className="mt-1 text-xs text-slate-400">本期內有消耗的功能數</div>
                </div>
            </div>

            {/* 圖表 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 趨勢 */}
                <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">消耗趨勢</h3>
                        <select value={trendFeature} onChange={e => setTrendFeature(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
                            <option value="">全部功能</option>
                            {Object.keys(FEATURE_LABELS).map(k => <option key={k} value={k}>{FEATURE_LABELS[k]}</option>)}
                        </select>
                    </div>
                    <div className="h-64 relative">
                        {loadingSummary && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>}
                        <canvas ref={trendCanvasRef} />
                    </div>
                </div>
                {/* 占比 */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">各功能消耗占比</h3>
                    <div className="h-64 relative">
                        {(summary?.by_feature || []).filter(f => f.coins > 0).length === 0 && !loadingSummary
                            ? <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">本期尚無消耗</div>
                            : <canvas ref={pieCanvasRef} />}
                    </div>
                </div>
            </div>

            {/* 明細 */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                    <h3 className="font-bold text-slate-800">異動明細</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none mr-1">
                            <input type="checkbox" checked={txOnlyThisAgent} onChange={e => setTxOnlyThisAgent(e.target.checked)} className="accent-brand-600" />
                            只看本 Agent
                        </label>
                        <select value={txType} onChange={e => setTxType(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
                            <option value="">全部類型</option>
                            <option value="deduct">扣款</option>
                            <option value="topup">入帳</option>
                            <option value="refund">退款</option>
                        </select>
                        <select value={txFeature} onChange={e => setTxFeature(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
                            <option value="">全部功能</option>
                            {Object.keys(FEATURE_LABELS).map(k => <option key={k} value={k}>{FEATURE_LABELS[k]}</option>)}
                        </select>
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') fetchTransactions(0, false); }}
                                placeholder="搜尋功能/參照"
                                className="pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm w-40"
                            />
                        </div>
                        <button onClick={exportCsv} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50">
                            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 匯出 CSV
                        </button>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mb-4">餘額為帳號共用，明細預設顯示帳號完整異動（含其他 Agent），「異動後餘額」才會連貫。</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                                <th className="py-2 pr-3 font-medium">時間</th>
                                <th className="py-2 pr-3 font-medium">Agent</th>
                                <th className="py-2 pr-3 font-medium">類型</th>
                                <th className="py-2 pr-3 font-medium">功能</th>
                                <th className="py-2 pr-3 font-medium text-right">點數</th>
                                <th className="py-2 pr-3 font-medium text-right">異動後餘額</th>
                            </tr>
                        </thead>
                        <tbody>
                            {txItems.map(tx => {
                                const sign = tx.type === 'deduct' ? '-' : '+';
                                const color = tx.type === 'deduct' ? 'text-red-500' : 'text-green-600';
                                const isMine = tx.agent_id === agentId;
                                return (
                                    <tr key={tx.id} className="border-b border-slate-50">
                                        <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{tx.created_at ? new Date(tx.created_at).toLocaleString('zh-TW') : '—'}</td>
                                        <td className="py-2.5 pr-3">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isMine ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {isMine ? '本 Agent' : '其他 Agent'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tx.type === 'deduct' ? 'bg-red-50 text-red-600' : tx.type === 'topup' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {TYPE_LABELS[tx.type] || tx.type}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-700">{tx.feature_key ? featureLabel(tx.feature_key) : '—'}</td>
                                        <td className={`py-2.5 pr-3 text-right font-bold ${color}`}>{sign}{(tx.amount ?? 0).toLocaleString()}</td>
                                        <td className="py-2.5 pr-3 text-right text-slate-500">{(tx.balance_after ?? 0).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                            {txItems.length === 0 && !loadingTx && (
                                <tr><td colSpan={6} className="py-8 text-center text-slate-400">尚無紀錄</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400">共 {txTotal.toLocaleString()} 筆，已載入 {txItems.length} 筆</span>
                    {txItems.length < txTotal && (
                        <button onClick={() => fetchTransactions(txSkip, true)} disabled={loadingTx} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                            {loadingTx ? <Loader2 size={14} className="animate-spin" /> : null} 載入更多
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoinUsageView;
