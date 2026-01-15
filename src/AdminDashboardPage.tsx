import React, { useEffect, useState, FC } from 'react';
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
    const [stats, setStats] = useState<DashboardStats>({
        totalClients: 0,
        totalFactories: 0,
        totalTrending: 0,
        activeOrders: 0,
        totalRevenue: '$0'
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            const data = await dashboardService.getStats();
            setStats(data);
            setIsLoading(false);
        };
        fetchStats();
    }, []);

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
                    <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Real-time overview of platform activity.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{isLoading ? '...' : stat.value}</p>
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