import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    MessageSquare, Search, X, Send, ArrowLeft, RefreshCw,
    ExternalLink, Package, ChevronRight, GripVertical, Users,
    Paperclip, FileText, Image as ImageIcon, Download, Eye,
    Check, CheckCheck
} from 'lucide-react';
import { supabase } from './supabaseClient';
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
    const localLastRead = getLastReadMap()[rfq.id] || '';
    const dbLastRead = rfq.negotiation_details?.adminLastRead || '';
    // Use whichever timestamp is later (covers cross-device reads)
    const lastRead = localLastRead > dbLastRead ? localLastRead : dbLastRead;
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

// ── Status colour ─────────────────────────────────────────────────────────────
function statusBadge(status: string) {
    if (status === 'Pending') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (status === 'Responded') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (['Accepted', 'Admin Accepted', 'Client Accepted'].includes(status)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'Declined') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (status === 'In Negotiation') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

// ── Attachment helpers ────────────────────────────────────────────────────────
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
function isImage(path: string) {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTS.includes(ext);
}
/** Strip timestamp-dedup prefix (e.g. "1712345678_") to restore original name */
function fileName(path: string) {
    return (path.split('/').pop() || path).replace(/^\d+_/, '');
}
async function getSignedUrl(path: string): Promise<string> {
    const { data } = await supabase.storage.from('quote-attachments').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
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
        clientAvatar: q.clients?.avatar_url || '',
        modification_count: q.modification_count || 0,
        modified_at: q.modified_at,
    };
}

// ── Client grouping ───────────────────────────────────────────────────────────
interface ClientGroup {
    userId: string;
    clientName: string;
    companyName: string;
    clientAvatar?: string;
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
                clientAvatar: rfq.clientAvatar || '',
                rfqs: [rfq],
                totalUnread: unread,
                latestTime: time,
            });
        }
    }
    return Array.from(map.values()).sort((a, b) => b.latestTime.localeCompare(a.latestTime));
}

// ── Resize ────────────────────────────────────────────────────────────────────
const MIN_W = 340, MAX_W = 760, MIN_H = 440, MAX_H = 900;
const DEFAULT_W = 390, DEFAULT_H = 620;
function useResize() {
    const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
    const dragging = useRef(false);
    const start = useRef({ x: 0, y: 0, w: DEFAULT_W, h: DEFAULT_H });
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
        start.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
        const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            setSize({
                w: Math.min(MAX_W, Math.max(MIN_W, start.current.w + (start.current.x - ev.clientX))),
                h: Math.min(MAX_H, Math.max(MIN_H, start.current.h + (start.current.y - ev.clientY))),
            });
        };
        const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [size.w, size.h]);
    return { size, onMouseDown };
}

// ── Inline attachment preview ─────────────────────────────────────────────────
const AttachmentPreview: React.FC<{ path: string; isFactory?: boolean; displayName?: string }> = ({ path, isFactory = false, displayName }) => {
    const [url, setUrl] = useState('');
    const [lightbox, setLightbox] = useState(false);
    const name = displayName || fileName(path);

    useEffect(() => { getSignedUrl(path).then(setUrl); }, [path]);

    if (!url) return (
        <div className={`w-full h-12 rounded-xl animate-pulse ${isFactory ? 'bg-white/15' : 'bg-gray-200 dark:bg-gray-700'}`} />
    );

    // Bubble-aware styles
    const boxCls = isFactory
        ? 'bg-white/15 hover:bg-white/25 border-white/25 text-white'
        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200';
    const iconCls = isFactory ? 'text-white/70' : 'text-gray-400 dark:text-gray-400';

    if (isImage(path)) return (
        <>
            <div className={`rounded-xl border overflow-hidden ${boxCls}`}>
                <div
                    className="relative group cursor-pointer"
                    onClick={() => setLightbox(true)}
                >
                    <img src={url} alt={name} className="w-full max-h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3">
                        <Eye size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <a href={url} download={name} onClick={e => e.stopPropagation()} className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download size={18} />
                        </a>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                    <FileText size={12} className={`flex-shrink-0 ${iconCls}`} />
                    <span className="text-[11px] truncate flex-1">{name}</span>
                </div>
            </div>
            {lightbox && createPortal(
                <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
                    <img src={url} alt={name} className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
                    <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors" onClick={() => setLightbox(false)}><X size={20} /></button>
                    <a href={url} download={name} className="absolute top-4 right-16 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors" onClick={e => e.stopPropagation()}><Download size={20} /></a>
                </div>,
                document.body
            )}
        </>
    );
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" download={name} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${boxCls}`}>
            <FileText size={14} className={`flex-shrink-0 ${iconCls}`} />
            <span className="text-xs truncate flex-1">{name}</span>
            <Download size={12} className={`flex-shrink-0 ${iconCls}`} />
        </a>
    );
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface AdminUniversalChatProps {
    onNavigate: (page: string, data?: any) => void;
}

type View = 'users' | 'rfqs' | 'chat';

// ── Component ─────────────────────────────────────────────────────────────────
export const AdminUniversalChat: React.FC<AdminUniversalChatProps> = ({ onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<View>('users');
    const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [selectedClient, setSelectedClient] = useState<ClientGroup | null>(null);
    const [selectedRFQ, setSelectedRFQ] = useState<QuoteRequest | null>(null);
    const [activeLineItemId, setActiveLineItemId] = useState<number | null>(null);

    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [attachFiles, setAttachFiles] = useState<File[]>([]);
    const [attachPreviews, setAttachPreviews] = useState<string[]>([]);
    const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false);
    const [pendingOpenRfqId, setPendingOpenRfqId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { size, onMouseDown } = useResize();

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchQuotes = useCallback(async () => {
        setLoading(true);
        const { data } = await quoteService.getAllQuotes();
        if (data) setQuotes((data as any[]).map(transformRaw));
        setLoading(false);
    }, []);
    useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

    // ── Realtime subscription ─────────────────────────────────────────────────
    useEffect(() => {
        const channel = supabase
            .channel('admin-universal-chat-rt')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'quotes',
            }, (payload) => {
                const updated = transformRaw(payload.new);
                setQuotes(prev => {
                    const exists = prev.some(q => q.id === updated.id);
                    if (!exists) return prev;
                    return prev.map(q => q.id === updated.id ? updated : q);
                });
                setSelectedRFQ(prev => prev?.id === updated.id ? updated : prev);
                setSelectedClient(prev => {
                    if (!prev) return prev;
                    if (!prev.rfqs.some(r => r.id === updated.id)) return prev;
                    return { ...prev, rfqs: prev.rfqs.map(r => r.id === updated.id ? updated : r) };
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // ── Scroll ────────────────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedRFQ?.negotiation_details?.history?.length, activeLineItemId]);

    // ── Focus input ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (view === 'chat') setTimeout(() => inputRef.current?.focus(), 60);
    }, [view, activeLineItemId]);

    // ── External open trigger (from RFQ cards) ────────────────────────────────
    useEffect(() => {
        const handler = (e: Event) => {
            const rfqId = (e as CustomEvent<{ rfqId: string }>).detail?.rfqId;
            if (!rfqId) return;
            setPendingOpenRfqId(rfqId);
            setIsOpen(true);
        };
        window.addEventListener('openAdminChatForRfq', handler);
        return () => window.removeEventListener('openAdminChatForRfq', handler);
    }, []);

    // ── Mark RFQ as read (localStorage + DB adminLastRead) ───────────────────
    const markAdminRead = useCallback((rfq: QuoteRequest): QuoteRequest => {
        const now = new Date().toISOString();
        markRead(rfq.id); // localStorage fallback
        const updatedNegDetails = { ...(rfq.negotiation_details || {}), adminLastRead: now };
        const updatedRfq = { ...rfq, negotiation_details: updatedNegDetails };
        // Optimistic state updates so unread badges clear instantly
        setQuotes(prev => prev.map(q => q.id === rfq.id ? updatedRfq : q));
        // Fire-and-forget DB write
        quoteService.update(rfq.id, { negotiation_details: updatedNegDetails });
        return updatedRfq;
    }, []);

    // ── Navigate to pending RFQ once quotes are loaded ────────────────────────
    useEffect(() => {
        if (!pendingOpenRfqId || !quotes.length) return;
        const rfq = quotes.find(q => q.id === pendingOpenRfqId);
        if (!rfq) return;
        const client = groupByClient(quotes).find(c => c.rfqs.some(r => r.id === rfq.id));
        if (client) setSelectedClient(client);
        const updatedRfq = markAdminRead(rfq);
        const items = rfq.order?.lineItems || [];
        setSelectedRFQ(updatedRfq);
        setActiveLineItemId(items[0]?.id ?? null);
        setView('chat');
        setOrderDetailsExpanded(false);
        setPendingOpenRfqId(null);
    }, [quotes, pendingOpenRfqId, markAdminRead]);

    // ── File select ───────────────────────────────────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const incoming = Array.from(e.target.files || []);
        if (!incoming.length) return;
        const newPreviews = incoming.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : '');
        setAttachFiles(prev => [...prev, ...incoming]);
        setAttachPreviews(prev => [...prev, ...newPreviews]);
        e.target.value = '';
    };

    const removeAttachment = (idx: number) => {
        setAttachPreviews(prev => { if (prev[idx]) URL.revokeObjectURL(prev[idx]); return prev.filter((_, i) => i !== idx); });
        setAttachFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const clearAttachments = () => {
        attachPreviews.forEach(u => { if (u) URL.revokeObjectURL(u); });
        setAttachFiles([]);
        setAttachPreviews([]);
    };

    // ── Send ──────────────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!selectedRFQ || (!message.trim() && !attachFiles.length)) return;
        setSending(true);

        const msgText = message.trim();
        const filesToUpload = attachFiles;

        // Clear input immediately so user can type the next message
        setMessage('');
        clearAttachments();

        const uploadedPaths: string[] = [];
        const uploadedNames: string[] = [];

        for (const file of filesToUpload) {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storageName = `${selectedRFQ.userId}/${selectedRFQ.id}/chat/${Date.now()}_${safeName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('quote-attachments')
                .upload(storageName, file);
            if (uploadError) {
                console.error('[Chat] Attachment upload failed:', uploadError.message);
                continue;
            }
            uploadedPaths.push(uploadData?.path || storageName);
            uploadedNames.push(file.name);
        }

        const newMsg: NegotiationHistoryItem = {
            id: Date.now().toString(),
            sender: 'factory',
            message: msgText,
            timestamp: new Date().toISOString(),
            action: 'info',
            relatedLineItemId: activeLineItemId ?? undefined,
            attachments: uploadedPaths,
            attachmentNames: uploadedNames,
        };

        const updatedHistory = [...(selectedRFQ.negotiation_details?.history || []), newMsg];
        const updatedFiles = uploadedPaths.length
            ? [...(selectedRFQ.files || []), ...uploadedPaths]
            : selectedRFQ.files || [];

        // Optimistic update — message appears immediately
        const optimisticRFQ: QuoteRequest = {
            ...selectedRFQ,
            files: updatedFiles,
            negotiation_details: { ...selectedRFQ.negotiation_details, history: updatedHistory },
        };
        setSelectedRFQ(optimisticRFQ);
        setQuotes(prev => prev.map(q => q.id === selectedRFQ.id ? optimisticRFQ : q));
        if (selectedClient) {
            setSelectedClient(prev => prev ? {
                ...prev,
                rfqs: prev.rfqs.map(r => r.id === selectedRFQ.id ? optimisticRFQ : r),
                latestTime: new Date().toISOString(),
            } : null);
        }

        const updatePayload: any = {
            negotiation_details: { ...selectedRFQ.negotiation_details, history: updatedHistory },
        };
        if (uploadedPaths.length) updatePayload.files = updatedFiles;

        const { error } = await quoteService.update(selectedRFQ.id, updatePayload);
        if (error) {
            console.error('[Chat] Failed to persist message:', error);
            setSelectedRFQ(selectedRFQ);
            setQuotes(prev => prev.map(q => q.id === selectedRFQ.id ? selectedRFQ : q));
        }
        setSending(false);
    };

    // ── Navigation ────────────────────────────────────────────────────────────
    const openClient = (client: ClientGroup) => { setSelectedClient(client); setSearch(''); setView('rfqs'); };
    const openRFQ = (rfq: QuoteRequest) => {
        const items = rfq.order?.lineItems || [];
        const updatedRfq = markAdminRead(rfq);
        setSelectedRFQ(updatedRfq);
        setActiveLineItemId(items[0]?.id ?? null);
        setView('chat');
        setOrderDetailsExpanded(false);
    };
    const goBack = () => {
        if (view === 'chat') { setSelectedRFQ(null); setMessage(''); clearAttachments(); setView('rfqs'); }
        else if (view === 'rfqs') { setSelectedClient(null); setSearch(''); setView('users'); }
    };
    const close = () => {
        setIsOpen(false); setView('users'); setSelectedClient(null);
        setSelectedRFQ(null); setMessage(''); clearAttachments(); setSearch('');
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const clientGroups = groupByClient(quotes);
    const totalUnread = clientGroups.reduce((s, c) => s + c.totalUnread, 0);

    const filteredClients = clientGroups.filter(c => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return c.clientName.toLowerCase().includes(s) || c.companyName.toLowerCase().includes(s);
    });

    const clientRFQs = (selectedClient?.rfqs || [])
        .slice().sort((a, b) => getLatestMessageTime(b).localeCompare(getLatestMessageTime(a)))
        .filter(rfq => {
            if (!search.trim()) return true;
            const s = search.toLowerCase();
            return rfq.id.toLowerCase().includes(s) || rfq.status.toLowerCase().includes(s)
                || rfq.order?.lineItems?.some((li: any) => li.category?.toLowerCase().includes(s));
        });

    const lineItems: any[] = selectedRFQ?.order?.lineItems || [];

    const chatHistory: NegotiationHistoryItem[] = selectedRFQ
        ? (selectedRFQ.negotiation_details?.history || [])
            .filter(h => {
                if (lineItems.length <= 1) return true;
                return h.relatedLineItemId === activeLineItemId
                    || h.lineItemPrices?.some((p: any) => p.lineItemId === activeLineItemId);
            })
            .map(h => {
                // Remap per-item price to h.price so chat bubbles always show a price
                const lineItemPrice = h.lineItemPrices?.find((p: any) => p.lineItemId === activeLineItemId)?.price
                    ?? h.lineItemPrices?.[0]?.price;
                return { ...h, price: h.price || lineItemPrice };
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        : [];

    const headerTitle = view === 'users' ? 'RFQ Messages'
        : view === 'rfqs' ? (selectedClient?.clientName || 'RFQs')
        : `RFQ #${selectedRFQ?.id.slice(0, 8).toUpperCase()}`;
    const headerSub = view === 'users'
        ? `${clientGroups.length} client${clientGroups.length !== 1 ? 's' : ''}`
        : view === 'rfqs'
        ? `${selectedClient?.companyName || ''}${selectedClient?.companyName ? ' · ' : ''}${selectedClient?.rfqs.length} RFQ${(selectedClient?.rfqs.length ?? 0) !== 1 ? 's' : ''}`
        : (selectedRFQ?.clientName || '');

    // ── Floating bubble ───────────────────────────────────────────────────────
    if (!isOpen) return (
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

    // ── Panel ─────────────────────────────────────────────────────────────────
    return createPortal(
        <div
            className="fixed bottom-6 right-6 z-[60] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden select-none"
            style={{ width: size.w, height: size.h }}
        >
            {/* Resize handle */}
            <div
                onMouseDown={onMouseDown}
                className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                title="Drag to resize"
            >
                <GripVertical size={13} className="text-white rotate-45" />
            </div>

            {/* ── Header ── */}
            <div className="flex items-center gap-2.5 px-3 py-3 bg-[#c20c0b] text-white flex-shrink-0">
                {view !== 'users' ? (
                    <button onClick={goBack} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
                        <ArrowLeft size={17} />
                    </button>
                ) : (
                    <div className="p-1.5 flex-shrink-0"><MessageSquare size={17} /></div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate leading-tight">{headerTitle}</p>
                    <p className="text-[11px] text-red-200 truncate leading-tight">{headerSub}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {view === 'chat' && selectedRFQ && (
                        <button
                            onClick={() => { onNavigate('adminRFQ', { quoteId: selectedRFQ.id }); close(); }}
                            className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-semibold transition-colors"
                            title="Open this RFQ's detail page"
                        >
                            <ExternalLink size={12} /> Open RFQ
                        </button>
                    )}
                    {view === 'users' && (
                        <button onClick={fetchQuotes} disabled={loading} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    )}
                    <button onClick={close} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={17} /></button>
                </div>
            </div>

            {/* Search bar */}
            {view !== 'chat' && (
                <div className="px-3 py-2 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                        <Search size={13} className="text-gray-400 flex-shrink-0" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={view === 'users' ? 'Search clients…' : 'Search RFQs, products…'}
                            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                        />
                        {search && <button onClick={() => setSearch('')}><X size={12} className="text-gray-400 hover:text-gray-600" /></button>}
                    </div>
                </div>
            )}

            {/* ═══ VIEW 1 — Users ═══ */}
            {view === 'users' && (
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                            <RefreshCw size={20} className="animate-spin" /><span className="text-sm">Loading…</span>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <Users size={32} className="opacity-30" />
                            <span className="text-sm">{search ? 'No clients found' : 'No RFQs yet'}</span>
                        </div>
                    ) : filteredClients.map(client => {
                        const lastRFQ = client.rfqs.sort((a, b) => getLatestMessageTime(b).localeCompare(getLatestMessageTime(a)))[0];
                        const lastHistory = lastRFQ?.negotiation_details?.history || [];
                        const lastMsg = lastHistory.length ? lastHistory[lastHistory.length - 1] : null;
                        return (
                            <button key={client.userId} onClick={() => openClient(client)}
                                className="w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                    <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm ${!client.clientAvatar && (client.totalUnread > 0 ? 'bg-[#c20c0b] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}`}>
                                        {client.clientAvatar
                                            ? <img src={client.clientAvatar} alt={client.clientName} className="w-full h-full object-cover" />
                                            : client.clientName[0]?.toUpperCase() || 'U'}
                                    </div>
                                    {client.totalUnread > 0 && (
                                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-[#c20c0b] border-2 border-white dark:border-gray-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {client.totalUnread > 9 ? '9+' : client.totalUnread}
                                        </span>
                                    )}
                                </div>
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

            {/* ═══ VIEW 2 — RFQs per client ═══ */}
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
                        const categories = items.map((li: any) => li.category).filter(Boolean).slice(0, 3);
                        return (
                            <button key={rfq.id} onClick={() => openRFQ(rfq)}
                                className="w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 font-mono">#{rfq.id.slice(0, 8).toUpperCase()}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(rfq.status)}`}>{rfq.status}</span>
                                    {unread > 0 && (
                                        <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-[#c20c0b] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {unread > 9 ? '9+' : unread}
                                        </span>
                                    )}
                                    <span className={`text-[10px] text-gray-400 tabular-nums ${unread > 0 ? '' : 'ml-auto'}`}>{timeAgo(getLatestMessageTime(rfq))}</span>
                                </div>
                                {categories.length > 0 && (
                                    <p className="flex flex-wrap gap-1 mb-1">
                                        {categories.map((cat, i) => (
                                            <span key={i} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] text-gray-500 dark:text-gray-400">{cat}</span>
                                        ))}
                                        {items.length > 3 && <span className="text-gray-400 text-[10px]">+{items.length - 3} more</span>}
                                    </p>
                                )}
                                <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {lastMsg ? `${lastMsg.sender === 'factory' ? 'You: ' : ''}${lastMsg.message || '📎 Attachment'}` : <span className="italic">No messages yet</span>}
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ═══ VIEW 3 — Chat ═══ */}
            {view === 'chat' && selectedRFQ && (
                <div className="flex flex-col flex-1 min-h-0">

                    {/* Order details strip */}
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
                                    {selectedRFQ.order?.shippingCountry ? ` · ${selectedRFQ.order.shippingCountry}` : ''}
                                </span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge(selectedRFQ.status)}`}>{selectedRFQ.status}</span>
                            <ChevronRight size={13} className={`text-gray-400 flex-shrink-0 transition-transform ${orderDetailsExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {orderDetailsExpanded && (
                            <div className="px-3 pb-2.5 space-y-1.5 max-h-44 overflow-y-auto bg-gray-50/60 dark:bg-gray-800/20">
                                {lineItems.map((li: any, i: number) => (
                                    <div key={li.id ?? i} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-white/5">
                                        <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{li.category}</p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {[li.fabricQuality, li.weightGSM && `${li.weightGSM} GSM`, (li.qty && `${li.qty} units`) || li.containerType].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                        {li.targetPrice && <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 flex-shrink-0">${li.targetPrice}</span>}
                                    </div>
                                ))}
                                {(selectedRFQ.order?.shippingCountry || selectedRFQ.order?.shippingPort) && (
                                    <p className="text-[10px] text-gray-400 px-1">
                                        {[
                                            selectedRFQ.order.shippingCountry && `📍 ${selectedRFQ.order.shippingCountry}`,
                                            selectedRFQ.order.shippingPort && `🚢 ${selectedRFQ.order.shippingPort}`,
                                        ].filter(Boolean).join('  ·  ')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Product tabs */}
                    {lineItems.length > 1 && (
                        <div className="flex overflow-x-auto px-3 pt-2 pb-1.5 gap-1.5 border-b border-gray-100 dark:border-white/10 flex-shrink-0 scrollbar-none">
                            {lineItems.map((li: any) => (
                                <button key={li.id} onClick={() => setActiveLineItemId(li.id)}
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

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                        {chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                                <MessageSquare size={26} className="opacity-30" />
                                <span className="text-sm text-center">No messages yet.<br /><span className="text-xs opacity-70">Send the first message below.</span></span>
                            </div>
                        ) : (() => {
                            const clientLastRead = selectedRFQ.negotiation_details?.clientLastRead || '';
                            return chatHistory.map((h, i) => {
                                const isFactory = h.sender === 'factory';
                                const isRead = isFactory && clientLastRead !== '' && h.timestamp <= clientLastRead;
                                return (
                                    <div key={h.id || i} className={`flex ${isFactory ? 'justify-end' : 'justify-start'}`}>
                                        {!isFactory && (
                                            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-600 dark:text-gray-300 flex-shrink-0 mr-1.5 mt-auto mb-0.5">
                                                {selectedRFQ.clientAvatar
                                                    ? <img src={selectedRFQ.clientAvatar} alt={selectedRFQ.clientName || ''} className="w-full h-full object-cover" />
                                                    : (selectedRFQ.clientName || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] flex flex-col ${isFactory ? 'items-end' : 'items-start'}`}>
                                            <div className={`rounded-2xl px-3 py-2 shadow-sm text-sm ${isFactory ? 'bg-[#c20c0b] text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-none'}`}>
                                                {h.price && <p className="font-bold text-base mb-0.5">${h.price}</p>}
                                                {h.message && <p className="whitespace-pre-wrap leading-relaxed">{h.message}</p>}
                                                {h.attachments && h.attachments.map((path, ai) => (
                                                    <div key={ai} className="mt-2 w-full">
                                                        <AttachmentPreview path={path} isFactory={isFactory} displayName={h.attachmentNames?.[ai]} />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1">
                                                {isFactory ? 'You' : selectedRFQ.clientName} · {timeAgo(h.timestamp)}
                                                {isFactory && (
                                                    isRead
                                                        ? <CheckCheck size={12} className="text-blue-400" />
                                                        : <Check size={12} className="text-gray-400" />
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Attachment previews above input */}
                    {attachFiles.length > 0 && (
                        <div className="px-3 pb-1 flex-shrink-0 flex flex-wrap gap-2">
                            {attachFiles.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl pl-2 pr-1.5 py-1.5 border border-gray-200 dark:border-white/10 max-w-[180px]">
                                    {attachPreviews[idx]
                                        ? <img src={attachPreviews[idx]} alt="preview" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                        : <FileText size={16} className="text-gray-500 flex-shrink-0" />
                                    }
                                    <span className="flex-1 text-xs text-gray-700 dark:text-gray-200 truncate">{f.name}</span>
                                    <button onClick={() => removeAttachment(idx)} className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="border-t border-gray-100 dark:border-white/10 px-3 py-2.5 flex-shrink-0 flex items-end gap-2 bg-white dark:bg-gray-900">
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-[#c20c0b] transition-colors flex-shrink-0 relative"
                            title="Attach files"
                        >
                            <Paperclip size={18} />
                            {attachFiles.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-[#c20c0b] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {attachFiles.length}
                                </span>
                            )}
                        </button>
                        <textarea
                            ref={inputRef}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Type a message… (Enter to send)"
                            rows={1}
                            className="flex-1 bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-white rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/30 max-h-28 placeholder-gray-400"
                            style={{ fieldSizing: 'content' } as any}
                        />
                        <button
                            onClick={handleSend}
                            disabled={(!message.trim() && !attachFiles.length) || sending}
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
