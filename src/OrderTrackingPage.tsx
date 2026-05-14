import React, { useState, useEffect, useCallback, FC } from 'react';
import {
    ClipboardCheck, Cog, ShieldCheck, Ship, PackageCheck,
    ExternalLink, RefreshCw, AlertCircle, ChevronDown,
    Hash, Calendar, Clock, CheckCircle2, Loader2, MapPin,
    Container, Info,
} from 'lucide-react';
import { MainLayout } from './MainLayout';
import { supabase } from './supabaseClient';
import { CrmOrder } from './types';

// ─── Stage definitions ────────────────────────────────────────────────────────

type OrderStatus = 'Pending' | 'In Production' | 'Quality Check' | 'Shipped' | 'Completed';

const STAGES: { key: OrderStatus; label: string; sublabel: string; Icon: FC<any> }[] = [
    { key: 'Pending',       label: 'Order Confirmed',  sublabel: 'Received & confirmed',       Icon: ClipboardCheck },
    { key: 'In Production', label: 'In Production',    sublabel: 'Being manufactured',         Icon: Cog           },
    { key: 'Quality Check', label: 'Quality Check',    sublabel: 'Inspection in progress',     Icon: ShieldCheck   },
    { key: 'Shipped',       label: 'Shipped',          sublabel: 'In transit to destination',  Icon: Ship          },
    { key: 'Completed',     label: 'Delivered',        sublabel: 'Order complete',              Icon: PackageCheck  },
];

const STATUS_RANK: Record<OrderStatus, number> = {
    'Pending': 0, 'In Production': 1, 'Quality Check': 2, 'Shipped': 3, 'Completed': 4,
};

// ─── Carrier URL builders ─────────────────────────────────────────────────────

const CARRIERS: { name: string; url: (ref: string) => string }[] = [
    { name: 'Maersk',      url: r => `https://www.maersk.com/tracking/${r}` },
    { name: 'MSC',         url: r => `https://www.msc.com/en/tracking/${r}` },
    { name: 'CMA CGM',     url: r => `https://www.cma-cgm.com/ebusiness/tracking/search?Reference=${r}` },
    { name: 'Hapag-Lloyd', url: r => `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${r}` },
    { name: 'Evergreen',   url: r => `https://www.evergreen-line.com/static/jsp/tracking.jsp?cn=${r}` },
    { name: 'Cosco',       url: r => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BOOKING&number=${r}` },
    { name: 'Yang Ming',   url: r => `https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?number=${r}` },
    { name: 'ONE',         url: r => `https://www.one-line.com/en/tools/cargo-tracking?trkType=cntr&number=${r}` },
];

function getCarrierUrl(carrier?: string, tracking?: string, container?: string): string | null {
    const ref = tracking || container;
    if (!ref) return null;
    const match = CARRIERS.find(c => c.name.toLowerCase() === (carrier ?? '').toLowerCase());
    return match ? match.url(ref) : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
}

function shortId(id: string): string {
    return '#' + id.slice(0, 8).toUpperCase();
}

function mapRawOrder(raw: any): CrmOrder & { id: string } {
    return {
        ...raw,
        id: raw.id,
        customer:         raw.customer ?? raw.client_name ?? '',
        product:          raw.product_name ?? raw.product ?? '',
        factoryId:        raw.factory_id ?? '',
        status:           raw.status,
        createdAt:        raw.created_at,
        deliveryDate:     raw.delivery_date,
        shippingPort:     raw.shipping_port,
        portOfDischarge:  raw.port_of_discharge,
        trackingNumber:   raw.tracking_number,
        containerNumber:  raw.container_number,
        shippingCarrier:  raw.shipping_carrier,
        estimatedDelivery: raw.estimated_delivery,
        statusChangedAt:  raw.status_changed_at ?? {},
        documents:        raw.documents ?? [],
        tasks:            raw.tasks ?? [],
    };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    'Completed':     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Shipped':       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Quality Check': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'In Production': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Pending':       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const StatusBadge: FC<{ status?: string }> = ({ status = 'Pending' }) => (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? STATUS_STYLES['Pending']}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'Shipped' || status === 'In Production' ? 'animate-pulse' : ''} ${
            status === 'Completed' ? 'bg-green-500' : status === 'Shipped' ? 'bg-blue-500' :
            status === 'Quality Check' ? 'bg-yellow-500' : status === 'In Production' ? 'bg-purple-500' : 'bg-gray-400'
        }`} />
        {status}
    </span>
);

// ─── Vertical timeline ────────────────────────────────────────────────────────

const VerticalTimeline: FC<{ order: CrmOrder & { id: string } }> = ({ order }) => {
    const currentRank = STATUS_RANK[order.status as OrderStatus] ?? 0;

    return (
        <div>
            {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentRank;
                const isActive    = idx === currentRank;
                const isLast      = idx === STAGES.length - 1;
                const timestamp   = order.statusChangedAt?.[stage.key];

                return (
                    <div key={stage.key} className="flex gap-3">
                        {/* Left column: dot + connector */}
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isCompleted ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' :
                                isActive    ? 'bg-white dark:bg-gray-900 border-[var(--color-primary)]' :
                                              'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-white/10'
                            }`}>
                                {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                ) : (
                                    <stage.Icon className={`w-4 h-4 ${
                                        isActive ? 'text-[var(--color-primary)]' : 'text-gray-300 dark:text-gray-600'
                                    }`} />
                                )}
                                {isActive && (
                                    <span className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)] animate-ping opacity-30" />
                                )}
                            </div>
                            {!isLast && (
                                <div className={`w-0.5 flex-1 min-h-[28px] transition-colors duration-500 ${
                                    isCompleted ? 'bg-[var(--color-primary)]' : 'bg-gray-200 dark:bg-white/10'
                                }`} />
                            )}
                        </div>

                        {/* Right column: text */}
                        <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'} pt-1`}>
                            <div className="flex items-center justify-between gap-2">
                                <p className={`font-semibold text-sm leading-tight ${
                                    isCompleted || isActive
                                        ? 'text-gray-800 dark:text-white'
                                        : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                    {stage.label}
                                </p>
                                {isCompleted && timestamp && (
                                    <span className="text-[11px] text-green-600 dark:text-green-400 flex-shrink-0">
                                        {formatDate(timestamp)}
                                    </span>
                                )}
                                {isActive && (
                                    <span className="text-[11px] font-semibold text-[var(--color-primary)] flex-shrink-0">
                                        In progress
                                    </span>
                                )}
                            </div>
                            <p className={`text-xs mt-0.5 ${
                                isCompleted ? 'text-gray-400 dark:text-gray-500' :
                                isActive    ? 'text-gray-500 dark:text-gray-400' :
                                              'text-gray-300 dark:text-gray-600'
                            }`}>
                                {stage.sublabel}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Shipping details card ────────────────────────────────────────────────────

const ShippingCard: FC<{ order: CrmOrder & { id: string } }> = ({ order }) => {
    const carrierUrl = getCarrierUrl(order.shippingCarrier, order.trackingNumber, order.containerNumber);
    const hasInfo    = order.trackingNumber || order.containerNumber || order.shippingCarrier;

    if (!hasInfo) {
        return (
            <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <Info className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed">
                    Tracking details will appear here once provided by the logistics team.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-4 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-900/20 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-blue-200/60 dark:border-blue-800/40 bg-blue-100/40 dark:bg-blue-900/30">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Shipment Details</p>
            </div>
            <div className="p-4 space-y-3">
                {order.shippingCarrier && (
                    <div className="flex items-center gap-3">
                        <Ship className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Carrier</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{order.shippingCarrier}</p>
                        </div>
                    </div>
                )}
                {order.trackingNumber && (
                    <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tracking No.</p>
                            <p className="text-sm font-mono font-semibold text-gray-800 dark:text-white tracking-wide">{order.trackingNumber}</p>
                        </div>
                    </div>
                )}
                {order.containerNumber && (
                    <div className="flex items-center gap-3">
                        <Container className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Container No.</p>
                            <p className="text-sm font-mono font-semibold text-gray-800 dark:text-white tracking-wide">{order.containerNumber}</p>
                        </div>
                    </div>
                )}
                {order.estimatedDelivery && (
                    <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Est. Delivery</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{formatDate(order.estimatedDelivery)}</p>
                        </div>
                    </div>
                )}
                {carrierUrl && (
                    <a
                        href={carrierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors"
                    >
                        Track on {order.shippingCarrier} Website
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>
        </div>
    );
};

// ─── Individual order tracking card ──────────────────────────────────────────

const OrderTrackingCard: FC<{
    order: CrmOrder & { id: string };
    isExpanded: boolean;
    onToggle: () => void;
}> = ({ order, isExpanded, onToggle }) => {
    const rank = STATUS_RANK[order.status as OrderStatus] ?? 0;
    const pct  = Math.round((rank / (STAGES.length - 1)) * 100);
    const showShipping = order.status === 'Shipped' || order.status === 'Completed';

    return (
        <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
            isExpanded
                ? 'border-[var(--color-primary)]/40 shadow-lg shadow-red-100/50 dark:shadow-red-900/10'
                : 'border-gray-200 dark:border-white/10'
        } bg-white/80 backdrop-blur-sm dark:bg-gray-900/50`}>

            {/* ── Card header (always visible, tappable) ── */}
            <button
                onClick={onToggle}
                className="w-full text-left p-4 sm:p-5 focus:outline-none"
                aria-expanded={isExpanded}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {/* Order ID + status badge row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-mono text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                                {shortId(order.id)}
                            </span>
                            <StatusBadge status={order.status} />
                        </div>

                        {/* Product name */}
                        <p className="font-bold text-base text-gray-800 dark:text-white leading-snug truncate">
                            {order.product || 'Order'}
                        </p>

                        {/* Meta line */}
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {order.customer && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px]">
                                    {order.customer}
                                </span>
                            )}
                            {order.createdAt && (
                                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                    <Calendar className="w-3 h-3 flex-shrink-0" />
                                    {formatDate(order.createdAt)}
                                </span>
                            )}
                            {order.shippingPort && (
                                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    {order.shippingPort}
                                    {order.portOfDischarge ? ` → ${order.portOfDischarge}` : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Expand chevron */}
                    <div className={`flex-shrink-0 mt-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        isExpanded ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-white/10'
                    }`}>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${
                            isExpanded ? 'rotate-180 text-[var(--color-primary)]' : 'text-gray-400'
                        }`} />
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {STAGES[rank].label}
                        </span>
                        <span className={`text-xs font-bold ${pct === 100 ? 'text-green-600 dark:text-green-400' : 'text-[var(--color-primary)]'}`}>
                            {pct}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                                pct === 100 ? 'bg-green-500' : 'bg-[var(--color-primary)]'
                            }`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    {/* Stage dots */}
                    <div className="flex justify-between mt-1.5 px-0">
                        {STAGES.map((_, i) => (
                            <div
                                key={i}
                                className={`w-1 h-1 rounded-full transition-colors ${
                                    i <= rank ? 'bg-[var(--color-primary)]' : 'bg-gray-200 dark:bg-white/10'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </button>

            {/* ── Expanded section ── */}
            {isExpanded && (
                <div className="border-t border-gray-100 dark:border-white/10 px-4 sm:px-5 pb-5 pt-4">
                    <VerticalTimeline order={order} />
                    {showShipping && (
                        <div className="mt-2">
                            <ShippingCard order={order} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────

interface OrderTrackingPageProps {
    layoutProps: any;
}

export const OrderTrackingPage: FC<OrderTrackingPageProps> = ({ layoutProps }) => {
    const { user } = layoutProps;

    const [orders, setOrders]           = useState<(CrmOrder & { id: string })[]>([]);
    const [expandedId, setExpandedId]   = useState<string | null>(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('crm_orders')
                .select('*')
                .eq('client_id', user.id)
                .order('created_at', { ascending: false });

            if (err) throw err;

            const mapped = (data ?? []).map(mapRawOrder);
            setOrders(mapped);
            setLastRefreshed(new Date());
        } catch (e: any) {
            setError(e.message ?? 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // Auto-expand the most recent order on first load
    useEffect(() => {
        if (orders.length > 0 && !expandedId) {
            setExpandedId(orders[0].id);
        }
    }, [orders, expandedId]);

    // ── Real-time ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`order-tracking-${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'crm_orders',
            }, (payload) => {
                const updated = payload.new as any;
                if (updated.client_id !== user.id) return;
                setOrders(prev => prev.map(o => o.id === updated.id ? mapRawOrder(updated) : o));
                setLastRefreshed(new Date());
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <MainLayout {...layoutProps}>
            {/* Page header */}
            <div className="flex items-center justify-between mb-1">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Order Tracking</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                        Live updates from confirmation to delivery
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    {/* LIVE badge */}
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        LIVE
                    </span>
                    <button
                        onClick={fetchOrders}
                        disabled={loading}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors active:scale-95"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Last updated */}
            <p className="flex items-center gap-1 text-[11px] text-gray-300 dark:text-gray-600 mb-5">
                <Clock className="w-3 h-3" />
                Updated {lastRefreshed.toLocaleTimeString()}
            </p>

            {/* Error */}
            {error && (
                <div className="mb-4 flex items-center gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                    <p className="text-sm text-gray-400">Loading your orders…</p>
                </div>
            )}

            {/* Empty */}
            {!loading && orders.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <PackageCheck className="w-14 h-14 text-gray-200 dark:text-gray-700 mb-4" />
                    <p className="font-semibold text-gray-500 dark:text-gray-400">No orders to track yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your orders will appear here once placed</p>
                </div>
            )}

            {/* Order count label */}
            {orders.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-0.5">
                    {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                </p>
            )}

            {/* Accordion list */}
            <div className="space-y-3">
                {orders.map(order => (
                    <OrderTrackingCard
                        key={order.id}
                        order={order}
                        isExpanded={expandedId === order.id}
                        onToggle={() => toggle(order.id)}
                    />
                ))}
            </div>
        </MainLayout>
    );
};
