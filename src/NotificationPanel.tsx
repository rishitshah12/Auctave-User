import React, { FC, useState } from 'react';
import ReactDOM from 'react-dom';
import {
    Bell, X, CheckCheck, Trash2, Package, Settings,
    ArrowRight, FileQuestion, MessageSquare, Truck,
    ShieldCheck, FileText, DollarSign, ClipboardList,
    ThumbsUp, List, BellOff,
} from 'lucide-react';
import { useNotifications, AppNotification, NotificationCategory } from './NotificationContext';
import { notificationService } from './notificationService';

// ─── Category config ──────────────────────────────────────────────────────────

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
    shipment: {
        label: 'Shipment',
        color: 'text-cyan-600 dark:text-cyan-400',
        bgColor: 'bg-cyan-50 dark:bg-cyan-900/30',
        dotColor: 'bg-cyan-500',
        icon: <Truck size={14} />,
    },
    chat: {
        label: 'Chat',
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-50 dark:bg-pink-900/30',
        dotColor: 'bg-pink-500',
        icon: <MessageSquare size={14} />,
    },
    qc: {
        label: 'QC',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/30',
        dotColor: 'bg-amber-500',
        icon: <ShieldCheck size={14} />,
    },
    invoice: {
        label: 'Invoice',
        color: 'text-indigo-600 dark:text-indigo-400',
        bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
        dotColor: 'bg-indigo-500',
        icon: <FileText size={14} />,
    },
    payment: {
        label: 'Payment',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/30',
        dotColor: 'bg-green-500',
        icon: <DollarSign size={14} />,
    },
    task: {
        label: 'Task',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/30',
        dotColor: 'bg-orange-500',
        icon: <ClipboardList size={14} />,
    },
    approval: {
        label: 'Approval',
        color: 'text-teal-600 dark:text-teal-400',
        bgColor: 'bg-teal-50 dark:bg-teal-900/30',
        dotColor: 'bg-teal-500',
        icon: <ThumbsUp size={14} />,
    },
    system: {
        label: 'System',
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        dotColor: 'bg-gray-400',
        icon: <Settings size={14} />,
    },
};

// ─── Filter groups ────────────────────────────────────────────────────────────
// Panel shows top-level groups; each group can aggregate multiple categories.

type FilterKey = 'all' | NotificationCategory;

const filterTabs: Array<{ key: FilterKey; label: string; categories: NotificationCategory[] }> = [
    { key: 'all',      label: 'All',      categories: [] },
    { key: 'order',    label: 'Orders',   categories: ['order', 'crm'] },
    { key: 'shipment', label: 'Shipment', categories: ['shipment'] },
    { key: 'chat',     label: 'Chat',     categories: ['chat'] },
    { key: 'task',     label: 'Tasks',    categories: ['task', 'approval'] },
    { key: 'qc',       label: 'QC',       categories: ['qc'] },
    { key: 'invoice',  label: 'Finance',  categories: ['invoice', 'payment'] },
    { key: 'rfq',      label: 'RFQ',      categories: ['rfq'] },
    { key: 'system',   label: 'System',   categories: ['system'] },
];

// ─── Time formatter ────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: string, data?: any) => void;
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export const NotificationPanel: FC<NotificationPanelProps> = ({ isOpen, onClose, onNavigate }) => {
    const { notifications, unreadCount, markAllAsRead, removeNotification, clearAll, markAsRead, requestPushPermission } = useNotifications();
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

    const activeCats = filterTabs.find(t => t.key === activeFilter)?.categories ?? [];
    const filtered = activeFilter === 'all'
        ? notifications
        : notifications.filter(n => activeCats.includes(n.category));

    const unreadForFilter = (tab: typeof filterTabs[number]) =>
        tab.key === 'all'
            ? unreadCount
            : notifications.filter(n => tab.categories.includes(n.category) && !n.isRead).length;

    const handleClick = (notif: AppNotification) => {
        markAsRead(notif.id);
        if (notif.action) onNavigate(notif.action.page, notif.action.data);
        onClose();
    };

    const handleEnablePush = async () => {
        const perm = await requestPushPermission();
        if (perm === 'granted') {
            // Browser notifications are now enabled — the service fires them automatically
        }
    };

    const pushBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';
    const pushAvailable = typeof Notification !== 'undefined' && Notification.permission === 'default';

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
                className={`fixed top-0 right-0 h-full w-[420px] max-w-[96vw] bg-white dark:bg-gray-950 shadow-2xl z-[70] flex flex-col border-l border-gray-200 dark:border-white/10 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
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

                {/* ── Push permission nudge ── */}
                {pushAvailable && (
                    <div className="mx-4 mt-3 flex items-center gap-3 px-3 py-2.5 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl">
                        <Bell size={15} className="text-[var(--color-primary)] flex-shrink-0" />
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex-1 leading-snug">
                            Enable desktop alerts to stay notified even when the app isn't open.
                        </p>
                        <button
                            onClick={handleEnablePush}
                            className="text-[11px] font-bold text-[var(--color-primary)] whitespace-nowrap hover:underline"
                        >
                            Enable
                        </button>
                    </div>
                )}
                {pushBlocked && (
                    <div className="mx-4 mt-3 flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                        <BellOff size={15} className="text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                            Desktop notifications are blocked. Enable them in your browser settings.
                        </p>
                    </div>
                )}

                {/* ── Filter tabs ── */}
                <div className="flex gap-1 px-4 py-2.5 border-b border-gray-100 dark:border-white/10 overflow-x-auto scrollbar-hide flex-shrink-0">
                    {filterTabs.map(tab => {
                        const count = unreadForFilter(tab);
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === tab.key
                                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                    }`}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeFilter === tab.key
                                        ? 'bg-white/25 text-white'
                                        : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Notification list ── */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <EmptyState filterKey={activeFilter} />
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
                <div className="px-4 py-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 flex flex-col gap-1">
                    <button
                        onClick={() => { onNavigate('myQuotes'); onClose(); }}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-colors"
                    >
                        View all activity <ArrowRight size={13} />
                    </button>
                    <TestNotificationButton />
                </div>
            </div>
        </>,
        document.body,
    );
};

// ─── Individual notification item ─────────────────────────────────────────────

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
            {/* Unread indicator */}
            {!notif.isRead && (
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
            )}

            {/* Avatar */}
            <div className="relative mt-0.5 flex-shrink-0">
                {notif.imageUrl ? (
                    <>
                        <img
                            src={notif.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover shadow-sm"
                        />
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
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {/* Category pill */}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                    </span>
                    {notif.meta && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                            {notif.meta}
                        </span>
                    )}
                    {notif.action && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--color-primary)] font-semibold">
                            Tap to view <ArrowRight size={9} />
                        </span>
                    )}
                </div>
            </div>

            {/* Dismiss */}
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

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState: FC<{ filterKey: FilterKey }> = ({ filterKey }) => {
    const messages: Partial<Record<FilterKey, { title: string; sub: string }>> = {
        all:      { title: "You're all caught up!", sub: 'New updates will appear here.' },
        order:    { title: 'No order activity', sub: 'Order and production updates appear here.' },
        shipment: { title: 'No shipment updates', sub: 'Dispatch and delivery alerts appear here.' },
        chat:     { title: 'No new messages', sub: 'Chat and message notifications appear here.' },
        task:     { title: 'No task activity', sub: 'Task assignments and approvals appear here.' },
        qc:       { title: 'No QC alerts', sub: 'Quality check results appear here.' },
        invoice:  { title: 'No financial activity', sub: 'Invoice and payment alerts appear here.' },
        rfq:      { title: 'No RFQ updates', sub: 'Quote status changes will show here.' },
        system:   { title: 'No system alerts', sub: 'System messages will appear here.' },
    };
    const msg = messages[filterKey] ?? { title: 'No notifications', sub: 'Updates will appear here.' };

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

// ─── Test notification button (dev helper) ────────────────────────────────────

const TEST_SAMPLES: Array<Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>> = [
    { category: 'rfq',      title: 'Quote Updated',            message: 'Your quote with Apex Textiles is now "Quoted".', meta: 'RFQ #001', action: { page: 'myQuotes' } },
    { category: 'order',    title: 'Quote Request Submitted',  message: "Your quote request has been sent. You'll be notified when factories respond." },
    { category: 'crm',      title: 'Order Status Updated',     message: 'Your order "Summer Collection 2026" is now "In Production".', meta: 'Order #042', action: { page: 'crm' } },
    { category: 'task',     title: 'New Task Added',           message: '"Fabric Approval" has been added to "Winter Basics".', action: { page: 'crm' } },
    { category: 'chat',     title: 'New Message from Factory', message: 'We have sent the samples as requested. Please confirm receipt.', meta: 'Apex Textiles' },
    { category: 'shipment', title: 'Shipment Dispatched',      message: 'Order #042 has been dispatched. Estimated delivery: 5 days.', meta: 'ETA 5 days' },
    { category: 'qc',       title: 'QC Report Available',      message: 'Quality check for Batch B-17 passed with 98% pass rate.', meta: 'Batch B-17' },
    { category: 'invoice',  title: 'Invoice Uploaded',         message: 'Invoice #INV-2026-88 for $12,400 is ready for review.', meta: 'INV-2026-88' },
    { category: 'payment',  title: 'Payment Received',         message: 'Payment of $8,500 received for Order #038.', meta: '$8,500' },
    { category: 'approval', title: 'Milestone Confirmed',      message: 'You confirmed "Fabric Delivery" on "Summer Collection 2026".', action: { page: 'crm' } },
    { category: 'system',   title: 'System Update',            message: 'The platform has been updated with new features. Check out what\'s new!' },
];

let testIdx = 0;

const TestNotificationButton: FC = () => {
    const { addNotification } = useNotifications();
    const [fired, setFired] = useState(false);

    const handleTest = () => {
        const sample = TEST_SAMPLES[testIdx % TEST_SAMPLES.length];
        testIdx++;
        addNotification(sample);
        setFired(true);
        setTimeout(() => setFired(false), 1500);
    };

    return (
        <button
            onClick={handleTest}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors border border-dashed border-gray-200 dark:border-white/10"
        >
            <Bell size={11} />
            {fired ? 'Sent!' : `Send test notification (${TEST_SAMPLES[testIdx % TEST_SAMPLES.length]?.category ?? 'rfq'})`}
        </button>
    );
};

// ─── Bell button (for sidebar) ────────────────────────────────────────────────

export const NotificationBellButton: FC<{
    onClick: () => void;
    isSidebarCollapsed: boolean;
}> = ({ onClick }) => {
    const { unreadCount } = useNotifications();

    return (
        <button
            onClick={onClick}
            className="relative w-full flex flex-col items-center gap-[5px] py-[9px] px-1 rounded-xl hover:bg-white/[0.12] transition-all duration-150 group"
        >
            <span className="relative flex-shrink-0 text-white/80 group-hover:text-white transition-colors duration-150">
                <Bell className="h-[22px] w-[22px]" />
                {unreadCount > 0 && (
                    <span className="absolute -top-[5px] -right-[5px] h-[14px] min-w-[14px] px-0.5 bg-white text-rose-600 text-[7.5px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </span>
            <span className="text-[10px] font-bold text-white/75 group-hover:text-white transition-colors leading-tight">
                Alerts
            </span>
        </button>
    );
};
