import React, { useState, FC, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MainLayout } from './MainLayout';
import { QuoteRequest } from './types';
import {
    Plus, MapPin, Globe, Shirt, Package, Clock, ChevronRight, FileQuestion, RefreshCw, MessageSquare, Bell, Calendar, DollarSign, CheckCircle, Check, CheckCheck, FileText, Trash2, AlertCircle, Filter, Search, Eye, X, ChevronDown, ClipboardList, Inbox, Archive, CheckSquare, Pencil, Circle, MailOpen, Mail, Square, Truck, FlaskConical, ExternalLink
} from 'lucide-react';
import { formatFriendlyDate, getStatusColor, getStatusGradientBorder, getStatusHoverShadow } from './utils';
import { useToast } from './ToastContext';
import { useOrgPermissions } from './OrgContext';

interface MyQuotesPageProps {
    quoteRequests: QuoteRequest[];
    handleSetCurrentPage: (page: string, data?: any) => void;
    layoutProps: any;
    isLoading: boolean;
    onRefresh: () => void;
    initialFilterStatus?: string;
    crmOrdersByQuoteId?: Record<string, string>;
}

const EmptyState: FC<{ filterStatus: string; searchTerm?: string; onClearFilter: () => void; onRequestQuote: () => void; }> = ({ filterStatus, searchTerm, onClearFilter, onRequestQuote }) => {
    let title = "No Quotes Found";
    let message = `No quotes match the "${filterStatus}" filter.`;
    let action: React.ReactNode = <button onClick={onClearFilter} className="mt-4 text-sm font-bold text-[#c20c0b] hover:underline">Show All Quotes</button>;
    let Icon = FileQuestion;

    if (searchTerm) {
        title = "No Search Results";
        message = `No quotes match your search for "${searchTerm}".`;
        action = <button onClick={onClearFilter} className="mt-4 text-sm font-bold text-[#c20c0b] hover:underline">Clear Search</button>;
        Icon = Search;
    } else if (filterStatus !== 'All') {
        switch (filterStatus) {
            case 'Drafts':
                title = "No Saved Drafts";
                message = "You don't have any unfinished quote requests. Start a new one whenever you're ready.";
                Icon = ClipboardList;
                action = <button onClick={onRequestQuote} className="mt-4 bg-[#c20c0b] text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#a50a09] transition shadow-md"><Plus size={18} /> Create New Draft</button>;
                break;
            case 'Pending':
                title = "No Pending Requests";
                message = "You're all caught up! There are no quotes currently awaiting a response from factories.";
                Icon = Inbox;
                action = <button onClick={onRequestQuote} className="mt-4 bg-[#c20c0b] text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#a50a09] transition shadow-md"><Plus size={18} /> Request a New Quote</button>;
                break;
            case 'Responded':
                title = "No New Responses";
                message = "You haven't received any new quotes from factories yet. Check back later or start a new request.";
                Icon = MessageSquare;
                break;
            case 'In Negotiation':
                title = "No Active Negotiations";
                message = "You don't have any ongoing negotiations. Once you reply to a factory's offer, it will appear here.";
                Icon = MessageSquare;
                break;
            case 'Accepted':
                title = "No Accepted Quotes";
                message = "You haven't accepted any quotes yet. Accepted quotes move to your order history.";
                Icon = CheckCircle;
                break;
            case 'Declined':
                title = "No Declined Quotes";
                message = "You haven't declined any quotes. Declined offers are stored here for reference.";
                Icon = Archive;
                break;
            case 'Admin Accepted':
                title = "No Admin Accepted Quotes";
                message = "There are no quotes currently accepted by the admin waiting for your action.";
                Icon = CheckSquare;
                break;
            case 'Client Accepted':
                title = "No Quotes Awaiting Admin Acceptance";
                message = "You have not accepted any quotes that are now waiting for admin finalization.";
                Icon = Clock;
                break;
        }
    } else {
        title = "Start Your Sourcing Journey";
        message = "You haven't requested any quotes yet. Create a request to get competitive offers from top factories.";
        Icon = Package;
        action = <button onClick={onRequestQuote} className="mt-6 bg-[#c20c0b] text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-[#a50a09] transition shadow-lg transform hover:-translate-y-0.5"><Plus size={20} /> Request Your First Quote</button>;
    }

    return (
        <div className="text-center py-20 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex flex-col items-center justify-center animate-fade-in">
            <div className="h-20 w-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Icon className="h-10 w-10 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-6">{message}</p>
            {action}
        </div>
    );
};

const STATUS_THEMES: Record<string, { cardBg: string; border: string; glow: string; glowHover: string; meshGradient: string; progressColor: string }> = {
    'Pending': {
        cardBg: 'bg-amber-50/70 dark:bg-amber-950/25',
        border: 'border-amber-200/80 dark:border-amber-800/40',
        glow: 'rgba(245,158,11,0.12)', glowHover: 'rgba(245,158,11,0.30)',
        meshGradient: 'radial-gradient(ellipse at 85% 10%, rgba(251,191,36,0.12) 0%, transparent 55%)',
        progressColor: '#f59e0b',
    },
    'Responded': {
        cardBg: 'bg-blue-50/70 dark:bg-blue-950/25',
        border: 'border-blue-200/80 dark:border-blue-800/40',
        glow: 'rgba(59,130,246,0.12)', glowHover: 'rgba(59,130,246,0.30)',
        meshGradient: 'radial-gradient(ellipse at 85% 10%, rgba(96,165,250,0.12) 0%, transparent 55%)',
        progressColor: '#3b82f6',
    },
    'In Negotiation': {
        cardBg: 'bg-violet-50/70 dark:bg-violet-950/25',
        border: 'border-violet-200/80 dark:border-violet-800/40',
        glow: 'rgba(139,92,246,0.12)', glowHover: 'rgba(139,92,246,0.30)',
        meshGradient: 'radial-gradient(ellipse at 85% 10%, rgba(167,139,250,0.12) 0%, transparent 55%)',
        progressColor: '#8b5cf6',
    },
    'Accepted': {
        cardBg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
        border: 'border-emerald-200/80 dark:border-emerald-800/40',
        glow: 'rgba(16,185,129,0.14)', glowHover: 'rgba(16,185,129,0.32)',
        meshGradient: 'radial-gradient(ellipse at 85% 10%, rgba(52,211,153,0.12) 0%, transparent 55%)',
        progressColor: '#10b981',
    },
    'Admin Accepted': {
        cardBg: 'bg-teal-50/70 dark:bg-teal-950/25',
        border: 'border-teal-200/80 dark:border-teal-800/40',
        glow: 'rgba(20,184,166,0.12)', glowHover: 'rgba(20,184,166,0.30)',
        meshGradient: 'radial-gradient(ellipse at 85% 10%, rgba(45,212,191,0.12) 0%, transparent 55%)',
        progressColor: '#14b8a6',
    },
    'Client Accepted': {
        cardBg: 'bg-cyan-50/70 dark:bg-cyan-950/25',
        border: 'border-cyan-200/80 dark:border-cyan-800/40',
        glow: 'rgba(6,182,212,0.12)', glowHover: 'rgba(6,182,212,0.30)',
        meshGradient: 'radial-gradient(ellipse at 85% 10%, rgba(34,211,238,0.12) 0%, transparent 55%)',
        progressColor: '#06b6d4',
    },
    'Declined': {
        cardBg: 'bg-red-50/50 dark:bg-red-950/20',
        border: 'border-red-200/60 dark:border-red-800/30',
        glow: 'rgba(239,68,68,0.08)', glowHover: 'rgba(239,68,68,0.22)',
        meshGradient: 'radial-gradient(ellipse at 85% 10%, rgba(252,165,165,0.10) 0%, transparent 55%)',
        progressColor: '#ef4444',
    },
    'Draft': {
        cardBg: 'bg-gray-50/70 dark:bg-gray-800/30',
        border: 'border-gray-200/80 dark:border-gray-700/40',
        glow: 'rgba(156,163,175,0.08)', glowHover: 'rgba(156,163,175,0.20)',
        meshGradient: 'radial-gradient(ellipse at 85% 10%, rgba(209,213,219,0.10) 0%, transparent 55%)',
        progressColor: '#9ca3af',
    },
};

const DEFAULT_THEME = {
    cardBg: 'bg-white dark:bg-gray-900/40', border: 'border-gray-200 dark:border-white/10',
    glow: 'rgba(156,163,175,0.08)', glowHover: 'rgba(156,163,175,0.18)',
    meshGradient: 'none', progressColor: '#9ca3af',
};

const QUOTE_PROGRESS_STEPS = [
    { label: 'Submitted',   short: 'Sub'   },
    { label: 'Pending',     short: 'Pend'  },
    { label: 'Responded',   short: 'Resp'  },
    { label: 'Negotiating', short: 'Neg'   },
    { label: 'Finalized',   short: 'Final' },
];

const getProgressStep = (status: string): number => {
    const map: Record<string, number> = {
        'Draft': 0, 'Pending': 1, 'Responded': 2,
        'In Negotiation': 3, 'Client Accepted': 4,
        'Admin Accepted': 4, 'Accepted': 4, 'Declined': 2,
    };
    return map[status] ?? 0;
};

export const MyQuotesPage: FC<MyQuotesPageProps> = ({ quoteRequests, handleSetCurrentPage, layoutProps, isLoading, onRefresh, initialFilterStatus, crmOrdersByQuoteId }) => {
    const { can } = useOrgPermissions();
    const canEdit = can('sourcing', 'edit');
    const [filterStatus, setFilterStatus] = useState(initialFilterStatus || 'All');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [searchTerm, setSearchTerm] = useState('');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [previewQuote, setPreviewQuote] = useState<QuoteRequest | null>(null);
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
    const [readTick, setReadTick] = useState(0); // bump to force re-render after marking as read
    const todayString = new Date().toISOString().split('T')[0];
    const [draftQuotes, setDraftQuotes] = useState<QuoteRequest[]>([]);
    const { showToast } = useToast();

    // Read/unread system
    const pendingReadTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const [undoState, setUndoState] = useState<{ quoteId: string; label: string } | null>(null);
    const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [expandedProductCardId, setExpandedProductCardId] = useState<string | null>(null);

    // Load drafts from local storage
    useEffect(() => {
        const draftData = localStorage.getItem('garment_erp_saved_drafts');
        if (draftData) {
            try {
                const parsedDrafts = JSON.parse(draftData);
                setDraftQuotes(parsedDrafts);
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }, []);

    const getQuoteTimestamp = (quote: QuoteRequest) => {
        if (quote.modified_at) return quote.modified_at;
        if (quote.status === 'Accepted' && quote.acceptedAt) return quote.acceptedAt;
        if (quote.status === 'In Negotiation' && quote.negotiation_details?.submittedAt) return quote.negotiation_details.submittedAt;
        if (quote.status === 'Responded' && quote.response_details?.respondedAt) return quote.response_details.respondedAt;
        // Fallback for Responded if respondedAt is missing
        if (quote.status === 'Responded') return quote.submittedAt;
        if (quote.status === 'Declined') return quote.response_details?.respondedAt || quote.submittedAt;
        return quote.submittedAt;
    };

    const getDisplayDateInfo = (quote: QuoteRequest) => {
        const date = getQuoteTimestamp(quote);
        let label = 'Submitted';
        // "Modified" only when the user explicitly added items to an existing quote
        if ((quote.modification_count || 0) > 0) label = 'Modified';
        else if (quote.status === 'Accepted') label = 'Accepted';
        else if (quote.status === 'In Negotiation') label = 'Updated';
        else if (quote.status === 'Responded') label = 'Received';
        else if (quote.status === 'Declined') label = 'Declined';
        else if (quote.status === 'Admin Accepted') label = 'Admin Accepted';
        else if (quote.status === 'Client Accepted') label = 'You Accepted';
        return { label, date: formatFriendlyDate(date) };
    };

    const checkDateFilter = (quote: QuoteRequest) => {
        if (dateFilter === 'All Time') return true;
        const quoteDate = new Date(getQuoteTimestamp(quote));
        
        if (dateFilter === 'Custom Range') {
            const start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(-8640000000000000);
            const end = customEndDate ? new Date(customEndDate + 'T23:59:59.999') : new Date(8640000000000000);
            return quoteDate >= start && quoteDate <= end;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);

        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);

        if (dateFilter === 'Today') {
            return quoteDate >= today;
        }
        if (dateFilter === 'Yesterday') {
            return quoteDate >= yesterday && quoteDate < today;
        }
        if (dateFilter === 'Last 7 Days') {
            return quoteDate >= last7Days;
        }
        return quoteDate >= last30Days; // Last 30 Days
    };

    const isResponseAwaited = (quote: QuoteRequest) => {
        if (quote.status === 'Pending') return true;
        if (quote.status === 'In Negotiation') {
            const history = quote.negotiation_details?.history;
            if (history && Array.isArray(history) && history.length > 0) {
                return history[history.length - 1].sender === 'client';
            }
            return true; // Assume client started negotiation if no history
        }
        return false;
    };

    const isNewReply = (quote: QuoteRequest) => {
        if (quote.status === 'In Negotiation') {
             const history = quote.negotiation_details?.history;
             if (history && Array.isArray(history) && history.length > 0) {
                 return history[history.length - 1].sender === 'factory';
             }
        }
        return false;
    };

    // Only tracks meaningful updates FROM admin — not noisy DB `modified_at` bumps
    const getMeaningfulUpdateTimestamp = (quote: QuoteRequest): string => {
        const history = quote.negotiation_details?.history;
        if (history && Array.isArray(history) && history.length > 0) {
            const last = history[history.length - 1];
            if (last.sender !== 'client') return last.timestamp;
        }
        if (quote.status === 'Accepted' && quote.acceptedAt) return quote.acceptedAt;
        if (quote.response_details?.respondedAt) return quote.response_details.respondedAt;
        return quote.submittedAt;
    };

    const isUnread = (quote: QuoteRequest) => {
        const lastRead = localStorage.getItem(`quote_read_${quote.id}`);
        if (!lastRead) return true;
        return new Date(getMeaningfulUpdateTimestamp(quote)).getTime() > new Date(lastRead).getTime();
    };

    // Thread unread: unread if any quote for the same userId is unread
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isThreadUnread = (userId: string) =>
        (quoteRequests || []).some(q => q.userId === userId && q.status !== 'Draft' && isUnread(q));

    const markAsUnread = (quoteId: string) => {
        localStorage.removeItem(`quote_read_${quoteId}`);
        setReadTick(t => t + 1);
    };

    const scheduleMarkAsRead = (quote: QuoteRequest) => {
        if (pendingReadTimers.current[quote.id]) clearTimeout(pendingReadTimers.current[quote.id]);
        pendingReadTimers.current[quote.id] = setTimeout(() => {
            localStorage.setItem(`quote_read_${quote.id}`, new Date().toISOString());
            setReadTick(t => t + 1);
            delete pendingReadTimers.current[quote.id];
        }, 1000);
    };

    const manualMarkAsRead = (e: React.MouseEvent, quote: QuoteRequest) => {
        e.stopPropagation();
        localStorage.setItem(`quote_read_${quote.id}`, new Date().toISOString());
        setReadTick(t => t + 1);
        if (undoTimer.current) clearTimeout(undoTimer.current);
        setUndoState({ quoteId: quote.id, label: quote.factory?.name || `#${quote.id.slice(0, 8)}` });
        undoTimer.current = setTimeout(() => setUndoState(null), 5000);
    };

    const handleUndoMarkAsRead = () => {
        if (!undoState) return;
        markAsUnread(undoState.quoteId);
        setUndoState(null);
        if (undoTimer.current) clearTimeout(undoTimer.current);
    };

    const toggleSelectMode = () => { setIsSelectMode(v => !v); setSelectedIds([]); };
    const toggleSelectId = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => setSelectedIds(prev => prev.length === filteredQuotes.length ? [] : filteredQuotes.map(q => q.id));

    const bulkMarkAsRead = () => {
        selectedIds.forEach(id => {
            const q = quoteRequests.find(q => q.id === id);
            if (q) localStorage.setItem(`quote_read_${id}`, new Date().toISOString());
        });
        setReadTick(t => t + 1);
        setSelectedIds([]);
        showToast(`${selectedIds.length} quotes marked as read.`);
    };

    const bulkMarkAsUnread = () => {
        selectedIds.forEach(id => localStorage.removeItem(`quote_read_${id}`));
        setReadTick(t => t + 1);
        setSelectedIds([]);
        showToast(`${selectedIds.length} quotes marked as unread.`);
    };

    const handleCardClick = (quote: QuoteRequest) => {
        if (quote.status === 'Draft') {
            handleSetCurrentPage('orderForm');
            return;
        }
        handleSetCurrentPage('quoteDetail', quote);
        // Mark as read after 1 second — prevents accidental-click false-positives
        scheduleMarkAsRead(quote);
    };

    const handleRequestNewQuote = () => {
        localStorage.removeItem('garment_erp_order_draft');
        handleSetCurrentPage('orderForm');
    };

    const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this draft permanently?")) {
            const newDrafts = draftQuotes.filter(d => d.id !== draftId);
            setDraftQuotes(newDrafts);
            localStorage.setItem('garment_erp_saved_drafts', JSON.stringify(newDrafts));
            
            // Also clear current working draft if it matches
            const currentWork = localStorage.getItem('garment_erp_order_draft');
            if (currentWork) {
                const parsed = JSON.parse(currentWork);
                if (parsed.draftId === draftId) {
                    localStorage.removeItem('garment_erp_order_draft');
                }
            }
            
            showToast("Draft deleted successfully.", "success");
        }
    };

    const handleResumeDraft = (quote: QuoteRequest) => {
        localStorage.setItem('garment_erp_order_draft', JSON.stringify(quote.order));
        handleSetCurrentPage('orderForm');
    };

    const filteredQuotes = (quoteRequests || [])
        .filter(quote => quote.status !== 'Trashed')
        .filter(quote => filterStatus === 'All' ? quote.status !== 'Draft' : quote.status === filterStatus)
        .concat(filterStatus === 'Drafts' ? draftQuotes : [])
        .filter(checkDateFilter)
        .filter(quote => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return quote.id.toLowerCase().includes(term) || (quote.factory?.name?.toLowerCase() || '').includes(term);
        })
        .sort((a, b) => {
            // Unread quotes always float to top
            const aUnread = (a.status !== 'Draft' && isUnread(a)) ? 0 : 1;
            const bUnread = (b.status !== 'Draft' && isUnread(b)) ? 0 : 1;
            if (aUnread !== bUnread) return aUnread - bUnread;
            return new Date(getQuoteTimestamp(b)).getTime() - new Date(getQuoteTimestamp(a)).getTime();
        });

    const unreadQuotes = filterStatus === 'All'
        ? filteredQuotes.filter(q => q.status !== 'Draft' && isUnread(q))
        : [];

    const needsAttentionQuotes = filterStatus === 'All'
        ? filteredQuotes.filter(q => ['Responded', 'In Negotiation'].includes(q.status) && !isUnread(q))
        : [];

    const regularQuotes = filterStatus === 'All'
        ? filteredQuotes.filter(q => !unreadQuotes.includes(q) && !needsAttentionQuotes.includes(q))
        : filteredQuotes;

    const unreadCount = filteredQuotes.filter(q => q.status !== 'Draft' && isUnread(q)).length;

    const markAllAsRead = () => {
        filteredQuotes.forEach(q => {
            if (q.status !== 'Draft') {
                localStorage.setItem(`quote_read_${q.id}`, new Date().toISOString());
            }
        });
        setReadTick(t => t + 1);
        showToast('All quotes marked as read.');
    };

    const renderCard = (quote: QuoteRequest, index: number) => {
        const theme = STATUS_THEMES[quote.status] ?? DEFAULT_THEME;
        const isHovered = hoveredCardId === quote.id;
        const progressStep = getProgressStep(quote.status);
        const isUnreadCard = quote.status !== 'Draft' && isUnread(quote);
        const isSelected = selectedIds.includes(quote.id);
        const lineItems = quote.order?.lineItems || [];
        const respondedStatuses = ['Responded', 'In Negotiation', 'Admin Accepted', 'Client Accepted', 'Accepted'];
        const hasResponse = respondedStatuses.includes(quote.status);
        const isAcc = quote.status === 'Accepted';
        const displayStatus = quote.status === 'Admin Accepted' ? 'Admin Acc.' : quote.status === 'Client Accepted' ? 'You Accepted' : quote.status;
        const leadTime = quote.response_details?.leadTime;
        const isExpanded = expandedProductCardId === quote.id;

        let quotedPriceDisplay: string | null = null;
        if (hasResponse) {
            if (quote.response_details?.price) {
                quotedPriceDisplay = `$${quote.response_details.price}`;
            } else if (lineItems.length === 1) {
                const r = (quote.response_details?.lineItemResponses || []).find((r: any) => r.lineItemId === lineItems[0].id);
                if (r?.price) quotedPriceDisplay = `$${r.price}`;
            }
        }

        const displayedItems = isExpanded ? lineItems : lineItems.slice(0, 2);
        const hiddenCount = lineItems.length - 2;

        return (
            <div
                key={quote.id}
                data-testid={`quote-card-${quote.id}`}
                onClick={() => {
                    if (isSelectMode && quote.status !== 'Draft') { toggleSelectId(quote.id); return; }
                    quote.status === 'Draft' ? handleResumeDraft(quote) : handleCardClick(quote);
                }}
                onMouseEnter={() => setHoveredCardId(quote.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                className={`${theme.cardBg} backdrop-blur-sm rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col hover:-translate-y-1 ${isSelected ? 'border-[#c20c0b] ring-2 ring-[#c20c0b]/30' : theme.border}`}
                style={{
                    boxShadow: isSelected
                        ? `0 4px 20px -4px rgba(194,12,11,0.25), 0 1px 3px rgba(0,0,0,0.06)`
                        : isHovered
                        ? isUnreadCard
                            ? `0 20px 40px -8px ${theme.glowHover}, 0 8px 16px -4px ${theme.glow}, 0 2px 6px rgba(0,0,0,0.08), inset 3px 0 0 #f59e0b`
                            : `0 20px 40px -8px ${theme.glowHover}, 0 8px 16px -4px ${theme.glow}, 0 2px 6px rgba(0,0,0,0.08)`
                        : isUnreadCard
                            ? `0 4px 20px -4px ${theme.glow}, 0 1px 3px rgba(0,0,0,0.06), inset 3px 0 0 #f59e0b`
                            : `0 4px 20px -4px ${theme.glow}, 0 1px 3px rgba(0,0,0,0.06)`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animationDelay: `${index * 50}ms`,
                }}
            >
                {/* Status gradient top bar */}
                <div className={`h-[7px] w-full bg-gradient-to-r ${getStatusGradientBorder(quote.status)} flex-shrink-0`} />

                {/* Subtle ambient overlay */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-60"
                    style={{ background: theme.meshGradient, top: '3px' }}
                />

                <div className="flex flex-col flex-grow relative">

                    {/* ── SECTION 1: Header — factory identity + status ── */}
                    <div className="px-4 pt-4 pb-3">
                        {/* Top row: factory avatar + name + status badge */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {isSelectMode && quote.status !== 'Draft' && (
                                    <input
                                        data-testid={`quote-checkbox-${quote.id}`}
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectId(quote.id)}
                                        onClick={e => e.stopPropagation()}
                                        className="rounded text-[#c20c0b] focus:ring-[#c20c0b] h-4 w-4 cursor-pointer flex-shrink-0"
                                    />
                                )}
                                {quote.factory?.imageUrl ? (
                                    <div className="relative flex-shrink-0">
                                        <img
                                            className="h-11 w-11 rounded-xl object-cover shadow-sm"
                                            style={{ border: `2px solid ${theme.progressColor}45` }}
                                            src={quote.factory.imageUrl}
                                            alt={quote.factory.name}
                                        />
                                        <span
                                            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900"
                                            style={{ backgroundColor: theme.progressColor }}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-11 w-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
                                        <Package size={18} className="text-gray-400" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight group-hover:text-[#c20c0b] transition-colors">
                                            {quote.factory?.name || 'New Request'}
                                        </p>
                                        {isUnreadCard && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />}
                                    </div>
                                    {quote.factory?.location && (
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                                            <MapPin size={8} /> {quote.factory.location}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {/* Status badge */}
                            <span data-testid={`quote-status-${quote.id}`} className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border ${getStatusColor(quote.status)} flex items-center gap-1 flex-shrink-0`}>
                                {quote.status === 'Accepted' && <CheckCheck size={11} />}
                                {(quote.status === 'Admin Accepted' || quote.status === 'Client Accepted') && <Check size={11} />}
                                {displayStatus}
                            </span>
                        </div>
                        {/* Second row: RFQ reference + date + modification badge */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold bg-gray-100/90 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md tracking-wider border border-gray-200/60 dark:border-gray-700/50">
                                RFQ-{quote.id.slice(0, 6).toUpperCase()}
                            </span>
                            {(quote.modification_count || 0) > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md border border-amber-300 dark:border-amber-600/60 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                    <Pencil size={9} /> ×{quote.modification_count}
                                </span>
                            )}
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 ml-auto">
                                <Clock size={9} />
                                {getDisplayDateInfo(quote).label} · {getDisplayDateInfo(quote).date}
                            </span>
                        </div>
                    </div>

                    {quote.status === 'Draft' ? (
                        /* ── Draft state ───────────────────────────────── */
                        <div className="px-4 pb-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-gray-800/40 border border-dashed border-gray-300 dark:border-gray-600">
                                <FileText size={20} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white text-sm">Draft Order</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Unsaved — tap to continue editing</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ── SECTION 2: Items Requested ─────────────── */}
                            <div className="px-4 pb-3">
                                <div className="border-t border-dashed border-gray-200 dark:border-gray-700/50 mb-3" />
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Items Requested</span>
                                    {hiddenCount > 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setExpandedProductCardId(prev => prev === quote.id ? null : quote.id); }}
                                            className="flex items-center gap-0.5 text-[9px] font-semibold text-[#c20c0b] hover:underline"
                                        >
                                            {isExpanded ? 'Show less' : `+${hiddenCount} more`}
                                            <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    {displayedItems.map((item: any, i: number) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-100/80 dark:border-gray-700/40"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{item.productName || item.category || 'Product'}</p>
                                                {(item.productName ? item.category : item.fabricQuality) && (
                                                    <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{item.productName ? item.category : item.fabricQuality}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                    {item.quantityType === 'container' ? item.containerType : `${item.qty || '—'} units`}
                                                </span>
                                                {item.targetPrice && (
                                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 px-1.5 py-0.5 rounded-md tabular-nums">
                                                        ${item.targetPrice}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Sample status tags ──────────────────────── */}
                            {(quote.sampleStatus === 'Requested' || quote.sampleStatus === 'In Transit') && (
                                <div className="px-4 pb-3 flex items-center gap-1.5">
                                    {quote.sampleStatus === 'Requested' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-purple-50 dark:bg-purple-900/25 border border-purple-200/70 dark:border-purple-700/50 text-purple-700 dark:text-purple-400">
                                            <FlaskConical size={9} /> Sample Requested
                                        </span>
                                    )}
                                    {quote.sampleStatus === 'In Transit' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-sky-50 dark:bg-sky-900/25 border border-sky-200/70 dark:border-sky-700/50 text-sky-700 dark:text-sky-400">
                                            <Truck size={9} /> In Transit
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* ── SECTION 4: Factory's quote (when responded) ─ */}
                            {hasResponse && (quotedPriceDisplay || leadTime) && (
                                <div className="px-4 pb-3">
                                    <div className="border-t border-dashed border-gray-200 dark:border-gray-700/50 mb-3" />
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                                        {isAcc ? 'Agreed Terms' : 'Quote Received'}
                                    </p>
                                    <div className="flex items-stretch gap-2">
                                        {quotedPriceDisplay && (
                                            <div className={`flex-1 rounded-lg px-3 py-2 border ${isAcc ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-700/40' : 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-700/40'}`}>
                                                <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-0.5 flex items-center gap-1">
                                                    <DollarSign size={8} /> Price / unit
                                                </p>
                                                <p className={`text-sm font-extrabold tabular-nums ${isAcc ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                                    {quotedPriceDisplay}
                                                </p>
                                            </div>
                                        )}
                                        {leadTime && (
                                            <div className="flex-1 rounded-lg px-3 py-2 border bg-white/70 dark:bg-gray-800/40 border-gray-200/60 dark:border-gray-700/40">
                                                <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-0.5 flex items-center gap-1">
                                                    <Clock size={8} /> Lead Time
                                                </p>
                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{leadTime}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── SECTION 5: Progress timeline ────────────── */}
                            <div className="px-4 pb-3">
                                <div className="border-t border-dashed border-gray-200 dark:border-gray-700/50 mb-3" />
                                <div className="flex items-start">
                                    {QUOTE_PROGRESS_STEPS.map((step, i) => {
                                        const isCompleted = progressStep > i;
                                        const isCurrent = progressStep === i;
                                        return (
                                            <React.Fragment key={step.label}>
                                                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                                    <div
                                                        className="rounded-full transition-all duration-300 flex items-center justify-center"
                                                        style={{
                                                            width: isCurrent ? 14 : 9,
                                                            height: isCurrent ? 14 : 9,
                                                            backgroundColor: (isCompleted || isCurrent) ? theme.progressColor : '#e5e7eb',
                                                            boxShadow: isCurrent ? `0 0 0 3px white, 0 0 0 5px ${theme.progressColor}60` : 'none',
                                                        }}
                                                    >
                                                        {isCompleted && (
                                                            <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                                                                <path d="M1 3L2.5 4.5L5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span
                                                        className="text-[9px] font-semibold leading-none text-center"
                                                        style={{ color: (isCompleted || isCurrent) ? theme.progressColor : '#9ca3af' }}
                                                    >
                                                        {step.short}
                                                    </span>
                                                </div>
                                                {i < QUOTE_PROGRESS_STEPS.length - 1 && (
                                                    <div
                                                        className="flex-1 h-[2px] mx-1 rounded-full transition-all duration-500 mt-[5px]"
                                                        style={{
                                                            backgroundColor: progressStep > i ? theme.progressColor : '#e5e7eb',
                                                        }}
                                                    />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── SECTION 6: Footer ───────────────────────────── */}
                    <div className="mt-auto px-4 py-3 border-t border-white/60 dark:border-white/5 flex items-center justify-between gap-2">
                        {/* Status message */}
                        <div className="text-xs font-semibold flex items-center gap-1.5 min-w-0">
                            {isResponseAwaited(quote) ? (
                                <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                                    <Clock size={12} /> Awaiting response
                                </span>
                            ) : quote.status === 'Draft' ? (
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <FileText size={12} /> Resume Editing
                                </span>
                            ) : (quote.status === 'Responded' || isNewReply(quote)) && isUnread(quote) ? (
                                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                    <MessageSquare size={12} /> New response
                                </span>
                            ) : quote.status === 'Accepted' && isUnread(quote) ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle size={12} /> Accepted
                                </span>
                            ) : quote.status === 'Client Accepted' ? (
                                <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                                    <Check size={12} /> You Accepted
                                </span>
                            ) : quote.status === 'Admin Accepted' ? (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#c20c0b] text-white text-[11px] font-bold uppercase tracking-wide shadow-sm animate-pulse">
                                    <AlertCircle size={13} /> Action Required
                                </span>
                            ) : (
                                <span className="text-gray-400 dark:text-gray-500">View Details</span>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {quote.status === 'Draft' && (
                                <button
                                    onClick={(e) => handleDeleteDraft(e, quote.id)}
                                    disabled={!canEdit}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50/80 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={!canEdit ? 'View-only access' : 'Delete Draft'}
                                >
                                    <Trash2 size={15} />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setPreviewQuote(quote); }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-700/60 rounded-lg transition-colors"
                                title="Preview Details"
                            >
                                <Eye size={15} />
                            </button>
                            {quote.status !== 'Draft' && (
                                isUnreadCard ? (
                                    <button
                                        onClick={(e) => manualMarkAsRead(e, quote)}
                                        className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50/80 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="Mark as read"
                                    >
                                        <Mail size={15} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); markAsUnread(quote.id); }}
                                        className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                        title="Mark as unread"
                                    >
                                        <MailOpen size={15} />
                                    </button>
                                )
                            )}
                            {quote.status === 'Accepted' && crmOrdersByQuoteId?.[quote.id] && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetCurrentPage('crm', { orderId: crmOrdersByQuoteId![quote.id] });
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200/60 dark:border-emerald-700/40"
                                    title="View CRM Order"
                                >
                                    <ExternalLink size={13} />
                                    View Order
                                </button>
                            )}
                            {quote.status !== 'Draft' && (() => {
                                const chatUnread = (() => {
                                    try {
                                        const lastRead = localStorage.getItem(`chat_read_${quote.id}`) || '';
                                        return (quote.negotiation_details?.history || [])
                                            .filter((h: any) => h.sender === 'admin' && h.timestamp > lastRead).length;
                                    } catch { return 0; }
                                })();
                                return (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            localStorage.setItem('quote_detail_auto_open_chat', 'true');
                                            handleCardClick(quote);
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors relative ${chatUnread > 0 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                        title="Open Chat"
                                    >
                                        <MessageSquare size={13} />
                                        Chat
                                        {chatUnread > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                                                {chatUnread > 9 ? '9+' : chatUnread}
                                            </span>
                                        )}
                                    </button>
                                );
                            })()}
                            <div
                                className="h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm ml-0.5"
                                style={{
                                    backgroundColor: isHovered ? theme.progressColor : '#f3f4f6',
                                    color: isHovered ? 'white' : '#9ca3af',
                                }}
                            >
                                <ChevronRight size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const filterOptions = ['All', 'Drafts', 'Pending', 'Responded', 'In Negotiation', 'Accepted', 'Declined', 'Admin Accepted', 'Client Accepted'];

    return (
        <MainLayout {...layoutProps}>
            {/* Header */}
            <div className="mb-4 sm:mb-6">
                {/* Row 1: Title + New Quote button */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white truncate">My Quotes</h1>
                        <p className="text-gray-500 dark:text-gray-200 text-xs sm:text-sm mt-0.5 hidden sm:block">Track and manage your quotes with factories.</p>
                    </div>
                    <button onClick={handleRequestNewQuote} disabled={!canEdit} className="bg-[#c20c0b] text-white font-semibold py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#a50a09] transition shadow-md flex-shrink-0 text-sm disabled:opacity-50 disabled:cursor-not-allowed" title={!canEdit ? 'View-only access' : undefined}>
                        <Plus size={16} />
                        <span className="hidden sm:inline">Request New Quote</span>
                        <span className="sm:hidden">New</span>
                    </button>
                </div>
                {/* Row 2: Action buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={onRefresh}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors flex-shrink-0 ${isLoading ? 'animate-spin' : ''}`}
                        title="Refresh"
                    >
                        <RefreshCw size={17} />
                    </button>
                    <button
                        onClick={toggleSelectMode}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 ${isSelectMode ? 'text-[#c20c0b] bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400'}`}
                        title={isSelectMode ? 'Exit Selection Mode' : 'Select Quotes'}
                    >
                        <CheckSquare size={17} />
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-200/70 dark:border-blue-700/50 transition-colors flex-shrink-0"
                            title="Mark all as read"
                        >
                            <CheckCheck size={13} />
                            <span className="hidden sm:inline">Mark all read</span>
                            <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">{unreadCount}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar — horizontally scrollable on mobile */}
            <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                {/* Search Filter */}
                <div className="relative flex-shrink-0">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                        <Search size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-sm font-semibold text-gray-800 dark:text-white focus:ring-0 outline-none w-28 sm:w-40 placeholder-gray-400"
                        />
                    </div>
                </div>

                {/* Status Filter */}
                <div className="relative flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                        <Filter size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none bg-transparent border-none text-sm font-semibold text-gray-800 dark:text-white focus:ring-0 cursor-pointer pr-4 outline-none max-w-[100px] sm:max-w-none"
                            style={{ backgroundImage: 'none' }}
                        >
                            {filterOptions.map(status => (
                                <option key={status} value={status} className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">{status}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="text-gray-400 pointer-events-none flex-shrink-0" />
                    </div>
                </div>

                {/* Date Filter */}
                <div className="relative flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                        <Calendar size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <select
                            value={dateFilter}
                            onChange={(e) => {
                                if (e.target.value === 'Custom Range') {
                                    setIsDateModalOpen(true);
                                } else {
                                    setDateFilter(e.target.value);
                                }
                            }}
                            className="appearance-none bg-transparent border-none text-sm font-semibold text-gray-800 dark:text-white focus:ring-0 cursor-pointer pr-4 outline-none max-w-[90px] sm:max-w-none"
                            style={{ backgroundImage: 'none' }}
                        >
                            <option className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">All Time</option>
                            <option className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">Today</option>
                            <option className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">Yesterday</option>
                            <option className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">Last 7 Days</option>
                            <option className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">Last 30 Days</option>
                            <option className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">Custom Range</option>
                        </select>
                        <ChevronDown size={12} className="text-gray-400 pointer-events-none flex-shrink-0" />
                    </div>
                </div>

                {/* Custom Range Indicator */}
                {dateFilter === 'Custom Range' && (
                    <button
                        onClick={() => setIsDateModalOpen(true)}
                        className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-[#c20c0b] dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
                    >
                        {customStartDate ? new Date(customStartDate).toLocaleDateString() : 'Start'} – {customEndDate ? new Date(customEndDate).toLocaleDateString() : 'End'}
                    </button>
                )}
            </div>

            {/* Color Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 sm:mb-5 px-0.5">
                {[
                    { label: 'Draft',              color: '#9ca3af', desc: 'unsaved' },
                    { label: 'Pending',            color: '#f59e0b', desc: 'awaiting factory' },
                    { label: 'Responded',          color: '#3b82f6', desc: 'quote received' },
                    { label: 'In Negotiation',     color: '#8b5cf6', desc: 'active chat' },
                    { label: 'You Accepted',       color: '#06b6d4', desc: 'pending admin' },
                    { label: 'Admin Acc. — Act!',  color: '#14b8a6', desc: 'your action needed' },
                    { label: 'Accepted',           color: '#10b981', desc: 'finalized' },
                    { label: 'Declined',           color: '#ef4444', desc: 'rejected' },
                ].map(({ label, color }) => (
                    <span key={label} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{label}</span>
                    </span>
                ))}
            </div>

            {/* Bulk Action Bar */}
            {isSelectMode && filteredQuotes.length > 0 && (
                <div className="sticky top-14 md:top-0 z-20 flex justify-between items-center mb-4 bg-white/80 backdrop-blur-md dark:bg-gray-900/40 p-3 rounded-xl border border-gray-200 dark:border-white/10 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selectedIds.length === filteredQuotes.length && filteredQuotes.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded text-[#c20c0b] focus:ring-[#c20c0b] h-4 w-4 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-white">Select All ({filteredQuotes.length})</span>
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-300 mr-1">{selectedIds.length} selected</span>
                            <button
                                onClick={bulkMarkAsRead}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                                <Mail size={14} /> Mark as Read
                            </button>
                            <button
                                onClick={bulkMarkAsUnread}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 text-sm font-medium rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                                <MailOpen size={14} /> Mark as Unread
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Undo Banner */}
            {undoState && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-fade-in">
                    <Mail size={15} className="text-blue-400" />
                    <span className="text-sm">Marked <span className="font-semibold">{undoState.label}</span> as read</span>
                    <button onClick={handleUndoMarkAsRead} className="ml-2 text-blue-400 text-sm font-bold hover:text-blue-300 transition-colors">Undo</button>
                </div>
            )}

            {/* Quotes Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-64 animate-pulse"></div>
                    ))}
                </div>
            ) : filteredQuotes.length > 0 ? (
                filterStatus === 'All' && (unreadQuotes.length > 0 || needsAttentionQuotes.length > 0) ? (
                    <div className="space-y-8">
                        {unreadQuotes.length > 0 && (
                            <div>
                                <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                                    Unread
                                    <span className="ml-1 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{unreadQuotes.length}</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                    {unreadQuotes.map((quote, index) => renderCard(quote, index))}
                                </div>
                            </div>
                        )}
                        {needsAttentionQuotes.length > 0 && (
                            <div>
                                <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                                    <AlertCircle className="text-amber-500" size={20} />
                                    Needs Attention
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                    {needsAttentionQuotes.map((quote, index) => renderCard(quote, index))}
                                </div>
                            </div>
                        )}
                        {regularQuotes.length > 0 && (
                            <div>
                                <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">All Quotes</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                    {regularQuotes.map((quote, index) => renderCard(quote, index))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                        {filteredQuotes.map((quote, index) => renderCard(quote, index))}
                    </div>
                )
            ) : (
                <EmptyState
                    filterStatus={filterStatus}
                    searchTerm={searchTerm}
                    onClearFilter={() => { setFilterStatus('All'); setSearchTerm(''); }}
                    onRequestQuote={handleRequestNewQuote}
                />
            )}

            {/* Date Range Modal */}
            {isDateModalOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Date Range</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                <input 
                                    type="date" 
                                    value={customStartDate} 
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    max={todayString}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                <input 
                                    type="date" 
                                    value={customEndDate} 
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    max={todayString}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsDateModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            <button onClick={() => {
                                setDateFilter('Custom Range');
                                setIsDateModalOpen(false);
                            }} className="px-4 py-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] transition-colors">Apply</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quote Preview Modal */}
            {previewQuote && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setPreviewQuote(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quote #{previewQuote.id.slice(0, 8)}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{previewQuote.factory?.name || 'Factory Request'}</p>
                            </div>
                            <button onClick={() => setPreviewQuote(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Order Summary */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Order Summary</h3>
                                <div className="space-y-3">
                                    {previewQuote.order?.lineItems?.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-gray-900 dark:text-white">{item.category}</span>
                                                <span className="font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-600">
                                                    {item.quantityType === 'container' ? item.containerType : `${item.qty} units`}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                                                <div>
                                                    <span className="block text-[10px] uppercase text-gray-400 mb-0.5">Fabric</span>
                                                    {item.fabricQuality}
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] uppercase text-gray-400 mb-0.5">Style</span>
                                                    {item.styleOption || 'N/A'}
                                                </div>
                                                {item.printOption && <div>
                                                    <span className="block text-[10px] uppercase text-gray-400 mb-0.5">Print</span>
                                                    {item.printOption}
                                                </div>}
                                                <div>
                                                    <span className="block text-[10px] uppercase text-gray-400 mb-0.5">Target Price</span>
                                                    ${item.targetPrice}
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] uppercase text-gray-400 mb-0.5">Size Range</span>
                                                    {item.sizeRange.join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                            <button onClick={() => setPreviewQuote(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium">Close</button>
                            <button onClick={() => { setPreviewQuote(null); handleCardClick(previewQuote); }} className="px-4 py-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] transition-colors font-medium flex items-center gap-2">
                                View Full Details <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </MainLayout>
    );
};