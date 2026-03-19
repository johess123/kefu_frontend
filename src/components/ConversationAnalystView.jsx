import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import {
    BarChart2,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    TrendingUp,
    MessageSquare,
    Lightbulb,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    Play,
    Filter,
    Edit3,
    Plus,
    AlertCircle,
    Eye,
    MessageCircle,
    User,
    Bot
} from 'lucide-react';

const ConversationAnalystView = ({ agentId, adminId, onFaqUpdated }) => {
    const [stats, setStats] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
    const [days, setDays] = useState(7);
    const [activeTab, setActiveTab] = useState('pending');
    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ question: '', answer: '' });
    const [acceptingId, setAcceptingId] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [selectedTheme, setSelectedTheme] = useState('all');

    const fetchPreview = useCallback(async (previewDays) => {
        if (!agentId) return;
        setIsLoadingPreview(true);
        try {
            const res = await axios.get(`${config.API_URL}/api/analysis/${agentId}/preview`, {
                params: { days: previewDays }
            });
            setPreviewData(res.data);
        } catch (err) {
            console.error('Failed to fetch preview:', err);
            setPreviewData(null);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [agentId]);

    const fetchStats = useCallback(async () => {
        if (!agentId) return;
        setIsLoadingStats(true);
        try {
            const res = await axios.get(`${config.API_URL}/api/analysis/${agentId}/stats`);
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setIsLoadingStats(false);
        }
    }, [agentId]);

    const fetchSuggestions = useCallback(async (statusFilter) => {
        if (!agentId) return;
        setIsLoadingSuggestions(true);
        try {
            const params = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
            const res = await axios.get(`${config.API_URL}/api/analysis/${agentId}/suggestions`, { params });
            setSuggestions(res.data.suggestions || []);
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [agentId]);

    useEffect(() => {
        fetchStats();
        fetchSuggestions(activeTab);
    }, [fetchStats, fetchSuggestions, activeTab]);

    useEffect(() => {
        fetchPreview(days);
    }, [fetchPreview, days]);

    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const res = await axios.post(`${config.API_URL}/api/analysis/${agentId}/run`, {
                agent_id: agentId,
                userId: adminId,
                days
            });
            setAnalysisResult(res.data);
            await fetchStats();
            await fetchSuggestions(activeTab);
        } catch (err) {
            console.error('Analysis failed:', err);
            setAnalysisResult({ error: err.response?.data?.detail || '分析失敗' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAccept = async (suggestionId) => {
        setAcceptingId(suggestionId);
        try {
            await axios.post(
                `${config.API_URL}/api/analysis/${agentId}/suggestions/${suggestionId}/accept?userId=${adminId}`
            );
            await fetchSuggestions(activeTab);
            await fetchStats();
            if (onFaqUpdated) onFaqUpdated();
        } catch (err) {
            console.error('Accept failed:', err);
            alert(err.response?.data?.detail || '加入 FAQ 失敗');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleIgnore = async (suggestionId) => {
        try {
            await axios.post(
                `${config.API_URL}/api/analysis/${agentId}/suggestions/${suggestionId}/update`,
                { status: 'ignored' }
            );
            await fetchSuggestions(activeTab);
            await fetchStats();
        } catch (err) {
            console.error('Ignore failed:', err);
        }
    };

    const handleSaveEdit = async (suggestionId) => {
        try {
            await axios.post(
                `${config.API_URL}/api/analysis/${agentId}/suggestions/${suggestionId}/update`,
                {
                    status: 'pending',
                    edited_question: editForm.question,
                    edited_answer: editForm.answer
                }
            );
            setEditingId(null);
            await fetchSuggestions(activeTab);
        } catch (err) {
            console.error('Save edit failed:', err);
        }
    };

    const startEditing = (suggestion) => {
        setEditingId(suggestion._id);
        setEditForm({
            question: suggestion.suggested_question,
            answer: suggestion.suggested_answer
        });
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.7) return 'text-green-600 bg-green-50 border-green-100';
        if (confidence >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-100';
        return 'text-slate-500 bg-slate-50 border-slate-100';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 rounded-full">待處理</span>;
            case 'accepted':
                return <span className="px-2.5 py-1 text-[10px] font-bold bg-green-50 text-green-600 border border-green-100 rounded-full">已新增</span>;
            case 'ignored':
                return <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-50 text-slate-400 border border-slate-100 rounded-full">已忽略</span>;
            default:
                return null;
        }
    };

    const tabs = [
        { key: 'pending', label: '待處理' },
        { key: 'accepted', label: '歷史紀錄' }
    ];

    const statusFiltered = suggestions.filter(s => s.status === activeTab);

    // 提取所有不重複的 theme 值
    const themeOptions = [...new Set(statusFiltered.map(s => s.theme).filter(Boolean))];

    const filteredSuggestions = selectedTheme === 'all'
        ? statusFiltered
        : statusFiltered.filter(s => s.theme === selectedTheme);

    return (
        <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100 shadow-sm">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">數據分析師 (Conversation Analyst)</h1>
                        <p className="text-slate-500 text-sm">分析客戶對話，找出 FAQ 覆蓋不足的問題，自動生成 FAQ 建議。</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">分析對話數</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {isLoadingStats ? '-' : (stats?.latest_run?.total_conversations || 0)}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-green-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">FAQ 覆蓋率</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {isLoadingStats ? '-' : `${stats?.latest_run?.coverage_rate || 0}%`}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-amber-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">待處理建議</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {isLoadingStats ? '-' : (stats?.pending_count || 0)}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">已新增 FAQ</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {isLoadingStats ? '-' : (stats?.accepted_count || 0)}
                    </p>
                </div>
            </div>

            {/* Coverage Gap Hint */}
            {stats && stats.pending_count > 0 && (
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 mb-8 flex items-start gap-3">
                    <Lightbulb size={20} className="text-purple-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-purple-800">FAQ 缺口提示</p>
                        <p className="text-xs text-purple-600 mt-1">
                            目前有 {stats.pending_count} 項建議待處理。補齊這些 FAQ 可提升覆蓋率，讓 AI 回答更精準。
                        </p>
                    </div>
                </div>
            )}

            {/* Analysis Control */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden mb-8">
                <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">執行分析</h3>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Run Analysis</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                            >
                                <option value={7}>最近 7 天</option>
                                <option value={14}>最近 14 天</option>
                                <option value={30}>最近 30 天</option>
                                <option value={90}>最近 90 天</option>
                            </select>
                            <button
                                onClick={handleRunAnalysis}
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-200 active:scale-95"
                            >
                                {isAnalyzing ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Play size={18} />
                                )}
                                {isAnalyzing ? '分析中...' : '執行分析'}
                            </button>
                        </div>
                    </div>

                    {/* Analysis Result Banner */}
                    {analysisResult && !analysisResult.error && (
                        <div className="mt-6 bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3">
                            <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold text-green-800">分析完成</p>
                                <p className="text-green-600 mt-1">
                                    共分析 {analysisResult.stats?.total_conversations || 0} 段對話，
                                    覆蓋率 {analysisResult.stats?.coverage_rate || 0}%，
                                    產生 {analysisResult.stats?.suggestions_generated || 0} 項建議。
                                </p>
                            </div>
                        </div>
                    )}
                    {analysisResult?.error && (
                        <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold text-red-800">分析失敗</p>
                                <p className="text-red-600 mt-1">{analysisResult.error}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Conversation Preview Section */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden mb-8">
                <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Eye size={20} className="text-purple-500" />
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">對話預覽</h3>
                                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Conversation Preview</p>
                            </div>
                        </div>
                        {previewData?.summary && previewData.summary.message_count > 0 && (
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <User size={14} className="text-purple-400" />
                                    <span className="font-bold text-slate-700">{previewData.summary.user_count}</span> 位用戶
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1.5">
                                    <MessageCircle size={14} className="text-slate-400" />
                                    <span className="font-bold text-slate-700">{previewData.summary.session_count}</span> 個對話
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1.5">
                                    <MessageSquare size={14} className="text-slate-400" />
                                    <span className="font-bold text-slate-700">{previewData.summary.message_count}</span> 則訊息
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {isLoadingPreview ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-purple-500" />
                        </div>
                    ) : !previewData || previewData.summary.message_count === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <MessageCircle size={40} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">此時間範圍內沒有對話記錄</p>
                        </div>
                    ) : (
                        <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
                            {previewData.users.map((userGroup, idx) => (
                                <div
                                    key={userGroup.user_id}
                                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-purple-200 transition-all"
                                >
                                    {/* User Header */}
                                    <div
                                        className="p-4 cursor-pointer flex items-center justify-between"
                                        onClick={() => setExpandedUserId(
                                            expandedUserId === userGroup.user_id ? null : userGroup.user_id
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center border border-purple-100">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">用戶 #{idx + 1}</p>
                                                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                                                    {userGroup.user_id.length > 16 ? `${userGroup.user_id.slice(0, 16)}...` : userGroup.user_id}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100 rounded-full">
                                                {userGroup.message_count} 則訊息
                                            </span>
                                            <span className="px-2.5 py-1 text-[10px] font-bold bg-purple-50 text-purple-500 border border-purple-100 rounded-full">
                                                {userGroup.user_message_count} 問 / {userGroup.ai_message_count} 答
                                            </span>
                                            {expandedUserId === userGroup.user_id ? (
                                                <ChevronUp size={16} className="text-slate-400" />
                                            ) : (
                                                <ChevronDown size={16} className="text-slate-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* User Messages Timeline */}
                                    {expandedUserId === userGroup.user_id && (
                                        <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-2">
                                            {userGroup.messages.map((msg, msgIdx) => (
                                                <div
                                                    key={msgIdx}
                                                    className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                                                >
                                                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                                                        msg.sender === 'user'
                                                            ? 'bg-slate-100 text-slate-700 rounded-tl-md'
                                                            : 'bg-purple-500 text-white rounded-tr-md'
                                                    }`}>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            {msg.sender === 'user' ? (
                                                                <User size={12} className="opacity-50" />
                                                            ) : (
                                                                <Bot size={12} className="opacity-50" />
                                                            )}
                                                            <span className="text-[10px] opacity-50 font-bold">
                                                                {msg.sender === 'user' ? '用戶' : 'AI'}
                                                            </span>
                                                            {msg.created_at && (
                                                                <span className="text-[10px] opacity-40 ml-1">
                                                                    {new Date(msg.created_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                            {msg.faq_hit === true && (
                                                                <span className={`text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded ${
                                                                    msg.sender === 'ai' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-600'
                                                                }`}>FAQ</span>
                                                            )}
                                                        </div>
                                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {userGroup.message_count > userGroup.messages.length && (
                                                <p className="text-center text-xs text-slate-400 py-2">
                                                    ... 還有 {userGroup.message_count - userGroup.messages.length} 則訊息
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Suggestions Section */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">FAQ 建議</h3>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Suggestions</p>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => { setActiveTab(tab.key); setSelectedTheme('all'); }}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                        activeTab === tab.key
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Theme Filter */}
                    {!isLoadingSuggestions && statusFiltered.length > 0 && themeOptions.length > 0 && (
                        <div className="mb-4">
                            <select
                                value={selectedTheme}
                                onChange={(e) => setSelectedTheme(e.target.value)}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                            >
                                <option value="all">全部主題 ({statusFiltered.length})</option>
                                {themeOptions.map(theme => (
                                    <option key={theme} value={theme}>
                                        {theme} ({statusFiltered.filter(s => s.theme === theme).length})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {isLoadingSuggestions ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-purple-500" />
                        </div>
                    ) : filteredSuggestions.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <BarChart2 size={40} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">
                                {activeTab === 'pending'
                                    ? '目前沒有待處理的 FAQ 建議。執行分析來發現新的 FAQ 缺口。'
                                    : '尚無已採納的 FAQ 建議。'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredSuggestions.map((suggestion) => (
                                <div
                                    key={suggestion._id}
                                    className={`border rounded-2xl overflow-hidden transition-all ${
                                        suggestion.status === 'accepted'
                                            ? 'bg-slate-50/50 border-slate-100 opacity-75'
                                            : 'bg-white border-slate-100 hover:border-purple-200'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div
                                        className="p-5 cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === suggestion._id ? null : suggestion._id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 mr-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {getStatusBadge(suggestion.status)}
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                                                        {Math.round(suggestion.confidence * 100)}% 信心度
                                                    </span>
                                                    <span className="px-2.5 py-1 text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100 rounded-full">
                                                        {suggestion.frequency} 次
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800">{suggestion.suggested_question}</p>
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{suggestion.suggested_answer}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {suggestion.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAccept(suggestion._id); }}
                                                            disabled={acceptingId === suggestion._id}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            {acceptingId === suggestion._id ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Plus size={14} />
                                                            )}
                                                            加入 FAQ
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleIgnore(suggestion._id); }}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            <X size={14} />
                                                            忽略
                                                        </button>
                                                    </>
                                                )}
                                                {expandedId === suggestion._id ? (
                                                    <ChevronUp size={18} className="text-slate-400" />
                                                ) : (
                                                    <ChevronDown size={18} className="text-slate-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {expandedId === suggestion._id && (
                                        <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                                            {editingId === suggestion._id ? (
                                                /* Edit Mode */
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">建議問題</label>
                                                        <input
                                                            value={editForm.question}
                                                            onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">建議回答</label>
                                                        <textarea
                                                            value={editForm.answer}
                                                            onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                                                            rows={4}
                                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                                        >
                                                            取消
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveEdit(suggestion._id)}
                                                            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all"
                                                        >
                                                            儲存
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* View Mode */
                                                <div>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">建議 Q&A</h4>
                                                        {suggestion.status === 'pending' && (
                                                            <button
                                                                onClick={() => startEditing(suggestion)}
                                                                className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700"
                                                            >
                                                                <Edit3 size={14} />
                                                                編輯
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="bg-white rounded-xl border border-slate-100 p-4 mb-4">
                                                        <p className="text-sm font-bold text-slate-800 mb-2">Q: {suggestion.suggested_question}</p>
                                                        <p className="text-sm text-slate-600">A: {suggestion.suggested_answer}</p>
                                                    </div>

                                                    {/* Source Questions */}
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                                        相關原始問題 ({suggestion.source_questions?.length || 0})
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {(suggestion.source_questions || []).map((q, idx) => (
                                                            <div key={idx} className="bg-white rounded-lg border border-slate-100 px-4 py-2.5 text-sm text-slate-600">
                                                                "{q}"
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {suggestion.theme && (
                                                        <div className="mt-4 text-xs text-slate-400">
                                                            主題分類：{suggestion.theme}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationAnalystView;
