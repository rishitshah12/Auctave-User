import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    X, Save, Plus, Trash2, Package, FileText, CheckCircle, Clock,
    ChevronDown, ChevronRight, ChevronUp, Search, AlertTriangle,
    CalendarDays, User, Flag, MessageSquare, Zap, Layers, Target,
    TrendingUp, List, Building2, MapPin, PencilLine, Download
} from 'lucide-react';
import { CrmProduct } from './types';
import { crmService } from './crm.service';

interface ManageOrderModalProps {
    editingOrder: any;
    setEditingOrder: (order: any) => void;
    onSave: () => void;
    onClose: () => void;
    factories?: any[];
    supabase?: any;
}

const TASK_TEMPLATES = [
    { name: 'Order Confirmation', responsible: 'Admin' },
    { name: 'Fabric Sourcing', responsible: 'Merch Team' },
    { name: 'Fabric Testing & Approval', responsible: 'QC Team' },
    { name: 'Trims Sourcing', responsible: 'Merch Team' },
    { name: 'Pattern Making', responsible: 'Design Team' },
    { name: 'Proto Sample', responsible: 'Production' },
    { name: 'Fit Sample', responsible: 'Production' },
    { name: 'PP Sample Approval', responsible: 'Client' },
    { name: 'Bulk Fabric In-house', responsible: 'Warehouse' },
    { name: 'Bulk Cutting', responsible: 'Production' },
    { name: 'Embroidery / Print', responsible: 'Production' },
    { name: 'Stitching / Sewing', responsible: 'Production' },
    { name: 'Washing & Processing', responsible: 'Production' },
    { name: 'Final Inspection', responsible: 'QC Team' },
    { name: 'Packing & Labeling', responsible: 'Warehouse' },
    { name: 'Shipment Booking', responsible: 'Logistics' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    'TO DO': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
    'IN PROGRESS': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    'COMPLETE': { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
    'Low': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', icon: '\u2193' },
    'Medium': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', icon: '\u2192' },
    'High': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', icon: '\u2191' },
    'Urgent': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: '\u26A1' },
};

const ORDER_STATUS_CONFIG: Record<string, { bg: string; text: string; ring: string }> = {
    'Pending': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', ring: 'ring-yellow-200 dark:ring-yellow-800' },
    'In Production': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-200 dark:ring-blue-800' },
    'Quality Check': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-200 dark:ring-purple-800' },
    'Shipped': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-200 dark:ring-indigo-800' },
    'Completed': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', ring: 'ring-green-200 dark:ring-green-800' },
};

export const ManageOrderModal: React.FC<ManageOrderModalProps> = ({
    editingOrder,
    setEditingOrder,
    onSave,
    onClose,
    factories,
    supabase,
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'tasks' | 'documents'>('overview');
    const [factoryMode, setFactoryMode] = useState<'list' | 'manual'>(() =>
        editingOrder.custom_factory_name ? 'manual' : 'list'
    );
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [taskSearch, setTaskSearch] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
    const [taskProductFilter, setTaskProductFilter] = useState('ALL');
    const [showTemplates, setShowTemplates] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [hasChanges, setHasChanges] = useState(false);
    const [originalOrder] = useState(() => JSON.stringify(editingOrder));
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setHasChanges(JSON.stringify(editingOrder) !== originalOrder);
    }, [editingOrder, originalOrder]);

    useEffect(() => { setShowTemplates(false); }, [activeTab]);

    const tasks = editingOrder.tasks || [];
    const products = editingOrder.products || [];
    const documents = editingOrder.documents || [];

    // Computed stats
    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter((t: any) => t.status === 'COMPLETE').length;
        const inProgress = tasks.filter((t: any) => t.status === 'IN PROGRESS').length;
        const overdue = tasks.filter((t: any) => {
            if (t.status === 'COMPLETE') return false;
            return t.plannedEndDate && new Date(t.plannedEndDate) < new Date();
        }).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, inProgress, overdue, progress };
    }, [tasks]);

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter((task: any) => {
            if (taskSearch && !task.name.toLowerCase().includes(taskSearch.toLowerCase())) return false;
            if (taskStatusFilter !== 'ALL' && task.status !== taskStatusFilter) return false;
            if (taskProductFilter !== 'ALL' && task.productId !== taskProductFilter) return false;
            return true;
        });
    }, [tasks, taskSearch, taskStatusFilter, taskProductFilter]);

    // Group tasks by product
    const groupedTasks = useMemo(() => {
        const groups: Record<string, { product: CrmProduct | null; tasks: any[] }> = {};
        products.forEach((p: CrmProduct) => { groups[p.id] = { product: p, tasks: [] }; });
        groups['unassigned'] = { product: null, tasks: [] };

        filteredTasks.forEach((task: any) => {
            const key = task.productId && groups[task.productId] ? task.productId : 'unassigned';
            groups[key].tasks.push(task);
        });

        return Object.entries(groups).filter(([, g]) => g.tasks.length > 0);
    }, [filteredTasks, products]);

    const getProductProgress = useCallback((productId: string) => {
        const productTasks = tasks.filter((t: any) => t.productId === productId);
        if (productTasks.length === 0) return 0;
        const completed = productTasks.filter((t: any) => t.status === 'COMPLETE').length;
        return Math.round((completed / productTasks.length) * 100);
    }, [tasks]);

    const isOverdue = (task: any) => {
        if (task.status === 'COMPLETE') return false;
        return task.plannedEndDate && new Date(task.plannedEndDate) < new Date();
    };

    const isDueSoon = (task: any) => {
        if (task.status === 'COMPLETE') return false;
        if (!task.plannedEndDate) return false;
        const dueDate = new Date(task.plannedEndDate);
        const now = new Date();
        const threeDays = new Date(now.getTime() + 3 * 86400000);
        return dueDate >= now && dueDate <= threeDays;
    };

    // --- Task operations ---
    const updateTask = useCallback((taskId: number, updates: Record<string, any>) => {
        const newTasks = tasks.map((t: any) => t.id === taskId ? { ...t, ...updates } : t);
        setEditingOrder({ ...editingOrder, tasks: newTasks });
    }, [editingOrder, tasks, setEditingOrder]);

    const addTask = useCallback((template?: { name: string; responsible: string }) => {
        const targetProductId = taskProductFilter !== 'ALL' ? taskProductFilter : (products[0]?.id || '');
        const newTask = {
            id: Date.now(),
            name: template?.name || 'New Task',
            status: 'TO DO',
            priority: 'Medium',
            responsible: template?.responsible || '',
            plannedStartDate: new Date().toISOString().split('T')[0],
            plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            actualStartDate: null,
            actualEndDate: null,
            notes: '',
            progress: 0,
            productId: targetProductId,
        };
        setEditingOrder({ ...editingOrder, tasks: [...tasks, newTask] });
        setExpandedTaskId(newTask.id);
        setShowTemplates(false);
    }, [editingOrder, tasks, products, taskProductFilter, setEditingOrder]);

    const removeTask = useCallback((taskId: number) => {
        setEditingOrder({ ...editingOrder, tasks: tasks.filter((t: any) => t.id !== taskId) });
        if (expandedTaskId === taskId) setExpandedTaskId(null);
    }, [editingOrder, tasks, expandedTaskId, setEditingOrder]);

    const moveTask = useCallback((taskId: number, direction: 'up' | 'down') => {
        const idx = tasks.findIndex((t: any) => t.id === taskId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === tasks.length - 1) return;
        const newTasks = [...tasks];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newTasks[idx], newTasks[swapIdx]] = [newTasks[swapIdx], newTasks[idx]];
        setEditingOrder({ ...editingOrder, tasks: newTasks });
    }, [editingOrder, tasks, setEditingOrder]);

    // --- Product operations ---
    const addProduct = useCallback(() => {
        const newProduct: CrmProduct = { id: Date.now().toString(), name: 'New Product', status: 'Pending' };
        setEditingOrder({ ...editingOrder, products: [...products, newProduct] });
    }, [editingOrder, products, setEditingOrder]);

    const updateProduct = useCallback((productId: string, field: string, value: any) => {
        const newProducts = products.map((p: CrmProduct) => p.id === productId ? { ...p, [field]: value } : p);
        setEditingOrder({ ...editingOrder, products: newProducts });
    }, [editingOrder, products, setEditingOrder]);

    const removeProduct = useCallback((productId: string) => {
        const newProducts = products.filter((p: CrmProduct) => p.id !== productId);
        const newTasks = tasks.map((t: any) =>
            t.productId === productId ? { ...t, productId: newProducts[0]?.id || '' } : t
        );
        setEditingOrder({ ...editingOrder, products: newProducts, tasks: newTasks });
    }, [editingOrder, products, tasks, setEditingOrder]);

    // --- Document operations ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        if (!supabase) {
            alert("File upload service not available");
            return;
        }

        setIsUploading(true);
        try {
            const fileName = `crm/${editingOrder.id || 'temp'}/${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage.from('quote-attachments').upload(fileName, file);

            if (error) throw error;

            const newDoc = {
                name: file.name,
                type: 'General',
                lastUpdated: new Date().toISOString().split('T')[0],
                path: data.path,
                source: 'company'
            };

            const updatedDocuments = [...(editingOrder.documents || []), newDoc];

            // Immediately persist to DB so the document is never lost
            if (editingOrder.id) {
                const { error: updateError } = await crmService.update(editingOrder.id, { documents: updatedDocuments } as any);
                if (updateError) throw updateError;
            }

            // Update local state to reflect the new document
            setEditingOrder({ ...editingOrder, documents: updatedDocuments });
        } catch (err: any) {
            console.error("Upload failed", err);
            alert("Failed to upload file: " + (err.message || 'Unknown error'));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePreview = async (path: string) => {
        if (!supabase || !path) return;
        try {
            const { data, error } = await supabase.storage.from('quote-attachments').createSignedUrl(path, 60);
            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
        } catch (err: any) {
            console.error("Preview failed", err);
            alert("Failed to preview file");
        }
    };

    const updateDocument = useCallback((index: number, field: string, value: any) => {
        const newDocs = [...documents];
        newDocs[index] = { ...newDocs[index], [field]: value };
        setEditingOrder({ ...editingOrder, documents: newDocs });
    }, [editingOrder, documents, setEditingOrder]);

    const removeDocument = useCallback((index: number) => {
        const newDocs = documents.filter((_: any, i: number) => i !== index);
        setEditingOrder({ ...editingOrder, documents: newDocs });
    }, [editingOrder, documents, setEditingOrder]);

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
            return next;
        });
    };

    const handleClose = () => {
        if (hasChanges) {
            if (confirm('You have unsaved changes. Are you sure you want to close?')) onClose();
        } else {
            onClose();
        }
    };

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: <Target size={16} /> },
        { id: 'products' as const, label: 'Products', icon: <Package size={16} />, count: products.length },
        { id: 'tasks' as const, label: 'Tasks', icon: <List size={16} />, count: tasks.length },
        { id: 'documents' as const, label: 'Documents', icon: <FileText size={16} />, count: documents.length },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-white/10 overflow-hidden"
                onClick={() => showTemplates && setShowTemplates(false)}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#c20c0b] to-red-600 rounded-xl shadow-lg shadow-red-500/20">
                            <Layers size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingOrder.id ? 'Manage Order' : 'New Order'}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{editingOrder.product_name || (editingOrder.id ? 'Order' : 'Fill in details below')}</p>
                        </div>
                        {hasChanges && (
                            <span className="ml-3 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 animate-pulse">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tab bar */}
                <div className="px-6 border-b border-gray-200 dark:border-white/10 flex-shrink-0 bg-white dark:bg-gray-900">
                    <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-[#c20c0b] text-[#c20c0b] dark:text-red-400 dark:border-red-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        activeTab === tab.id
                                            ? 'bg-red-100 dark:bg-red-900/30 text-[#c20c0b] dark:text-red-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                    }`}>{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* ===== OVERVIEW TAB ===== */}
                    {activeTab === 'overview' && (
                        <div className="p-6 space-y-6">
                            {/* Status selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Pending', 'In Production', 'Quality Check', 'Shipped', 'Completed'].map(status => {
                                        const config = ORDER_STATUS_CONFIG[status];
                                        const isSelected = editingOrder.status === status;
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => setEditingOrder({ ...editingOrder, status })}
                                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ring-2 ${
                                                    isSelected
                                                        ? `${config.bg} ${config.text} ${config.ring} scale-105 shadow-md`
                                                        : 'ring-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {status}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Factory assignment */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                    Assigned Factory
                                </label>

                                {/* Mode toggle */}
                                <div className="flex gap-2 mb-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFactoryMode('list');
                                            setEditingOrder({ ...editingOrder, custom_factory_name: '', custom_factory_location: '' });
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                            factoryMode === 'list'
                                                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        <Building2 size={14} /> Select from List
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFactoryMode('manual');
                                            setEditingOrder({ ...editingOrder, factory_id: '' });
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                            factoryMode === 'manual'
                                                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        <PencilLine size={14} /> Enter Manually
                                    </button>
                                </div>

                                {factoryMode === 'list' ? (
                                    factories && factories.length > 0 ? (
                                        <select
                                            value={editingOrder.factory_id || ''}
                                            onChange={(e) => setEditingOrder({ ...editingOrder, factory_id: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none"
                                        >
                                            <option value="">— Select Factory —</option>
                                            {factories.map((f: any) => (
                                                <option key={f.id} value={f.id}>{f.name}{f.location ? ` · ${f.location}` : ''}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-gray-400 dark:text-gray-500 italic p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            No factories available in the system. Use "Enter Manually" instead.
                                        </p>
                                    )
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={editingOrder.custom_factory_name || ''}
                                                onChange={(e) => setEditingOrder({ ...editingOrder, custom_factory_name: e.target.value })}
                                                placeholder="Factory name (e.g. Sunrise Garments)"
                                                className="w-full pl-9 pr-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none"
                                            />
                                        </div>
                                        <div className="relative">
                                            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={editingOrder.custom_factory_location || ''}
                                                onChange={(e) => setEditingOrder({ ...editingOrder, custom_factory_location: e.target.value })}
                                                placeholder="Location (e.g. Dhaka, Bangladesh)"
                                                className="w-full pl-9 pr-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Current assignment preview */}
                                {(factoryMode === 'list' && editingOrder.factory_id && factories?.find((f: any) => f.id === editingOrder.factory_id)) && (
                                    <div className="mt-3 flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                            Assigned: {factories.find((f: any) => f.id === editingOrder.factory_id)?.name}
                                        </span>
                                    </div>
                                )}
                                {(factoryMode === 'manual' && editingOrder.custom_factory_name) && (
                                    <div className="mt-3 flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />
                                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                                            Manual entry: {editingOrder.custom_factory_name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Progress bar */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Overall Progress</h3>
                                    <span className="text-3xl font-black text-gray-800 dark:text-white">{stats.progress}%</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#c20c0b] to-red-500 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${stats.progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Summary cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package size={16} className="text-blue-500" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Products</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{products.length}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle size={16} className="text-green-500" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.completed}<span className="text-sm text-gray-400 font-normal">/{stats.total}</span></p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock size={16} className="text-blue-500" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">In Progress</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.inProgress}</p>
                                </div>
                                <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border shadow-sm ${stats.overdue > 0 ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle size={16} className={stats.overdue > 0 ? 'text-red-500' : 'text-gray-400'} />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Overdue</span>
                                    </div>
                                    <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>{stats.overdue}</p>
                                </div>
                            </div>

                            {/* Per-product progress */}
                            {products.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Product Progress</h3>
                                    <div className="space-y-3">
                                        {products.map((p: CrmProduct) => {
                                            const progress = getProductProgress(p.id);
                                            const productTaskCount = tasks.filter((t: any) => t.productId === p.id).length;
                                            return (
                                                <div key={p.id} className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 truncate" title={p.name}>{p.name}</span>
                                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'
                                                            }`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-20 text-right">{progress}% ({productTaskCount})</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== PRODUCTS TAB ===== */}
                    {activeTab === 'products' && (
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Manage products in this order. Tasks can be assigned to specific products.</p>
                                <button
                                    onClick={addProduct}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                                >
                                    <Plus size={16} /> Add Product
                                </button>
                            </div>
                            <div className="space-y-3">
                                {products.map((product: CrmProduct) => {
                                    const progress = getProductProgress(product.id);
                                    const productTaskCount = tasks.filter((t: any) => t.productId === product.id).length;
                                    const statusConfig = ORDER_STATUS_CONFIG[product.status || 'Pending'];
                                    return (
                                        <div key={product.id} className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                                                    <Package size={20} className="text-blue-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <input
                                                        type="text"
                                                        value={product.name}
                                                        onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                                        className="w-full text-base font-semibold bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#c20c0b] focus:outline-none text-gray-800 dark:text-white pb-1 transition-colors"
                                                        placeholder="Product Name"
                                                    />
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <select
                                                            value={product.status || 'Pending'}
                                                            onChange={(e) => updateProduct(product.id, 'status', e.target.value)}
                                                            className={`text-xs font-semibold px-3 py-1 rounded-lg border-0 cursor-pointer ${statusConfig?.bg || ''} ${statusConfig?.text || ''}`}
                                                        >
                                                            <option>Pending</option>
                                                            <option>In Production</option>
                                                            <option>Quality Check</option>
                                                            <option>Shipped</option>
                                                            <option>Completed</option>
                                                        </select>
                                                        <span className="text-xs text-gray-400">{productTaskCount} tasks</span>
                                                        <span className="text-xs text-gray-400">{progress}% complete</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeProduct(product.id)}
                                                    disabled={products.length <= 1}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                                                    title={products.length <= 1 ? 'At least one product required' : 'Remove product'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {products.length === 0 && (
                                    <div className="text-center py-12">
                                        <Package size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500 dark:text-gray-400">No products yet. Add one to get started.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== TASKS TAB ===== */}
                    {activeTab === 'tasks' && (
                        <div className="p-6 space-y-4">
                            {/* Toolbar */}
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={taskSearch}
                                        onChange={(e) => setTaskSearch(e.target.value)}
                                        placeholder="Search tasks..."
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none text-gray-700 dark:text-gray-200"
                                    />
                                </div>
                                <select
                                    value={taskStatusFilter}
                                    onChange={(e) => setTaskStatusFilter(e.target.value)}
                                    className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="TO DO">To Do</option>
                                    <option value="IN PROGRESS">In Progress</option>
                                    <option value="COMPLETE">Complete</option>
                                </select>
                                <select
                                    value={taskProductFilter}
                                    onChange={(e) => setTaskProductFilter(e.target.value)}
                                    className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                    <option value="ALL">All Products</option>
                                    {products.map((p: CrmProduct) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowTemplates(!showTemplates); }}
                                            className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                        >
                                            <Zap size={16} /> Templates
                                        </button>
                                        {showTemplates && (
                                            <div
                                                className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-20 max-h-80 overflow-y-auto"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="p-2">
                                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-2 py-1 uppercase tracking-wide">Garment Production Templates</p>
                                                    {TASK_TEMPLATES.map((tpl, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => addTask(tpl)}
                                                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                        >
                                                            <span>{tpl.name}</span>
                                                            <span className="text-xs text-gray-400">{tpl.responsible}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => addTask()}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                                    >
                                        <Plus size={16} /> Add Task
                                    </button>
                                </div>
                            </div>

                            {/* Task groups */}
                            <div className="space-y-4">
                                {groupedTasks.map(([groupId, group]) => (
                                    <div key={groupId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                        {/* Group header */}
                                        <button
                                            onClick={() => toggleGroup(groupId)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {collapsedGroups.has(groupId) ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                                <Package size={16} className="text-gray-400" />
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    {group.product?.name || 'Unassigned'}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{group.tasks.length}</span>
                                            </div>
                                            {group.product && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 rounded-full transition-all"
                                                            style={{ width: `${getProductProgress(group.product.id)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-400">{getProductProgress(group.product.id)}%</span>
                                                </div>
                                            )}
                                        </button>

                                        {/* Task list */}
                                        {!collapsedGroups.has(groupId) && (
                                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {group.tasks.map((task: any) => {
                                                    const isExpanded = expandedTaskId === task.id;
                                                    const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS['TO DO'];
                                                    const priorityConfig = PRIORITY_CONFIG[task.priority || 'Medium'];
                                                    const overdue = isOverdue(task);
                                                    const dueSoon = isDueSoon(task);

                                                    return (
                                                        <div key={task.id} className={`${overdue ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900'}`}>
                                                            {/* Task summary row */}
                                                            <div className="flex items-center gap-2 px-4 py-3 group">
                                                                {/* Reorder */}
                                                                <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                    <button onClick={() => moveTask(task.id, 'up')} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-0.5"><ChevronUp size={12} /></button>
                                                                    <button onClick={() => moveTask(task.id, 'down')} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-0.5"><ChevronDown size={12} /></button>
                                                                </div>

                                                                {/* Status toggle */}
                                                                <button
                                                                    onClick={() => {
                                                                        const nextStatus = task.status === 'COMPLETE' ? 'TO DO' : task.status === 'TO DO' ? 'IN PROGRESS' : 'COMPLETE';
                                                                        const updates: Record<string, any> = { status: nextStatus };
                                                                        if (nextStatus === 'COMPLETE') {
                                                                            updates.progress = 100;
                                                                            updates.actualEndDate = new Date().toISOString().split('T')[0];
                                                                        }
                                                                        if (nextStatus === 'IN PROGRESS' && !task.actualStartDate) {
                                                                            updates.actualStartDate = new Date().toISOString().split('T')[0];
                                                                        }
                                                                        if (nextStatus === 'TO DO') {
                                                                            updates.progress = 0;
                                                                        }
                                                                        updateTask(task.id, updates);
                                                                    }}
                                                                    className="flex-shrink-0"
                                                                    title={`Click to cycle status (${task.status})`}
                                                                >
                                                                    {task.status === 'COMPLETE' ? (
                                                                        <CheckCircle size={20} className="text-green-500" />
                                                                    ) : task.status === 'IN PROGRESS' ? (
                                                                        <Clock size={20} className="text-blue-500 animate-pulse" />
                                                                    ) : (
                                                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors" />
                                                                    )}
                                                                </button>

                                                                {/* Task name */}
                                                                <button
                                                                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                                                    className={`flex-1 text-left text-sm font-medium truncate ${
                                                                        task.status === 'COMPLETE'
                                                                            ? 'text-gray-400 dark:text-gray-500 line-through'
                                                                            : 'text-gray-800 dark:text-white'
                                                                    } hover:text-[#c20c0b] dark:hover:text-red-400 transition-colors`}
                                                                >
                                                                    {task.name}
                                                                </button>

                                                                {/* Badges */}
                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    {overdue && (
                                                                        <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md">
                                                                            <AlertTriangle size={11} /> Overdue
                                                                        </span>
                                                                    )}
                                                                    {dueSoon && !overdue && (
                                                                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md">
                                                                            <Clock size={11} /> Due Soon
                                                                        </span>
                                                                    )}
                                                                    {priorityConfig && (
                                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md hidden sm:inline-flex ${priorityConfig.bg} ${priorityConfig.text}`}>
                                                                            {priorityConfig.icon} {task.priority || 'Medium'}
                                                                        </span>
                                                                    )}
                                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${statusColor.bg} ${statusColor.text}`}>
                                                                        {task.status}
                                                                    </span>
                                                                    {task.responsible && (
                                                                        <span className="text-xs text-gray-400 dark:text-gray-500 hidden lg:inline">
                                                                            {task.responsible}
                                                                        </span>
                                                                    )}
                                                                    {task.plannedEndDate && (
                                                                        <span className={`text-xs hidden sm:inline ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                            {new Date(task.plannedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                                    >
                                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Expanded detail panel */}
                                                            {isExpanded && (
                                                                <div className="px-4 pb-4 pt-2 ml-11 mr-2 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl mb-2 mx-4 border border-gray-200/50 dark:border-gray-700/50">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                                        {/* Task Name */}
                                                                        <div className="sm:col-span-2">
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <List size={12} /> Task Name
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={task.name}
                                                                                onChange={(e) => updateTask(task.id, { name: e.target.value })}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none text-gray-800 dark:text-white"
                                                                            />
                                                                        </div>

                                                                        {/* Status */}
                                                                        <div>
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <TrendingUp size={12} /> Status
                                                                            </label>
                                                                            <select
                                                                                value={task.status}
                                                                                onChange={(e) => {
                                                                                    const updates: Record<string, any> = { status: e.target.value };
                                                                                    if (e.target.value === 'COMPLETE') {
                                                                                        updates.progress = 100;
                                                                                        updates.actualEndDate = new Date().toISOString().split('T')[0];
                                                                                    }
                                                                                    if (e.target.value === 'IN PROGRESS' && !task.actualStartDate) {
                                                                                        updates.actualStartDate = new Date().toISOString().split('T')[0];
                                                                                    }
                                                                                    updateTask(task.id, updates);
                                                                                }}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm cursor-pointer text-gray-800 dark:text-white"
                                                                            >
                                                                                <option>TO DO</option>
                                                                                <option>IN PROGRESS</option>
                                                                                <option>COMPLETE</option>
                                                                            </select>
                                                                        </div>

                                                                        {/* Priority */}
                                                                        <div>
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <Flag size={12} /> Priority
                                                                            </label>
                                                                            <select
                                                                                value={task.priority || 'Medium'}
                                                                                onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm cursor-pointer text-gray-800 dark:text-white"
                                                                            >
                                                                                <option>Low</option>
                                                                                <option>Medium</option>
                                                                                <option>High</option>
                                                                                <option>Urgent</option>
                                                                            </select>
                                                                        </div>

                                                                        {/* Assigned Product */}
                                                                        <div>
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <Package size={12} /> Product
                                                                            </label>
                                                                            <select
                                                                                value={task.productId || ''}
                                                                                onChange={(e) => updateTask(task.id, { productId: e.target.value })}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm cursor-pointer text-gray-800 dark:text-white"
                                                                            >
                                                                                <option value="">Unassigned</option>
                                                                                {products.map((p: CrmProduct) => (
                                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>

                                                                        {/* Responsible */}
                                                                        <div>
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <User size={12} /> Responsible
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={task.responsible || ''}
                                                                                onChange={(e) => updateTask(task.id, { responsible: e.target.value })}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none text-gray-800 dark:text-white"
                                                                                placeholder="e.g. Merch Team, QC Team"
                                                                            />
                                                                        </div>

                                                                        {/* Planned Start */}
                                                                        <div>
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <CalendarDays size={12} /> Planned Start
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                value={task.plannedStartDate || ''}
                                                                                onChange={(e) => updateTask(task.id, { plannedStartDate: e.target.value })}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white"
                                                                            />
                                                                        </div>

                                                                        {/* Planned End */}
                                                                        <div>
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <CalendarDays size={12} /> Planned End
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                value={task.plannedEndDate || ''}
                                                                                onChange={(e) => updateTask(task.id, { plannedEndDate: e.target.value })}
                                                                                className={`w-full p-2.5 bg-white dark:bg-gray-800 border rounded-lg text-sm text-gray-800 dark:text-white ${
                                                                                    overdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-600'
                                                                                }`}
                                                                            />
                                                                        </div>

                                                                        {/* Actual Start */}
                                                                        <div>
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <CheckCircle size={12} /> Actual Start
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                value={task.actualStartDate || ''}
                                                                                onChange={(e) => updateTask(task.id, { actualStartDate: e.target.value })}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white"
                                                                            />
                                                                        </div>

                                                                        {/* Actual End */}
                                                                        <div>
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <CheckCircle size={12} /> Actual End
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                value={task.actualEndDate || ''}
                                                                                onChange={(e) => updateTask(task.id, { actualEndDate: e.target.value })}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white"
                                                                            />
                                                                        </div>

                                                                        {/* Progress slider */}
                                                                        <div className="sm:col-span-2">
                                                                            <label className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                                                                <span className="flex items-center gap-1.5"><TrendingUp size={12} /> Progress</span>
                                                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{task.progress || 0}%</span>
                                                                            </label>
                                                                            <input
                                                                                type="range"
                                                                                min="0"
                                                                                max="100"
                                                                                step="5"
                                                                                value={task.progress || 0}
                                                                                onChange={(e) => {
                                                                                    const val = parseInt(e.target.value);
                                                                                    const updates: Record<string, any> = { progress: val };
                                                                                    if (val === 100 && task.status !== 'COMPLETE') {
                                                                                        updates.status = 'COMPLETE';
                                                                                        updates.actualEndDate = new Date().toISOString().split('T')[0];
                                                                                    }
                                                                                    if (val > 0 && val < 100 && task.status !== 'IN PROGRESS') {
                                                                                        updates.status = 'IN PROGRESS';
                                                                                        if (!task.actualStartDate) {
                                                                                            updates.actualStartDate = new Date().toISOString().split('T')[0];
                                                                                        }
                                                                                    }
                                                                                    if (val === 0 && task.status !== 'TO DO') {
                                                                                        updates.status = 'TO DO';
                                                                                    }
                                                                                    updateTask(task.id, updates);
                                                                                }}
                                                                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#c20c0b]"
                                                                            />
                                                                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                                                                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Notes */}
                                                                        <div className="sm:col-span-2">
                                                                            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                                                <MessageSquare size={12} /> Notes
                                                                            </label>
                                                                            <textarea
                                                                                value={task.notes || ''}
                                                                                onChange={(e) => updateTask(task.id, { notes: e.target.value })}
                                                                                rows={2}
                                                                                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none text-gray-800 dark:text-white resize-none"
                                                                                placeholder="Add notes, instructions, or comments..."
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Delete button */}
                                                                    <div className="flex justify-end pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                                                                        <button
                                                                            onClick={() => removeTask(task.id)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium"
                                                                        >
                                                                            <Trash2 size={14} /> Remove Task
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Empty state */}
                                {filteredTasks.length === 0 && (
                                    <div className="text-center py-12">
                                        {tasks.length === 0 ? (
                                            <>
                                                <Zap size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                                <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">No tasks yet</p>
                                                <p className="text-sm text-gray-400 dark:text-gray-500">Add tasks manually or use templates to get started quickly.</p>
                                            </>
                                        ) : (
                                            <>
                                                <Search size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                                <p className="text-gray-500 dark:text-gray-400">No tasks match your filters</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== DOCUMENTS TAB ===== */}
                    {activeTab === 'documents' && (
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Manage documents associated with this order. Documents uploaded here will be visible to the client as "Company Documents".</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Client Documents Column */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">Client Documents</h3>
                                    {documents.filter((d: any) => d.source === 'client' || !d.source).length === 0 ? (
                                        <p className="text-sm text-gray-400 italic py-4">No documents from client.</p>
                                    ) : (
                                        documents.map((doc: any, idx: number) => {
                                            if (doc.source === 'company') return null;
                                            return (
                                                <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                                                        <p className="text-xs text-gray-500">{doc.lastUpdated}</p>
                                                    </div>
                                                    {/* Admin can delete client docs if needed, or maybe just view */}
                                                    <button onClick={() => removeDocument(idx)} className="text-gray-400 hover:text-red-500 p-1">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Company Documents Column */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                        <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Company Documents</h3>
                                        <label className={`cursor-pointer flex items-center gap-1 text-xs font-bold text-[#c20c0b] hover:underline ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <Plus size={14} />
                                            {isUploading ? 'Uploading...' : 'Add Document'}
                                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                        </label>
                                    </div>
                                    
                                    {documents.filter((d: any) => d.source === 'company').length === 0 ? (
                                        <p className="text-sm text-gray-400 italic py-4">No documents uploaded by Auctave.</p>
                                    ) : (
                                        documents.map((doc: any, idx: number) => {
                                            if (doc.source !== 'company') return null;
                                            return (
                                                <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                                                    <div className="flex items-start gap-3 mb-2">
                                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-500">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <input
                                                                type="text"
                                                                value={doc.name}
                                                                onChange={(e) => updateDocument(idx, 'name', e.target.value)}
                                                                className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-900 dark:text-white focus:ring-0"
                                                                placeholder="Document Name"
                                                            />
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className="text-xs text-gray-500">{doc.lastUpdated}</p>
                                                                {doc.path && (
                                                                    <button 
                                                                        onClick={() => handlePreview(doc.path)}
                                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                                        title="Preview/Download"
                                                                    >
                                                                        <Download size={10} /> Preview
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => removeDocument(idx)} className="text-gray-400 hover:text-red-500 p-1">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="pl-11">
                                                        <select
                                                            value={doc.type}
                                                            onChange={(e) => updateDocument(idx, 'type', e.target.value)}
                                                            className="w-full py-1 px-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#c20c0b]"
                                                        >
                                                        <option>General</option>
                                                        <option>Invoice</option>
                                                        <option>Packing List</option>
                                                        <option>Bill of Lading</option>
                                                        <option>Certificate of Origin</option>
                                                        <option>Inspection Report</option>
                                                        <option>Lab Test Report</option>
                                                        <option>Purchase Order</option>
                                                        <option>Tech Pack</option>
                                                        <option>Sample Approval</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    <div className="text-sm text-gray-400">
                        {hasChanges ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">You have unsaved changes</span>
                        ) : (
                            <span>No changes</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={!hasChanges}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
