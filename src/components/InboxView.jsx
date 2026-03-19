import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import { RefreshCw, Send, MessageSquare } from 'lucide-react';

const API = config.API_URL;

export default function InboxView({ currentAgent }) {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [activeTab, setActiveTab] = useState('open');
    const [isClosing, setIsClosing] = useState(false);
    const [lineQuota, setLineQuota] = useState(null);
    const messagesEndRef = useRef(null);

    const agentId = currentAgent?._id;
    const adminId = currentAgent?.admin_id;

    const fetchSessions = useCallback(async () => {
        if (!agentId || !adminId) return;
        setIsLoadingSessions(true);
        try {
            const res = await axios.get(
                `${API}/api/inbox/agents/${agentId}/sessions?userId=${adminId}&tab=${activeTab}`
            );
            setSessions(res.data.sessions || []);
        } catch (err) {
            console.error('Failed to fetch sessions', err);
        } finally {
            setIsLoadingSessions(false);
        }
    }, [agentId, adminId, activeTab]);

    const fetchLineQuota = useCallback(async () => {
        if (!agentId || !adminId) return;
        const hasLine = currentAgent?.deploy_config?.line?.access_token ||
                        currentAgent?.deploy_config?.access_token;
        if (!hasLine) return;
        try {
            const res = await axios.get(`${API}/api/inbox/agents/${agentId}/line-quota?userId=${adminId}`);
            setLineQuota(res.data);
        } catch (err) {
            console.error('Failed to fetch LINE quota', err);
        }
    }, [agentId, adminId, currentAgent]);

    const fetchMessages = useCallback(async (sessionId) => {
        if (!sessionId || !agentId || !adminId) return;
        setIsLoadingMessages(true);
        try {
            const res = await axios.get(
                `${API}/api/inbox/sessions/${sessionId}/messages?userId=${adminId}&agent_id=${agentId}`
            );
            setMessages(res.data.messages || []);
        } catch (err) {
            console.error('Failed to fetch messages', err);
        } finally {
            setIsLoadingMessages(false);
        }
    }, [agentId, adminId]);

    useEffect(() => {
        fetchSessions();
        fetchLineQuota();
    }, [fetchSessions, fetchLineQuota]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        }
    }, [messages]);

    const handleSelectSession = (sess) => {
        setSelectedSession(sess);
        setMessages([]);
        fetchMessages(sess.session_id);
    };

    const handleSend = async () => {
        if (!replyText.trim() || !selectedSession || isSending) return;

        const text = replyText.trim();
        const pad = n => String(n).padStart(2, '0');
        const now = new Date();
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const optimisticMsg = { sender: 'human_agent', content: text, time: timeStr };

        // 立即更新 UI（清空輸入框、插入訊息、鎖住發送、額度 -1）
        setReplyText('');
        setIsSending(true);
        setMessages(prev => [...prev, optimisticMsg]);
        if (getChannel(selectedSession) === 'line') {
            setLineQuota(prev =>
                prev && prev.type !== 'none'
                    ? { ...prev, used: prev.used + 1, remaining: prev.remaining - 1 }
                    : prev
            );
        }
        try {
            await axios.post(
                `${API}/api/inbox/sessions/${selectedSession.session_id}/reply?userId=${adminId}`,
                { agent_id: agentId, message: text }
            );
            fetchSessions();
            fetchLineQuota(); // 背景確認實際額度
        } catch (err) {
            console.error('Failed to send reply', err);
            // 回滾所有樂觀更新
            setMessages(prev => prev.filter(m => m !== optimisticMsg));
            setReplyText(text);
            if (getChannel(selectedSession) === 'line') {
                setLineQuota(prev =>
                    prev && prev.type !== 'none'
                        ? { ...prev, used: prev.used - 1, remaining: prev.remaining + 1 }
                        : prev
                );
            }
            alert('發送失敗，請確認渠道部署設定是否正確。');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClose = async () => {
        if (!selectedSession || isClosing) return;
        setIsClosing(true);
        try {
            await axios.post(
                `${API}/api/inbox/sessions/${selectedSession.session_id}/close?userId=${adminId}`,
                { agent_id: agentId }
            );
            setSelectedSession(null);
            setActiveTab('done');
        } finally {
            setIsClosing(false);
        }
    };

    const getChannel = (sess) =>
        sess?.channel || (sess?.session_id?.startsWith('telegram_') ? 'telegram' : 'line');

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        return timeStr;
    };

    const senderLabel = (sender) => {
        if (sender === 'user') return '用戶';
        if (sender === 'ai') return 'AI';
        if (sender === 'human_agent') return '客服';
        return sender;
    };

    const bubbleStyle = (sender) => {
        if (sender === 'user') {
            return {
                wrapper: 'justify-start',
                bubble: 'bg-slate-100 text-slate-800',
                label: 'text-slate-500',
            };
        }
        if (sender === 'ai') {
            return {
                wrapper: 'justify-end',
                bubble: 'bg-brand-500 text-white',
                label: 'text-brand-400',
            };
        }
        // human_agent
        return {
            wrapper: 'justify-end',
            bubble: 'bg-orange-500 text-white',
            label: 'text-orange-400',
        };
    };

    const hasChannel = currentAgent?.deploy_config?.line ||
                       currentAgent?.deploy_config?.telegram ||
                       currentAgent?.deploy_type === 'line' ||
                       currentAgent?.deploy_type === 'telegram';
    if (!hasChannel) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 gap-4">
                <MessageSquare size={48} className="text-slate-300" />
                <div>
                    <p className="text-lg font-semibold text-slate-700">尚未串接渠道</p>
                    <p className="text-sm mt-1">請先至「渠道串接」完成 LINE 或 Telegram Bot 部署，才能使用對話收件匣。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 120px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">對話收件匣</h1>
                    <p className="text-slate-500 text-sm">查看並回覆用戶訊息</p>
                </div>
                <button
                    onClick={() => { fetchSessions(); fetchLineQuota(); }}
                    disabled={isLoadingSessions}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                    <RefreshCw size={16} className={isLoadingSessions ? 'animate-spin' : ''} />
                    重新整理
                </button>
            </div>

            {/* LINE Quota Bar */}
            {lineQuota && (
                <div className="mb-4 px-4 py-3 bg-white rounded-2xl border border-slate-200">
                    {lineQuota.type === 'none' ? (
                        <p className="text-sm text-slate-400">方案：不限推播則數 ✓</p>
                    ) : (() => {
                        const pct = lineQuota.limit > 0 ? Math.round((lineQuota.used / lineQuota.limit) * 100) : 0;
                        const isWarn = pct >= 75;
                        const isCaution = pct >= 50 && pct < 75;
                        const barColor = isWarn ? 'bg-red-500' : isCaution ? 'bg-orange-400' : 'bg-green-500';
                        const textColor = isWarn ? 'text-red-600' : isCaution ? 'text-orange-600' : 'text-slate-500';
                        return (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-sm font-medium ${textColor}`}>
                                        本月推播：已用 {lineQuota.used} / {lineQuota.limit} 則（剩餘 {lineQuota.remaining}）
                                    </span>
                                    <span className={`text-xs font-semibold ${textColor}`}>{pct}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${barColor}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                </div>
                                {isWarn && (
                                    <p className="mt-1.5 text-xs text-red-600">
                                        ⚠️ 額度即將用罄，請盡快升級 LINE 方案以免無法回覆客人。
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Main grid */}
            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Left: session list */}
                <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
                    {/* Tab buttons */}
                    <div className="flex border-b border-slate-100">
                        <button
                            onClick={() => { setActiveTab('open'); setSelectedSession(null); }}
                            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'open' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            待處理 (OPEN)
                        </button>
                        <button
                            onClick={() => { setActiveTab('done'); setSelectedSession(null); }}
                            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'done' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            已結案 (DONE)
                        </button>
                    </div>
                    <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-400">
                        共 {sessions.length} 筆
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {isLoadingSessions ? (
                            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">載入中...</div>
                        ) : sessions.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">尚無對話紀錄</div>
                        ) : (
                            sessions.map((sess) => {
                                const isSelected = selectedSession?.session_id === sess.session_id;
                                const ch = getChannel(sess);
                                return (
                                    <button
                                        key={sess.session_id}
                                        onClick={() => handleSelectSession(sess)}
                                        className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-medium text-slate-800 text-sm truncate">{sess.user_name}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${ch === 'telegram' ? 'bg-sky-100 text-sky-600' : 'bg-green-100 text-green-600'}`}>
                                                    {ch === 'telegram' ? 'TG' : 'LINE'}
                                                </span>
                                            </div>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${sess.mode === 'human' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {sess.mode === 'human' ? '人工' : 'AI'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5 truncate">{sess.last_message || '（無訊息）'}</p>
                                        <p className="text-xs text-slate-300 mt-0.5">{formatTime(sess.last_time)}</p>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: message area */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
                    {!selectedSession ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                            請選取左側對話
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-slate-800">{selectedSession.user_name}</p>
                                        {(() => {
                                            const ch = getChannel(selectedSession);
                                            return (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${ch === 'telegram' ? 'bg-sky-100 text-sky-600' : 'bg-green-100 text-green-600'}`}>
                                                    {ch === 'telegram' ? 'TG' : 'LINE'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <p className="text-xs text-slate-400">{selectedSession.session_id}</p>
                                </div>
                                <span className={`ml-auto text-xs px-2 py-1 rounded-full ${selectedSession.mode === 'human' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {selectedSession.mode === 'human' ? '人工客服模式' : 'AI 模式'}
                                </span>
                                {activeTab === 'open' && (
                                    <button
                                        onClick={handleClose}
                                        disabled={isClosing}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isClosing ? '結案中...' : '標記結案'}
                                    </button>
                                )}
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {isLoadingMessages ? (
                                    <div className="flex items-center justify-center h-16 text-slate-400 text-sm">載入訊息中...</div>
                                ) : messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-16 text-slate-400 text-sm">尚無訊息</div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const style = bubbleStyle(msg.sender);
                                        return (
                                            <div key={idx} className={`flex ${style.wrapper}`}>
                                                <div className="max-w-[70%]">
                                                    <p className={`text-xs mb-1 ${style.label} ${msg.sender !== 'user' ? 'text-right' : ''}`}>
                                                        {senderLabel(msg.sender)} · {msg.time}
                                                    </p>
                                                    <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${style.bubble}`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply box */}
                            <div className="px-4 py-3 border-t border-slate-100 flex gap-2 items-end">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isSending}
                                    placeholder="輸入回覆訊息（Enter 換行，Ctrl+Enter 發送）"
                                    rows={2}
                                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isSending || !replyText.trim()}
                                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
