import React, { useState, useEffect, useCallback, FC } from 'react';
import {
    ClipboardCheck, Cog, ShieldCheck, Ship, PackageCheck,
    ExternalLink, RefreshCw, AlertCircle, ChevronRight,
    Container, Hash, Calendar, Clock, CheckCircle2, Loader2,
} from 'lucide-react';
import { MainLayout } from './MainLayout';
import { supabase } from './supabaseClient';
import { CrmOrder } from './types';

// ─── Stage definitions ────────────────────────────────────────────────────────

type OrderStatus = 'Pending' | 'In Production' | 'Quality Check' | 'Shipped' | 'Completed';

const STAGES: { key: OrderStatus; label: string; sublabel: string; Icon: FC<any> }[] = [
    { key: 'Pending',       label: 'Order Confirmed',  sublabel: 'Received & confirmed',     Icon: ClipboardCheck },
    { key: 'In Production', label: 'In Production',    sublabel: 'Being manufactured',       Icon: Cog           },
    { key: 'Quality Check', label: 'Quality Check',    sublabel: 'Inspection in progress',   Icon: ShieldCheck   },
    { key: 'Shipped',       label: 'Shipped',          sublabel: 'In transit to destination', Icon: Ship         },
    { key: 'Completed',     label: 'Delivered',        sublabel: 'Order complete',            Icon: PackageCheck  },
];

const STATUS_RANK: Record<OrderStatus, number> = {
    'Pending': 0, 'In Production': 1, 'Quality Check': 2, 'Shipped': 3, 'Completed': 4,
};

// ─── Carrier URL builders ─────────────────────────────────────────────────────

const CARRIERS: { name: string; url: (ref: string) => string }[] = [
    { name: 'Maersk',       url: ref => `https://www.maersk.com/tracking/${ref}` },
    { name: 'MSC',          url: ref => `https://www.msc.com/en/tracking/${ref}` },
    { name: 'CMA CGM',      url: ref => `https://www.cma-cgm.com/ebusiness/tracking/search?Reference=${ref}` },
    { name: 'Hapag-Lloyd',  url: ref => `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${ref}` },
    { name: 'Evergreen',    url: ref => `https://www.evergreen-line.com/static/jsp/tracking.jsp?cn=${ref}` },
    { name: 'Cosco',        url: ref => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BOOKING&number=${ref}` },
    { name: 'Yang Ming',    url: ref => `https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?number=${ref}` },
    { name: 'ONE',          url: ref => `https://www.one-line.com/en/tools/cargo-tracking?trkType=cntr&number=${ref}` },
];

function getCarrierUrl(carrier?: string, trackingNumber?: string, containerNumber?: string): string | null {
    const ref = trackingNumber || containerNumber;
    if (!ref) return null;
    if (carrier) {
        const match = CARRIERS.find(c => c.name.toLowerCase() === carrier.toLowerCase());
        if (match) return match.url(ref);
    }
    return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
}

function mapRawOrder(raw: any): CrmOrder & { id: string } {
    return {
        ...raw,
        id: raw.id,
        customer: raw.customer ?? raw.client_name ?? '',
        product: raw.product ?? raw.product_name ?? '',
        factoryId: raw.factory_id ?? '',
        status: raw.status,
        createdAt: raw.created_at,
        deliveryDate: raw.delivery_date,
        trackingNumber: raw.tracking_number,
        containerNumber: raw.container_number,
        shippingCarrier: raw.shipping_carrier,
        estimatedDelivery: raw.estimated_delivery,
        statusChangedAt: raw.status_changed_at ?? {},
        documents: raw.documents ?? [],
        tasks: raw.tasks ?? [],
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const LiveBadge: FC = () => (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        LIVE
    </span>
);

const EmptyState: FC = () => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
        <PackageCheck className="w-14 h-14 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">No orders to track yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Orders will appear here once placed</p>
    </div>
);

// ─── Shipping info card (shown when Shipped or Completed) ─────────────────────

const ShippingCard: FC<{ order: CrmOrder & { id: string } }> = ({ order }) => {
    const carrierUrl = getCarrierUrl(order.shippingCarrier, order.trackingNumber, order.containerNumber);
    const hasInfo = order.trackingNumber || order.containerNumber || order.shippingCarrier;

    if (!hasInfo) return null;

    return (
        <div className="mt-6 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-900/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-3">Shipment Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {order.shippingCarrier && (
                    <div className="flex items-start gap-2">
                        <Ship className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Carrier</p>
                            <p className="font-semibold text-gray-800 dark:text-white">{order.shippingCarrier}</p>
                        </div>
                    </div>
                )}
                {order.trackingNumber && (
                    <div className="flex items-start gap-2">
                        <Hash className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Tracking No.</p>
                            <p className="font-mono font-semibold text-gray-800 dark:text-white tracking-wide">{order.trackingNumber}</p>
                        </div>
                    </div>
                )}
                {order.containerNumber && (
                    <div className="flex items-start gap-2">
                        <Container className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Container No.</p>
                            <p className="font-mono font-semibold text-gray-800 dark:text-white tracking-wide">{order.containerNumber}</p>
                        </div>
                    </div>
                )}
            </div>

            {order.estimatedDelivery && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Estimated delivery: <strong>{formatDate(order.estimatedDelivery)}</strong></span>
                </div>
            )}

            {carrierUrl && (
                <a
                    href={carrierUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                    Track on {order.shippingCarrier || 'Carrier'} Website
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            )}
        </div>
    );
};

// ─── Stage tracker ────────────────────────────────────────────────────────────

const StageTracker: FC<{ order: CrmOrder & { id: string } }> = ({ order }) => {
    const currentRank = STATUS_RANK[order.status as OrderStatus] ?? 0;

    return (
        <div className="mt-6">
            {/* ── Desktop: horizontal tracker ── */}
            <div className="hidden sm:block relative">
                {/* Background connector line */}
                <div className="absolute top-6 left-[calc(10%)] right-[calc(10%)] h-0.5 bg-gray-200 dark:bg-white/10" />
                {/* Filled connector up to current stage */}
                <div
                    className="absolute top-6 left-[calc(10%)] h-0.5 bg-[var(--color-primary)] transition-all duration-700"
                    style={{ width: `${(currentRank / (STAGES.length - 1)) * 80}%` }}
                />

                <div className="relative flex justify-between">
                    {STAGES.map((stage, idx) => {
                        const isCompleted = idx < currentRank;
                        const isActive    = idx === currentRank;
                        const isPending   = idx > currentRank;
                        const timestamp   = order.statusChangedAt?.[stage.key];

                        return (
                            <div key={stage.key} className="flex flex-col items-center w-1/5">
                                {/* Circle */}
                                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                    isCompleted ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' :
                                    isActive    ? 'bg-white dark:bg-gray-900 border-[var(--color-primary)] shadow-lg shadow-red-200 dark:shadow-red-900/30' :
                                                  'bg-white dark:bg-gray-800 border-gray-200 dark:border-white/10'
                                }`}>
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                    ) : (
                                        <stage.Icon className={`w-5 h-5 ${
                                            isActive  ? 'text-[var(--color-primary)]' : 'text-gray-300 dark:text-gray-600'
                                        } ${isActive ? 'animate-pulse' : ''}`} />
                                    )}
                                    {isActive && (
                                        <span className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)] animate-ping opacity-40" />
                                    )}
                                </div>

                                {/* Label */}
                                <p className={`mt-3 text-xs font-semibold text-center leading-tight ${
                                    isCompleted || isActive ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                    {stage.label}
                                </p>

                                {/* Date or status */}
                                <p className={`mt-1 text-[11px] text-center ${
                                    isCompleted ? 'text-green-600 dark:text-green-400' :
                                    isActive    ? 'text-[var(--color-primary)]' :
                                                  'text-gray-300 dark:text-gray-600'
                                }`}>
                                    {isCompleted && timestamp ? formatDate(timestamp) :
                                     isActive                 ? 'In progress'          :
                                                                '—'}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Mobile: vertical timeline ── */}
            <div className="sm:hidden relative pl-6">
                <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-white/10" />

                {STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentRank;
                    const isActive    = idx === currentRank;
                    const timestamp   = order.statusChangedAt?.[stage.key];
                    const isLast      = idx === STAGES.length - 1;

                    return (
                        <div key={stage.key} className={`relative flex items-start gap-4 ${isLast ? '' : 'pb-8'}`}>
                            {/* Dot */}
                            <div className={`absolute -left-[3px] top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                                isCompleted ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' :
                                isActive    ? 'bg-white dark:bg-gray-900 border-[var(--color-primary)]' :
                                              'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                            }`}>
                                {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                                {isActive    && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />}
                            </div>

                            {/* Content */}
                            <div className="ml-4">
                                <div className={`flex items-center gap-2 ${
                                    isCompleted || isActive ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                    <stage.Icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="font-semibold text-sm">{stage.label}</span>
                                </div>
                                <p className={`text-xs mt-0.5 ${
                                    isCompleted ? 'text-green-600 dark:text-green-400' :
                                    isActive    ? 'text-[var(--color-primary)]' :
                                                  'text-gray-400 dark:text-gray-500'
                                }`}>
                                    {isCompleted && timestamp ? formatDate(timestamp) :
                                     isActive                 ? 'In progress'          :
                                                                stage.sublabel}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Order card ───────────────────────────────────────────────────────────────

const OrderCard: FC<{ order: CrmOrder & { id: string }; isSelected: boolean; onClick: () => void }> = ({ order, isSelected, onClick }) => {
    const rank = STATUS_RANK[order.status as OrderStatus] ?? 0;
    const pct  = Math.round((rank / (STAGES.length - 1)) * 100);

    return (
        <button
            onClick={onClick}
            className={`w-full text-left rounded-xl border p-4 transition-all ${
                isSelected
                    ? 'border-[var(--color-primary)] bg-red-50/60 dark:bg-red-900/10 shadow-md'
                    : 'border-gray-200 dark:border-white/10 bg-white/60 dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-white/20'
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{order.product || 'Order'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{order.customer}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        order.status === 'Completed'     ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        order.status === 'Shipped'       ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'   :
                        order.status === 'Quality Check' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        order.status === 'In Production' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                           'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                        {order.status ?? 'Pending'}
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-[var(--color-primary)]' : 'text-gray-300'}`} />
                </div>
            </div>

            {/* Mini progress bar */}
            <div className="mt-3 h-1 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="mt-1 text-right text-[10px] text-gray-400 dark:text-gray-500">{pct}% complete</p>
        </button>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────

interface OrderTrackingPageProps {
    layoutProps: any;
}

export const OrderTrackingPage: FC<OrderTrackingPageProps> = ({ layoutProps }) => {
    const { user } = layoutProps;

    const [orders, setOrders]         = useState<(CrmOrder & { id: string })[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const selectedOrder = orders.find(o => o.id === selectedId) ?? null;

    // ── Fetch orders ───────────────────────────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('crm_orders')
                .select('id, status, product, customer, factory_id, created_at, delivery_date, tracking_number, container_number, shipping_carrier, estimated_delivery, status_changed_at, tasks, documents, client_id')
                .eq('client_id', user.id)
                .order('created_at', { ascending: false });

            if (err) throw err;

            const mapped = (data ?? []).map(mapRawOrder);
            setOrders(mapped);
            setLastRefreshed(new Date());

            // Auto-select first order
            if (mapped.length > 0 && !selectedId) {
                setSelectedId(mapped[0].id);
            }
        } catch (e: any) {
            setError(e.message ?? 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [user?.id, selectedId]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // ── Real-time subscription ─────────────────────────────────────────────────
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

                setOrders(prev => prev.map(o =>
                    o.id === updated.id ? mapRawOrder(updated) : o
                ));
                setLastRefreshed(new Date());
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <MainLayout {...layoutProps}>
            <div className="flex items-center justify-between mb-1">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Order Tracking</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                        Follow your orders from confirmation to delivery
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <LiveBadge />
                    <button
                        onClick={fetchOrders}
                        disabled={loading}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <p className="text-[11px] text-gray-300 dark:text-gray-600 mb-6 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last updated: {lastRefreshed.toLocaleTimeString()}
            </p>

            {/* Error */}
            {error && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && orders.length === 0 && (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                </div>
            )}

            {/* Empty */}
            {!loading && orders.length === 0 && !error && <EmptyState />}

            {/* Main content */}
            {orders.length > 0 && (
                <div className="flex flex-col lg:flex-row gap-5">

                    {/* ── Left: order list ── */}
                    <div className="lg:w-72 flex-shrink-0 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                            Your Orders ({orders.length})
                        </p>
                        {orders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                isSelected={order.id === selectedId}
                                onClick={() => setSelectedId(order.id)}
                            />
                        ))}
                    </div>

                    {/* ── Right: detail panel ── */}
                    {selectedOrder && (
                        <div className="flex-1 min-w-0">
                            <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 shadow-lg p-6">

                                {/* Order header */}
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                                            {selectedOrder.product || 'Order'}
                                        </h2>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{selectedOrder.customer}</p>
                                    </div>
                                    <span className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full ${
                                        selectedOrder.status === 'Completed'     ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        selectedOrder.status === 'Shipped'       ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'   :
                                        selectedOrder.status === 'Quality Check' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        selectedOrder.status === 'In Production' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                                   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                        {selectedOrder.status ?? 'Pending'}
                                    </span>
                                </div>

                                {/* Meta row */}
                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/10 pb-4 mb-2">
                                    {selectedOrder.createdAt && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Placed {formatDate(selectedOrder.createdAt)}
                                        </span>
                                    )}
                                    {selectedOrder.deliveryDate && (
                                        <span className="flex items-center gap-1">
                                            <PackageCheck className="w-3 h-3" /> Est. delivery {formatDate(selectedOrder.deliveryDate)}
                                        </span>
                                    )}
                                    {selectedOrder.shippingPort && (
                                        <span className="flex items-center gap-1">
                                            <Ship className="w-3 h-3" /> {selectedOrder.shippingPort}
                                            {selectedOrder.portOfDischarge ? ` → ${selectedOrder.portOfDischarge}` : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Stage tracker */}
                                <StageTracker order={selectedOrder} />

                                {/* Shipping card — shown when Shipped or Completed */}
                                {(selectedOrder.status === 'Shipped' || selectedOrder.status === 'Completed') && (
                                    <ShippingCard order={selectedOrder} />
                                )}

                                {/* No tracking info yet notice */}
                                {(selectedOrder.status === 'Shipped' || selectedOrder.status === 'Completed') &&
                                 !selectedOrder.trackingNumber && !selectedOrder.containerNumber && (
                                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        Tracking details will appear here once provided by the logistics team.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </MainLayout>
    );
};
