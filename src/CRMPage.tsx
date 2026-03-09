import React, { FC, useState, useEffect, useMemo, useRef, ReactNode, useCallback } from 'react';
import {
    List, TrendingUp, CheckCircle, Package, PieChart as PieChartIcon,
    BarChart as BarChartIcon, Info, LayoutDashboard, ClipboardCheck,
    GanttChartSquare, Bot, FileText, Ship, DollarSign, Download, MapPin, Plus, ChevronDown, X,
    Star, AlertCircle, ArrowRight, ArrowLeft, Building, Clock, Flag,
    Activity, Scissors, Target, Zap, ChevronRight, ChevronLeft, Pencil, Save, ChevronUp, Trash2,
    User, CalendarDays, AlertTriangle, Calendar, Paperclip, CheckCircle2, ThumbsUp, ThumbsDown, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, Cell, PieChart
} from 'recharts';
import { MainLayout } from '../src/MainLayout';
import { CrmOrder, CrmProduct, CrmTask, Factory } from '../src/types';
import { crmService } from './crm.service';
import { normalizeOrder, getOrderStatusColor } from './utils';
import jsPDF from 'jspdf';

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
                        {toDoCount + inProgressCount + completedCount} total tasks
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
                        <p className="text-[10px] text-gray-400">complete</p>
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

// Task-level calendar for individual order DashboardView
function _TaskCalendar({ tasks }: { tasks: any[] }) {
    const [currentDate, setCurrentDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const STATUS_COLORS: Record<string, string> = {
        'COMPLETE': '#10b981',
        'IN PROGRESS': '#3b82f6',
        'TO DO': '#9ca3af',
    };

    const dayTasks = useMemo(() => {
        const map: Record<number, { label: string; color: string }[]> = {};
        tasks.forEach(task => {
            if (!task.plannedEndDate) return;
            const start = task.plannedStartDate ? new Date(task.plannedStartDate) : new Date(task.plannedEndDate);
            const end = new Date(task.plannedEndDate);
            const color = STATUS_COLORS[task.status] || '#9ca3af';
            for (let d = 1; d <= daysInMonth; d++) {
                const day = new Date(year, month, d);
                if (day >= start && day <= end) {
                    if (!map[d]) map[d] = [];
                    if (map[d].length < 3) map[d].push({ label: task.name, color });
                }
            }
        });
        return map;
    }, [tasks, year, month, daysInMonth]);

    const today = new Date();
    const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="h-14 rounded-lg" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const items = dayTasks[day] || [];
                    const past = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    return (
                        <div key={day} className={`h-14 rounded-lg p-1 overflow-hidden transition-colors ${
                            isToday(day) ? 'bg-[#c20c0b]/10 dark:bg-[#c20c0b]/20 ring-1 ring-[#c20c0b]/40'
                            : items.length > 0 ? 'bg-blue-50/60 dark:bg-blue-900/10'
                            : 'bg-gray-50/60 dark:bg-gray-800/20'
                        }`}>
                            <span className={`text-[11px] font-bold leading-none ${isToday(day) ? 'text-[#c20c0b]' : past ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'}`}>{day}</span>
                            <div className="mt-0.5 space-y-px">
                                {items.slice(0, 2).map((o, oi) => <div key={oi} className="h-1.5 rounded-full w-full opacity-80" style={{ backgroundColor: o.color }} title={o.label} />)}
                                {items.length > 2 && <div className="text-[9px] text-gray-400 font-semibold">+{items.length - 2}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center gap-4 flex-wrap">
                {Object.entries(STATUS_COLORS).map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{label.charAt(0) + label.slice(1).toLowerCase()}</span>
                    </div>
                ))}
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

        const onTimeRate = totalTasks > 0 ? Math.round(((totalTasks - overdueCount) / totalTasks) * 100) : 100;

        const priorityData = useMemo(() => {
            const counts: Record<string, number> = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
            tasks.forEach(t => { const p = t.priority; if (p && p in counts) counts[p]++; });
            return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
        }, [tasks]);

        const upcomingTasks = useMemo(() => {
            const now = new Date(); now.setHours(0, 0, 0, 0);
            const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
            return tasks
                .filter(t => t.status !== 'COMPLETE' && t.plannedEndDate && new Date(t.plannedEndDate) >= now && new Date(t.plannedEndDate) <= in30)
                .sort((a, b) => new Date(a.plannedEndDate).getTime() - new Date(b.plannedEndDate).getTime())
                .slice(0, 5);
        }, [tasks]);

        const COLORS = darkMode ? ['#4B5563', '#F59E0B', '#10B981'] : ['#D1D5DB', '#FBBF24', '#34D399'];
        const PRIORITY_COLORS: Record<string, string> = { Urgent: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#6b7280' };
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
            ? { text: 'All tasks on track', dot: 'bg-emerald-500', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
            : { text: `${overdueCount} task${overdueCount > 1 ? 's' : ''} overdue`, dot: 'bg-amber-500', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };

        return (
            <div className="mt-4 space-y-5 animate-fade-in">
                {/* ── Textile infographic section ────────────────────────── */}
                <div ref={statsRef}>
                    {/* Health badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${healthLabel.bg} mb-4`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${healthLabel.dot} animate-pulse`} />
                        <span className={`text-[11px] font-semibold ${healthLabel.color}`}>{healthLabel.text}</span>
                    </div>

                    {/* 5 stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                        <_StatCard
                            title="Total Tasks"
                            value={totalTasks}
                            subtitle="tasks in order"
                            icon={<List size={18} className="text-white" />}
                            gradient="bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900"
                            shadowColor="rgba(15,23,42,0.4)"
                            inView={inView}
                        />
                        <_StatCard
                            title="In Progress"
                            value={inProgressTasks}
                            subtitle="tasks running now"
                            icon={<Activity size={18} className="text-white" />}
                            gradient="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700"
                            shadowColor="rgba(59,130,246,0.4)"
                            inView={inView}
                        />
                        <_StatCard
                            title="Completed"
                            value={completedTasks}
                            subtitle="tasks finished"
                            icon={<CheckCircle size={18} className="text-white" />}
                            gradient="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700"
                            shadowColor="rgba(16,185,129,0.4)"
                            inView={inView}
                        />
                        <_StatCard
                            title={overdueCount > 0 ? 'Overdue' : 'Completion'}
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
                        <_StatCard
                            title="On-Time Rate"
                            value={onTimeRate}
                            suffix="%"
                            subtitle={overdueCount > 0 ? `${overdueCount} task${overdueCount > 1 ? 's' : ''} at risk` : 'All on schedule'}
                            icon={<Clock size={18} className="text-white" />}
                            gradient={onTimeRate >= 80
                                ? 'bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700'
                                : 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-700'}
                            shadowColor={onTimeRate >= 80 ? 'rgba(6,182,212,0.4)' : 'rgba(244,63,94,0.4)'}
                            inView={inView}
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

                {/* ── Priority Breakdown + Upcoming Deadlines ──────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Priority Breakdown */}
                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-md">
                                <Flag size={16} className="text-white" />
                            </div>
                            Priority Breakdown
                        </h3>
                        {priorityData.length === 0 ? (
                            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">No priority data available.</p>
                        ) : (
                            <div className="space-y-3 pt-1">
                                {priorityData.map(({ name, value }) => {
                                    const pct = totalTasks > 0 ? Math.round((value / totalTasks) * 100) : 0;
                                    const color = PRIORITY_COLORS[name] || '#6b7280';
                                    return (
                                        <div key={name}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{name}</span>
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{value} task{value > 1 ? 's' : ''} · {pct}%</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700/40 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Task Deadlines */}
                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">
                                <AlertTriangle size={18} />
                            </div>
                            Upcoming Deadlines
                            <span className="ml-auto text-xs font-medium text-gray-400 dark:text-gray-500">Next 30 days</span>
                        </h3>
                        {upcomingTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <CheckCircle size={28} className="text-emerald-400 mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No task deadlines in the next 30 days.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {upcomingTasks.map((task: any) => {
                                    const due = new Date(task.plannedEndDate);
                                    const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                    const urgent = daysLeft <= 7;
                                    return (
                                        <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${urgent ? 'bg-red-50/60 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30' : 'bg-gray-50/60 dark:bg-gray-800/30 border-gray-100 dark:border-white/5'}`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${urgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                                                <Calendar size={13} className={urgent ? 'text-red-500' : 'text-amber-500'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{task.name}</p>
                                                {task.priority && (
                                                    <p className="text-xs font-medium" style={{ color: PRIORITY_COLORS[task.priority] || '#6b7280' }}>{task.priority}</p>
                                                )}
                                            </div>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${urgent ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
                                                {daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 day' : `${daysLeft} days`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Task Timeline Calendar ────────────────────────────── */}
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                        <Calendar size={120} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                            <Calendar size={18} />
                        </div>
                        Task Timeline Calendar
                    </h3>
                    {tasks.filter(t => t.plannedEndDate).length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-8">No task dates scheduled yet.</p>
                    ) : (
                        <_TaskCalendar tasks={tasks} />
                    )}
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
                {todoTasks.length > 0 && <TaskGroup title="TO DO" tasks={todoTasks} />}
                {inProgressTasks.length > 0 && <TaskGroup title="IN PROGRESS" tasks={inProgressTasks} />}
                <TaskGroup title="COMPLETE" tasks={completedTasks} showTotals={true} totalsData={totals} />
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

export const GanttChartView: FC<{ tasks: any[]; products?: CrmProduct[]; onTaskUpdate?: (taskId: number, newStart: string, newEnd: string) => void }> = ({ tasks, products }) => {
    const CRN_LEFT_W = 240;
    const CRN_ROW_H = 44;
    const CRN_ROW_H_EXP = 112;
    const CRN_GROUP_ROW_H = 36;

    const STATUS_CFG: Record<string, { bar: string; bg: string; text: string; label: string; dot: string }> = {
        'TO DO':       { bar: 'bg-slate-400',    bg: 'bg-slate-50 dark:bg-slate-900/30',    text: 'text-slate-600 dark:text-slate-300',    label: 'To Do',      dot: 'bg-slate-400' },
        'IN PROGRESS': { bar: 'bg-blue-500',     bg: 'bg-blue-50 dark:bg-blue-900/30',      text: 'text-blue-700 dark:text-blue-300',      label: 'In Progress', dot: 'bg-blue-500' },
        'COMPLETE':    { bar: 'bg-emerald-500',  bg: 'bg-emerald-50 dark:bg-emerald-900/30',text: 'text-emerald-700 dark:text-emerald-300',label: 'Complete',    dot: 'bg-emerald-500' },
    };
    const PRI_SYM: Record<string, string> = { Low: '↓', Medium: '→', High: '↑', Urgent: '⚡' };

    const [dayWidth, setDayWidth] = useState(40);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const leftRef = useRef<HTMLDivElement>(null);

    const parseDate = (s: string) => new Date(s);
    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

    // ── Timeline bounds ──────────────────────────────────────────────────────
    const { timelineStart, totalDays } = useMemo(() => {
        const valid = tasks.filter(t => t.plannedStartDate && t.plannedEndDate);
        if (!valid.length) {
            const s = new Date(today); s.setDate(s.getDate() - 7);
            return { timelineStart: s, totalDays: 45 };
        }
        const starts = valid.map(t => parseDate(t.plannedStartDate).getTime());
        const ends   = valid.map(t => parseDate(t.plannedEndDate).getTime());
        const min = new Date(Math.min(...starts));
        const max = new Date(Math.max(...ends));
        min.setDate(min.getDate() - 8);
        max.setDate(max.getDate() + 16);
        return { timelineStart: min, totalDays: Math.ceil((max.getTime() - min.getTime()) / 86400000) + 1 };
    }, [tasks, today]);

    const days = useMemo(() => {
        const arr: Date[] = [];
        const cur = new Date(timelineStart);
        for (let i = 0; i < totalDays; i++) { arr.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
        return arr;
    }, [timelineStart, totalDays]);

    // ── Header groups ────────────────────────────────────────────────────────
    const monthGroups = useMemo(() => {
        const g: { label: string; span: number }[] = [];
        let cur = '', span = 0;
        days.forEach(d => {
            const lbl = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (lbl !== cur) { if (cur) g.push({ label: cur, span }); cur = lbl; span = 1; } else span++;
        });
        if (cur) g.push({ label: cur, span });
        return g;
    }, [days]);

    const weekGroups = useMemo(() => {
        const g: { label: string; span: number; alt: boolean }[] = [];
        let curW = -1, span = 0, alt = false;
        days.forEach(d => {
            const w = Math.ceil((Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
            if (w !== curW) { if (curW >= 0) { g.push({ label: `W${curW}`, span, alt }); alt = !alt; } curW = w; span = 1; } else span++;
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

    useEffect(() => { setTimeout(scrollToToday, 120); }, [dayWidth]);

    // ── Sync vertical scroll ─────────────────────────────────────────────────
    const syncScroll = useCallback((src: 'l' | 'r') => {
        if (src === 'l' && leftRef.current && timelineRef.current) timelineRef.current.scrollTop = leftRef.current.scrollTop;
        if (src === 'r' && timelineRef.current && leftRef.current) leftRef.current.scrollTop = timelineRef.current.scrollTop;
    }, []);

    // ── Bar geometry ─────────────────────────────────────────────────────────
    const getBar = (task: any) => {
        if (!task.plannedStartDate || !task.plannedEndDate) return null;
        const s = Math.floor((parseDate(task.plannedStartDate).getTime() - timelineStart.getTime()) / 86400000);
        const e = Math.floor((parseDate(task.plannedEndDate).getTime() - timelineStart.getTime()) / 86400000);
        return { left: s * dayWidth, width: Math.max((e - s + 1) * dayWidth - 3, dayWidth - 3) };
    };

    const isOverdue = (task: any) =>
        task.status !== 'COMPLETE' && task.plannedEndDate && parseDate(task.plannedEndDate) < today;

    const rowList = useMemo(() => {
        if (!products?.length) return tasks.map(t => ({ type: 'task' as const, task: t }));
        const rows: Array<{ type: 'group'; key: string; label: string; count: number } | { type: 'task'; task: any }> = [];
        products.forEach(p => {
            const pt = tasks.filter(t => t.productId === p.id);
            if (pt.length) {
                rows.push({ type: 'group', key: p.id, label: p.name, count: pt.length });
                pt.forEach(t => rows.push({ type: 'task', task: t }));
            }
        });
        const unassigned = tasks.filter(t => !products.find(p => p.id === t.productId));
        if (unassigned.length) {
            rows.push({ type: 'group', key: 'unassigned', label: 'Unassigned', count: unassigned.length });
            unassigned.forEach(t => rows.push({ type: 'task', task: t }));
        }
        return rows;
    }, [tasks, products]);

    const getRowH = (row: any) => row.type === 'group' ? CRN_GROUP_ROW_H : (expandedRows.has(row.task.id) ? CRN_ROW_H_EXP : CRN_ROW_H);
    const totalRowH = rowList.reduce((a, r) => a + getRowH(r), 0);

    const completedCount = tasks.filter(t => t.status === 'COMPLETE').length;
    const inProgressCount = tasks.filter(t => t.status === 'IN PROGRESS').length;
    const overdueCount = tasks.filter(isOverdue).length;
    const overallPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    if (tasks.length === 0) {
        return (
            <div className="mt-6 flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-400">
                <GanttChartSquare size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No tasks to display on timeline</p>
            </div>
        );
    }

    return (
        <div className="mt-6 animate-fade-in flex flex-col bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden" style={{ height: 'calc(100vh - 300px)', minHeight: 380 }}>

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-white/10 flex-shrink-0 flex-wrap bg-gray-50/60 dark:bg-white/[0.02]">
                <GanttChartSquare size={15} className="text-[var(--color-primary)]" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Timeline</span>

                <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

                {/* Progress pill */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[var(--color-primary)] to-red-500 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">{overallPct}%</span>
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

                {/* Zoom */}
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Zoom</span>
                    {([['S', 24], ['M', 40], ['L', 56], ['XL', 76]] as [string, number][]).map(([lbl, w]) => (
                        <button key={w} onClick={() => setDayWidth(w)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${dayWidth === w ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            {lbl}
                        </button>
                    ))}
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

                <button onClick={scrollToToday}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-[var(--color-primary)] dark:text-red-400 text-[11px] font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    <CalendarDays size={12} /> Today
                </button>

                <button onClick={() => setExpandedRows(new Set(tasks.map((t: any) => t.id)))}
                    className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium">
                    Expand All
                </button>
                <button onClick={() => setExpandedRows(new Set())}
                    className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium">
                    Collapse
                </button>

                <div className="flex-1" />

                {/* Status legend */}
                <div className="hidden sm:flex items-center gap-3">
                    {Object.entries(STATUS_CFG).map(([, v]) => (
                        <div key={v.label} className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-sm ${v.bar}`} />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{v.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Main area ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* LEFT — task names */}
                <div ref={leftRef} onScroll={() => syncScroll('l')}
                    className="flex-shrink-0 border-r border-gray-200 dark:border-white/10 overflow-y-auto overflow-x-hidden"
                    style={{ width: CRN_LEFT_W }}>

                    {/* Header spacer matches 3 header rows */}
                    <div className="sticky top-0 z-20 bg-white dark:bg-gray-900">
                        <div className="h-7 border-b border-gray-100 dark:border-white/5 flex items-center px-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Month</span>
                        </div>
                        <div className="h-5 border-b border-gray-100 dark:border-white/5 flex items-center px-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Week</span>
                        </div>
                        <div className="h-8 border-b-2 border-gray-200 dark:border-white/10 flex items-center px-3">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Task</span>
                        </div>
                    </div>

                    {/* Task rows */}
                    {rowList.map((row: any) => {
                        if (row.type === 'group') {
                            return (
                                <div key={`g-${row.key}`}
                                    className="flex items-center gap-2 px-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-white/10 select-none"
                                    style={{ height: CRN_GROUP_ROW_H }}>
                                    <Package size={12} className="text-[var(--color-primary)] flex-shrink-0" />
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate flex-1">{row.label}</span>
                                    <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-1.5 py-0.5 font-semibold">{row.count}</span>
                                </div>
                            );
                        }
                        const task = row.task;
                        const expanded = expandedRows.has(task.id);
                        const cfg = STATUS_CFG[task.status] || STATUS_CFG['TO DO'];
                        const overdue = isOverdue(task);
                        const prog = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
                        return (
                            <div key={task.id}
                                className={`flex flex-col border-b border-gray-50 dark:border-white/[0.04] transition-all ${overdue ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}
                                style={{ height: expanded ? CRN_ROW_H_EXP : CRN_ROW_H }}>

                                {/* Main row */}
                                <div className="flex items-center gap-2 px-3 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors select-none flex-shrink-0"
                                    style={{ height: CRN_ROW_H }}
                                    onClick={() => setExpandedRows(prev => {
                                        const n = new Set(prev); n.has(task.id) ? n.delete(task.id) : n.add(task.id); return n;
                                    })}>
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate flex-1 leading-tight">{task.name}</span>
                                    {overdue && <AlertTriangle size={10} className="text-red-500 flex-shrink-0" />}
                                    {task.status === 'COMPLETE' && <CheckCircle size={10} className="text-emerald-500 flex-shrink-0" />}
                                    {expanded ? <ChevronUp size={10} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={10} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                                </div>

                                {/* Expanded detail */}
                                {expanded && (
                                    <div className="px-3 pb-2.5 space-y-1.5">
                                        {task.responsible && (
                                            <div className="flex items-center gap-1.5">
                                                <User size={9} className="text-gray-400 flex-shrink-0" />
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{task.responsible}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays size={9} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {task.plannedStartDate?.slice(5).replace('-', '/') ?? '?'} → {task.plannedEndDate?.slice(5).replace('-', '/') ?? '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-0.5">
                                                <span className="text-[9px] text-gray-400 font-medium">Progress</span>
                                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300">{prog}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${prog >= 100 ? 'bg-emerald-500' : prog > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${prog}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${cfg.bg} ${cfg.text}`}>
                                                {cfg.label}
                                            </span>
                                            {task.priority && (
                                                <span className="text-[9px] text-gray-400 font-semibold">{PRI_SYM[task.priority]} {task.priority}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* RIGHT — timeline */}
                <div ref={timelineRef} onScroll={() => syncScroll('r')} className="flex-1 overflow-auto">
                    <div style={{ width: Math.max(totalDays * dayWidth, 1), position: 'relative' }}>

                        {/* Sticky header */}
                        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900">
                            {/* Month row */}
                            <div className="flex h-7">
                                {monthGroups.map((m, i) => (
                                    <div key={i} className="flex-shrink-0 border-r border-b border-gray-100 dark:border-white/5 flex items-center px-3 overflow-hidden bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-900"
                                        style={{ width: m.span * dayWidth }}>
                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide truncate">{m.label}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Week row */}
                            <div className="flex h-5">
                                {weekGroups.map((w, i) => (
                                    <div key={i} className={`flex-shrink-0 border-r border-b border-gray-100 dark:border-white/5 flex items-center justify-center overflow-hidden ${w.alt ? 'bg-gray-50/60 dark:bg-white/[0.01]' : ''}`}
                                        style={{ width: w.span * dayWidth }}>
                                        {dayWidth >= 28 && <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold">{w.label}</span>}
                                    </div>
                                ))}
                            </div>
                            {/* Day row */}
                            <div className="flex h-8 border-b-2 border-gray-200 dark:border-white/10">
                                {days.map((d, i) => {
                                    const isToday = d.getTime() === today.getTime();
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    return (
                                        <div key={i} style={{ width: dayWidth }}
                                            className={`flex-shrink-0 border-r border-gray-100 dark:border-white/5 flex flex-col items-center justify-center overflow-hidden
                                                ${isToday ? 'bg-red-50 dark:bg-red-900/20' : isWeekend ? 'bg-gray-50/70 dark:bg-white/[0.01]' : ''}`}>
                                            {dayWidth >= 28 && (
                                                <span className={`text-[9px] font-bold leading-none ${isToday ? 'text-[var(--color-primary)]' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {d.getDate()}
                                                </span>
                                            )}
                                            {dayWidth >= 40 && (
                                                <span className={`text-[8px] leading-none mt-0.5 ${isToday ? 'text-red-400' : 'text-gray-400 dark:text-gray-600'}`}>
                                                    {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Bars area */}
                        <div className="relative" style={{ height: totalRowH }}>
                            {/* Weekend shading */}
                            {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) && (
                                <div key={i} className="absolute top-0 bottom-0 bg-gray-100/50 dark:bg-white/[0.012] pointer-events-none"
                                    style={{ left: i * dayWidth, width: dayWidth }} />
                            ))}

                            {/* Today line */}
                            {todayOffset >= 0 && (
                                <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: todayOffset }}>
                                    <div className="absolute top-0 bottom-0 w-px bg-[var(--color-primary)]/50" />
                                    <div className="absolute -top-0.5 w-2 h-2 rounded-full bg-[var(--color-primary)] -translate-x-[3.5px]" />
                                </div>
                            )}

                            {/* Task rows */}
                            {(() => {
                                let y = 0;
                                return rowList.map((row: any) => {
                                    const rowH = getRowH(row);
                                    const top = y; y += rowH;
                                    if (row.type === 'group') {
                                        return (
                                            <div key={`g-${row.key}`}
                                                className="absolute left-0 right-0 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-white/10"
                                                style={{ top, height: rowH }} />
                                        );
                                    }
                                    const task = row.task;
                                    const bar = getBar(task);
                                    const cfg = STATUS_CFG[task.status] || STATUS_CFG['TO DO'];
                                    const overdue = isOverdue(task);
                                    const prog = task.status === 'COMPLETE' ? 100 : (task.progress || 0);
                                    const isHovered = hoveredId === task.id;

                                    return (
                                        <div key={task.id}
                                            className={`absolute left-0 right-0 border-b border-gray-50 dark:border-white/[0.03] ${overdue ? 'bg-red-50/20 dark:bg-red-900/5' : ''}`}
                                            style={{ top, height: rowH }}
                                            onMouseEnter={() => setHoveredId(task.id)}
                                            onMouseLeave={() => setHoveredId(null)}>

                                            {bar && (
                                                <div className="absolute z-10 group"
                                                    style={{ left: bar.left, width: bar.width, top: 10, height: 24 }}>

                                                    {/* Bar base */}
                                                    <div className={`absolute inset-0 rounded-lg ${cfg.bar} opacity-90 shadow-sm`} />

                                                    {/* Progress shimmer */}
                                                    {prog > 0 && prog < 100 && (
                                                        <div className="absolute inset-y-0 left-0 rounded-l-lg bg-white/20 pointer-events-none"
                                                            style={{ width: `${prog}%` }} />
                                                    )}

                                                    {/* Overdue stripe */}
                                                    {overdue && (
                                                        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden opacity-25"
                                                            style={{ backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,0.7) 4px,rgba(255,255,255,0.7) 8px)' }} />
                                                    )}

                                                    {/* Complete checkmark overlay */}
                                                    {task.status === 'COMPLETE' && (
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <CheckCircle size={12} className="text-white/70" />
                                                        </div>
                                                    )}

                                                    {/* Label */}
                                                    {bar.width > 52 && (
                                                        <span className="relative z-10 text-[10px] font-semibold text-white truncate px-3 pointer-events-none leading-6 block select-none">
                                                            {task.priority ? PRI_SYM[task.priority] + ' ' : ''}{task.name}
                                                        </span>
                                                    )}

                                                    {/* Tooltip */}
                                                    {isHovered && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50 w-56">
                                                            <div className="bg-gray-950 dark:bg-gray-800 text-white rounded-xl shadow-2xl p-3 text-[11px] border border-white/10">
                                                                <p className="font-bold text-sm mb-1.5 leading-tight">{task.name}</p>
                                                                <div className="space-y-1 text-gray-300">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                                                                        <span className={`font-semibold text-[10px] ${cfg.text.replace('text-', 'text-').split(' ')[0]}`}>{cfg.label}</span>
                                                                    </div>
                                                                    {task.responsible && (
                                                                        <p className="flex items-center gap-1"><span className="text-gray-500">Who:</span> {task.responsible}</p>
                                                                    )}
                                                                    <p><span className="text-gray-500">Start:</span> {task.plannedStartDate || '—'}</p>
                                                                    <p><span className="text-gray-500">Due:</span> {task.plannedEndDate || '—'}</p>
                                                                    {prog > 0 && (
                                                                        <div className="mt-1.5">
                                                                            <div className="flex justify-between text-[9px] mb-0.5">
                                                                                <span className="text-gray-500">Progress</span>
                                                                                <span className="font-bold text-blue-400">{prog}%</span>
                                                                            </div>
                                                                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                                                                <div className={`h-full rounded-full ${prog >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${prog}%` }} />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {overdue && <p className="text-red-400 font-semibold mt-1 flex items-center gap-1"><AlertTriangle size={9} /> Overdue</p>}
                                                                </div>
                                                            </div>
                                                            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-950 dark:border-t-gray-800 mx-auto" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Actual-vs-planned underline for complete tasks */}
                                            {task.status === 'COMPLETE' && task.actualStartDate && task.actualEndDate && (() => {
                                                const s = Math.floor((parseDate(task.actualStartDate).getTime() - timelineStart.getTime()) / 86400000);
                                                const e = Math.floor((parseDate(task.actualEndDate).getTime() - timelineStart.getTime()) / 86400000);
                                                return (
                                                    <div className="absolute rounded-sm bg-emerald-400/30 border-t border-emerald-500/40 pointer-events-none"
                                                        style={{ left: s * dayWidth, width: Math.max((e - s + 1) * dayWidth - 3, dayWidth - 3), bottom: 4, height: 3 }} />
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

            {/* ── Footer ── */}
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/10 px-4 py-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap bg-gray-50/50 dark:bg-white/[0.015]">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{tasks.length} tasks</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{completedCount} complete</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{inProgressCount} in progress</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">{tasks.length - completedCount - inProgressCount} to do</span>
                {overdueCount > 0 && (
                    <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                            <AlertTriangle size={10} /> {overdueCount} overdue
                        </span>
                    </>
                )}
                <div className="flex-1" />
                <span className="text-gray-400 italic text-[10px]">Click a row to expand details</span>
            </div>
        </div>
    );
}

export const TNAView: FC<{
        tasks: any[];
        products?: CrmProduct[];
        onSaveTask?: (updatedTask: CrmTask) => Promise<void>;
        onSaveBulkTasks?: (tasks: CrmTask[]) => Promise<void>;
        onBuyerConfirm?: (task: CrmTask, confirmed: boolean, reason?: string) => Promise<void>;
    }> = ({ tasks, products, onSaveTask, onSaveBulkTasks, onBuyerConfirm }) => {
        const parseDate = (str: string | null) => str ? new Date(str) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [editingTask, setEditingTask] = useState<CrmTask | null>(null);
        const [isSaving, setIsSaving] = useState(false);
        const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());
        const [disputingTaskId, setDisputingTaskId] = useState<number | null>(null);
        const [disputeReason, setDisputeReason] = useState('');
        const [confirmingId, setConfirmingId] = useState<number | null>(null);

        // Tasks awaiting buyer confirmation
        const pendingConfirmTasks = useMemo(() => tasks.filter((t: CrmTask) =>
            t.requiresBuyerConfirmation && t.status === 'COMPLETE' && !t.buyerConfirmedAt && !t.buyerDisputed
        ), [tasks]);

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
                    <td className="px-3 py-2 min-w-[80px]">
                        <input type="number" min="0" value={task.quantity ?? ''} onChange={e => updateEditingTask(task.id, 'quantity', e.target.value ? parseInt(e.target.value) : undefined)} className={inputCls} placeholder="Qty" />
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
                    <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">{task.name}</span>
                            {task.requiresDocument && (
                                <span title={task.documentUrl ? `Document: ${task.documentFileName || 'uploaded'}` : 'Document required'}>
                                    {task.documentUrl
                                        ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                                        : <Paperclip size={13} className="text-orange-400 flex-shrink-0" />}
                                </span>
                            )}
                            {task.requiresBuyerConfirmation && task.status === 'COMPLETE' && (
                                <span title={task.buyerConfirmedAt ? 'Buyer confirmed' : task.buyerDisputed ? 'Buyer disputed' : 'Awaiting buyer confirmation'}>
                                    {task.buyerConfirmedAt
                                        ? <ThumbsUp size={13} className="text-green-500 flex-shrink-0" />
                                        : task.buyerDisputed
                                        ? <ThumbsDown size={13} className="text-red-500 flex-shrink-0" />
                                        : <AlertCircle size={13} className="text-yellow-400 flex-shrink-0 animate-pulse" />}
                                </span>
                            )}
                        </div>
                    </td>
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
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 font-medium">
                        {task.quantity != null ? task.quantity.toLocaleString() : '—'}
                    </td>
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
                {/* ── Buyer Confirmation Panel ──────────────────── */}
                {onBuyerConfirm && pendingConfirmTasks.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
                                {pendingConfirmTasks.length} Milestone{pendingConfirmTasks.length > 1 ? 's' : ''} Awaiting Your Confirmation
                            </span>
                        </div>
                        {pendingConfirmTasks.map((task: CrmTask) => (
                            <div key={task.id} className="bg-white dark:bg-gray-900/60 rounded-lg p-3 border border-yellow-100 dark:border-yellow-800/50">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{task.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Responsible: {task.responsible} · Due: {task.plannedEndDate}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            disabled={confirmingId === task.id}
                                            onClick={async () => {
                                                setConfirmingId(task.id);
                                                try { await onBuyerConfirm(task, true); } finally { setConfirmingId(null); }
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                                        >
                                            <ThumbsUp size={12} /> Confirm
                                        </button>
                                        <button
                                            onClick={() => setDisputingTaskId(disputingTaskId === task.id ? null : task.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                        >
                                            <ThumbsDown size={12} /> Dispute
                                        </button>
                                    </div>
                                </div>
                                {disputingTaskId === task.id && (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={disputeReason}
                                            onChange={e => setDisputeReason(e.target.value)}
                                            placeholder="Reason for dispute..."
                                            className="flex-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-400"
                                        />
                                        <button
                                            disabled={!disputeReason.trim() || confirmingId === task.id}
                                            onClick={async () => {
                                                setConfirmingId(task.id);
                                                try {
                                                    await onBuyerConfirm(task, false, disputeReason);
                                                    setDisputingTaskId(null);
                                                    setDisputeReason('');
                                                } finally { setConfirmingId(null); }
                                            }}
                                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                                        >
                                            Submit
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

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
                        ? [...(isMultiProduct ? ['Item'] : []), 'Task', 'Priority', 'Responsible', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Progress', 'Status', 'QTY', 'Delay', '']
                        : [...(isMultiProduct ? ['Item'] : []), 'Task', 'Priority', 'Responsible', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Progress', 'Status', 'QTY', 'Delay', ...(onSaveTask && !isEditMode ? [''] : [])];

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
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Quantity (units)</label>
                                    <input
                                        type="number" min="0"
                                        value={editingTask.quantity ?? ''}
                                        onChange={e => setEditingTask({ ...editingTask, quantity: e.target.value ? parseInt(e.target.value) : undefined })}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 500"
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
                {tasks.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg shadow-md">
                                <GanttChartSquare size={16} className="text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Production Timeline</h3>
                        </div>
                        <GanttChartView tasks={tasks} products={order.products?.length ? order.products : undefined} />
                    </div>
                )}
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
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const summaryContentRef = useRef<HTMLDivElement>(null);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [inlineSummary, setInlineSummary] = useState('');
    const [inlineSummaryLoading, setInlineSummaryLoading] = useState(false);
    const [inlineSummaryCollapsed, setInlineSummaryCollapsed] = useState(false);
    const lastSummarizedOrderRef = useRef<string | null>(null);

    const activeOrder = activeOrderKey && crmData[activeOrderKey] ? { ...crmData[activeOrderKey], id: activeOrderKey } : null;

    // Auto-generate inline AI summary when active order changes
    useEffect(() => {
        if (!activeOrder || !activeOrderKey || activeOrderKey === lastSummarizedOrderRef.current) return;
        lastSummarizedOrderRef.current = activeOrderKey;
        setInlineSummary('');
        setInlineSummaryLoading(true);
        setInlineSummaryCollapsed(false);
        const tasks = activeOrder.tasks || [];
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgress = tasks.filter(t => t.status === 'IN PROGRESS').length;
        const overdue = tasks.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < new Date() && t.status !== 'COMPLETE').length;
        const nextTasks = tasks.filter(t => t.status === 'TO DO').slice(0, 3).map(t => t.name).join(', ');
        const inProgressNames = tasks.filter(t => t.status === 'IN PROGRESS').map(t => t.name).join(', ');
        const prompt = `You are an order tracking assistant. Give a brief 3-line status update for this garment order. Be direct and specific — no headers, no markdown, just plain sentences.

Order: ${activeOrder.product} (${activeOrderKey})
Progress: ${completed}/${total} tasks complete, ${inProgress} in progress, ${overdue} overdue
Currently active: ${inProgressNames || 'None'}
Next up: ${nextTasks || 'None'}
Products: ${activeOrder.products?.map(p => p.name).join(', ') || activeOrder.product}

Reply with exactly 3 short sentences: 1) overall status, 2) what's happening now, 3) what to watch out for.`;
        callGeminiAPI(prompt).then(summary => {
            setInlineSummary(summary);
        }).catch(() => {
            setInlineSummary('Unable to generate summary at this time.');
        }).finally(() => {
            setInlineSummaryLoading(false);
        });
    }, [activeOrderKey, activeOrder]);

    const handleBuyerConfirm = async (task: CrmTask, confirmed: boolean, reason?: string) => {
        if (!activeOrderKey) return;
        const updatedTask: CrmTask = confirmed
            ? { ...task, buyerConfirmedAt: new Date().toISOString() }
            : { ...task, buyerDisputed: true, disputeReason: reason || '', status: 'IN PROGRESS' as const };
        const currentOrder = crmData[activeOrderKey];
        const updatedTasks = currentOrder.tasks.map(t => t.id === task.id ? updatedTask : t);
        await crmService.update(activeOrderKey, { tasks: updatedTasks });
        setCrmData(prev => ({
            ...prev,
            [activeOrderKey]: { ...prev[activeOrderKey], tasks: updatedTasks }
        }));
        showToast(confirmed ? 'Milestone confirmed' : 'Milestone disputed', confirmed ? 'success' : 'error');
    };

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
        { name: 'Gantt', icon: <GanttChartSquare size={16}/> },
        { name: 'Dashboard', icon: <PieChartIcon size={16}/> },
    ];
    const productViews = [
        { name: 'Overview', icon: <Info size={16}/> },
        { name: 'TNA', icon: <ClipboardCheck size={16}/> },
        { name: 'List', icon: <List size={16}/> },
        { name: 'Board', icon: <LayoutDashboard size={16}/> },
        { name: 'Gantt', icon: <GanttChartSquare size={16}/> },
    ];
    const currentViews = selectedProductId ? productViews : overviewViews;

    // Product selector chip click — stay on current view if compatible, otherwise reset
    const handleSelectProduct = (productId: string | null) => {
        setSelectedProductId(productId);
        if (productId === null) {
            // Switching to "All" — List/Board don't exist in overview mode
            if (['List', 'Board'].includes(activeView)) setActiveView('Overview');
        } else {
            // Switching to specific product — Dashboard is order-level only
            if (activeView === 'Dashboard') setActiveView('TNA');
        }
    };
    // Product card click in Overview — navigate directly to TNA for that product
    const handleSelectProductCard = (productId: string) => {
        setSelectedProductId(productId);
        setActiveView('TNA');
    };

    const generateOrderSummary = async () => {
        if (!activeOrder) return;
        setIsSummaryModalOpen(true);
        setIsSummaryLoading(true);
        setOrderSummary('');
        const tasks = activeOrder.tasks || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS');
        const todoTasks = tasks.filter(t => t.status === 'TO DO');
        const overdueTasks = tasks.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < new Date() && t.status !== 'COMPLETE');
        const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const taskDetails = tasks.map(t => `- ${t.name}: ${t.status} (Due: ${t.plannedEndDate || 'N/A'})`).join('\n');
        const prompt = `You are a garment production project manager writing a structured order report. Be concise, data-driven, and actionable.

Order: ${activeOrder.product} (ID: ${activeOrderKey})
Customer: ${activeOrder.customer}
Products: ${activeOrder.products?.map(p => p.name).join(', ') || activeOrder.product}
Progress: ${completedTasks}/${totalTasks} tasks complete (${progressPct}%)
In Progress: ${inProgressTasks.map(t => t.name).join(', ') || 'None'}
Overdue: ${overdueTasks.map(t => `${t.name} (due ${t.plannedEndDate})`).join(', ') || 'None'}
Next Up: ${todoTasks.slice(0, 3).map(t => t.name).join(', ') || 'None'}

All Tasks:
${taskDetails}

Reply using EXACTLY this format with these section headers (use ### for headers):

### Executive Summary
One paragraph: overall health, completion percentage, and timeline assessment.

### Current Progress
- List each in-progress task with its due date
- If nothing is in progress, say so

### Upcoming Milestones
- List next 3 upcoming tasks from TO DO with their planned dates
- If none, say "All tasks are either in progress or complete"

### Risk Assessment
- List specific risks (overdue tasks, tight timelines, bottlenecks)
- Rate overall risk as LOW / MEDIUM / HIGH
- If no risks, say "LOW — No immediate risks identified"

### Recommended Actions
- 2-3 specific actionable next steps the team should take

Keep it professional and brief. Use bullet points, not paragraphs (except Executive Summary).`;
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

    const downloadSummaryPdf = async () => {
        if (!orderSummary) return;
        setIsDownloadingPdf(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            let y = 0;

            const sectionColors: Record<string, [number, number, number]> = {
                'executive summary': [194, 12, 11],
                'current progress': [245, 158, 11],
                'upcoming milestones': [139, 92, 246],
                'risk assessment': [239, 68, 68],
                'recommended actions': [16, 185, 129],
            };

            const checkPage = (needed: number) => {
                if (y + needed > pageHeight - 20) {
                    pdf.addPage();
                    y = 15;
                }
            };

            // Header banner
            pdf.setFillColor(194, 12, 11);
            pdf.rect(0, 0, pageWidth, 32, 'F');
            pdf.setFillColor(160, 8, 8);
            pdf.rect(0, 32, pageWidth, 1.5, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('AI Project Report', margin, 14);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${activeOrder?.product || 'Order'} — ${activeOrder?.customer || ''}`, margin, 22);
            pdf.setFontSize(8);
            pdf.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - margin, 14, { align: 'right' });
            pdf.text(`Order ID: ${activeOrderKey || ''}`, pageWidth - margin, 22, { align: 'right' });

            y = 38;

            // Stats bar
            const tasks = activeOrder?.tasks || [];
            const total = tasks.length;
            const done = tasks.filter(t => t.status === 'COMPLETE').length;
            const active = tasks.filter(t => t.status === 'IN PROGRESS').length;
            const overdue = tasks.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < new Date() && t.status !== 'COMPLETE').length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            pdf.setFillColor(248, 248, 248);
            pdf.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');
            pdf.setDrawColor(230, 230, 230);
            pdf.roundedRect(margin, y, contentWidth, 18, 3, 3, 'S');

            const statW = contentWidth / 4;
            const stats = [
                { label: 'PROGRESS', value: `${pct}%`, color: [50, 50, 50] as [number, number, number] },
                { label: 'COMPLETED', value: `${done}`, color: [16, 185, 129] as [number, number, number] },
                { label: 'ACTIVE', value: `${active}`, color: [245, 158, 11] as [number, number, number] },
                { label: 'OVERDUE', value: `${overdue}`, color: overdue > 0 ? [239, 68, 68] as [number, number, number] : [160, 160, 160] as [number, number, number] },
            ];
            stats.forEach((s, i) => {
                const sx = margin + statW * i + statW / 2;
                pdf.setTextColor(...s.color);
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text(s.value, sx, y + 9, { align: 'center' });
                pdf.setTextColor(140, 140, 140);
                pdf.setFontSize(6);
                pdf.setFont('helvetica', 'normal');
                pdf.text(s.label, sx, y + 14, { align: 'center' });
                if (i < 3) {
                    pdf.setDrawColor(220, 220, 220);
                    pdf.line(margin + statW * (i + 1), y + 3, margin + statW * (i + 1), y + 15);
                }
            });

            // Progress bar
            y += 22;
            pdf.setFillColor(235, 235, 235);
            pdf.roundedRect(margin, y, contentWidth, 3, 1.5, 1.5, 'F');
            if (done > 0) { pdf.setFillColor(16, 185, 129); pdf.roundedRect(margin, y, contentWidth * (done / total), 3, 1.5, 1.5, 'F'); }
            if (active > 0) { pdf.setFillColor(245, 158, 11); pdf.rect(margin + contentWidth * (done / total), y, contentWidth * (active / total), 3, 'F'); }
            if (overdue > 0) { pdf.setFillColor(239, 68, 68); pdf.rect(margin + contentWidth * ((done + active) / total), y, contentWidth * (overdue / total), 3, 'F'); }

            y += 10;

            // Parse sections
            const pdfSections: { title: string; lines: string[] }[] = [];
            let cur: { title: string; lines: string[] } | null = null;
            orderSummary.split('\n').forEach(line => {
                if (line.startsWith('###')) {
                    if (cur) pdfSections.push(cur);
                    cur = { title: line.replace(/^###\s*/, '').trim(), lines: [] };
                } else if (cur) {
                    if (line.trim()) cur.lines.push(line.trim());
                } else if (line.trim()) {
                    if (!cur) cur = { title: '', lines: [line.trim()] };
                }
            });
            if (cur) pdfSections.push(cur);

            pdfSections.forEach(section => {
                checkPage(25);
                const key = section.title.toLowerCase();
                const color = sectionColors[key] || [100, 100, 100];

                if (section.title) {
                    pdf.setFillColor(...color);
                    pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(section.title.toUpperCase(), margin + 4, y + 5.5);
                    y += 12;
                }

                section.lines.forEach(line => {
                    checkPage(8);
                    const cleanLine = line.replace(/\*\*/g, '');
                    const isBullet = line.startsWith('- ');
                    const bulletText = isBullet ? cleanLine.substring(2) : cleanLine;

                    if (isBullet) {
                        pdf.setFillColor(...color);
                        pdf.circle(margin + 2, y - 0.5, 0.8, 'F');
                        pdf.setTextColor(60, 60, 60);
                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', 'normal');
                        const wrappedLines = pdf.splitTextToSize(bulletText, contentWidth - 8);
                        pdf.text(wrappedLines, margin + 6, y);
                        y += wrappedLines.length * 4.5 + 1.5;
                    } else {
                        const hasBold = /\*\*/.test(line);
                        pdf.setTextColor(50, 50, 50);
                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', hasBold ? 'bold' : 'normal');
                        const wrappedLines = pdf.splitTextToSize(cleanLine, contentWidth - 2);
                        pdf.text(wrappedLines, margin + 1, y);
                        y += wrappedLines.length * 4.5 + 1.5;
                    }
                });
                y += 4;
            });

            // Footer
            const pageCount = pdf.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setDrawColor(230, 230, 230);
                pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
                pdf.setFontSize(7);
                pdf.setTextColor(160, 160, 160);
                pdf.setFont('helvetica', 'normal');
                pdf.text('Powered by Gemini AI', margin, pageHeight - 7);
                pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
            }

            const fileName = `AI-Report-${(activeOrder?.product || 'Order').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(fileName);
        } catch (err) {
            console.error('PDF download failed:', err);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    // --- AI Summary Infographic Components ---
    const CircularProgressLocal: FC<{ percent: number; size?: number; strokeWidth?: number; color?: string }> = ({ percent, size = 64, strokeWidth = 5, color = '#c20c0b' }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;
        return (
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
        );
    };

    const StatusBarLocal: FC<{ completed: number; inProgress: number; todo: number; overdue: number; total: number }> = ({ completed, inProgress, todo, overdue, total }) => {
        if (total === 0) return null;
        const pct = (n: number) => Math.max((n / total) * 100, n > 0 ? 3 : 0);
        return (
            <div className="space-y-2">
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700/50">
                    {completed > 0 && <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700" style={{ width: `${pct(completed)}%` }} />}
                    {inProgress > 0 && <div className="bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700" style={{ width: `${pct(inProgress)}%` }} />}
                    {overdue > 0 && <div className="bg-gradient-to-r from-red-400 to-rose-500 transition-all duration-700" style={{ width: `${pct(overdue)}%` }} />}
                    {todo > 0 && <div className="bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-500 dark:to-gray-600 transition-all duration-700" style={{ width: `${pct(todo - overdue)}%` }} />}
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />{completed} Done</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-amber-400" />{inProgress} Active</span>
                    {overdue > 0 && <span className="flex items-center gap-1.5 text-[11px] text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" />{overdue} Overdue</span>}
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-400" />{todo} To Do</span>
                </div>
            </div>
        );
    };

    const RiskGaugeLocal: FC<{ level: string }> = ({ level }) => {
        const normalized = level.toUpperCase();
        const isLow = normalized.includes('LOW');
        const isMed = normalized.includes('MEDIUM') || normalized.includes('MED');
        const isHigh = normalized.includes('HIGH');
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <div className={`w-8 h-2.5 rounded-l-full ${isLow || isMed || isHigh ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    <div className={`w-8 h-2.5 ${isMed || isHigh ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    <div className={`w-8 h-2.5 rounded-r-full ${isHigh ? 'bg-gradient-to-r from-red-400 to-rose-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${isHigh ? 'text-red-500' : isMed ? 'text-amber-500' : 'text-emerald-500'}`}>{isHigh ? 'HIGH' : isMed ? 'MEDIUM' : 'LOW'}</span>
            </div>
        );
    };

    const renderInlineBold = (str: string) => {
        const parts = str.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
                ? <strong key={i} className="font-semibold text-gray-800 dark:text-white">{part.slice(2, -2)}</strong>
                : <span key={i}>{part}</span>
        );
    };

    const localSectionConfig: Record<string, { icon: React.ReactNode; gradient: string; bgGlow: string }> = {
        'executive summary': { icon: <ClipboardCheck size={15} className="text-white" />, gradient: 'from-[#c20c0b] via-red-600 to-pink-600', bgGlow: 'bg-red-500/5 dark:bg-red-500/10' },
        'current progress': { icon: <Clock size={15} className="text-white" />, gradient: 'from-amber-500 via-orange-500 to-red-400', bgGlow: 'bg-amber-500/5 dark:bg-amber-500/10' },
        'upcoming milestones': { icon: <Target size={15} className="text-white" />, gradient: 'from-violet-500 via-purple-500 to-pink-500', bgGlow: 'bg-violet-500/5 dark:bg-violet-500/10' },
        'risk assessment': { icon: <AlertTriangle size={15} className="text-white" />, gradient: 'from-rose-500 via-red-500 to-orange-500', bgGlow: 'bg-rose-500/5 dark:bg-rose-500/10' },
        'recommended actions': { icon: <CheckCircle size={15} className="text-white" />, gradient: 'from-emerald-500 via-teal-500 to-cyan-500', bgGlow: 'bg-emerald-500/5 dark:bg-emerald-500/10' },
    };

    const AIOrderSummaryModal: FC = () => {
        const tasks = activeOrder?.tasks || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS').length;
        const overdueTasks = tasks.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < new Date() && t.status !== 'COMPLETE').length;
        const todoTasks = tasks.filter(t => t.status === 'TO DO').length;
        const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Parse sections
        const parseSections = (text: string) => {
            const sections: { title: string; lines: string[] }[] = [];
            let current: { title: string; lines: string[] } | null = null;
            text.split('\n').forEach(line => {
                if (line.startsWith('###')) {
                    if (current) sections.push(current);
                    current = { title: line.replace(/^###\s*/, '').trim(), lines: [] };
                } else if (current) {
                    if (line.trim()) current.lines.push(line);
                } else if (line.trim()) {
                    if (!sections.length && !current) current = { title: '', lines: [line] };
                }
            });
            if (current) sections.push(current);
            return sections;
        };

        const sections = orderSummary ? parseSections(orderSummary) : [];

        return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in overflow-hidden" onClick={() => setIsSummaryModalOpen(false)}>
            <div className="bg-white dark:bg-gray-950 rounded-3xl shadow-2xl shadow-red-500/5 w-full max-w-3xl max-h-[90vh] flex flex-col relative border border-gray-200 dark:border-white/5 animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Gradient Header */}
                <div className="relative flex-shrink-0 bg-gradient-to-br from-[#c20c0b] via-rose-600 to-pink-700 px-6 py-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/4" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">AI Project Report</h2>
                                    <p className="text-xs text-white/60 mt-0.5">{activeOrder?.product} • {activeOrder?.customer}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSummaryModalOpen(false)} className="p-2 text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/10">
                                <X size={20} />
                            </button>
                        </div>
                        {!isSummaryLoading && (
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                                    <div className="relative mx-auto w-10 h-10 mb-1">
                                        <CircularProgressLocal percent={progressPct} size={40} strokeWidth={3} color="white" />
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{progressPct}%</span>
                                    </div>
                                    <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Progress</p>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                                    <p className="text-2xl font-bold text-white">{completedTasks}</p>
                                    <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Done</p>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                                    <p className="text-2xl font-bold text-white">{inProgressTasks}</p>
                                    <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Active</p>
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                                    <p className={`text-2xl font-bold ${overdueTasks > 0 ? 'text-yellow-300' : 'text-white/40'}`}>{overdueTasks}</p>
                                    <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Overdue</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Content */}
                <div ref={summaryContentRef} className="min-h-0 flex-1 overflow-y-auto p-5 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/80 dark:to-gray-950">
                    {isSummaryLoading ? (
                        <div className="flex items-center justify-center flex-col py-20">
                            <div className="relative">
                                <div className="animate-spin rounded-full h-16 w-16 border-[3px] border-gray-200 dark:border-gray-700" />
                                <div className="animate-spin rounded-full h-16 w-16 border-[3px] border-t-[#c20c0b] dark:border-t-red-400 absolute top-0" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Bot size={18} className="text-[#c20c0b] dark:text-red-400 animate-pulse" />
                                </div>
                            </div>
                            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 font-medium">Generating project report...</p>
                            <div className="mt-3 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-[#c20c0b] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-[#c20c0b] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-[#c20c0b] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sections.map((section, idx) => {
                                const key = section.title.toLowerCase();
                                const config = localSectionConfig[key] || { icon: <Info size={15} className="text-white" />, gradient: 'from-gray-500 to-gray-600', bgGlow: '' };
                                const riskLevel = key === 'risk assessment' ? section.lines.join(' ') : '';

                                return (
                                    <div key={idx} className={`rounded-2xl border border-gray-200/80 dark:border-gray-700/30 overflow-hidden ${config.bgGlow} backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300`}>
                                        {section.title && (
                                            <div className={`bg-gradient-to-r ${config.gradient} px-4 py-3 flex items-center gap-2.5 relative overflow-hidden`}>
                                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-40" />
                                                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">{config.icon}</div>
                                                <h3 className="text-sm font-bold text-white uppercase tracking-wider relative z-10">{section.title}</h3>
                                            </div>
                                        )}
                                        <div className="p-4 space-y-3">
                                            {/* Executive Summary infographic */}
                                            {key === 'executive summary' && (
                                                <div className="flex items-center gap-5 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700/30">
                                                    <div className="relative flex-shrink-0">
                                                        <CircularProgressLocal percent={progressPct} size={72} strokeWidth={6} />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-base font-bold text-gray-800 dark:text-white">{progressPct}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <StatusBarLocal completed={completedTasks} inProgress={inProgressTasks} todo={todoTasks} overdue={overdueTasks} total={totalTasks} />
                                                    </div>
                                                </div>
                                            )}
                                            {/* Current Progress infographic */}
                                            {key === 'current progress' && inProgressTasks > 0 && (
                                                <div className="grid grid-cols-3 gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700/30">
                                                    {tasks.filter(t => t.status === 'IN PROGRESS').slice(0, 3).map((t, ti) => {
                                                        const due = t.plannedEndDate ? new Date(t.plannedEndDate) : null;
                                                        const daysLeft = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null;
                                                        return (
                                                            <div key={ti} className="bg-white dark:bg-gray-800/60 rounded-xl p-2.5 border border-amber-200/50 dark:border-amber-500/20 text-center">
                                                                <div className={`text-lg font-bold ${daysLeft !== null && daysLeft < 0 ? 'text-red-500' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-500' : 'text-gray-700 dark:text-gray-200'}`}>
                                                                    {daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d`) : '—'}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{t.name}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {/* Milestone Timeline */}
                                            {key === 'upcoming milestones' && section.lines.some(l => l.startsWith('- ')) ? (
                                                <div className="relative pl-4">
                                                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-violet-400 to-purple-600 rounded-full" />
                                                    {section.lines.filter(l => l.startsWith('- ')).map((line, i) => (
                                                        <div key={i} className="relative flex items-start gap-3 py-2">
                                                            <div className="absolute left-[-13px] top-3 w-3 h-3 rounded-full bg-white dark:bg-gray-800 border-2 border-violet-500 shadow-sm shadow-violet-500/30 z-10" />
                                                            <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{renderInlineBold(line.replace(/^-\s*/, ''))}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : key === 'upcoming milestones' ? (
                                                section.lines.map((line, i) => <p key={i} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{renderInlineBold(line.replace(/^-\s*/, ''))}</p>)
                                            ) : null}
                                            {/* Risk Gauge */}
                                            {key === 'risk assessment' && (
                                                <div className="pb-3 mb-3 border-b border-gray-100 dark:border-gray-700/30">
                                                    <RiskGaugeLocal level={riskLevel} />
                                                </div>
                                            )}
                                            {/* Action checklist */}
                                            {key === 'recommended actions' ? (
                                                <div className="space-y-2">
                                                    {section.lines.map((line, i) => (
                                                        <div key={i} className="flex items-start gap-3 p-2.5 bg-white dark:bg-gray-800/40 rounded-xl border border-emerald-100 dark:border-emerald-500/10">
                                                            <div className="mt-0.5 w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                                                                <CheckCircle size={12} className="text-white" />
                                                            </div>
                                                            <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{renderInlineBold(line.replace(/^-\s*/, ''))}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                            {/* Default bullets */}
                                            {key !== 'upcoming milestones' && key !== 'recommended actions' && (
                                                <div className="space-y-1.5">
                                                    {section.lines.map((line, i) => {
                                                        if (line.startsWith('- ')) {
                                                            return (
                                                                <div key={i} className="flex items-start gap-2.5 py-0.5">
                                                                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.gradient} flex-shrink-0`} />
                                                                    <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{renderInlineBold(line.substring(2))}</span>
                                                                </div>
                                                            );
                                                        }
                                                        return <p key={i} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{renderInlineBold(line)}</p>;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950">
                    <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Powered by Gemini AI
                    </p>
                    <div className="flex items-center gap-2">
                        {!isSummaryLoading && orderSummary && (
                            <button
                                onClick={downloadSummaryPdf}
                                disabled={isDownloadingPdf}
                                className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                            >
                                <Download size={11} className={isDownloadingPdf ? 'animate-bounce' : ''} /> {isDownloadingPdf ? 'Exporting...' : 'Download PDF'}
                            </button>
                        )}
                        <button
                            onClick={generateOrderSummary}
                            disabled={isSummaryLoading}
                            className="text-xs font-semibold text-[#c20c0b] hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1.5 disabled:opacity-50 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <RefreshCw size={11} className={isSummaryLoading ? 'animate-spin' : ''} /> Regenerate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );};

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
                <div className="border-b border-gray-200 dark:border-white/10 pb-4 mb-2 space-y-3">
                    {/* Row 1: Order Tabs + AI Button */}
                    <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
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
                        <button
                            onClick={generateOrderSummary}
                            className="p-2.5 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-[var(--color-primary)] dark:text-red-400 rounded-xl hover:from-red-200 hover:to-pink-200 dark:hover:from-red-900/50 dark:hover:to-pink-900/50 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110"
                            title="Generate AI Summary"
                        >
                            <Bot size={18}/>
                        </button>
                    </div>
                    {/* Row 2: Product Selector Chips + View Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Product selector — only shown when the order has products */}
                        {activeOrder?.products && activeOrder.products.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
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
                                {activeOrder.products.map(p => (
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
                        ) : <div />}
                        {/* View tabs */}
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
                    </div>
                </div>
                {/* Inline AI Summary Card */}
                {activeOrder && (inlineSummaryLoading || inlineSummary) && (
                    <div className="mx-0 mt-3 mb-1">
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-50 via-pink-50 to-orange-50 dark:from-red-950/30 dark:via-pink-950/20 dark:to-orange-950/20 border border-red-100 dark:border-red-900/30 shadow-sm">
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#c20c0b] via-pink-500 to-orange-400"></div>
                            <div className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-br from-[#c20c0b] to-pink-600 rounded-lg shadow-sm">
                                            <Bot size={14} className="text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">AI Status Update</span>
                                        {inlineSummaryLoading && (
                                            <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                                                <span className="inline-block w-1.5 h-1.5 bg-[#c20c0b] rounded-full animate-pulse"></span>
                                                Analyzing...
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                lastSummarizedOrderRef.current = null;
                                                setInlineSummary('');
                                                setInlineSummaryLoading(true);
                                                const tasks = activeOrder.tasks || [];
                                                const total = tasks.length;
                                                const completed = tasks.filter(t => t.status === 'COMPLETE').length;
                                                const inProgress = tasks.filter(t => t.status === 'IN PROGRESS').length;
                                                const overdue = tasks.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < new Date() && t.status !== 'COMPLETE').length;
                                                const nextTasks = tasks.filter(t => t.status === 'TO DO').slice(0, 3).map(t => t.name).join(', ');
                                                const inProgressNames = tasks.filter(t => t.status === 'IN PROGRESS').map(t => t.name).join(', ');
                                                const prompt = `You are an order tracking assistant. Give a brief 3-line status update for this garment order. Be direct and specific — no headers, no markdown, just plain sentences.

Order: ${activeOrder.product} (${activeOrderKey})
Progress: ${completed}/${total} tasks complete, ${inProgress} in progress, ${overdue} overdue
Currently active: ${inProgressNames || 'None'}
Next up: ${nextTasks || 'None'}
Products: ${activeOrder.products?.map(p => p.name).join(', ') || activeOrder.product}

Reply with exactly 3 short sentences: 1) overall status, 2) what's happening now, 3) what to watch out for.`;
                                                callGeminiAPI(prompt).then(summary => {
                                                    setInlineSummary(summary);
                                                    lastSummarizedOrderRef.current = activeOrderKey;
                                                }).catch(() => {
                                                    setInlineSummary('Unable to generate summary at this time.');
                                                }).finally(() => {
                                                    setInlineSummaryLoading(false);
                                                });
                                            }}
                                            className="p-1 text-gray-400 hover:text-[#c20c0b] transition-colors rounded-md hover:bg-white/60 dark:hover:bg-white/10"
                                            title="Refresh summary"
                                        >
                                            <RefreshCw size={12} className={inlineSummaryLoading ? 'animate-spin' : ''} />
                                        </button>
                                        <button
                                            onClick={() => setInlineSummaryCollapsed(!inlineSummaryCollapsed)}
                                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-white/60 dark:hover:bg-white/10"
                                        >
                                            {inlineSummaryCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                                        </button>
                                    </div>
                                </div>
                                {!inlineSummaryCollapsed && (
                                    <div className="mt-1">
                                        {inlineSummaryLoading ? (
                                            <div className="space-y-1.5">
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-full animate-pulse"></div>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5 animate-pulse"></div>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/5 animate-pulse"></div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{inlineSummary}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {activeOrder && activeView === 'Overview' && <OrderDetailsView order={activeOrder} allFactories={allFactories} handleSetCurrentPage={handleSetCurrentPage} onSelectProduct={handleSelectProductCard} />}
                {activeOrder && activeView === 'TNA' && <TNAView tasks={filteredTasks} products={selectedProductId ? undefined : activeOrder.products} onBuyerConfirm={handleBuyerConfirm} />}
                {activeOrder && activeView === 'Dashboard' && <DashboardView tasks={activeOrder.tasks} orderKey={activeOrderKey || ''} orderDetails={activeOrder}/>}
                {activeOrder && activeView === 'List' && <ListView tasks={filteredTasks} />}
                {activeOrder && activeView === 'Board' && <BoardView tasks={filteredTasks} />}
                {activeOrder && activeView === 'Gantt' && <GanttChartView tasks={filteredTasks} products={selectedProductId ? undefined : (activeOrder.products?.length ? activeOrder.products : undefined)} />}
            </div>
            {isSummaryModalOpen && <AIOrderSummaryModal />}
        </MainLayout>
    );
};