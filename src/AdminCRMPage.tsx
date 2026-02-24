import React, { useState, useEffect, FC, useRef, useCallback, useMemo } from 'react';
import { MainLayout } from './MainLayout';
import { crmService } from './crm.service';
import { userService } from './user.service';
import { factoryService } from './factory.service';
import {
    Plus, Trash2, X, Info, List, LayoutDashboard, ClipboardCheck,
    PieChart as PieChartIcon, GanttChartSquare, ArrowLeft, Package,
    Search, Building2, Mail, Users, Edit, ChevronRight, ShieldCheck
} from 'lucide-react';
import { DashboardView, ListView, BoardView, GanttChartView, TNAView, OrderDetailsView } from './CRMPage';
import CrmOrderCard from './CrmOrderCard';
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

// ── Client avatar with gradient initials ──────────────────────────────────────
function ClientAvatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
    const initials = name
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const gradients = [
        'from-red-500 to-rose-600',
        'from-blue-500 to-indigo-600',
        'from-emerald-500 to-green-600',
        'from-purple-500 to-violet-600',
        'from-amber-500 to-orange-600',
        'from-cyan-500 to-teal-600',
    ];
    const gradient = gradients[name.charCodeAt(0) % gradients.length];
    const cls = size === 'lg'
        ? 'w-16 h-16 text-xl font-black'
        : 'w-8 h-8 text-xs font-bold';

    return (
        <div className={`${cls} rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
            {initials}
        </div>
    );
}

// ── Client profile banner ──────────────────────────────────────────────────────
function ClientProfileBanner({
    client,
    orderCount,
    activeOrderCount,
    onClear,
}: {
    client: any;
    orderCount: number;
    activeOrderCount: number;
    onClear: () => void;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-5 sm:p-6 shadow-xl border border-white/5 mb-6">
            <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-10 w-40 h-40 bg-purple-500/20 rounded-full filter blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <ClientAvatar name={client.name} size="lg" />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-extrabold text-white truncate">{client.name}</h2>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-full border border-blue-500/30 uppercase tracking-wider">Client</span>
                    </div>
                    {client.company_name && (
                        <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-0.5">
                            <Building2 size={12} /> {client.company_name}
                        </p>
                    )}
                    {client.email && (
                        <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-0.5">
                            <Mail size={12} /> {client.email}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                        <p className="text-2xl font-black text-white">{orderCount}</p>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">Orders</p>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                        <p className="text-2xl font-black text-emerald-400">{activeOrderCount}</p>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">Active</p>
                    </div>
                    <button
                        onClick={onClear}
                        className="ml-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10"
                        title="Change client"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export const AdminCRMPage: FC<AdminCRMPageProps> = ({ supabase, ...props }) => {
    const CLIENTS_CACHE_KEY = 'garment_erp_admin_clients';
    const FACTORIES_CACHE_KEY = 'garment_erp_admin_crm_factories';

    // ── data ──
    const [clients, setClients] = useState<any[]>(() => {
        const cached = sessionStorage.getItem(CLIENTS_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [factories, setFactories] = useState<any[]>(() => {
        const cached = sessionStorage.getItem(FACTORIES_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ── selection ──
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    // ── search ──
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── order detail view ──
    const [activeView, setActiveView] = useState('Overview');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    // ── modals ──
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
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

    // ── filtered search suggestions ────��───────────────────────────────────────
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return clients.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.company_name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.id?.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [searchQuery, clients]);

    // ── close dropdown on outside click ───────────────────────────────────────
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── fetch orders for selected client ──────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        if (!selectedClientId) { setOrders([]); return; }

        if (ordersAbortController.current) ordersAbortController.current.abort();
        ordersAbortController.current = new AbortController();
        const signal = ordersAbortController.current.signal;

        const ORDERS_CACHE_KEY = `garment_erp_admin_orders_${selectedClientId}`;
        const cached = sessionStorage.getItem(ORDERS_CACHE_KEY);
        if (cached) setOrders(JSON.parse(cached));
        else setIsLoading(true);

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
                const { data, error } = await Promise.race([crmService.getOrdersByClient(selectedClientId), timeoutPromise]) as any;
                if (error) throw error;
                if (!signal.aborted) {
                    setOrders(data || []);
                    sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(data || []));
                    setIsLoading(false);
                }
                return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                attempts++;
                if (attempts >= 3) { showToast('Failed to fetch orders', 'error'); setIsLoading(false); }
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, [selectedClientId]);

    // ── initial data fetch ─────────────────────────────────────────────────────
    useEffect(() => {
        if (mountAbortController.current) mountAbortController.current.abort();
        mountAbortController.current = new AbortController();
        const signal = mountAbortController.current.signal;

        (async () => {
            try {
                const { data: clientsData, error } = await userService.getAll();
                if (!signal.aborted) {
                    if (error) showToast('Failed to fetch clients: ' + error.message, 'error');
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
                console.error('Error fetching initial data', err);
            }
        })();

        return () => { if (mountAbortController.current) mountAbortController.current.abort(); };
    }, []);

    useEffect(() => {
        fetchOrders();
        return () => { if (ordersAbortController.current) ordersAbortController.current.abort(); };
    }, [fetchOrders]);

    // ── client selection ───────────────────────────────────────────────────────
    const handleSelectClient = (client: any) => {
        setSelectedClientId(client.id);
        setSearchQuery(client.name);
        setShowDropdown(false);
        setSelectedOrderId(null);
        setSelectedProductId(null);
        setActiveView('Overview');
    };

    const handleClearClient = () => {
        setSelectedClientId('');
        setSearchQuery('');
        setOrders([]);
        setSelectedOrderId(null);
        setSelectedProductId(null);
    };

    // ── order selection ────────────────────────────────────────────────────────
    const handleSelectOrder = (orderId: string) => {
        setSelectedOrderId(orderId);
        setActiveView('Overview');
        setSelectedProductId(null);
    };

    const handleBackToOrders = () => {
        setSelectedOrderId(null);
        setSelectedProductId(null);
        setActiveView('Overview');
    };

    // ── order actions ──────────────────────────────────────────────────────────
    const handleEditOrder = (order: any) => {
        setEditingOrder(JSON.parse(JSON.stringify(order)));
        setIsModalOpen(true);
    };

    const handleSaveOrder = async () => {
        if (!editingOrder) return;

        try {
            let productName = editingOrder.product_name || 'Order';
            try {
                if (editingOrder.products && editingOrder.products.length > 0) {
                    productName = computeProductName(editingOrder.products);
                }
            } catch (e) {
                console.warn("Error computing product name:", e);
            }

            const updates = {
                status: editingOrder.status,
                tasks: editingOrder.tasks,
                documents: editingOrder.documents,
                products: editingOrder.products || [],
                product_name: productName,
                factory_id: editingOrder.factory_id || null,
                updated_at: new Date().toISOString()
            };
            const { error } = await crmService.update(editingOrder.id, updates);
            if (error) {
                showToast('Failed to update order: ' + error.message, 'error');
            } else {
                showToast('Order updated successfully');
                setOrders(prev => {
                    const updatedOrders = prev.map(o => o.id === editingOrder.id ? { ...o, ...updates } : o);
                    const ORDERS_CACHE_KEY = `garment_erp_admin_orders_${selectedClientId}`;
                    sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(updatedOrders));
                    return updatedOrders;
                });
                setIsModalOpen(false);
            }
        } catch (err: any) {
            console.error("Error saving order:", err);
            showToast('An error occurred while saving: ' + err.message, 'error');
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
        const { error } = await crmService.delete(orderId);
        if (error) {
            showToast('Failed to delete order: ' + error.message, 'error');
        } else {
            showToast('Order deleted successfully');
            setOrders(prev => prev.filter(o => o.id !== orderId));
            if (selectedOrderId === orderId) setSelectedOrderId(null);
        }
    };

    const handleTaskUpdate = async (taskId: number, newStart: string, newEnd: string) => {
        if (!selectedOrderId) return;
        const orderIndex = orders.findIndex(o => o.id === selectedOrderId);
        if (orderIndex === -1) return;
        const updatedOrders = [...orders];
        const order = { ...updatedOrders[orderIndex], tasks: [...updatedOrders[orderIndex].tasks] };
        updatedOrders[orderIndex] = order;
        const taskIndex = order.tasks.findIndex((t: any) => t.id === taskId);
        if (taskIndex === -1) return;
        order.tasks[taskIndex] = { ...order.tasks[taskIndex], plannedStartDate: newStart, plannedEndDate: newEnd };
        setOrders(updatedOrders);
        const { error } = await crmService.update(order.id, { tasks: order.tasks });
        if (error) { showToast('Failed to update task date: ' + error.message, 'error'); fetchOrders(); }
    };

    // ── create order ───────────────────────────────────────────────────────────
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

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrderData.factory_id) { showToast('Please select a factory', 'error'); return; }
        const products = newOrderData.products.length > 0
            ? newOrderData.products.filter(p => p.name.trim())
            : newOrderData.product_name
                ? [{ id: Date.now().toString(), name: newOrderData.product_name, status: 'Pending' as const }]
                : [];
        if (products.length === 0) { showToast('Please add at least one product', 'error'); return; }

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
        }
    };

    // ── derived state ──────────────────────────────────────────────────────────
    const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
    const activeOrder = useMemo(() => orders.find(o => o.id === selectedOrderId), [orders, selectedOrderId]);
    const transformedOrder = useMemo(() => activeOrder ? {
        ...normalizeOrder(activeOrder),
        customer: selectedClient?.name || 'Unknown Client',
    } : null, [activeOrder, selectedClient]);

    const activeOrderCount = useMemo(() =>
        orders.filter(o => o.status === 'In Production' || o.status === 'Quality Check').length
    , [orders]);

    const overviewViews = [
        { name: 'Overview', icon: <Info size={16} /> },
        { name: 'TNA', icon: <ClipboardCheck size={16} /> },
        { name: 'Dashboard', icon: <PieChartIcon size={16} /> },
    ];
    const productViews = [
        { name: 'List', icon: <List size={16} /> },
        { name: 'Board', icon: <LayoutDashboard size={16} /> },
        { name: 'Gantt', icon: <GanttChartSquare size={16} /> },
    ];
    const currentViews = selectedProductId ? productViews : overviewViews;

    const selectedProduct = selectedProductId && transformedOrder?.products
        ? transformedOrder.products.find(p => p.id === selectedProductId) || null
        : null;
    const filteredTasks = transformedOrder
        ? (selectedProductId ? transformedOrder.tasks.filter(t => t.productId === selectedProductId) : transformedOrder.tasks)
        : [];

    // ── render ─────────────────────────────────────────────────────────────────
    return (
        <MainLayout {...props}>
            {/* ── Header ── */}
            <header className="mb-8 relative">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6 sm:p-8 shadow-2xl border border-white/5">
                    <div className="absolute top-0 left-0 w-72 h-72 bg-red-500/30 rounded-full filter blur-3xl animate-blob pointer-events-none" />
                    <div className="absolute top-10 right-10 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl animate-blob-delay-2 pointer-events-none" />
                    <div className="absolute -bottom-10 left-1/3 w-56 h-56 bg-purple-500/20 rounded-full filter blur-3xl animate-blob-delay-4 pointer-events-none" />
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-gradient-to-br from-[#c20c0b] to-red-600 rounded-xl shadow-lg">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                                    Admin <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent font-black">CRM</span>
                                </h1>
                            </div>
                            <p className="text-gray-400 mt-1 text-sm sm:text-base max-w-2xl">
                                Search any client, review their profile, and manage all orders in one place.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                            <Users size={16} className="text-gray-500" />
                            <span><span className="text-white font-bold">{clients.length}</span> clients</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Search Bar ── */}
            <div ref={searchRef} className="relative mb-6">
                <div className={`flex items-center gap-3 bg-white dark:bg-gray-900/60 border-2 rounded-2xl px-4 py-3.5 shadow-lg transition-all duration-300 ${
                    showDropdown ? 'border-[#c20c0b] shadow-red-500/10' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                }`}>
                    <Search size={20} className={`flex-shrink-0 transition-colors ${showDropdown ? 'text-[#c20c0b]' : 'text-gray-400'}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => {
                            setSearchQuery(e.target.value);
                            setShowDropdown(true);
                            if (!e.target.value) setSelectedClientId('');
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search by client name, company, or email..."
                        className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearClient}
                            className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                            <X size={16} />
                        </button>
                    )}
                    {selectedClientId && (
                        <span className="flex-shrink-0 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                            Selected
                        </span>
                    )}
                </div>

                {/* Dropdown suggestions */}
                {showDropdown && searchQuery && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                        {searchResults.length === 0 ? (
                            <div className="px-5 py-6 text-center text-gray-500 dark:text-gray-400">
                                <Search size={24} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No clients found for "<span className="font-semibold">{searchQuery}</span>"</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-white/5 max-h-72 overflow-y-auto">
                                {searchResults.map(client => (
                                    <li key={client.id}>
                                        <button
                                            onClick={() => handleSelectClient(client)}
                                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
                                        >
                                            <ClientAvatar name={client.name} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-[#c20c0b] dark:group-hover:text-red-400 transition-colors">
                                                    {client.name}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">{client.company_name || client.email || 'No details'}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-[#c20c0b] transition-colors flex-shrink-0" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* ── Empty State ── */}
            {!selectedClientId && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-6 shadow-inner">
                        <Search size={36} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Search for a Client</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
                        Start typing in the search bar above to find a client by name, company, or email.
                    </p>
                    {clients.length > 0 && (
                        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                            {clients.length} clients available
                        </p>
                    )}
                </div>
            )}

            {/* ── Client selected view ── */}
            {selectedClientId && (
                <div className="animate-fade-in">
                    {/* Client profile banner */}
                    {selectedClient && (
                        <ClientProfileBanner
                            client={selectedClient}
                            orderCount={orders.length}
                            activeOrderCount={activeOrderCount}
                            onClear={handleClearClient}
                        />
                    )}

                    {/* ── Loading ── */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c20c0b] mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading orders...</p>
                        </div>
                    )}

                    {/* ── Orders list view ── */}
                    {!isLoading && !selectedOrderId && (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                    Orders
                                    <span className="ml-2 text-sm font-normal text-gray-400">({orders.length})</span>
                                </h3>
                                <button
                                    onClick={() => setIsCreateOrderOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white text-sm font-bold rounded-xl shadow hover:shadow-lg hover:scale-105 transition-all"
                                >
                                    <Plus size={16} /> New Order
                                </button>
                            </div>

                            {orders.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Package size={32} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Orders Yet</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto text-sm">
                                        This client has no orders. Create the first one to get started.
                                    </p>
                                    <button
                                        onClick={() => setIsCreateOrderOpen(true)}
                                        className="bg-gradient-to-r from-[#c20c0b] to-red-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Plus size={20} /> Start New Order
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {orders.map((order, idx) => {
                                        const normalized = normalizeOrder(order);
                                        const factory = factories.find(f => f.id === order.factory_id);
                                        return (
                                            <CrmOrderCard
                                                key={order.id}
                                                orderId={order.id}
                                                order={{ ...normalized, customer: selectedClient?.name || '' }}
                                                factory={factory}
                                                index={idx}
                                                onClick={() => handleSelectOrder(order.id)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Order detail view ── */}
                    {!isLoading && selectedOrderId && transformedOrder && (
                        <div className="animate-fade-in">
                            {/* Detail header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        onClick={selectedProductId ? () => { setSelectedProductId(null); setActiveView('Overview'); } : handleBackToOrders}
                                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] dark:hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                        <ArrowLeft size={18} />
                                        <span className="hidden sm:inline">{selectedProductId ? 'Overview' : 'All Orders'}</span>
                                    </button>
                                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                                        {selectedProduct ? selectedProduct.name : transformedOrder.product}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleEditOrder(activeOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all border border-blue-200 dark:border-blue-800"
                                    >
                                        <Edit size={15} /> Manage Order
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOrder(selectedOrderId)}
                                        className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-200 dark:border-red-800"
                                        title="Delete Order"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* View tabs */}
                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                <div className="border-b border-gray-200 dark:border-white/10 px-4 sm:px-6 pt-4 pb-0">
                                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mb-px">
                                        {currentViews.map(view => (
                                            <button
                                                key={view.name}
                                                onClick={() => setActiveView(view.name)}
                                                className={`flex items-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                                                    activeView === view.name
                                                        ? 'border-[#c20c0b] text-[#c20c0b] dark:text-red-400 bg-red-50/50 dark:bg-red-900/10'
                                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                            >
                                                {view.icon}
                                                <span className="hidden sm:inline">{view.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 sm:p-6">
                                    {activeView === 'Overview' && (
                                        <OrderDetailsView
                                            order={transformedOrder}
                                            allFactories={factories}
                                            handleSetCurrentPage={props.handleSetCurrentPage}
                                            onSelectProduct={(id) => { setSelectedProductId(id); setActiveView('List'); }}
                                        />
                                    )}
                                    {activeView === 'TNA' && <TNAView tasks={transformedOrder.tasks} />}
                                    {activeView === 'Dashboard' && (
                                        <DashboardView
                                            tasks={transformedOrder.tasks}
                                            orderKey={selectedOrderId}
                                            orderDetails={transformedOrder}
                                            darkMode={props.darkMode}
                                        />
                                    )}
                                    {activeView === 'List' && <ListView tasks={filteredTasks} />}
                                    {activeView === 'Board' && <BoardView tasks={filteredTasks} />}
                                    {activeView === 'Gantt' && <GanttChartView tasks={filteredTasks} onTaskUpdate={handleTaskUpdate} />}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Create Order Modal ── */}
            {isCreateOrderOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-white/10 animate-fade-in">
                        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Start New Order</h2>
                            <button onClick={() => setIsCreateOrderOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white">Products</label>
                                    <button type="button" onClick={addNewOrderProduct} className="text-sm text-[#c20c0b] font-semibold flex items-center gap-1 hover:text-[#a50a09]">
                                        <Plus size={14} /> Add Product
                                    </button>
                                </div>
                                {newOrderData.products.length === 0 ? (
                                    <div>
                                        <input
                                            type="text"
                                            value={newOrderData.product_name}
                                            onChange={e => setNewOrderData({ ...newOrderData, product_name: e.target.value })}
                                            className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#c20c0b] focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            placeholder="e.g. 5000 Cotton T-Shirts"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Or click "Add Product" for multiple products</p>
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
                                                <button type="button" onClick={() => removeNewOrderProduct(idx)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 size={14} />
                                                </button>
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
                                    onChange={e => setNewOrderData({ ...newOrderData, factory_id: e.target.value })}
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#c20c0b] focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                    <option value="">-- Select Factory --</option>
                                    {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Initial Status</label>
                                <select
                                    value={newOrderData.status}
                                    onChange={e => setNewOrderData({ ...newOrderData, status: e.target.value })}
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#c20c0b] focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                    <option>Pending</option>
                                    <option>In Production</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/10">
                                <button type="button" onClick={() => setIsCreateOrderOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-medium text-sm">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white rounded-xl font-bold text-sm shadow hover:shadow-lg transition-all">
                                    Create Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Manage Order Modal ── */}
            {isModalOpen && editingOrder && (
                <ManageOrderModal
                    editingOrder={editingOrder}
                    setEditingOrder={setEditingOrder}
                    onSave={handleSaveOrder}
                    onClose={() => setIsModalOpen(false)}
                    factories={factories}
                    supabase={supabase}
                />
            )}
        </MainLayout>
    );
};
