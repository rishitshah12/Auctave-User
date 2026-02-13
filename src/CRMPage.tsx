import React, { FC, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import {
    List, TrendingUp, CheckCircle, Package, PieChart as PieChartIcon,
    BarChart as BarChartIcon, Info, LayoutDashboard, ClipboardCheck,
    GanttChartSquare, Bot, FileText, Ship, DollarSign, Download, MapPin, Plus, ChevronDown, X,
    Star, AlertCircle, ArrowRight, Building, Clock
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, Cell, PieChart
} from 'recharts';
import { MainLayout } from '../src/MainLayout';
import { CrmOrder, Factory } from '../src/types';
import { crmService } from './crm.service';

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

export const DashboardView: FC<{ tasks: any[]; orderKey: string; orderDetails: any; darkMode?: boolean }> = ({ tasks, orderKey, orderDetails, darkMode }) => {
        const statusData = useMemo(() => {
            const statuses: { [key: string]: number } = { 'TO DO': 0, 'IN PROGRESS': 0, 'COMPLETE': 0 };
            tasks.forEach(task => {
                if(statuses[task.status] !== undefined) statuses[task.status]++;
            });
            return Object.entries(statuses).map(([name, value]) => ({ name, value }));
        }, [tasks]);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS').length;
        const totalQuantity = parseInt((orderDetails.product || '').split(' ')[0], 10) || 0;
        
        const COLORS = darkMode ? ['#4B5563', '#F59E0B', '#10B981'] : ['#D1D5DB', '#FBBF24', '#34D399'];
        const axisColor = darkMode ? '#9CA3AF' : '#6B7280';
        const gridColor = darkMode ? '#374151' : '#E5E7EB';
        const tooltipStyle = darkMode ? { backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' } : { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827' };

        return (
            <div className="mt-6 space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DashboardCard title="Total Tasks" value={totalTasks} icon={<List size={22}/>} colorClass="from-[#c20c0b] to-red-500" index={0} />
                    <DashboardCard title="In Progress" value={inProgressTasks} icon={<TrendingUp size={22}/>} colorClass="from-orange-500 to-amber-500" index={1} />
                    <DashboardCard title="Completed" value={completedTasks} icon={<CheckCircle size={22}/>} colorClass="from-green-500 to-emerald-500" index={2} />
                    <DashboardCard title="Total Quantity" value={totalQuantity.toLocaleString()} icon={<Package size={22}/>} colorClass="from-blue-500 to-cyan-500" index={3} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
                                <PieChartIcon size={16} className="text-white"/>
                            </div>
                            Task Status Distribution
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" labelLine={false} innerRadius={70} outerRadius={110} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tooltipStyle.color }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-3 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-md">
                                <BarChartIcon size={16} className="text-white"/>
                            </div>
                            Units Per Task
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={tasks.filter(t => t.quantity > 0)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.8}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="name" tick={{fontSize: 12, fill: axisColor}} axisLine={{stroke: axisColor}} tickLine={{stroke: axisColor}} />
                                <YAxis tick={{fontSize: 12, fill: axisColor}} axisLine={{stroke: axisColor}} tickLine={{stroke: axisColor}} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{fill: darkMode ? '#374151' : '#f3f4f6'}} />
                                <Bar dataKey="quantity" fill="url(#colorUv)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )
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
                        <button className="ml-4 text-gray-500 dark:text-gray-400 hover:text-[var(--color-primary)] dark:hover:text-red-400 flex items-center gap-1.5 text-xs font-semibold hover:scale-105 transition-all duration-200">
                            <Plus size={14} /> Add Task
                        </button>
                    </div>
                    <div className="overflow-x-auto bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                                <tr>
                                    {['Task Name', 'Due date', 'QTY'].map(header => (
                                        <th key={header} scope="col" className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800">
                                {tasks.map(task => (
                                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                                        <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <CheckCircle size={18} className={`${task.status === 'COMPLETE' ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} /> {task.name}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">{task.plannedEndDate}</td>
                                        <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300 font-medium">{task.quantity?.toLocaleString() || 'N/A'}</td>
                                    </tr>
                                ))}
                                {showTotals && (
                                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700/50 dark:to-gray-800/50 font-bold border-t-2 border-gray-200 dark:border-gray-600">
                                    <td className="px-5 py-3.5 text-gray-800 dark:text-white">Total</td>
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

        const TaskCard: FC<{ task: any }> = ({ task }) => (
            <div className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg mb-3 transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <p className="font-bold text-sm text-gray-800 dark:text-white group-hover:text-[var(--color-primary)] dark:group-hover:text-red-400 transition-colors">{task.name}</p>
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
        )

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
                                <button className="w-full text-left text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 p-3 rounded-xl flex items-center gap-2 transition-all duration-200 hover:shadow-md border border-dashed border-gray-300 dark:border-gray-600">
                                    <Plus size={16} /> Add Task
                                </button>
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

export const TNAView: FC<{ tasks: any[] }> = ({ tasks }) => {
        const parseDate = (str: string | null) => str ? new Date(str) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date

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
        }

        return (
            <div className="mt-6 overflow-x-auto animate-fade-in">
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                            <tr>
                                {['Task', 'Responsible', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Status', 'Delay (Days)'].map(header => (
                                    <th key={header} scope="col" className="px-5 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                            {tasks.map((task, index) => {
                                const delayInfo = calculateDelay(task);
                                return (
                                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                                        <td className="px-5 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">{task.name}</td>
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
                                        <td className="px-5 py-4 whitespace-nowrap"><span className={getStatusPill(task.status)}>{task.status}</span></td>
                                        <td className={`px-5 py-4 whitespace-nowrap font-bold ${getDelayColor(delayInfo.status)}`}>
                                            {delayInfo.days > 0 ? (
                                                <span className="flex items-center gap-1">
                                                    <AlertCircle size={14} />
                                                    +{delayInfo.days}d
                                                </span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    };

export const OrderDetailsView: FC<{ order: any; allFactories: Factory[]; handleSetCurrentPage: (page: string, data?: any) => void }> = ({ order, allFactories, handleSetCurrentPage }) => {
        const factory = allFactories.find(f => f.id === order.factoryId);
        const getDocIcon = (type: string) => {
            switch(type) {
                case 'PO': return <FileText className="text-blue-500" />;
                case 'Logistics': return <Ship className="text-orange-500" />;
                case 'Finance': return <DollarSign className="text-green-500" />;
                default: return <FileText className="text-gray-500" />;
            }
        }
        return (
            <div className="mt-6 space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
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
                                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700/30 sm:col-span-2">
                                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Product</p>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{order.product}</p>
                                </div>
                            </div>
                        </div>
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
                        mappedData[order.id] = {
                            customer: 'My Order',
                            product: order.product_name,
                            factoryId: order.factory_id,
                            documents: order.documents || [],
                            tasks: order.tasks || [],
                            status: order.status
                        } as CrmOrder;
                    });
                    setCrmData(mappedData);
                    if (!activeCrmOrderKey && data.length > 0) setActiveOrderKey(data[0].id);
                    else if (data.length === 0) setActiveOrderKey(null);
                }
            }
        };
        fetchClientOrders();
    }, [user]);

    const [activeView, setActiveView] = useState('Details');
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [orderSummary, setOrderSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    const activeOrder = activeOrderKey && crmData[activeOrderKey] ? { ...crmData[activeOrderKey], id: activeOrderKey } : null;

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

                        {/* Action Button */}
                        <button className="px-6 py-3 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 hover:scale-[1.03] flex items-center gap-2">
                            <Plus size={18} /> Add Task
                        </button>
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
                                    onClick={() => setActiveOrderKey(orderKey)}
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
                            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl p-1 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
                                {[
                                    {name: 'Details', icon: <Info size={16}/>},
                                    {name: 'List', icon: <List size={16}/>},
                                    {name: 'Board', icon: <LayoutDashboard size={16}/>},
                                    {name: 'TNA', icon: <ClipboardCheck size={16}/>},
                                    {name: 'Dashboard', icon: <PieChartIcon size={16}/>},
                                    {name: 'Gantt', icon: <GanttChartSquare size={16}/>}
                                ].map(view => (
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
                {activeOrder && activeView === 'Details' && <OrderDetailsView order={activeOrder} allFactories={allFactories} handleSetCurrentPage={handleSetCurrentPage} />}
                {activeOrder && activeView === 'List' && <ListView tasks={activeOrder.tasks} />}
                {activeOrder && activeView === 'Board' && <BoardView tasks={activeOrder.tasks} />}
                {activeOrder && activeView === 'TNA' && <TNAView tasks={activeOrder.tasks} />}
                    {activeOrder && activeView === 'Dashboard' && <DashboardView tasks={activeOrder.tasks} orderKey={activeOrderKey || ''} orderDetails={activeOrder}/>}
                {activeOrder && activeView === 'Gantt' && <GanttChartView tasks={activeOrder.tasks} />}
            </div>
            {isSummaryModalOpen && <AIOrderSummaryModal />}
        </MainLayout>
    );
};