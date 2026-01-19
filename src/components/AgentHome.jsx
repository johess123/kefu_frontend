import React, { useState, useEffect } from 'react';
import { Layout, Plus, Edit2, Bot, Calendar, ArrowRight, Loader2, MessageCircle } from 'lucide-react';
import axios from 'axios';
import config from '../config';

const AgentHome = ({ userId, userName, onStartNew, onEditAgent }) => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const response = await axios.get(`${config.API_URL}/api/admin/agents`, {
                    params: { userId }
                });
                setAgents(response.data);
            } catch (error) {
                console.error('Failed to fetch agents:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAgents();
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            歡迎回來, {userName || '管理者'}
                        </h1>
                        <p className="text-slate-500">管理您的 AI 客服代理</p>
                    </div>
                    <button
                        onClick={onStartNew}
                        className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-200 active:scale-95"
                    >
                        <Plus size={20} />
                        建立新 Agent
                    </button>
                </div>

                {/* Agent List */}
                {agents.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                            <Bot size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">尚未建立任何 Agent</h2>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            立刻建立您的第一個 AI 客服，為您的顧客提供 24/7 的即時服務。
                        </p>
                        <button
                            onClick={onStartNew}
                            className="inline-flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700"
                        >
                            開始填寫問卷 <ArrowRight size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {agents.map((agent) => (
                            <div
                                key={agent._id}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                                            <Bot size={24} />
                                        </div>
                                        <button
                                            onClick={() => onEditAgent(agent)}
                                            className="text-slate-400 hover:text-brand-600 transition-colors p-2 hover:bg-slate-50 rounded-lg"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                                        {agent.name || '未命名 Agent'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[40px]">
                                        {agent.config?.raw_config?.services || '暫無描述'}
                                    </p>

                                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Calendar size={14} />
                                            最後更新: {new Date(agent.updated_at).toLocaleString()}
                                        </div>
                                        {agent.deploy_type === 'line' && (
                                            <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                                                <MessageCircle size={14} />
                                                已部署至 LINE
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 flex justify-end">
                                    <button
                                        onClick={() => onEditAgent(agent)}
                                        className="text-sm font-bold text-brand-600 flex items-center gap-1 group-hover:gap-2 transition-all"
                                    >
                                        管理設定 <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats / Help Section */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
                        <h4 className="font-bold mb-1">提示：如何優化 Agent</h4>
                        <p className="text-brand-100 text-sm mb-4">
                            提供越詳細的 FAQ，AI 就越能精準回答顧客問題。
                        </p>
                        <a href="#" className="text-xs font-bold underline">查看教學影片</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentHome;
