import React, { useEffect, useState, FC, useRef, useCallback, useMemo } from 'react';
import { getCache, setCache, TTL_FACTORIES } from './sessionCache';
import {
    Users, Package, DollarSign, Activity, Building, Flame,
    Calendar, TrendingUp, CheckCircle2, Scissors, LayoutDashboard,
    Scroll, Ruler, ChevronLeft, ChevronRight, AlertTriangle, Clock, Shirt
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { MainLayout } from './MainLayout';
import { dashboardService, DashboardStats } from './dashboard.service';
import { supabase } from './supabaseClient';
import { normalizeOrder } from './utils';
import { CrmOrder, Factory } from './types';

interface AdminDashboardPageProps {
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    isAdmin: boolean;
}

// ── Shared components ───────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon, gradient }: any) => (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-[0.08] rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110 blur-2xl`} />
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">{title}</p>
                <h4 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white mt-0.5 sm:mt-1 tracking-tight">{value}</h4>
                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 sm:mt-1 font-medium">{subtitle}</p>
            </div>
            <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:rotate-6 transition-transform duration-300 ring-4 ring-white/10 flex-shrink-0`}>
                {icon}
            </div>
        </div>
    </div>
);

const ORDER_COLORS_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// ── Production Gantt ─────────────────────────────────────────────────────────
const ProductionGantt = ({ timelineData, darkMode }: { timelineData: any[]; darkMode?: boolean }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!timelineData.length) return null;

    const allTimes = timelineData.flatMap(d => [d.start.getTime(), d.end.getTime()]);
    const rangeStart = new Date(Math.min(...allTimes, today.getTime() - 7 * 86400000));
    rangeStart.setDate(1); rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(Math.max(...allTimes, today.getTime() + 21 * 86400000));
    rangeEnd.setHours(23, 59, 59, 0);
    const totalMs = rangeEnd.getTime() - rangeStart.getTime();
    const toPct = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - rangeStart.getTime()) / totalMs) * 100));
    const todayPct = toPct(today);

    const months: { label: string; pct: number }[] = [];
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
        months.push({ label: cur.toLocaleString('default', { month: 'short', year: '2-digit' }), pct: toPct(cur) });
        cur.setMonth(cur.getMonth() + 1); cur.setDate(1);
    }

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-end gap-2">
                <div className="w-44 flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">Order · Client</div>
                <div className="flex-1 relative h-5">
                    {months.map((m, i) => (
                        <span key={i} className="absolute text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide -translate-x-1/2" style={{ left: `${m.pct}%` }}>{m.label}</span>
                    ))}
                </div>
                <div className="w-20 flex-shrink-0 text-right text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">Due</div>
            </div>

            {/* Rows */}
            {timelineData.map((item, idx) => {
                const color = ORDER_COLORS_PALETTE[idx % ORDER_COLORS_PALETTE.length];
                const startPct = toPct(item.start);
                const endPct = toPct(item.end);
                const widthPct = Math.max(endPct - startPct, 1.5);
                const daysLeft = Math.ceil((item.end.getTime() - today.getTime()) / 86400000);
                const isOverdue = daysLeft < 0;
                const isUrgent = !isOverdue && daysLeft <= 7;
                return (
                    <div key={item.id} className="flex items-center gap-2 group">
                        <div className="w-44 flex-shrink-0">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{item.product}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{item.customer}</p>
                        </div>
                        <div className="flex-1 relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                            {months.map((m, i) => (
                                <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 opacity-50" style={{ left: `${m.pct}%` }} />
                            ))}
                            {/* Today marker */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: `${todayPct}%` }}>
                                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-400 rounded-full" />
                            </div>
                            {/* Bar */}
                            <div
                                className={`absolute top-1.5 bottom-1.5 rounded-full flex items-center px-2 overflow-hidden ${isOverdue ? 'opacity-50' : 'opacity-90 group-hover:opacity-100'} transition-opacity`}
                                style={{ left: `${startPct}%`, width: `${widthPct}%`, backgroundColor: color }}
                                title={`${item.product} | ${item.start.toLocaleDateString()} → ${item.end.toLocaleDateString()} | ${item.status}`}
                            >
                                {widthPct > 10 && <span className="text-[9px] text-white font-semibold truncate">{item.status}</span>}
                            </div>
                        </div>
                        <div className="w-20 flex-shrink-0 text-right">
                            <p className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                {isOverdue ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                            </p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500">{item.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                );
            })}

            <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-red-400" /><span className="text-[10px] text-gray-400">Today</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600 opacity-50" /><span className="text-[10px] text-gray-400">Overdue (faded)</span></div>
            </div>
        </div>
    );
};

// ── Task Calendar ─────────────────────────────────────────────────────────────
const ProductionCalendar = ({ timelineData, darkMode }: { timelineData: any[]; darkMode?: boolean }) => {
    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date(); d.setDate(1); return d;
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayOrders = useMemo(() => {
        const map: Record<number, { label: string; color: string; customer: string; status: string; id: string }[]> = {};
        timelineData.forEach((item, idx) => {
            const color = ORDER_COLORS_PALETTE[idx % ORDER_COLORS_PALETTE.length];
            for (let d = 1; d <= daysInMonth; d++) {
                const day = new Date(year, month, d); day.setHours(0, 0, 0, 0);
                const start = new Date(item.start); start.setHours(0, 0, 0, 0);
                const end = new Date(item.end); end.setHours(0, 0, 0, 0);
                if (day >= start && day <= end) {
                    if (!map[d]) map[d] = [];
                    map[d].push({ label: item.product, color, customer: item.customer, status: item.status, id: item.id });
                }
            }
        });
        return map;
    }, [timelineData, year, month, daysInMonth]);

    const today = new Date();
    const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

    const activeThisMonth = useMemo(() => {
        const ids = new Set<string>();
        Object.values(dayOrders).forEach(orders => orders.forEach(o => ids.add(o.id)));
        return ids.size;
    }, [dayOrders]);

    const endingThisMonth = useMemo(() =>
        timelineData.filter(item => {
            const e = new Date(item.end);
            return e.getFullYear() === year && e.getMonth() === month;
        }).length,
    [timelineData, year, month]);

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-3 mt-1">
                        {activeThisMonth > 0 && <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{activeThisMonth} active this month</span>}
                        {endingThisMonth > 0 && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{endingThisMonth} ending this month</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"><ChevronLeft size={16} /></button>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"><ChevronRight size={16} /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="h-16 rounded-lg" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const orders = dayOrders[day] || [];
                    const past = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    return (
                        <div key={day} className={`h-16 rounded-lg p-1 relative overflow-hidden transition-colors ${
                            isToday(day) ? 'bg-[#c20c0b]/10 dark:bg-[#c20c0b]/20 ring-1 ring-[#c20c0b]/40'
                            : orders.length > 0 ? 'bg-blue-50/80 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-default'
                            : 'bg-gray-50/60 dark:bg-gray-800/20'
                        }`}>
                            <span className={`text-[10px] font-bold leading-none ${isToday(day) ? 'text-[#c20c0b]' : past ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'}`}>{day}</span>
                            <div className="mt-0.5 space-y-0.5">
                                {orders.slice(0, 2).map((o, oi) => (
                                    <div key={oi} className="flex items-center gap-0.5 rounded px-0.5 overflow-hidden" style={{ backgroundColor: o.color + '22' }} title={`${o.label} · ${o.customer} · ${o.status}`}>
                                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                                        <span className="text-[8px] font-semibold truncate leading-tight" style={{ color: o.color }}>{o.label}</span>
                                    </div>
                                ))}
                                {orders.length > 2 && <div className="text-[9px] text-gray-400 font-semibold pl-0.5">+{orders.length - 2} more</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {timelineData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold tracking-wide mb-2">Order Legend</p>
                    <div className="space-y-1.5">
                        {timelineData.slice(0, 8).map((item, idx) => {
                            const color = ORDER_COLORS_PALETTE[idx % ORDER_COLORS_PALETTE.length];
                            const daysLeft = Math.ceil((item.end.getTime() - today.getTime()) / 86400000);
                            const isOverdue = daysLeft < 0;
                            const isUrgent = !isOverdue && daysLeft <= 7;
                            return (
                                <div key={item.id} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 truncate flex-1">{item.product}</span>
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 hidden sm:block truncate max-w-[80px]">{item.customer}</span>
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500">
                                        {item.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {item.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : isUrgent ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                        {isOverdue ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main component ──────────────────────────────────────────────────────────

export const AdminDashboardPage: FC<AdminDashboardPageProps> = (props) => {
    const CACHE_KEY = 'garment_erp_admin_stats';
    const CRM_CACHE_KEY = 'garment_erp_admin_crm_orders';
    const FACTORIES_CACHE_KEY = 'garment_erp_factories_v2'; // shared key — avoids duplicate network fetches

    const [stats, setStats] = useState<DashboardStats>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {
            totalClients: 0, totalFactories: 0, totalTrending: 0, activeOrders: 0, totalRevenue: '$0'
        };
    });
    const [crmOrders, setCrmOrders] = useState<CrmOrder[]>(() => {
        const cached = sessionStorage.getItem(CRM_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [factories, setFactories] = useState<Factory[]>(() => getCache<Factory[]>(FACTORIES_CACHE_KEY, TTL_FACTORIES) ?? []);
    const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem(CACHE_KEY));
    const [crmLoading, setCrmLoading] = useState(() => !sessionStorage.getItem(CRM_CACHE_KEY));
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchStats = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        if (!sessionStorage.getItem(CACHE_KEY)) setIsLoading(true);
        if (!sessionStorage.getItem(CRM_CACHE_KEY)) setCrmLoading(true);

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));

                const [dashData, ordersRes, factoriesRes] = await Promise.race([
                    Promise.all([
                        dashboardService.getStats(),
                        supabase.from('crm_orders').select('*').order('created_at', { ascending: false }).abortSignal(signal),
                        supabase.from('factories').select('id, name, location').abortSignal(signal),
                    ]),
                    timeoutPromise
                ]) as any;

                if (signal.aborted) return;

                setStats(dashData);
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(dashData));
                setIsLoading(false);

                if (!ordersRes.error && ordersRes.data) {
                    const normalized = ordersRes.data.map((o: any) => normalizeOrder(o));
                    setCrmOrders(normalized);
                    sessionStorage.setItem(CRM_CACHE_KEY, JSON.stringify(normalized));
                }
                setCrmLoading(false);

                if (!factoriesRes.error && factoriesRes.data) {
                    setFactories(factoriesRes.data);
                    setCache(FACTORIES_CACHE_KEY, factoriesRes.data);
                }
                return;
            } catch (error: any) {
                if (error.name === 'AbortError') return;
                attempts++;
                if (attempts >= 3) { setIsLoading(false); setCrmLoading(false); }
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, []);

    useEffect(() => {
        fetchStats();
        return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, [fetchStats]);

    // ── Computed insights ────────────────────────────────────────────────────

    const insights = useMemo(() => {
        const COMPLETED_STATUSES = ['Shipped', 'Completed'];
        const orders = crmOrders;

        const totalOrders = orders.length;
        const activeOrders = orders.filter(o => !COMPLETED_STATUSES.includes(o.status || '')).length;
        const completedOrders = orders.filter(o => COMPLETED_STATUSES.includes(o.status || '')).length;

        const totalUnits = orders.reduce((acc, o) => {
            if (o.products?.length) return acc + o.products.reduce((s, p) => s + (p.quantity || 0), 0);
            const m = o.product?.match(/(\d+)/);
            return acc + (m ? parseInt(m[1], 10) : 0);
        }, 0);

        const delayedOrders = orders.filter(o =>
            o.tasks?.some(t => t.status !== 'COMPLETE' && t.plannedEndDate && new Date(t.plannedEndDate) < new Date())
        ).length;

        const onTimeRate = totalOrders > 0
            ? Math.round(((totalOrders - delayedOrders) / totalOrders) * 100)
            : 100;

        // Status distribution
        const statusCounts: Record<string, number> = {};
        orders.forEach(o => { const s = o.status || 'Pending'; statusCounts[s] = (statusCounts[s] || 0) + 1; });
        const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

        // Factory allocation
        const factoryLoad: Record<string, number> = {};
        orders.forEach(o => {
            const fName = factories.find(f => f.id === o.factoryId)?.name || 'Unknown Factory';
            factoryLoad[fName] = (factoryLoad[fName] || 0) + 1;
        });
        const factoryData = Object.entries(factoryLoad)
            .map(([name, orders]) => ({ name, orders }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 6);

        // Monthly volume (last 6 months)
        const monthlyMap: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
            monthlyMap[d.toLocaleString('default', { month: 'short' })] = 0;
        }
        orders.forEach(o => {
            if (!o.createdAt) return;
            const key = new Date(o.createdAt).toLocaleString('default', { month: 'short' });
            if (key in monthlyMap) monthlyMap[key]++;
        });
        const monthlyVolumeData = Object.entries(monthlyMap).map(([month, orders]) => ({ month, orders }));

        // Timeline for active orders
        const timelineData = orders
            .filter(o => !['Completed', 'Shipped', 'Cancelled'].includes(o.status || ''))
            .map(o => {
                let start = o.createdAt ? new Date(o.createdAt) : new Date();
                if (o.tasks?.length) {
                    const earliest = o.tasks.reduce((min, t) => {
                        const d = t.plannedStartDate ? new Date(t.plannedStartDate) : null;
                        return d && d < min ? d : min;
                    }, new Date(8640000000000000));
                    if (earliest.getTime() !== 8640000000000000) start = earliest;
                }
                let end = new Date(start); end.setDate(end.getDate() + 30);
                if (o.tasks?.length) {
                    const latest = o.tasks.reduce((max, t) => {
                        const d = t.plannedEndDate ? new Date(t.plannedEndDate) : null;
                        return d && d > max ? d : max;
                    }, new Date(-8640000000000000));
                    if (latest.getTime() !== -8640000000000000) end = latest;
                }
                return { id: o.id, product: o.product, customer: o.customer, start, end, status: o.status };
            })
            .sort((a, b) => a.end.getTime() - b.end.getTime());

        // Upcoming deadlines (next 30 days)
        const now = new Date();
        const in30 = new Date(); in30.setDate(in30.getDate() + 30);
        const upcomingDeadlines = timelineData
            .filter(item => item.end >= now && item.end <= in30)
            .slice(0, 5)
            .map(item => ({ ...item, due: item.end }));

        return { totalOrders, activeOrders, completedOrders, totalUnits, delayedOrders, onTimeRate, statusData, factoryData, monthlyVolumeData, timelineData, upcomingDeadlines };
    }, [crmOrders, factories]);

    // ── Render ───────────────────────────────────────────────────────────────

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const darkMode = props.user?.darkMode;

    const platformCards = [
        { title: 'Total Clients', value: stats.totalClients, icon: <Users className="text-blue-600" />, color: 'bg-blue-100 dark:bg-blue-900/30' },
        { title: 'Total Factories', value: stats.totalFactories, icon: <Building className="text-[#c20c0b]" />, color: 'bg-red-100 dark:bg-red-900/30' },
        { title: 'Trending Items', value: stats.totalTrending, icon: <Flame className="text-orange-600" />, color: 'bg-orange-100 dark:bg-orange-900/30' },
        { title: 'Total Revenue', value: stats.totalRevenue, icon: <DollarSign className="text-green-600" />, color: 'bg-green-100 dark:bg-green-900/30' },
    ];

    return (
        <MainLayout {...props}>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 text-sm sm:text-base">Real-time overview of platform activity.</p>
                </div>

                {/* Platform KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    {platformCards.map((stat, index) => (
                        <div key={index} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-3 sm:p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-between hover:scale-105 transition-transform">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-200 truncate">{stat.title}</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mt-0.5 sm:mt-1">{isLoading ? '...' : stat.value}</p>
                            </div>
                            <div className={`p-2 sm:p-3 rounded-lg ${stat.color} flex-shrink-0`}>{stat.icon}</div>
                        </div>
                    ))}
                </div>

                {/* Production KPI cards */}
                {crmLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c20c0b]" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <StatCard
                                title="Total Production"
                                value={insights.totalUnits.toLocaleString()}
                                subtitle="Units across all orders"
                                icon={<Shirt className="text-white" size={22} />}
                                gradient="from-blue-500 to-indigo-600"
                            />
                            <StatCard
                                title="Active Orders"
                                value={insights.activeOrders}
                                subtitle={`${insights.delayedOrders} delayed`}
                                icon={<Activity className="text-white" size={22} />}
                                gradient="from-emerald-500 to-teal-600"
                            />
                            <StatCard
                                title="Completion Rate"
                                value={`${insights.totalOrders > 0 ? Math.round((insights.completedOrders / insights.totalOrders) * 100) : 0}%`}
                                subtitle="Shipped & completed"
                                icon={<CheckCircle2 className="text-white" size={22} />}
                                gradient="from-violet-500 to-purple-600"
                            />
                            <StatCard
                                title="On-Time Rate"
                                value={`${insights.onTimeRate}%`}
                                subtitle={insights.delayedOrders > 0 ? `${insights.delayedOrders} at risk` : 'All on schedule'}
                                icon={<Clock className="text-white" size={22} />}
                                gradient={insights.onTimeRate >= 80 ? 'from-cyan-500 to-blue-600' : 'from-rose-500 to-red-600'}
                            />
                            <StatCard
                                title="Total Orders"
                                value={insights.totalOrders}
                                subtitle="Across all clients"
                                icon={<Scissors className="text-white" size={22} />}
                                gradient="from-amber-500 to-orange-600"
                            />
                        </div>

                        {/* Row 1: Status Mix + Factory Allocation */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                    <Scroll size={120} />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mb-3 sm:mb-6 flex items-center gap-2">
                                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-[#c20c0b]"><LayoutDashboard size={18} /></div>
                                    Order Status Mix
                                </h3>
                                {insights.statusData.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-16">No order data yet.</p>
                                ) : (
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={insights.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                                    {insights.statusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                    <Ruler size={120} />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mb-3 sm:mb-6 flex items-center gap-2">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600"><TrendingUp size={18} /></div>
                                    Factory Allocation
                                </h3>
                                {insights.factoryData.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-16">No factory data yet.</p>
                                ) : (
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={insights.factoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? '#374151' : '#e5e7eb'} opacity={0.5} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={110} tick={{ fill: darkMode ? '#9ca3af' : '#4b5563', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }} />
                                                <Bar dataKey="orders" radius={[0, 6, 6, 0]} barSize={24}>
                                                    {insights.factoryData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Monthly Volume + Upcoming Deadlines */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mb-3 sm:mb-6 flex items-center gap-2">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600"><TrendingUp size={18} /></div>
                                    Monthly Order Volume
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={insights.monthlyVolumeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="adminVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} opacity={0.5} />
                                            <XAxis dataKey="month" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }} />
                                            <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2.5} fill="url(#adminVolumeGrad)" dot={{ fill: '#10b981', r: 3 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600"><AlertTriangle size={18} /></div>
                                    Upcoming Deadlines
                                    <span className="ml-auto text-xs font-medium text-gray-400 dark:text-gray-500">Next 30 days</span>
                                </h3>
                                {insights.upcomingDeadlines.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No deadlines in the next 30 days.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {insights.upcomingDeadlines.map((item: any) => {
                                            const daysLeft = Math.ceil((item.due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            const urgent = daysLeft <= 7;
                                            return (
                                                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${urgent ? 'bg-red-50/60 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30' : 'bg-gray-50/60 dark:bg-gray-800/30 border-gray-100 dark:border-white/5'}`}>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${urgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                                                        <Calendar size={14} className={urgent ? 'text-red-500' : 'text-amber-500'} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{item.product}</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">{item.customer} · {item.due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                                    </div>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${urgent ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
                                                        {daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 day' : `${daysLeft} days`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Production Gantt Timeline */}
                        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                <TrendingUp size={120} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600"><TrendingUp size={18} /></div>
                                Production Timeline
                                <span className="ml-auto text-xs font-medium text-gray-400 dark:text-gray-500">All active orders · duration &amp; due dates</span>
                            </h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Each bar represents an order's production window. The red line marks today.</p>
                            {insights.timelineData.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-8">No active production schedules.</p>
                            ) : (
                                <ProductionGantt timelineData={insights.timelineData} darkMode={darkMode} />
                            )}
                        </div>

                        {/* Task Calendar */}
                        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                <Calendar size={120} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600"><Calendar size={18} /></div>
                                Task Calendar
                                <span className="ml-auto text-xs font-medium text-gray-400 dark:text-gray-500">Days with active orders highlighted</span>
                            </h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Hover over a day to see which orders are in production. Color chips show order names.</p>
                            {insights.timelineData.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-8">No active production schedules.</p>
                            ) : (
                                <ProductionCalendar timelineData={insights.timelineData} darkMode={darkMode} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};
