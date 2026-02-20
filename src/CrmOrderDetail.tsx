import React, { useState, useMemo, FC } from 'react';
import { CrmOrder, CrmProduct, CrmTask, Factory } from './types';
import { getOrderStatusColor } from './utils';
import {
    ArrowLeft, Info, List, LayoutDashboard, ClipboardCheck,
    PieChart as PieChartIcon, GanttChartSquare, Bot, X
} from 'lucide-react';
import {
    DashboardView, ListView, BoardView, GanttChartView, TNAView, OrderDetailsView
} from './CRMPage';

interface CrmOrderDetailProps {
    orderId: string;
    order: CrmOrder;
    allFactories: Factory[];
    handleSetCurrentPage: (page: string, data?: any) => void;
    onBack: () => void;
    callGeminiAPI: (prompt: string) => Promise<string>;
    darkMode?: boolean;
}

export default function CrmOrderDetail({
    orderId, order, allFactories, handleSetCurrentPage, onBack, callGeminiAPI, darkMode
}: CrmOrderDetailProps) {
    const [activeView, setActiveView] = useState('Overview');
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [orderSummary, setOrderSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    const status = order.status || 'In Production';

    // Filter tasks for the selected product
    const filteredTasks = useMemo(() => {
        if (!selectedProductId) return order.tasks;
        return order.tasks.filter(t => t.productId === selectedProductId);
    }, [order.tasks, selectedProductId]);

    const selectedProduct = useMemo(() => {
        if (!selectedProductId || !order.products) return null;
        return order.products.find(p => p.id === selectedProductId) || null;
    }, [selectedProductId, order.products]);

    // Dynamic tabs based on product selection
    const overviewViews = [
        { name: 'Overview', icon: <Info size={16} /> },
        { name: 'TNA', icon: <ClipboardCheck size={16} /> },
        { name: 'Dashboard', icon: <PieChartIcon size={16} /> },
    ];
    const productViews = [
        { name: 'List', icon: <List size={16} /> },
        { name: 'Board', icon: <LayoutDashboard size={16} /> },
        { name: 'Gantt', icon: <GanttChartSquare size={16} /> },
    ];
    const currentViews = selectedProductId ? productViews : overviewViews;

    const handleSelectProduct = (productId: string) => {
        setSelectedProductId(productId);
        setActiveView('List');
    };
    const handleBackToOverview = () => {
        setSelectedProductId(null);
        setActiveView('Overview');
    };

    const generateOrderSummary = async () => {
        setIsSummaryModalOpen(true);
        setIsSummaryLoading(true);
        setOrderSummary('');
        const products = order.products || [{ id: 'default', name: order.product }];
        const productDetails = products.map(p => {
            const pTasks = order.tasks.filter(t => t.productId === p.id);
            const completed = pTasks.filter(t => t.status === 'COMPLETE').length;
            const taskLines = pTasks.map(t => `  - ${t.name}: ${t.status} (Due: ${t.plannedEndDate})`).join('\n');
            return `**${p.name}** (${completed}/${pTasks.length} complete)\n${taskLines}`;
        }).join('\n\n');
        const prompt = `
            Generate a professional project report and order summary for the following garment production order:

            **Order ID:** ${orderId}
            **Products:**
            ${productDetails}

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
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const MarkdownRenderer: FC<{ text: string }> = ({ text }) => {
        if (!text) return null;
        const lines = text.split('\n').map((line, i) => {
            if (line.startsWith('###')) return <h3 key={i} className="text-xl font-bold text-gray-800 dark:text-white mb-4">{line.replace('###', '')}</h3>;
            if (line.startsWith('**')) return <p key={i} className="font-semibold text-gray-700 dark:text-gray-200 mt-4 mb-1">{line.replace(/\*\*/g, '')}</p>;
            if (line.startsWith('- ')) return <li key={i} className="flex items-start my-1 text-gray-600 dark:text-gray-300"><span className="mr-3 mt-1.5 text-[#c20c0b]">&#8729;</span><span>{line.substring(2)}</span></li>;
            return <p key={i} className="text-gray-600 dark:text-gray-300">{line}</p>;
        });
        return <div className="space-y-1">{lines}</div>;
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={selectedProductId ? handleBackToOverview : onBack}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] dark:hover:text-[#c20c0b] transition-colors flex-shrink-0"
                    >
                        <ArrowLeft size={18} />
                        <span className="hidden sm:inline">{selectedProductId ? 'Overview' : 'Back'}</span>
                    </button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white truncate">
                        {selectedProduct ? selectedProduct.name : order.product}
                    </h2>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${getOrderStatusColor(selectedProduct?.status || status)}`}>
                        {selectedProduct?.status || status}
                    </span>
                </div>
                <button
                    onClick={generateOrderSummary}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-[#c20c0b] rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-semibold flex-shrink-0"
                >
                    <Bot size={16} />
                    <span>AI Summary</span>
                </button>
            </div>

            {/* View tabs */}
            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
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
                            </button>
                        ))}
                    </div>
                </div>

                {/* View content */}
                <div className="p-4 sm:p-6">
                    {/* Overview mode */}
                    {activeView === 'Overview' && <OrderDetailsView order={order} allFactories={allFactories} handleSetCurrentPage={handleSetCurrentPage} onSelectProduct={handleSelectProduct} />}
                    {activeView === 'TNA' && <TNAView tasks={order.tasks} />}
                    {activeView === 'Dashboard' && <DashboardView tasks={order.tasks} orderKey={orderId} orderDetails={order} darkMode={darkMode} />}
                    {/* Product mode (filtered tasks) */}
                    {activeView === 'List' && <ListView tasks={filteredTasks} />}
                    {activeView === 'Board' && <BoardView tasks={filteredTasks} />}
                    {activeView === 'Gantt' && <GanttChartView tasks={filteredTasks} />}
                </div>
            </div>

            {/* AI Summary Modal */}
            {isSummaryModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={() => setIsSummaryModalOpen(false)}>
                    <div className="bg-white/90 backdrop-blur-xl dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative border border-gray-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsSummaryModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
                            <X size={24} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <Bot className="w-6 h-6 text-[#c20c0b]" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Order Summary</h2>
                        </div>
                        <div className="min-h-[200px] max-h-[60vh] overflow-y-auto prose prose-sm max-w-none">
                            {isSummaryLoading ? (
                                <div className="flex items-center justify-center h-[200px] flex-col">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c20c0b]"></div>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Analyzing order data...</p>
                                </div>
                            ) : (
                                <MarkdownRenderer text={orderSummary} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
