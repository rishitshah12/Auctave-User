import React, { FC, useState } from 'react';
import ReactDOM from 'react-dom';
import {
    Bell, X, CheckCheck, Trash2, Tag, List, Package, Settings,
    ArrowRight, FileQuestion
} from 'lucide-react';
import { useNotifications, AppNotification, NotificationCategory } from './NotificationContext';

// ── Category config ──────────────────────────────────────────────────────────
const categoryConfig: Record<NotificationCategory, {
    label: string;
    color: string;
    bgColor: string;
    dotColor: string;
    icon: React.ReactNode;
}> = {
    rfq: {
        label: 'RFQ',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30',
        dotColor: 'bg-blue-500',
        icon: <FileQuestion size={14} />,
    },
    crm: {
        label: 'CRM',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/30',
        dotColor: 'bg-purple-500',
        icon: <List size={14} />,
    },
    order: {
        label: 'Order',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
        dotColor: 'bg-emerald-500',
        icon: <Package size={14} />,
    },
    system: {
        label: 'System',
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        dotColor: 'bg-gray-400',
        icon: <Settings size={14} />,
    },
};

// ── Time formatter ────────────────────────────────────────────────────────────
function timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Status label map for RFQ ─────────────────────────────────────────────────
const rfqStatusStyle: Record<string, string> = {
    'Responded': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'In Negotiation': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    'Admin Accepted': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'Client Accepted': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'Declined': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: string, data?: any) => void;
}

// ── Main panel component ──────────────────────────────────────────────────────
export const NotificationPanel: FC<NotificationPanelProps> = ({ isOpen, onClose, onNavigate }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
    const [activeFilter, setActiveFilter] = useState<'all' | NotificationCategory>('all');

    const filtered = activeFilter === 'all'
        ? notifications
        : notifications.filter(n => n.category === activeFilter);

    const handleClick = (notif: AppNotification) => {
        markAsRead(notif.id);
        if (notif.action) {
            onNavigate(notif.action.page, notif.action.data);
        }
        onClose();
    };

    // Count unread per category for filter badges
    const unreadByCategory = (cat: NotificationCategory) =>
        notifications.filter(n => n.category === cat && !n.isRead).length;

    const filterTabs: Array<{ key: 'all' | NotificationCategory; label: string; count: number }> = [
        { key: 'all', label: 'All', count: unreadCount },
        { key: 'rfq', label: 'RFQ', count: unreadByCategory('rfq') },
        { key: 'crm', label: 'CRM', count: unreadByCategory('crm') },
        { key: 'order', label: 'Orders', count: unreadByCategory('order') },
        { key: 'system', label: 'System', count: unreadByCategory('system') },
    ];

    // Render via portal to escape the sidebar's backdrop-filter stacking context,
    // which would otherwise trap fixed-position children inside the sidebar bounds.
    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
                    onClick={onClose}
                />
            )}

            {/* Slide-over panel */}
            <div
                className={`fixed top-0 right-0 h-full w-[400px] max-w-[96vw] bg-white dark:bg-gray-950 shadow-2xl z-[70] flex flex-col border-l border-gray-200 dark:border-white/10 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-gray-950 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                                <Bell size={18} className="text-[var(--color-primary)]" />
                            </div>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 bg-[var(--color-primary)] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight">Notifications</h2>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                title="Mark all as read"
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                <CheckCheck size={16} />
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                title="Clear all"
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            >
                                <Trash2 size={15} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <X size={18} className="text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* ── Filter tabs ── */}
                <div className="flex gap-1 px-4 py-2.5 border-b border-gray-100 dark:border-white/10 overflow-x-auto scrollbar-hide flex-shrink-0">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === tab.key
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeFilter === tab.key
                                    ? 'bg-white/25 text-white'
                                    : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Notification list ── */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <EmptyState activeFilter={activeFilter} />
                    ) : (
                        <div className="py-1">
                            {filtered.map((notif, idx) => (
                                <NotificationItem
                                    key={notif.id}
                                    notif={notif}
                                    isLast={idx === filtered.length - 1}
                                    onClick={() => handleClick(notif)}
                                    onRemove={e => { e.stopPropagation(); removeNotification(notif.id); }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                    <button
                        onClick={() => { onNavigate('myQuotes'); onClose(); }}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-colors"
                    >
                        View all activity <ArrowRight size={13} />
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};

// ── Individual notification item ──────────────────────────────────────────────
const NotificationItem: FC<{
    notif: AppNotification;
    isLast: boolean;
    onClick: () => void;
    onRemove: (e: React.MouseEvent) => void;
}> = ({ notif, isLast, onClick, onRemove }) => {
    const cfg = categoryConfig[notif.category];

    return (
        <div
            onClick={onClick}
            className={`relative flex gap-3 px-4 py-3.5 cursor-pointer transition-colors group hover:bg-gray-50 dark:hover:bg-white/[0.04] ${!notif.isRead ? 'bg-blue-50/40 dark:bg-blue-900/[0.08]' : ''} ${!isLast ? 'border-b border-gray-50 dark:border-white/[0.04]' : ''}`}
        >
            {/* Unread indicator dot */}
            {!notif.isRead && (
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
            )}

            {/* Left avatar: factory image or category icon */}
            <div className="relative mt-0.5 flex-shrink-0">
                {notif.imageUrl ? (
                    <>
                        <img
                            src={notif.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover shadow-sm"
                        />
                        {/* Small category badge overlaid on the image */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${cfg.bgColor} ${cfg.color} flex items-center justify-center border-2 border-white dark:border-gray-950`}>
                            {cfg.icon}
                        </div>
                    </>
                ) : (
                    <div className={`w-10 h-10 rounded-xl ${cfg.bgColor} flex items-center justify-center ${cfg.color} transition-transform group-hover:scale-105`}>
                        <span className="scale-125">{cfg.icon}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-5">
                <div className="flex items-start justify-between gap-1.5 mb-0.5">
                    <p className={`text-sm font-semibold leading-snug ${notif.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {notif.title}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0 mt-0.5">
                        {timeAgo(notif.timestamp)}
                    </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                    {notif.message}
                </p>
                {/* Bottom row: meta pill + optional view link */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {notif.meta && (
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color}`}>
                            {notif.meta}
                        </span>
                    )}
                    {notif.action && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--color-primary)] font-semibold">
                            {notif.meta ? 'View' : 'Tap to view'} <ArrowRight size={9} />
                        </span>
                    )}
                </div>
            </div>

            {/* Remove button */}
            <button
                onClick={onRemove}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                title="Dismiss"
            >
                <X size={11} className="text-gray-400" />
            </button>
        </div>
    );
};

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState: FC<{ activeFilter: 'all' | NotificationCategory }> = ({ activeFilter }) => {
    const messages: Record<typeof activeFilter, { title: string; sub: string }> = {
        all: { title: "You're all caught up!", sub: 'New updates will appear here.' },
        rfq: { title: 'No RFQ updates', sub: 'Quote status changes will show here.' },
        crm: { title: 'No CRM updates', sub: 'Order and task changes will show here.' },
        order: { title: 'No order activity', sub: 'Submitted orders will appear here.' },
        system: { title: 'No system alerts', sub: 'System messages will appear here.' },
    };
    const msg = messages[activeFilter];

    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
                <Bell size={22} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{msg.title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px]">{msg.sub}</p>
        </div>
    );
};

// ── Bell button (to embed in sidebar) ────────────────────────────────────────
export const NotificationBellButton: FC<{
    onClick: () => void;
    isSidebarCollapsed: boolean;
}> = ({ onClick, isSidebarCollapsed }) => {
    const { unreadCount } = useNotifications();

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-md font-medium flex items-center transition duration-150 ease-in-out hover:bg-gray-200 dark:hover:bg-gray-700 relative ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Notifications' : ''}
        >
            <div className={`relative flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-[var(--color-primary)] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </div>
            {!isSidebarCollapsed && (
                <span className="flex-1">Notifications</span>
            )}
            {!isSidebarCollapsed && unreadCount > 0 && (
                <span className="ml-auto flex-shrink-0 px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold rounded-full">
                    {unreadCount}
                </span>
            )}
        </button>
    );
};
