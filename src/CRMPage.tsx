import React, { FC, useState, useEffect, useMemo, useRef, ReactNode, useCallback } from 'react';
import {
    List, TrendingUp, CheckCircle, Package, PieChart as PieChartIcon,
    BarChart as BarChartIcon, Info, LayoutDashboard, ClipboardCheck,
    GanttChartSquare, Bot, FileText, Ship, DollarSign, Download, MapPin, Plus, ChevronDown, X,
    Star, AlertCircle, ArrowRight, ArrowLeft, Building, Clock, Flag,
    Activity, Scissors, Target, Zap, ChevronRight, Pencil, Save, ChevronUp, Trash2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, Cell, PieChart
} from 'recharts';
import { MainLayout } from '../src/MainLayout';
import { CrmOrder, CrmProduct, CrmTask, Factory } from '../src/types';
import { crmService } from './crm.service';
import { normalizeOrder, getOrderStatusColor } from './utils';

interface CRMPageProps {
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    crmData: { [key: string]: CrmOrder };
    activeCrmOrderKey: string | null; // This prop is for the initial active order
    allFactories: Factory[];
    callGeminiAPI: (prompt: string) => Promise<string>;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export function DashboardCard({ icon, title, value, colorClass, index = 0 }: { icon: ReactNode, title: string, value: string | number, colorClass: string, index?: number }) {
    return (
        <div className={`relative p-5 rounded-2xl overflow-hidden bg-white dark:bg-gray-900/40 dark:backdrop-blur-md shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 cursor-pointer group hover-pulse-glow animate-stagger-in`} style={{ animationDelay: `${index * 100}ms` }}>
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${colorClass} transition-all duration-300 group-hover:h-2`}></div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 bg-gradient-to-br from-current" style={{ color: colorClass.includes('red') ? '#c20c0b' : colorClass.includes('yellow') ? '#D97706' : colorClass.includes('green') ? '#059669' : '#2563EB' }}></div>
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-300 tracking-wide">{title}</p>
                    <p className="text-3xl font-extrabold text-gray-800 dark:text-white mt-1 animate-count-up">{value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    <div className="text-white">{icon}</div>
                </div>
            </div>
        </div>
    );
}

// ─── Helpers shared within DashboardView ──────────────────────────────────────

function _AnimatedNumber({ value, inView }: { value: number; inView: boolean }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (!inView) { setDisplay(0); return; }
        if (value === 0) { setDisplay(0); return; }
        const duration = 900;
        const startTime = performance.now();
        const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value, inView]);
    return <>{display}</>;
}

function _getWovenBg(color = 'rgba(255,255,255,0.13)'): React.CSSProperties {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'><path d='M0 7 L7 0 L14 7 L7 14 Z' fill='none' stroke='${color}' stroke-width='0.9'/></svg>`;
    return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundRepeat: 'repeat', backgroundSize: '14px 14px' };
}

function _getHerringboneBg(color = 'rgba(0,0,0,0.04)'): React.CSSProperties {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M0 10 L10 0 M10 20 L20 10' stroke='${color}' stroke-width='1' fill='none'/></svg>`;
    return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundRepeat: 'repeat', backgroundSize: '20px 20px' };
}

// Coloured gradient stat card with woven texture & selvedge dots
function _StatCard({ title, value, subtitle, icon, gradient, shadowColor, inView, badge, suffix }: {
    title: string; value: number; subtitle?: string; icon: React.ReactNode;
    gradient: string; shadowColor: string; inView: boolean;
    badge?: { label: string }; suffix?: string;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${gradient} ${hovered ? 'scale-[1.02] -translate-y-0.5' : ''}`}
            style={{ boxShadow: hovered ? `0 18px 40px -8px ${shadowColor}` : `0 6px 20px -4px ${shadowColor}` }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Woven texture */}
            <div className="absolute inset-0 pointer-events-none" style={_getWovenBg()} />
            {/* Selvedge holes */}
            <div className="absolute right-2 top-0 bottom-0 flex flex-col items-center justify-evenly pointer-events-none">
                {Array.from({ length: 7 }).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />)}
            </div>
            <div className="relative p-5 pr-7">
                <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-inner">
                        {icon}
                    </div>
                    {badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">{badge.label}</span>
                    )}
                </div>
                <div className="text-4xl font-black text-white leading-none mb-1 tabular-nums">
                    <_AnimatedNumber value={value} inView={inView} />
                    {suffix && <span className="text-2xl ml-0.5">{suffix}</span>}
                </div>
                <div className="text-[11px] font-bold text-white/70 uppercase tracking-widest">{title}</div>
                {subtitle && (
                    <div className="mt-2.5 pt-2.5 border-t border-white/15 text-xs text-white/55">{subtitle}</div>
                )}
            </div>
        </div>
    );
}

// 3-stage task pipeline: TO DO → IN PROGRESS → COMPLETE
function _TaskPipeline({ toDoCount, inProgressCount, completedCount, inView }: {
    toDoCount: number; inProgressCount: number; completedCount: number; inView: boolean;
}) {
    const stages = [
        { label: 'To Do',       count: toDoCount,       grad: 'from-gray-400 to-gray-500',     ring: 'rgba(107,114,128,0.3)', text: 'text-gray-500 dark:text-gray-400', Icon: Clock },
        { label: 'In Progress', count: inProgressCount, grad: 'from-blue-500 to-indigo-600',   ring: 'rgba(59,130,246,0.35)', text: 'text-blue-600 dark:text-blue-400', Icon: Activity },
        { label: 'Complete',    count: completedCount,  grad: 'from-emerald-500 to-green-500', ring: 'rgba(16,185,129,0.35)', text: 'text-emerald-600 dark:text-emerald-400', Icon: CheckCircle },
    ];
    return (
        <div className="relative bg-white/80 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 p-5 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-2xl" style={_getHerringboneBg()} />
            <div className="relative">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-5">
                    <Scissors size={13} className="text-[#c20c0b]" />
                    Task Flow
                    <span className="ml-auto text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {toDoCount + inProgressCount + completedCount} total threads
                    </span>
                </h3>
                <div className="flex items-start">
                    {stages.map((stage, i) => {
                        const active = stage.count > 0;
                        const StageIcon = stage.Icon;
                        return (
                            <React.Fragment key={stage.label}>
                                <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 72 }}>
                                    <div
                                        className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${active ? `bg-gradient-to-br ${stage.grad} shadow-lg` : 'bg-gray-100 dark:bg-gray-700/60'}`}
                                        style={active ? { boxShadow: `0 0 0 4px ${stage.ring}` } : {}}
                                    >
                                        {active && (
                                            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${stage.grad} opacity-35 animate-ping`} style={{ animationDuration: '2.5s' }} />
                                        )}
                                        <span className={`relative text-xl font-black tabular-nums ${active ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                            <_AnimatedNumber value={stage.count} inView={inView} />
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-col items-center gap-0.5">
                                        <StageIcon size={11} className={active ? stage.text : 'text-gray-400 dark:text-gray-600'} />
                                        <span className={`text-[10px] font-semibold text-center leading-tight ${active ? stage.text : 'text-gray-400 dark:text-gray-500'}`}>
                                            {stage.label}
                                        </span>
                                    </div>
                                </div>
                                {i < stages.length - 1 && (
                                    <div className="flex-1 flex items-center mt-7 mx-1">
                                        <div className={`flex-1 h-px transition-all duration-700 ${active ? `bg-gradient-to-r ${stage.grad}` : 'bg-gray-200 dark:bg-gray-700'}`} />
                                        <ChevronRight size={10} className={`flex-shrink-0 transition-colors ${active ? stage.text : 'text-gray-300 dark:text-gray-600'}`} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
                {/* Distribution bar */}
                {(toDoCount + inProgressCount + completedCount) > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                        <div className="flex h-2 rounded-full overflow-hidden gap-px">
                            {[
                                { count: completedCount,  grad: 'from-emerald-500 to-green-500' },
                                { count: inProgressCount, grad: 'from-blue-500 to-indigo-600' },
                                { count: toDoCount,       grad: 'from-gray-300 to-gray-400' },
                            ].map((s, i) => {
                                const total = toDoCount + inProgressCount + completedCount;
                                const pct = (s.count / total) * 100;
                                if (pct === 0) return null;
                                return <div key={i} className={`bg-gradient-to-r ${s.grad} transition-all duration-1000`} style={{ width: `${pct}%` }} />;
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Task velocity progress bar with stitch marks and woven texture
function _VelocityBar({ completedTasks, inProgressTasks, totalTasks, overdueCount, inView }: {
    completedTasks: number; inProgressTasks: number; totalTasks: number; overdueCount: number; inView: boolean;
}) {
    const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const [barW, setBarW] = useState(0);
    useEffect(() => {
        if (inView) { const t = setTimeout(() => setBarW(taskRate), 200); return () => clearTimeout(t); }
        else setBarW(0);
    }, [taskRate, inView]);
    const toDoCount = Math.max(0, totalTasks - completedTasks - inProgressTasks);

    return (
        <div className="relative bg-white/80 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 p-5 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-2xl" style={_getHerringboneBg()} />
            <div className="relative">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Zap size={13} className="text-[#c20c0b]" />
                            Task Velocity
                        </h3>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Order completion momentum</p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-black text-gray-800 dark:text-white tabular-nums">
                            <_AnimatedNumber value={taskRate} inView={inView} />%
                        </span>
                        <p className="text-[10px] text-gray-400">woven</p>
                    </div>
                </div>
                {/* Woven-fill bar */}
                <div className="relative h-5 bg-gray-100 dark:bg-gray-700/40 rounded-full overflow-hidden mb-3">
                    <div className="absolute inset-0 pointer-events-none" style={_getHerringboneBg('rgba(0,0,0,0.06)')} />
                    <div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#c20c0b] via-red-500 to-orange-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${barW}%` }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-full" />
                        <div className="absolute inset-0 flex items-center pl-2 gap-2.5 overflow-hidden">
                            {Array.from({ length: Math.floor(barW / 7) }).map((_, i) => (
                                <div key={i} className="w-0.5 h-3 bg-white/30 rounded-full flex-shrink-0" />
                            ))}
                        </div>
                    </div>
                    {totalTasks > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            {completedTasks}/{totalTasks}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-2.5 py-1.5">
                        <CheckCircle size={11} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <_AnimatedNumber value={completedTasks} inView={inView} />
                        </span>
                        <span className="text-[10px] text-emerald-500/80">done</span>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-1.5">
                        <Activity size={11} className="text-blue-500" />
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                            <_AnimatedNumber value={inProgressTasks} inView={inView} />
                        </span>
                        <span className="text-[10px] text-blue-500/80">active</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-2.5 py-1.5">
                        <Clock size={11} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                            <_AnimatedNumber value={toDoCount} inView={inView} />
                        </span>
                        <span className="text-[10px] text-gray-400">to do</span>
                    </div>
                    {overdueCount > 0 && (
                        <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5 ml-auto">
                            <AlertCircle size={11} className="text-red-500" />
                            <span className="text-xs font-bold text-red-700 dark:text-red-400">
                                <_AnimatedNumber value={overdueCount} inView={inView} />
                            </span>
                            <span className="text-[10px] text-red-500/80">overdue</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Single product row — needs own component so hooks aren't called inside .map()
const PRODUCT_GRADS = [
    'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500',
    'from-emerald-500 to-green-500', 'from-amber-500 to-orange-500',
    'from-rose-500 to-red-500', 'from-indigo-500 to-violet-500',
];

function _ProductRow({ product, tasks, inView, idx }: { product: any; tasks: any[]; inView: boolean; idx: number }) {
    const ptasks = tasks.filter(t => t.productId === product.id);
    const done = ptasks.filter(t => t.status === 'COMPLETE').length;
    const pct = ptasks.length > 0 ? Math.round((done / ptasks.length) * 100) : 0;
    const grad = PRODUCT_GRADS[idx % PRODUCT_GRADS.length];
    const [barW, setBarW] = useState(0);
    useEffect(() => {
        if (inView) { const t = setTimeout(() => setBarW(pct), 150 + idx * 80); return () => clearTimeout(t); }
        else setBarW(0);
    }, [pct, inView]);
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[160px]">{product.name}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums">{done}/{ptasks.length}</span>
            </div>
            <div className="relative h-3 bg-gray-100 dark:bg-gray-700/40 rounded-full overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={_getHerringboneBg('rgba(0,0,0,0.05)')} />
                <div
                    className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${grad} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${barW}%` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                </div>
            </div>
        </div>
    );
}

// Per-product progress breakdown
function _ProductBreakdown({ tasks, products, inView }: { tasks: any[]; products: any[]; inView: boolean }) {
    if (!products || products.length <= 1) return null;
    return (
        <div className="relative bg-white/80 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-white/10 p-5 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-2xl" style={_getHerringboneBg()} />
            <div className="relative">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                    <Target size={13} className="text-[#c20c0b]" />
                    Per-Product Progress
                    <span className="ml-auto text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{products.length} items</span>
                </h3>
                <div className="space-y-3">
                    {products.map((product, idx) => (
                        <_ProductRow key={product.id || idx} product={product} tasks={tasks} inView={inView} idx={idx} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export const DashboardView: FC<{ tasks: any[]; orderKey: string; orderDetails: any; darkMode?: boolean }> = ({ tasks, orderKey, orderDetails, darkMode }) => {
        const statsRef = useRef<HTMLDivElement>(null);
        const [inView, setInView] = useState(false);
        useEffect(() => {
            const el = statsRef.current;
            if (!el) return;
            const observer = new IntersectionObserver(
                ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
                { threshold: 0.1 }
            );
            observer.observe(el);
            return () => observer.disconnect();
        }, []);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS').length;
        const toDoTasks = tasks.filter(t => t.status === 'TO DO').length;
        const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdueCount = tasks.filter(t =>
            t.status !== 'COMPLETE' && t.plannedEndDate && new Date(t.plannedEndDate) < today
        ).length;

        const totalQuantity = parseInt((orderDetails.product || '').split(' ')[0], 10) || 0;

        const statusData = useMemo(() => {
            const statuses: { [key: string]: number } = { 'TO DO': 0, 'IN PROGRESS': 0, 'COMPLETE': 0 };
            tasks.forEach(task => { if (statuses[task.status] !== undefined) statuses[task.status]++; });
            return Object.entries(statuses).map(([name, value]) => ({ name, value }));
        }, [tasks]);

        const COLORS = darkMode ? ['#4B5563', '#F59E0B', '#10B981'] : ['#D1D5DB', '#FBBF24', '#34D399'];
        const axisColor = darkMode ? '#9CA3AF' : '#6B7280';
        const gridColor = darkMode ? '#374151' : '#E5E7EB';
        const tooltipStyle = darkMode
            ? { backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }
            : { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827' };

        // Products from orderDetails
        const products = orderDetails.products && orderDetails.products.length > 0
            ? orderDetails.products
            : [{ id: 'default', name: orderDetails.product }];

        // Health label
        const healthLabel = overdueCount === 0
            ? { text: 'All threads intact', dot: 'bg-emerald-500', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
            : { text: `${overdueCount} thread${overdueCount > 1 ? 's' : ''} fraying`, dot: 'bg-amber-500', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };

        return (
            <div className="mt-4 space-y-5 animate-fade-in">
                {/* ── Textile infographic section ────────────────────────── */}
                <div ref={statsRef}>
                    {/* Health badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${healthLabel.bg} mb-4`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${healthLabel.dot} animate-pulse`} />
                        <span className={`text-[11px] font-semibold ${healthLabel.color}`}>{healthLabel.text}</span>
                    </div>

                    {/* 4 stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <_StatCard
                            title="Total Threads"
                            value={totalTasks}
                            subtitle="tasks in order"
                            icon={<List size={18} className="text-white" />}
                            gradient="bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900"
                            shadowColor="rgba(15,23,42,0.4)"
                            inView={inView}
                        />
                        <_StatCard
                            title="On the Loom"
                            value={inProgressTasks}
                            subtitle="tasks running now"
                            icon={<Activity size={18} className="text-white" />}
                            gradient="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700"
                            shadowColor="rgba(59,130,246,0.4)"
                            inView={inView}
                        />
                        <_StatCard
                            title="Woven"
                            value={completedTasks}
                            subtitle="tasks finished"
                            icon={<CheckCircle size={18} className="text-white" />}
                            gradient="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700"
                            shadowColor="rgba(16,185,129,0.4)"
                            inView={inView}
                        />
                        <_StatCard
                            title={overdueCount > 0 ? 'Fraying' : 'Completion'}
                            value={overdueCount > 0 ? overdueCount : taskRate}
                            suffix={overdueCount === 0 ? '%' : undefined}
                            subtitle={overdueCount > 0 ? 'tasks overdue' : 'of order complete'}
                            icon={overdueCount > 0
                                ? <AlertCircle size={18} className="text-white" />
                                : <Target size={18} className="text-white" />}
                            gradient={overdueCount > 0
                                ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-600'
                                : 'bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700'}
                            shadowColor={overdueCount > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(139,92,246,0.4)'}
                            inView={inView}
                            badge={overdueCount > 0 ? { label: 'Attention' } : undefined}
                        />
                    </div>

                    {/* Pipeline + velocity row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div className="lg:col-span-2">
                            <_TaskPipeline
                                toDoCount={toDoTasks}
                                inProgressCount={inProgressTasks}
                                completedCount={completedTasks}
                                inView={inView}
                            />
                        </div>
                        <_VelocityBar
                            completedTasks={completedTasks}
                            inProgressTasks={inProgressTasks}
                            totalTasks={totalTasks}
                            overdueCount={overdueCount}
                            inView={inView}
                        />
                    </div>

                    {/* Per-product breakdown (only shown when multiple products) */}
                    <_ProductBreakdown tasks={tasks} products={products} inView={inView} />
                </div>

                {/* ── Existing charts ────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
                                <PieChartIcon size={16} className="text-white" />
                            </div>
                            Task Status Distribution
                        </h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={statusData} cx="50%" cy="50%"
                                    labelLine={false} innerRadius={65} outerRadius={105}
                                    dataKey="value" nameKey="name"
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {statusData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tooltipStyle.color }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-3 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-md">
                                <BarChartIcon size={16} className="text-white" />
                            </div>
                            Units Per Task
                        </h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={tasks.filter(t => t.quantity > 0)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: axisColor }} axisLine={{ stroke: axisColor }} tickLine={{ stroke: axisColor }} />
                                <YAxis tick={{ fontSize: 12, fill: axisColor }} axisLine={{ stroke: axisColor }} tickLine={{ stroke: axisColor }} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: darkMode ? '#374151' : '#f3f4f6' }} />
                                <Bar dataKey="quantity" fill="url(#colorUv)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

export const ListView: FC<{ tasks: any[] }> = ({ tasks }) => {
        const completedTasks = tasks.filter(t => t.status === 'COMPLETE');
        const todoTasks = tasks.filter(t => t.status === 'TO DO');
        const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS');
        const calculateTotals = (tasks: any[]) => {
            return tasks.reduce((acc, task) => {
                acc.qty += task.quantity || 0;
                return acc;
            }, { qty: 0 });
        }
        const totals = calculateTotals(completedTasks);

        const TaskGroup: FC<{ title: string; tasks: any[]; showTotals?: boolean; totalsData?: any }> = ({ title, tasks, showTotals, totalsData }) => {
            const isCompletedGroup = title === 'COMPLETE';
            const groupHeaderColor = isCompletedGroup ? 'text-green-600 dark:text-green-400' : title === 'IN PROGRESS' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400';
            const badgeColor = isCompletedGroup ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : title === 'IN PROGRESS' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
            return (
                <div className="mb-6">
                    <div className="flex items-center text-sm font-bold mb-3">
                        <ChevronDown size={20} className={`mr-2 ${groupHeaderColor}`} />
                        <span className={`mr-2 ${groupHeaderColor}`}>{title}</span>
                        <span className={`${badgeColor} text-xs font-bold px-2.5 py-1 rounded-full shadow-sm`}>{tasks.length}</span>
                    </div>
                    <div className="overflow-x-auto bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                                <tr>
                                    {['Task Name', 'Priority', 'Progress', 'Due date', 'QTY'].map(header => (
                                        <th key={header} scope="col" className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800">
                                {tasks.map(task => {
                                    const priorityColors: Record<string, string> = {
                                        'Urgent': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
                                        'High': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
                                        'Medium': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
                                        'Low': 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
                                    };
                                    const progress = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
                                    return (
                                        <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                                            <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                <CheckCircle size={18} className={`flex-shrink-0 ${task.status === 'COMPLETE' ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} /> {task.name}
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
                                            <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">{task.plannedEndDate}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300 font-medium">{task.quantity?.toLocaleString() || 'N/A'}</td>
                                        </tr>
                                    );
                                })}
                                {showTotals && (
                                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700/50 dark:to-gray-800/50 font-bold border-t-2 border-gray-200 dark:border-gray-600">
                                    <td className="px-5 py-3.5 text-gray-800 dark:text-white">Total</td>
                                    <td className="px-5 py-3.5"></td>
                                    <td className="px-5 py-3.5"></td>
                                    <td className="px-5 py-3.5"></td>
                                    <td className="px-5 py-3.5 text-gray-900 dark:text-white">{totalsData.qty.toLocaleString()}</td>
                                </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        return (
            <div className="mt-6 animate-fade-in">
                <TaskGroup title="COMPLETE" tasks={completedTasks} showTotals={true} totalsData={totals} />
                {inProgressTasks.length > 0 && <TaskGroup title="IN PROGRESS" tasks={inProgressTasks} />}
                {todoTasks.length > 0 && <TaskGroup title="TO DO" tasks={todoTasks} />}
            </div>
        );
    };

export const BoardView: FC<{ tasks: any[] }> = ({ tasks }) => {
        const columns: { [key: string]: any[] } = {
            'TO DO': tasks.filter(t => t.status === 'TO DO'),
            'IN PROGRESS': tasks.filter(t => t.status === 'IN PROGRESS'),
            'COMPLETE': tasks.filter(t => t.status === 'COMPLETE'),
        };

        const columnColors: { [key: string]: { bg: string; badge: string; border: string } } = {
            'TO DO': { bg: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50', badge: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
            'IN PROGRESS': { bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-600' },
            'COMPLETE': { bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20', badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-600' },
        };

        const priorityColors: Record<string, string> = {
            'Urgent': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
            'High': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
            'Medium': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
            'Low': 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
        };

        const TaskCard: FC<{ task: any }> = ({ task }) => {
            const progress = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
            return (
                <div className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg mb-3 transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm text-gray-800 dark:text-white group-hover:text-[var(--color-primary)] dark:group-hover:text-red-400 transition-colors">{task.name}</p>
                        {task.priority && (
                            <span className={`flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityColors[task.priority] || priorityColors['Medium']}`}>
                                <Flag size={8} /> {task.priority}
                            </span>
                        )}
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 w-7 text-right">{progress}%</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                        <Clock size={12} /> {task.plannedEndDate}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex -space-x-2">
                            <img className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 shadow-sm" src={`https://i.pravatar.cc/150?u=${task.responsible}`} alt="user"/>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${task.status === 'COMPLETE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : task.status === 'IN PROGRESS' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {task.quantity?.toLocaleString() || 0} units
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in">
                {Object.entries(columns).map(([status, tasksInColumn]) => {
                    const colors = columnColors[status];
                    return (
                        <div key={status} className={`${colors.bg} p-4 rounded-2xl border ${colors.border} shadow-lg`}>
                            <h3 className="flex items-center justify-between text-sm font-bold mb-4 px-1 text-gray-800 dark:text-white">
                                <span className="flex items-center gap-2">
                                    {status === 'COMPLETE' && <CheckCircle size={16} className="text-green-600 dark:text-green-400" />}
                                    {status === 'IN PROGRESS' && <TrendingUp size={16} className="text-orange-600 dark:text-orange-400" />}
                                    {status === 'TO DO' && <List size={16} className="text-gray-600 dark:text-gray-400" />}
                                    {status}
                                </span>
                                <span className={`${colors.badge} text-xs font-bold px-2.5 py-1 rounded-full shadow-sm`}>{tasksInColumn.length}</span>
                            </h3>
                            <div className="space-y-3">
                                {tasksInColumn.map(task => <TaskCard key={task.id} task={task} />)}
                            </div>
                        </div>
                    );
                })}
            </div>
        )
    }

export const GanttChartView: FC<{ tasks: any[]; onTaskUpdate?: (taskId: number, newStart: string, newEnd: string) => void }> = ({ tasks, onTaskUpdate }) => {
        const parseDate = (str: string) => new Date(str);
        const diffDays = (date1: Date, date2: Date) => Math.ceil(Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));

        const GANTT_COLORS = [
            'bg-[var(--color-primary)]', // Red
            'bg-blue-600',
            'bg-emerald-600',
            'bg-purple-600',
            'bg-orange-500',
            'bg-cyan-600',
            'bg-pink-600',
            'bg-indigo-600'
        ];

        const [interaction, setInteraction] = useState<{
            type: 'move' | 'resize-start' | 'resize-end';
            taskId: number;
            startX: number;
            originalStart: Date;
            originalEnd: Date;
        } | null>(null);
        const [currentOffset, setCurrentOffset] = useState(0);

        const handleMouseDown = (e: React.MouseEvent, task: any, type: 'move' | 'resize-start' | 'resize-end') => {
            if (!onTaskUpdate) return;
            e.preventDefault();
            e.stopPropagation();
            setInteraction({
                type,
                taskId: task.id,
                startX: e.clientX,
                originalStart: parseDate(task.plannedStartDate),
                originalEnd: parseDate(task.plannedEndDate)
            });
            setCurrentOffset(0);
        };

        const handleMouseMove = useCallback((e: MouseEvent) => {
            if (interaction) {
                setCurrentOffset(e.clientX - interaction.startX);
            }
        }, [interaction]);

        const handleMouseUp = useCallback(() => {
            if (interaction && onTaskUpdate) {
                const daysDiff = Math.round(currentOffset / 40); // 40px per day
                if (daysDiff !== 0) {
                    let newStart = new Date(interaction.originalStart);
                    let newEnd = new Date(interaction.originalEnd);

                    if (interaction.type === 'move') {
                        newStart.setDate(newStart.getDate() + daysDiff);
                        newEnd.setDate(newEnd.getDate() + daysDiff);
                    } else if (interaction.type === 'resize-start') {
                        newStart.setDate(newStart.getDate() + daysDiff);
                    } else if (interaction.type === 'resize-end') {
                        newEnd.setDate(newEnd.getDate() + daysDiff);
                    }
                    
                    // Validation: Ensure start <= end
                    if (newStart > newEnd) {
                         if (interaction.type === 'resize-start') newStart = new Date(newEnd);
                         if (interaction.type === 'resize-end') newEnd = new Date(newStart);
                    }

                    onTaskUpdate(interaction.taskId, newStart.toISOString().split('T')[0], newEnd.toISOString().split('T')[0]);
                }
                setInteraction(null);
                setCurrentOffset(0);
            }
        }, [interaction, currentOffset, onTaskUpdate]);

        useEffect(() => {
            if (interaction) {
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
            }
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }, [interaction, handleMouseMove, handleMouseUp]);

        const { timelineStart, timelineEnd, totalDuration } = useMemo(() => {
            if (!tasks || tasks.length === 0) {
                const today = new Date();
                return { timelineStart: today, timelineEnd: new Date(new Date().setDate(today.getDate() + 30)), totalDuration: 30 };
            }
            const startDates = tasks.map(t => parseDate(t.plannedStartDate));
            const endDates = tasks.map(t => parseDate(t.plannedEndDate));
            const minDate = new Date(Math.min.apply(null, startDates.map(d => d.getTime())));
            const maxDate = new Date(Math.max.apply(null, endDates.map(d => d.getTime())));
            minDate.setDate(minDate.getDate() - 2); // buffer
            maxDate.setDate(maxDate.getDate() + 2); // buffer
            return {
                timelineStart: minDate,
                timelineEnd: maxDate,
                totalDuration: diffDays(minDate, maxDate),
            };
        }, [tasks]);

        const timelineHeader = useMemo(() => {
            const header: Date[] = [];
            let current = new Date(timelineStart);
            while(current <= timelineEnd) {
                header.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
            return header;
        }, [timelineStart, timelineEnd]);

        return (
            <div className="mt-6 overflow-x-auto scrollbar-hide animate-fade-in bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 p-4">
                <div className="relative" style={{ minWidth: `${totalDuration * 40}px`}}>
                    {/* Grid Lines & Header */}
                    <div className="relative grid border-b-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-t-xl overflow-hidden" style={{ gridTemplateColumns: `repeat(${totalDuration}, minmax(40px, 1fr))`}}>
                        {timelineHeader.map((date, i) => (
                            <div key={i} className="text-center border-r border-gray-200 dark:border-gray-700 py-3">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{date.toLocaleDateString('en-US', {month: 'short'})}</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{date.getDate()}</p>
                            </div>
                        ))}
                    </div>
                    {/* Task Bars */}
                    <div className="relative mt-4 space-y-2">
                        {tasks.map((task, index) => {
                            const taskStart = parseDate(task.plannedStartDate);
                            const taskEnd = parseDate(task.plannedEndDate);
                            const offset = diffDays(timelineStart, taskStart);
                            const duration = diffDays(taskStart, taskEnd) + 1;
                            const left = (offset / totalDuration) * 100;
                            const width = (duration / totalDuration) * 100;
                            const barColor = GANTT_COLORS[index % GANTT_COLORS.length];
                            const isInteracting = interaction?.taskId === task.id;
                            
                            let style: React.CSSProperties = { top: `${index * 48}px`, left: `${left}%`, width: `${width}%`, zIndex: isInteracting ? 50 : 1 };
    
                            if (isInteracting && interaction) {
                                if (interaction.type === 'move') {
                                    style.transform = `translateX(${currentOffset}px)`;
                                } else if (interaction.type === 'resize-end') {
                                    style.width = `calc(${width}% + ${currentOffset}px)`;
                                } else if (interaction.type === 'resize-start') {
                                    style.left = `calc(${left}% + ${currentOffset}px)`;
                                    style.width = `calc(${width}% - ${currentOffset}px)`;
                                }
                            }
                            
                            return (
                                <React.Fragment key={task.id}>
                                    {isInteracting && interaction && interaction.type === 'move' && (
                                        <div 
                                            className="absolute w-full h-10 flex items-center pointer-events-none" 
                                            style={{ top: `${index * 48}px`, left: `${left}%`, width: `${width}%`, zIndex: 0 }}
                                        >
                                            <div className="w-full h-8 rounded-full border-2 border-dashed border-gray-400 bg-gray-50 opacity-50"></div>
                                        </div>
                                    )}
                                    <div 
                                        className="absolute w-full h-10 flex items-center transition-transform duration-75" 
                                        style={style}
                                        onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                                    >
                                        <div className={`w-full h-8 rounded-full flex items-center justify-between px-3 text-white shadow-md ${barColor} ${onTaskUpdate ? 'cursor-grab active:cursor-grabbing' : ''} relative group`}>
                                            {onTaskUpdate && (
                                                <div 
                                                    className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 hover:bg-black/20 rounded-l-full"
                                                    onMouseDown={(e) => handleMouseDown(e, task, 'resize-start')}
                                                />
                                            )}
                                            <span className="text-sm font-medium truncate pointer-events-none select-none">{task.name}</span>
                                            <img className="w-6 h-6 rounded-full border-2 border-white flex-shrink-0 pointer-events-none select-none" src={`https://i.pravatar.cc/150?u=${task.id}`} alt="user"/>
                                            {onTaskUpdate && (
                                                <div 
                                                    className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 hover:bg-black/20 rounded-r-full"
                                                    onMouseDown={(e) => handleMouseDown(e, task, 'resize-end')}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </React.Fragment>
                            )
                        })}
                    </div>
                    <div style={{height: `${tasks.length * 48}px`}}></div>
                </div>
            </div>
        )
    }

export const TNAView: FC<{
        tasks: any[];
        products?: CrmProduct[];
        onSaveTask?: (updatedTask: CrmTask) => Promise<void>;
        onSaveBulkTasks?: (tasks: CrmTask[]) => Promise<void>;
    }> = ({ tasks, products, onSaveTask, onSaveBulkTasks }) => {
        const parseDate = (str: string | null) => str ? new Date(str) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [editingTask, setEditingTask] = useState<CrmTask | null>(null);
        const [isSaving, setIsSaving] = useState(false);
        const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());

        // ── Bulk edit state ───────────────────────────────
        const [isEditMode, setIsEditMode] = useState(false);
        const [editingTasks, setEditingTasks] = useState<CrmTask[]>([]);
        const [isSavingBulk, setIsSavingBulk] = useState(false);

        const toggleProduct = (key: string) => {
            setCollapsedProducts(prev => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
            });
        };

        const calculateDelay = (task: any) => {
            const plannedEnd = parseDate(task.plannedEndDate);
            if (!plannedEnd) return { days: 0, status: 'ontime' };
            if (task.status === 'COMPLETE') {
                const actualEnd = parseDate(task.actualEndDate);
                if (!actualEnd) return { days: 0, status: 'ontime' };
                const delay = Math.ceil((actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));
                return { days: delay, status: delay > 0 ? 'delayed' : 'ontime' };
            } else {
                if (today > plannedEnd) {
                    const delay = Math.ceil((today.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));
                    return { days: delay, status: 'at-risk' };
                }
            }
            return { days: 0, status: 'ontime' };
        };

        const getDelayColor = (status: string) => {
            if (status === 'delayed') return 'text-red-600 font-semibold';
            if (status === 'at-risk') return 'text-yellow-600 font-semibold';
            return 'text-green-600 font-semibold';
        };

        const getStatusPill = (status: string) => {
            const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
            switch(status) {
                case 'COMPLETE': return `${baseClasses} bg-green-100 text-green-800`;
                case 'IN PROGRESS': return `${baseClasses} bg-blue-100 text-blue-800`;
                case 'TO DO': return `${baseClasses} bg-gray-100 text-gray-800`;
                default: return `${baseClasses} bg-gray-100 text-gray-800`;
            }
        };

        const priorityColors: Record<string, string> = {
            'Urgent': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
            'High': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
            'Medium': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
            'Low': 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
        };

        const PRODUCT_COLORS = [
            { border: 'border-l-blue-500', bg: 'from-blue-500 to-cyan-500', light: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
            { border: 'border-l-purple-500', bg: 'from-purple-500 to-pink-500', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300' },
            { border: 'border-l-emerald-500', bg: 'from-emerald-500 to-green-500', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300' },
            { border: 'border-l-amber-500', bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300' },
            { border: 'border-l-rose-500', bg: 'from-rose-500 to-red-500', light: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300' },
            { border: 'border-l-indigo-500', bg: 'from-indigo-500 to-violet-500', light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300' },
        ];

        // ── Category-based grouping ──────────────────────
        const allProductIds = useMemo(() => new Set((products || []).map(p => p.id)), [products]);

        const groupedStructure = useMemo(() => {
            if (!products || products.length === 0) {
                return [{ key: 'ungrouped', category: 'General Tasks', categoryProducts: [] as CrmProduct[], colorIdx: 0, isMultiProduct: false }];
            }
            const categoryMap = new Map<string, CrmProduct[]>();
            products.forEach(p => {
                const cat = p.category || p.name;
                if (!categoryMap.has(cat)) categoryMap.set(cat, []);
                categoryMap.get(cat)!.push(p);
            });
            const result: { key: string; category: string; categoryProducts: CrmProduct[]; colorIdx: number; isMultiProduct: boolean }[] = [];
            let idx = 0;
            categoryMap.forEach((prods, cat) => {
                result.push({ key: cat, category: cat, categoryProducts: prods, colorIdx: idx++, isMultiProduct: prods.length > 1 });
            });
            // Ungrouped slot — only rendered if there are unmatched tasks
            result.push({ key: 'ungrouped', category: 'General Tasks', categoryProducts: [], colorIdx: idx, isMultiProduct: false });
            return result;
        }, [products]);

        // ── Bulk edit handlers ────────────────────────────
        const enterEditMode = () => {
            setEditingTasks(tasks.map(t => ({ ...t })));
            setIsEditMode(true);
        };
        const cancelEditMode = () => {
            setEditingTasks([]);
            setIsEditMode(false);
        };
        const handleBulkSave = async () => {
            if (!onSaveBulkTasks) return;
            setIsSavingBulk(true);
            try {
                await onSaveBulkTasks(editingTasks);
                setIsEditMode(false);
                setEditingTasks([]);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSavingBulk(false);
            }
        };
        const updateEditingTask = (taskId: number, field: string, value: any) => {
            setEditingTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
        };
        const deleteEditingTask = (taskId: number) => {
            setEditingTasks(prev => prev.filter(t => t.id !== taskId));
        };
        const addEditingTask = (defaultProductId?: string) => {
            const newTask: CrmTask = {
                id: Date.now(),
                name: 'New Task',
                responsible: '',
                plannedStartDate: '',
                plannedEndDate: '',
                actualStartDate: null,
                actualEndDate: null,
                status: 'TO DO',
                productId: defaultProductId,
                priority: 'Medium',
                progress: 0,
            };
            setEditingTasks(prev => [...prev, newTask]);
        };

        const handleSave = async () => {
            if (!editingTask || !onSaveTask) return;
            setIsSaving(true);
            try {
                await onSaveTask(editingTask);
                setEditingTask(null);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSaving(false);
            }
        };

        const sourceTasks = isEditMode ? editingTasks : tasks;
        const inputCls = "px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";

        // ── Editable row (bulk edit mode) ─────────────────
        const renderEditableRow = (task: CrmTask, isMultiProduct: boolean, categoryProducts: CrmProduct[]) => {
            const delayInfo = calculateDelay(task);
            const progress = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
            return (
                <tr key={task.id} className="bg-blue-50/20 dark:bg-blue-900/5 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors">
                    {isMultiProduct && (
                        <td className="px-3 py-2 min-w-[120px]">
                            <select value={task.productId || ''} onChange={e => updateEditingTask(task.id, 'productId', e.target.value)} className={inputCls}>
                                {categoryProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </td>
                    )}
                    <td className="px-3 py-2 min-w-[150px]">
                        <input type="text" value={task.name} onChange={e => updateEditingTask(task.id, 'name', e.target.value)} className={inputCls} placeholder="Task name" />
                    </td>
                    <td className="px-3 py-2">
                        <select value={task.priority || 'Medium'} onChange={e => updateEditingTask(task.id, 'priority', e.target.value as any)} className={inputCls}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </td>
                    <td className="px-3 py-2 min-w-[110px]">
                        <input type="text" value={task.responsible || ''} onChange={e => updateEditingTask(task.id, 'responsible', e.target.value)} className={inputCls} placeholder="Responsible" />
                    </td>
                    <td className="px-3 py-2">
                        <input type="date" value={task.plannedStartDate || ''} onChange={e => updateEditingTask(task.id, 'plannedStartDate', e.target.value)} className={inputCls} />
                    </td>
                    <td className="px-3 py-2">
                        <input type="date" value={task.plannedEndDate || ''} onChange={e => updateEditingTask(task.id, 'plannedEndDate', e.target.value)} className={inputCls} />
                    </td>
                    <td className="px-3 py-2">
                        <input type="date" value={task.actualStartDate || ''} onChange={e => updateEditingTask(task.id, 'actualStartDate', e.target.value || null as any)} className={inputCls} />
                    </td>
                    <td className="px-3 py-2">
                        <input type="date" value={task.actualEndDate || ''} onChange={e => updateEditingTask(task.id, 'actualEndDate', e.target.value || null as any)} className={inputCls} />
                    </td>
                    <td className="px-3 py-2 min-w-[80px]">
                        <div className="flex items-center gap-1">
                            <input type="number" min="0" max="100" step="5" value={progress} onChange={e => updateEditingTask(task.id, 'progress', parseInt(e.target.value) || 0)} disabled={task.status === 'COMPLETE'} className={`${inputCls} w-14`} />
                            <span className="text-xs text-gray-400 flex-shrink-0">%</span>
                        </div>
                    </td>
                    <td className="px-3 py-2">
                        <select value={task.status} onChange={e => updateEditingTask(task.id, 'status', e.target.value as any)} className={inputCls}>
                            <option value="TO DO">TO DO</option>
                            <option value="IN PROGRESS">IN PROGRESS</option>
                            <option value="COMPLETE">COMPLETE</option>
                        </select>
                    </td>
                    <td className={`px-3 py-2 text-xs font-bold ${getDelayColor(delayInfo.status)}`}>
                        {delayInfo.days > 0 ? `+${delayInfo.days}d` : '—'}
                    </td>
                    <td className="px-3 py-2">
                        <button onClick={() => deleteEditingTask(task.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" title="Delete task">
                            <Trash2 size={14} />
                        </button>
                    </td>
                </tr>
            );
        };

        // ── Read-only row ─────────────────────────────────
        const renderTaskRows = (groupTasks: any[], isMultiProduct: boolean, categoryProducts: CrmProduct[]) => groupTasks.map((task) => {
            const delayInfo = calculateDelay(task);
            const progress = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
            const itemProduct = isMultiProduct ? categoryProducts.find(p => p.id === task.productId) : undefined;
            return (
                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 group">
                    {isMultiProduct && (
                        <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {itemProduct?.name || '—'}
                            </span>
                        </td>
                    )}
                    <td className="px-5 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">{task.name}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                        {task.priority ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${priorityColors[task.priority] || priorityColors['Medium']}`}>
                                <Flag size={10} /> {task.priority}
                            </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                            <img className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700" src={`https://i.pravatar.cc/150?u=${task.responsible}`} alt="user"/>
                            {task.responsible}
                        </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{task.plannedStartDate}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{task.plannedEndDate}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{task.actualStartDate || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{task.actualEndDate || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-7 text-right">{progress}%</span>
                        </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap"><span className={getStatusPill(task.status)}>{task.status}</span></td>
                    <td className={`px-5 py-4 whitespace-nowrap font-bold ${getDelayColor(delayInfo.status)}`}>
                        {delayInfo.days > 0 ? (
                            <span className="flex items-center gap-1"><AlertCircle size={14} />+{delayInfo.days}d</span>
                        ) : '—'}
                    </td>
                    {onSaveTask && !isEditMode && (
                        <td className="px-3 py-4 whitespace-nowrap">
                            <button
                                onClick={() => setEditingTask({ ...task })}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                                title="Edit task"
                            >
                                <Pencil size={14} />
                            </button>
                        </td>
                    )}
                </tr>
            );
        });

        return (
            <div className="mt-6 space-y-3 animate-fade-in">
                {/* ── Bulk Edit Toolbar ─────────────────────────── */}
                {onSaveBulkTasks && (
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${
                        isEditMode
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                            : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-white/10'
                    }`}>
                        {isEditMode ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Bulk Editing TNA</span>
                                    <span className="text-xs text-blue-500 dark:text-blue-400">— {editingTasks.length} tasks</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={cancelEditMode} className="px-3 py-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleBulkSave} disabled={isSavingBulk} className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
                                        {isSavingBulk ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={13} />}
                                        {isSavingBulk ? 'Saving...' : 'Save All Changes'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Manage all tasks at once</span>
                                <button onClick={enterEditMode} className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all shadow-sm">
                                    <Pencil size={13} />
                                    Edit TNA
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* ── Category Sections ─────────────────────────── */}
                {groupedStructure.map(({ key, category, categoryProducts, colorIdx, isMultiProduct }) => {
                    const productIds = new Set(categoryProducts.map(p => p.id));
                    const groupTasks = categoryProducts.length === 0
                        ? sourceTasks.filter((t: any) => !t.productId || !allProductIds.has(t.productId))
                        : sourceTasks.filter((t: any) => productIds.has(t.productId));

                    // Hide empty ungrouped section when products exist
                    if (key === 'ungrouped' && groupTasks.length === 0 && products && products.length > 0) return null;

                    const color = PRODUCT_COLORS[colorIdx % PRODUCT_COLORS.length];
                    const completedCount = groupTasks.filter((t: any) => t.status === 'COMPLETE').length;
                    const atRiskCount = groupTasks.filter((t: any) => {
                        const pd = parseDate(t.plannedEndDate);
                        return t.status !== 'COMPLETE' && pd && today > pd;
                    }).length;
                    const sectionProgress = groupTasks.length > 0 ? Math.round((completedCount / groupTasks.length) * 100) : 0;
                    const isCollapsed = collapsedProducts.has(key);
                    const totalQty = categoryProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);

                    const sectionHeaders = isEditMode
                        ? [...(isMultiProduct ? ['Item'] : []), 'Task', 'Priority', 'Responsible', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Progress', 'Status', 'Delay', '']
                        : [...(isMultiProduct ? ['Item'] : []), 'Task', 'Priority', 'Responsible', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Progress', 'Status', 'Delay', ...(onSaveTask && !isEditMode ? [''] : [])];

                    return (
                        <div key={key} className={`bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden border-l-4 ${color.border} transition-all duration-200`}>
                            {/* Section Header */}
                            <button
                                type="button"
                                onClick={() => toggleProduct(key)}
                                className={`w-full px-6 py-4 ${color.light} ${!isCollapsed ? 'border-b border-gray-200 dark:border-white/10' : ''} flex flex-wrap items-center justify-between gap-3 hover:brightness-[0.97] dark:hover:brightness-110 transition-all duration-150 text-left`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 bg-gradient-to-br ${color.bg} rounded-lg shadow-sm flex-shrink-0`}>
                                        <Package size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-base ${color.text}`}>{category}</h3>
                                        {isMultiProduct ? (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {categoryProducts.map(p => p.name).join(' · ')}
                                                {totalQty > 0 && ` — ${totalQty.toLocaleString()} units`}
                                            </p>
                                        ) : (
                                            categoryProducts[0]?.quantity ? (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{categoryProducts[0].quantity.toLocaleString()} units</p>
                                            ) : null
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        <CheckCircle size={13} className="text-green-500" />
                                        <span>{completedCount}/{groupTasks.length} tasks</span>
                                    </div>
                                    {atRiskCount > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                            <AlertCircle size={13} />
                                            <span>{atRiskCount} at risk</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 min-w-[100px]">
                                        <div className="flex-1 h-1.5 bg-gray-200/60 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full bg-gradient-to-r ${color.bg} transition-all duration-500`} style={{ width: `${sectionProgress}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-8 text-right">{sectionProgress}%</span>
                                    </div>
                                    {!isMultiProduct && categoryProducts[0]?.status && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                            {categoryProducts[0].status}
                                        </span>
                                    )}
                                    <div className={`ml-1 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>
                                        <ChevronUp size={16} />
                                    </div>
                                </div>
                            </button>
                            {/* Task Table */}
                            {!isCollapsed && (
                                groupTasks.length > 0 || isEditMode ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                                                <tr>
                                                    {sectionHeaders.map((header, i) => (
                                                        <th key={`${header}-${i}`} scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            {isMultiProduct ? (
                                                // Sub-sections per product within the category
                                                categoryProducts.map(product => {
                                                    const productTasks = groupTasks.filter((t: any) => t.productId === product.id);
                                                    const productCompleted = productTasks.filter((t: any) => t.status === 'COMPLETE').length;
                                                    return (
                                                        <tbody key={product.id} className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                                                            {/* Product sub-header row */}
                                                            <tr className="bg-gray-50/80 dark:bg-gray-800/60">
                                                                <td colSpan={sectionHeaders.length} className="px-5 py-2.5 border-t border-gray-200 dark:border-gray-700">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{product.name}</span>
                                                                        {product.quantity ? <span className="text-xs text-gray-400">{product.quantity.toLocaleString()} units</span> : null}
                                                                        {product.status && (
                                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{product.status}</span>
                                                                        )}
                                                                        <span className="text-xs text-gray-400">{productCompleted}/{productTasks.length} tasks</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {/* Task rows for this product */}
                                                            {isEditMode
                                                                ? productTasks.map(task => renderEditableRow(task as CrmTask, isMultiProduct, categoryProducts))
                                                                : renderTaskRows(productTasks, isMultiProduct, categoryProducts)
                                                            }
                                                            {/* Add task row (edit mode) */}
                                                            {isEditMode && (
                                                                <tr>
                                                                    <td colSpan={sectionHeaders.length} className="px-4 py-2 bg-gray-50/30 dark:bg-gray-800/10">
                                                                        <button
                                                                            onClick={() => addEditingTask(product.id)}
                                                                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                                        >
                                                                            <Plus size={12} />
                                                                            Add Task to {product.name}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    );
                                                })
                                            ) : (
                                                // Single product — flat tbody
                                                <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                                                    {isEditMode
                                                        ? groupTasks.map(task => renderEditableRow(task as CrmTask, isMultiProduct, categoryProducts))
                                                        : renderTaskRows(groupTasks, isMultiProduct, categoryProducts)
                                                    }
                                                    {isEditMode && (
                                                        <tr>
                                                            <td colSpan={sectionHeaders.length} className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/20">
                                                                <button
                                                                    onClick={() => addEditingTask(categoryProducts[0]?.id)}
                                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                                >
                                                                    <Plus size={14} />
                                                                    Add Task
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            )}
                                        </table>
                                    </div>
                                ) : (
                                    <div className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                        No tasks assigned to this product yet.
                                    </div>
                                )
                            )}
                        </div>
                    );
                })}

                {/* ── Single-Task Edit Modal ─────────────────────── */}
                {editingTask && onSaveTask && !isEditMode && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in" onClick={() => setEditingTask(null)}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-white/10 animate-scale-in" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-md">
                                        <Pencil size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Edit Task</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{editingTask.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditingTask(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
                                        <select
                                            value={editingTask.status}
                                            onChange={e => setEditingTask({ ...editingTask, status: e.target.value as CrmTask['status'] })}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="TO DO">TO DO</option>
                                            <option value="IN PROGRESS">IN PROGRESS</option>
                                            <option value="COMPLETE">COMPLETE</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Priority</label>
                                        <select
                                            value={editingTask.priority || 'Medium'}
                                            onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as CrmTask['priority'] })}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                        Progress — {editingTask.status === 'COMPLETE' ? 100 : (editingTask.progress || 0)}%
                                    </label>
                                    <input
                                        type="range" min="0" max="100" step="5"
                                        value={editingTask.status === 'COMPLETE' ? 100 : (editingTask.progress || 0)}
                                        onChange={e => setEditingTask({ ...editingTask, progress: parseInt(e.target.value) })}
                                        disabled={editingTask.status === 'COMPLETE'}
                                        className="w-full accent-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Planned Start</label>
                                        <input
                                            type="date" value={editingTask.plannedStartDate || ''}
                                            onChange={e => setEditingTask({ ...editingTask, plannedStartDate: e.target.value })}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Planned End</label>
                                        <input
                                            type="date" value={editingTask.plannedEndDate || ''}
                                            onChange={e => setEditingTask({ ...editingTask, plannedEndDate: e.target.value })}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Actual Start</label>
                                        <input
                                            type="date" value={editingTask.actualStartDate || ''}
                                            onChange={e => setEditingTask({ ...editingTask, actualStartDate: e.target.value || null })}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Actual End</label>
                                        <input
                                            type="date" value={editingTask.actualEndDate || ''}
                                            onChange={e => setEditingTask({ ...editingTask, actualEndDate: e.target.value || null })}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Responsible</label>
                                    <input
                                        type="text" value={editingTask.responsible || ''}
                                        onChange={e => setEditingTask({ ...editingTask, responsible: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Person responsible"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
                                    <textarea
                                        value={editingTask.notes || ''}
                                        onChange={e => setEditingTask({ ...editingTask, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Add any notes..."
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingTask(null)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save size={14} />
                                    )}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

export const OrderDetailsView: FC<{ order: any; allFactories: Factory[]; handleSetCurrentPage: (page: string, data?: any) => void; onSelectProduct?: (productId: string) => void }> = ({ order, allFactories, handleSetCurrentPage, onSelectProduct }) => {
        const factory = allFactories.find(f => f.id === order.factoryId || f.id === (order as any).factory_id);
        const hasCustomFactory = !factory && !!((order as any).custom_factory_name);
        const products: CrmProduct[] = order.products && order.products.length > 0
            ? order.products
            : [{ id: 'default', name: order.product || 'Product', status: order.status }];
        const tasks: CrmTask[] = order.tasks || [];

        const getDocIcon = (type: string) => {
            switch(type) {
                case 'PO': return <FileText className="text-blue-500" />;
                case 'Logistics': return <Ship className="text-orange-500" />;
                case 'Finance': return <DollarSign className="text-green-500" />;
                default: return <FileText className="text-gray-500" />;
            }
        }

        const PRODUCT_COLORS = [
            'from-blue-500 to-cyan-500',
            'from-purple-500 to-pink-500',
            'from-emerald-500 to-green-500',
            'from-amber-500 to-orange-500',
            'from-rose-500 to-red-500',
            'from-indigo-500 to-violet-500',
            'from-teal-500 to-cyan-500',
            'from-fuchsia-500 to-pink-500',
        ];

        return (
            <div className="mt-6 space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Order Summary */}
                        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-md">
                                    <Info size={16} className="text-white"/>
                                </div>
                                Order Summary
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-700/30">
                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Order ID</p>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{order.id || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700/30">
                                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">Customer</p>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{order.customer}</p>
                                </div>
                            </div>
                        </div>

                        {/* Products Overview */}
                        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-md">
                                    <Package size={16} className="text-white"/>
                                </div>
                                Products ({products.length})
                            </h3>
                            <div className="space-y-4">
                                {products.map((product, idx) => {
                                    const productTasks = tasks.filter(t => t.productId === product.id);
                                    const completedCount = productTasks.filter(t => t.status === 'COMPLETE').length;
                                    const inProgressCount = productTasks.filter(t => t.status === 'IN PROGRESS').length;
                                    const totalCount = productTasks.length;
                                    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                    const colorGradient = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];

                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => onSelectProduct?.(product.id)}
                                            className="relative p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/50 dark:to-gray-700/30"
                                        >
                                            <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-xl bg-gradient-to-b ${colorGradient}`} />
                                            <div className="ml-3">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-[#c20c0b] dark:group-hover:text-red-400 transition-colors">{product.name}</h4>
                                                        {product.quantity && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                                {product.quantity.toLocaleString()} units
                                                            </span>
                                                        )}
                                                        {product.status && (
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getOrderStatusColor(product.status)}`}>
                                                                {product.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-400 group-hover:text-[#c20c0b] dark:group-hover:text-red-400 transition-colors">
                                                        <span className="text-xs font-semibold">View Details</span>
                                                        <ArrowRight size={14} />
                                                    </div>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="mb-2">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                            {completedCount} of {totalCount} tasks complete
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full bg-gradient-to-r ${colorGradient} transition-all duration-700 ease-out`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Task counts */}
                                                <div className="flex items-center gap-4 text-xs mt-2">
                                                    {inProgressCount > 0 && (
                                                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                            <Clock size={12} />
                                                            {inProgressCount} in progress
                                                        </span>
                                                    )}
                                                    {completedCount > 0 && (
                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle size={12} />
                                                            {completedCount} done
                                                        </span>
                                                    )}
                                                    {totalCount - completedCount - inProgressCount > 0 && (
                                                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                                            <AlertCircle size={12} />
                                                            {totalCount - completedCount - inProgressCount} to do
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg shadow-md">
                                    <FileText size={16} className="text-white"/>
                                </div>
                                Order Documents
                            </h3>
                            <div className="space-y-3">
                                {order.documents.map((doc: any, index: number) => (
                                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 hover:shadow-md group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:scale-110 transition-transform">
                                                {getDocIcon(doc.type)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">{doc.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Updated: {doc.lastUpdated}</p>
                                            </div>
                                        </div>
                                        <button className="p-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-[var(--color-primary)] dark:hover:text-red-400 transition-all duration-200">
                                            <Download size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Right Column */}
                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg shadow-md">
                                <Building size={16} className="text-white"/>
                            </div>
                            Assigned Factory
                        </h3>
                        {factory ? (
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl">
                                    <img src={factory.imageUrl} alt={factory.name} className="w-16 h-16 rounded-xl object-cover border-2 border-white dark:border-gray-600 shadow-md"/>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-base">{factory.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                            <MapPin size={14} />{factory.location}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/30">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rating</span>
                                        <div className="flex items-center gap-1">
                                            <Star size={16} className="text-yellow-500 fill-yellow-500"/>
                                            <span className="font-bold text-gray-900 dark:text-white">{factory.rating}</span>
                                            <span className="text-gray-500 text-sm">/ 5.0</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/30">
                                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Specialties</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{factory.specialties.join(', ')}</p>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/30">
                                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Contact</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">john.doe@example.com</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => factory && handleSetCurrentPage('factoryDetail', factory)}
                                    className="w-full mt-2 py-3 px-4 text-sm font-bold bg-gradient-to-r from-[#c20c0b] to-red-600 text-white rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2">
                                    View Factory Profile
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        ) : hasCustomFactory ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-md flex-shrink-0">
                                        <Building size={28} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-base">{(order as any).custom_factory_name}</p>
                                        {(order as any).custom_factory_location && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                <MapPin size={14} />{(order as any).custom_factory_location}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/30 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Manually entered</span>
                                </div>
                            </div>
                        ) : <p className="text-gray-500 dark:text-gray-400 text-center py-8">No factory assigned.</p>}
                    </div>
                </div>
            </div>
        )
    }

export const CRMPage: FC<CRMPageProps> = (props) => {
    const { 
        crmData: initialCrmData, activeCrmOrderKey, allFactories, callGeminiAPI, showToast, handleSetCurrentPage, user
    } = props;

    const [crmData, setCrmData] = useState<{ [key: string]: CrmOrder }>(initialCrmData);
    const [activeOrderKey, setActiveOrderKey] = useState<string | null>(activeCrmOrderKey || (Object.keys(initialCrmData).length > 0 ? Object.keys(initialCrmData)[0] : null));
    
    useEffect(() => {
        if (activeCrmOrderKey) {
            setActiveOrderKey(activeCrmOrderKey);
        }
    }, [activeCrmOrderKey]);

    useEffect(() => {
        const fetchClientOrders = async () => {
            if (user) {
                const { data } = await crmService.getOrdersByClient(user.id);
                if (data) {
                    const mappedData: { [key: string]: CrmOrder } = {};
                    data.forEach((order: any) => {
                        const normalized = normalizeOrder(order);
                        mappedData[order.id] = {
                            ...normalized,
                            customer: 'My Order',
                        };
                    });
                    setCrmData(mappedData);
                    if (!activeCrmOrderKey && data.length > 0) setActiveOrderKey(data[0].id);
                    else if (data.length === 0) setActiveOrderKey(null);
                }
            }
        };
        fetchClientOrders();
    }, [user]);

    const [activeView, setActiveView] = useState('Overview');
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [orderSummary, setOrderSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    const activeOrder = activeOrderKey && crmData[activeOrderKey] ? { ...crmData[activeOrderKey], id: activeOrderKey } : null;

    // Filter tasks for the selected product
    const filteredTasks = useMemo(() => {
        if (!activeOrder) return [];
        if (!selectedProductId) return activeOrder.tasks;
        return activeOrder.tasks.filter(t => t.productId === selectedProductId);
    }, [activeOrder, selectedProductId]);

    const selectedProduct = useMemo(() => {
        if (!selectedProductId || !activeOrder?.products) return null;
        return activeOrder.products.find(p => p.id === selectedProductId) || null;
    }, [selectedProductId, activeOrder]);

    // Dynamic view tabs based on product selection
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

    // Reset view when switching product context
    const handleSelectProduct = (productId: string) => {
        setSelectedProductId(productId);
        setActiveView('List');
    };
    const handleBackToOverview = () => {
        setSelectedProductId(null);
        setActiveView('Overview');
    };

    const generateOrderSummary = async () => {
        if (!activeOrder) return;
        setIsSummaryModalOpen(true);
        setIsSummaryLoading(true);
        setOrderSummary('');
        const taskDetails = activeOrder.tasks.map(t => `- ${t.name}: ${t.status} (Due: ${t.plannedEndDate})`).join('\n');
        const prompt = `
            Generate a professional project report and order summary for the following garment production order:
            
            **Order ID:** ${activeOrderKey}
            **Customer:** ${activeOrder.customer}
            **Product:** ${activeOrder.product}

            **Current Task Status:**
            ${taskDetails}

            Please structure your response with the following sections:
            1.  **Overall Status:** A one-sentence overview of the order's health, including the percentage of tasks completed.
            2.  **Current Focus:** Describe what is actively being worked on (tasks in progress).
            3.  **Upcoming Milestones:** List the next 2-3 important tasks from the 'TO DO' list.
            4.  **Potential Risks:** Identify any potential risks based on the task list. If none are apparent, state "No immediate risks identified."
            
            Format the response clearly using markdown for headings and lists.
        `;
        try {
            const summary = await callGeminiAPI(prompt);
            setOrderSummary(summary);
        } catch (error) {
            console.error("Failed to generate order summary:", error);
            setOrderSummary("### Error\nSorry, I was unable to generate a summary at this time. Please try again later.");
            showToast("Error generating summary.", "error");
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const MarkdownRenderer: FC<{ text: string }> = ({ text }) => {
        if (!text) return null;
        // A simple markdown-like renderer
        const lines = text.split('\n').map((line, i) => {
            if (line.startsWith('###')) return <h3 key={i} className="text-xl font-bold text-gray-800 dark:text-white mb-4">{line.replace('###', '')}</h3>;
            if (line.startsWith('**')) return <p key={i} className="font-semibold text-gray-700 dark:text-white mt-4 mb-1">{line.replace(/\*\*/g, '')}</p>;
            if (line.startsWith('- ')) return <li key={i} className="flex items-start my-1 text-gray-600 dark:text-gray-300"><span className="mr-3 mt-1.5 text-[var(--color-primary)]">∙</span><span>{line.substring(2)}</span></li>;
            return <p key={i} className="text-gray-600 dark:text-gray-200">{line}</p>;
        });
        return <div className="space-y-1">{lines}</div>;
    };

    const AIOrderSummaryModal: FC = () => (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={() => setIsSummaryModalOpen(false)}>
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl relative border border-gray-200 dark:border-white/10 animate-scale-in" onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => setIsSummaryModalOpen(false)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                    <X size={24} />
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">AI Order Summary</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Powered by Gemini AI</p>
                    </div>
                </div>
                <div className="min-h-[250px] max-h-[70vh] overflow-y-auto prose prose-sm max-w-none p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                    {isSummaryLoading ? (
                        <div className="flex items-center justify-center h-full flex-col py-12">
                            <div className="relative">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-[var(--color-primary)] dark:border-t-red-400 absolute top-0"></div>
                            </div>
                            <p className="mt-6 text-gray-600 dark:text-gray-400 font-semibold flex items-center gap-2">
                                <span className="inline-block w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse"></span>
                                Analyzing order data...
                            </p>
                        </div>
                    ) : (
                        <MarkdownRenderer text={orderSummary} />
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <MainLayout {...props}>
            {/* Hero Header Section */}
            <header className="mb-8 relative">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6 sm:p-8 shadow-2xl border border-white/5">
                    {/* Animated background blobs */}
                    <div className="absolute top-0 left-0 w-72 h-72 bg-red-500/30 rounded-full filter blur-3xl animate-blob"></div>
                    <div className="absolute top-10 right-10 w-64 h-64 bg-pink-500/30 rounded-full filter blur-3xl animate-blob-delay-2"></div>
                    <div className="absolute -bottom-10 left-1/3 w-56 h-56 bg-purple-500/30 rounded-full filter blur-3xl animate-blob-delay-4"></div>

                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-[#c20c0b] to-red-600 rounded-xl shadow-lg">
                                    <ClipboardCheck className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                                    CRM <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent animate-gradient-x font-black">Portal</span>
                                </h1>
                            </div>
                            <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-2xl">
                                Track orders, manage tasks, and monitor production progress in real-time
                            </p>
                        </div>

                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-white/10">
                <div className="border-b border-gray-200 dark:border-white/10 pb-4 mb-2">
                    <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-3">
                        {/* Order Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {Object.keys(crmData).map(orderKey => (
                                <button
                                    key={orderKey}
                                    onClick={() => { setActiveOrderKey(orderKey); setSelectedProductId(null); setActiveView('Overview'); }}
                                    className={`flex-shrink-0 py-2.5 px-5 font-semibold text-sm rounded-xl transition-all duration-300 ${
                                        activeOrderKey === orderKey
                                            ? 'bg-gradient-to-r from-[#c20c0b] to-red-600 text-white shadow-lg shadow-red-500/25 scale-105'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                                    }`}
                                >
                                    <Package size={14} className="inline mr-1.5" />
                                    {crmData[orderKey].product}
                                </button>
                            ))}
                        </div>
                        {/* View Tabs & AI Button */}
                        <div className="flex items-center gap-2">
                            {/* Back button when viewing a product */}
                            {selectedProductId && selectedProduct && (
                                <button
                                    onClick={handleBackToOverview}
                                    className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#c20c0b] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                >
                                    <ArrowLeft size={14} />
                                    <span className="hidden sm:inline">Back</span>
                                </button>
                            )}
                            {selectedProduct && (
                                <span className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[150px]">
                                    {selectedProduct.name}
                                </span>
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
                            <button
                                onClick={generateOrderSummary}
                                className="p-2.5 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-[var(--color-primary)] dark:text-red-400 rounded-xl hover:from-red-200 hover:to-pink-200 dark:hover:from-red-900/50 dark:hover:to-pink-900/50 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110"
                                title="Generate AI Summary"
                            >
                                <Bot size={18}/>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Overview mode: Overview, TNA, Dashboard (all tasks) */}
                {activeOrder && activeView === 'Overview' && <OrderDetailsView order={activeOrder} allFactories={allFactories} handleSetCurrentPage={handleSetCurrentPage} onSelectProduct={handleSelectProduct} />}
                {activeOrder && activeView === 'TNA' && <TNAView tasks={activeOrder.tasks} products={activeOrder.products} />}
                {activeOrder && activeView === 'Dashboard' && <DashboardView tasks={activeOrder.tasks} orderKey={activeOrderKey || ''} orderDetails={activeOrder}/>}
                {/* Product mode: List, Board, Gantt (filtered tasks) */}
                {activeOrder && activeView === 'List' && <ListView tasks={filteredTasks} />}
                {activeOrder && activeView === 'Board' && <BoardView tasks={filteredTasks} />}
                {activeOrder && activeView === 'Gantt' && <GanttChartView tasks={filteredTasks} />}
            </div>
            {isSummaryModalOpen && <AIOrderSummaryModal />}
        </MainLayout>
    );
};