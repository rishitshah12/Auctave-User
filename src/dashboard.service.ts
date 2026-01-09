import { supabase } from './supabaseClient';

export interface DashboardStats {
    totalClients: number;
    totalFactories: number;
    totalTrending: number;
    activeOrders: number;
    totalRevenue: string;
}

export const dashboardService = {
    async getStats(): Promise<DashboardStats> {
        try {
            const [clients, factories, trending] = await Promise.all([
                supabase.from('clients').select('*', { count: 'exact', head: true }),
                supabase.from('factories').select('*', { count: 'exact', head: true }),
                supabase.from('trending_items').select('*', { count: 'exact', head: true })
            ]);

            return {
                totalClients: clients.count || 0,
                totalFactories: factories.count || 0,
                totalTrending: trending.count || 0,
                activeOrders: 342, // Mock data until Orders module is implemented
                totalRevenue: '$4.2M' // Mock data
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return {
                totalClients: 0, totalFactories: 0, totalTrending: 0, activeOrders: 0, totalRevenue: '$0'
            };
        }
    }
};