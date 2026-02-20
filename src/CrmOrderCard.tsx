import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CrmOrder, Factory } from './types';
import { getOrderStatusColor, getOrderStatusGradient } from './utils';
import {
    Package, TrendingUp, CheckCircle, Calendar, Factory as FactoryIcon,
    Bot, BarChart3, Clock, ChevronRight
} from 'lucide-react';

interface CrmOrderCardProps {
    orderId: string;
    order: CrmOrder;
    factory?: Factory;
    index: number;
    onClick: () => void;
    onAISummary?: () => void;
}

// Animated number component
function AnimatedNumber({ value, inView }: { value: number; inView: boolean }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (!inView) { setDisplay(0); return; }
        if (value === 0) { setDisplay(0); return; }
        let start = 0;
        const duration = 600;
        const startTime = performance.now();
        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            start = Math.round(eased * value);
            setDisplay(start);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value, inView]);
    return <>{display}</>;
}

// Circular progress ring
function ProgressRing({ progress, inView }: { progress: number; inView: boolean }) {
    const radius = 32;
    const stroke = 5;
    const normalizedRadius = radius - stroke;
    const circumference = normalizedRadius * 2 * Math.PI;
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        if (inView) {
            const timer = setTimeout(() => {
                setOffset(circumference - (progress / 100) * circumference);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setOffset(circumference);
        }
    }, [progress, inView, circumference]);

    return (
        <svg width={radius * 2} height={radius * 2} className="transform -rotate-90 flex-shrink-0">
            {/* Background track */}
            <circle
                stroke="currentColor"
                className="text-gray-100 dark:text-gray-700/60"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            {/* Progress arc */}
            <circle
                stroke="url(#progressGradient)"
                fill="transparent"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={offset}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-1000 ease-out"
            />
            <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c20c0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
            </defs>
        </svg>
    );
}

// Status tint colors for glassmorphism
function getStatusTint(status: string) {
    switch (status) {
        case 'Pending': return 'bg-amber-50/40 dark:bg-amber-950/15';
        case 'In Production': return 'bg-blue-50/40 dark:bg-blue-950/15';
        case 'Quality Check': return 'bg-purple-50/40 dark:bg-purple-950/15';
        case 'Shipped': return 'bg-cyan-50/40 dark:bg-cyan-950/15';
        case 'Completed': return 'bg-emerald-50/40 dark:bg-emerald-950/15';
        default: return 'bg-white/60 dark:bg-gray-900/40';
    }
}

function getAccentColor(status: string) {
    switch (status) {
        case 'Pending': return 'from-amber-400 via-amber-500 to-yellow-500';
        case 'In Production': return 'from-blue-500 via-blue-600 to-cyan-500';
        case 'Quality Check': return 'from-purple-500 via-purple-600 to-indigo-500';
        case 'Shipped': return 'from-cyan-500 via-cyan-600 to-teal-500';
        case 'Completed': return 'from-emerald-500 via-emerald-600 to-green-500';
        default: return 'from-gray-400 via-gray-500 to-gray-500';
    }
}

export default function CrmOrderCard({ orderId, order, factory, index, onClick, onAISummary }: CrmOrderCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [inView, setInView] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // IntersectionObserver for scroll-in animation
    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
            { threshold: 0.2 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const stats = useMemo(() => {
        const total = order.tasks.length;
        const completed = order.tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgress = order.tasks.filter(t => t.status === 'IN PROGRESS').length;
        const toDo = order.tasks.filter(t => t.status === 'TO DO').length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, inProgress, toDo, progress };
    }, [order.tasks]);

    const latestDueDate = useMemo(() => {
        if (order.tasks.length === 0) return null;
        const dates = order.tasks.map(t => t.plannedEndDate).filter(Boolean)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        if (dates.length === 0) return null;
        return new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, [order.tasks]);

    // Top 3 tasks for hover preview
    const previewTasks = useMemo(() => {
        const inProgressTasks = order.tasks.filter(t => t.status === 'IN PROGRESS');
        const toDoTasks = order.tasks.filter(t => t.status === 'TO DO');
        const completedTasks = order.tasks.filter(t => t.status === 'COMPLETE');
        return [...inProgressTasks, ...toDoTasks, ...completedTasks].slice(0, 3);
    }, [order.tasks]);

    const status = order.status || 'In Production';
    const hasActiveTasks = stats.inProgress > 0;

    return (
        <div
            ref={cardRef}
            className="relative animate-card-enter"
            style={{ animationDelay: `${index * 100}ms` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Stacked depth layers */}
            <div className={`absolute inset-0 rounded-2xl bg-gray-200/50 dark:bg-gray-700/20 transform translate-x-1.5 translate-y-1.5 transition-transform duration-300 ${isHovered ? 'translate-x-2 translate-y-2' : ''}`} />
            <div className={`absolute inset-0 rounded-2xl bg-gray-100/60 dark:bg-gray-800/20 transform translate-x-0.5 translate-y-0.5 transition-transform duration-300 ${isHovered ? 'translate-x-1 translate-y-1' : ''}`} />

            {/* Main card */}
            <div
                onClick={onClick}
                className={`relative ${getStatusTint(status)} backdrop-blur-xl rounded-2xl shadow-md border border-gray-200/80 dark:border-white/10 transition-all duration-300 cursor-pointer group overflow-hidden ${isHovered ? 'shadow-2xl -translate-y-1' : ''}`}
            >
                {/* Left accent stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${getAccentColor(status)} rounded-l-2xl`} />

                {/* Status watermark icon */}
                <div className="absolute -right-4 -top-4 opacity-[0.04] dark:opacity-[0.06] pointer-events-none">
                    <Package size={120} strokeWidth={1} />
                </div>

                <div className="pl-5 pr-5 pt-5 pb-4">
                    {/* Header row: Info + Progress ring */}
                    <div className="flex items-start gap-4">
                        {/* Left side: order info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                                    {orderId.length > 20 ? `#${orderId.slice(-8)}` : orderId}
                                </p>
                                {/* Live pulse for active orders */}
                                {hasActiveTasks && (
                                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                    </span>
                                )}
                            </div>
                            <h3 className="text-[15px] font-bold text-gray-800 dark:text-white truncate group-hover:text-[#c20c0b] transition-colors leading-tight">
                                {order.product}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {order.customer}
                                </p>
                                {order.products && order.products.length > 1 && (
                                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded flex-shrink-0">
                                        {order.products.length} products
                                    </span>
                                )}
                            </div>
                            <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${getOrderStatusColor(status)}`}>
                                {status}
                            </span>
                        </div>

                        {/* Right side: Circular progress */}
                        <div className="relative flex-shrink-0">
                            <ProgressRing progress={stats.progress} inView={inView} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-800 dark:text-white">
                                    <AnimatedNumber value={stats.progress} inView={inView} />
                                    <span className="text-[9px] text-gray-400">%</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Task stat pills */}
                    <div className="flex items-center gap-2 mt-4">
                        <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                            <Package size={11} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                <AnimatedNumber value={stats.total} inView={inView} />
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">tasks</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-orange-50/80 dark:bg-orange-900/20 rounded-lg px-2.5 py-1.5">
                            <TrendingUp size={11} className="text-orange-500" />
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                                <AnimatedNumber value={stats.inProgress} inView={inView} />
                            </span>
                            <span className="text-[10px] text-orange-400 font-medium">active</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50/80 dark:bg-emerald-900/20 rounded-lg px-2.5 py-1.5">
                            <CheckCircle size={11} className="text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <AnimatedNumber value={stats.completed} inView={inView} />
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium">done</span>
                        </div>
                    </div>

                    {/* Hover preview: Mini task list */}
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${isHovered ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                        <div className="border-t border-gray-200/60 dark:border-white/5 pt-3 space-y-1.5">
                            {previewTasks.map((task, i) => (
                                <div key={task.id || i} className="flex items-center gap-2 text-xs">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        task.status === 'COMPLETE' ? 'bg-emerald-500' :
                                        task.status === 'IN PROGRESS' ? 'bg-orange-500' :
                                        'bg-gray-300 dark:bg-gray-600'
                                    }`} />
                                    <span className={`truncate ${
                                        task.status === 'COMPLETE'
                                            ? 'text-gray-400 dark:text-gray-500 line-through'
                                            : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {task.name}
                                    </span>
                                    <span className={`ml-auto text-[10px] font-medium flex-shrink-0 ${
                                        task.status === 'IN PROGRESS' ? 'text-orange-500' :
                                        task.status === 'COMPLETE' ? 'text-emerald-500' :
                                        'text-gray-400'
                                    }`}>
                                        {task.status === 'IN PROGRESS' ? 'In Progress' : task.status === 'COMPLETE' ? 'Done' : 'To Do'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer: Factory + Due Date */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/60 dark:border-white/5">
                        {factory ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 min-w-0">
                                <FactoryIcon size={11} className="flex-shrink-0" />
                                <span className="truncate">{factory.name}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                                <FactoryIcon size={11} />
                                <span>Unassigned</span>
                            </div>
                        )}
                        {latestDueDate && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                <Calendar size={11} />
                                <span>{latestDueDate}</span>
                            </div>
                        )}
                    </div>

                    {/* Quick action buttons on hover */}
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${isHovered ? 'max-h-14 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                        <div className="flex items-center gap-2">
                            {onAISummary && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAISummary(); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <Bot size={12} /> AI Summary
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onClick(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors"
                            >
                                <BarChart3 size={12} /> Dashboard
                            </button>
                            <div className="ml-auto">
                                <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-[#c20c0b] flex items-center justify-center text-gray-400 group-hover:text-white transition-all duration-300">
                                    <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
