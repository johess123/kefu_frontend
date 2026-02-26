import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';

Chart.register(...registerables);

const API = `${config.API_URL}/api/monitor`;

const CHART_COLORS = {
    total: '#38bdf8',
    input: '#a855f7',
    output: '#34d399',
    tool: '#fb923c',
    thought: '#f472b6'
};

const commonOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: '#334155',
            borderWidth: 1
        }
    },
    scales: {
        x: {
            grid: { color: '#334155' },
            ticks: { color: '#94a3b8' }
        },
        y: {
            grid: { color: '#334155' },
            ticks: { color: '#94a3b8' }
        }
    },
    interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
    }
});

const MonitorDashboard = () => {
    const { lineUserId } = useAuth();
    const [days, setDays] = useState('7');
    const [usageType, setUsageType] = useState('全部');
    const [summary, setSummary] = useState({ total_requests: 0, total_tokens: 0, total_cost: 0 });
    const [globalData, setGlobalData] = useState(null);

    const [tokenChecks, setTokenChecks] = useState({ total: true, input: false, output: false, tool: false, thought: false });
    const [costChecks, setCostChecks] = useState({ total: true, input: false, output: false, tool: false, thought: false });

    const usageCanvasRef = useRef(null);
    const tokenCanvasRef = useRef(null);
    const costCanvasRef = useRef(null);

    const usageChartRef = useRef(null);
    const tokenChartRef = useRef(null);
    const costChartRef = useRef(null);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API}/stats?days=${days}&usage_type=${encodeURIComponent(usageType)}&userId=${lineUserId}`);
            const data = await res.json();
            setGlobalData(data);
            setSummary(data.summary);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [days, usageType]);

    // Render usage chart
    useEffect(() => {
        if (!globalData || !usageCanvasRef.current) return;
        if (usageChartRef.current) usageChartRef.current.destroy();

        usageChartRef.current = new Chart(usageCanvasRef.current, {
            type: 'line',
            data: {
                labels: globalData.labels,
                datasets: [{
                    label: '使用量 (筆數)',
                    data: globalData.usage,
                    borderColor: CHART_COLORS.total,
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: commonOptions()
        });

        return () => { if (usageChartRef.current) usageChartRef.current.destroy(); };
    }, [globalData]);

    // Render token chart
    useEffect(() => {
        if (!globalData || !tokenCanvasRef.current) return;
        if (tokenChartRef.current) tokenChartRef.current.destroy();

        const datasets = [];
        const parts = ['total', 'input', 'output', 'tool', 'thought'];
        parts.forEach(part => {
            if (tokenChecks[part]) {
                datasets.push({
                    label: part.toUpperCase(),
                    data: globalData.tokens[part],
                    borderColor: CHART_COLORS[part],
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                });
            }
        });

        tokenChartRef.current = new Chart(tokenCanvasRef.current, {
            type: 'line',
            data: { labels: globalData.labels, datasets },
            options: commonOptions()
        });

        return () => { if (tokenChartRef.current) tokenChartRef.current.destroy(); };
    }, [globalData, tokenChecks]);

    // Render cost chart
    useEffect(() => {
        if (!globalData || !costCanvasRef.current) return;
        if (costChartRef.current) costChartRef.current.destroy();

        const datasets = [];
        const parts = ['total', 'input', 'output', 'tool', 'thought'];
        parts.forEach(part => {
            if (costChecks[part]) {
                datasets.push({
                    label: part.toUpperCase(),
                    data: globalData.costs[part],
                    borderColor: CHART_COLORS[part],
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                });
            }
        });

        costChartRef.current = new Chart(costCanvasRef.current, {
            type: 'line',
            data: { labels: globalData.labels, datasets },
            options: commonOptions()
        });

        return () => { if (costChartRef.current) costChartRef.current.destroy(); };
    }, [globalData, costChecks]);

    const toggleToken = (key) => setTokenChecks(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleCost = (key) => setCostChecks(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <>
            <header>
                <div className="page-title">
                    <h1>Token 監控系統</h1>
                    <p>查看總 Token 消耗與預估花費</p>
                </div>
                <div className="filters">
                    <select value={usageType} onChange={e => setUsageType(e.target.value)}>
                        <option value="全部">全部類別</option>
                        <option value="解析表單">解析表單</option>
                        <option value="爬取商家網站">爬取商家網站</option>
                        <option value="生成 FAQ">生成 FAQ</option>
                        <option value="優化 FAQ">優化 FAQ</option>
                        <option value="AI 健檢 FAQ">AI 健檢 FAQ</option>
                        <option value="聊天">聊天</option>
                    </select>
                    <select value={days} onChange={e => setDays(e.target.value)}>
                        <option value="7">最近 7 天</option>
                        <option value="30">最近 30 天</option>
                        <option value="1">今日</option>
                    </select>
                    <button onClick={fetchData}>重新整理</button>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card requests">
                    <span className="stat-label">總使用量 (筆)</span>
                    <span className="stat-value">{summary.total_requests.toLocaleString()}</span>
                </div>
                <div className="stat-card tokens">
                    <span className="stat-label">總 Token 消耗</span>
                    <span className="stat-value">{summary.total_tokens.toLocaleString()}</span>
                </div>
                <div className="stat-card cost">
                    <span className="stat-label">預估總花費 (USD)</span>
                    <span className="stat-value">${summary.total_cost.toFixed(4)}</span>
                </div>
            </div>

            <div className="chart-container">
                <div className="chart-header">
                    <div className="chart-title">使用量趨勢 (筆數)</div>
                </div>
                <div style={{ position: 'relative', height: '300px' }}>
                    <canvas ref={usageCanvasRef}></canvas>
                </div>
            </div>

            <div className="chart-container">
                <div className="chart-header">
                    <div className="chart-title">Token 消耗</div>
                    <div className="options">
                        {['total', 'input', 'output', 'tool', 'thought'].map(k => (
                            <label key={k} className="checkbox-group">
                                <input type="checkbox" checked={tokenChecks[k]} onChange={() => toggleToken(k)} />
                                {k === 'total' ? '總 Token' : k.charAt(0).toUpperCase() + k.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>
                <div style={{ position: 'relative', height: '300px' }}>
                    <canvas ref={tokenCanvasRef}></canvas>
                </div>
            </div>

            <div className="chart-container">
                <div className="chart-header">
                    <div className="chart-title">預估花費 (USD)</div>
                    <div className="options">
                        {['total', 'input', 'output', 'tool', 'thought'].map(k => (
                            <label key={k} className="checkbox-group">
                                <input type="checkbox" checked={costChecks[k]} onChange={() => toggleCost(k)} />
                                {k === 'total' ? '總花費' : k.charAt(0).toUpperCase() + k.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>
                <div style={{ position: 'relative', height: '300px' }}>
                    <canvas ref={costCanvasRef}></canvas>
                </div>
            </div>
        </>
    );
};

export default MonitorDashboard;
