import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { crmService } from './crm.service';
import { factoryService } from './factory.service';
import { CrmOrder, Factory } from './types';
import { normalizeOrder } from './utils';
import { Package, Inbox, CheckCircle2, Search } from 'lucide-react';
import CrmOrderCard from './CrmOrderCard';
import CrmOrderDetail from './CrmOrderDetail';

interface CrmDashboardProps {
    callGeminiAPI: (prompt: string) => Promise<string>;
    handleSetCurrentPage: (page: string, data?: any) => void;
    user: any;
    darkMode?: boolean;
}

type TopTab = 'active' | 'all' | 'completed';

const ACTIVE_STATUSES = ['Pending', 'In Production', 'Quality Check'];
const COMPLETED_STATUSES = ['Shipped', 'Completed'];

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
        if (window.showToast) window.showToast(message, type);
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
                    const { data: orders, error: orderError } = await Promise.race([crmService.getOrdersByClient(user.id), timeoutPromise]) as any;
                    if (orderError) throw orderError;
                    if (orders) {
                        const mappedData: { [key: string]: CrmOrder } = {};
                        orders.forEach((order: any) => {
                            const normalized = normalizeOrder(order);
                            mappedData[order.id] = {
                                ...normalized,
                                customer: 'My Order',
                            };
                        });
                        setCrmData(mappedData);
                        sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(mappedData));
                    }

                    const { data: factories } = await Promise.race([factoryService.getAll(), timeoutPromise]) as any;
                    if (!signal.aborted) {
                        setAllFactories(factories || []);
                        sessionStorage.setItem(FACTORIES_CACHE_KEY, JSON.stringify(factories || []));
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
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchData]);

    const factoryMap = useMemo(() => {
        const map = new Map<string, Factory>();
        allFactories.forEach(f => map.set(f.id, f));
        return map;
    }, [allFactories]);

    const allOrders = useMemo(() => Object.entries(crmData), [crmData]);

    const filteredOrders = useMemo(() => {
        let orders = allOrders;

        // Filter by tab
        switch (topTab) {
            case 'active':
                orders = orders.filter(([, order]) => {
                    const s = order.status || 'In Production';
                    return ACTIVE_STATUSES.includes(s);
                });
                break;
            case 'completed':
                orders = orders.filter(([, order]) => {
                    const s = order.status || 'In Production';
                    return COMPLETED_STATUSES.includes(s);
                });
                break;
        }

        // Filter by search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            orders = orders.filter(([id, order]) =>
                order.product.toLowerCase().includes(q) ||
                order.customer.toLowerCase().includes(q) ||
                id.toLowerCase().includes(q) ||
                order.products?.some(p => p.name.toLowerCase().includes(q))
            );
        }

        return orders;
    }, [allOrders, topTab, searchQuery]);

    const tabCounts = useMemo(() => ({
        active: allOrders.filter(([, o]) => ACTIVE_STATUSES.includes(o.status || 'In Production')).length,
        all: allOrders.length,
        completed: allOrders.filter(([, o]) => COMPLETED_STATUSES.includes(o.status || 'In Production')).length,
    }), [allOrders]);

    // If selected order exists, show detail view
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
            />
        );
    }

    const tabs: { key: TopTab; label: string; count: number; icon: React.ReactNode }[] = [
        { key: 'active', label: 'Active Orders', count: tabCounts.active, icon: <Package size={16} /> },
        { key: 'all', label: 'All Orders', count: tabCounts.all, icon: <Inbox size={16} /> },
        { key: 'completed', label: 'Completed', count: tabCounts.completed, icon: <CheckCircle2 size={16} /> },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                        CRM Portal
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Track orders, manage tasks, and monitor production
                    </p>
                </div>
                {/* Search */}
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
            </div>

            {/* Top-level tabs */}
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
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            topTab === tab.key
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c20c0b] mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading your orders...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        {topTab === 'completed' ? (
                            <CheckCircle2 size={28} className="text-gray-400" />
                        ) : (
                            <Package size={28} className="text-gray-400" />
                        )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
                        {searchQuery
                            ? 'No orders found'
                            : topTab === 'active'
                                ? 'No Active Orders'
                                : topTab === 'completed'
                                    ? 'No Completed Orders'
                                    : 'No Orders Yet'}
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
