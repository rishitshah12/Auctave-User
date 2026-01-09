import React, { FC, useState, useEffect, useMemo, ReactNode } from 'react';
import {
    List, TrendingUp, CheckCircle, Package, PieChart as PieChartIcon,
    BarChart as BarChartIcon, Info, LayoutDashboard, ClipboardCheck,
    GanttChartSquare, Bot, FileText, Ship, DollarSign, Download, MapPin, Plus, ChevronDown, X
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

export function DashboardCard({ icon, title, value, colorClass }: { icon: ReactNode, title: string, value: string | number, colorClass: string }) {
    return (
        <div className={`relative p-5 rounded-xl overflow-hidden bg-white shadow-sm border`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClass}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export const DashboardView: FC<{ tasks: any[]; orderKey: string; orderDetails: any }> = ({ tasks, orderKey, orderDetails }) => {
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
        const totalQuantity = parseInt(orderDetails.product.split(' ')[0], 10) || 0;
        const COLORS = ['#D1D5DB', '#FBBF24', '#34D399'];

        return (
            <div className="mt-6 space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DashboardCard title="Total Tasks" value={totalTasks} icon={<List className="text-purple-800"/>} colorClass="bg-purple-100" />
                    <DashboardCard title="In Progress" value={inProgressTasks} icon={<TrendingUp className="text-yellow-800"/>} colorClass="bg-yellow-100" />
                    <DashboardCard title="Completed" value={completedTasks} icon={<CheckCircle className="text-green-800"/>} colorClass="bg-green-100" />
                    <DashboardCard title="Total Quantity" value={totalQuantity.toLocaleString()} icon={<Package className="text-blue-800"/>} colorClass="bg-blue-100" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><PieChartIcon size={20} className="mr-2 text-purple-600"/>Task Status Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" labelLine={false} innerRadius={70} outerRadius={110} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />)}
                                </Pie>
                                <Tooltip/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><BarChartIcon size={20} className="mr-2 text-purple-600"/>Units Per Task</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={tasks.filter(t => t.quantity > 0)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.8}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis tick={{fontSize: 12}} />
                                <Tooltip />
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
            const groupHeaderColor = isCompletedGroup ? 'text-green-600' : 'text-gray-600';
            return (
                <div className="mb-8">
                    <div className="flex items-center text-sm font-semibold mb-3">
                        <ChevronDown size={20} className={`mr-1 ${groupHeaderColor}`} />
                        <span className={`mr-2 ${groupHeaderColor}`}>{title}</span>
                        <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">{tasks.length}</span>
                        <button className="ml-4 text-gray-500 hover:text-gray-800 flex items-center gap-1">
                            <Plus size={16} /> Add Task
                        </button>
                    </div>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Task Name', 'Due date', 'QTY'].map(header => (
                                        <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tasks.map(task => (
                                    <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900 flex items-center">
                                            <CheckCircle size={16} className={`${task.status === 'COMPLETE' ? 'text-green-500' : 'text-gray-300'} mr-2`} /> {task.name}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-gray-600">{task.plannedEndDate}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-gray-600">{task.quantity?.toLocaleString() || 'N/A'}</td>
                                    </tr>
                                ))}
                                {showTotals && (
                                <tr className="bg-gray-50 font-bold">
                                    <td className="px-4 py-2 text-gray-800"></td>
                                    <td className="px-4 py-2 text-gray-800"></td>
                                    <td className="px-4 py-2 text-gray-800">{totalsData.qty.toLocaleString()}</td>
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

        const TaskCard: FC<{ task: any }> = ({ task }) => (
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-3">
                <p className="font-semibold text-sm text-gray-800">{task.name}</p>
                <p className="text-xs text-gray-500 mt-1">Due: {task.plannedEndDate}</p>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex -space-x-2">
                        <img className="w-6 h-6 rounded-full border-2 border-white" src={`https://i.pravatar.cc/150?u=${task.responsible}`} alt="user"/>
                    </div>
                    <span className={`w-10 h-2 rounded-full ${task.color}`}></span>
                </div>
            </div>
        )

        return (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                {Object.entries(columns).map(([status, tasksInColumn]) => (
                    <div key={status} className="bg-gray-50/70 p-3 rounded-lg">
                        <h3 className="flex items-center justify-between text-sm font-semibold mb-4 px-1 text-gray-700">
                            <span>{status}</span>
                            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">{tasksInColumn.length}</span>
                        </h3>
                        <div>
                            {tasksInColumn.map(task => <TaskCard key={task.id} task={task} />)}
                            <button className="w-full text-left text-sm font-medium text-gray-500 hover:bg-gray-200 p-2 rounded-md flex items-center">
                                <Plus size={16} className="mr-1"/> Add Task
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

export const GanttChartView: FC<{ tasks: any[] }> = ({ tasks }) => {
        const parseDate = (str: string) => new Date(str);
        const diffDays = (date1: Date, date2: Date) => Math.ceil(Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));

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
            <div className="mt-6 overflow-x-auto scrollbar-hide animate-fade-in">
                <div className="relative" style={{ minWidth: `${totalDuration * 40}px`}}>
                    {/* Grid Lines & Header */}
                    <div className="relative grid border-b-2 border-gray-200" style={{ gridTemplateColumns: `repeat(${totalDuration}, minmax(40px, 1fr))`}}>
                        {timelineHeader.map((date, i) => (
                            <div key={i} className="text-center border-r border-gray-200 py-2">
                                <p className="text-xs text-gray-500">{date.toLocaleDateString('en-US', {month: 'short'})}</p>
                                <p className="text-sm font-medium text-gray-800">{date.getDate()}</p>
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
                            return (
                                <div key={task.id} className="absolute w-full h-10 flex items-center" style={{ top: `${index * 48}px`, left: `${left}%`, width: `${width}%` }}>
                                    <div className={`w-full h-8 rounded-full flex items-center justify-between px-3 text-white shadow-md ${task.color || 'bg-gray-400'}`}>
                                        <span className="text-sm font-medium truncate">{task.name}</span>
                                        <img className="w-6 h-6 rounded-full border-2 border-white flex-shrink-0" src={`https://i.pravatar.cc/150?u=${task.id}`} alt="user"/>
                                    </div>
                                </div>
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
                <div className="bg-white rounded-xl shadow-sm border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Task', 'Responsible', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Status', 'Delay (Days)'].map(header => (
                                    <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {tasks.map(task => {
                                const delayInfo = calculateDelay(task);
                                return (
                                    <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{task.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{task.responsible}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{task.plannedStartDate}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{task.plannedEndDate}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{task.actualStartDate || '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{task.actualEndDate || '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap"><span className={getStatusPill(task.status)}>{task.status}</span></td>
                                        <td className={`px-4 py-3 whitespace-nowrap ${getDelayColor(delayInfo.status)}`}>{delayInfo.days > 0 ? `+${delayInfo.days}` : '—'}</td>
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
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><p className="text-sm text-gray-500">Order ID</p><p className="font-semibold">{order.id || 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Customer</p><p className="font-semibold">{order.customer}</p></div>
                                <div><p className="text-sm text-gray-500">Product</p><p className="font-semibold">{order.product}</p></div>
                            </div>
                        </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Documents</h3>
                            <div className="space-y-3">
                                {order.documents.map((doc: any, index: number) => (
                                    <div key={index} className="border rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {getDocIcon(doc.type)}
                                            <div>
                                                <p className="font-semibold text-gray-800">{doc.name}</p>
                                                <p className="text-xs text-gray-500">Updated: {doc.lastUpdated}</p>
                                            </div>
                                        </div>
                                        <button className="p-2 rounded-md hover:bg-gray-200 text-gray-500">
                                            <Download size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Right Column */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Assigned Factory</h3>
                        {factory ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <img src={factory.imageUrl} alt={factory.name} className="w-16 h-16 rounded-lg object-cover"/>
                                    <div>
                                        <p className="font-bold text-gray-900">{factory.name}</p>
                                        <p className="text-sm text-gray-500 flex items-center"><MapPin size={14} className="mr-1.5"/>{factory.location}</p>
                                    </div>
                                </div>
                                <div className="text-sm space-y-2">
                                    <p><span className="font-semibold">Rating:</span> {factory.rating} / 5.0</p>
                                    <p><span className="font-semibold">Specialties:</span> {factory.specialties.join(', ')}</p>
                                    <p><span className="font-semibold">Contact:</span> john.doe@example.com</p>
                                </div>
                                <button 
                                    onClick={() => factory && handleSetCurrentPage('factoryDetail', factory)}
                                    className="w-full mt-2 py-2 px-4 text-sm font-semibold bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
                                    View Factory Profile
                                </button>
                            </div>
                        ) : <p>No factory assigned.</p>}
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
            if (line.startsWith('###')) return <h3 key={i} className="text-xl font-bold text-gray-800 mb-4">{line.replace('###', '')}</h3>;
            if (line.startsWith('**')) return <p key={i} className="font-semibold text-gray-700 mt-4 mb-1">{line.replace(/\*\*/g, '')}</p>;
            if (line.startsWith('- ')) return <li key={i} className="flex items-start my-1 text-gray-600"><span className="mr-3 mt-1.5 text-purple-500">∙</span><span>{line.substring(2)}</span></li>;
            return <p key={i} className="text-gray-600">{line}</p>;
        });
        return <div className="space-y-1">{lines}</div>;
    };

    const AIOrderSummaryModal: FC = () => (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={() => setIsSummaryModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsSummaryModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"> <X size={24} /> </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg"> <Bot className="w-6 h-6 text-purple-600" /> </div>
                    <h2 className="text-2xl font-bold text-gray-800">AI Order Summary</h2>
                </div>
                <div className="min-h-[200px] prose prose-sm max-w-none">
                    {isSummaryLoading ? ( <div className="flex items-center justify-center h-full flex-col"> <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div> <p className="mt-4 text-gray-500">Analyzing order data...</p> </div> ) : ( <MarkdownRenderer text={orderSummary} /> )}
                </div>
            </div>
        </div>
    );

    return (
        <MainLayout {...props}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">CRM Portal</h1>
                <button className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition">
                    <Plus size={18} /> Add Task
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <div className="border-b border-gray-200 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2">
                        {/* Order Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            {Object.keys(crmData).map(orderKey => (
                                <button key={orderKey} onClick={() => setActiveOrderKey(orderKey)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-t-lg transition-colors ${activeOrderKey === orderKey ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {crmData[orderKey].product}
                                </button>
                            ))}
                        </div>
                        {/* View Tabs & AI Button */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-gray-50">
                                {[
                                    {name: 'Details', icon: <Info size={16}/>},
                                    {name: 'List', icon: <List size={16}/>},
                                    {name: 'Board', icon: <LayoutDashboard size={16}/>},
                                    {name: 'TNA', icon: <ClipboardCheck size={16}/>},
                                    {name: 'Dashboard', icon: <PieChartIcon size={16}/>},
                                    {name: 'Gantt', icon: <GanttChartSquare size={16}/>}
                                ].map(view => (
                                    <button key={view.name} onClick={() => setActiveView(view.name)} className={`flex items-center gap-2 py-1.5 px-3 text-sm font-semibold rounded-md transition-colors ${activeView === view.name ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                                        {view.icon} <span className="hidden sm:inline">{view.name}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={generateOrderSummary} className="p-2.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors" title="Generate AI Summary">
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