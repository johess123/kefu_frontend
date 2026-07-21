import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { Send, X, Check, Loader2 } from 'lucide-react';
import FlexMessageModal from './FlexMessageModal';

export const CRM_TAG_OPTIONS = [
    { label: 'VIP', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { label: '新客戶', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { label: '回頭客', color: 'bg-green-100 text-green-700 border-green-200' },
    { label: '高意願', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    { label: '待跟進', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { label: '已成交', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '問題客戶', color: 'bg-red-100 text-red-700 border-red-200' },
    { label: '合作夥伴', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

export const getTagColor = (tag) => {
    const found = CRM_TAG_OPTIONS.find(t => t.label === tag);
    return found ? found.color : 'bg-slate-100 text-slate-600 border-slate-200';
};

/**
 * 客戶 CRM 詳情面板（基本資料 / Flex Message / 標籤 / 備註）。
 * 由 CRM 會員詳情 Drawer 抽離而來，收件匣右側面板與 CRM Drawer 共用。
 *
 * props:
 * - user: { line_id, user_name, channel, last_time, tags, notes }
 * - currentAgent: 目前 agent（需含 _id, admin_id）
 * - onUserUpdate: (updatedUser) => void，標籤/備註儲存成功後回抛最新 user
 */
export default function CrmMemberPanel({ user, currentAgent, onUserUpdate }) {
    const [editingNotes, setEditingNotes] = useState(user?.notes || '');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isSavingTags, setIsSavingTags] = useState(false);
    const [customTagInput, setCustomTagInput] = useState('');
    const [isFlexModalOpen, setIsFlexModalOpen] = useState(false);

    // 切換到另一位客戶時重設備註編輯區與自訂標籤輸入
    useEffect(() => {
        setEditingNotes(user?.notes || '');
        setCustomTagInput('');
        setIsFlexModalOpen(false);
    }, [user?.line_id, user?.channel]);

    if (!user) return null;

    const handleSaveTags = async (newTags) => {
        if (isSavingTags) return;
        setIsSavingTags(true);
        try {
            await axios.put(
                `${config.API_URL}/api/inbox/agents/${currentAgent._id}/members/${user.line_id}/tags?userId=${currentAgent.admin_id}`,
                { tags: newTags }
            );
            onUserUpdate?.({ ...user, tags: newTags });
        } catch (err) {
            console.error('Failed to save tags:', err);
            alert('標籤更新失敗，請稍後再試。');
        } finally {
            setIsSavingTags(false);
        }
    };

    const handleSaveNotes = async () => {
        if (isSavingNotes) return;
        setIsSavingNotes(true);
        try {
            await axios.put(
                `${config.API_URL}/api/inbox/agents/${currentAgent._id}/members/${user.line_id}/notes?userId=${currentAgent.admin_id}`,
                { notes: editingNotes }
            );
            onUserUpdate?.({ ...user, notes: editingNotes });
        } catch (err) {
            console.error('Failed to save notes:', err);
            alert('備註儲存失敗，請稍後再試。');
        } finally {
            setIsSavingNotes(false);
        }
    };

    const addTag = (tag) => {
        const trimmed = (tag || '').trim().slice(0, 10);
        if (!trimmed || (user.tags || []).includes(trimmed)) return;
        handleSaveTags([...(user.tags || []), trimmed]);
    };

    const openFlexMessageModal = () => {
        if ((user.channel || 'line') !== 'line') {
            alert('Flex Message 第一版僅支援 LINE 客戶');
            return;
        }
        setIsFlexModalOpen(true);
    };

    return (
        <>
            {/* 基本資料 */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">基本資料</h3>
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">上次互動</span>
                        <span className="font-medium text-slate-700">{user.last_time || '無紀錄'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-4">
                        <span className="text-slate-500 shrink-0">
                            {user.channel === 'telegram' ? 'Telegram ID' : 'LINE ID'}
                        </span>
                        <span className="font-mono text-xs text-slate-500 truncate">{user.line_id}</span>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Flex Message</h3>
                    <span className="text-[10px] font-bold text-slate-300">MVP</span>
                </div>
                {(user.channel || 'line') === 'line' ? (
                    <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                        <p className="text-sm font-semibold text-slate-700">直接從 CRM 發送固定模板 Flex Message</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            支援續保提醒、生日祝福、一般通知，並可預覽後直接傳送給目前客戶。
                        </p>
                        <button
                            onClick={openFlexMessageModal}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-all"
                        >
                            <Send size={15} />
                            發送 Flex Message
                        </button>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
                        Flex Message 第一版僅支援 LINE 客戶，Telegram 客戶暫不開放。
                    </div>
                )}
            </div>

            {/* 標籤 */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">標籤</h3>
                    {isSavingTags && <Loader2 size={14} className="animate-spin text-brand-500" />}
                </div>
                {/* 已選標籤 */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {(user.tags || []).map(tag => (
                        <span
                            key={tag}
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold border ${getTagColor(tag)} group/tag`}
                        >
                            {tag}
                            <button
                                onClick={() => handleSaveTags((user.tags || []).filter(t => t !== tag))}
                                disabled={isSavingTags}
                                className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                    {(user.tags || []).length === 0 && (
                        <span className="text-xs text-slate-300 italic">尚未加入標籤</span>
                    )}
                </div>
                {/* 可選標籤 */}
                <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">點選加入標籤</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {CRM_TAG_OPTIONS.filter(opt => !(user.tags || []).includes(opt.label)).map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => addTag(opt.label)}
                                disabled={isSavingTags}
                                className={`text-xs px-3 py-1.5 rounded-full font-bold border ${opt.color} opacity-60 hover:opacity-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                                + {opt.label}
                            </button>
                        ))}
                    </div>
                    {/* 自訂標籤 */}
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && customTagInput.trim()) {
                                    addTag(customTagInput);
                                    setCustomTagInput('');
                                }
                            }}
                            maxLength={10}
                            placeholder="自訂標籤，按 Enter 加入"
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                        />
                        <button
                            onClick={() => {
                                addTag(customTagInput);
                                setCustomTagInput('');
                            }}
                            disabled={!customTagInput.trim() || isSavingTags}
                            className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            加入
                        </button>
                    </div>
                </div>
            </div>

            {/* 備註 */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">備註</h3>
                    {isSavingNotes && <Loader2 size={14} className="animate-spin text-brand-500" />}
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                    <textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        placeholder="紀錄客戶偏好、特殊需求、跟進事項..."
                        maxLength={500}
                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed min-h-[120px] focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-300">{editingNotes.length}/500</span>
                        <button
                            onClick={handleSaveNotes}
                            disabled={isSavingNotes || editingNotes === (user.notes || '')}
                            className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                        >
                            {isSavingNotes ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            儲存備註
                        </button>
                    </div>
                </div>
            </div>

            {isFlexModalOpen && (
                <FlexMessageModal
                    user={user}
                    currentAgent={currentAgent}
                    onClose={() => setIsFlexModalOpen(false)}
                />
            )}
        </>
    );
}
