import React, { useState, useMemo, FC, useEffect, useRef } from 'react';
import { CrmOrder, CrmDocument, CrmProduct, CrmTask, Factory } from './types';
import { getOrderStatusColor } from './utils';
import { crmService } from './crm.service';
import { useToast } from './ToastContext';
import {
    ArrowLeft, ArrowRight, Info, List, LayoutDashboard, ClipboardCheck,
    PieChart as PieChartIcon, GanttChartSquare, Bot, X,
    FileText, Download, Plus, RefreshCw,
    Package, Clock, CheckCircle, AlertCircle, MapPin, Anchor
} from 'lucide-react';
import {
    DashboardView, ListView, BoardView, GanttChartView, TNAView
} from './CRMPage';

interface CrmOrderDetailProps {
    orderId: string;
    order: CrmOrder;
    allFactories: Factory[];
    handleSetCurrentPage: (page: string, data?: any) => void;
    onBack: () => void;
    callGeminiAPI: (prompt: string) => Promise<string>;
    darkMode?: boolean;
    supabase?: any;
}

// Moved outside component to avoid recreation on every render
const MarkdownRenderer: FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const lines = text.split('\n').map((line, i) => {
        if (line.startsWith('###')) return <h3 key={i} className="text-xl font-bold text-gray-800 dark:text-white mb-4">{line.replace(/^###\s*/, '')}</h3>;
        if (line.startsWith('**')) return <p key={i} className="font-semibold text-gray-700 dark:text-gray-200 mt-4 mb-1">{line.replace(/\*\*/g, '')}</p>;
        if (line.startsWith('- ')) return <li key={i} className="flex items-start my-1 text-gray-600 dark:text-gray-300"><span className="mr-3 mt-1.5 text-[#c20c0b]">&#8729;</span><span>{line.substring(2)}</span></li>;
        if (!line.trim()) return null;
        return <p key={i} className="text-gray-600 dark:text-gray-300">{line}</p>;
    });
    return <div className="space-y-1">{lines}</div>;
};

const OrderDetailsView: FC<{
    order: CrmOrder;
    allFactories: Factory[];
    supabase: any;
    onUpdate: (o: CrmOrder) => void;
    onSelectProduct?: (id: string) => void;
}> = ({ order, allFactories, supabase, onUpdate, onSelectProduct }) => {
    const { showToast } = useToast();
    const factory = allFactories.find(f => f.id === order.factoryId || f.id === (order as any).factory_id);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createdDate = order.createdAt || (order as any).created_at;
    const formattedDate = createdDate
        ? new Date(createdDate).toLocaleDateString()
        : 'N/A';

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        if (!order.id) {
            showToast("Cannot upload: order ID is missing", "error");
            return;
        }
        if (!supabase) {
            showToast("File upload service not available", "error");
            return;
        }

        setUploading(true);
        try {
            const fileName = `crm/${order.id}/${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage.from('quote-attachments').upload(fileName, file);

            if (error) throw error;

            const newDoc: CrmDocument = {
                name: file.name,
                type: file.type || 'File',
                lastUpdated: new Date().toISOString().split('T')[0],
                path: data.path,
            };

            const updatedDocuments = [...(order.documents || []), newDoc];
            const { error: updateError } = await crmService.update(order.id, { documents: updatedDocuments } as any);
            if (updateError) throw updateError;

            onUpdate({ ...order, documents: updatedDocuments });
            showToast("File uploaded successfully", "success");
        } catch (err: any) {
            console.error("Upload failed", err);
            showToast(`Failed to upload file: ${err.message}`, "error");
        } finally {
            setUploading(false);
            // Reset input so the same file can be re-uploaded if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownload = async (path: string | undefined, filename: string) => {
        if (!supabase || !path) return;
        try {
            const { data, error } = await supabase.storage.from('quote-attachments').createSignedUrl(path, 60);
            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
        } catch (err: any) {
            console.error("Download failed", err);
            showToast("Failed to download file", "error");
        }
    };

    return (
        <div className="space-y-6">
            {/* General Info & Factory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Order Information</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Order ID</span>
                            <span className="font-mono font-medium text-gray-900 dark:text-white">{order.id ?? '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Status</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getOrderStatusColor(order.status ?? '')}`}>{order.status}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Created Date</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formattedDate}</span>
                        </div>
                        {order.destinationCountry && (
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                    <MapPin size={13} />
                                    Destination
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">{order.destinationCountry}</span>
                            </div>
                        )}
                        {(order.shippingPort || order.portOfDischarge) && (
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                    <Anchor size={13} />
                                    Port of Discharge
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {order.portOfDischarge || order.shippingPort}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Factory Details</h3>
                    {factory ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3">
                                {factory.imageUrl && (
                                    <img
                                        src={factory.imageUrl}
                                        alt={factory.name}
                                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                )}
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{factory.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{factory.location}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400">MOQ: {factory.minimumOrderQuantity ?? '—'}</p>
                                <p className="text-gray-500 dark:text-gray-400">Rating: {factory.rating ?? '—'} / 5.0</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No factory assigned</p>
                    )}
                </div>
            </div>

            {/* Products */}
            {(() => {
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
                const products = order.products && order.products.length > 0
                    ? order.products
                    : [{ id: 'default', name: order.product, status: order.status, quantity: undefined }];
                const tasks = order.tasks || [];

                return (
                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:shadow-xl">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-md">
                                <Package size={16} className="text-white" />
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
                                        key={product.id ?? idx}
                                        onClick={() => onSelectProduct?.(product.id)}
                                        className="relative p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/50 dark:to-gray-700/30"
                                    >
                                        <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-xl bg-gradient-to-b ${colorGradient}`} />
                                        <div className="ml-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-[#c20c0b] dark:group-hover:text-red-400 transition-colors">
                                                        {product.name}
                                                    </h4>
                                                    {product.quantity != null && (
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
                                                <div className="flex items-center gap-2 text-gray-400 group-hover:text-[#c20c0b] dark:group-hover:text-red-400 transition-colors flex-shrink-0">
                                                    <span className="text-xs font-semibold hidden sm:inline">View Details</span>
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
                );
            })()}

            {/* Attachments */}
            <div className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Attachments</h3>
                    <label className={`cursor-pointer flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        {uploading ? 'Uploading...' : 'Add File'}
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {order.documents?.map((doc, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{doc.type} • {doc.lastUpdated}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownload(doc.path, doc.name)}
                                    disabled={!doc.path}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={doc.path ? 'Download' : 'No file path available'}
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {(!order.documents || order.documents.length === 0) && (
                        <div className="p-8 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No attachments found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function CrmOrderDetail({
    orderId, order, allFactories, handleSetCurrentPage, onBack, callGeminiAPI, darkMode, supabase
}: CrmOrderDetailProps) {
    const [localOrder, setLocalOrder] = useState(order);
    const [activeView, setActiveView] = useState('Overview');
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [orderSummary, setOrderSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    useEffect(() => {
        setLocalOrder(order);
    }, [order]);

    const status = localOrder.status || 'In Production';

    const filteredTasks = useMemo(() => {
        if (!selectedProductId) return localOrder.tasks;
        return localOrder.tasks.filter(t => t.productId === selectedProductId);
    }, [localOrder.tasks, selectedProductId]);

    const selectedProduct = useMemo(() => {
        if (!selectedProductId || !localOrder.products) return null;
        return localOrder.products.find(p => p.id === selectedProductId) || null;
    }, [selectedProductId, localOrder.products]);

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
        const products = localOrder.products || [{ id: 'default', name: localOrder.product }];
        const productDetails = products.map(p => {
            const pTasks = localOrder.tasks.filter(t => t.productId === p.id);
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
                        {selectedProduct ? selectedProduct.name : localOrder.product}
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
                    {activeView === 'Overview' && (
                        <OrderDetailsView
                            order={localOrder}
                            allFactories={allFactories}
                            supabase={supabase}
                            onUpdate={setLocalOrder}
                            onSelectProduct={handleSelectProduct}
                        />
                    )}
                    {activeView === 'TNA' && <TNAView tasks={localOrder.tasks} />}
                    {activeView === 'Dashboard' && <DashboardView tasks={localOrder.tasks} orderKey={orderId} orderDetails={localOrder} darkMode={darkMode} />}
                    {activeView === 'List' && <ListView tasks={filteredTasks} />}
                    {activeView === 'Board' && <BoardView tasks={filteredTasks} />}
                    {activeView === 'Gantt' && <GanttChartView tasks={filteredTasks} />}
                </div>
            </div>

            {/* AI Summary Modal */}
            {isSummaryModalOpen && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fade-in"
                    onClick={() => setIsSummaryModalOpen(false)}
                >
                    <div
                        className="bg-white/90 backdrop-blur-xl dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative border border-gray-200 dark:border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
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
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c20c0b]" />
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
