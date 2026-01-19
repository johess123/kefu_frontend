import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { Send, User, Bot, Loader2, RotateCcw, ArrowRight, MessageCircle, Info, ShieldAlert, CheckCircle2, Lightbulb, HelpCircle } from 'lucide-react';
import { AppStep } from '../types';

import Cookies from 'js-cookie';

const StepDemo = ({ formData, sessionId, agentId, onNext, setCurrentStep }) => {
    const [messages, setMessages] = useState([
        { role: 'model', text: '你好！我是你的 AI 智能客服，有什麼可以幫你的嗎？' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastResponseInfo, setLastResponseInfo] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (textToSend = input) => {
        const msgText = textToSend.trim();
        if (!msgText) return;

        setMessages(prev => [...prev, { role: 'user', text: msgText }]);
        setInput('');
        setIsLoading(true);
        setLastResponseInfo(null);

        try {
            const line_user_id = Cookies.get('line_user_id');
            const line_user_name = Cookies.get('line_user_name');
            const response = await axios.post(`${config.API_URL}/api/chat`, {
                message: msgText,
                history: messages,
                line_user_id: line_user_id,
                user_name: line_user_name,
                agent_id: agentId,
                session_id: sessionId
            });

            const { response_text, related_faq_list, handoff_result } = response.data;

            const newMessage = {
                role: 'model',
                text: response_text,
                related_faqs: related_faq_list || [],
                handoff: handoff_result
            };

            setMessages(prev => [...prev, newMessage]);
            setLastResponseInfo(newMessage);

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'model', text: '抱歉，發生錯誤，請稍後再試。' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const resetChat = () => {
        setMessages([{ role: 'model', text: '你好！我是你的 AI 智能客服，有什麼可以幫你的嗎？' }]);
        setLastResponseInfo(null);
    };

    const handleFaqClick = (question) => {
        setInput(question);
        handleSend(question);
    };

    return (
        <div className="max-w-[1400px] mx-auto w-full px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[calc(100vh-80px)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Step 3 - AI 示範與測試</h2>
                    <p className="text-slate-500 text-sm">點擊左側問題即可快速測試，右側將顯示 AI 的推論依據</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={resetChat} className="text-sm font-bold text-slate-400 hover:text-brand-600 flex items-center gap-1 transition-colors">
                        <RotateCcw size={16} /> 重置對話
                    </button>
                    <button
                        onClick={onNext}
                        className="bg-brand-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-200 flex items-center gap-2"
                    >
                        下一步：部署 <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden mb-8">
                {/* Left Column: FAQ Quick Test (Width 3/12) */}
                <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <MessageCircle size={16} className="text-brand-600" />
                            測試問題清單
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {formData.faqs.map((faq, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleFaqClick(faq.question)}
                                disabled={isLoading}
                                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-brand-300 hover:bg-brand-50/50 transition-all group"
                            >
                                <div className="text-[10px] font-bold text-slate-400 mb-1 group-hover:text-brand-500">FAQ {idx + 1}</div>
                                <p className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 leading-relaxed">
                                    {faq.question}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Middle Column: Chat (Width 6/12) */}
                <div className="col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-brand-600 text-white'
                                        }`}>
                                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                    </div>
                                    <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-brand-600 text-white rounded-tr-none'
                                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm">
                                        <Bot size={18} />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="flex items-center gap-2 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="輸入測試訊息內容..."
                                className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-100 active:scale-95"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Deduction (Width 3/12) */}
                <div className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Info size={16} className="text-brand-600" />
                                回應分析
                            </h3>
                        </div>
                        <div className="flex-1 p-5">
                            {!lastResponseInfo ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                        <Bot size={24} />
                                    </div>
                                    <p className="text-xs text-slate-400">目前尚無分析數據<br />請先在對話框輸入訊息</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* FAQ Hits - Each in its own block */}
                                    {lastResponseInfo.related_faqs && lastResponseInfo.related_faqs.length > 0 &&
                                        lastResponseInfo.related_faqs.map((faq, i) => (
                                            <div key={`faq-${i}`} className="space-y-3">
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <CheckCircle2 size={16} />
                                                    <span className="text-sm font-bold">成功命中 FAQ</span>
                                                </div>
                                                <div className="bg-green-50/50 border border-green-100 rounded-xl p-4">
                                                    <div className="text-[10px] font-black text-green-600 uppercase mb-2">參考來源</div>
                                                    <div className="text-xs space-y-2">
                                                        <div className="flex gap-1">
                                                            <span className="font-bold text-slate-700 flex-shrink-0">Q:</span>
                                                            <span className="text-slate-600">{faq.Q}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <span className="font-bold text-slate-700 flex-shrink-0">A:</span>
                                                            <span className="text-slate-600">{faq.A}</span>
                                                        </div>
                                                    </div>
                                                    <hr className="my-3 border-green-100" />
                                                    <div className="bg-white/60 p-2 rounded border border-green-50 text-[11px] text-green-700 font-medium flex items-start gap-1">
                                                        <Lightbulb size={14} className="mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <span className="font-bold mr-1">KEFU 建議：</span>
                                                            此問題命中資料庫內容，建議維持此回答口吻服務客戶。
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }

                                    {/* Handoff Hit - Separate block */}
                                    {lastResponseInfo.handoff?.hand_off && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-red-500">
                                                <ShieldAlert size={16} />
                                                <span className="text-sm font-bold">成功攔截並轉人工</span>
                                            </div>
                                            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                                                <div className="text-[10px] font-black text-red-500 uppercase mb-1">攔截原因</div>
                                                <div className="text-sm font-bold text-slate-800 mb-2">{lastResponseInfo.handoff.reason}</div>
                                                <div className="px-2 py-1 bg-white border border-red-100 rounded text-[10px] text-red-600 font-bold inline-block">已中斷 AI 回答並轉接</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {(!lastResponseInfo.related_faqs || lastResponseInfo.related_faqs.length === 0) && !lastResponseInfo.handoff?.hand_off && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-lg w-fit">
                                                <HelpCircle size={16} />
                                                <span className="text-sm font-bold">未命中任何 FAQ</span>
                                            </div>

                                            <div className="pt-2">
                                                <div className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">KEFU 建議</div>
                                                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3 items-start">
                                                    <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 flex-shrink-0">
                                                        <Lightbulb size={16} />
                                                    </div>
                                                    <p className="text-xs text-slate-600 leading-relaxed">
                                                        建議前往 <button onClick={() => setCurrentStep(AppStep.REVIEW)} className="text-brand-600 font-bold hover:underline">Step 2</button> 新增一題關於 「{messages.filter(m => m.role === 'user').slice(-1)[0]?.text}」 的 FAQ，以減少轉人工頻率。
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepDemo;
