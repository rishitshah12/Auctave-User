import React, { useState, useEffect, FC, useRef, useCallback } from 'react';
import { MainLayout } from './MainLayout';
import { crmService } from './crm.service';
import { userService } from './user.service';
import { factoryService } from './factory.service';
import { Plus, Trash2, Edit, X, ChevronDown, Info, List, LayoutDashboard, ClipboardCheck, PieChart as PieChartIcon, GanttChartSquare, ArrowLeft, Package } from 'lucide-react';
import { DashboardView, ListView, BoardView, GanttChartView, TNAView, OrderDetailsView } from './CRMPage';
import { CrmProduct } from './types';
import { normalizeOrder, computeProductName } from './utils';
import { ManageOrderModal } from './ManageOrderModal';

interface AdminCRMPageProps {
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
    supabase: any;
    darkMode?: boolean;
}

export const AdminCRMPage: FC<AdminCRMPageProps> = ({ supabase, ...props }) => {
    const CLIENTS_CACHE_KEY = 'garment_erp_admin_clients';
    const FACTORIES_CACHE_KEY = 'garment_erp_admin_crm_factories';

    const [clients, setClients] = useState<any[]>(() => {
        const cached = sessionStorage.getItem(CLIENTS_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [factories, setFactories] = useState<any[]>(() => {
        const cached = sessionStorage.getItem(FACTORIES_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [activeView, setActiveView] = useState('Overview');
    const [activeOrderKey, setActiveOrderKey] = useState<string | null>(null);
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [newOrderData, setNewOrderData] = useState({
        product_name: '',
        factory_id: '',
        status: 'Pending',
        tasks: [] as any[],
        documents: [] as any[],
        products: [] as CrmProduct[]
    });
    const ordersAbortController = useRef<AbortController | null>(null);
    const mountAbortController = useRef<AbortController | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    const fetchOrders = useCallback(async () => {
        if (!selectedClientId) {
            setOrders([]);
            setActiveOrderKey(null);
            return;
        }

        if (ordersAbortController.current) ordersAbortController.current.abort();
        ordersAbortController.current = new AbortController();
        const signal = ordersAbortController.current.signal;

        const ORDERS_CACHE_KEY = `garment_erp_admin_orders_${selectedClientId}`;
        const cached = sessionStorage.getItem(ORDERS_CACHE_KEY);

        if (cached) {
            setOrders(JSON.parse(cached));
        } else {
            setIsLoading(true);
        }

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
                const { data, error } = await Promise.race([crmService.getOrdersByClient(selectedClientId), timeoutPromise]) as any;

                if (error) throw error;

                if (!signal.aborted) {
                    const ordersData = data || [];
                    setOrders(ordersData);
                    sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(ordersData));

                    setActiveOrderKey(prev => {
                        const exists = ordersData.find((o: any) => o.id === prev);
                        return exists ? prev : (ordersData.length > 0 ? ordersData[0].id : null);
                    });
                    setIsLoading(false);
                }
                return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                attempts++;
                if (attempts >= 3) {
                    showToast('Failed to fetch orders', 'error');
                    setIsLoading(false);
                }
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, [selectedClientId]);

    useEffect(() => {
        if (mountAbortController.current) mountAbortController.current.abort();
        mountAbortController.current = new AbortController();
        const signal = mountAbortController.current.signal;

        const fetchInitialData = async () => {
            try {
                const { data: clientsData, error: clientsError } = await userService.getAll();
                if (!signal.aborted) {
                    if (clientsError) showToast('Failed to fetch clients: ' + clientsError.message, 'error');
                    else {
                        setClients(clientsData || []);
                        sessionStorage.setItem(CLIENTS_CACHE_KEY, JSON.stringify(clientsData || []));
                    }
                }

                const { data: factoriesData } = await factoryService.getAll();
                if (!signal.aborted) {
                    setFactories(factoriesData || []);
                    sessionStorage.setItem(FACTORIES_CACHE_KEY, JSON.stringify(factoriesData || []));
                }
            } catch (err) {
                console.error("Error fetching initial data", err);
            }
        };

        fetchInitialData();

        return () => {
            if (mountAbortController.current) mountAbortController.current.abort();
        };
    }, []);

    useEffect(() => {
        fetchOrders();
        return () => {
            if (ordersAbortController.current) ordersAbortController.current.abort();
        };
    }, [fetchOrders]);

    const handleEditOrder = (order: any) => {
        setEditingOrder(JSON.parse(JSON.stringify(order)));
        setIsModalOpen(true);
    };

    const handleSaveOrder = async () => {
        if (!editingOrder) return;

        const updates = {
            status: editingOrder.status,
            tasks: editingOrder.tasks,
            documents: editingOrder.documents,
            products: editingOrder.products || [],
            product_name: computeProductName(editingOrder.products),
            updated_at: new Date().toISOString()
        };

        const { error } = await crmService.update(editingOrder.id, updates);
        if (error) {
            showToast('Failed to update order: ' + error.message, 'error');
        } else {
            showToast('Order updated successfully');
            setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...updates } : o));
            setIsModalOpen(false);
        }
    };

    const addNewOrderProduct = () => {
        const newProduct: CrmProduct = { id: Date.now().toString(), name: '', status: 'Pending' };
        setNewOrderData({ ...newOrderData, products: [...newOrderData.products, newProduct] });
    };

    const updateNewOrderProduct = (index: number, field: string, value: any) => {
        const updated = [...newOrderData.products];
        updated[index] = { ...updated[index], [field]: value };
        setNewOrderData({ ...newOrderData, products: updated });
    };

    const removeNewOrderProduct = (index: number) => {
        const updated = [...newOrderData.products];
        updated.splice(index, 1);
        setNewOrderData({ ...newOrderData, products: updated });
    };

    const handleSelectProduct = (productId: string) => {
        setSelectedProductId(productId);
        setActiveView('List');
    };
    const handleBackToOverview = () => {
        setSelectedProductId(null);
        setActiveView('Overview');
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;

        const { error } = await crmService.delete(orderId);
        if (error) {
            showToast('Failed to delete order: ' + error.message, 'error');
        } else {
            showToast('Order deleted successfully');
            setOrders(prev => prev.filter(o => o.id !== orderId));
            if (activeOrderKey === orderId) setActiveOrderKey(null);
        }
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrderData.factory_id) {
            showToast('Please select a factory', 'error');
            return;
        }
        const products = newOrderData.products.length > 0
            ? newOrderData.products.filter(p => p.name.trim())
            : newOrderData.product_name
                ? [{ id: Date.now().toString(), name: newOrderData.product_name, status: 'Pending' as const }]
                : [];

        if (products.length === 0) {
            showToast('Please add at least one product', 'error');
            return;
        }

        const firstProductId = products[0].id;
        const payload = {
            client_id: selectedClientId,
            product_name: computeProductName(products),
            factory_id: newOrderData.factory_id,
            status: newOrderData.status,
            products,
            tasks: [
                { id: Date.now(), name: 'Order Confirmation', status: 'TO DO', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date().toISOString().split('T')[0], responsible: 'Admin', productId: firstProductId },
                { id: Date.now() + 1, name: 'Fabric Sourcing', status: 'TO DO', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], responsible: 'Merch Team', productId: firstProductId }
            ],
            documents: []
        };

        const { error } = await crmService.create(payload);
        if (error) {
             showToast(error.message, 'error');
        } else {
             showToast('Order created successfully');
             setIsCreateOrderOpen(false);
             setNewOrderData({ product_name: '', factory_id: '', status: 'Pending', tasks: [], documents: [], products: [] });
             const { data } = await crmService.getOrdersByClient(selectedClientId);
             setOrders(data || []);
             if (data && data.length > 0) setActiveOrderKey(data[0].id);
        }
    };

    const handleTaskUpdate = async (taskId: number, newStart: string, newEnd: string) => {
        if (!activeOrderKey) return;

        const orderIndex = orders.findIndex(o => o.id === activeOrderKey);
        if (orderIndex === -1) return;

        const updatedOrders = [...orders];
        const order = { ...updatedOrders[orderIndex], tasks: [...updatedOrders[orderIndex].tasks] };
        updatedOrders[orderIndex] = order;
        const taskIndex = order.tasks.findIndex((t: any) => t.id === taskId);

        if (taskIndex === -1) return;

        order.tasks[taskIndex] = { ...order.tasks[taskIndex], plannedStartDate: newStart, plannedEndDate: newEnd };

        setOrders(updatedOrders);

        const { error } = await crmService.update(order.id, { tasks: order.tasks });
        if (error) {
            showToast('Failed to update task date: ' + error.message, 'error');
            fetchOrders();
        }
    };

    const activeOrder = orders.find(o => o.id === activeOrderKey);
    const transformedOrder = activeOrder ? {
        ...normalizeOrder(activeOrder),
        customer: clients.find(c => c.id === selectedClientId)?.name || 'Unknown Client',
    } : null;

    const overviewViews = [
        { name: 'Overview', icon: <Info size={16}/> },
        { name: 'TNA', icon: <ClipboardCheck size={16}/> },
        { name: 'Dashboard', icon: <PieChartIcon size={16}/> },
    ];
    const productViews = [
        { name: 'List', icon: <List size={16}/> },
        { name: 'Board', icon: <LayoutDashboard size={16}/> },
        { name: 'Gantt', icon: <GanttChartSquare size={16}/> },
    ];
    const currentViews = selectedProductId ? productViews : overviewViews;

    const selectedProduct = selectedProductId && transformedOrder?.products
        ? transformedOrder.products.find(p => p.id === selectedProductId) || null
        : null;

    const filteredTasks = transformedOrder
        ? (selectedProductId ? transformedOrder.tasks.filter(t => t.productId === selectedProductId) : transformedOrder.tasks)
        : [];

    return (
        <MainLayout {...props}>
            <header className="mb-8 relative">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6 sm:p-8 shadow-2xl border border-white/5">
                    <div className="absolute top-0 left-0 w-72 h-72 bg-red-500/30 rounded-full filter blur-3xl animate-blob"></div>
                    <div className="absolute top-10 right-10 w-64 h-64 bg-pink-500/30 rounded-full filter blur-3xl animate-blob-delay-2"></div>
                    <div className="absolute -bottom-10 left-1/3 w-56 h-56 bg-purple-500/30 rounded-full filter blur-3xl animate-blob-delay-4"></div>

                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-[#c20c0b] to-red-600 rounded-xl shadow-lg">
                                    <ClipboardCheck className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                                    Admin <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent animate-gradient-x font-black">CRM</span>
                                </h1>
                            </div>
                            <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-2xl">
                                Manage client orders, timelines, and documents across the platform.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 mb-8 transition-all duration-300 hover:shadow-xl">
                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2 uppercase tracking-wide">Select Client to Manage</label>
                <div className="relative">
                    <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full p-3 pl-4 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#c20c0b] focus:outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white appearance-none transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <option value="">-- Choose a Client --</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name} ({client.company_name})</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
                        <ChevronDown size={18} />
                    </div>
                </div>
            </div>

            {selectedClientId && (
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-white/10">
                    {isLoading ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c20c0b] mb-4"></div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading orders...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Active Orders</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">This client has no active orders yet. You can start a new order for them.</p>
                            <button
                                onClick={() => setIsCreateOrderOpen(true)}
                                className="bg-gradient-to-r from-[#c20c0b] to-red-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                            >
                                <Plus size={20} /> Start New Order
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="border-b border-gray-200 dark:border-white/10 pb-4 mb-4">
                                <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-3">
                                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                                        {orders.map(order => (
                                            <button
                                                key={order.id}
                                                onClick={() => { setActiveOrderKey(order.id); setSelectedProductId(null); setActiveView('Overview'); }}
                                                className={`flex-shrink-0 py-2.5 px-5 font-semibold text-sm rounded-xl transition-all duration-300 ${
                                                    activeOrderKey === order.id
                                                        ? 'bg-gradient-to-r from-[#c20c0b] to-red-600 text-white shadow-lg shadow-red-500/25 scale-105'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                                                }`}
                                            >
                                                <Package size={14} className="inline mr-1.5" />
                                                {order.product_name}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedProductId && selectedProduct && (
                                            <button onClick={handleBackToOverview} className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#c20c0b] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200">
                                                <ArrowLeft size={14} />
                                                <span className="hidden sm:inline">Back</span>
                                            </button>
                                        )}
                                        {selectedProduct && (
                                            <span className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[150px]">{selectedProduct.name}</span>
                                        )}
                                        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl p-1 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
                                            {currentViews.map(view => (
                                                <button
                                                    key={view.name}
                                                    onClick={() => setActiveView(view.name)}
                                                    className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                                        activeView === view.name
                                                            ? 'bg-white dark:bg-gray-700 text-[var(--color-primary)] dark:text-white shadow-md scale-105'
                                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                                                    }`}
                                                >
                                                    {view.icon} <span className="hidden sm:inline">{view.name}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                        <button
                                            onClick={() => setIsCreateOrderOpen(true)}
                                            className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-300 shadow-sm hover:shadow-md"
                                            title="New Order"
                                        >
                                            <Plus size={18} />
                                        </button>
                                        <button
                                            onClick={() => activeOrder && handleEditOrder(activeOrder)}
                                            className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-300 shadow-sm hover:shadow-md"
                                            title="Manage Order"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => activeOrder && handleDeleteOrder(activeOrder.id)}
                                            className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-300 shadow-sm hover:shadow-md"
                                            title="Delete Order"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {transformedOrder && (
                                <div className="animate-fade-in">
                                    {activeView === 'Overview' && <OrderDetailsView order={transformedOrder} allFactories={factories} handleSetCurrentPage={props.handleSetCurrentPage} onSelectProduct={handleSelectProduct} />}
                                    {activeView === 'TNA' && <TNAView tasks={transformedOrder.tasks} />}
                                    {activeView === 'Dashboard' && <DashboardView tasks={transformedOrder.tasks} orderKey={activeOrderKey || ''} orderDetails={transformedOrder} darkMode={props.darkMode} />}
                                    {activeView === 'List' && <ListView tasks={filteredTasks} />}
                                    {activeView === 'Board' && <BoardView tasks={filteredTasks} />}
                                    {activeView === 'Gantt' && <GanttChartView tasks={filteredTasks} onTaskUpdate={handleTaskUpdate} />}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {isCreateOrderOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white/90 backdrop-blur-xl dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-white/10">
                        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Start New Order</h2>
                            <button onClick={() => setIsCreateOrderOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white">Products</label>
                                    <button type="button" onClick={addNewOrderProduct} className="text-sm text-[#c20c0b] font-semibold flex items-center gap-1 hover:text-[#a50a09]"><Plus size={14}/> Add Product</button>
                                </div>
                                {newOrderData.products.length === 0 ? (
                                    <div>
                                        <input
                                            type="text"
                                            value={newOrderData.product_name}
                                            onChange={e => setNewOrderData({...newOrderData, product_name: e.target.value})}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g. 5000 Cotton T-Shirts"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Or click "Add Product" to add multiple products</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {newOrderData.products.map((product, idx) => (
                                            <div key={product.id} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                                                <Package size={14} className="text-gray-400 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    value={product.name}
                                                    onChange={e => updateNewOrderProduct(idx, 'name', e.target.value)}
                                                    className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    placeholder="Product name"
                                                />
                                                <button type="button" onClick={() => removeNewOrderProduct(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Assign Factory</label>
                                <select
                                    required
                                    value={newOrderData.factory_id}
                                    onChange={e => setNewOrderData({...newOrderData, factory_id: e.target.value})}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">-- Select Factory --</option>
                                    {factories.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Initial Status</label>
                                <select
                                    value={newOrderData.status}
                                    onChange={e => setNewOrderData({...newOrderData, status: e.target.value})}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option>Pending</option>
                                    <option>In Production</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/10">
                                <button type="button" onClick={() => setIsCreateOrderOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] shadow-md">Create Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isModalOpen && editingOrder && (
                <ManageOrderModal
                    editingOrder={editingOrder}
                    setEditingOrder={setEditingOrder}
                    onSave={handleSaveOrder}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </MainLayout>
    );
};