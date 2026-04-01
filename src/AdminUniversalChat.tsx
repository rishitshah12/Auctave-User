import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    MessageSquare, Search, X, Send, ArrowLeft, RefreshCw,
    ExternalLink, Package, ChevronRight, GripVertical, Users
} from 'lucide-react';
import { quoteService } from './quote.service';
import type { QuoteRequest, NegotiationHistoryItem } from './types';

// ── Unread tracking ───────────────────────────────────────────────────────────
const LAST_READ_KEY = 'admin_rfq_chat_last_read';
function getLastReadMap(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}'); } catch { return {}; }
}
function markRead(rfqId: string) {
    const map = getLastReadMap();
    map[rfqId] = new Date().toISOString();
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
}
function getUnreadCount(rfq: QuoteRequest): number {
    const lastRead = getLastReadMap()[rfq.id] || '';
    return (rfq.negotiation_details?.history || [])
        .filter(h => h.sender === 'client' && h.timestamp > lastRead).length;
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

// ── Status colour helper ──────────────────────────────────────────────────────
function statusBadge(status: string) {
    if (status === 'Pending') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (status === 'Responded') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (['Accepted', 'Admin Accepted', 'Client Accepted'].includes(status)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'Declined') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (status === 'In Negotiation') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (status === 'Trashed') return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

// ── Data transform ────────────────────────────────────────────────────────────
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

// ── Grouped-by-user shape ─────────────────────────────────────────────────────
interface ClientGroup {
    userId: string;
    clientName: string;
    companyName: string;
    rfqs: QuoteRequest[];
    totalUnread: number;
    latestTime: string;
}

function groupByClient(quotes: QuoteRequest[]): ClientGroup[] {
    const map = new Map<string, ClientGroup>();
    for (const rfq of quotes) {
        const existing = map.get(rfq.userId);
        const unread = getUnreadCount(rfq);
        const time = getLatestMessageTime(rfq);
        if (existing) {
            existing.rfqs.push(rfq);
            existing.totalUnread += unread;
            if (time > existing.latestTime) existing.latestTime = time;
        } else {
            map.set(rfq.userId, {
                userId: rfq.userId,
                clientName: rfq.clientName || 'Unknown',
                companyName: rfq.companyName || '',
                rfqs: [rfq],
                totalUnread: unread,
                latestTime: time,
            });
        }
    }
    return Array.from(map.values()).sort((a, b) => b.latestTime.localeCompare(a.latestTime));
}

// ── Resize hook ───────────────────────────────────────────────────────────────
const MIN_W = 320, MAX_W = 720;
const MIN_H = 420, MAX_H = 860;
const DEFAULT_W = 380, DEFAULT_H = 600;

function useResize() {
    const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
    const dragging = useRef(false);
    const startRef = useRef({ x: 0, y: 0, w: DEFAULT_W, h: DEFAULT_H });

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
        startRef.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };

        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            const dw = startRef.current.x - ev.clientX; // grows left
            const dh = startRef.current.y - ev.clientY; // grows up
            setSize({
                w: Math.min(MAX_W, Math.max(MIN_W, startRef.current.w + dw)),
                h: Math.min(MAX_H, Math.max(MIN_H, startRef.current.h + dh)),
            });
        };
        const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [size.w, size.h]);

    return { size, onMouseDown };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AdminUniversalChatProps {
    onNavigate: (page: string, data?: any) => void;
}

// ── View states ───────────────────────────────────────────────────────────────
type View = 'users' | 'rfqs' | 'chat';

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminUniversalChat: React.FC<AdminUniversalChatProps> = ({ onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<View>('users');
    const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Navigation state
    const [selectedClient, setSelectedClient] = useState<ClientGroup | null>(null);
    const [selectedRFQ, setSelectedRFQ] = useState<QuoteRequest | null>(null);
    const [activeLineItemId, setActiveLineItemId] = useState<number | null>(null);

    // Chat state
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const { size, onMouseDown } = useResize();

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchQuotes = useCallback(async () => {
        setLoading(true);
        const { data } = await quoteService.getAllQuotes();
        if (data) setQuotes((data as any[]).map(transformRaw));
        setLoading(false);
    }, []);

    useEffect(() => { if (isOpen) fetchQuotes(); }, [isOpen, fetchQuotes]);

    // ── Scroll to bottom ──────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedRFQ?.negotiation_details?.history?.length, activeLineItemId]);

    // ── Focus input ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (view === 'chat') setTimeout(() => inputRef.current?.focus(), 60);
    }, [view, activeLineItemId]);

    // ── Send ──────────────────────────────────────────────────────────────────
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
            const updatedRFQ = { ...selectedRFQ, negotiation_details: { ...selectedRFQ.negotiation_details, history: updatedHistory } };
            setSelectedRFQ(updatedRFQ);
            setQuotes(prev => prev.map(q => q.id === selectedRFQ.id ? updatedRFQ : q));
            if (selectedClient) {
                setSelectedClient(prev => prev ? {
                    ...prev,
                    rfqs: prev.rfqs.map(r => r.id === selectedRFQ.id ? updatedRFQ : r),
                    latestTime: new Date().toISOString(),
                } : null);
            }
            setMessage('');
        }
        setSending(false);
    };

    // ── Navigation helpers ────────────────────────────────────────────────────
    const openClient = (client: ClientGroup) => {
        setSelectedClient(client);
        setSearch('');
        setView('rfqs');
    };

    const openRFQ = (rfq: QuoteRequest) => {
        const lineItems = rfq.order?.lineItems || [];
        setSelectedRFQ(rfq);
        setActiveLineItemId(lineItems[0]?.id ?? null);
        markRead(rfq.id);
        setView('chat');
        setOrderDetailsExpanded(false);
    };

    const goBack = () => {
        if (view === 'chat') { setSelectedRFQ(null); setMessage(''); setView('rfqs'); }
        else if (view === 'rfqs') { setSelectedClient(null); setSearch(''); setView('users'); }
    };

    const close = () => {
        setIsOpen(false);
        setView('users');
        setSelectedClient(null);
        setSelectedRFQ(null);
        setMessage('');
        setSearch('');
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const clientGroups = groupByClient(quotes);
    const totalUnread = clientGroups.reduce((s, c) => s + c.totalUnread, 0);

    const filteredClients = clientGroups.filter(c => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return c.clientName.toLowerCase().includes(s) || c.companyName.toLowerCase().includes(s);
    });

    const clientRFQs = (selectedClient?.rfqs || [])
        .slice()
        .sort((a, b) => getLatestMessageTime(b).localeCompare(getLatestMessageTime(a)))
        .filter(rfq => {
            if (!search.trim()) return true;
            const s = search.toLowerCase();
            return (
                rfq.id.toLowerCase().includes(s) ||
                rfq.status.toLowerCase().includes(s) ||
                rfq.order?.lineItems?.some((li: any) => li.category?.toLowerCase().includes(s))
            );
        });

    const lineItems: any[] = selectedRFQ?.order?.lineItems || [];

    const chatHistory: NegotiationHistoryItem[] = selectedRFQ
        ? (selectedRFQ.negotiation_details?.history || [])
            .filter(h => {
                if (lineItems.length <= 1) return true;
                return h.relatedLineItemId === activeLineItemId || h.lineItemPrices?.some((p: any) => p.lineItemId === activeLineItemId);
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        : [];

    // ── Breadcrumb title ──────────────────────────────────────────────────────
    const headerTitle = view === 'users'
        ? 'RFQ Messages'
        : view === 'rfqs'
        ? selectedClient?.clientName || 'RFQs'
        : `RFQ #${selectedRFQ?.id.slice(-8).toUpperCase()}`;

    const headerSub = view === 'users'
        ? `${clientGroups.length} client${clientGroups.length !== 1 ? 's' : ''}`
        : view === 'rfqs'
        ? `${selectedClient?.companyName || ''}${selectedClient?.rfqs.length ? ` · ${selectedClient.rfqs.length} RFQ${selectedClient.rfqs.length !== 1 ? 's' : ''}` : ''}`
        : selectedRFQ?.clientName || '';

    // ── Floating bubble ───────────────────────────────────────────────────────
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
        <div
            className="fixed bottom-6 right-6 z-[60] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden select-none"
            style={{ width: size.w, height: size.h }}
        >
            {/* ── Resize handle (top-left corner) ── */}
            <div
                onMouseDown={onMouseDown}
                className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
                title="Drag to resize"
            >
                <GripVertical size={12} className="text-white/60 rotate-45" />
            </div>

            {/* ── Header ── */}
            <div className="flex items-center gap-2.5 px-3 py-3 bg-[#c20c0b] text-white flex-shrink-0">
                {view !== 'users' ? (
                    <button onClick={goBack} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
                        <ArrowLeft size={17} />
                    </button>
                ) : (
                    <div className="p-1.5 flex-shrink-0">
                        <MessageSquare size={17} />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate leading-tight">{headerTitle}</p>
                    <p className="text-[11px] text-red-200 truncate leading-tight">{headerSub}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Open RFQ in page — chat view only */}
                    {view === 'chat' && selectedRFQ && (
                        <button
                            onClick={() => { onNavigate('adminRFQ', { quoteId: selectedRFQ.id }); close(); }}
                            className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-semibold transition-colors"
                            title="Open full RFQ page"
                        >
                            <ExternalLink size={12} /> Open RFQ
                        </button>
                    )}
                    {view === 'users' && (
                        <button onClick={fetchQuotes} disabled={loading} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    )}
                    <button onClick={close} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={17} />
                    </button>
                </div>
            </div>

            {/* ── Search bar (users + rfqs views) ── */}
            {view !== 'chat' && (
                <div className="px-3 py-2 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                        <Search size={13} className="text-gray-400 flex-shrink-0" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={view === 'users' ? 'Search clients…' : 'Search RFQs, products…'}
                            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                        {search && (
                            <button onClick={() => setSearch('')}><X size={12} className="text-gray-400 hover:text-gray-600" /></button>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                VIEW 1 — Users list
            ═══════════════════════════════════════════════════════════════════ */}
            {view === 'users' && (
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                            <RefreshCw size={20} className="animate-spin" />
                            <span className="text-sm">Loading…</span>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <Users size={32} className="opacity-30" />
                            <span className="text-sm">{search ? 'No clients found' : 'No RFQs yet'}</span>
                        </div>
                    ) : filteredClients.map(client => {
                        const initials = client.clientName[0]?.toUpperCase() || 'U';
                        const lastRFQ = client.rfqs.sort((a, b) => getLatestMessageTime(b).localeCompare(getLatestMessageTime(a)))[0];
                        const lastHistory = lastRFQ?.negotiation_details?.history || [];
                        const lastMsg = lastHistory.length ? lastHistory[lastHistory.length - 1] : null;

                        return (
                            <button
                                key={client.userId}
                                onClick={() => openClient(client)}
                                className="w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3"
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${client.totalUnread > 0 ? 'bg-[#c20c0b] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                        {initials}
                                    </div>
                                    {client.totalUnread > 0 && (
                                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-[#c20c0b] border-2 border-white dark:border-gray-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {client.totalUnread > 9 ? '9+' : client.totalUnread}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className={`text-sm truncate ${client.totalUnread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                                            {client.clientName}
                                        </span>
                                        <span className="text-[10px] text-gray-400 flex-shrink-0 tabular-nums">{timeAgo(client.latestTime)}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                        {client.companyName || ''}{client.companyName ? ' · ' : ''}{client.rfqs.length} RFQ{client.rfqs.length !== 1 ? 's' : ''}
                                    </p>
                                    <p className={`text-xs truncate mt-0.5 ${client.totalUnread > 0 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                        {lastMsg ? `${lastMsg.sender === 'factory' ? 'You: ' : ''}${lastMsg.message || '📎 Attachment'}` : <span className="italic">No messages yet</span>}
                                    </p>
                                </div>

                                <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                VIEW 2 — RFQs per client
            ═══════════════════════════════════════════════════════════════════ */}
            {view === 'rfqs' && (
                <div className="flex-1 overflow-y-auto">
                    {clientRFQs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <Package size={28} className="opacity-30" />
                            <span className="text-sm">{search ? 'No RFQs match' : 'No RFQs'}</span>
                        </div>
                    ) : clientRFQs.map(rfq => {
                        const unread = getUnreadCount(rfq);
                        const items: any[] = rfq.order?.lineItems || [];
                        const lastHistory = rfq.negotiation_details?.history || [];
                        const lastMsg = lastHistory.length ? lastHistory[lastHistory.length - 1] : null;
                        const rfqShort = rfq.id.slice(-8).toUpperCase();
                        const categories = items.map((li: any) => li.category).filter(Boolean).slice(0, 3);

                        return (
                            <button
                                key={rfq.id}
                                onClick={() => openRFQ(rfq)}
                                className="w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                {/* Row 1: RFQ # + status + time */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 font-mono">#{rfqShort}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(rfq.status)}`}>{rfq.status}</span>
                                    {unread > 0 && (
                                        <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-[#c20c0b] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {unread > 9 ? '9+' : unread}
                                        </span>
                                    )}
                                    <span className={`text-[10px] text-gray-400 tabular-nums ${unread > 0 ? '' : 'ml-auto'}`}>
                                        {timeAgo(getLatestMessageTime(rfq))}
                                    </span>
                                </div>

                                {/* Row 2: Product categories */}
                                {categories.length > 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex flex-wrap gap-1">
                                        {categories.map((cat, i) => (
                                            <span key={i} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">{cat}</span>
                                        ))}
                                        {items.length > 3 && <span className="text-gray-400 text-[10px]">+{items.length - 3} more</span>}
                                    </p>
                                )}

                                {/* Row 3: Last message */}
                                <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {lastMsg
                                        ? `${lastMsg.sender === 'factory' ? 'You: ' : ''}${lastMsg.message || '📎 Attachment'}`
                                        : <span className="italic">No messages yet</span>
                                    }
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                VIEW 3 — Chat
            ═══════════════════════════════════════════════════════════════════ */}
            {view === 'chat' && selectedRFQ && (
                <div className="flex flex-col flex-1 min-h-0">

                    {/* ── Order details reference strip ── */}
                    <div className="border-b border-gray-100 dark:border-white/10 flex-shrink-0">
                        <button
                            onClick={() => setOrderDetailsExpanded(v => !v)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left"
                        >
                            <Package size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex-1">
                                Order Details
                                <span className="ml-1.5 font-normal text-gray-400">
                                    · {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
                                    {selectedRFQ.order?.shippingInfo?.deliveryDate ? ` · ${selectedRFQ.order.shippingInfo.deliveryDate}` : ''}
                                </span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge(selectedRFQ.status)}`}>{selectedRFQ.status}</span>
                            <ChevronRight size={13} className={`text-gray-400 flex-shrink-0 transition-transform ${orderDetailsExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {orderDetailsExpanded && lineItems.length > 0 && (
                            <div className="px-3 pb-2.5 space-y-1.5 max-h-40 overflow-y-auto bg-gray-50/60 dark:bg-gray-800/20">
                                {lineItems.map((li: any, i: number) => (
                                    <div key={li.id ?? i} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-white/5">
                                        <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{li.category}</p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {li.fabricQuality ? `${li.fabricQuality}` : ''}
                                                {li.weightGSM ? ` · ${li.weightGSM} GSM` : ''}
                                                {li.qty ? ` · ${li.qty} units` : ''}
                                                {li.containerType ? ` · ${li.containerType}` : ''}
                                            </p>
                                        </div>
                                        {li.targetPrice && (
                                            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 flex-shrink-0">${li.targetPrice}</span>
                                        )}
                                    </div>
                                ))}
                                {selectedRFQ.order?.shippingInfo && (
                                    <p className="text-[10px] text-gray-400 px-1">
                                        {selectedRFQ.order.shippingInfo.destination ? `📍 ${selectedRFQ.order.shippingInfo.destination}` : ''}
                                        {selectedRFQ.order.shippingInfo.deliveryDate ? `  ·  📅 ${selectedRFQ.order.shippingInfo.deliveryDate}` : ''}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Line item tabs (multiple items) ── */}
                    {lineItems.length > 1 && (
                        <div className="flex overflow-x-auto px-3 pt-2 pb-1.5 gap-1.5 border-b border-gray-100 dark:border-white/10 flex-shrink-0 scrollbar-none">
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

                    {/* ── Messages ── */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                        {chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                                <MessageSquare size={26} className="opacity-30" />
                                <span className="text-sm text-center">No messages yet.<br /><span className="text-xs opacity-70">Send the first message below.</span></span>
                            </div>
                        ) : chatHistory.map((h, i) => {
                            const isFactory = h.sender === 'factory';
                            return (
                                <div key={h.id || i} className={`flex ${isFactory ? 'justify-end' : 'justify-start'}`}>
                                    {!isFactory && (
                                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-600 dark:text-gray-300 flex-shrink-0 mr-1.5 mt-auto mb-0.5">
                                            {(selectedRFQ.clientName || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className={`max-w-[78%] flex flex-col ${isFactory ? 'items-end' : 'items-start'}`}>
                                        <div className={`rounded-2xl px-3 py-2 shadow-sm text-sm ${isFactory ? 'bg-[#c20c0b] text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-none'}`}>
                                            {h.price && <p className="font-bold text-base mb-0.5">${h.price}</p>}
                                            {h.message && <p className="whitespace-pre-wrap leading-relaxed">{h.message}</p>}
                                            {h.attachments && h.attachments.length > 0 && <p className="text-xs opacity-70 mt-1">📎 Attachment</p>}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                                            {isFactory ? 'You' : selectedRFQ.clientName} · {timeAgo(h.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Input ── */}
                    <div className="border-t border-gray-100 dark:border-white/10 px-3 py-2.5 flex-shrink-0 flex items-end gap-2 bg-white dark:bg-gray-900">
                        <textarea
                            ref={inputRef}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
                            {sending ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
