import React, { useState, useMemo, FC, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { CrmOrder, CrmProduct, CrmTask, Factory } from './types';
import { getOrderStatusColor } from './utils';
import { useToast } from './ToastContext';
import {
    ArrowLeft, ArrowRight, Info, List, LayoutDashboard, ClipboardCheck,
    PieChart as PieChartIcon, GanttChartSquare, Bot, X,
    FileText, Download, Plus, RefreshCw,
    Package, Clock, CheckCircle, AlertCircle, MapPin, Anchor,
    Eye, Trash2, Upload, AlertTriangle, ShieldAlert, ShieldCheck, ShieldX,
    Search, ChevronLeft
} from 'lucide-react';
import { updateOrderRiskScore, calculateOrderRiskScore, updateFactoryMetricsOnCompletion } from './risk.service';
import { useOrgPermissions } from './OrgContext';
import jsPDF from 'jspdf';
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
// --- AI Summary Infographic Components ---

const CircularProgress: FC<{ percent: number; size?: number; strokeWidth?: number; color?: string }> = ({ percent, size = 64, strokeWidth = 5, color = '#c20c0b' }) => {
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

const StatusDistributionBar: FC<{ completed: number; inProgress: number; todo: number; overdue: number; total: number }> = ({ completed, inProgress, todo, overdue, total }) => {
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

const RiskGauge: FC<{ level: string }> = ({ level }) => {
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

const MilestoneTimeline: FC<{ lines: string[] }> = ({ lines }) => (
    <div className="relative pl-4">
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-violet-400 to-purple-600 rounded-full" />
        {lines.map((line, i) => (
            <div key={i} className="relative flex items-start gap-3 py-2">
                <div className="absolute left-[-13px] top-3 w-3 h-3 rounded-full bg-white dark:bg-gray-800 border-2 border-violet-500 shadow-sm shadow-violet-500/30 z-10" />
                <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{renderInlineBold(line.replace(/^-\s*/, ''))}</span>
            </div>
        ))}
    </div>
);

const sectionConfig: Record<string, { icon: React.ReactNode; gradient: string; bgGlow: string }> = {
    'executive summary': {
        icon: <ClipboardCheck size={15} className="text-white" />,
        gradient: 'from-[#c20c0b] via-red-600 to-pink-600',
        bgGlow: 'bg-red-500/5 dark:bg-red-500/10',
    },
    'current progress': {
        icon: <Clock size={15} className="text-white" />,
        gradient: 'from-amber-500 via-orange-500 to-red-400',
        bgGlow: 'bg-amber-500/5 dark:bg-amber-500/10',
    },
    'upcoming milestones': {
        icon: <Anchor size={15} className="text-white" />,
        gradient: 'from-violet-500 via-purple-500 to-pink-500',
        bgGlow: 'bg-violet-500/5 dark:bg-violet-500/10',
    },
    'risk assessment': {
        icon: <AlertTriangle size={15} className="text-white" />,
        gradient: 'from-rose-500 via-red-500 to-orange-500',
        bgGlow: 'bg-rose-500/5 dark:bg-rose-500/10',
    },
    'recommended actions': {
        icon: <CheckCircle size={15} className="text-white" />,
        gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
        bgGlow: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    },
};

const renderInlineBold = (str: string) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={i} className="font-semibold text-gray-800 dark:text-white">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
    );
};

interface AISummaryRendererProps {
    text: string;
    tasks: { status: string; plannedEndDate?: string; name: string }[];
}

const AISummaryRenderer: FC<AISummaryRendererProps> = ({ text, tasks }) => {
    if (!text) return null;
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

    const totalTasks = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETE').length;
    const inProgress = tasks.filter(t => t.status === 'IN PROGRESS').length;
    const overdue = tasks.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < new Date() && t.status !== 'COMPLETE').length;
    const todo = tasks.filter(t => t.status === 'TO DO').length;
    const pct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return (
        <div className="space-y-4">
            {sections.map((section, idx) => {
                const key = section.title.toLowerCase();
                const config = sectionConfig[key] || { icon: <Info size={15} className="text-white" />, gradient: 'from-gray-500 to-gray-600', bgGlow: '' };

                // Detect risk level from content
                const riskLevel = key === 'risk assessment' ? (section.lines.join(' ')) : '';

                return (
                    <div key={idx} className={`rounded-2xl border border-gray-200/80 dark:border-gray-700/30 overflow-hidden ${config.bgGlow} backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300`}>
                        {section.title && (
                            <div className={`bg-gradient-to-r ${config.gradient} px-4 py-3 flex items-center gap-2.5 relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-40" />
                                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                                    {config.icon}
                                </div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider relative z-10">{section.title}</h3>
                            </div>
                        )}
                        <div className="p-4 space-y-3">
                            {/* Infographic for Executive Summary */}
                            {key === 'executive summary' && (
                                <div className="flex items-center gap-5 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700/30">
                                    <div className="relative flex-shrink-0">
                                        <CircularProgress percent={pct} size={72} strokeWidth={6} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-base font-bold text-gray-800 dark:text-white">{pct}%</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <StatusDistributionBar completed={completed} inProgress={inProgress} todo={todo} overdue={overdue} total={totalTasks} />
                                    </div>
                                </div>
                            )}

                            {/* Infographic for Current Progress */}
                            {key === 'current progress' && inProgress > 0 && (
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

                            {/* Timeline for Upcoming Milestones */}
                            {key === 'upcoming milestones' && section.lines.some(l => l.startsWith('- ')) ? (
                                <MilestoneTimeline lines={section.lines.filter(l => l.startsWith('- '))} />
                            ) : key === 'upcoming milestones' ? (
                                section.lines.map((line, i) => <p key={i} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{renderInlineBold(line.replace(/^-\s*/, ''))}</p>)
                            ) : null}

                            {/* Risk Gauge for Risk Assessment */}
                            {key === 'risk assessment' && (
                                <div className="pb-3 mb-3 border-b border-gray-100 dark:border-gray-700/30">
                                    <RiskGauge level={riskLevel} />
                                </div>
                            )}

                            {/* Checklist for Recommended Actions */}
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

                            {/* Default bullet rendering for sections without special infographics */}
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
    );
};

// Keep simple MarkdownRenderer as alias for backward compat
const MarkdownRenderer: FC<{ text: string }> = ({ text }) => (
    <AISummaryRenderer text={text} tasks={[]} />
);

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(filename: string): boolean {
    return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(filename);
}

export const RiskBadge: FC<{ score?: 'green' | 'amber' | 'red' }> = ({ score = 'green' }) => {
    if (score === 'red') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-700">
            <ShieldX size={10} /> Critical Risk
        </span>
    );
    if (score === 'amber') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
            <ShieldAlert size={10} /> At Risk
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-700">
            <ShieldCheck size={10} /> On Track
        </span>
    );
};

const OrderDetailsView: FC<{
    order: CrmOrder;
    allFactories: Factory[];
    supabase: any;
    onUpdate: (o: CrmOrder) => void;
    onSelectProduct?: (id: string) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
}> = ({ order, allFactories, supabase, onUpdate, onSelectProduct, handleSetCurrentPage }) => {
    const { showToast } = useToast();
    const { can } = useOrgPermissions();
    const canEdit = can('crm', 'edit');
    let factory = allFactories.find(f => f.id === order.factoryId || f.id === (order as any).factory_id);
    if (!factory && (order as any).factory) {
        const f = (order as any).factory;
        factory = {
            ...f,
            imageUrl: f.imageUrl || f.cover_image_url,
            minimumOrderQuantity: f.minimumOrderQuantity || f.minimum_order_quantity
        } as Factory;
    }
    const hasCustomFactory = !factory && !!((order as any).custom_factory_name);
    const [uploading, setUploading] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ doc: any; origIdx: number } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState('');
    const [loadingPreviewIdx, setLoadingPreviewIdx] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createdDate = order.createdAt || (order as any).created_at;
    const formattedDate = createdDate
        ? new Date(createdDate).toLocaleDateString()
        : 'N/A';

    // Step 1: intercept file selection, show confirmation dialog
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setPendingFile(e.target.files[0]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Step 2: user confirmed — do the upload
    const handleConfirmUpload = async () => {
        if (!pendingFile) return;
        const file = pendingFile;
        setPendingFile(null);

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

            const newDoc: any = {
                name: file.name,
                type: file.type || 'File',
                lastUpdated: new Date().toISOString().split('T')[0],
                path: data.path,
                source: 'client'
            };

            const updatedDocuments = [...(order.documents || []), newDoc];
            const { error: updateError } = await supabase
                .from('crm_orders')
                .update({ documents: updatedDocuments })
                .eq('id', order.id);
            if (updateError) throw updateError;

            onUpdate({ ...order, documents: updatedDocuments });
            showToast("File uploaded successfully", "success");
        } catch (err: any) {
            console.error("Upload failed", err);
            showToast(`Failed to upload file: ${err.message}`, "error");
        } finally {
            setUploading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteDoc || !supabase || !order.id) return;
        setDeleting(true);
        try {
            const { doc, origIdx } = confirmDeleteDoc;
            if (doc.path) {
                await supabase.storage.from('quote-attachments').remove([doc.path]);
            }
            const updatedDocuments = (order.documents || []).filter((_: any, i: number) => i !== origIdx);
            const { error: updateError } = await supabase
                .from('crm_orders')
                .update({ documents: updatedDocuments })
                .eq('id', order.id);
            if (updateError) throw updateError;
            onUpdate({ ...order, documents: updatedDocuments });
            showToast("File deleted", "success");
        } catch (err: any) {
            console.error("Delete failed", err);
            showToast(`Failed to delete file: ${err.message}`, "error");
        } finally {
            setDeleting(false);
            setConfirmDeleteDoc(null);
        }
    };

    const handlePreview = async (path: string | undefined, filename: string, origIdx: number) => {
        if (!supabase || !path) return;
        setLoadingPreviewIdx(origIdx);
        try {
            const { data, error } = await supabase.storage.from('quote-attachments').createSignedUrl(path, 300);
            if (error) throw error;
            if (data?.signedUrl) {
                if (isImageFile(filename)) {
                    setPreviewName(filename);
                    setPreviewUrl(data.signedUrl);
                } else {
                    window.open(data.signedUrl, '_blank');
                }
            }
        } catch (err: any) {
            console.error("Preview failed", err);
            showToast("Failed to preview file", "error");
        } finally {
            setLoadingPreviewIdx(null);
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

    // Build indexed doc lists from the source array so original indices are preserved for deletion
    const allDocs: any[] = order.documents || [];
    const clientDocs = allDocs.map((doc, origIdx) => ({ doc, origIdx })).filter(({ doc }) => doc.source === 'client' || !doc.source);
    const companyDocs = allDocs.map((doc, origIdx) => ({ doc, origIdx })).filter(({ doc }) => doc.source === 'company');

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
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">MOQ</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{factory.minimumOrderQuantity?.toLocaleString() ?? '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Rating</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{factory.rating ?? '—'} / 5.0</span>
                                </div>
                                {factory.turnaround && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Turnaround</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{factory.turnaround}</span>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => handleSetCurrentPage('factoryDetail', factory)} className="w-full mt-2 py-2 px-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 shadow-sm">View Full Profile <ArrowRight size={12} /></button>
                        </div>
                    ) : hasCustomFactory ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0">
                                    <MapPin size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{(order as any).custom_factory_name}</p>
                                    {(order as any).custom_factory_location && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{(order as any).custom_factory_location}</p>
                                    )}
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full uppercase tracking-wide">Manually entered</span>
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
                        <div className="space-y-2">
                            {products.map((product, idx) => {
                                const productTasks = tasks.filter(t => t.productId === product.id);
                                const completedCount = productTasks.filter(t => t.status === 'COMPLETE').length;
                                const inProgressCount = productTasks.filter(t => t.status === 'IN PROGRESS').length;
                                const totalCount = productTasks.length;
                                const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                const colorGradient = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];
                                const overdueCount = productTasks.filter(t => t.status !== 'COMPLETE' && t.plannedEndDate && new Date(t.plannedEndDate) < new Date()).length;

                                return (
                                    <div
                                        key={product.id ?? idx}
                                        onClick={() => onSelectProduct?.(product.id)}
                                        className="relative px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700/60 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200 cursor-pointer group bg-white dark:bg-gray-800/30"
                                    >
                                        {/* Left accent bar */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${colorGradient}`} />

                                        {/* Top row: badge + name + badges + arrow */}
                                        <div className="flex items-start gap-2.5">
                                            <div className={`mt-0.5 ml-1 w-7 h-7 rounded-lg bg-gradient-to-br ${colorGradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                                <span className="text-[11px] font-bold text-white">{idx + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-1.5 flex-wrap mb-1.5">
                                                    <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-[#c20c0b] dark:group-hover:text-red-400 transition-colors leading-snug">
                                                        {product.name}
                                                    </span>
                                                    {product.status && (
                                                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${getOrderStatusColor(product.status)}`}>
                                                            {product.status}
                                                        </span>
                                                    )}
                                                    {overdueCount > 0 && (
                                                        <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                                            <AlertCircle size={9} />{overdueCount} late
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Progress bar */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full bg-gradient-to-r ${colorGradient} transition-all duration-700 ease-out`} style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 w-7 text-right">{progress}%</span>
                                                </div>
                                                {/* Stats row */}
                                                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{completedCount}/{totalCount} tasks done</span>
                                                    {inProgressCount > 0 && (
                                                        <span className="text-[10px] text-blue-500 dark:text-blue-400">{inProgressCount} active</span>
                                                    )}
                                                    {product.quantity != null && (
                                                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{product.quantity.toLocaleString()} units</span>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight size={14} className="mt-1 text-gray-300 dark:text-gray-600 group-hover:text-[#c20c0b] transition-colors flex-shrink-0" />
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
                    {canEdit && (
                        <label className={`cursor-pointer flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                            {uploading ? 'Uploading...' : 'Add File'}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                        </label>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
                    {/* Client Documents */}
                    <div className="p-4">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">My Documents</h4>
                        <div className="space-y-2">
                            {clientDocs.map(({ doc, origIdx }) => (
                                <div key={origIdx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 flex-shrink-0">
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                                            <p className="text-[10px] text-gray-500">{doc.lastUpdated}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handlePreview(doc.path, doc.name, origIdx)}
                                            title="Preview"
                                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                            {loadingPreviewIdx === origIdx
                                                ? <RefreshCw size={13} className="animate-spin" />
                                                : <Eye size={13} />}
                                        </button>
                                        <button
                                            onClick={() => handleDownload(doc.path, doc.name)}
                                            title="Download"
                                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <Download size={13} />
                                        </button>
                                        {canEdit && (
                                            <button
                                                onClick={() => setConfirmDeleteDoc({ doc, origIdx })}
                                                title="Delete"
                                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {clientDocs.length === 0 && (
                                <p className="text-xs text-gray-400 italic text-center py-2">No documents uploaded</p>
                            )}
                        </div>
                    </div>

                    {/* Company Documents */}
                    <div className="p-4">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Company Documents</h4>
                        <div className="space-y-2">
                            {companyDocs.map(({ doc, origIdx }) => (
                                <div key={origIdx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded text-purple-600 dark:text-purple-400 flex-shrink-0">
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                                            <p className="text-[10px] text-gray-500">{doc.type} • {doc.lastUpdated}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handlePreview(doc.path, doc.name, origIdx)}
                                            title="Preview"
                                            className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                        >
                                            {loadingPreviewIdx === origIdx
                                                ? <RefreshCw size={13} className="animate-spin" />
                                                : <Eye size={13} />}
                                        </button>
                                        <button
                                            onClick={() => handleDownload(doc.path, doc.name)}
                                            title="Download"
                                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <Download size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {companyDocs.length === 0 && (
                                <p className="text-xs text-gray-400 italic text-center py-2">No documents from Auctave</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Confirmation Dialog */}
            {pendingFile && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 animate-fade-in"
                    onClick={() => setPendingFile(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Upload size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Upload File</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Confirm before uploading</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{pendingFile.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(pendingFile.size)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPendingFile(null)}
                                className="flex-1 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmUpload}
                                className="flex-1 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <Upload size={14} />
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {confirmDeleteDoc && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 animate-fade-in"
                    onClick={() => setConfirmDeleteDoc(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Delete File</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">{confirmDeleteDoc.doc.name}</span>?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteDoc(null)}
                                disabled={deleting}
                                className="flex-1 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 animate-fade-in"
                    onClick={() => setPreviewUrl(null)}
                >
                    <div
                        className="relative max-w-4xl w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-white font-semibold text-sm truncate max-w-[80%]">{previewName}</p>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <img
                            src={previewUrl}
                            alt={previewName}
                            className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
                        />
                        <button
                            onClick={() => window.open(previewUrl, '_blank')}
                            className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            <Download size={14} />
                            Open full size
                        </button>
                    </div>
                </div>
            )}
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
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const summaryContentRef = useRef<HTMLDivElement>(null);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [taskSearch, setTaskSearch] = useState('');
    const [riskScore, setRiskScore] = useState<'green' | 'amber' | 'red'>(
        calculateOrderRiskScore(order.tasks)
    );

    useEffect(() => {
        setLocalOrder(order);
        setRiskScore(calculateOrderRiskScore(order.tasks));
    }, [order]);

    const status = localOrder.status || 'In Production';

    const filteredTasks = useMemo(() => {
        let tasks = selectedProductId
            ? localOrder.tasks.filter(t => t.productId === selectedProductId)
            : localOrder.tasks;
        if (taskSearch.trim()) {
            const q = taskSearch.toLowerCase();
            tasks = tasks.filter(t =>
                t.name?.toLowerCase().includes(q) ||
                t.responsible?.toLowerCase().includes(q) ||
                t.status?.toLowerCase().includes(q)
            );
        }
        return tasks;
    }, [localOrder.tasks, selectedProductId, taskSearch]);

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

    const { showToast } = useToast();
    const handleSaveTNATask = async (updatedTask: CrmTask) => {
        const updatedTasks = localOrder.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        const { error } = await supabase.from('crm_orders').update({ tasks: updatedTasks }).eq('id', orderId);
        if (error) throw error;
        setLocalOrder({ ...localOrder, tasks: updatedTasks });
        showToast('Task updated successfully', 'success');
        // Recalculate risk score
        const newScore = await updateOrderRiskScore(orderId, updatedTasks, riskScore, supabase);
        if (newScore !== riskScore) {
            setRiskScore(newScore);
            if (newScore === 'red') showToast('⚠️ Critical delay detected — order is now At Risk', 'error');
            else if (newScore === 'amber') showToast('Timeline risk detected — review milestones', 'error');
        }
    };

    const handleOrderStatusChange = async (newStatus: CrmOrder['status']) => {
        if (!supabase) return;
        const { error } = await supabase.from('crm_orders').update({ status: newStatus }).eq('id', orderId);
        if (error) { showToast('Failed to update status', 'error'); return; }
        setLocalOrder(prev => ({ ...prev, status: newStatus }));
        showToast(`Order status updated to ${newStatus}`, 'success');
        if (newStatus === 'Completed') {
            const factory = allFactories.find(f => f.id === localOrder.factoryId || f.id === (localOrder as any).factory_id);
            if (factory?.id) {
                await updateFactoryMetricsOnCompletion(factory.id, localOrder.tasks, factory.completedOrdersCount ?? 0, supabase);
            }
        }
    };

    const generateOrderSummary = async () => {
        setIsSummaryModalOpen(true);
        setIsSummaryLoading(true);
        setOrderSummary('');
        const tasks = localOrder.tasks || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETE').length;
        const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS');
        const todoTasks = tasks.filter(t => t.status === 'TO DO');
        const overdueTasks = tasks.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < new Date() && t.status !== 'COMPLETE');
        const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const taskDetails = tasks.map(t => `- ${t.name}: ${t.status} (Due: ${t.plannedEndDate || 'N/A'})`).join('\n');
        const prompt = `You are a garment production project manager writing a structured order report. Be concise, data-driven, and actionable.

Order: ${localOrder.product} (ID: ${orderId})
Customer: ${localOrder.customer}
Products: ${localOrder.products?.map(p => p.name).join(', ') || localOrder.product}
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

            // --- Header banner ---
            pdf.setFillColor(194, 12, 11);
            pdf.rect(0, 0, pageWidth, 32, 'F');
            // Accent stripe
            pdf.setFillColor(160, 8, 8);
            pdf.rect(0, 32, pageWidth, 1.5, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('AI Project Report', margin, 14);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${localOrder.product} — ${localOrder.customer}`, margin, 22);
            pdf.setFontSize(8);
            pdf.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - margin, 14, { align: 'right' });
            pdf.text(`Order ID: ${orderId}`, pageWidth - margin, 22, { align: 'right' });

            y = 38;

            // --- Stats bar ---
            const tasks = localOrder.tasks || [];
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
                // Divider line
                if (i < 3) {
                    pdf.setDrawColor(220, 220, 220);
                    pdf.line(margin + statW * (i + 1), y + 3, margin + statW * (i + 1), y + 15);
                }
            });

            // Progress bar
            y += 22;
            pdf.setFillColor(235, 235, 235);
            pdf.roundedRect(margin, y, contentWidth, 3, 1.5, 1.5, 'F');
            if (done > 0) {
                pdf.setFillColor(16, 185, 129);
                pdf.roundedRect(margin, y, contentWidth * (done / total), 3, 1.5, 1.5, 'F');
            }
            if (active > 0) {
                pdf.setFillColor(245, 158, 11);
                pdf.rect(margin + contentWidth * (done / total), y, contentWidth * (active / total), 3, 'F');
            }
            if (overdue > 0) {
                pdf.setFillColor(239, 68, 68);
                const overdueStart = margin + contentWidth * ((done + active) / total);
                pdf.rect(overdueStart, y, contentWidth * (overdue / total), 3, 'F');
            }

            y += 10;

            // --- Parse and render sections ---
            const sections: { title: string; lines: string[] }[] = [];
            let current: { title: string; lines: string[] } | null = null;
            orderSummary.split('\n').forEach(line => {
                if (line.startsWith('###')) {
                    if (current) sections.push(current);
                    current = { title: line.replace(/^###\s*/, '').trim(), lines: [] };
                } else if (current) {
                    if (line.trim()) current.lines.push(line.trim());
                } else if (line.trim()) {
                    if (!current) current = { title: '', lines: [line.trim()] };
                }
            });
            if (current) sections.push(current);

            sections.forEach(section => {
                checkPage(25);

                // Section header with colored bar
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

                // Section content
                section.lines.forEach(line => {
                    checkPage(8);
                    const cleanLine = line.replace(/\*\*/g, '');
                    const isBullet = line.startsWith('- ');
                    const bulletText = isBullet ? cleanLine.substring(2) : cleanLine;

                    if (isBullet) {
                        // Colored bullet dot
                        pdf.setFillColor(...color);
                        pdf.circle(margin + 2, y - 0.5, 0.8, 'F');
                        pdf.setTextColor(60, 60, 60);
                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', 'normal');
                        const wrappedLines = pdf.splitTextToSize(bulletText, contentWidth - 8);
                        pdf.text(wrappedLines, margin + 6, y);
                        y += wrappedLines.length * 4.5 + 1.5;
                    } else {
                        // Check if line has bold markers
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

            // --- Footer on every page ---
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

            const fileName = `AI-Report-${(localOrder.product || 'Order').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(fileName);
        } catch (err) {
            console.error('PDF download failed:', err);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* ── Sticky mobile header (portal) ── */}
            {ReactDOM.createPortal(
                <div className="fixed top-0 left-0 md:left-[76px] right-0 z-[45] h-14
                    bg-white/85 dark:bg-[#18171c]/90 backdrop-blur-xl
                    border-b border-gray-200/70 dark:border-white/8
                    flex items-center gap-3 px-3 sm:hidden">
                    {/* Back button */}
                    <button
                        onClick={selectedProductId ? handleBackToOverview : onBack}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10
                            flex items-center justify-center
                            hover:bg-gray-200 dark:hover:bg-white/18 active:scale-90
                            transition-all duration-150"
                        aria-label="Go back"
                    >
                        <ChevronLeft size={20} className="text-gray-700 dark:text-white" />
                    </button>
                    {/* Order / product name */}
                    <span className="flex-1 min-w-0 font-bold text-sm text-gray-900 dark:text-white truncate">
                        {selectedProduct ? selectedProduct.name : localOrder.product}
                    </span>
                    {/* Search bar */}
                    <div className="relative flex-shrink-0">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={taskSearch}
                            onChange={e => setTaskSearch(e.target.value)}
                            placeholder="Search tasks…"
                            className="w-32 pl-7 pr-6 py-[7px] text-[13px] rounded-full
                                bg-gray-100 dark:bg-white/10
                                border border-gray-200 dark:border-white/12
                                text-gray-900 dark:text-white
                                placeholder-gray-400 dark:placeholder-gray-500
                                focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/35 focus:border-[#c20c0b]/50
                                transition-all"
                        />
                        {taskSearch && (
                            <button
                                onClick={() => setTaskSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={11} />
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Mobile spacer for sticky header */}
            <div className="h-14 -mt-4 sm:hidden" />

            {/* Desktop header (hidden on mobile) */}
            <div className="hidden sm:flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={selectedProductId ? handleBackToOverview : onBack}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] dark:hover:text-[#c20c0b] transition-colors flex-shrink-0"
                    >
                        <ArrowLeft size={18} />
                        <span>{selectedProductId ? 'Overview' : 'Back'}</span>
                    </button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white truncate">
                        {selectedProduct ? selectedProduct.name : localOrder.product}
                    </h2>
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${getOrderStatusColor(selectedProduct?.status || status)}`}>
                        {selectedProduct?.status || status}
                    </span>
                    {!selectedProductId && <RiskBadge score={riskScore} />}
                </div>
                <div className="flex items-center gap-2">
                    {/* Desktop search */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={taskSearch}
                            onChange={e => setTaskSearch(e.target.value)}
                            placeholder="Search tasks…"
                            className="w-44 pl-8 pr-7 py-[7px] text-[13px] rounded-full
                                bg-gray-100 dark:bg-white/10
                                border border-gray-200 dark:border-white/12
                                text-gray-900 dark:text-white
                                placeholder-gray-400 dark:placeholder-gray-500
                                focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/35
                                transition-all"
                        />
                        {taskSearch && (
                            <button onClick={() => setTaskSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={generateOrderSummary}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-[#c20c0b] rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-semibold flex-shrink-0"
                    >
                        <Bot size={16} />
                        <span>AI Summary</span>
                    </button>
                </div>
            </div>

            {/* View tabs */}
            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-white/10 px-2 sm:px-6 pt-3 sm:pt-4 pb-0">
                    <div className="flex items-center gap-0.5 sm:gap-1 -mb-px">
                        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide flex-1">
                            {currentViews.map(view => (
                                <button
                                    key={view.name}
                                    onClick={() => setActiveView(view.name)}
                                    className={`flex items-center gap-1.5 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                                        activeView === view.name
                                            ? 'border-[#c20c0b] text-[#c20c0b] dark:text-red-400 bg-red-50/50 dark:bg-red-900/10'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    {view.icon}
                                    <span>{view.name}</span>
                                </button>
                            ))}
                        </div>
                        {/* AI Report button - tab area (mobile) / hidden on desktop since it's in the header */}
                        <button
                            onClick={generateOrderSummary}
                            className="sm:hidden flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 mb-1 rounded-lg bg-[#c20c0b]/10 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 text-[11px] font-bold hover:bg-[#c20c0b]/20 active:scale-95 transition-all border-b-2 border-transparent"
                            aria-label="AI Report"
                        >
                            <Bot size={13} />
                            <span>AI</span>
                        </button>
                    </div>
                </div>

                {/* View content */}
                <div className="p-3 sm:p-6">
                    {activeView === 'Overview' && (
                        <OrderDetailsView
                            order={localOrder}
                            allFactories={allFactories}
                            supabase={supabase}
                            onUpdate={setLocalOrder}
                            onSelectProduct={handleSelectProduct}
                            handleSetCurrentPage={handleSetCurrentPage}
                        />
                    )}
                    {activeView === 'TNA' && (
                        <TNAView
                            tasks={localOrder.tasks}
                            products={localOrder.products}
                        />
                    )}
                    {activeView === 'Dashboard' && <DashboardView tasks={localOrder.tasks} orderKey={orderId} orderDetails={localOrder} darkMode={darkMode} />}
                    {activeView === 'List' && <ListView tasks={filteredTasks} />}
                    {activeView === 'Board' && <BoardView tasks={filteredTasks} />}
                    {activeView === 'Gantt' && <GanttChartView tasks={filteredTasks} />}
                </div>
            </div>

            {/* AI Summary Modal */}
            {isSummaryModalOpen && (() => {
                const mTasks = localOrder.tasks || [];
                const mTotal = mTasks.length;
                const mCompleted = mTasks.filter(t => t.status === 'COMPLETE').length;
                const mInProgress = mTasks.filter(t => t.status === 'IN PROGRESS').length;
                const mOverdue = mTasks.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < new Date() && t.status !== 'COMPLETE').length;
                const mPct = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;
                return ReactDOM.createPortal(
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] sm:p-4 animate-fade-in"
                    onClick={() => setIsSummaryModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-950 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-red-500/5 w-full sm:max-w-3xl sm:max-h-[90vh] max-h-[92vh] flex flex-col relative border border-gray-200 dark:border-white/5 animate-scale-in overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Solid Dark Red Header */}
                        <div className="relative flex-shrink-0 bg-[#c20c0b] px-4 sm:px-6 py-4 sm:py-5 overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/4" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/4" />
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 sm:mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">AI Project Report</h2>
                                            <p className="text-xs text-white/60 mt-0.5 truncate max-w-[180px] sm:max-w-none">{localOrder.product} • {localOrder.customer}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsSummaryModalOpen(false)}
                                        className="p-2 text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                {/* Quick Stats Bar */}
                                {!isSummaryLoading && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                                            <div className="relative mx-auto w-10 h-10 mb-1">
                                                <CircularProgress percent={mPct} size={40} strokeWidth={3} color="white" />
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{mPct}%</span>
                                            </div>
                                            <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Progress</p>
                                        </div>
                                        <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                                            <p className="text-2xl font-bold text-white">{mCompleted}</p>
                                            <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Done</p>
                                        </div>
                                        <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                                            <p className="text-2xl font-bold text-white">{mInProgress}</p>
                                            <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Active</p>
                                        </div>
                                        <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 text-center border border-white/10">
                                            <p className={`text-2xl font-bold ${mOverdue > 0 ? 'text-yellow-300' : 'text-white/40'}`}>{mOverdue}</p>
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
                                <AISummaryRenderer text={orderSummary} tasks={mTasks} />
                            )}
                        </div>
                        {/* Footer */}
                        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
                            {/* Mobile: stacked layout */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Powered by Gemini AI
                                </p>
                                <div className="flex items-center gap-2">
                                    {!isSummaryLoading && orderSummary && (
                                        <button
                                            onClick={downloadSummaryPdf}
                                            disabled={isDownloadingPdf}
                                            className="flex-1 sm:flex-none text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors px-3 py-2 sm:py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                        >
                                            <Download size={12} className={isDownloadingPdf ? 'animate-bounce' : ''} /> {isDownloadingPdf ? 'Exporting...' : 'Download PDF'}
                                        </button>
                                    )}
                                    <button
                                        onClick={generateOrderSummary}
                                        disabled={isSummaryLoading}
                                        className="flex-1 sm:flex-none text-xs font-semibold text-[#c20c0b] hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors px-3 py-2 sm:py-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200/50 dark:border-red-800/30"
                                    >
                                        <RefreshCw size={12} className={isSummaryLoading ? 'animate-spin' : ''} /> Regenerate
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
                );
            })()}
        </div>
    );
}
