import React, { useState, useEffect, FC } from 'react';
import { MainLayout } from './MainLayout';
import { userService } from './user.service';

interface AdminUsersPageProps {
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

export const AdminUsersPage: FC<AdminUsersPageProps> = (props) => {
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    const fetchClients = async () => {
        setIsLoading(true);
        const { data, error } = await userService.getAll();
        if (error) {
            showToast('Failed to fetch clients: ' + error.message, 'error');
        } else {
            setClients(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleEditClick = (client: any) => {
        setEditingClient(client);
        setIsEditModalOpen(true);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient) return;

        const updates = {
            name: editingClient.name,
            company_name: editingClient.company_name,
            phone: editingClient.phone,
            country: editingClient.country,
            job_role: editingClient.job_role,
            category_specialization: editingClient.category_specialization,
            yearly_est_revenue: editingClient.yearly_est_revenue,
            updated_at: new Date().toISOString(),
        };

        const { error } = await userService.update(editingClient.id, updates);

        if (error) {
            showToast('Failed to update client: ' + error.message, 'error');
        } else {
            setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...updates } : c));
            setIsEditModalOpen(false);
            showToast('Client updated successfully');
        }
    };

    const handleDeleteClient = async (id: string) => {
         if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            const { error } = await userService.delete(id);
            if (error) {
                showToast('Failed to delete client: ' + error.message, 'error');
            } else {
                setClients(prev => prev.filter(c => c.id !== id));
                showToast('Client deleted successfully');
            }
         }
    }

    return (
        <MainLayout {...props}>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage client accounts and permissions.</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading clients...</td></tr>
                                ) : clients.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No clients found.</td></tr>
                                ) : (
                                    clients.map((client) => (
                                        <tr key={client.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.company_name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.job_role || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEditClick(client)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                                <button onClick={() => handleDeleteClient(client.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isEditModalOpen && editingClient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6">Edit Client</h2>
                        <form onSubmit={handleSaveClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div> <label className="block text-sm font-medium text-gray-700 mb-1">Name</label> <input type="text" value={editingClient.name || ''} onChange={e => setEditingClient({...editingClient, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" /> </div>
                            <div> <label className="block text-sm font-medium text-gray-700 mb-1">Company</label> <input type="text" value={editingClient.company_name || ''} onChange={e => setEditingClient({...editingClient, company_name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" /> </div>
                            <div> <label className="block text-sm font-medium text-gray-700 mb-1">Email</label> <input type="email" value={editingClient.email || ''} onChange={e => setEditingClient({...editingClient, email: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" /> </div>
                            <div> <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label> <input type="text" value={editingClient.phone || ''} onChange={e => setEditingClient({...editingClient, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" /> </div>
                            <div> <label className="block text-sm font-medium text-gray-700 mb-1">Country</label> <input type="text" value={editingClient.country || ''} onChange={e => setEditingClient({...editingClient, country: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" /> </div>
                            <div> <label className="block text-sm font-medium text-gray-700 mb-1">Role</label> <input type="text" value={editingClient.job_role || ''} onChange={e => setEditingClient({...editingClient, job_role: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" /> </div>
                            <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};