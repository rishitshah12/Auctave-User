import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CrmOrder, Factory } from './types';
import { getOrderStatusColor } from './utils';
import {
    Package, TrendingUp, CheckCircle, Calendar, Link2,
    ChevronRight, MapPin, Bot, BarChart3, FileText
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
        const duration = 700;
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

function ProgressRing({ progress, color, inView, radius = 38 }: { progress: number; color: string; inView: boolean; radius?: number }) {
    const stroke = 5;
    const norm = radius - stroke;
    const circ = norm * 2 * Math.PI;
    const [offset, setOffset] = useState(circ);

    useEffect(() => {
        if (!inView) { setOffset(circ); return; }
        const t = setTimeout(() => setOffset(circ - (progress / 100) * circ), 120);
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

const STATUS_CONFIG: Record<string, { top: string; tint: string; ring: string; dot: string; glow: string }> = {
    'Pending':       { top: 'from-amber-400 to-yellow-500',  tint: 'bg-amber-50/70 dark:bg-amber-950/20',    ring: '#f59e0b', dot: 'bg-amber-400',   glow: 'rgba(245,158,11,0.12)' },
    'In Production': { top: 'from-blue-500 to-cyan-500',     tint: 'bg-blue-50/70 dark:bg-blue-950/20',      ring: '#3b82f6', dot: 'bg-blue-500',    glow: 'rgba(59,130,246,0.12)' },
    'Quality Check': { top: 'from-purple-500 to-indigo-500', tint: 'bg-purple-50/70 dark:bg-purple-950/20',  ring: '#8b5cf6', dot: 'bg-purple-500',  glow: 'rgba(139,92,246,0.12)' },
    'Shipped':       { top: 'from-cyan-500 to-teal-500',     tint: 'bg-cyan-50/70 dark:bg-cyan-950/20',      ring: '#06b6d4', dot: 'bg-cyan-500',    glow: 'rgba(6,182,212,0.12)' },
    'Completed':     { top: 'from-emerald-500 to-green-500', tint: 'bg-emerald-50/70 dark:bg-emerald-950/20',ring: '#10b981', dot: 'bg-emerald-500', glow: 'rgba(16,185,129,0.12)' },
};
const DEFAULT_CFG = { top: 'from-gray-400 to-gray-500', tint: 'bg-white/70 dark:bg-gray-900/40', ring: '#6b7280', dot: 'bg-gray-400', glow: 'rgba(107,114,128,0.10)' };

export default function CrmOrderCard({ orderId, order, factory, index, onClick, onAISummary }: CrmOrderCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [inView, setInView] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } }, { threshold: 0.15 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const stats = useMemo(() => {
        const total = order.tasks.length;
        const completed = order.tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgress = order.tasks.filter(t => t.status === 'IN PROGRESS').length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, inProgress, progress };
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

    const ordRef = useMemo(() => {
        const date = order.createdAt ? new Date(order.createdAt) : new Date();
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const p = (order.product || '').toLowerCase();
        let cat = 'GN';
        if (p.includes('tee') || p.includes('t-shirt') || p.includes('tshirt') || p.includes('shirt')) cat = 'TS';
        else if (p.includes('hoodie') || p.includes('hood') || p.includes('sweatshirt')) cat = 'HD';
        else if (p.includes('jacket') || p.includes('coat') || p.includes('blazer')) cat = 'JK';
        else if (p.includes('pant') || p.includes('trouser') || p.includes('jeans') || p.includes('denim')) cat = 'PT';
        else if (p.includes('polo')) cat = 'PL';
        else if (p.includes('dress') || p.includes('skirt')) cat = 'DR';
        else if (p.includes('shorts') || p.includes('short')) cat = 'SH';
        const hex = orderId.replace(/-/g, '');
        const serial = (parseInt(hex.slice(0, 8), 16) % 900) + 100;
        return `ORD-${yy}${mm}-${cat}${serial}`;
    }, [orderId, order.createdAt, order.product]);

    const rfqRef = order.source_quote_id ? `RFQ-${order.source_quote_id.slice(0, 6).toUpperCase()}` : null;
    const hasActiveTasks = stats.inProgress > 0;

    const factoryName = factory?.name || order.custom_factory_name || null;
    const factoryLocation = factory?.location || order.custom_factory_location || null;

    return (
        <div
            ref={cardRef}
            className="relative animate-card-enter"
            style={{ animationDelay: `${index * 80}ms` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Premium depth shadow layers */}
            <div className={`absolute inset-0 rounded-3xl bg-gray-300/40 dark:bg-gray-700/25 transform translate-x-2 translate-y-2 transition-transform duration-300 blur-sm ${isHovered ? 'translate-x-3 translate-y-3' : ''}`} />
            <div className={`absolute inset-0 rounded-3xl bg-gray-200/50 dark:bg-gray-800/25 transform translate-x-1 translate-y-1 transition-transform duration-300 ${isHovered ? 'translate-x-1.5 translate-y-1.5' : ''}`} />

            {/* Main card */}
            <div
                onClick={onClick}
                className={`relative ${cfg.tint} backdrop-blur-xl rounded-3xl border transition-all duration-300 cursor-pointer group overflow-hidden ${
                    isHovered
                        ? 'shadow-2xl -translate-y-1.5 border-gray-200 dark:border-white/15'
                        : 'shadow-lg border-gray-200/80 dark:border-white/8'
                }`}
                style={{
                    boxShadow: isHovered
                        ? `0 20px 60px -10px ${cfg.glow}, 0 8px 20px -5px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)`
                        : `0 4px 24px -4px ${cfg.glow}, 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)`,
                }}
            >
                {/* Thick status top bar with shimmer */}
                <div className={`h-2 w-full bg-gradient-to-r ${cfg.top} flex-shrink-0 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                </div>

                <div className="px-6 pt-5 pb-5">
                    {/* Row 1: ORD ref + RFQ ref + status badge */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {/* ORD badge — light, status-colored border */}
                        <span
                            className="font-mono text-[11px] font-black tracking-widest px-2.5 py-1 rounded-lg border bg-white dark:bg-gray-900/60 shadow-sm"
                            style={{ color: cfg.ring, borderColor: `${cfg.ring}55` }}
                        >
                            {ordRef}
                        </span>
                        {/* RFQ source badge — linked quote */}
                        {rfqRef && (
                            <span className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded-lg border border-gray-200/80 dark:border-gray-700/50">
                                <Link2 size={9} className="flex-shrink-0 text-gray-400" />
                                {rfqRef}
                            </span>
                        )}
                        {/* Active pulse */}
                        {hasActiveTasks && (
                            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                            </span>
                        )}
                        <span className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${getOrderStatusColor(status)}`}>
                            {status}
                        </span>
                    </div>

                    {/* Row 2: Product name + progress ring */}
                    <div className="flex items-start gap-5">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-[#c20c0b] transition-colors leading-tight mb-1">
                                {order.product}
                            </h3>
                            {/* Factory identity */}
                            {factoryName ? (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                                    <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-300 truncate">{factoryName}</span>
                                    {factoryLocation && (
                                        <>
                                            <span className="text-gray-300 dark:text-gray-600 text-[10px]">·</span>
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{factoryLocation}</span>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">No factory assigned</p>
                            )}
                            {/* Product pills (multi-product) */}
                            {order.products && order.products.length > 1 && (
                                <div className="flex flex-wrap gap-1 mt-2.5">
                                    {order.products.slice(0, 3).map((p) => (
                                        <span key={p.id} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 uppercase tracking-wide">
                                            {p.name}
                                        </span>
                                    ))}
                                    {order.products.length > 3 && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400">
                                            +{order.products.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Circular progress — larger */}
                        <div className="relative flex-shrink-0">
                            <ProgressRing progress={stats.progress} color={cfg.ring} inView={inView} radius={38} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[15px] font-black text-gray-800 dark:text-white leading-none">
                                    <AnimatedNumber value={stats.progress} inView={inView} />
                                    <span className="text-[9px] text-gray-400 font-semibold">%</span>
                                </span>
                                <span className="text-[8px] text-gray-400 font-medium mt-0.5 leading-none">done</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 mb-1">
                        <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800/60 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: inView ? `${stats.progress}%` : '0%',
                                    background: `linear-gradient(to right, ${cfg.ring}cc, ${cfg.ring})`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Task stat pills */}
                    <div className="flex items-center gap-2 mt-4">
                        <div className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-gray-800/60 rounded-xl px-3 py-2 flex-1 justify-center border border-gray-200/60 dark:border-white/5">
                            <Package size={12} className="text-gray-400" />
                            <span className="text-sm font-black text-gray-700 dark:text-gray-200">
                                <AnimatedNumber value={stats.total} inView={inView} />
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">tasks</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-orange-50/90 dark:bg-orange-900/25 rounded-xl px-3 py-2 flex-1 justify-center border border-orange-200/50 dark:border-orange-800/30">
                            <TrendingUp size={12} className="text-orange-500" />
                            <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                                <AnimatedNumber value={stats.inProgress} inView={inView} />
                            </span>
                            <span className="text-[10px] text-orange-400 font-semibold">active</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50/90 dark:bg-emerald-900/25 rounded-xl px-3 py-2 flex-1 justify-center border border-emerald-200/50 dark:border-emerald-800/30">
                            <CheckCircle size={12} className="text-emerald-500" />
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                <AnimatedNumber value={stats.completed} inView={inView} />
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold">done</span>
                        </div>
                    </div>

                    {/* Hover task preview */}
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${isHovered && previewTasks.length > 0 ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                        <div className="border-t border-gray-200/60 dark:border-white/5 pt-3 space-y-2">
                            {previewTasks.map((task, i) => (
                                <div key={task.id || i} className="flex items-center gap-2.5 text-xs">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        task.status === 'COMPLETE' ? 'bg-emerald-500' :
                                        task.status === 'IN PROGRESS' ? 'bg-orange-500' :
                                        'bg-gray-300 dark:bg-gray-600'
                                    }`} />
                                    <span className={`truncate flex-1 font-medium ${task.status === 'COMPLETE' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {task.name}
                                    </span>
                                    <span className={`text-[10px] font-bold flex-shrink-0 ${
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
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200/60 dark:border-white/5">
                        {latestDueDate ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                <Calendar size={11} />
                                <span>Due {latestDueDate}</span>
                            </div>
                        ) : <div />}
                        <div className={`flex items-center gap-2 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                            {onAISummary && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAISummary(); }}
                                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800/30"
                                >
                                    <Bot size={11} /> AI
                                </button>
                            )}
                            <div className="h-8 w-8 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-[#c20c0b] flex items-center justify-center text-gray-400 group-hover:text-white transition-all duration-300 shadow-sm">
                                <ChevronRight size={15} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
