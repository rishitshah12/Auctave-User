import React, { FC, useState, useMemo } from 'react';
import { Activity, Cog, Wrench, CheckCircle, Calendar, Zap } from 'lucide-react';
import { ProductionLine } from './types';

interface ProductionFloorLayoutProps {
    lines: ProductionLine[];
    compact?: boolean;
}

/** Normalize legacy data into new ProductionLine shape */
function normalizeLine(raw: any, index: number): ProductionLine {
    if (!raw || typeof raw !== 'object') {
        return { name: `Line ${index + 1}`, machinesCount: 0, capacityPerMonth: 0, status: 'vacant' };
    }
    // Legacy format: { machineType, totalSlots, availableSlots }
    if ('machineType' in raw && !('machinesCount' in raw)) {
        return {
            name: raw.machineType || `Line ${index + 1}`,
            machinesCount: Math.max(0, Math.round((raw.totalSlots || 0) / 5)),
            capacityPerMonth: raw.totalSlots || 0,
            status: (raw.availableSlots ?? 0) === 0 ? 'in-use' : 'vacant',
        };
    }
    // Remap legacy statuses
    let status: ProductionLine['status'] = 'vacant';
    if (raw.status === 'in-use' || raw.status === 'active') status = 'in-use';
    else if (raw.status === 'maintenance') status = 'maintenance';
    else if (raw.status === 'vacant' || raw.status === 'idle') status = 'vacant';

    return {
        name: raw.name || `Line ${index + 1}`,
        machinesCount: raw.machinesCount || 0,
        capacityPerMonth: raw.capacityPerMonth || 0,
        status,
        nextAvailableDate: raw.nextAvailableDate || undefined,
    };
}

const STATUS_CONFIG = {
    vacant: {
        label: 'Vacant',
        icon: CheckCircle,
        dot: 'bg-emerald-500 dark:bg-emerald-400',
        machineFill: 'bg-emerald-400 dark:bg-emerald-500',
        machineEmpty: 'opacity-40',
        badgeBg: 'bg-emerald-500',
        tagBg: 'bg-emerald-50 dark:bg-emerald-900/30',
        tagBorder: 'border-emerald-200 dark:border-emerald-800',
        tagText: 'text-emerald-700 dark:text-emerald-400',
        headerBg: 'bg-emerald-50 dark:bg-emerald-900/20',
        colBorder: 'border-emerald-200 dark:border-emerald-800/60',
        glow: '',
    },
    'in-use': {
        label: 'In Use',
        icon: Activity,
        dot: 'bg-blue-500 dark:bg-blue-400',
        machineFill: 'bg-blue-500 dark:bg-blue-400',
        machineEmpty: 'opacity-90',
        badgeBg: 'bg-blue-600',
        tagBg: 'bg-blue-50 dark:bg-blue-900/30',
        tagBorder: 'border-blue-200 dark:border-blue-800',
        tagText: 'text-blue-700 dark:text-blue-400',
        headerBg: 'bg-blue-50 dark:bg-blue-900/20',
        colBorder: 'border-blue-300 dark:border-blue-700',
        glow: 'shadow-blue-100 dark:shadow-blue-900/20',
    },
    maintenance: {
        label: 'Maintenance',
        icon: Wrench,
        dot: 'bg-amber-500 dark:bg-amber-400',
        machineFill: 'bg-amber-400 dark:bg-amber-500',
        machineEmpty: 'opacity-50',
        badgeBg: 'bg-amber-500',
        tagBg: 'bg-amber-50 dark:bg-amber-900/30',
        tagBorder: 'border-amber-200 dark:border-amber-800',
        tagText: 'text-amber-700 dark:text-amber-400',
        headerBg: 'bg-amber-50 dark:bg-amber-900/20',
        colBorder: 'border-amber-300 dark:border-amber-700',
        glow: '',
    },
};

function formatDate(iso?: string): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}

/** Vertical stack of machine squares. Max 10 shown, rest as +N chip. */
const MachineColumn: FC<{ count: number; status: ProductionLine['status']; compact?: boolean }> = ({ count, status, compact }) => {
    const cfg = STATUS_CONFIG[status];
    const show = Math.min(count, 10);
    const overflow = count - show;
    const sz = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';

    return (
        <div className="flex flex-col items-center gap-[3px]">
            {Array.from({ length: show }).map((_, i) => (
                <div
                    key={i}
                    className={`${sz} rounded-sm ${cfg.machineFill} ${cfg.machineEmpty} transition-opacity`}
                />
            ))}
            {overflow > 0 && (
                <div className={`${sz} rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 ${compact ? 'text-[5px]' : 'text-[6px]'}`}>
                    +{overflow}
                </div>
            )}
            {count === 0 && (
                <div className={`${sz} rounded-sm border-2 border-dashed border-gray-300 dark:border-gray-600`} />
            )}
        </div>
    );
};

const ProductionFloorLayout: FC<ProductionFloorLayoutProps> = ({ lines: rawLines, compact = false }) => {
    const [selectedLine, setSelectedLine] = useState<number | null>(null);

    const lines = useMemo(() => (rawLines || []).map((r, i) => normalizeLine(r, i)), [rawLines]);

    if (lines.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-white/10">
                <Cog size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400">No production lines configured</p>
            </div>
        );
    }

    const totalMachines = lines.reduce((s, l) => s + (l.machinesCount || 0), 0);
    const totalCapacity = lines.reduce((s, l) => s + (l.capacityPerMonth || 0), 0);
    // Available = only vacant lines contribute capacity and machines
    const availableMachines = lines.filter(l => l.status === 'vacant').reduce((s, l) => s + (l.machinesCount || 0), 0);
    const availableCapacity = lines.filter(l => l.status === 'vacant').reduce((s, l) => s + (l.capacityPerMonth || 0), 0);
    const vacantLines = lines.filter(l => l.status === 'vacant').length;
    const inUseLines = lines.filter(l => l.status === 'in-use').length;
    const maintenanceLines = lines.filter(l => l.status === 'maintenance').length;

    return (
        <div className="space-y-3">
            {/* Title row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#c20c0b] flex items-center justify-center shrink-0">
                        <Activity size={12} className="text-white" />
                    </div>
                    <span className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-xs' : 'text-sm'}`}>
                        Factory Floor Layout
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        Vacant
                    </span>
                    <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                        In Use
                    </span>
                    <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                        Maintenance
                    </span>
                </div>
            </div>

            {/* Floor schematic — each line is a column */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Floor rail top */}
                <div className="h-1 w-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-700 dark:via-gray-500 dark:to-gray-700" />

                <div
                    className="grid divide-x divide-gray-200 dark:divide-gray-700"
                    style={{ gridTemplateColumns: `repeat(${Math.min(lines.length, compact ? 4 : 6)}, minmax(0, 1fr))` }}
                >
                    {lines.map((line, idx) => {
                        const cfg = STATUS_CONFIG[line.status];
                        const StatusIcon = cfg.icon;
                        const isSelected = selectedLine === idx;
                        const isVacant = line.status === 'vacant';
                        const showDate = (line.status === 'in-use' || line.status === 'maintenance') && line.nextAvailableDate;

                        return (
                            <div
                                key={idx}
                                className={`flex flex-col cursor-pointer transition-colors duration-150 ${
                                    isSelected
                                        ? `${cfg.headerBg}`
                                        : 'hover:bg-white dark:hover:bg-gray-800/60'
                                } ${cfg.glow}`}
                                onClick={() => setSelectedLine(isSelected ? null : idx)}
                            >
                                {/* Column header */}
                                <div className={`${compact ? 'px-2 py-2' : 'px-3 py-2.5'} border-b border-gray-200 dark:border-gray-700 ${cfg.headerBg} text-center`}>
                                    {/* Line badge */}
                                    <div className={`${compact ? 'w-7 h-7 text-[9px]' : 'w-8 h-8 text-[10px]'} rounded-lg ${cfg.badgeBg} flex items-center justify-center text-white font-bold mx-auto mb-1.5 shadow-sm`}>
                                        L{idx + 1}
                                    </div>
                                    {/* Name */}
                                    <div className={`font-semibold text-gray-800 dark:text-gray-100 truncate ${compact ? 'text-[10px]' : 'text-[11px]'}`} title={line.name}>
                                        {line.name || `Line ${idx + 1}`}
                                    </div>
                                    {/* Status tag */}
                                    <div className={`inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded-full border text-[8px] font-bold ${cfg.tagBg} ${cfg.tagBorder} ${cfg.tagText}`}>
                                        <StatusIcon size={8} />
                                        {cfg.label}
                                    </div>
                                </div>

                                {/* Machine dot column — the "floor" */}
                                <div className={`flex-1 flex flex-col items-center justify-start ${compact ? 'py-3 px-1' : 'py-4 px-2'} bg-white dark:bg-gray-900/50`}>
                                    <MachineColumn count={line.machinesCount || 0} status={line.status} compact={compact} />
                                    {/* Machine count label */}
                                    <div className="mt-2.5 text-center">
                                        <div className={`font-bold text-gray-800 dark:text-gray-100 ${compact ? 'text-xs' : 'text-sm'}`}>
                                            {line.machinesCount || 0}
                                        </div>
                                        <div className="text-[8px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wide">
                                            machines
                                        </div>
                                    </div>
                                </div>

                                {/* Capacity section */}
                                <div className={`${compact ? 'px-2 py-2' : 'px-3 py-3'} border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-1.5`}>
                                    {/* Total capacity */}
                                    <div className="text-center">
                                        <div className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-xs' : 'text-sm'}`}>
                                            {(line.capacityPerMonth || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[8px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wide">
                                            capacity / mo
                                        </div>
                                    </div>
                                    {/* Available tag — only shown for vacant lines */}
                                    {isVacant && (
                                        <div className="text-center">
                                            <div className={`font-bold text-emerald-600 dark:text-emerald-400 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                                                {(line.machinesCount || 0)} avail.
                                            </div>
                                            <div className="text-[8px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wide">
                                                machines free
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Next available date (in-use / maintenance) */}
                                {showDate && (
                                    <div className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} border-t border-gray-200 dark:border-gray-700 ${cfg.tagBg} flex items-center justify-center gap-1`}>
                                        <Calendar size={9} className={cfg.tagText} />
                                        <span className={`text-[8px] font-semibold ${cfg.tagText}`}>
                                            {formatDate(line.nextAvailableDate)}
                                        </span>
                                    </div>
                                )}

                                {/* Expanded detail on click */}
                                {isSelected && line.machinesCount > 0 && (
                                    <div className={`${compact ? 'px-2 py-2' : 'px-3 py-2.5'} border-t border-gray-200 dark:border-gray-700 ${cfg.headerBg} text-center`}>
                                        <div className={`font-bold ${cfg.tagText} ${compact ? 'text-xs' : 'text-sm'}`}>
                                            {Math.round((line.capacityPerMonth || 0) / line.machinesCount).toLocaleString()}
                                        </div>
                                        <div className="text-[8px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wide">
                                            per machine / mo
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Floor rail bottom */}
                <div className="h-1 w-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-700 dark:via-gray-500 dark:to-gray-700" />
            </div>

            {/* Summary bar */}
            <div className={`grid grid-cols-2 gap-3`}>
                {/* Left: line status breakdown */}
                <div className={`bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 ${compact ? 'p-2.5' : 'p-3'} flex items-center gap-3`}>
                    <div className="text-center flex-1 border-r border-gray-200 dark:border-gray-700 pr-3">
                        <div className={`font-bold text-emerald-600 dark:text-emerald-400 ${compact ? 'text-sm' : 'text-base'}`}>{vacantLines}</div>
                        <div className="text-[8px] uppercase font-semibold text-gray-400 dark:text-gray-500">Vacant</div>
                    </div>
                    <div className="text-center flex-1 border-r border-gray-200 dark:border-gray-700 pr-3">
                        <div className={`font-bold text-blue-600 dark:text-blue-400 ${compact ? 'text-sm' : 'text-base'}`}>{inUseLines}</div>
                        <div className="text-[8px] uppercase font-semibold text-gray-400 dark:text-gray-500">In Use</div>
                    </div>
                    <div className="text-center flex-1">
                        <div className={`font-bold text-amber-600 dark:text-amber-400 ${compact ? 'text-sm' : 'text-base'}`}>{maintenanceLines}</div>
                        <div className="text-[8px] uppercase font-semibold text-gray-400 dark:text-gray-500">Maint.</div>
                    </div>
                </div>

                {/* Right: capacity */}
                <div className={`bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 ${compact ? 'p-2.5' : 'p-3'} space-y-1.5`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Cog size={10} />
                            <span className="text-[9px] font-semibold uppercase">Total</span>
                        </div>
                        <span className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-xs' : 'text-sm'}`}>
                            {totalCapacity.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">pcs/mo</span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Zap size={10} />
                            <span className="text-[9px] font-semibold uppercase">Available</span>
                        </div>
                        <span className={`font-bold text-emerald-600 dark:text-emerald-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                            {availableCapacity.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">pcs/mo</span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Cog size={10} />
                            <span className="text-[9px] font-semibold uppercase">Free Machines</span>
                        </div>
                        <span className={`font-bold text-gray-700 dark:text-gray-200 ${compact ? 'text-xs' : 'text-sm'}`}>
                            {availableMachines} <span className="text-[9px] font-normal text-gray-400">of {totalMachines}</span>
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1">
                        <div
                            className="h-1 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                            style={{ width: totalCapacity > 0 ? `${Math.round((availableCapacity / totalCapacity) * 100)}%` : '0%' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionFloorLayout;
