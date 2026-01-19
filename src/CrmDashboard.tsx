// Import React and hooks for managing state (data) and side effects (actions on load)
import React, { useState, useEffect, useMemo, FC, useRef, useCallback } from 'react';
import { crmService } from './crm.service';
import { factoryService } from './factory.service';
import { CrmOrder, Factory } from './types';
import {
    List, TrendingUp, CheckCircle, Package, PieChart as PieChartIcon,
    BarChart as BarChartIcon, Info, LayoutDashboard, ClipboardCheck,
    GanttChartSquare, Bot, Plus, X
} from 'lucide-react';
import {
    DashboardView, ListView, BoardView, GanttChartView, TNAView, OrderDetailsView
} from './CRMPage';

interface CrmDashboardProps {
    callGeminiAPI: (prompt: string) => Promise<string>;
    handleSetCurrentPage: (page: string, data?: any) => void;
    user: any;
    darkMode?: boolean;
}

// Main Component: The CRM Dashboard Page
export default function CrmDashboard({ callGeminiAPI, handleSetCurrentPage, user, darkMode }: CrmDashboardProps) {
    const ORDERS_CACHE_KEY = 'garment_erp_client_orders';
    const FACTORIES_CACHE_KEY = 'garment_erp_crm_factories';

    const [crmData, setCrmData] = useState<{ [key: string]: CrmOrder }>(() => {
        const cached = sessionStorage.getItem(ORDERS_CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    });
    const [activeOrderKey, setActiveOrderKey] = useState<string | null>(null);
    const [allFactories, setAllFactories] = useState<Factory[]>(() => {
        const cached = sessionStorage.getItem(FACTORIES_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [activeView, setActiveView] = useState('Details');
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [orderSummary, setOrderSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [loading, setLoading] = useState(() => !sessionStorage.getItem(ORDERS_CACHE_KEY));
    const abortControllerRef = useRef<AbortController | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const hasCache = !!sessionStorage.getItem(ORDERS_CACHE_KEY);
        if (!hasCache) setLoading(true);

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));

            if (user && user.id && !signal.aborted) {
                // Fetch Orders
                const { data: orders, error: orderError } = await Promise.race([crmService.getOrdersByClient(user.id), timeoutPromise]) as any;
                if (orderError) {
                    throw orderError;
                } else if (orders) {
                    const mappedData: { [key: string]: CrmOrder } = {};
                    orders.forEach((order: any) => {
                        mappedData[order.id] = {
                            id: order.id,
                            customer: 'My Order',
                            product: order.product_name,
                            factoryId: order.factory_id,
                            documents: order.documents || [],
                            tasks: order.tasks || [],
                            status: order.status
                        } as CrmOrder;
                    });
                    setCrmData(mappedData);
                    sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(mappedData));
                    // Only set active order if none is selected, to preserve selection on re-fetch
                    setActiveOrderKey(prev => prev || (orders.length > 0 ? orders[0].id : null));
                }

                // Fetch Factories (for details view)
                const { data: factories } = await Promise.race([factoryService.getAll(), timeoutPromise]) as any;
                if (!signal.aborted) {
                    setAllFactories(factories || []);
                    sessionStorage.setItem(FACTORIES_CACHE_KEY, JSON.stringify(factories || []));
                }
            }
            
            if (!signal.aborted) setLoading(false);
            return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                attempts++;
                if (attempts >= 3) {
                    console.error('Error fetching CRM data:', err);
                    showToast('Failed to fetch orders', 'error');
                    setLoading(false);
                }
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, [user]);

    useEffect(() => {
        fetchData();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchData]);

    const activeOrder = activeOrderKey ? crmData[activeOrderKey] : null;

    const generateOrderSummary = async () => {
        if (!activeOrder) return;
        setIsSummaryModalOpen(true);
        setIsSummaryLoading(true);
        setOrderSummary('');
        const taskDetails = activeOrder.tasks.map(t => `- ${t.name}: ${t.status} (Due: ${t.plannedEndDate})`).join('\n');
        const prompt = `
            Generate a professional project report and order summary for the following garment production order:
            
            **Order ID:** ${activeOrderKey}
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
        const lines = text.split('\n').map((line, i) => {
            if (line.startsWith('###')) return <h3 key={i} className="text-xl font-bold text-gray-800 mb-4">{line.replace('###', '')}</h3>;
            if (line.startsWith('**')) return <p key={i} className="font-semibold text-gray-700 mt-4 mb-1">{line.replace(/\*\*/g, '')}</p>;
            if (line.startsWith('- ')) return <li key={i} className="flex items-start my-1 text-gray-600"><span className="mr-3 mt-1.5 text-[#c20c0b]">∙</span><span>{line.substring(2)}</span></li>;
            return <p key={i} className="text-gray-600">{line}</p>;
        });
        return <div className="space-y-1">{lines}</div>;
    };

    const AIOrderSummaryModal: FC = () => (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={() => setIsSummaryModalOpen(false)}>
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative border border-gray-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsSummaryModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"> <X size={24} /> </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-100 rounded-lg"> <Bot className="w-6 h-6 text-[#c20c0b]" /> </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Order Summary</h2>
                </div>
                <div className="min-h-[200px] prose prose-sm max-w-none">
                    {isSummaryLoading ? ( <div className="flex items-center justify-center h-full flex-col"> <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c20c0b]"></div> <p className="mt-4 text-gray-500">Analyzing order data...</p> </div> ) : ( <MarkdownRenderer text={orderSummary} /> )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">CRM Portal</h1>
                <button className="bg-[#c20c0b] text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-[#a50a09] transition">
                    <Plus size={18} /> Add Task
                </button>
            </div>
            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading your orders...</div>
            ) : Object.keys(crmData).length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-sm border border-gray-200 dark:border-white/10">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Orders</h3>
                    <p className="text-gray-500">You don't have any active orders yet.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-white/10">
                    <div className="border-b border-gray-200 dark:border-white/10 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2">
                            {/* Order Tabs */}
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                {Object.keys(crmData).map(orderKey => (
                                <button key={orderKey} onClick={() => setActiveOrderKey(orderKey)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-t-lg transition-colors ${activeOrderKey === orderKey ? 'border-b-2 border-[#c20c0b] text-[#c20c0b]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                        {crmData[orderKey].product}
                                    </button>
                                ))}
                            </div>
                            {/* View Tabs & AI Button */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg p-1 bg-gray-50 dark:bg-gray-700">
                                    {[
                                        {name: 'Details', icon: <Info size={16}/>},
                                        {name: 'List', icon: <List size={16}/>},
                                        {name: 'Board', icon: <LayoutDashboard size={16}/>},
                                        {name: 'TNA', icon: <ClipboardCheck size={16}/>},
                                        {name: 'Dashboard', icon: <PieChartIcon size={16}/>},
                                        {name: 'Gantt', icon: <GanttChartSquare size={16}/>}
                                    ].map(view => (
                                        <button key={view.name} onClick={() => setActiveView(view.name)} className={`flex items-center gap-2 py-1.5 px-3 text-sm font-semibold rounded-md transition-colors ${activeView === view.name ? 'bg-white text-[#c20c0b] shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                                            {view.icon} <span className="hidden sm:inline">{view.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={generateOrderSummary} className="p-2.5 bg-red-100 text-[#c20c0b] rounded-lg hover:bg-red-200 transition-colors" title="Generate AI Summary">
                                    <Bot size={18}/>
                                </button>
                            </div>
                        </div>
                    </div>
                    {activeOrder && activeView === 'Details' && <OrderDetailsView order={activeOrder} allFactories={allFactories} handleSetCurrentPage={handleSetCurrentPage} />}
                    {activeOrder && activeView === 'List' && <ListView tasks={activeOrder.tasks} />}
                    {activeOrder && activeView === 'Board' && <BoardView tasks={activeOrder.tasks} />}
                    {activeOrder && activeView === 'TNA' && <TNAView tasks={activeOrder.tasks} />}
                    {activeOrder && activeView === 'Dashboard' && <DashboardView tasks={activeOrder.tasks} orderKey={activeOrderKey || ''} orderDetails={activeOrder} darkMode={darkMode} />}
                    {activeOrder && activeView === 'Gantt' && <GanttChartView tasks={activeOrder.tasks} />}
                </div>
            )}
            {isSummaryModalOpen && <AIOrderSummaryModal />}
        </div>
    );
}