import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bot, Calendar, ArrowRight, Loader2, MessageCircle, ExternalLink, LayoutGrid, BarChart2, LogOut, AlertTriangle, Trash2, Send, Hash, ChevronDown } from 'lucide-react';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../context/AuthContext';

const ConfirmModal = ({ icon, iconBg, iconColor, title, description, confirmText, confirmStyle, onConfirm, onCancel, loading }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 animate-[fade-up_0.2s_ease]">
            <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">{title}</h3>
            <p className="text-slate-500 text-sm text-center mb-6">
                {description}
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                    取消
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${confirmStyle}`}
                >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {confirmText}
                </button>
            </div>
        </div>
    </div>
);

const AgentHome = () => {
    const navigate = useNavigate();
    const { userId, userName, userEmail, userPicture, isMonitorAllowed, logout } = useAuth();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const response = await axios.get(`${config.API_URL}/api/admin/agents`, {
                    params: { userId: userId }
                });
                const data = response.data;
                if (data.length === 1) {
                    navigate(`/agent/${data[0]._id}`, { replace: true });
                    return;
                }
                setAgents(data);
            } catch (error) {
                console.error('Failed to fetch agents:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAgents();
    }, [userId]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await axios.delete(`${config.API_URL}/api/admin/agent/${deleteTarget._id}`, {
                params: { userId }
            });
            setAgents(prev => prev.filter(a => a._id !== deleteTarget._id));
            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete agent:', error);
        } finally {
            setDeleting(false);
        }
    };

    const getDeployChannels = (agent) => {
        const channels = [];
        if (agent.deploy_config?.line) {
            channels.push({ name: 'LINE', color: 'text-green-600', bgColor: 'bg-green-50', displayName: agent.deploy_config.line.display_name });
        }
        if (agent.deploy_config?.telegram) {
            channels.push({ name: 'Telegram', color: 'text-blue-500', bgColor: 'bg-blue-50', displayName: `@${agent.deploy_config.telegram.bot_username}` });
        }
        return channels;
    };

    const getFaqCount = (agent) => {
        return agent.config?.raw_config?.faqs?.length || 0;
    };

    const getProductCount = (agent) => {
        return agent.config?.raw_config?.products?.length || 0;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            </div>
        );
    }

    return (
        <>
        <div className="min-h-screen bg-slate-50">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    {/* Logo / Brand */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                            <Bot size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-slate-800 text-base">KeFu AI</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {isMonitorAllowed && (
                            <button
                                onClick={() => navigate('/monitor')}
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl transition-all active:scale-95 text-sm"
                            >
                                <BarChart2 size={16} />
                                Monitor
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/wizard/new')}
                            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-md shadow-brand-100 active:scale-95 text-sm"
                        >
                            <Plus size={16} />
                            建立新 Agent
                        </button>

                        {/* User Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(v => !v)}
                                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                {userPicture ? (
                                    <img src={userPicture} alt={userName} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
                                        {(userName || 'U')[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="hidden md:block text-left">
                                    <p className="text-xs font-semibold text-slate-800 leading-tight">{userName || '管理者'}</p>
                                    <p className="text-xs text-slate-400 leading-tight">{userEmail || ''}</p>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showUserMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
                                        {/* User Info */}
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <p className="text-xs font-semibold text-slate-800">{userName}</p>
                                            <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                                        </div>
                                        <button
                                            onClick={() => { setShowUserMenu(false); setShowLogoutModal(true); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                        >
                                            <LogOut size={15} />
                                            登出
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-4 md:p-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        歡迎回來，{userName || '管理者'}
                    </h1>
                    <p className="text-slate-500 text-sm">共 {agents.length} 個 AI 客服代理</p>
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
                        {agents.map((agent) => {
                            const channels = getDeployChannels(agent);
                            const faqCount = getFaqCount(agent);
                            const productCount = getProductCount(agent);
                            const hasDeployment = channels.length > 0;

                            return (
                            <div
                                key={agent._id}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                                            <Bot size={24} />
                                        </div>
                                        {hasDeployment ? (
                                            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                <span className="text-xs font-bold">營運中</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-slate-50 text-slate-500 px-3 py-1 rounded-full border border-slate-200">
                                                <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                                                <span className="text-xs font-bold">未部署</span>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                                        {agent.name || '未命名 Agent'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">
                                        {agent.config?.raw_config?.services || '暫無描述'}
                                    </p>

                                    {/* 知識庫統計 */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Hash size={12} />
                                            <span>FAQ {faqCount} 條</span>
                                        </div>
                                        {productCount > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Hash size={12} />
                                                <span>商品 {productCount} 項</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 mb-5">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Calendar size={14} />
                                            最後更新: {new Date(agent.updated_at).toLocaleString()}
                                        </div>

                                        {/* 渠道部署狀態 */}
                                        {channels.map((ch) => (
                                            <div key={ch.name} className="flex items-center gap-2 text-xs font-medium">
                                                {ch.name === 'LINE' ? (
                                                    <MessageCircle size={14} className={ch.color} />
                                                ) : (
                                                    <Send size={14} className={ch.color} />
                                                )}
                                                <span className={ch.color}>已部署至 {ch.name}</span>
                                                {ch.displayName && (
                                                    <span className="text-slate-400">({ch.displayName})</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate('/agent/' + agent._id, { state: { agent } })}
                                            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-brand-100"
                                        >
                                            <LayoutGrid size={18} />
                                            進入後台
                                        </button>
                                        <button
                                            onClick={() => navigate('/wizard/' + agent._id, { state: { agentData: agent } })}
                                            className="w-11 h-11 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-all active:scale-95"
                                            title="重新填寫問卷"
                                        >
                                            <ExternalLink size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(agent); }}
                                            className="w-11 h-11 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95"
                                            title="刪除此 Agent"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {showLogoutModal && (
            <ConfirmModal
                icon={<AlertTriangle size={24} className="text-amber-500" />}
                iconBg="bg-amber-50"
                title="確認登出？"
                description="登出後需要重新使用 Google 帳號登入才能進入系統。"
                confirmText="確認登出"
                confirmStyle="bg-red-500 hover:bg-red-600 text-white"
                onConfirm={() => { setShowLogoutModal(false); logout(); }}
                onCancel={() => setShowLogoutModal(false)}
            />
        )}

        {deleteTarget && (
            <ConfirmModal
                icon={<Trash2 size={24} className="text-red-500" />}
                iconBg="bg-red-50"
                title={`確認刪除「${deleteTarget.name || '未命名 Agent'}」？`}
                description="刪除後將無法復原，所有對話紀錄、FAQ、商品資料及相關設定都會一併移除。"
                confirmText="確認刪除"
                confirmStyle="bg-red-500 hover:bg-red-600 text-white"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => { if (!deleting) setDeleteTarget(null); }}
            />
        )}
        </>
    );
};

export default AgentHome;
