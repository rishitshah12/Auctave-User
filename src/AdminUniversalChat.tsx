import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Search, X, Send, ArrowLeft, RefreshCw } from 'lucide-react';
import { quoteService } from './quote.service';
import type { QuoteRequest, NegotiationHistoryItem } from './types';

// ── Unread tracking via localStorage ─────────────────────────────────────────
const LAST_READ_KEY = 'admin_rfq_chat_last_read';

function getLastReadMap(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}'); }
    catch { return {}; }
}

function markRead(rfqId: string) {
    const map = getLastReadMap();
    map[rfqId] = new Date().toISOString();
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
}

function getUnreadCount(rfq: QuoteRequest): number {
    const lastRead = getLastReadMap()[rfq.id] || '';
    const history = rfq.negotiation_details?.history || [];
    return history.filter(h => h.sender === 'client' && h.timestamp > lastRead).length;
}

function getLatestMessageTime(rfq: QuoteRequest): string {
    const history = rfq.negotiation_details?.history || [];
    if (!history.length) return rfq.submittedAt;
    return history.reduce((latest, h) => (h.timestamp > latest ? h.timestamp : latest), history[0].timestamp);
}

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

// ── Data transform (same pattern as AdminRFQPage) ─────────────────────────────
function transformRaw(q: any): QuoteRequest {
    return {
        id: q.id,
        factory: q.factory_data,
        order: q.order_details,
        status: q.status,
        submittedAt: q.created_at,
        acceptedAt: q.accepted_at || q.response_details?.acceptedAt,
        userId: q.user_id,
        files: q.files || [],
        response_details: q.response_details,
        negotiation_details: q.negotiation_details,
        clientName: q.clients?.name || 'Unknown',
        companyName: q.clients?.company_name || '',
        modification_count: q.modification_count || 0,
        modified_at: q.modified_at,
    };
}

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminUniversalChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedRFQ, setSelectedRFQ] = useState<QuoteRequest | null>(null);
    const [activeLineItemId, setActiveLineItemId] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // ── Fetch all RFQs ────────────────────────────────────────────────────────
    const fetchQuotes = useCallback(async () => {
        setLoading(true);
        const { data } = await quoteService.getAllQuotes();
        if (data) {
            const mapped = (data as any[]).map(transformRaw);
            mapped.sort((a, b) => getLatestMessageTime(b).localeCompare(getLatestMessageTime(a)));
            setQuotes(mapped);
            setTotalUnread(mapped.reduce((sum, q) => sum + getUnreadCount(q), 0));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isOpen) fetchQuotes();
    }, [isOpen, fetchQuotes]);

    // ── Scroll to bottom when messages change ─────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedRFQ?.negotiation_details?.history?.length, activeLineItemId]);

    // ── Focus input when chat opens ───────────────────────────────────────────
    useEffect(() => {
        if (selectedRFQ) setTimeout(() => inputRef.current?.focus(), 50);
    }, [selectedRFQ, activeLineItemId]);

    // ── Open an RFQ's chat ────────────────────────────────────────────────────
    const openRFQ = (rfq: QuoteRequest) => {
        const lineItems = rfq.order?.lineItems || [];
        setSelectedRFQ(rfq);
        setActiveLineItemId(lineItems[0]?.id ?? null);
        markRead(rfq.id);
        setTotalUnread(prev => Math.max(0, prev - getUnreadCount(rfq)));
    };

    // ── Send a message ────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!selectedRFQ || !message.trim()) return;
        setSending(true);

        const newMsg: NegotiationHistoryItem = {
            id: Date.now().toString(),
            sender: 'factory',
            message: message.trim(),
            timestamp: new Date().toISOString(),
            action: 'info',
            relatedLineItemId: activeLineItemId ?? undefined,
            attachments: [],
        };

        const updatedHistory = [...(selectedRFQ.negotiation_details?.history || []), newMsg];
        const { error } = await quoteService.update(selectedRFQ.id, {
            negotiation_details: { ...selectedRFQ.negotiation_details, history: updatedHistory },
        });

        if (!error) {
            const updatedRFQ: QuoteRequest = {
                ...selectedRFQ,
                negotiation_details: { ...selectedRFQ.negotiation_details, history: updatedHistory },
            };
            setSelectedRFQ(updatedRFQ);
            setQuotes(prev => {
                const next = prev.map(q => (q.id === selectedRFQ.id ? updatedRFQ : q));
                next.sort((a, b) => getLatestMessageTime(b).localeCompare(getLatestMessageTime(a)));
                return next;
            });
            setMessage('');
        }
        setSending(false);
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const filteredQuotes = quotes.filter(q => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
            q.clientName?.toLowerCase().includes(s) ||
            q.companyName?.toLowerCase().includes(s) ||
            q.id.toLowerCase().includes(s) ||
            q.order?.lineItems?.some((li: any) => li.category?.toLowerCase().includes(s))
        );
    });

    const lineItems: any[] = selectedRFQ?.order?.lineItems || [];

    const chatHistory: NegotiationHistoryItem[] = selectedRFQ
        ? (selectedRFQ.negotiation_details?.history || [])
            .filter(h => {
                if (lineItems.length <= 1) return true;
                return (
                    h.relatedLineItemId === activeLineItemId ||
                    h.lineItemPrices?.some((p: any) => p.lineItemId === activeLineItemId)
                );
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        : [];

    // ── Floating button (panel closed) ────────────────────────────────────────
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-[#c20c0b] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#a50a09] transition-all hover:scale-105 active:scale-95"
                title="Open RFQ Messages"
            >
                <MessageSquare size={22} />
                {totalUnread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-white text-[#c20c0b] text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                        {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                )}
            </button>
        );
    }

    // ── Panel ─────────────────────────────────────────────────────────────────
    return createPortal(
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col w-[360px] h-[580px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#c20c0b] text-white flex-shrink-0">
                {selectedRFQ ? (
                    <button
                        onClick={() => { setSelectedRFQ(null); setMessage(''); }}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </button>
                ) : (
                    <MessageSquare size={20} className="flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                    {selectedRFQ ? (
                        <>
                            <p className="font-bold text-sm truncate leading-tight">
                                {selectedRFQ.clientName}
                            </p>
                            <p className="text-[11px] text-red-200 truncate leading-tight">
                                {selectedRFQ.companyName || `RFQ #${selectedRFQ.id.slice(-6).toUpperCase()}`}
                                {lineItems.length > 0 && ` · ${lineItems.length} item${lineItems.length > 1 ? 's' : ''}`}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-bold text-sm leading-tight">RFQ Messages</p>
                            <p className="text-[11px] text-red-200 leading-tight">{quotes.length} RFQs</p>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    {!selectedRFQ && (
                        <button
                            onClick={fetchQuotes}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            title="Refresh"
                            disabled={loading}
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    )}
                    <button
                        onClick={() => { setIsOpen(false); setSelectedRFQ(null); setMessage(''); }}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── RFQ List View ── */}
            {!selectedRFQ && (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Search bar */}
                    <div className="px-3 py-2.5 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                            <Search size={14} className="text-gray-400 flex-shrink-0" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search clients, RFQs, products…"
                                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="flex-shrink-0">
                                    <X size={13} className="text-gray-400 hover:text-gray-600 transition-colors" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                                <RefreshCw size={20} className="animate-spin" />
                                <span className="text-sm">Loading conversations…</span>
                            </div>
                        ) : filteredQuotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-1">
                                <MessageSquare size={32} className="opacity-30" />
                                <span>{search ? 'No results found' : 'No RFQs yet'}</span>
                            </div>
                        ) : (
                            filteredQuotes.map(rfq => {
                                const unread = getUnreadCount(rfq);
                                const history = rfq.negotiation_details?.history || [];
                                const lastMsg = history.length > 0 ? history[history.length - 1] : null;
                                const initials = (rfq.clientName || 'U')[0].toUpperCase();
                                const itemCount = rfq.order?.lineItems?.length || 0;

                                return (
                                    <button
                                        key={rfq.id}
                                        onClick={() => openRFQ(rfq)}
                                        className="w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3"
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${unread > 0 ? 'bg-[#c20c0b] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                                {initials}
                                            </div>
                                            {unread > 0 && (
                                                <span className="absolute -bottom-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-[#c20c0b] border-2 border-white dark:border-gray-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                                    {unread > 9 ? '9+' : unread}
                                                </span>
                                            )}
                                        </div>

                                        {/* Text */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                                                    {rfq.clientName}
                                                </span>
                                                <span className="text-[10px] text-gray-400 flex-shrink-0 tabular-nums">
                                                    {timeAgo(getLatestMessageTime(rfq))}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                                {rfq.companyName || `${itemCount} product${itemCount !== 1 ? 's' : ''}`}
                                            </p>
                                            <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {lastMsg
                                                    ? `${lastMsg.sender === 'factory' ? 'You: ' : ''}${lastMsg.message || '📎 Attachment'}`
                                                    : <span className="italic">No messages yet</span>
                                                }
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── Chat View ── */}
            {selectedRFQ && (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Line item tabs (only if multiple items) */}
                    {lineItems.length > 1 && (
                        <div className="flex overflow-x-auto px-3 pt-2 pb-2 gap-1.5 border-b border-gray-100 dark:border-white/10 flex-shrink-0 scrollbar-none">
                            {lineItems.map((li: any) => (
                                <button
                                    key={li.id}
                                    onClick={() => setActiveLineItemId(li.id)}
                                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                                        activeLineItemId === li.id
                                            ? 'bg-[#c20c0b] text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {li.category}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Status badge */}
                    <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-white/5 flex-shrink-0 flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Status</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selectedRFQ.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            selectedRFQ.status === 'Responded' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            selectedRFQ.status === 'Accepted' || selectedRFQ.status === 'Admin Accepted' || selectedRFQ.status === 'Client Accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            selectedRFQ.status === 'Declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                            {selectedRFQ.status}
                        </span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600 ml-auto tabular-nums">
                            #{selectedRFQ.id.slice(-8).toUpperCase()}
                        </span>
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                        {chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                                <MessageSquare size={28} className="opacity-30" />
                                <span className="text-sm text-center">
                                    No messages yet.<br />
                                    <span className="text-xs opacity-70">Send the first message below.</span>
                                </span>
                            </div>
                        ) : (
                            chatHistory.map((h, i) => {
                                const isFactory = h.sender === 'factory';
                                return (
                                    <div key={h.id || i} className={`flex ${isFactory ? 'justify-end' : 'justify-start'}`}>
                                        {!isFactory && (
                                            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-600 dark:text-gray-300 flex-shrink-0 mr-1.5 mt-auto mb-0.5">
                                                {(selectedRFQ.clientName || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className={`max-w-[78%] flex flex-col ${isFactory ? 'items-end' : 'items-start'}`}>
                                            <div className={`rounded-2xl px-3 py-2 shadow-sm text-sm ${
                                                isFactory
                                                    ? 'bg-[#c20c0b] text-white rounded-tr-none'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-none'
                                            }`}>
                                                {h.price && (
                                                    <p className="font-bold text-base mb-0.5">${h.price}</p>
                                                )}
                                                {h.message && (
                                                    <p className="whitespace-pre-wrap leading-relaxed">{h.message}</p>
                                                )}
                                                {h.attachments && h.attachments.length > 0 && (
                                                    <p className="text-xs opacity-70 mt-1">📎 Attachment</p>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                                {isFactory ? 'You' : selectedRFQ.clientName} · {timeAgo(h.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="border-t border-gray-100 dark:border-white/10 px-3 py-2.5 flex-shrink-0 flex items-end gap-2 bg-white dark:bg-gray-900">
                        <textarea
                            ref={inputRef}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type a message… (Enter to send)"
                            rows={1}
                            className="flex-1 bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-white rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/30 max-h-28 placeholder-gray-400"
                            style={{ fieldSizing: 'content' } as any}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || sending}
                            className="p-2.5 bg-[#c20c0b] text-white rounded-xl hover:bg-[#a50a09] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                        >
                            {sending
                                ? <RefreshCw size={17} className="animate-spin" />
                                : <Send size={17} />
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
