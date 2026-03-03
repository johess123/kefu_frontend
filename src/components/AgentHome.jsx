import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bot, Calendar, ArrowRight, Loader2, MessageCircle, ExternalLink, LayoutGrid, BarChart2, LogOut, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../context/AuthContext';

const LogoutModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 animate-[fade-up_0.2s_ease]">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">確認登出？</h3>
            <p className="text-slate-500 text-sm text-center mb-6">
                登出後需要重新使用 Google 帳號登入才能進入系統。
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    取消
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                    確認登出
                </button>
            </div>
        </div>
    </div>
);

const AgentHome = () => {
    const navigate = useNavigate();
    const { userId, userName, isMonitorAllowed, logout } = useAuth();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const response = await axios.get(`${config.API_URL}/api/admin/agents`, {
                    params: { userId: userId }
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
        <>
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
                    <div className="flex items-center gap-3">
                        {isMonitorAllowed && (
                            <button
                                onClick={() => navigate('/monitor')}
                                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 px-5 rounded-xl transition-all active:scale-95"
                            >
                                <BarChart2 size={18} />
                                Monitor
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/wizard/new')}
                            className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-200 active:scale-95"
                        >
                            <Plus size={20} />
                            建立新 Agent
                        </button>
                        <button
                            onClick={() => setShowLogoutModal(true)}
                            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 cursor-pointer"
                            title="登出"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
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
                            onClick={() => navigate('/wizard/new')}
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
                                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                            <span className="text-xs font-bold">營運中</span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                                        {agent.name || '未命名 Agent'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[40px]">
                                        {agent.config?.raw_config?.services || '暫無描述'}
                                    </p>

                                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 mb-6">
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

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => navigate('/agent/' + agent._id, { state: { agent } })}
                                            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-brand-100"
                                        >
                                            <LayoutGrid size={18} />
                                            進入公司後台
                                        </button>
                                        <button
                                            onClick={() => navigate('/wizard/' + agent._id, { state: { agentData: agent } })}
                                            className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-all active:scale-95"
                                            title="填表流程"
                                        >
                                            <ExternalLink size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {showLogoutModal && (
            <LogoutModal
                onConfirm={() => { setShowLogoutModal(false); logout(); }}
                onCancel={() => setShowLogoutModal(false)}
            />
        )}
        </>
    );
};

export default AgentHome;
