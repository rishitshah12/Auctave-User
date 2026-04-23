import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { analyticsService } from './analytics.service';
import { getCache, setCache, TTL_FACTORIES } from './sessionCache';
import { KnittingPreloader } from './KnittingPreloader';
import { crmService } from './crm.service';
import { factoryService } from './factory.service';
import { quoteService } from './quote.service';
import { CrmOrder, Factory } from './types';
import { normalizeOrder } from './utils';
import {
    Package, Inbox, CheckCircle2, Search, LayoutDashboard,
    Shirt, Activity, Scissors, Ruler, Scroll, TrendingUp, Calendar,
    ChevronLeft, ChevronRight, AlertTriangle, Clock
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import CrmOrderCard from './CrmOrderCard';
import CrmOrderDetail from './CrmOrderDetail';
import { supabase } from './supabaseClient';
import { useOrg } from './OrgContext';

interface CrmDashboardProps {
    callGeminiAPI: (prompt: string) => Promise<string>;
    handleSetCurrentPage: (page: string, data?: any) => void;
    user: any;
    darkMode?: boolean;
    activeCrmOrderKey?: string | null;
}

type TopTab = 'active' | 'all' | 'completed' | 'insights';

const ACTIVE_STATUSES = ['Pending', 'In Production', 'Quality Check'];
const COMPLETED_STATUSES = ['Shipped', 'Completed'];

// Simple stat card for Insights tab
const StatCard = ({ title, value, subtitle, icon, gradient }: any) => (
    <div className="relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-[0.08] rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110 blur-2xl`} />
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">{title}</p>
                <h4 className="text-3xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">{value}</h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">{subtitle}</p>
            </div>
            <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:rotate-6 transition-transform duration-300 ring-4 ring-white/10`}>
                {icon}
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent opacity-50 border-t border-dashed border-gray-300 dark:border-gray-600" />
    </div>
);

// Mini calendar component showing order timelines
const ProductionCalendar = ({ timelineData, darkMode }: { timelineData: any[]; darkMode?: boolean }) => {
    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date(); d.setDate(1); return d;
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const ORDER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

    // Map each day to orders active that day
    const dayOrders = useMemo(() => {
        const map: Record<number, { label: string; color: string }[]> = {};
        timelineData.forEach((item, idx) => {
            const color = ORDER_COLORS[idx % ORDER_COLORS.length];
            for (let d = 1; d <= daysInMonth; d++) {
                const day = new Date(year, month, d);
                if (day >= item.start && day <= item.end) {
                    if (!map[d]) map[d] = [];
                    if (map[d].length < 3) map[d].push({ label: item.product, color });
                }
            }
        });
        return map;
    }, [timelineData, year, month, daysInMonth]);

    const today = new Date();
    const isToday = (d: number) =>
        today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase py-1">{d}</div>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-16 rounded-lg" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const orders = dayOrders[day] || [];
                    const past = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    return (
                        <div
                            key={day}
                            className={`h-16 rounded-lg p-1 relative overflow-hidden transition-colors ${
                                isToday(day)
                                    ? 'bg-[#c20c0b]/10 dark:bg-[#c20c0b]/20 ring-1 ring-[#c20c0b]/40'
                                    : orders.length > 0
                                        ? 'bg-blue-50/60 dark:bg-blue-900/10'
                                        : 'bg-gray-50/60 dark:bg-gray-800/20'
                            }`}
                        >
                            <span className={`text-[11px] font-bold leading-none ${
                                isToday(day) ? 'text-[#c20c0b]' : past ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'
                            }`}>{day}</span>
                            <div className="mt-0.5 space-y-px">
                                {orders.slice(0, 2).map((o, oi) => (
                                    <div
                                        key={oi}
                                        className="h-1.5 rounded-full w-full opacity-70"
                                        style={{ backgroundColor: o.color }}
                                        title={o.label}
                                    />
                                ))}
                                {orders.length > 2 && (
                                    <div className="text-[9px] text-gray-400 font-semibold">+{orders.length - 2}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            {timelineData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex flex-wrap gap-3">
                    {timelineData.slice(0, 5).map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ORDER_COLORS[idx % ORDER_COLORS.length] }} />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{item.product}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const AggregateStatsView = ({ stats, darkMode }: { stats: any; darkMode?: boolean }) => {
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const onTimeRate = stats.totalOrders > 0
        ? Math.round(((stats.totalOrders - stats.delayedOrders) / stats.totalOrders) * 100)
        : 100;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards — 5 cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Production"
                    value={stats.totalUnits.toLocaleString()}
                    subtitle="Units in pipeline"
                    icon={<Shirt className="text-white" size={22} />}
                    gradient="from-blue-500 to-indigo-600"
                />
                <StatCard
                    title="Active Orders"
                    value={stats.activeOrders}
                    subtitle={`${stats.delayedOrders} delayed`}
                    icon={<Activity className="text-white" size={22} />}
                    gradient="from-emerald-500 to-teal-600"
                />
                <StatCard
                    title="Completion Rate"
                    value={`${stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%`}
                    subtitle="Shipped & completed"
                    icon={<CheckCircle2 className="text-white" size={22} />}
                    gradient="from-violet-500 to-purple-600"
                />
                <StatCard
                    title="On-Time Rate"
                    value={`${onTimeRate}%`}
                    subtitle={stats.delayedOrders > 0 ? `${stats.delayedOrders} at risk` : 'All on schedule'}
                    icon={<Clock className="text-white" size={22} />}
                    gradient={onTimeRate >= 80 ? 'from-cyan-500 to-blue-600' : 'from-rose-500 to-red-600'}
                />
                <StatCard
                    title="Total Orders"
                    value={stats.totalOrders}
                    subtitle="Across all stages"
                    icon={<Scissors className="text-white" size={22} />}
                    gradient="from-amber-500 to-orange-600"
                />
            </div>

            {/* Row 1: Status Mix + Factory Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                        <Scroll size={120} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-[#c20c0b]">
                            <LayoutDashboard size={18} />
                        </div>
                        Order Status Mix
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.statusData}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={90}
                                    paddingAngle={5} dataKey="value" stroke="none"
                                >
                                    {stats.statusData.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Factory Load */}
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                        <Ruler size={120} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                            <TrendingUp size={18} />
                        </div>
                        Factory Allocation
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.factoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? '#374151' : '#e5e7eb'} opacity={0.5} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name" type="category" width={100}
                                    tick={{ fill: darkMode ? '#9ca3af' : '#4b5563', fontSize: 12, fontWeight: 500 }}
                                    axisLine={false} tickLine={false}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }}
                                />
                                <Bar dataKey="orders" fill="#8884d8" radius={[0, 6, 6, 0]} barSize={24}>
                                    {stats.factoryData.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Monthly Volume Trend + Upcoming Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Order Volume Trend */}
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                            <TrendingUp size={18} />
                        </div>
                        Monthly Order Volume
                    </h3>
                    {stats.monthlyVolumeData.length === 0 ? (
                        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">Not enough data yet.</p>
                    ) : (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.monthlyVolumeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} opacity={0.5} />
                                    <XAxis dataKey="month" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151', fontWeight: 600 }}
                                    />
                                    <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2.5} fill="url(#volumeGrad)" dot={{ fill: '#10b981', r: 3 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Upcoming Deadlines */}
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">
                            <AlertTriangle size={18} />
                        </div>
                        Upcoming Deadlines
                        <span className="ml-auto text-xs font-medium text-gray-400 dark:text-gray-500">Next 30 days</span>
                    </h3>
                    {stats.upcomingDeadlines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No deadlines in the next 30 days.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.upcomingDeadlines.map((item: any) => {
                                const daysLeft = Math.ceil((item.due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                const urgent = daysLeft <= 7;
                                return (
                                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${urgent ? 'bg-red-50/60 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30' : 'bg-gray-50/60 dark:bg-gray-800/30 border-gray-100 dark:border-white/5'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${urgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                                            <Calendar size={14} className={urgent ? 'text-red-500' : 'text-amber-500'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{item.product}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{item.due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
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

            {/* Production Timeline Calendar */}
            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                    <Calendar size={120} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                        <Calendar size={18} />
                    </div>
                    Production Timeline Calendar
                </h3>
                {stats.timelineData.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-8">No active production schedules.</p>
                ) : (
                    <ProductionCalendar timelineData={stats.timelineData} darkMode={darkMode} />
                )}
            </div>
        </div>
    );
};

export default function CrmDashboard({ callGeminiAPI, handleSetCurrentPage, user, darkMode, activeCrmOrderKey }: CrmDashboardProps) {
    const { org } = useOrg();
    const ORDERS_CACHE_KEY = 'garment_erp_client_orders';
    // Use a CRM-private key so we never overwrite SourcingPage's full factory cache
    // (which has tags, certifications, description etc.) with our partial fetch.
    const FACTORIES_CACHE_KEY = 'garment_erp_factories_crm';
    const FACTORIES_FULL_KEY  = 'garment_erp_factories_v2';

    const [crmData, setCrmData] = useState<{ [key: string]: CrmOrder }>(() => {
        const cached = sessionStorage.getItem(ORDERS_CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    });
    // Prefer the full factory cache written by SourcingPage; fall back to our own partial cache.
    const [allFactories, setAllFactories] = useState<Factory[]>(() =>
        getCache<Factory[]>(FACTORIES_FULL_KEY, TTL_FACTORIES) ??
        getCache<Factory[]>(FACTORIES_CACHE_KEY, TTL_FACTORIES) ?? []);
    const [loading, setLoading] = useState(() => !sessionStorage.getItem(ORDERS_CACHE_KEY));
    const [topTab, setTopTab] = useState<TopTab>('active');
    const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(activeCrmOrderKey ?? null);

    // When notification navigates to a specific order, open it once data is available
    useEffect(() => {
        if (activeCrmOrderKey) setSelectedOrderKey(activeCrmOrderKey);
    }, [activeCrmOrderKey]);
    const [searchQuery, setSearchQuery] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if ((window as any).showToast) (window as any).showToast(message, type);
    };

    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const hasCache = !!sessionStorage.getItem(ORDERS_CACHE_KEY);
        if (!hasCache) setLoading(true);

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));

                if (user && user.id && !signal.aborted) {
                    const fetchId = org?.ownerId ?? user.id;
                    // Fetch factories directly to bypass service permission checks (client-side access)
                    // Only select fields used in CRMPage's OrderDetailsView: id, name, location, rating, imageUrl, specialties
                    const factoriesPromise = supabase.from('factories')
                        .select('id,name,location,rating,cover_image_url,specialties')
                        .abortSignal(signal)
                        .then(({ data, error }) => {
                        if (error) return { data: null, error };
                        const transformed = data?.map((f: any) => ({
                            id: f.id,
                            name: f.name,
                            location: f.location,
                            rating: f.rating,
                            imageUrl: f.cover_image_url,
                            specialties: f.specialties || [],
                            // defaults for unused fields required by Factory type
                            description: '',
                            turnaround: '',
                            minimumOrderQuantity: 0,
                            offer: null,
                            gallery: [],
                            tags: [],
                            certifications: [],
                            productionLines: [],
                            catalog: { products: [], fabricOptions: [] },
                            trustTier: 'unverified' as const,
                            completedOrdersCount: 0,
                        })) || [];
                        return { data: transformed, error: null };
                    });

                    const [ordersRes, quotesRes, factoriesRes] = await Promise.race([
                        Promise.all([
                            crmService.getOrdersByClient(fetchId),
                            quoteService.getQuotesByUser(fetchId),
                            factoriesPromise,
                        ]),
                        timeoutPromise
                    ]) as any;

                    if (ordersRes.error && !signal.aborted) throw ordersRes.error;
                    if (ordersRes.data) {
                        const quotes: any[] = quotesRes.data || [];
                        const mappedData: { [key: string]: CrmOrder } = {};
                        ordersRes.data.forEach((order: any) => {
                            const normalized = normalizeOrder(order);
                            const matchedQuote = quotes.find((q: any) => q.factory_id === order.factory_id);
                            mappedData[order.id] = {
                                ...normalized,
                                customer: 'My Order',
                                destinationCountry: normalized.destinationCountry || matchedQuote?.order_details?.shippingCountry || '',
                                shippingPort: normalized.shippingPort || matchedQuote?.order_details?.shippingPort || '',
                                portOfDischarge: normalized.portOfDischarge || matchedQuote?.admin_response?.commercialData?.portOfDischarge || '',
                            };
                        });
                        // Always persist to cache even when navigated away so next mount reads fresh data.
                        sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(mappedData));
                        if (!signal.aborted) setCrmData(mappedData);
                    }
                    if (!signal.aborted) {
                        setAllFactories(factoriesRes.data || []);
                        // Write to private CRM cache only — never overwrite the full factory
                        // cache (FACTORIES_FULL_KEY) which SourcingPage populates with all fields.
                        setCache(FACTORIES_CACHE_KEY, factoriesRes.data || []);
                    }
                }
                if (!signal.aborted) setLoading(false);
                return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                attempts++;
                if (attempts >= 3) {
                    console.error('Error fetching CRM data:', err);
                    showToast('Failed to fetch orders', 'error');
                    setLoading(false);
                }
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, [user, org?.ownerId]);

    useEffect(() => {
        fetchData();
        return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, [fetchData]);

    const factoryMap = useMemo(() => {
        const map = new Map<string, Factory>();
        allFactories.forEach(f => map.set(f.id, f));
        return map;
    }, [allFactories]);

    const allOrders = useMemo(() => Object.entries(crmData), [crmData]);

    const stats = useMemo(() => {
        const orders = Object.values(crmData);
        const totalOrders = orders.length;
        const activeOrders = orders.filter(o => !COMPLETED_STATUSES.includes(o.status || '')).length;
        const completedOrders = orders.filter(o => COMPLETED_STATUSES.includes(o.status || '')).length;

        const totalUnits = orders.reduce((acc, o) => {
            if (o.products?.length) return acc + o.products.reduce((s, p) => s + (p.quantity || 0), 0);
            const m = o.product.match(/(\d+)/);
            return acc + (m ? parseInt(m[1], 10) : 0);
        }, 0);

        const delayedOrders = orders.filter(o =>
            o.tasks?.some(t => t.status !== 'COMPLETE' && t.plannedEndDate && new Date(t.plannedEndDate) < new Date())
        ).length;

        const statusCounts: Record<string, number> = {};
        orders.forEach(o => { const s = o.status || 'Pending'; statusCounts[s] = (statusCounts[s] || 0) + 1; });
        const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

        const factoryLoad: Record<string, number> = {};
        orders.forEach(o => {
            const fName = allFactories.find(f => f.id === o.factoryId)?.name || 'Unknown Factory';
            factoryLoad[fName] = (factoryLoad[fName] || 0) + 1;
        });
        const factoryData = Object.entries(factoryLoad)
            .map(([name, orders]) => ({ name, orders }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        const timelineData = orders
            .filter(o => !['Completed', 'Shipped', 'Cancelled'].includes(o.status || ''))
            .map(o => {
                let start = o.createdAt ? new Date(o.createdAt) : new Date();
                if (o.tasks?.length) {
                    const earliest = o.tasks.reduce((min, t) => {
                        const d = t.plannedStartDate ? new Date(t.plannedStartDate) : null;
                        return (d && d < min) ? d : min;
                    }, new Date(8640000000000000));
                    if (earliest.getTime() !== 8640000000000000) start = earliest;
                }
                let end = new Date(start); end.setDate(end.getDate() + 30);
                if (o.tasks?.length) {
                    const latest = o.tasks.reduce((max, t) => {
                        const d = t.plannedEndDate ? new Date(t.plannedEndDate) : null;
                        return (d && d > max) ? d : max;
                    }, new Date(-8640000000000000));
                    if (latest.getTime() !== -8640000000000000) end = latest;
                }
                return { id: o.id, product: o.product, customer: o.customer, start, end, status: o.status };
            })
            .sort((a, b) => a.end.getTime() - b.end.getTime());

        // Monthly order volume (last 6 months)
        const monthlyMap: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
            const key = d.toLocaleString('default', { month: 'short' });
            monthlyMap[key] = 0;
        }
        orders.forEach(o => {
            if (!o.createdAt) return;
            const d = new Date(o.createdAt);
            const key = d.toLocaleString('default', { month: 'short' });
            if (key in monthlyMap) monthlyMap[key]++;
        });
        const monthlyVolumeData = Object.entries(monthlyMap).map(([month, orders]) => ({ month, orders }));

        // Upcoming deadlines (next 30 days)
        const now = new Date();
        const in30 = new Date(); in30.setDate(in30.getDate() + 30);
        const upcomingDeadlines = timelineData
            .filter(item => item.end >= now && item.end <= in30)
            .slice(0, 5)
            .map(item => ({ ...item, due: item.end }));

        return { totalOrders, activeOrders, completedOrders, totalUnits, delayedOrders, statusData, factoryData, timelineData, monthlyVolumeData, upcomingDeadlines };
    }, [crmData, allFactories]);

    const filteredOrders = useMemo(() => {
        let orders = allOrders;
        switch (topTab) {
            case 'active':
                orders = orders.filter(([, o]) => ACTIVE_STATUSES.includes(o.status || 'In Production'));
                break;
            case 'completed':
                orders = orders.filter(([, o]) => COMPLETED_STATUSES.includes(o.status || 'In Production'));
                break;
            case 'insights':
                return [];
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            orders = orders.filter(([id, o]) =>
                o.product.toLowerCase().includes(q) ||
                o.customer.toLowerCase().includes(q) ||
                id.toLowerCase().includes(q) ||
                o.products?.some(p => p.name.toLowerCase().includes(q))
            );
        }
        return orders;
    }, [allOrders, topTab, searchQuery]);

    const tabCounts = useMemo(() => ({
        active: allOrders.filter(([, o]) => ACTIVE_STATUSES.includes(o.status || 'In Production')).length,
        all: allOrders.length,
        completed: allOrders.filter(([, o]) => COMPLETED_STATUSES.includes(o.status || 'In Production')).length,
    }), [allOrders]);

    if (selectedOrderKey && crmData[selectedOrderKey]) {
        return (
            <CrmOrderDetail
                orderId={selectedOrderKey}
                order={crmData[selectedOrderKey]}
                allFactories={allFactories}
                handleSetCurrentPage={handleSetCurrentPage}
                onBack={() => setSelectedOrderKey(null)}
                callGeminiAPI={callGeminiAPI}
                darkMode={darkMode}
                supabase={supabase}
            />
        );
    }

    const tabs: { key: TopTab; label: string; count?: number; icon: React.ReactNode }[] = [
        { key: 'active', label: 'Active Orders', count: tabCounts.active, icon: <Package size={16} /> },
        { key: 'all', label: 'All Orders', count: tabCounts.all, icon: <Inbox size={16} /> },
        { key: 'completed', label: 'Completed', count: tabCounts.completed, icon: <CheckCircle2 size={16} /> },
        { key: 'insights', label: 'Insights', icon: <LayoutDashboard size={16} /> },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">CRM Portal</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Track orders, manage tasks, and monitor production
                    </p>
                </div>
                {topTab !== 'insights' && (
                    <div className="relative w-full sm:w-72">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/30 focus:border-[#c20c0b] dark:focus:border-red-500 text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all"
                        />
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setTopTab(tab.key); analyticsService.track('crm_tab_view', { tab: tab.key }); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                            topTab === tab.key
                                ? 'bg-gradient-to-r from-[#c20c0b] to-red-600 text-white shadow-lg shadow-red-500/20'
                                : 'bg-white dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                topTab === tab.key
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <KnittingPreloader />
            ) : topTab === 'insights' ? (
                <AggregateStatsView stats={stats} darkMode={darkMode} />
            ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        {topTab === 'completed' ? <CheckCircle2 size={28} className="text-gray-400" /> : <Package size={28} className="text-gray-400" />}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
                        {searchQuery ? 'No orders found' : topTab === 'active' ? 'No Active Orders' : topTab === 'completed' ? 'No Completed Orders' : 'No Orders Yet'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                        {searchQuery
                            ? `No orders match "${searchQuery}". Try a different search term.`
                            : topTab === 'active'
                                ? 'Orders that are pending, in production, or under quality check will appear here.'
                                : topTab === 'completed'
                                    ? 'Orders that have been shipped or completed will appear here.'
                                    : 'Place an order to get started with production tracking.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredOrders.map(([orderId, order], index) => (
                        <CrmOrderCard
                            key={orderId}
                            orderId={orderId}
                            order={order}
                            factory={factoryMap.get(order.factoryId)}
                            index={index}
                            onClick={() => { setSelectedOrderKey(orderId); analyticsService.track('crm_order_view', { order_id: orderId }); }}
                            onAISummary={() => setSelectedOrderKey(orderId)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
