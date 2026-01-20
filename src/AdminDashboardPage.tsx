import React, { useEffect, useState, FC, useRef, useCallback } from 'react';
import { Users, Package, DollarSign, Activity, Building, Flame } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { dashboardService, DashboardStats } from './dashboard.service';

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

export const AdminDashboardPage: FC<AdminDashboardPageProps> = (props) => {
    const CACHE_KEY = 'garment_erp_admin_stats';
    const [stats, setStats] = useState<DashboardStats>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {
        totalClients: 0,
        totalFactories: 0,
        totalTrending: 0,
        activeOrders: 0,
        totalRevenue: '$0'
        };
    });
    const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem(CACHE_KEY));
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchStats = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const hasCache = !!sessionStorage.getItem(CACHE_KEY);
        if (!hasCache) setIsLoading(true);

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000));
                const requestPromise = dashboardService.getStats();
                
                const data = await Promise.race([
                    requestPromise,
                    timeoutPromise,
                    new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
                ]) as DashboardStats;

                if (!signal.aborted) {
                    setStats(data);
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
                    setIsLoading(false);
                }
                return;
            } catch (error: any) {
                if (error.name === 'AbortError') return;
                attempts++;
                if (attempts >= 3) setIsLoading(false);
                await new Promise(r => setTimeout(r, 1000 * attempts)); // Backoff
            }
        }
    }, []);

    useEffect(() => {
        fetchStats();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchStats]);

    const statCards = [
        { title: 'Total Clients', value: stats.totalClients, icon: <Users className="text-blue-600" />, color: 'bg-blue-100' },
        { title: 'Total Factories', value: stats.totalFactories, icon: <Building className="text-[#c20c0b]" />, color: 'bg-red-100' },
        { title: 'Trending Items', value: stats.totalTrending, icon: <Flame className="text-orange-600" />, color: 'bg-orange-100' },
        { title: 'Total Revenue', value: stats.totalRevenue, icon: <DollarSign className="text-green-600" />, color: 'bg-green-100' },
    ];

    return (
        <MainLayout {...props}>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Real-time overview of platform activity.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <div key={index} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-200">{stat.title}</p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{isLoading ? '...' : stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.color}`}>
                                {stat.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </MainLayout>
    );
};