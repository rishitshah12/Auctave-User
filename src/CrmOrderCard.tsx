import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CrmOrder, Factory } from './types';
import { getOrderStatusColor } from './utils';
import {
    Package, TrendingUp, CheckCircle, Calendar, AlertTriangle,
    ChevronRight, MapPin, Bot, BarChart3
} from 'lucide-react';

interface CrmOrderCardProps {
    orderId: string;
    order: CrmOrder;
    factory?: Factory;
    index: number;
    onClick: () => void;
    onAISummary?: () => void;
}

function AnimatedNumber({ value, inView }: { value: number; inView: boolean }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (!inView) { setDisplay(0); return; }
        if (value === 0) { setDisplay(0); return; }
        const duration = 600;
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

function ProgressRing({ progress, color, inView }: { progress: number; color: string; inView: boolean }) {
    const radius = 30;
    const stroke = 5;
    const norm = radius - stroke;
    const circ = norm * 2 * Math.PI;
    const [offset, setOffset] = useState(circ);

    useEffect(() => {
        if (!inView) { setOffset(circ); return; }
        const t = setTimeout(() => setOffset(circ - (progress / 100) * circ), 100);
        return () => clearTimeout(t);
    }, [progress, inView, circ]);

    return (
        <svg width={radius * 2} height={radius * 2} className="transform -rotate-90 flex-shrink-0">
            <circle stroke="currentColor" className="text-gray-100 dark:text-gray-700/60"
                fill="transparent" strokeWidth={stroke} r={norm} cx={radius} cy={radius} />
            <circle stroke={color} fill="transparent" strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
                r={norm} cx={radius} cy={radius} className="transition-all duration-1000 ease-out" />
        </svg>
    );
}

const STATUS_CONFIG: Record<string, { top: string; tint: string; ring: string; dot: string }> = {
    'Pending':        { top: 'from-amber-400 to-yellow-500',   tint: 'bg-amber-50/60 dark:bg-amber-950/15',   ring: '#f59e0b', dot: 'bg-amber-400' },
    'In Production':  { top: 'from-blue-500 to-cyan-500',      tint: 'bg-blue-50/60 dark:bg-blue-950/15',     ring: '#3b82f6', dot: 'bg-blue-500' },
    'Quality Check':  { top: 'from-purple-500 to-indigo-500',  tint: 'bg-purple-50/60 dark:bg-purple-950/15', ring: '#8b5cf6', dot: 'bg-purple-500' },
    'Shipped':        { top: 'from-cyan-500 to-teal-500',      tint: 'bg-cyan-50/60 dark:bg-cyan-950/15',     ring: '#06b6d4', dot: 'bg-cyan-500' },
    'Completed':      { top: 'from-emerald-500 to-green-500',  tint: 'bg-emerald-50/60 dark:bg-emerald-950/15', ring: '#10b981', dot: 'bg-emerald-500' },
};
const DEFAULT_CFG = { top: 'from-gray-400 to-gray-500', tint: 'bg-white/60 dark:bg-gray-900/40', ring: '#6b7280', dot: 'bg-gray-400' };

export default function CrmOrderCard({ orderId, order, factory, index, onClick, onAISummary }: CrmOrderCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [inView, setInView] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } }, { threshold: 0.2 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const stats = useMemo(() => {
        const total = order.tasks.length;
        const completed = order.tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgress = order.tasks.filter(t => t.status === 'IN PROGRESS').length;
        const overdue = order.tasks.filter(t => t.status !== 'COMPLETE' && t.plannedEndDate && new Date(t.plannedEndDate) < new Date()).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, inProgress, overdue, progress };
    }, [order.tasks]);

    const latestDueDate = useMemo(() => {
        const dates = order.tasks.map(t => t.plannedEndDate).filter(Boolean)
            .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
        if (!dates.length) return null;
        return new Date(dates[0]!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }, [order.tasks]);

    const previewTasks = useMemo(() => {
        const ip = order.tasks.filter(t => t.status === 'IN PROGRESS');
        const td = order.tasks.filter(t => t.status === 'TO DO');
        return [...ip, ...td].slice(0, 3);
    }, [order.tasks]);

    const status = order.status || 'In Production';
    const cfg = STATUS_CONFIG[status] || DEFAULT_CFG;
    const refNum = `ORD-${orderId.slice(0, 6).toUpperCase()}`;
    const hasActiveTasks = stats.inProgress > 0;

    return (
        <div
            ref={cardRef}
            className="relative animate-card-enter"
            style={{ animationDelay: `${index * 100}ms` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Depth shadow layers */}
            <div className={`absolute inset-0 rounded-2xl bg-gray-200/50 dark:bg-gray-700/20 transform translate-x-1.5 translate-y-1.5 transition-transform duration-300 ${isHovered ? 'translate-x-2 translate-y-2' : ''}`} />
            <div className={`absolute inset-0 rounded-2xl bg-gray-100/60 dark:bg-gray-800/20 transform translate-x-0.5 translate-y-0.5 transition-transform duration-300 ${isHovered ? 'translate-x-1 translate-y-1' : ''}`} />

            {/* Main card */}
            <div
                onClick={onClick}
                className={`relative ${cfg.tint} backdrop-blur-xl rounded-2xl shadow-md border border-gray-200/80 dark:border-white/10 transition-all duration-300 cursor-pointer group overflow-hidden ${isHovered ? 'shadow-2xl -translate-y-1' : ''}`}
            >
                {/* Thick status top bar */}
                <div className={`h-[7px] w-full bg-gradient-to-r ${cfg.top} flex-shrink-0`} />

                {/* Overdue banner */}
                {stats.overdue > 0 && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 dark:bg-red-900/20 border-b border-red-200/50 dark:border-red-800/30">
                        <AlertTriangle size={11} className="text-red-500 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{stats.overdue} task{stats.overdue > 1 ? 's' : ''} overdue</span>
                    </div>
                )}

                <div className="px-5 pt-4 pb-4">
                    {/* Row 1: Reference + active pulse */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-[11px] font-bold tracking-wider text-white bg-gray-700/70 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                            {refNum}
                        </span>
                        {hasActiveTasks && (
                            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                            </span>
                        )}
                        <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${getOrderStatusColor(status)}`}>
                            {status}
                        </span>
                    </div>

                    {/* Row 2: Product name + progress ring */}
                    <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-[#c20c0b] transition-colors leading-tight">
                                {order.product}
                            </h3>
                            {/* Factory */}
                            {factory ? (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <MapPin size={10} className="flex-shrink-0" />
                                    <span className="truncate font-medium">{factory.name}</span>
                                    <span className="text-gray-400 dark:text-gray-600">·</span>
                                    <span className="truncate">{factory.location}</span>
                                </p>
                            ) : (
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">No factory assigned</p>
                            )}
                            {/* Product pills (if multi-product) */}
                            {order.products && order.products.length > 1 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {order.products.slice(0, 3).map((p, i) => (
                                        <span key={p.id} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                            {p.name}
                                        </span>
                                    ))}
                                    {order.products.length > 3 && (
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
                                            +{order.products.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Circular progress */}
                        <div className="relative flex-shrink-0">
                            <ProgressRing progress={stats.progress} color={cfg.ring} inView={inView} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[13px] font-bold text-gray-800 dark:text-white">
                                    <AnimatedNumber value={stats.progress} inView={inView} />
                                    <span className="text-[9px] text-gray-400">%</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Task stat pills */}
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5 flex-1 justify-center">
                            <Package size={11} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                <AnimatedNumber value={stats.total} inView={inView} />
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">total</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-orange-50/80 dark:bg-orange-900/20 rounded-lg px-2.5 py-1.5 flex-1 justify-center">
                            <TrendingUp size={11} className="text-orange-500" />
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                                <AnimatedNumber value={stats.inProgress} inView={inView} />
                            </span>
                            <span className="text-[10px] text-orange-400 font-medium">active</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50/80 dark:bg-emerald-900/20 rounded-lg px-2.5 py-1.5 flex-1 justify-center">
                            <CheckCircle size={11} className="text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <AnimatedNumber value={stats.completed} inView={inView} />
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium">done</span>
                        </div>
                    </div>

                    {/* Hover task preview */}
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${isHovered && previewTasks.length > 0 ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                        <div className="border-t border-gray-200/60 dark:border-white/5 pt-3 space-y-1.5">
                            {previewTasks.map((task, i) => (
                                <div key={task.id || i} className="flex items-center gap-2 text-xs">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        task.status === 'COMPLETE' ? 'bg-emerald-500' :
                                        task.status === 'IN PROGRESS' ? 'bg-orange-500' :
                                        'bg-gray-300 dark:bg-gray-600'
                                    }`} />
                                    <span className={`truncate flex-1 ${task.status === 'COMPLETE' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {task.name}
                                    </span>
                                    <span className={`text-[10px] font-medium flex-shrink-0 ${
                                        task.status === 'IN PROGRESS' ? 'text-orange-500' :
                                        task.status === 'COMPLETE' ? 'text-emerald-500' :
                                        'text-gray-400'
                                    }`}>
                                        {task.status === 'IN PROGRESS' ? 'Active' : task.status === 'COMPLETE' ? 'Done' : 'To Do'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer: Due date + quick actions */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/60 dark:border-white/5">
                        {latestDueDate ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                <Calendar size={11} />
                                <span>Due {latestDueDate}</span>
                            </div>
                        ) : <div />}
                        <div className={`flex items-center gap-1.5 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                            {onAISummary && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAISummary(); }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <Bot size={11} /> AI
                                </button>
                            )}
                            <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-[#c20c0b] flex items-center justify-center text-gray-400 group-hover:text-white transition-all duration-300">
                                <ChevronRight size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
