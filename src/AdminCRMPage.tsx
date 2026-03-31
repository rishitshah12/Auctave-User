import React, { useState, useEffect, FC, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MainLayout } from './MainLayout';
import { crmService } from './crm.service';
import { userService } from './user.service';
import { factoryService } from './factory.service';
import {
    Plus, Trash2, X, Info, List, LayoutDashboard, ClipboardCheck,
    PieChart as PieChartIcon, GanttChartSquare, ArrowLeft, Package,
    Search, Building2, Mail, Users, Edit, ChevronRight, ShieldCheck,
    Flag, Clock, TrendingUp, CheckCircle, ChevronDown, FileText,
    Download, Save, MapPin, PencilLine, Zap, MessageSquare,
    CalendarDays, User, AlertTriangle, ChevronUp
} from 'lucide-react';
import { DashboardView, ListView, BoardView, GanttChartView, TNAView, OrderDetailsView } from './CRMPage';
import CrmOrderCard from './CrmOrderCard';
import { CrmProduct, CrmTask } from './types';
import { normalizeOrder, computeProductName } from './utils';
import { useToast } from './ToastContext';
import { calculateOrderRiskScore } from './risk.service';
import { RiskBadge } from './CrmOrderDetail';

// ── Constants ──────────────────────────────────────────────────────────────────
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

const INLINE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    'TO DO': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
    'IN PROGRESS': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    'COMPLETE': { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
};

const INLINE_PRIORITY_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
    'Low': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', icon: '↓' },
    'Medium': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', icon: '→' },
    'High': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', icon: '↑' },
    'Urgent': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: '⚡' },
};

const ORDER_STATUS_CONFIG: Record<string, { bg: string; text: string; ring: string }> = {
    'Pending': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', ring: 'ring-yellow-200 dark:ring-yellow-800' },
    'In Production': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-200 dark:ring-blue-800' },
    'Quality Check': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-200 dark:ring-purple-800' },
    'Shipped': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-200 dark:ring-indigo-800' },
    'Completed': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', ring: 'ring-green-200 dark:ring-green-800' },
};

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

// ── Shared task edit modal ────────────────────────────────────────────────────
function TaskEditModal({
    task,
    onSave,
    onClose,
}: {
    task: CrmTask;
    onSave: (updated: CrmTask) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState<CrmTask>({ ...task });

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-white/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Edit size={16} className="text-[#c20c0b]" /> Edit Task
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Name */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Task Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={draft.name}
                            onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b] font-semibold"
                        />
                    </div>

                    {/* Status + Priority */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Status</label>
                            <select
                                value={draft.status}
                                onChange={e => {
                                    const status = e.target.value as CrmTask['status'];
                                    const progress = status === 'COMPLETE' ? 100 : status === 'TO DO' ? 0 : Math.max(draft.progress || 0, 10);
                                    setDraft(prev => ({ ...prev, status, progress }));
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"
                            >
                                <option>TO DO</option>
                                <option>IN PROGRESS</option>
                                <option>COMPLETE</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Priority</label>
                            <select
                                value={draft.priority || 'Medium'}
                                onChange={e => setDraft(prev => ({ ...prev, priority: e.target.value as CrmTask['priority'] }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Urgent</option>
                            </select>
                        </div>
                    </div>

                    {/* Progress */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                            Progress — <span className="text-[#c20c0b] font-black">{draft.progress ?? 0}%</span>
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={draft.progress ?? 0}
                            onChange={e => setDraft(prev => ({ ...prev, progress: +e.target.value }))}
                            className="w-full accent-[#c20c0b]"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                            <span>0%</span><span>50%</span><span>100%</span>
                        </div>
                    </div>

                    {/* Responsible */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Responsible</label>
                        <input
                            type="text"
                            value={draft.responsible || ''}
                            onChange={e => setDraft(prev => ({ ...prev, responsible: e.target.value }))}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"
                            placeholder="Assignee name"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Planned Start</label>
                            <input
                                type="date"
                                value={draft.plannedStartDate || ''}
                                onChange={e => setDraft(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Planned End</label>
                            <input
                                type="date"
                                value={draft.plannedEndDate || ''}
                                onChange={e => setDraft(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"
                            />
                        </div>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Quantity (units)</label>
                        <input
                            type="number"
                            min="0"
                            value={draft.quantity ?? ''}
                            onChange={e => setDraft(prev => ({ ...prev, quantity: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"
                            placeholder="e.g. 500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Notes</label>
                        <textarea
                            value={draft.notes || ''}
                            onChange={e => setDraft(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b] resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { if (draft.name.trim()) onSave(draft); }}
                        disabled={!draft.name.trim()}
                        className="px-5 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white text-sm font-bold rounded-xl shadow hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Admin Kanban Board with drag-drop and add task ────────────────────────────
function AdminBoardView({
    tasks,
    onTasksChange,
    selectedProductId,
}: {
    tasks: CrmTask[];
    onTasksChange: (tasks: CrmTask[]) => void;
    selectedProductId?: string | null;
}) {
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<CrmTask | null>(null);
    const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
    const [newTask, setNewTask] = useState({
        name: '',
        priority: 'Medium' as CrmTask['priority'],
        responsible: '',
        plannedStartDate: new Date().toISOString().split('T')[0],
        plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        quantity: '',
    });

    const columns = ['TO DO', 'IN PROGRESS', 'COMPLETE'] as const;

    const columnMeta: Record<string, { bg: string; badge: string; border: string; dropRing: string; icon: React.ReactNode }> = {
        'TO DO': {
            bg: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50',
            badge: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
            border: 'border-gray-300 dark:border-gray-600',
            dropRing: 'ring-2 ring-gray-400 ring-offset-2',
            icon: <List size={16} className="text-gray-600 dark:text-gray-400" />,
        },
        'IN PROGRESS': {
            bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
            badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
            border: 'border-orange-300 dark:border-orange-600',
            dropRing: 'ring-2 ring-orange-400 ring-offset-2',
            icon: <TrendingUp size={16} className="text-orange-600 dark:text-orange-400" />,
        },
        'COMPLETE': {
            bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
            badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
            border: 'border-green-300 dark:border-green-600',
            dropRing: 'ring-2 ring-green-400 ring-offset-2',
            icon: <CheckCircle size={16} className="text-green-600 dark:text-green-400" />,
        },
    };

    const priorityColors: Record<string, string> = {
        'Urgent': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
        'High': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
        'Medium': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
        'Low': 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    };

    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnStatus);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if leaving the column container itself
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
            setDragOverColumn(null);
        }
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        setDragOverColumn(null);
        if (draggedTaskId === null) return;
        const updatedTasks = tasks.map(t => {
            if (t.id !== draggedTaskId) return t;
            const progress =
                targetStatus === 'COMPLETE' ? 100
                : targetStatus === 'IN PROGRESS' ? (t.progress === 100 ? 50 : Math.max(t.progress || 0, 10))
                : 0;
            return { ...t, status: targetStatus as CrmTask['status'], progress };
        });
        onTasksChange(updatedTasks);
        setDraggedTaskId(null);
    };

    const handleDragEnd = () => {
        setDraggedTaskId(null);
        setDragOverColumn(null);
    };

    const handleEditSave = (updated: CrmTask) => {
        onTasksChange(tasks.map(t => t.id === updated.id ? updated : t));
        setEditingTask(null);
    };

    const openAddForm = (columnStatus: string) => {
        setAddingInColumn(columnStatus);
        setNewTask({
            name: '',
            priority: 'Medium',
            responsible: '',
            plannedStartDate: new Date().toISOString().split('T')[0],
            plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            quantity: '',
        });
    };

    const handleSaveNewTask = () => {
        if (!newTask.name.trim() || !addingInColumn) return;
        const progress =
            addingInColumn === 'COMPLETE' ? 100
            : addingInColumn === 'IN PROGRESS' ? 10
            : 0;
        const task: CrmTask = {
            id: Date.now(),
            name: newTask.name.trim(),
            status: addingInColumn as CrmTask['status'],
            priority: newTask.priority,
            responsible: newTask.responsible.trim() || 'Admin',
            plannedStartDate: newTask.plannedStartDate,
            plannedEndDate: newTask.plannedEndDate,
            actualStartDate: null,
            actualEndDate: null,
            progress,
            ...(newTask.quantity ? { quantity: parseInt(newTask.quantity) } : {}),
            ...(selectedProductId ? { productId: selectedProductId } : {}),
        };
        onTasksChange([...tasks, task]);
        setAddingInColumn(null);
    };

    return (
        <>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in">
            {columns.map(status => {
                const tasksInColumn = tasks.filter(t => t.status === status);
                const meta = columnMeta[status];
                const isDropTarget = dragOverColumn === status;

                return (
                    <div
                        key={status}
                        className={`${meta.bg} p-4 rounded-2xl border ${meta.border} shadow-lg transition-all duration-200 ${isDropTarget ? meta.dropRing : ''}`}
                        onDragOver={e => handleDragOver(e, status)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, status)}
                    >
                        {/* Column header */}
                        <h3 className="flex items-center justify-between text-sm font-bold mb-4 px-1 text-gray-800 dark:text-white">
                            <span className="flex items-center gap-2">
                                {meta.icon}
                                {status}
                            </span>
                            <span className={`${meta.badge} text-xs font-bold px-2.5 py-1 rounded-full shadow-sm`}>{tasksInColumn.length}</span>
                        </h3>

                        {/* Task cards */}
                        <div className="space-y-3 min-h-[60px]">
                            {tasksInColumn.map(task => {
                                const progress = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
                                const isDragging = draggedTaskId === task.id;
                                return (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={e => handleDragStart(e, task.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`bg-white dark:bg-gray-900/60 dark:backdrop-blur-md p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-grab active:cursor-grabbing group select-none ${isDragging ? 'opacity-30 scale-95 rotate-1' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-bold text-sm text-gray-800 dark:text-white group-hover:text-[var(--color-primary)] dark:group-hover:text-red-400 transition-colors leading-snug flex-1 min-w-0">
                                                {task.name}
                                            </p>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {task.priority && (
                                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityColors[task.priority] || priorityColors['Medium']}`}>
                                                        <Flag size={8} /> {task.priority}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={e => { e.stopPropagation(); setEditingTask(task); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-[#c20c0b] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer"
                                                    title="Edit task"
                                                >
                                                    <Edit size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2.5">
                                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 w-7 text-right">{progress}%</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                                            <Clock size={12} /> {task.plannedEndDate || '—'}
                                        </p>
                                        {task.responsible && (
                                            <div className="flex items-center gap-1.5 mt-2.5">
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                                    {task.responsible[0]?.toUpperCase() || '?'}
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.responsible}</span>
                                            </div>
                                        )}
                                        {task.quantity != null && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                                                {task.quantity.toLocaleString()} units
                                            </p>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Inline add-task form */}
                            {addingInColumn === status ? (
                                <div className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-200 dark:border-white/15 shadow-lg p-4 space-y-3">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Task name..."
                                        value={newTask.name}
                                        onChange={e => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveNewTask(); if (e.key === 'Escape') setAddingInColumn(null); }}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#c20c0b] font-semibold"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Priority</label>
                                            <select
                                                value={newTask.priority}
                                                onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value as CrmTask['priority'] }))}
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c20c0b]"
                                            >
                                                <option>Low</option>
                                                <option>Medium</option>
                                                <option>High</option>
                                                <option>Urgent</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Responsible</label>
                                            <input
                                                type="text"
                                                placeholder="Assignee"
                                                value={newTask.responsible}
                                                onChange={e => setNewTask(prev => ({ ...prev, responsible: e.target.value }))}
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c20c0b]"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Start Date</label>
                                            <input
                                                type="date"
                                                value={newTask.plannedStartDate}
                                                onChange={e => setNewTask(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c20c0b]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">End Date</label>
                                            <input
                                                type="date"
                                                value={newTask.plannedEndDate}
                                                onChange={e => setNewTask(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c20c0b]"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Quantity (units)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 500"
                                            value={newTask.quantity}
                                            onChange={e => setNewTask(prev => ({ ...prev, quantity: e.target.value }))}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c20c0b]"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleSaveNewTask}
                                            disabled={!newTask.name.trim()}
                                            className="flex-1 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white text-xs font-bold rounded-lg shadow hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Add Task
                                        </button>
                                        <button
                                            onClick={() => setAddingInColumn(null)}
                                            className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => openAddForm(status)}
                                    className="w-full text-left text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60 p-3 rounded-xl flex items-center gap-2 transition-all duration-200 hover:shadow-md border border-dashed border-gray-300 dark:border-gray-600"
                                >
                                    <Plus size={16} /> Add Task
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {editingTask && (
            <TaskEditModal
                task={editingTask}
                onSave={handleEditSave}
                onClose={() => setEditingTask(null)}
            />
        )}
    </>
    );
}

// ── Admin List view with inline edit ─────────────────────────────────────────
function AdminListView({
    tasks,
    onTasksChange,
    products,
    selectedProductId,
}: {
    tasks: CrmTask[];
    onTasksChange: (tasks: CrmTask[]) => void;
    products?: CrmProduct[];
    selectedProductId?: string | null;
}) {
    const [editingTask, setEditingTask] = useState<CrmTask | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [templateDropdown, setTemplateDropdown] = useState<{ title: string; top: number; right: number } | null>(null);
    const templateBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const toggleTemplates = (title: string) => {
        if (templateDropdown?.title === title) { setTemplateDropdown(null); return; }
        const btn = templateBtnRefs.current[title];
        if (btn) {
            const r = btn.getBoundingClientRect();
            setTemplateDropdown({ title, top: r.bottom + 6, right: window.innerWidth - r.right });
        }
    };

    const blankTask = () => ({
        name: '',
        responsible: '',
        priority: 'Medium' as CrmTask['priority'],
        status: 'TO DO' as CrmTask['status'],
        plannedStartDate: new Date().toISOString().split('T')[0],
        plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes: '',
        progress: 0,
        quantity: '' as string,
        productId: selectedProductId ?? products?.[0]?.id ?? '',
    });

    const [newTaskForm, setNewTaskForm] = useState(blankTask);

    const openAddModal = (status: CrmTask['status'], template?: { name: string; responsible: string }) => {
        setNewTaskForm({ ...blankTask(), status, ...(template ? { name: template.name, responsible: template.responsible } : {}) });
        setShowAddModal(true);
        setTemplateDropdown(null);
    };

    const handleSubmitNewTask = () => {
        if (!newTaskForm.name.trim()) return;
        onTasksChange([...tasks, {
            id: Date.now(),
            name: newTaskForm.name.trim(),
            responsible: newTaskForm.responsible.trim() || 'Admin',
            priority: newTaskForm.priority,
            status: newTaskForm.status,
            plannedStartDate: newTaskForm.plannedStartDate,
            plannedEndDate: newTaskForm.plannedEndDate,
            actualStartDate: null,
            actualEndDate: null,
            notes: newTaskForm.notes,
            progress: newTaskForm.status === 'COMPLETE' ? 100 : newTaskForm.progress,
            ...(newTaskForm.quantity ? { quantity: parseInt(newTaskForm.quantity) } : {}),
            productId: newTaskForm.productId || (selectedProductId ?? products?.[0]?.id ?? ''),
        }]);
        setShowAddModal(false);
        setNewTaskForm(blankTask());
    };

    const handleSave = (updated: CrmTask) => {
        onTasksChange(tasks.map(t => t.id === updated.id ? updated : t));
        setEditingTask(null);
    };

    const priorityColors: Record<string, string> = {
        'Urgent': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
        'High': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
        'Medium': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
        'Low': 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    };

    const groups: { title: string; tasks: CrmTask[]; headerColor: string; badgeColor: string }[] = [
        {
            title: 'TO DO',
            tasks: tasks.filter(t => t.status === 'TO DO'),
            headerColor: 'text-gray-600 dark:text-gray-400',
            badgeColor: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
        },
        {
            title: 'IN PROGRESS',
            tasks: tasks.filter(t => t.status === 'IN PROGRESS'),
            headerColor: 'text-orange-600 dark:text-orange-400',
            badgeColor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        },
        {
            title: 'COMPLETE',
            tasks: tasks.filter(t => t.status === 'COMPLETE'),
            headerColor: 'text-green-600 dark:text-green-400',
            badgeColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        },
    ];

    return (
        <>
            <div className="mt-6 animate-fade-in space-y-6">
                {groups.map(({ title, tasks: groupTasks, headerColor, badgeColor }) => (
                    <div key={title}>
                        {/* Group header with Add + Templates */}
                        <div className="flex items-center justify-between text-sm font-bold mb-3">
                            <div className="flex items-center">
                                <ChevronDown size={20} className={`mr-2 ${headerColor}`} />
                                <span className={`mr-2 ${headerColor}`}>{title}</span>
                                <span className={`${badgeColor} text-xs font-bold px-2.5 py-1 rounded-full shadow-sm`}>{groupTasks.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {/* Templates button — dropdown rendered via portal to avoid stacking-context/overflow issues */}
                                <button
                                    ref={el => { templateBtnRefs.current[title] = el; }}
                                    onClick={() => toggleTemplates(title)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <Zap size={12} /> Templates <ChevronDown size={10} />
                                </button>
                                {/* Add task button */}
                                <button
                                    onClick={() => openAddModal(title as CrmTask['status'])}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#c20c0b] to-red-600 text-white shadow-sm hover:shadow-md transition-all"
                                >
                                    <Plus size={13} /> Add task
                                </button>
                            </div>
                        </div>

                        {groupTasks.length === 0 ? (
                            <div className="text-center py-8 bg-white dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm">
                                No tasks yet — use <span className="font-semibold">Add task</span> or <span className="font-semibold">Templates</span> to get started.
                            </div>
                        ) : (
                            <div className="overflow-x-auto bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                                        <tr>
                                            {['Task Name', 'Priority', 'Progress', 'Due Date', 'Responsible', 'QTY', ''].map(h => (
                                                <th key={h} className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800">
                                        {groupTasks.map(task => {
                                            const progress = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
                                            return (
                                                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                                    <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <CheckCircle size={16} className={`flex-shrink-0 ${task.status === 'COMPLETE' ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                                        {task.name}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        {task.priority ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${priorityColors[task.priority] || priorityColors['Medium']}`}>
                                                                <Flag size={10} /> {task.priority}
                                                            </span>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2 min-w-[100px]">
                                                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                                                            </div>
                                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8 text-right">{progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300 text-xs">{task.plannedEndDate || '—'}</td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300 text-xs">{task.responsible || '—'}</td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300 font-medium text-xs">
                                                        {task.quantity != null ? task.quantity.toLocaleString() : '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                                        <button
                                                            onClick={() => setEditingTask(task)}
                                                            className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                        >
                                                            <Edit size={12} /> Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {editingTask && (
                <TaskEditModal task={editingTask} onSave={handleSave} onClose={() => setEditingTask(null)} />
            )}

            {/* ── Templates portal — rendered at document.body to escape overflow/stacking-context issues ── */}
            {templateDropdown && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setTemplateDropdown(null)} />
                    <div
                        className="fixed z-[9999] w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl max-h-72 overflow-y-auto"
                        style={{ top: templateDropdown.top, right: templateDropdown.right }}
                    >
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-3 pb-1">Garment Templates</p>
                        {TASK_TEMPLATES.map((tpl, i) => (
                            <button key={i} onClick={() => openAddModal(templateDropdown.title as CrmTask['status'], tpl)}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                                <span>{tpl.name}</span>
                                <span className="text-xs text-gray-400">{tpl.responsible}</span>
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}

            {/* ── Add Task Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg"><Plus size={16} className="text-[#c20c0b]" /></div>
                                <h2 className="text-base font-bold text-gray-800 dark:text-white">Add New Task</h2>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Task Name *</label>
                                <input
                                    list="list-task-name-templates"
                                    autoFocus
                                    type="text"
                                    value={newTaskForm.name}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const matched = TASK_TEMPLATES.find(t => t.name === val);
                                        setNewTaskForm(prev => ({ ...prev, name: val, ...(matched ? { responsible: matched.responsible } : {}) }));
                                    }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSubmitNewTask(); if (e.key === 'Escape') setShowAddModal(false); }}
                                    placeholder="e.g. Fabric Sourcing"
                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none"
                                />
                                <datalist id="list-task-name-templates">
                                    {TASK_TEMPLATES.map((t, i) => <option key={i} value={t.name} />)}
                                </datalist>
                            </div>

                            {/* Responsible + Priority */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Responsible</label>
                                    <input type="text" value={newTaskForm.responsible}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, responsible: e.target.value }))}
                                        placeholder="e.g. Merch Team"
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Priority</label>
                                    <select value={newTaskForm.priority}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, priority: e.target.value as CrmTask['priority'] }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none">
                                        <option value="Low">↓ Low</option>
                                        <option value="Medium">→ Medium</option>
                                        <option value="High">↑ High</option>
                                        <option value="Urgent">⚡ Urgent</option>
                                    </select>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Status</label>
                                <div className="flex gap-2">
                                    {(['TO DO', 'IN PROGRESS', 'COMPLETE'] as CrmTask['status'][]).map(s => (
                                        <button key={s} onClick={() => setNewTaskForm(prev => ({ ...prev, status: s }))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${newTaskForm.status === s
                                                ? s === 'TO DO' ? 'bg-slate-500 text-white border-slate-500' : s === 'IN PROGRESS' ? 'bg-blue-500 text-white border-blue-500' : 'bg-emerald-500 text-white border-emerald-500'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}>
                                            {s === 'TO DO' ? 'To Do' : s === 'IN PROGRESS' ? 'In Progress' : 'Complete'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Start Date</label>
                                    <input type="date" value={newTaskForm.plannedStartDate}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">End Date</label>
                                    <input type="date" value={newTaskForm.plannedEndDate}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none" />
                                </div>
                            </div>

                            {/* Progress slider — only for IN PROGRESS */}
                            {newTaskForm.status === 'IN PROGRESS' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between">
                                        <span>Progress</span>
                                        <span className="text-blue-600 dark:text-blue-400">{newTaskForm.progress}%</span>
                                    </label>
                                    <input type="range" min={0} max={100} step={5}
                                        value={newTaskForm.progress}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, progress: +e.target.value }))}
                                        className="w-full accent-[#c20c0b]" />
                                </div>
                            )}

                            {/* Product assignment */}
                            {products && products.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Assign to Product</label>
                                    <select value={newTaskForm.productId}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, productId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none">
                                        <option value="">— Unassigned —</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Quantity */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Quantity (units)</label>
                                <input type="number" min="0" value={newTaskForm.quantity}
                                    onChange={e => setNewTaskForm(prev => ({ ...prev, quantity: e.target.value }))}
                                    placeholder="e.g. 500"
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none" />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Notes</label>
                                <textarea rows={2} value={newTaskForm.notes}
                                    onChange={e => setNewTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Optional notes..."
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none resize-none" />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center gap-3">
                            <button onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSubmitNewTask} disabled={!newTaskForm.name.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#c20c0b] to-red-600 text-white text-sm font-bold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <Plus size={15} /> Add Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Admin Gantt Chart ──────────────────────────────────────────────────────────
const GANTT_DAY_WIDTHS = [16, 24, 36, 52, 72];
const GANTT_LEFT_WIDTH = 260;
const GANTT_ROW_H = 40;
const GANTT_ROW_H_EXP = 104;

const STATUS_GANTT: Record<string, { bar: string; label: string }> = {
    'TO DO':       { bar: 'bg-slate-400 dark:bg-slate-500',    label: 'To Do' },
    'IN PROGRESS': { bar: 'bg-blue-500 dark:bg-blue-500',      label: 'In Progress' },
    'COMPLETE':    { bar: 'bg-emerald-500 dark:bg-emerald-500', label: 'Complete' },
};
const PRIORITY_SYM: Record<string, string> = { Low: '↓', Medium: '→', High: '↑', Urgent: '⚡' };

const GANTT_BLANK_TASK = () => ({
    name: '',
    responsible: '',
    priority: 'Medium' as CrmTask['priority'],
    status: 'TO DO' as CrmTask['status'],
    plannedStartDate: new Date().toISOString().split('T')[0],
    plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: '',
    progress: 0,
    productId: '',
});

function AdminGanttChartView({
    tasks,
    products,
    onTaskUpdate,
    onAddTask,
}: {
    tasks: CrmTask[];
    products?: CrmProduct[];
    onTaskUpdate?: (taskId: number, newStart: string, newEnd: string) => void;
    onAddTask?: (task: CrmTask) => void;
}) {
    const [dayWidth, setDayWidth] = useState(36);
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);

    // ── Add-task modal ───────────────────────────────────────────────────────
    const [showAddModal, setShowAddModal] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [newTaskForm, setNewTaskForm] = useState(GANTT_BLANK_TASK);
    const templateBtnRef = useRef<HTMLButtonElement>(null);

    const openAddModal = (template?: { name: string; responsible: string }) => {
        setNewTaskForm({ ...GANTT_BLANK_TASK(), ...(template ? { name: template.name, responsible: template.responsible } : {}) });
        setShowAddModal(true);
        setShowTemplates(false);
    };

    const handleSubmitNewTask = () => {
        if (!newTaskForm.name.trim() || !onAddTask) return;
        onAddTask({
            id: Date.now(),
            name: newTaskForm.name.trim(),
            responsible: newTaskForm.responsible.trim() || 'Admin',
            priority: newTaskForm.priority,
            status: newTaskForm.status,
            plannedStartDate: newTaskForm.plannedStartDate,
            plannedEndDate: newTaskForm.plannedEndDate,
            actualStartDate: null,
            actualEndDate: null,
            notes: newTaskForm.notes,
            progress: newTaskForm.status === 'COMPLETE' ? 100 : newTaskForm.progress,
            productId: newTaskForm.productId || (products?.[0]?.id ?? ''),
        });
        setShowAddModal(false);
        setNewTaskForm(GANTT_BLANK_TASK());
    };

    const [interaction, setInteraction] = useState<{
        type: 'move' | 'resize-start' | 'resize-end';
        taskId: number;
        startX: number;
        origStart: Date;
        origEnd: Date;
        deltaDays: number;
    } | null>(null);

    const timelineRef = useRef<HTMLDivElement>(null);
    const leftRef = useRef<HTMLDivElement>(null);

    const parseDate = (s: string) => new Date(s);
    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

    // ── Timeline bounds ──────────────────────────────────────────────────────
    const { timelineStart, totalDays } = useMemo(() => {
        const valid = tasks.filter(t => t.plannedStartDate && t.plannedEndDate);
        if (!valid.length) {
            const s = new Date(today); s.setDate(s.getDate() - 14);
            return { timelineStart: s, totalDays: 60 };
        }
        const starts = valid.map(t => parseDate(t.plannedStartDate).getTime());
        const ends = valid.map(t => parseDate(t.plannedEndDate).getTime());
        const min = new Date(Math.min(...starts));
        const max = new Date(Math.max(...ends));
        min.setDate(min.getDate() - 10);
        max.setDate(max.getDate() + 20);
        return {
            timelineStart: min,
            totalDays: Math.ceil((max.getTime() - min.getTime()) / 86400000) + 1,
        };
    }, [tasks, today]);

    const days = useMemo(() => {
        const arr: Date[] = [];
        const cur = new Date(timelineStart);
        for (let i = 0; i < totalDays; i++) {
            arr.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return arr;
    }, [timelineStart, totalDays]);

    // ── Header groupings ─────────────────────────────────────────────────────
    const monthGroups = useMemo(() => {
        const g: { label: string; span: number }[] = [];
        let cur = '', span = 0;
        days.forEach(d => {
            const lbl = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (lbl !== cur) { if (cur) g.push({ label: cur, span }); cur = lbl; span = 1; }
            else span++;
        });
        if (cur) g.push({ label: cur, span });
        return g;
    }, [days]);

    const weekGroups = useMemo(() => {
        const g: { label: string; span: number; alt: boolean }[] = [];
        let curW = -1, span = 0, alt = false;
        days.forEach(d => {
            const w = Math.ceil((Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
            if (w !== curW) {
                if (curW >= 0) { g.push({ label: `W${curW}`, span, alt }); alt = !alt; }
                curW = w; span = 1;
            } else span++;
        });
        if (curW >= 0) g.push({ label: `W${curW}`, span, alt });
        return g;
    }, [days]);

    // ── Today offset ─────────────────────────────────────────────────────────
    const todayOffset = useMemo(() => {
        const diff = Math.floor((today.getTime() - timelineStart.getTime()) / 86400000);
        return diff >= 0 && diff < totalDays ? diff * dayWidth + dayWidth / 2 : -1;
    }, [today, timelineStart, totalDays, dayWidth]);

    const scrollToToday = useCallback(() => {
        if (timelineRef.current && todayOffset >= 0) {
            timelineRef.current.scrollLeft = Math.max(0, todayOffset - timelineRef.current.clientWidth / 2);
        }
    }, [todayOffset]);

    useEffect(() => { setTimeout(scrollToToday, 150); }, [dayWidth]);

    // ── Sync vertical scroll between panels ─────────────────────────────────
    const syncScroll = useCallback((source: 'left' | 'right') => {
        if (source === 'left' && leftRef.current && timelineRef.current) {
            timelineRef.current.scrollTop = leftRef.current.scrollTop;
        } else if (source === 'right' && timelineRef.current && leftRef.current) {
            leftRef.current.scrollTop = timelineRef.current.scrollTop;
        }
    }, []);

    // ── Grouping ─────────────────────────────────────────────────────────────
    const groups = useMemo(() => {
        if (!products?.length) return [{ key: 'all', label: 'All Tasks', tasks }];
        const result: { key: string; label: string; tasks: CrmTask[] }[] = [];
        products.forEach(p => {
            const pt = tasks.filter(t => t.productId === p.id);
            if (pt.length) result.push({ key: p.id, label: p.name, tasks: pt });
        });
        const unassigned = tasks.filter(t => !products.find(p => p.id === t.productId));
        if (unassigned.length) result.push({ key: 'unassigned', label: 'Unassigned Tasks', tasks: unassigned });
        return result;
    }, [tasks, products]);

    // ── Drag handlers ────────────────────────────────────────────────────────
    const onBarMouseDown = useCallback((e: React.MouseEvent, task: CrmTask, type: 'move' | 'resize-start' | 'resize-end') => {
        if (!onTaskUpdate) return;
        e.preventDefault(); e.stopPropagation();
        setInteraction({
            type, taskId: task.id, startX: e.clientX,
            origStart: parseDate(task.plannedStartDate),
            origEnd: parseDate(task.plannedEndDate),
            deltaDays: 0,
        });
    }, [onTaskUpdate]);

    useEffect(() => {
        if (!interaction) return;
        const onMove = (e: MouseEvent) => {
            const delta = Math.round((e.clientX - interaction.startX) / dayWidth);
            setInteraction(p => p ? { ...p, deltaDays: delta } : null);
        };
        const onUp = () => {
            if (interaction && onTaskUpdate && interaction.deltaDays !== 0) {
                const d = interaction.deltaDays;
                let s = new Date(interaction.origStart);
                let en = new Date(interaction.origEnd);
                if (interaction.type === 'move') { s.setDate(s.getDate() + d); en.setDate(en.getDate() + d); }
                else if (interaction.type === 'resize-start') { s.setDate(s.getDate() + d); if (s > en) s = new Date(en); }
                else { en.setDate(en.getDate() + d); if (en < s) en = new Date(s); }
                onTaskUpdate(interaction.taskId, s.toISOString().split('T')[0], en.toISOString().split('T')[0]);
            }
            setInteraction(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [interaction, dayWidth, onTaskUpdate]);

    // ── Bar geometry ─────────────────────────────────────────────────────────
    const getBar = useCallback((task: CrmTask) => {
        if (!task.plannedStartDate || !task.plannedEndDate) return null;
        let s = Math.floor((parseDate(task.plannedStartDate).getTime() - timelineStart.getTime()) / 86400000);
        let e = Math.floor((parseDate(task.plannedEndDate).getTime() - timelineStart.getTime()) / 86400000);
        if (interaction?.taskId === task.id) {
            const d = interaction.deltaDays;
            if (interaction.type === 'move') { s += d; e += d; }
            else if (interaction.type === 'resize-start') s = Math.min(s + d, e);
            else e = Math.max(e + d, s);
        }
        return { left: s * dayWidth, width: Math.max((e - s + 1) * dayWidth - 3, dayWidth - 3) };
    }, [timelineStart, dayWidth, interaction]);

    // ── Render rows (shared for both panels) ─────────────────────────────────
    const rowList: { type: 'group'; key: string; label: string; count: number } | { type: 'task'; task: CrmTask; groupKey: string } extends infer T ? T[] : never = useMemo(() => {
        const rows: any[] = [];
        groups.forEach(g => {
            rows.push({ type: 'group', key: g.key, label: g.label, count: g.tasks.length });
            if (!collapsedGroups.has(g.key)) g.tasks.forEach(task => rows.push({ type: 'task', task, groupKey: g.key }));
        });
        return rows;
    }, [groups, collapsedGroups]);

    const getRowHeight = (row: any) => row.type === 'group' ? GANTT_ROW_H : expandedTasks.has(row.task.id) ? GANTT_ROW_H_EXP : GANTT_ROW_H;
    const totalRowHeight = rowList.reduce((acc, r) => acc + getRowHeight(r), 0);

    const isOverdue = (task: CrmTask) =>
        task.status !== 'COMPLETE' && !!task.plannedEndDate && parseDate(task.plannedEndDate) < today;

    return (
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-white/10 flex-shrink-0 flex-wrap">
                <GanttChartSquare size={15} className="text-[#c20c0b]" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 mr-1">Gantt</span>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

                {/* Zoom */}
                <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-400 font-medium">Zoom:</span>
                    {([['XS','16'],['S','24'],['M','36'],['L','52'],['XL','72']] as [string,string][]).map(([lbl, w]) => (
                        <button key={w} onClick={() => setDayWidth(+w)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${dayWidth === +w ? 'bg-[#c20c0b] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            {lbl}
                        </button>
                    ))}
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

                {/* Today button */}
                <button onClick={scrollToToday}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 text-[11px] font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    <CalendarDays size={12} /> Today
                </button>

                {/* Expand all / Collapse all */}
                <button onClick={() => setExpandedTasks(new Set(tasks.map(t => t.id)))}
                    className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium">
                    Expand All
                </button>
                <button onClick={() => setExpandedTasks(new Set())}
                    className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium">
                    Collapse All
                </button>

                <div className="flex-1" />

                {/* Legend */}
                <div className="hidden lg:flex items-center gap-3">
                    {Object.entries(STATUS_GANTT).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-sm ${v.bar}`} />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{v.label}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-red-400/60" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Today</span>
                    </div>
                </div>

                {onAddTask && (
                    <>
                        <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
                        {/* Templates dropdown */}
                        <div className="relative">
                            <button
                                ref={templateBtnRef}
                                onClick={() => setShowTemplates(p => !p)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 text-[11px] font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Zap size={12} /> Templates <ChevronDown size={10} />
                            </button>
                            {showTemplates && (
                                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl z-50 max-h-72 overflow-y-auto">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-3 pb-1">Garment Templates</p>
                                    {TASK_TEMPLATES.map((tpl, i) => (
                                        <button key={i} onClick={() => openAddModal(tpl)}
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                                            <span className="font-medium">{tpl.name}</span>
                                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{tpl.responsible}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Add Task button */}
                        <button onClick={() => openAddModal()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#c20c0b] to-red-600 text-white text-[11px] font-bold hover:shadow-md hover:scale-105 transition-all duration-200">
                            <Plus size={13} /> Add Task
                        </button>
                    </>
                )}
            </div>

            {/* ── Main area ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* LEFT panel — task names */}
                <div
                    ref={leftRef}
                    onScroll={() => syncScroll('left')}
                    className="flex-shrink-0 border-r border-gray-200 dark:border-white/10 overflow-y-auto overflow-x-hidden"
                    style={{ width: GANTT_LEFT_WIDTH }}
                >
                    {/* Sticky header */}
                    <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-white/10">
                        <div className="h-6 flex items-center px-3 border-b border-gray-100 dark:border-white/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Month</span>
                        </div>
                        <div className="h-5 flex items-center px-3 border-b border-gray-100 dark:border-white/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Week</span>
                        </div>
                        <div className="h-8 flex items-center px-3">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Task / Product</span>
                        </div>
                    </div>

                    {/* Rows */}
                    {rowList.map((row: any, i: number) => {
                        const h = getRowHeight(row);
                        if (row.type === 'group') {
                            return (
                                <div key={`g-${row.key}`}
                                    className="flex items-center gap-2 px-3 cursor-pointer bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors select-none"
                                    style={{ height: h }}
                                    onClick={() => setCollapsedGroups(prev => {
                                        const n = new Set(prev);
                                        n.has(row.key) ? n.delete(row.key) : n.add(row.key);
                                        return n;
                                    })}
                                >
                                    {collapsedGroups.has(row.key)
                                        ? <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                                        : <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />}
                                    <Package size={12} className="text-[#c20c0b] flex-shrink-0" />
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate flex-1">{row.label}</span>
                                    <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-1.5 py-0.5 font-semibold">{row.count}</span>
                                </div>
                            );
                        }
                        const task: CrmTask = row.task;
                        const cfg = STATUS_GANTT[task.status] || STATUS_GANTT['TO DO'];
                        const overdue = isOverdue(task);
                        const expanded = expandedTasks.has(task.id);
                        const prog = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
                        return (
                            <div key={`t-${task.id}`}
                                className={`flex flex-col border-b border-gray-50 dark:border-white/[0.04] transition-all ${overdue ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}
                                style={{ height: h }}
                            >
                                <div
                                    className="flex items-center gap-2 px-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors select-none flex-shrink-0"
                                    style={{ height: GANTT_ROW_H }}
                                    onClick={() => setExpandedTasks(prev => {
                                        const n = new Set(prev); n.has(task.id) ? n.delete(task.id) : n.add(task.id); return n;
                                    })}
                                >
                                    <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${cfg.bar}`} />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate flex-1">{task.name}</span>
                                    {overdue && <AlertTriangle size={10} className="text-red-500 flex-shrink-0" />}
                                    {task.priority && <span className="text-[9px] text-gray-400 font-bold flex-shrink-0">{PRIORITY_SYM[task.priority]}</span>}
                                    {expanded ? <ChevronUp size={10} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={10} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                                </div>
                                {expanded && (
                                    <div className="px-3 pb-2 pt-0.5 space-y-1 overflow-hidden">
                                        <div className="flex items-center gap-1">
                                            <User size={9} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{task.responsible || '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <CalendarDays size={9} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {task.plannedStartDate?.slice(5) || '?'} → {task.plannedEndDate?.slice(5) || '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-0.5">
                                                <span className="text-[9px] text-gray-400">Progress</span>
                                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300">{prog}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${prog >= 100 ? 'bg-emerald-500' : prog > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${prog}%` }}
                                                />
                                            </div>
                                        </div>
                                        {task.notes && (
                                            <p className="text-[10px] text-gray-400 italic line-clamp-1">{task.notes}</p>
                                        )}
                                        {task.priority && (
                                            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-bold ${INLINE_PRIORITY_CONFIG[task.priority]?.bg || ''} ${INLINE_PRIORITY_CONFIG[task.priority]?.text || ''}`}>
                                                {PRIORITY_SYM[task.priority]} {task.priority}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {tasks.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-xs text-gray-400">No tasks</div>
                    )}
                </div>

                {/* RIGHT panel — timeline */}
                <div
                    ref={timelineRef}
                    onScroll={() => syncScroll('right')}
                    className="flex-1 overflow-auto"
                >
                    <div style={{ width: Math.max(totalDays * dayWidth, 1), position: 'relative' }}>
                        {/* Sticky header */}
                        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-white/10">
                            {/* Month row */}
                            <div className="flex h-6">
                                {monthGroups.map((m, i) => (
                                    <div key={i}
                                        className="flex-shrink-0 border-r border-b border-gray-100 dark:border-white/5 flex items-center px-2 overflow-hidden"
                                        style={{ width: m.span * dayWidth }}>
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{m.label}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Week row */}
                            <div className="flex h-5">
                                {weekGroups.map((w, i) => (
                                    <div key={i}
                                        className={`flex-shrink-0 border-r border-b border-gray-100 dark:border-white/5 flex items-center justify-center overflow-hidden ${w.alt ? 'bg-gray-50/70 dark:bg-white/[0.015]' : ''}`}
                                        style={{ width: w.span * dayWidth }}>
                                        {dayWidth >= 24 && <span className="text-[9px] text-gray-400 font-semibold">{w.label}</span>}
                                    </div>
                                ))}
                            </div>
                            {/* Day row */}
                            <div className="flex h-8">
                                {days.map((d, i) => {
                                    const isToday = d.getTime() === today.getTime();
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    return (
                                        <div key={i}
                                            className={`flex-shrink-0 border-r border-gray-100 dark:border-white/5 flex flex-col items-center justify-center overflow-hidden
                                                ${isToday ? 'bg-red-50 dark:bg-red-900/20' : isWeekend ? 'bg-gray-50/80 dark:bg-white/[0.015]' : ''}`}
                                            style={{ width: dayWidth }}>
                                            {dayWidth >= 24 && (
                                                <span className={`text-[9px] font-bold leading-none ${isToday ? 'text-[#c20c0b]' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {d.getDate()}
                                                </span>
                                            )}
                                            {dayWidth >= 36 && (
                                                <span className={`text-[8px] leading-none mt-0.5 ${isToday ? 'text-red-400' : 'text-gray-400 dark:text-gray-600'}`}>
                                                    {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Task rows (bars) ── */}
                        <div className="relative" style={{ height: totalRowHeight }}>
                            {/* Weekend columns */}
                            {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) && (
                                <div key={i}
                                    className="absolute top-0 bottom-0 bg-gray-100/50 dark:bg-white/[0.015] pointer-events-none"
                                    style={{ left: i * dayWidth, width: dayWidth }} />
                            ))}

                            {/* Today line */}
                            {todayOffset >= 0 && (
                                <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: todayOffset }}>
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-[#c20c0b]/50" />
                                    <div className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-[#c20c0b] -translate-x-[5px]" />
                                </div>
                            )}

                            {/* Row backgrounds + bars */}
                            {(() => {
                                let yOffset = 0;
                                return rowList.map((row: any) => {
                                    const h = getRowHeight(row);
                                    const top = yOffset;
                                    yOffset += h;

                                    if (row.type === 'group') {
                                        return (
                                            <div key={`gr-${row.key}`}
                                                className="absolute left-0 right-0 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/30"
                                                style={{ top, height: h }} />
                                        );
                                    }

                                    const task: CrmTask = row.task;
                                    const bar = getBar(task);
                                    const cfg = STATUS_GANTT[task.status] || STATUS_GANTT['TO DO'];
                                    const isDragging = interaction?.taskId === task.id;
                                    const overdue = isOverdue(task);
                                    const prog = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
                                    const isHovered = hoveredTaskId === task.id;

                                    return (
                                        <div key={`tr-${task.id}`}
                                            className={`absolute left-0 right-0 border-b border-gray-50 dark:border-white/[0.03] ${overdue ? 'bg-red-50/20 dark:bg-red-900/5' : ''}`}
                                            style={{ top, height: h }}
                                            onMouseEnter={() => setHoveredTaskId(task.id)}
                                            onMouseLeave={() => setHoveredTaskId(null)}
                                        >
                                            {bar && (
                                                <div
                                                    className={`absolute rounded-md overflow-visible select-none group ${isDragging ? 'z-30 opacity-90' : 'z-10'} ${onTaskUpdate ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                                                    style={{ left: bar.left, width: bar.width, top: 8, height: 24 }}
                                                    onMouseDown={(e) => onBarMouseDown(e, task, 'move')}
                                                >
                                                    {/* Base fill */}
                                                    <div className={`absolute inset-0 rounded-md ${cfg.bar} opacity-85`} />

                                                    {/* Progress shimmer */}
                                                    {prog > 0 && prog < 100 && (
                                                        <div className="absolute inset-y-0 left-0 rounded-l-md bg-white/25 pointer-events-none"
                                                            style={{ width: `${prog}%` }} />
                                                    )}

                                                    {/* Stripe for overdue */}
                                                    {overdue && (
                                                        <div className="absolute inset-0 rounded-md pointer-events-none overflow-hidden opacity-20"
                                                            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.6) 4px, rgba(255,255,255,0.6) 8px)' }} />
                                                    )}

                                                    {/* Left resize handle */}
                                                    {onTaskUpdate && (
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 hover:bg-black/20 rounded-l-md flex items-center justify-center"
                                                            onMouseDown={(e) => { e.stopPropagation(); onBarMouseDown(e, task, 'resize-start'); }}
                                                        >
                                                            <div className="w-px h-3 bg-white/60 rounded-full" />
                                                        </div>
                                                    )}

                                                    {/* Label */}
                                                    {bar.width > 48 && (
                                                        <span className="relative z-10 text-[10px] font-semibold text-white truncate px-3 pointer-events-none leading-6 block">
                                                            {task.priority ? PRIORITY_SYM[task.priority] + ' ' : ''}{task.name}
                                                        </span>
                                                    )}

                                                    {/* Right resize handle */}
                                                    {onTaskUpdate && (
                                                        <div
                                                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20 hover:bg-black/20 rounded-r-md flex items-center justify-center"
                                                            onMouseDown={(e) => { e.stopPropagation(); onBarMouseDown(e, task, 'resize-end'); }}
                                                        >
                                                            <div className="w-px h-3 bg-white/60 rounded-full" />
                                                        </div>
                                                    )}

                                                    {/* Tooltip */}
                                                    {isHovered && !isDragging && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 w-52">
                                                            <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl p-3 text-[11px] border border-white/10">
                                                                <p className="font-bold text-sm mb-1 leading-tight">{task.name}</p>
                                                                <div className="space-y-0.5 text-gray-300">
                                                                    <p><span className="text-gray-500">Who:</span> {task.responsible || '—'}</p>
                                                                    <p><span className="text-gray-500">Start:</span> {task.plannedStartDate || '—'}</p>
                                                                    <p><span className="text-gray-500">End:</span> {task.plannedEndDate || '—'}</p>
                                                                    {prog > 0 && <p><span className="text-gray-500">Progress:</span> <span className="text-blue-400 font-semibold">{prog}%</span></p>}
                                                                    {task.priority && <p><span className="text-gray-500">Priority:</span> {PRIORITY_SYM[task.priority]} {task.priority}</p>}
                                                                    {overdue && <p className="text-red-400 font-semibold mt-1">⚠ Overdue</p>}
                                                                </div>
                                                            </div>
                                                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-800 mx-auto" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Actual dates underline (for completed tasks) */}
                                            {task.status === 'COMPLETE' && task.actualStartDate && task.actualEndDate && (() => {
                                                const s = Math.floor((parseDate(task.actualStartDate).getTime() - timelineStart.getTime()) / 86400000);
                                                const e = Math.floor((parseDate(task.actualEndDate).getTime() - timelineStart.getTime()) / 86400000);
                                                return (
                                                    <div
                                                        className="absolute rounded-sm bg-emerald-400/30 dark:bg-emerald-500/20 border-t border-emerald-500/40 pointer-events-none"
                                                        style={{ left: s * dayWidth, width: Math.max((e - s + 1) * dayWidth - 3, dayWidth - 3), bottom: 4, height: 3 }}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer stats ── */}
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/10 px-4 py-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap bg-gray-50/50 dark:bg-white/[0.02]">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{tasks.length} tasks</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{tasks.filter(t => t.status === 'COMPLETE').length} complete</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{tasks.filter(t => t.status === 'IN PROGRESS').length} in progress</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">{tasks.filter(t => t.status === 'TO DO').length} to do</span>
                {tasks.filter(isOverdue).length > 0 && (
                    <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                            <AlertTriangle size={10} /> {tasks.filter(isOverdue).length} overdue
                        </span>
                    </>
                )}
                <div className="flex-1" />
                <span className="text-gray-400 italic">{onTaskUpdate ? 'Drag bars to reschedule · Drag edges to resize' : 'Read-only'}</span>
            </div>

            {/* ── Add Task Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowAddModal(false); setShowTemplates(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 w-full max-w-lg animate-fade-in"
                        onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <Plus size={16} className="text-[#c20c0b]" />
                                </div>
                                <h2 className="text-base font-bold text-gray-800 dark:text-white">Add New Task</h2>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Task Name *</label>
                                <input
                                    list="gantt-task-name-templates"
                                    autoFocus
                                    type="text"
                                    value={newTaskForm.name}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const matched = TASK_TEMPLATES.find(t => t.name === val);
                                        setNewTaskForm(prev => ({ ...prev, name: val, ...(matched ? { responsible: matched.responsible } : {}) }));
                                    }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSubmitNewTask(); if (e.key === 'Escape') setShowAddModal(false); }}
                                    placeholder="e.g. Fabric Sourcing"
                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none"
                                />
                                <datalist id="gantt-task-name-templates">
                                    {TASK_TEMPLATES.map((t, i) => <option key={i} value={t.name} />)}
                                </datalist>
                            </div>

                            {/* Responsible + Priority */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Responsible</label>
                                    <input
                                        type="text"
                                        value={newTaskForm.responsible}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, responsible: e.target.value }))}
                                        placeholder="e.g. Merch Team"
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Priority</label>
                                    <select
                                        value={newTaskForm.priority}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, priority: e.target.value as CrmTask['priority'] }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none"
                                    >
                                        <option value="Low">↓ Low</option>
                                        <option value="Medium">→ Medium</option>
                                        <option value="High">↑ High</option>
                                        <option value="Urgent">⚡ Urgent</option>
                                    </select>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Status</label>
                                <div className="flex gap-2">
                                    {(['TO DO', 'IN PROGRESS', 'COMPLETE'] as CrmTask['status'][]).map(s => (
                                        <button key={s} onClick={() => setNewTaskForm(prev => ({ ...prev, status: s }))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${newTaskForm.status === s
                                                ? s === 'TO DO' ? 'bg-slate-500 text-white border-slate-500' : s === 'IN PROGRESS' ? 'bg-blue-500 text-white border-blue-500' : 'bg-emerald-500 text-white border-emerald-500'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}>
                                            {s === 'TO DO' ? 'To Do' : s === 'IN PROGRESS' ? 'In Progress' : 'Complete'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Start Date</label>
                                    <input type="date" value={newTaskForm.plannedStartDate}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">End Date</label>
                                    <input type="date" value={newTaskForm.plannedEndDate}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none" />
                                </div>
                            </div>

                            {/* Progress (only if not TO DO) */}
                            {newTaskForm.status === 'IN PROGRESS' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between">
                                        <span>Progress</span>
                                        <span className="text-blue-600 dark:text-blue-400">{newTaskForm.progress}%</span>
                                    </label>
                                    <input type="range" min={0} max={100} step={5}
                                        value={newTaskForm.progress}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, progress: +e.target.value }))}
                                        className="w-full accent-[#c20c0b]" />
                                </div>
                            )}

                            {/* Product assignment */}
                            {products && products.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Assign to Product</label>
                                    <select value={newTaskForm.productId}
                                        onChange={e => setNewTaskForm(prev => ({ ...prev, productId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none">
                                        <option value="">— Unassigned —</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Notes</label>
                                <textarea
                                    rows={2}
                                    value={newTaskForm.notes}
                                    onChange={e => setNewTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Optional notes..."
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center gap-3">
                            <button onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSubmitNewTask} disabled={!newTaskForm.name.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#c20c0b] to-red-600 text-white text-sm font-bold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <Plus size={15} /> Add Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
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

    // ── editing ──
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
    const [newOrderData, setNewOrderData] = useState({
        product_name: '',
        factory_id: '',
        status: 'Pending',
        tasks: [] as any[],
        documents: [] as any[],
        products: [] as CrmProduct[]
    });

    // ── inline order management state ──
    const [hasChanges, setHasChanges] = useState(false);
    const [originalOrderStr, setOriginalOrderStr] = useState('');
    const [factoryMode, setFactoryMode] = useState<'list' | 'manual'>('list');
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [taskSearch, setTaskSearch] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
    const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);
    const [taskProductFilter, setTaskProductFilter] = useState('ALL');
    const [showTemplates, setShowTemplates] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSaveOrderRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

    const ordersAbortController = useRef<AbortController | null>(null);
    const mountAbortController = useRef<AbortController | null>(null);

    const { showToast } = useToast();

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

    // ── sync editingOrder whenever selected order changes ──────────────────────
    useEffect(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        setLastSavedAt(null);
        if (selectedOrderId) {
            const order = orders.find(o => o.id === selectedOrderId);
            if (order) {
                const str = JSON.stringify(order);
                setEditingOrder(JSON.parse(str));
                setOriginalOrderStr(str);
                setHasChanges(false);
                setFactoryMode(order.custom_factory_name ? 'manual' : 'list');
                setExpandedTaskId(null);
                setTaskSearch('');
                setTaskStatusFilter('ALL');
                setTaskProductFilter('ALL');
                setCollapsedGroups(new Set());
            }
        } else {
            setEditingOrder(null);
            setHasChanges(false);
            setOriginalOrderStr('');
        }
    }, [selectedOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── track unsaved changes ──────────────────────────────────────────────────
    useEffect(() => {
        if (editingOrder && originalOrderStr) {
            setHasChanges(JSON.stringify(editingOrder) !== originalOrderStr);
        }
    }, [editingOrder, originalOrderStr]);

    // ── auto-save: debounce 1.5s after each edit ───────────────────────────────
    useEffect(() => {
        if (!hasChanges || isSaving) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            handleSaveOrderRef.current(true);
        }, 5000);
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [hasChanges, editingOrder]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const handleSaveOrder = async (silent = false) => {
        if (!editingOrder) return;
        setIsSaving(true);
        try {
            let productName = editingOrder.product_name || 'Order';
            try {
                if (editingOrder.products && editingOrder.products.length > 0) {
                    productName = computeProductName(editingOrder.products);
                }
            } catch (e) {
                console.warn("Error computing product name:", e);
            }

            const custom_factory_name = editingOrder.custom_factory_name || null;
            const custom_factory_location = editingOrder.custom_factory_location || null;

            const updates = {
                status: editingOrder.status,
                tasks: editingOrder.tasks,
                documents: editingOrder.documents,
                products: editingOrder.products || [],
                product_name: productName,
                factory_id: factoryMode === 'list' ? (editingOrder.factory_id || null) : null,
                custom_factory_name: factoryMode === 'manual' ? custom_factory_name : null,
                custom_factory_location: factoryMode === 'manual' ? custom_factory_location : null,
                updated_at: new Date().toISOString()
            };
            const { error } = await crmService.update(editingOrder.id, updates);
            if (error) {
                if (!silent) showToast('Failed to update order: ' + error.message, 'error');
            } else {
                setLastSavedAt(new Date());
                if (!silent) showToast('Order updated successfully');
                setOrders(prev => {
                    const updatedOrders = prev.map(o => o.id === editingOrder.id ? { ...o, ...updates } : o);
                    const ORDERS_CACHE_KEY = `garment_erp_admin_orders_${selectedClientId}`;
                    sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(updatedOrders));
                    return updatedOrders;
                });
                const newStr = JSON.stringify({ ...editingOrder, ...updates });
                setOriginalOrderStr(newStr);
                setHasChanges(false);
            }
        } catch (err: any) {
            console.error("Error saving order:", err);
            if (!silent) showToast('An error occurred while saving: ' + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    handleSaveOrderRef.current = handleSaveOrder;

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

    const handleGanttAddTask = async (newTask: CrmTask) => {
        if (!selectedOrderId) return;
        const orderIndex = orders.findIndex(o => o.id === selectedOrderId);
        if (orderIndex === -1) return;
        const updatedOrders = [...orders];
        const order = { ...updatedOrders[orderIndex], tasks: [...updatedOrders[orderIndex].tasks, newTask] };
        updatedOrders[orderIndex] = order;
        setOrders(updatedOrders);
        const { error } = await crmService.update(order.id, { tasks: order.tasks });
        if (error) { showToast('Failed to add task: ' + error.message, 'error'); fetchOrders(); }
        else showToast('Task added to Gantt', 'success');
    };

    const handleSaveTNATask = async (updatedTask: CrmTask) => {
        if (!selectedOrderId) return;
        const orderIndex = orders.findIndex(o => o.id === selectedOrderId);
        if (orderIndex === -1) return;
        const order = orders[orderIndex];
        const updatedTasks = order.tasks.map((t: any) => t.id === updatedTask.id ? updatedTask : t);
        const updatedOrders = orders.map((o: any, i: number) => i === orderIndex ? { ...o, tasks: updatedTasks } : o);
        setOrders(updatedOrders);
        const { error } = await crmService.update(selectedOrderId, { tasks: updatedTasks });
        if (error) { showToast('Failed to save task: ' + error.message, 'error'); fetchOrders(); }
        else showToast('Task updated successfully', 'success');
    };

    const handleSaveBulkTasks = async (updatedTasks: CrmTask[]) => {
        if (!selectedOrderId) return;
        const orderIndex = orders.findIndex(o => o.id === selectedOrderId);
        if (orderIndex === -1) return;
        const updatedOrders = orders.map((o: any, i: number) => i === orderIndex ? { ...o, tasks: updatedTasks } : o);
        setOrders(updatedOrders);
        const { error } = await crmService.update(selectedOrderId, { tasks: updatedTasks });
        if (error) { showToast('Failed to save TNA: ' + error.message, 'error'); fetchOrders(); }
        else showToast('TNA saved successfully', 'success');
    };

    const handleBoardTasksChange = (updatedTasks: CrmTask[]) => {
        if (!selectedOrderId) return;
        // Merge board changes back into full order tasks (handles product filtering)
        const orderIndex = orders.findIndex(o => o.id === selectedOrderId);
        if (orderIndex === -1) return;
        const order = orders[orderIndex];
        const allTasks: CrmTask[] = order.tasks || [];
        // Replace/add tasks that belong to the current filter scope; keep the rest untouched
        const filteredIds = new Set(filteredTasks.map((t: CrmTask) => t.id));
        const merged = [
            ...allTasks.filter((t: CrmTask) => !filteredIds.has(t.id)),
            ...updatedTasks,
        ];
        const updatedOrders = orders.map((o: any, i: number) => i === orderIndex ? { ...o, tasks: merged } : o);
        setOrders(updatedOrders);
        // Update editingOrder with merged tasks — autosave will detect the change (hasChanges=true) and persist
        setEditingOrder((prev: any) => prev ? { ...prev, tasks: merged } : prev);
    };

    // ── inline task management ─────────────────────────────────────────────────
    const updateInlineTask = useCallback((taskId: number, updates: Record<string, any>) => {
        if (!editingOrder) return;
        setEditingOrder((prev: any) => ({ ...prev, tasks: (prev.tasks || []).map((t: any) => t.id === taskId ? { ...t, ...updates } : t) }));
    }, [editingOrder]);

    const addInlineTask = useCallback((template?: { name: string; responsible: string }, forProductId?: string) => {
        if (!editingOrder) return;
        const prods = editingOrder.products || [];
        const targetProductId = forProductId ?? (taskProductFilter !== 'ALL' ? taskProductFilter : (prods[0]?.id || ''));
        const newTask = {
            id: Date.now(), name: template?.name || 'New Task', status: 'TO DO', priority: 'Medium',
            responsible: template?.responsible || '',
            plannedStartDate: new Date().toISOString().split('T')[0],
            plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            actualStartDate: null, actualEndDate: null, notes: '', progress: 0, productId: targetProductId,
        };
        setEditingOrder((prev: any) => ({ ...prev, tasks: [...(prev.tasks || []), newTask] }));
        setExpandedTaskId(newTask.id);
        setShowTemplates(false);
        if (targetProductId) setCollapsedGroups(prev => { const n = new Set(prev); n.delete(targetProductId); return n; });
    }, [editingOrder, taskProductFilter]);

    const removeInlineTask = useCallback((taskId: number) => {
        if (!editingOrder) return;
        setEditingOrder((prev: any) => ({ ...prev, tasks: (prev.tasks || []).filter((t: any) => t.id !== taskId) }));
        if (expandedTaskId === taskId) setExpandedTaskId(null);
    }, [editingOrder, expandedTaskId]);

    const moveInlineTask = useCallback((taskId: number, direction: 'up' | 'down') => {
        if (!editingOrder) return;
        const tks = editingOrder.tasks || [];
        const idx = tks.findIndex((t: any) => t.id === taskId);
        if (idx === -1 || (direction === 'up' && idx === 0) || (direction === 'down' && idx === tks.length - 1)) return;
        const newTasks = [...tks];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newTasks[idx], newTasks[swapIdx]] = [newTasks[swapIdx], newTasks[idx]];
        setEditingOrder((prev: any) => ({ ...prev, tasks: newTasks }));
    }, [editingOrder]);

    // ── inline product management ──────────────────────────────────────────────
    const addInlineProduct = useCallback(() => {
        if (!editingOrder) return;
        const newProduct: CrmProduct = { id: Date.now().toString(), name: 'New Product', status: 'Pending' };
        setEditingOrder((prev: any) => ({ ...prev, products: [...(prev.products || []), newProduct] }));
    }, [editingOrder]);

    const updateInlineProduct = useCallback((productId: string, field: string, value: any) => {
        if (!editingOrder) return;
        setEditingOrder((prev: any) => ({ ...prev, products: (prev.products || []).map((p: CrmProduct) => p.id === productId ? { ...p, [field]: value } : p) }));
    }, [editingOrder]);

    const removeInlineProduct = useCallback((productId: string) => {
        if (!editingOrder) return;
        const prods = editingOrder.products || [];
        const tks = editingOrder.tasks || [];
        const newProducts = prods.filter((p: CrmProduct) => p.id !== productId);
        const newTasks = tks.map((t: any) => t.productId === productId ? { ...t, productId: newProducts[0]?.id || '' } : t);
        setEditingOrder((prev: any) => ({ ...prev, products: newProducts, tasks: newTasks }));
    }, [editingOrder]);

    // ── inline document management ─────────────────────────────────────────────
    const handleInlineFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !editingOrder) return;
        const file = e.target.files[0];
        if (!supabase) { alert('File upload service not available'); return; }
        setIsUploading(true);
        try {
            const fileName = `crm/${editingOrder.id || 'temp'}/${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage.from('quote-attachments').upload(fileName, file);
            if (error) throw error;
            const newDoc = { name: file.name, type: 'General', lastUpdated: new Date().toISOString().split('T')[0], path: data.path, source: 'company' };
            const updatedDocuments = [...(editingOrder.documents || []), newDoc];
            if (editingOrder.id) {
                const { error: updateError } = await crmService.update(editingOrder.id, { documents: updatedDocuments } as any);
                if (updateError) throw updateError;
            }
            const updated = { ...editingOrder, documents: updatedDocuments };
            setEditingOrder(updated);
            setOriginalOrderStr(JSON.stringify(updated));
        } catch (err: any) {
            console.error('Upload failed', err);
            alert('Failed to upload file: ' + (err.message || 'Unknown error'));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const updateInlineDocument = useCallback((index: number, field: string, value: any) => {
        if (!editingOrder) return;
        const newDocs = [...(editingOrder.documents || [])];
        newDocs[index] = { ...newDocs[index], [field]: value };
        setEditingOrder((prev: any) => ({ ...prev, documents: newDocs }));
    }, [editingOrder]);

    const removeInlineDocument = useCallback((index: number) => {
        if (!editingOrder) return;
        setEditingOrder((prev: any) => ({ ...prev, documents: (prev.documents || []).filter((_: any, i: number) => i !== index) }));
    }, [editingOrder]);

    const handleInlinePreview = async (path: string) => {
        if (!supabase || !path) return;
        try {
            const { data, error } = await supabase.storage.from('quote-attachments').createSignedUrl(path, 60);
            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
        } catch { alert('Failed to preview file'); }
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
    // Derive transformedOrder from editingOrder (not orders[]) so that setOrders() during
    // autosave does NOT invalidate this memo and does NOT re-render the detail view.
    const transformedOrder = useMemo(() => editingOrder ? {
        ...normalizeOrder(editingOrder),
        customer: selectedClient?.name || 'Unknown Client',
    } : null, [editingOrder, selectedClient]);

    const activeOrderCount = useMemo(() =>
        orders.filter(o => o.status === 'In Production' || o.status === 'Quality Check').length
    , [orders]);

    const overviewViews = [
        { name: 'Overview', icon: <Info size={16} /> },
        { name: 'Tasks', icon: <List size={16} /> },
        { name: 'Documents', icon: <FileText size={16} /> },
        { name: 'TNA', icon: <ClipboardCheck size={16} /> },
        { name: 'Dashboard', icon: <PieChartIcon size={16} /> },
        { name: 'Gantt', icon: <GanttChartSquare size={16} /> },
    ];
    const productViews = [
        { name: 'Overview', icon: <Info size={16} /> },
        { name: 'TNA', icon: <ClipboardCheck size={16} /> },
        { name: 'List', icon: <List size={16} /> },
        { name: 'Board', icon: <LayoutDashboard size={16} /> },
        { name: 'Gantt', icon: <GanttChartSquare size={16} /> },
    ];
    const currentViews = selectedProductId ? productViews : overviewViews;

    // Product selector chip click — keep current view if compatible
    const handleSelectProduct = (productId: string | null) => {
        setSelectedProductId(productId);
        if (productId === null) {
            if (['List', 'Board'].includes(activeView)) setActiveView('Overview');
        } else {
            if (['Tasks', 'Documents', 'Dashboard'].includes(activeView)) setActiveView('TNA');
        }
    };
    // Product card click from Overview — navigate to TNA for that product
    const handleSelectProductCard = (productId: string) => {
        setSelectedProductId(productId);
        setActiveView('TNA');
    };

    const selectedProduct = selectedProductId && transformedOrder?.products
        ? transformedOrder.products.find(p => p.id === selectedProductId) || null
        : null;
    const filteredTasks = transformedOrder
        ? (selectedProductId ? transformedOrder.tasks.filter(t => t.productId === selectedProductId) : transformedOrder.tasks)
        : [];

    // ── inline task/doc derived state ──────────────────────────────────────────
    const inlineTasks: any[] = editingOrder?.tasks || [];
    const inlineProducts: CrmProduct[] = editingOrder?.products || [];
    const inlineDocuments: any[] = editingOrder?.documents || [];

    const inlineStats = useMemo(() => {
        const total = inlineTasks.length;
        const completed = inlineTasks.filter((t: any) => t.status === 'COMPLETE').length;
        const inProgress = inlineTasks.filter((t: any) => t.status === 'IN PROGRESS').length;
        const overdue = inlineTasks.filter((t: any) => t.status !== 'COMPLETE' && t.plannedEndDate && new Date(t.plannedEndDate) < new Date()).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, inProgress, overdue, progress };
    }, [inlineTasks]);

    const inlineFilteredTasks = useMemo(() => inlineTasks.filter((task: any) => {
        if (taskSearch && !task.name.toLowerCase().includes(taskSearch.toLowerCase())) return false;
        if (taskStatusFilter !== 'ALL' && task.status !== taskStatusFilter) return false;
        if (taskProductFilter !== 'ALL' && task.productId !== taskProductFilter) return false;
        return true;
    }), [inlineTasks, taskSearch, taskStatusFilter, taskProductFilter]);

    const inlineGroupedTasks = useMemo(() => {
        const groups: Record<string, { product: CrmProduct | null; tasks: any[] }> = {};
        inlineProducts.forEach((p: CrmProduct) => { groups[p.id] = { product: p, tasks: [] }; });
        groups['unassigned'] = { product: null, tasks: [] };
        inlineFilteredTasks.forEach((task: any) => {
            const key = task.productId && groups[task.productId] ? task.productId : 'unassigned';
            groups[key].tasks.push(task);
        });
        return Object.entries(groups).filter(([, g]) => g.tasks.length > 0);
    }, [inlineFilteredTasks, inlineProducts]);

    const getInlineProductProgress = useCallback((productId: string) => {
        const pt = inlineTasks.filter((t: any) => t.productId === productId);
        if (pt.length === 0) return 0;
        return Math.round((pt.filter((t: any) => t.status === 'COMPLETE').length / pt.length) * 100);
    }, [inlineTasks]);

    const isInlineTaskOverdue = (task: any) => task.status !== 'COMPLETE' && task.plannedEndDate && new Date(task.plannedEndDate) < new Date();
    const isInlineTaskDueSoon = (task: any) => {
        if (task.status === 'COMPLETE' || !task.plannedEndDate) return false;
        const d = new Date(task.plannedEndDate), now = new Date();
        return d >= now && d <= new Date(now.getTime() + 3 * 86400000);
    };

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
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                    Orders
                                    <span className="ml-2 text-sm font-normal text-gray-400">({orders.length})</span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowAtRiskOnly(v => !v)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${showAtRiskOnly ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-red-300'}`}
                                    >
                                        <AlertTriangle size={12} /> At Risk
                                    </button>
                                    <button
                                        onClick={() => setIsCreateOrderOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white text-sm font-bold rounded-xl shadow hover:shadow-lg hover:scale-105 transition-all"
                                    >
                                        <Plus size={16} /> New Order
                                    </button>
                                </div>
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
                                    {orders
                                        .map(order => ({ order, riskScore: calculateOrderRiskScore(order.tasks || []) }))
                                        .filter(({ riskScore }) => !showAtRiskOnly || riskScore === 'amber' || riskScore === 'red')
                                        .sort((a, b) => {
                                            const rank: Record<string, number> = { red: 0, amber: 1, green: 2 };
                                            return (rank[a.riskScore] ?? 2) - (rank[b.riskScore] ?? 2);
                                        })
                                        .map(({ order, riskScore }, idx) => {
                                            const normalized = normalizeOrder(order);
                                            const factory = factories.find(f => f.id === order.factory_id);
                                            return (
                                                <div key={order.id} className="relative">
                                                    <CrmOrderCard
                                                        orderId={order.id}
                                                        order={{ ...normalized, customer: selectedClient?.name || '' }}
                                                        factory={factory}
                                                        index={idx}
                                                        onClick={() => handleSelectOrder(order.id)}
                                                    />
                                                    <div className="absolute top-3 right-3 pointer-events-none">
                                                        <RiskBadge score={riskScore as any} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Order detail view ── */}
                    {!isLoading && selectedOrderId && transformedOrder && editingOrder && (
                        <div className="animate-fade-in">
                            {/* Detail header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        onClick={handleBackToOrders}
                                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] dark:hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                        <ArrowLeft size={18} />
                                        <span className="hidden sm:inline">All Orders</span>
                                    </button>
                                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                                        {transformedOrder.product}
                                    </h2>
                                    <RiskBadge score={calculateOrderRiskScore(transformedOrder.tasks || [])} />
                                    {/* Save status — single static element, only text content changes, no layout shift */}
                                    <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap">
                                        <CheckCircle size={10} className={lastSavedAt ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'} />
                                        {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : hasChanges ? 'Unsaved' : 'No changes'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Save Now — always in DOM, invisible when not needed, no layout shift */}
                                    <button
                                        onClick={() => handleSaveOrder(false)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white text-sm font-bold rounded-xl shadow hover:shadow-lg transition-all"
                                        style={{ opacity: hasChanges && !isSaving ? 1 : 0, pointerEvents: hasChanges && !isSaving ? 'auto' : 'none' }}
                                        tabIndex={hasChanges && !isSaving ? 0 : -1}
                                    >
                                        <Save size={15} /> Save Now
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
                                {/* Product selector chips */}
                                {transformedOrder?.products && transformedOrder.products.length > 0 && (
                                    <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Product:</span>
                                        <button
                                            onClick={() => handleSelectProduct(null)}
                                            className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                                !selectedProductId
                                                    ? 'bg-gradient-to-r from-[#c20c0b] to-red-600 text-white shadow-md'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            All
                                        </button>
                                        {transformedOrder.products.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleSelectProduct(p.id)}
                                                className={`flex items-center gap-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                                    selectedProductId === p.id
                                                        ? 'bg-gradient-to-r from-[#c20c0b] to-red-600 text-white shadow-md'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <Package size={11} />
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
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
                                                {view.name === 'Tasks' && inlineTasks.length > 0 && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeView === 'Tasks' ? 'bg-red-100 dark:bg-red-900/30 text-[#c20c0b] dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{inlineTasks.length}</span>
                                                )}
                                                {view.name === 'Documents' && inlineDocuments.length > 0 && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeView === 'Documents' ? 'bg-red-100 dark:bg-red-900/30 text-[#c20c0b] dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{inlineDocuments.length}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 sm:p-6">
                                    {/* ── OVERVIEW TAB ── */}
                                    {activeView === 'Overview' && (
                                        <div className="space-y-6">
                                            {/* Editable Status + Factory row */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 border-b border-gray-100 dark:border-white/10">
                                                {/* Status */}
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Status</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['Pending', 'In Production', 'Quality Check', 'Shipped', 'Completed'].map(status => {
                                                            const cfg = ORDER_STATUS_CONFIG[status];
                                                            const isSel = editingOrder.status === status;
                                                            return (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => setEditingOrder({ ...editingOrder, status })}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ring-2 ${
                                                                        isSel
                                                                            ? `${cfg.bg} ${cfg.text} ${cfg.ring} scale-105 shadow-md`
                                                                            : 'ring-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                    }`}
                                                                >
                                                                    {status}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Factory */}
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assigned Factory</label>
                                                    <div className="flex gap-1.5 mb-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setFactoryMode('list'); setEditingOrder({ ...editingOrder, custom_factory_name: '', custom_factory_location: '' }); }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${factoryMode === 'list' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                                        >
                                                            <Building2 size={12} /> From List
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setFactoryMode('manual'); setEditingOrder({ ...editingOrder, factory_id: '' }); }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${factoryMode === 'manual' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                                        >
                                                            <PencilLine size={12} /> Manual
                                                        </button>
                                                    </div>
                                                    {factoryMode === 'list' ? (
                                                        factories && factories.length > 0 ? (
                                                            <select
                                                                value={editingOrder.factory_id || ''}
                                                                onChange={(e) => setEditingOrder({ ...editingOrder, factory_id: e.target.value })}
                                                                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none"
                                                            >
                                                                <option value="">— Select Factory —</option>
                                                                {factories.map((f: any) => (
                                                                    <option key={f.id} value={f.id}>{f.name}{f.location ? ` · ${f.location}` : ''}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <p className="text-sm text-gray-400 italic p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">No factories available. Use Manual entry.</p>
                                                        )
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="relative">
                                                                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                                <input type="text" value={editingOrder.custom_factory_name || ''} onChange={(e) => setEditingOrder({ ...editingOrder, custom_factory_name: e.target.value })} placeholder="Factory name" className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none" />
                                                            </div>
                                                            <div className="relative">
                                                                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                                <input type="text" value={editingOrder.custom_factory_location || ''} onChange={(e) => setEditingOrder({ ...editingOrder, custom_factory_location: e.target.value })} placeholder="Location (e.g. Dhaka, Bangladesh)" className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stats cards */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center gap-2 mb-1.5"><Package size={14} className="text-blue-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Products</span></div>
                                                    <p className="text-xl font-bold text-gray-800 dark:text-white">{inlineProducts.length}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center gap-2 mb-1.5"><CheckCircle size={14} className="text-green-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Completed</span></div>
                                                    <p className="text-xl font-bold text-gray-800 dark:text-white">{inlineStats.completed}<span className="text-sm text-gray-400 font-normal">/{inlineStats.total}</span></p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center gap-2 mb-1.5"><TrendingUp size={14} className="text-blue-500" /><span className="text-xs text-gray-500 dark:text-gray-400">In Progress</span></div>
                                                    <p className="text-xl font-bold text-gray-800 dark:text-white">{inlineStats.inProgress}</p>
                                                </div>
                                                <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5 border ${inlineStats.overdue > 0 ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}>
                                                    <div className="flex items-center gap-2 mb-1.5"><AlertTriangle size={14} className={inlineStats.overdue > 0 ? 'text-red-500' : 'text-gray-400'} /><span className="text-xs text-gray-500 dark:text-gray-400">Overdue</span></div>
                                                    <p className={`text-xl font-bold ${inlineStats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>{inlineStats.overdue}</p>
                                                </div>
                                            </div>

                                            {/* Overall progress bar */}
                                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-base font-bold text-gray-800 dark:text-white">Overall Progress</h3>
                                                    <span className="text-2xl font-black text-gray-800 dark:text-white">{inlineStats.progress}%</span>
                                                </div>
                                                <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-[#c20c0b] to-red-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${inlineStats.progress}%` }} />
                                                </div>
                                            </div>

                                            {/* Products section */}
                                            {inlineProducts.length > 0 && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Products</h3>
                                                        <button onClick={addInlineProduct} className="flex items-center gap-1 text-xs font-semibold text-[#c20c0b] hover:text-red-700 transition-colors">
                                                            <Plus size={14} /> Add Product
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {inlineProducts.map((p: CrmProduct) => {
                                                            const progress = getInlineProductProgress(p.id);
                                                            const productTaskCount = inlineTasks.filter((t: any) => t.productId === p.id).length;
                                                            return (
                                                                <div key={p.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                                                    <input
                                                                        type="text"
                                                                        value={p.name}
                                                                        onChange={(e) => updateInlineProduct(p.id, 'name', e.target.value)}
                                                                        className="flex-1 text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#c20c0b] focus:outline-none text-gray-800 dark:text-white pb-0.5 transition-colors"
                                                                        placeholder="Product Name"
                                                                    />
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                            <div className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                                                                        </div>
                                                                        <span className="text-xs text-gray-400 w-16 text-right">{progress}% ({productTaskCount})</span>
                                                                        <button onClick={() => removeInlineProduct(p.id)} disabled={inlineProducts.length <= 1} className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Order details from read-only view */}
                                            <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                                                <OrderDetailsView
                                                    order={transformedOrder}
                                                    allFactories={factories}
                                                    handleSetCurrentPage={props.handleSetCurrentPage}
                                                    onSelectProduct={handleSelectProductCard}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── TASKS TAB ── */}
                                    {activeView === 'Tasks' && (
                                        <div className="space-y-4">
                                            {/* Toolbar */}
                                            <div className="flex flex-wrap gap-3 items-center">
                                                <div className="relative flex-1 min-w-[180px]">
                                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input type="text" value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} placeholder="Search tasks..." className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none text-gray-700 dark:text-gray-200" />
                                                </div>
                                                <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                                                    <option value="ALL">All Status</option>
                                                    <option value="TO DO">To Do</option>
                                                    <option value="IN PROGRESS">In Progress</option>
                                                    <option value="COMPLETE">Complete</option>
                                                </select>
                                                <select value={taskProductFilter} onChange={(e) => setTaskProductFilter(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                                                    <option value="ALL">All Products</option>
                                                    {inlineProducts.map((p: CrmProduct) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <button onClick={() => setShowTemplates(!showTemplates)} className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                                                            <Zap size={14} /> Templates
                                                        </button>
                                                        {showTemplates && (
                                                            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-20 max-h-80 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                                                <div className="p-2">
                                                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-2 py-1 uppercase tracking-wide">Garment Production Templates</p>
                                                                    {TASK_TEMPLATES.map((tpl, i) => (
                                                                        <button key={i} onClick={() => addInlineTask(tpl)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                                            <span>{tpl.name}</span>
                                                                            <span className="text-xs text-gray-400">{tpl.responsible}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={() => addInlineTask()} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200">
                                                        <Plus size={14} /> Add Task
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Task groups */}
                                            <div className="space-y-3">
                                                {inlineGroupedTasks.map(([groupId, group]) => (
                                                    <div key={groupId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                        <div className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                            <button
                                                                onClick={() => setCollapsedGroups(prev => { const n = new Set(prev); if (n.has(groupId)) n.delete(groupId); else n.add(groupId); return n; })}
                                                                className="flex items-center gap-3 flex-1 text-left"
                                                            >
                                                                {collapsedGroups.has(groupId) ? <ChevronRight size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                                                                <Package size={14} className="text-gray-400" />
                                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.product?.name || 'Unassigned'}</span>
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{group.tasks.length}</span>
                                                            </button>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                {group.product && (
                                                                    <>
                                                                        <div className="w-14 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${getInlineProductProgress(group.product.id)}%` }} />
                                                                        </div>
                                                                        <span className="text-xs text-gray-400">{getInlineProductProgress(group.product.id)}%</span>
                                                                    </>
                                                                )}
                                                                {group.product && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); addInlineTask(undefined, group.product!.id); }}
                                                                        className="flex items-center gap-1 px-2 py-1 ml-1 text-xs font-semibold text-[#c20c0b] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-[#c20c0b]/30 hover:border-[#c20c0b]"
                                                                        title={`Add task to ${group.product.name}`}
                                                                    >
                                                                        <Plus size={12} /> Add Task
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {!collapsedGroups.has(groupId) && (
                                                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                {group.tasks.map((task: any) => {
                                                                    const isExpanded = expandedTaskId === task.id;
                                                                    const statusColor = INLINE_STATUS_COLORS[task.status] || INLINE_STATUS_COLORS['TO DO'];
                                                                    const priorityConfig = INLINE_PRIORITY_CONFIG[task.priority || 'Medium'];
                                                                    const overdue = isInlineTaskOverdue(task);
                                                                    const dueSoon = isInlineTaskDueSoon(task);

                                                                    return (
                                                                        <div key={task.id} className={`${overdue ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900'}`}>
                                                                            <div className="flex items-center gap-2 px-4 py-3 group">
                                                                                {/* Reorder */}
                                                                                <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                                    <button onClick={() => moveInlineTask(task.id, 'up')} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-0.5"><ChevronUp size={11} /></button>
                                                                                    <button onClick={() => moveInlineTask(task.id, 'down')} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-0.5"><ChevronDown size={11} /></button>
                                                                                </div>

                                                                                {/* Status toggle */}
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const nextStatus = task.status === 'COMPLETE' ? 'TO DO' : task.status === 'TO DO' ? 'IN PROGRESS' : 'COMPLETE';
                                                                                        const updates: Record<string, any> = { status: nextStatus };
                                                                                        if (nextStatus === 'COMPLETE') { updates.progress = 100; updates.actualEndDate = new Date().toISOString().split('T')[0]; }
                                                                                        if (nextStatus === 'IN PROGRESS' && !task.actualStartDate) { updates.actualStartDate = new Date().toISOString().split('T')[0]; }
                                                                                        if (nextStatus === 'TO DO') { updates.progress = 0; }
                                                                                        updateInlineTask(task.id, updates);
                                                                                    }}
                                                                                    className="flex-shrink-0"
                                                                                    title={`Click to cycle status (${task.status})`}
                                                                                >
                                                                                    {task.status === 'COMPLETE' ? <CheckCircle size={18} className="text-green-500" /> : task.status === 'IN PROGRESS' ? <Clock size={18} className="text-blue-500 animate-pulse" /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors" />}
                                                                                </button>

                                                                                {/* Task name */}
                                                                                <button
                                                                                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                                                                    className={`flex-1 text-left text-sm font-medium truncate ${task.status === 'COMPLETE' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-white'} hover:text-[#c20c0b] dark:hover:text-red-400 transition-colors`}
                                                                                >
                                                                                    {task.name}
                                                                                </button>

                                                                                {/* Badges */}
                                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                                    {overdue && <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md"><AlertTriangle size={10} /> Overdue</span>}
                                                                                    {dueSoon && !overdue && <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md"><Clock size={10} /> Due Soon</span>}
                                                                                    {priorityConfig && <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md hidden sm:inline-flex ${priorityConfig.bg} ${priorityConfig.text}`}>{priorityConfig.icon} {task.priority || 'Medium'}</span>}
                                                                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${statusColor.bg} ${statusColor.text}`}>{task.status}</span>
                                                                                    {task.plannedEndDate && <span className={`text-xs hidden sm:inline ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>{new Date(task.plannedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                                                                    <button onClick={() => setExpandedTaskId(isExpanded ? null : task.id)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                                                                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Expanded detail */}
                                                                            {isExpanded && (
                                                                                <div className="px-4 pb-4 pt-2 ml-10 mr-2 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl mb-2 mx-4 border border-gray-200/50 dark:border-gray-700/50">
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                                                                        <div className="sm:col-span-2">
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><List size={11} /> Task Name</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                list={`task-name-templates-${task.id}`}
                                                                                                value={task.name}
                                                                                                onChange={(e) => {
                                                                                                    const val = e.target.value;
                                                                                                    const matched = TASK_TEMPLATES.find(tpl => tpl.name === val);
                                                                                                    updateInlineTask(task.id, matched ? { name: val, responsible: matched.responsible } : { name: val });
                                                                                                }}
                                                                                                className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none text-gray-800 dark:text-white"
                                                                                            />
                                                                                            <datalist id={`task-name-templates-${task.id}`}>
                                                                                                {TASK_TEMPLATES.map((tpl, i) => (
                                                                                                    <option key={i} value={tpl.name} />
                                                                                                ))}
                                                                                            </datalist>
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><TrendingUp size={11} /> Status</label>
                                                                                            <select value={task.status} onChange={(e) => { const updates: Record<string, any> = { status: e.target.value }; if (e.target.value === 'COMPLETE') { updates.progress = 100; updates.actualEndDate = new Date().toISOString().split('T')[0]; } if (e.target.value === 'IN PROGRESS' && !task.actualStartDate) { updates.actualStartDate = new Date().toISOString().split('T')[0]; } updateInlineTask(task.id, updates); }} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm cursor-pointer text-gray-800 dark:text-white">
                                                                                                <option>TO DO</option><option>IN PROGRESS</option><option>COMPLETE</option>
                                                                                            </select>
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><Flag size={11} /> Priority</label>
                                                                                            <select value={task.priority || 'Medium'} onChange={(e) => updateInlineTask(task.id, { priority: e.target.value })} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm cursor-pointer text-gray-800 dark:text-white">
                                                                                                <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
                                                                                            </select>
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><Package size={11} /> Product</label>
                                                                                            <select value={task.productId || ''} onChange={(e) => updateInlineTask(task.id, { productId: e.target.value })} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm cursor-pointer text-gray-800 dark:text-white">
                                                                                                <option value="">Unassigned</option>
                                                                                                {inlineProducts.map((p: CrmProduct) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                                            </select>
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><User size={11} /> Responsible</label>
                                                                                            <input type="text" value={task.responsible || ''} onChange={(e) => updateInlineTask(task.id, { responsible: e.target.value })} placeholder="e.g. Merch Team" className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none text-gray-800 dark:text-white" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><CalendarDays size={11} /> Planned Start</label>
                                                                                            <input type="date" value={task.plannedStartDate || ''} onChange={(e) => updateInlineTask(task.id, { plannedStartDate: e.target.value })} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><CalendarDays size={11} /> Planned End</label>
                                                                                            <input type="date" value={task.plannedEndDate || ''} onChange={(e) => updateInlineTask(task.id, { plannedEndDate: e.target.value })} className={`w-full p-2 bg-white dark:bg-gray-800 border rounded-lg text-sm text-gray-800 dark:text-white ${overdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-600'}`} />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><CheckCircle size={11} /> Actual Start</label>
                                                                                            <input type="date" value={task.actualStartDate || ''} onChange={(e) => updateInlineTask(task.id, { actualStartDate: e.target.value })} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><CheckCircle size={11} /> Actual End</label>
                                                                                            <input type="date" value={task.actualEndDate || ''} onChange={(e) => updateInlineTask(task.id, { actualEndDate: e.target.value })} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white" />
                                                                                        </div>
                                                                                        <div className="sm:col-span-2">
                                                                                            <label className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5"><span className="flex items-center gap-1"><TrendingUp size={11} /> Progress</span><span className="font-bold text-gray-700 dark:text-gray-300">{task.progress || 0}%</span></label>
                                                                                            <input type="range" min="0" max="100" step="5" value={task.progress || 0} onChange={(e) => { const val = parseInt(e.target.value); const updates: Record<string, any> = { progress: val }; if (val === 100 && task.status !== 'COMPLETE') { updates.status = 'COMPLETE'; updates.actualEndDate = new Date().toISOString().split('T')[0]; } if (val > 0 && val < 100 && task.status !== 'IN PROGRESS') { updates.status = 'IN PROGRESS'; if (!task.actualStartDate) { updates.actualStartDate = new Date().toISOString().split('T')[0]; } } if (val === 0 && task.status !== 'TO DO') { updates.status = 'TO DO'; } updateInlineTask(task.id, updates); }} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#c20c0b]" />
                                                                                        </div>
                                                                                        <div className="sm:col-span-2">
                                                                                            <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1"><MessageSquare size={11} /> Notes</label>
                                                                                            <textarea value={task.notes || ''} onChange={(e) => updateInlineTask(task.id, { notes: e.target.value })} rows={2} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#c20c0b]/20 focus:border-[#c20c0b] focus:outline-none text-gray-800 dark:text-white resize-none" placeholder="Add notes..." />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex justify-end pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                                                                                        <button onClick={() => removeInlineTask(task.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium">
                                                                                            <Trash2 size={13} /> Remove Task
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

                                                {inlineFilteredTasks.length === 0 && (
                                                    <div className="text-center py-12">
                                                        {inlineTasks.length === 0 ? (
                                                            <>
                                                                <Zap size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                                                <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">No tasks yet</p>
                                                                <p className="text-sm text-gray-400 dark:text-gray-500">Add tasks manually or use templates to get started.</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Search size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                                                <p className="text-gray-500 dark:text-gray-400">No tasks match your filters</p>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Auto-save status */}
                                             
                                        </div>
                                    )} 

                                    {/* ── DOCUMENTS TAB ── */}
                                    {activeView === 'Documents' && (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage documents for this order. Uploaded files are visible to the client as Company Documents.</p>
                                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleInlineFileUpload} disabled={isUploading} />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Client Documents */}
                                                <div className="space-y-3">
                                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">Client Documents</h3>
                                                    {inlineDocuments.filter((d: any) => d.source !== 'company').length === 0 ? (
                                                        <p className="text-sm text-gray-400 italic py-4">No documents from client.</p>
                                                    ) : (
                                                        inlineDocuments.map((doc: any, idx: number) => {
                                                            if (doc.source === 'company') return null;
                                                            return (
                                                                <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3">
                                                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500"><FileText size={16} /></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                                                                        <p className="text-xs text-gray-500">{doc.lastUpdated}</p>
                                                                    </div>
                                                                    <button onClick={() => removeInlineDocument(idx)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {/* Company Documents */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                                        <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Company Documents</h3>
                                                        <label className={`cursor-pointer flex items-center gap-1 text-xs font-bold text-[#c20c0b] hover:underline ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                            <Plus size={13} />
                                                            {isUploading ? 'Uploading...' : 'Add Document'}
                                                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleInlineFileUpload} disabled={isUploading} />
                                                        </label>
                                                    </div>
                                                    {inlineDocuments.filter((d: any) => d.source === 'company').length === 0 ? (
                                                        <p className="text-sm text-gray-400 italic py-4">No documents uploaded yet.</p>
                                                    ) : (
                                                        inlineDocuments.map((doc: any, idx: number) => {
                                                            if (doc.source !== 'company') return null;
                                                            return (
                                                                <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                                                                    <div className="flex items-start gap-3 mb-2">
                                                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-500"><FileText size={16} /></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <input type="text" value={doc.name} onChange={(e) => updateInlineDocument(idx, 'name', e.target.value)} className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-900 dark:text-white focus:ring-0" placeholder="Document Name" />
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <p className="text-xs text-gray-500">{doc.lastUpdated}</p>
                                                                                {doc.path && (
                                                                                    <button onClick={() => handleInlinePreview(doc.path)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                                                        <Download size={10} /> Preview
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <button onClick={() => removeInlineDocument(idx)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                                                                    </div>
                                                                    <div className="pl-10">
                                                                        <select value={doc.type} onChange={(e) => updateInlineDocument(idx, 'type', e.target.value)} className="w-full py-1 px-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#c20c0b]">
                                                                            <option>General</option><option>Invoice</option><option>Packing List</option><option>Bill of Lading</option><option>Certificate of Origin</option><option>Inspection Report</option><option>Lab Test Report</option><option>Purchase Order</option><option>Tech Pack</option><option>Sample Approval</option>
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

                                    {activeView === 'TNA' && (
                                        <TNAView
                                            tasks={filteredTasks}
                                            products={selectedProductId ? undefined : transformedOrder.products}
                                            onSaveTask={handleSaveTNATask}
                                            onSaveBulkTasks={handleSaveBulkTasks}
                                        />
                                    )}
                                    {activeView === 'Dashboard' && (
                                        <DashboardView
                                            tasks={transformedOrder.tasks}
                                            orderKey={selectedOrderId}
                                            orderDetails={transformedOrder}
                                            darkMode={props.darkMode}
                                        />
                                    )}
                                    {activeView === 'List' && <AdminListView tasks={filteredTasks} onTasksChange={handleBoardTasksChange} products={transformedOrder?.products} selectedProductId={selectedProductId} />}
                                    {activeView === 'Board' && (
                                        <AdminBoardView
                                            tasks={filteredTasks}
                                            onTasksChange={handleBoardTasksChange}
                                            selectedProductId={selectedProductId}
                                        />
                                    )}
                                    {activeView === 'Gantt' && (
                                        <AdminGanttChartView
                                            tasks={filteredTasks}
                                            products={transformedOrder.products}
                                            onTaskUpdate={handleTaskUpdate}
                                            onAddTask={handleGanttAddTask}
                                        />
                                    )}
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

        </MainLayout>
    );
};
