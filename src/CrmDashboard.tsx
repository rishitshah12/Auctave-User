import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { crmService } from './crm.service';
import { factoryService } from './factory.service';
import { quoteService } from './quote.service';
import { CrmOrder, Factory } from './types';
import { normalizeOrder } from './utils';
import {
    Package, Inbox, CheckCircle2, Search, LayoutDashboard,
    Shirt, Activity, Scissors, Ruler, Scroll, TrendingUp, Calendar
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import CrmOrderCard from './CrmOrderCard';
import CrmOrderDetail from './CrmOrderDetail';
import { supabase } from './supabaseClient';

interface CrmDashboardProps {
    callGeminiAPI: (prompt: string) => Promise<string>;
    handleSetCurrentPage: (page: string, data?: any) => void;
    user: any;
    darkMode?: boolean;
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

const AggregateStatsView = ({ stats, darkMode }: { stats: any; darkMode?: boolean }) => {
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const getTimelineProgress = (start: Date, end: Date) => {
        const now = new Date();
        const total = end.getTime() - start.getTime();
        if (total <= 0) return 100;
        return Math.max(0, Math.min(100, ((now.getTime() - start.getTime()) / total) * 100));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                    title="Total Orders"
                    value={stats.totalOrders}
                    subtitle="Across all stages"
                    icon={<Scissors className="text-white" size={22} />}
                    gradient="from-amber-500 to-orange-600"
                />
            </div>

            {/* Charts */}
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
                    <div className="h-72 w-full">
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
                    <div className="h-72 w-full">
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

            {/* Production Timeline */}
            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                    <Calendar size={120} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                        <Calendar size={18} />
                    </div>
                    Production Schedule
                </h3>
                <div className="space-y-5">
                    {stats.timelineData.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-4">No active production schedules.</p>
                    ) : (
                        stats.timelineData.slice(0, 5).map((item: any) => {
                            const progress = getTimelineProgress(item.start, item.end);
                            const isDelayed = new Date() > item.end && progress < 100;
                            return (
                                <div key={item.id}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-700 dark:text-gray-200">{item.product}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">• {item.customer}</span>
                                        </div>
                                        <span className={`text-xs font-medium ${isDelayed ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {isDelayed ? 'Overdue' : `Due ${item.end.toLocaleDateString()}`}
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative shadow-inner">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${isDelayed ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                            style={{ width: `${progress}%` }}
                                        >
                                            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.5) 5px, rgba(255,255,255,0.5) 10px)' }} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
                                        <span>Started {item.start.toLocaleDateString()}</span>
                                        <span>{Math.round(progress)}% Complete</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default function CrmDashboard({ callGeminiAPI, handleSetCurrentPage, user, darkMode }: CrmDashboardProps) {
    const ORDERS_CACHE_KEY = 'garment_erp_client_orders';
    const FACTORIES_CACHE_KEY = 'garment_erp_crm_factories';

    const [crmData, setCrmData] = useState<{ [key: string]: CrmOrder }>(() => {
        const cached = sessionStorage.getItem(ORDERS_CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    });
    const [allFactories, setAllFactories] = useState<Factory[]>(() => {
        const cached = sessionStorage.getItem(FACTORIES_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [loading, setLoading] = useState(() => !sessionStorage.getItem(ORDERS_CACHE_KEY));
    const [topTab, setTopTab] = useState<TopTab>('active');
    const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(null);
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
                    // Fetch factories directly to bypass service permission checks (client-side access)
                    const factoriesPromise = supabase.from('factories').select('*').abortSignal(signal).then(({ data, error }) => {
                        if (error) return { data: null, error };
                        const transformed = data?.map((f: any) => ({
                            id: f.id,
                            name: f.name,
                            location: f.location,
                            description: f.description,
                            rating: f.rating,
                            turnaround: f.turnaround,
                            minimumOrderQuantity: f.minimum_order_quantity,
                            offer: f.offer,
                            imageUrl: f.cover_image_url,
                            gallery: f.gallery || [],
                            tags: f.tags || [],
                            certifications: f.certifications || [],
                            specialties: f.specialties || [],
                            machineSlots: f.machine_slots || [],
                            catalog: f.catalog || { productCategories: [], fabricOptions: [] }
                        })) || [];
                        return { data: transformed, error: null };
                    });

                    const [ordersRes, quotesRes, factoriesRes] = await Promise.race([
                        Promise.all([
                            crmService.getOrdersByClient(user.id),
                            quoteService.getQuotesByUser(user.id),
                            factoriesPromise,
                        ]),
                        timeoutPromise
                    ]) as any;

                    if (ordersRes.error) throw ordersRes.error;
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
                        setCrmData(mappedData);
                        sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(mappedData));
                    }
                    if (!signal.aborted) {
                        setAllFactories(factoriesRes.data || []);
                        sessionStorage.setItem(FACTORIES_CACHE_KEY, JSON.stringify(factoriesRes.data || []));
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
    }, [user]);

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

        return { totalOrders, activeOrders, completedOrders, totalUnits, delayedOrders, statusData, factoryData, timelineData };
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
                        onClick={() => setTopTab(tab.key)}
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
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c20c0b] mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading your orders...</p>
                </div>
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
                            onClick={() => setSelectedOrderKey(orderId)}
                            onAISummary={() => setSelectedOrderKey(orderId)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
