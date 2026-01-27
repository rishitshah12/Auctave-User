import React, { useState, FC, useRef, useEffect, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MainLayout } from './MainLayout';
import { QuoteRequest, NegotiationHistoryItem } from './types';
import { quoteService } from './quote.service';
import {
    ChevronLeft, ChevronRight, MapPin, Calendar, Package, Shirt, DollarSign, Clock, ArrowRight,
    FileText, MessageSquare, CheckCircle, AlertCircle, X, Globe, Download, ChevronDown, ChevronUp, History, Printer, Check, CheckCheck, Eye, RefreshCw, Image as ImageIcon, Edit, Scale, Paperclip, Send, Circle,
    Layers, Scissors, Factory, ShieldCheck, Truck, LifeBuoy, ClipboardList, Plus, Trash2, GripVertical
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';

interface QuoteDetailPageProps {
    selectedQuote: QuoteRequest | null;
    handleSetCurrentPage: (page: string, data?: any) => void;
    updateQuoteStatus: (id: string, status: string, additionalData?: any) => void;
    createCrmOrder: (quote: QuoteRequest) => void;
    layoutProps: any;
}

const formatFriendlyDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (isToday) return `Today at ${timeStr}`;
    if (isYesterday) return `Yesterday at ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
};

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

interface ExecutionStep {
    title: string;
    description: string;
}

const DEFAULT_EXECUTION_PLAN: ExecutionStep[] = [
    { title: "Raw Material Sourcing", description: "Fabric and trims will be sourced from our centralized warehouse to ensure consistency and availability." },
    { title: "Fabric Cutting", description: "Cutting will be carried out at one of our trusted partner factories using standardized cutting methods." },
    { title: "Production Allocation", description: "Production will be distributed across two verified partner factories to maintain timelines and capacity efficiency." },
    { title: "Quality Control", description: "Daily in-line quality checks at partner factories. Final quality inspection upon receipt at the factori.com warehouse." },
    { title: "Packaging", description: "Finished goods will be packed in bundled form as per agreed packaging instructions." },
    { title: "Dispatch & Delivery", description: "Goods will be dispatched after final QC and delivered to Pune. Logistics coordination will be managed post-production." },
    { title: "Risk Mitigation", description: "In case of delays at any single unit, production will be balanced across partner factories to safeguard timelines." }
];

const STEP_COLORS = [
    { bg: 'bg-blue-100 dark:bg-blue-900/20', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', subtleBorder: 'border-blue-200 dark:border-blue-800' },
    { bg: 'bg-purple-100 dark:bg-purple-900/20', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400', subtleBorder: 'border-purple-200 dark:border-purple-800' },
    { bg: 'bg-emerald-100 dark:bg-emerald-900/20', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', subtleBorder: 'border-emerald-200 dark:border-emerald-800' },
    { bg: 'bg-amber-100 dark:bg-amber-900/20', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', subtleBorder: 'border-amber-200 dark:border-amber-800' },
    { bg: 'bg-pink-100 dark:bg-pink-900/20', border: 'border-pink-500', text: 'text-pink-600 dark:text-pink-400', subtleBorder: 'border-pink-200 dark:border-pink-800' },
    { bg: 'bg-cyan-100 dark:bg-cyan-900/20', border: 'border-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', subtleBorder: 'border-cyan-200 dark:border-cyan-800' },
    { bg: 'bg-rose-100 dark:bg-rose-900/20', border: 'border-rose-500', text: 'text-rose-600 dark:text-rose-400', subtleBorder: 'border-rose-200 dark:border-rose-800' },
];

export const QuoteDetailPage: FC<QuoteDetailPageProps> = ({
    selectedQuote: initialQuote,
    handleSetCurrentPage,
    updateQuoteStatus,
    createCrmOrder,
    layoutProps
}) => {
    // Use local state for the quote so we can refresh it if needed
    const [quote, setQuote] = useState<QuoteRequest | null>(initialQuote);
    const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
    const [isExecutionPlanModalOpen, setIsExecutionPlanModalOpen] = useState(false);
    const [negotiatingItem, setNegotiatingItem] = useState<any | null>(null);
    const [historyModalData, setHistoryModalData] = useState<any | null>(null);
    const quoteDetailsRef = useRef<HTMLDivElement>(null);
    const pdfContentRef = useRef<HTMLDivElement>(null);
    const [fileLinks, setFileLinks] = useState<{ name: string; url: string }[]>([]);
    const [expandedItems, setExpandedItems] = useState<number[]>([]);
    const [chatStates, setChatStates] = useState<Record<number, { message: string; file: File | null }>>({});
    const [expandedExecutionSteps, setExpandedExecutionSteps] = useState<number[]>([]);
    const [isExecutionPlanExpanded, setIsExecutionPlanExpanded] = useState(true);

    const toggleExpand = (index: number) => {
        setExpandedItems(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };
    const fileLinksAbortController = useRef<AbortController | null>(null);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    // Lightbox state
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Filter for image files for the lightbox
    const imageFiles = fileLinks.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));

    useEffect(() => {
        const fetchFreshQuoteData = async () => {
            if (!initialQuote?.id) {
                setQuote(initialQuote);
                return;
            }

            // If files are already present, no need to fetch
            if (initialQuote.files && initialQuote.files.length > 0) {
                setQuote(initialQuote);
                return;
            }

            try {
                const { data, error } = await quoteService.getQuoteById(initialQuote.id);
                if (error) {
                    console.error('[QuoteDetailPage] Error fetching quote:', error);
                    setQuote(initialQuote); // Fallback to initial data on error
                    return;
                }
                if (data) {
                    // Combine initial data with freshly fetched data to ensure everything is up-to-date
                    setQuote({ ...initialQuote, ...data });
                }
            } catch (err) {
                console.error('[QuoteDetailPage] Exception fetching quote:', err);
                setQuote(initialQuote); // Fallback on exception
            }
        };

        fetchFreshQuoteData();
    }, [initialQuote]);

    useEffect(() => {
        if (quote) {
             const plan = (quote as any).execution_plan || DEFAULT_EXECUTION_PLAN;
             // Initialize all steps as expanded by default
             setExpandedExecutionSteps(plan.map((_: any, i: number) => i));
        }
    }, [quote]);

    const fetchSignedUrls = useCallback(async () => {
        console.log('[QuoteDetailPage] fetchSignedUrls called, quote.files:', quote?.files);
        if (!quote?.files || quote.files.length === 0) {
            console.log('[QuoteDetailPage] No files found in quote');
            setFileLinks([]);
            return;
        }

        const CACHE_KEY = `garment_erp_quote_files_${quote.id}`;
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp, links } = JSON.parse(cached);
            // Cache valid for 50 minutes (URLs expire in 60)
            // Also invalidate cache if it's empty but we now have files (data was updated)
            if (Date.now() - timestamp < 50 * 60 * 1000 && links.length > 0) {
                setFileLinks(links);
                return;
            }
        }

        setIsLoadingFiles(true);

        if (fileLinksAbortController.current) fileLinksAbortController.current.abort();
        fileLinksAbortController.current = new AbortController();
        const signal = fileLinksAbortController.current.signal;

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000));
                
                const urlsPromise = Promise.all(quote.files.map(async (path) => {
                    try {
                        // Ensure path doesn't have leading slash if not needed, or handle bucket prefix if present
                        const cleanPath = path.startsWith('quote-attachments/') ? path.replace('quote-attachments/', '') : path;
                        const { data, error } = await layoutProps.supabase.storage
                            .from('quote-attachments')
                            .createSignedUrl(cleanPath, 3600); // URL valid for 1 hour
                        
                        const fileName = path.split('/').pop() || 'document';
                        const cleanName = fileName.replace(/^\d+_/, '');

                        if (error) {
                            console.error(`[QuoteDetailPage] Error loading ${path}:`, error);
                            if (error.message.includes('row-level security') || error.message.includes('violates')) {
                                return { name: cleanName, url: '', error: 'Access Denied' };
                            }
                            return { name: cleanName, url: '' };
                        }

                        return {
                            name: cleanName,
                            url: data?.signedUrl || ''
                        };
                    } catch (err) {
                        console.error(`[QuoteDetailPage] Failed to load attachment: ${path}`, err);
                        const fileName = path.split('/').pop() || 'document';
                        const cleanName = fileName.replace(/^\d+_/, '');
                        return { name: cleanName, url: '' };
                    }
                }));

                const results = await Promise.race([urlsPromise, timeoutPromise]) as { name: string; url: string }[];
                const urls = results;

                if (!signal.aborted) {
                    const hasErrors = urls.some(u => !u.url);
                    setFileLinks(urls);
                    if (!hasErrors) {
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                            timestamp: Date.now(),
                            links: urls
                        }));
                    }
                    setIsLoadingFiles(false);
                }
                return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                console.warn(`[QuoteDetailPage] Attempt ${attempts + 1} failed:`, err);
                attempts++;
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
        
        // Fallback: If all retries failed, show files with error state
        if (!signal.aborted && fileLinks.length === 0) {
            setFileLinks(quote.files.map(path => ({
                name: path.split('/').pop()?.replace(/^\d+_/, '') || 'document',
                url: '',
                error: 'Failed to load'
            })));
            if (!signal.aborted) setIsLoadingFiles(false);
        }
    }, [quote, layoutProps.supabase]);

    useEffect(() => {
        fetchSignedUrls();
        return () => {
            if (fileLinksAbortController.current) fileLinksAbortController.current.abort();
        };
    }, [fetchSignedUrls]);

    const openLightbox = (fileUrl: string) => {
        const index = imageFiles.findIndex(img => img.url === fileUrl);
        if (index !== -1) {
            setCurrentImageIndex(index);
            setIsLightboxOpen(true);
        }
    };

    if (!quote) {
        handleSetCurrentPage('myQuotes');
        return null;
    }

    console.log('[QuoteDetailPage] Rendering with quote.files:', quote.files);

    const { factory, order, status, submittedAt, id, response_details } = quote;

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    const handleDownloadPdf = async () => {
        const input = pdfContentRef.current;
        if (!input) {
            showToast('Could not find content to download.', 'error');
            return;
        }

        showToast('Generating PDF...', 'success');

        try {
            // Create a temporary container to render the content for capture
            // This ensures the element is "visible" to html2canvas even if the original is hidden
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.top = '0';
            tempContainer.style.left = '0';
            tempContainer.style.zIndex = '-9999'; // Hide behind everything
            tempContainer.style.width = '800px'; // Fixed width for the quote template
            
            // Clone the content
            const clone = input.cloneNode(true) as HTMLElement;
            tempContainer.appendChild(clone);
            document.body.appendChild(tempContainer);

            // Helper to convert modern CSS colors (like oklch) to standard RGB/Hex for html2canvas
            const ctx = document.createElement('canvas').getContext('2d');
            const sanitizeColors = (element: HTMLElement) => {
                if (!ctx) return;
                const style = window.getComputedStyle(element);
                const processProperty = (prop: string) => {
                    const val = style.getPropertyValue(prop);
                    if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('lch') || val.includes('lab'))) {
                        ctx.fillStyle = val;
                        const converted = ctx.fillStyle;
                        if (converted) {
                             element.style.setProperty(prop, converted);
                        }
                    }
                };
                ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'fill', 'stroke'].forEach(processProperty);
            };

            // Apply sanitization to the clone and all its descendants
            sanitizeColors(clone);
            const allElements = clone.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
                sanitizeColors(allElements[i] as HTMLElement);
            }

            // Explicitly set crossOrigin for images to help html2canvas capture them
            const allImages = clone.getElementsByTagName('img');
            for (let i = 0; i < allImages.length; i++) {
                allImages[i].crossOrigin = "anonymous";
            }

            // Wait a brief moment for images/fonts to settle in the clone
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(clone, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800
            });

            // Clean up
            document.body.removeChild(tempContainer);

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'px',
                    format: 'a4'
                });
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = pdfWidth / imgWidth;
                const scaledHeight = imgHeight * ratio;

            if (scaledHeight > pdfHeight) {
                // Multi-page logic
                let heightLeft = scaledHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = heightLeft - scaledHeight; // Move image up
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
                    heightLeft -= pdfHeight;
                }
            } else {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight);
            }
                
                pdf.save(`Quote-Request-${id.slice(0, 8)}.pdf`);
                showToast('PDF downloaded successfully!', 'success');
        } catch (err: any) {
            console.error("PDF generation error:", err);
            showToast(`Failed to generate PDF: ${err.message || err}`, 'error');
        }
    };

    const handleSaveExecutionPlan = async (newPlan: ExecutionStep[]) => {
        if (!quote) return;
        const updatedQuote = { ...quote, execution_plan: newPlan };
        setQuote(updatedQuote as any);
        setIsExecutionPlanModalOpen(false);
        
        const { error } = await quoteService.update(quote.id, {
            execution_plan: newPlan
        } as any);
        
        if (error) {
            showToast('Failed to update execution plan', 'error');
        } else {
            showToast('Execution plan updated successfully');
        }
    };

    const handleToggleLineItemApproval = async (lineItemId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!quote) return;

        const currentApprovals = quote.negotiation_details?.clientApprovedLineItems || [];
        const isApproved = currentApprovals.includes(lineItemId);
        
        if (!isApproved) {
            if (!window.confirm("Are you sure you want to approve this product list item?")) return;
        }

        let newApprovals;
        if (isApproved) {
            newApprovals = currentApprovals.filter((id: number) => id !== lineItemId);
        } else {
            newApprovals = [...currentApprovals, lineItemId];
        }

        const updatedNegotiationDetails = {
            ...(quote.negotiation_details || {}),
            clientApprovedLineItems: newApprovals
        };

        // Check statuses
        const allLineItems = quote.order.lineItems;
        const allClientApproved = allLineItems.every(item => newApprovals.includes(item.id));
        const adminApprovals = quote.negotiation_details?.adminApprovedLineItems || [];
        const allAdminApproved = allLineItems.every(item => adminApprovals.includes(item.id));

        let newStatus = quote.status;
        let toastMessage = '';
        
        if (allClientApproved && allAdminApproved) {
            newStatus = 'Accepted';
            toastMessage = 'All items approved by both parties. Quote Accepted!';
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, ticks: 400 });
        } else if (allClientApproved) {
            newStatus = 'Client Accepted';
            toastMessage = 'All items approved. Quote marked as Client Approved.';
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, ticks: 400 });
        } else if (allAdminApproved) {
            newStatus = 'Admin Accepted';
        } else {
            newStatus = 'In Negotiation';
        }

        const updates: any = { status: newStatus, negotiation_details: updatedNegotiationDetails };
        if (newStatus === 'Accepted' && quote.status !== 'Accepted') {
            updates.response_details = { ...(quote.response_details || {}), acceptedAt: new Date().toISOString() };
        }

        // Optimistic update
        const updatedQuote = { ...quote, ...updates };
        setQuote(updatedQuote);
        updateQuoteStatus(quote.id, newStatus, updates);
        
        await quoteService.update(quote.id, updates);

        if (toastMessage && newStatus !== quote.status) showToast(toastMessage);

        if (newStatus === 'Accepted' && quote.status !== 'Accepted') {
             createCrmOrder(updatedQuote);
             handleSetCurrentPage('crm');
        }
    };

    const handleAcceptQuote = async () => {
        const newStatus: QuoteRequest['status'] = status === 'Admin Accepted' ? 'Accepted' : 'Client Accepted';
        const acceptedAt = new Date().toISOString();
        
        // Auto-approve all line items
        const allLineItemIds = quote.order.lineItems.map(i => i.id);
        const updatedNegotiationDetails = {
            ...(quote.negotiation_details || {}),
            clientApprovedLineItems: allLineItemIds
        };

        const updatedResponseDetails = response_details ? {
            ...response_details,
            acceptedAt: newStatus === 'Accepted' ? acceptedAt : undefined
        } : undefined;
        
        const { error } = await quoteService.update(id, { 
            status: newStatus, 
            response_details: updatedResponseDetails,
            negotiation_details: updatedNegotiationDetails
        });

        if (error) {
            showToast('Failed to update quote status: ' + error.message, 'error');
            return;
        }

        // Update local state
        const updatedQuote = { 
            ...quote, 
            status: newStatus, 
            response_details: updatedResponseDetails,
            negotiation_details: updatedNegotiationDetails
        };
        setQuote(updatedQuote);

        updateQuoteStatus(id, newStatus, { 
            acceptedAt: newStatus === 'Accepted' ? acceptedAt : undefined, 
            response_details: updatedResponseDetails,
            negotiation_details: updatedNegotiationDetails
        });
        
        if (newStatus === 'Accepted') {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, ticks: 400 });
            createCrmOrder(updatedQuote);
            showToast('Quote Accepted! A new order has been created in the CRM portal.');
            handleSetCurrentPage('crm');
        } else {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, ticks: 400 });
            showToast('Quote approved. Waiting for admin confirmation.');
        }
    };

    const handleDeclineQuote = async () => {
        if (!window.confirm('Are you sure you want to decline this quote?')) return;
        
        const { error } = await quoteService.update(id, { status: 'Declined' });

        if (error) {
            showToast('Failed to update quote status: ' + error.message, 'error');
            return;
        }

        updateQuoteStatus(id, 'Declined');
        showToast('Quote declined.');
        handleSetCurrentPage('myQuotes');
    };

    const handleNegotiationSubmit = async (counterPrice: string, details: string, lineItemNegotiations: any[]) => {
        const updatedLineItems = quote.order.lineItems.map(item => {
            const negotiation = lineItemNegotiations.find(neg => neg.lineItemId === item.id);
            if (negotiation && negotiation.counterPrice) {
                return { ...item, targetPrice: negotiation.counterPrice };
            }
            return item;
        });

        const updatedOrderDetails = {
            ...quote.order,
            lineItems: updatedLineItems
        };

        const newHistoryItem: NegotiationHistoryItem = {
            id: Date.now().toString(),
            sender: 'client' as const,
            message: details,
            price: counterPrice,
            timestamp: new Date().toISOString(),
            action: 'counter' as const,
            lineItemPrices: lineItemNegotiations.map(n => ({ lineItemId: n.lineItemId, price: n.counterPrice }))
        };

        const updatedHistory = [...(quote.negotiation_details?.history || []), newHistoryItem];

        const negotiationPayload = {
            counterPrice,
            message: details,
            submittedAt: new Date().toISOString(),
            lineItemNegotiations,
            history: updatedHistory
        };

        // Optimistic update: Update UI immediately before API call
        updateQuoteStatus(id, 'In Negotiation', { order: updatedOrderDetails, negotiation_details: negotiationPayload });
        setIsNegotiationModalOpen(false);
        showToast('Negotiation submitted. The quote is now marked as "In Negotiation".');

        const { error } = await quoteService.update(id, { 
            status: 'In Negotiation',
            order_details: updatedOrderDetails,
            negotiation_details: negotiationPayload
        });

        if (error) {
            showToast('Failed to update quote status: ' + error.message, 'error');
            // In a real app, we would revert the optimistic update here
            return;
        }
    };

    const handleSingleItemNegotiation = (price: string, note: string) => {
        if (!negotiatingItem) return;
        
        const lineItemNegotiations = [{
            lineItemId: negotiatingItem.id,
            counterPrice: price
        }];
        
        handleNegotiationSubmit(
            '', // No total price update for single item
            note || `Negotiation for ${negotiatingItem.category}`,
            lineItemNegotiations
        );
        setNegotiatingItem(null);
    };

    const PriceDifference: FC<{ target: string, quoted: string }> = ({ target, quoted }) => {
        const targetNum = parseFloat(target);
        if (!target || isNaN(targetNum) || targetNum === 0) return null;

        return (
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                Target: ${target}
            </div>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Responded': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Declined': return 'bg-red-50 text-red-700 border-red-200';
            case 'In Negotiation': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Admin Accepted': return 'bg-teal-50 text-teal-700 border-teal-200';
            case 'Client Accepted': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getStatusGradient = (status: string) => {
        switch (status) {
            case 'Pending': return 'from-amber-400 to-yellow-300';
            case 'Responded': return 'from-blue-500 to-cyan-400';
            case 'Accepted': return 'from-emerald-500 to-green-400';
            case 'Declined': return 'from-red-500 to-pink-500';
            case 'In Negotiation': return 'from-purple-500 to-indigo-400';
            case 'Admin Accepted': return 'from-teal-500 to-teal-400';
            case 'Client Accepted': return 'from-cyan-500 to-cyan-400';
            default: return 'from-gray-400 to-gray-300';
        }
    };

    const getLineItemHistory = (lineItemId: number) => {
        if (!quote?.negotiation_details?.history) return [];
        return quote.negotiation_details.history
            .filter(h => h.lineItemPrices?.some(p => p.lineItemId === lineItemId) || h.relatedLineItemId === lineItemId)
            .map(h => ({
                ...h,
                price: h.lineItemPrices?.find(p => p.lineItemId === lineItemId)?.price
            }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    };

    const negotiationHistory = React.useMemo(() => {
        if (quote.negotiation_details?.history && quote.negotiation_details.history.length > 0) {
            return quote.negotiation_details.history;
        }
        
        const history: any[] = [];
        // If we have response details but no history array, treat it as the first history item
        if (quote.response_details && (quote.status === 'Responded' || quote.status === 'Accepted' || quote.status === 'Declined' || quote.status === 'In Negotiation' || quote.status === 'Admin Accepted' || quote.status === 'Client Accepted')) {
             history.push({
                id: 'initial-response',
                sender: 'factory',
                message: quote.response_details.notes,
                price: quote.response_details.price,
                timestamp: quote.response_details.respondedAt || quote.submittedAt,
                action: 'offer'
            });
        }
        return history;
    }, [quote]);

    const handleSendChat = async (lineItemId: number) => {
        const chatState = chatStates[lineItemId] || { message: '', file: null };
        if (!chatState.message.trim() && !chatState.file) return;

        let attachmentUrl = '';
        if (chatState.file) {
            try {
                const fileExt = chatState.file.name.split('.').pop();
                const fileName = `${quote.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { data, error } = await layoutProps.supabase.storage
                    .from('quote-attachments')
                    .upload(fileName, chatState.file);
                
                if (error) throw error;
                if (data) attachmentUrl = data.path;
            } catch (error: any) {
                console.error('Upload error:', error);
                showToast('Failed to upload attachment', 'error');
                return;
            }
        }

        const newHistoryItem: NegotiationHistoryItem = {
            id: Date.now().toString(),
            sender: 'client',
            message: chatState.message,
            timestamp: new Date().toISOString(),
            action: 'info',
            relatedLineItemId: lineItemId,
            attachments: attachmentUrl ? [attachmentUrl] : []
        };

        const updatedHistory = [...(quote.negotiation_details?.history || []), newHistoryItem];
        const { error } = await quoteService.update(quote.id, {
            negotiation_details: { ...quote.negotiation_details, history: updatedHistory }
        });

        if (error) showToast('Failed to send message', 'error');
        else {
            setQuote(prev => prev ? { ...prev, negotiation_details: { ...prev.negotiation_details, history: updatedHistory } } : null);
            setChatStates(prev => ({ ...prev, [lineItemId]: { message: '', file: null } }));
        }
    };

    const getStepIcon = (index: number, title: string) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('sourcing') || lowerTitle.includes('material')) return <Layers size={20} />;
        if (lowerTitle.includes('cutting')) return <Scissors size={20} />;
        if (lowerTitle.includes('production') || lowerTitle.includes('allocation')) return <Factory size={20} />;
        if (lowerTitle.includes('quality') || lowerTitle.includes('qc')) return <ShieldCheck size={20} />;
        if (lowerTitle.includes('packaging') || lowerTitle.includes('pack')) return <Package size={20} />;
        if (lowerTitle.includes('dispatch') || lowerTitle.includes('delivery') || lowerTitle.includes('logistics')) return <Truck size={20} />;
        if (lowerTitle.includes('risk') || lowerTitle.includes('mitigation')) return <LifeBuoy size={20} />;
        return <ClipboardList size={20} />;
    };

    const toggleExecutionStep = (index: number) => {
        setExpandedExecutionSteps(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const executionPlan: ExecutionStep[] = (quote as any).execution_plan || DEFAULT_EXECUTION_PLAN;
    const showExecutionPlan = (status !== 'Pending' && status !== 'Trashed') || layoutProps.isAdmin;

    return (
        <MainLayout {...layoutProps}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation & Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <button onClick={() => handleSetCurrentPage('myQuotes')} className="group flex items-center text-gray-500 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <div className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 mr-3 shadow-sm transition-all">
                            <ChevronLeft size={18} />
                        </div>
                        <span className="font-medium">Back to Quotes</span>
                    </button>
                    <div className="flex gap-3">
                        <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                            <Printer size={18} />
                            <span className="hidden sm:inline">Download PDF</span>
                        </button>
                        {(status === 'Responded' || status === 'In Negotiation' || status === 'Admin Accepted') && (
                            <button onClick={() => setIsNegotiationModalOpen(true)} className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                                Negotiate
                            </button>
                        )}
                        {(status === 'Responded' || status === 'In Negotiation') && (
                            <button onClick={handleAcceptQuote} className="px-5 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all shadow-md flex items-center gap-2">
                                <Check size={18} /> Approve Quote
                            </button>
                        )}
                        {status === 'Admin Accepted' && (
                            <button onClick={handleAcceptQuote} className="px-5 py-2 bg-[#c20c0b] text-white font-medium rounded-lg hover:bg-[#a50a09] transition-all shadow-md flex items-center gap-2">
                                <CheckCheck size={18} /> Finalize Acceptance
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Quote Header Card */}
                        <div ref={quoteDetailsRef} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${getStatusGradient(status)}`}></div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Quote #{id.slice(0, 8)}</h1>
                                    <p className="text-gray-500 dark:text-gray-200 text-sm flex items-center">
                                        <Calendar size={14} className="mr-1.5"/> Submitted on {formatFriendlyDate(submittedAt)}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full border ${getStatusColor(status)} flex items-center gap-1`}>
                                    {status === 'Accepted' && <CheckCheck size={14} />}
                                    {(status === 'Admin Accepted' || status === 'Client Accepted') && <Check size={14} />}
                                    {status === 'Admin Accepted' ? 'Admin Approved' : status === 'Client Accepted' ? 'Client Approved' : status}
                                </span>
                            </div>
                            
                            {/* Factory Response Summary (if available) */}
                            {(status === 'Responded' || status === 'In Negotiation' || status === 'Accepted' || status === 'Admin Accepted' || status === 'Client Accepted') && response_details && (
                                <div className="mt-6 p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <MessageSquare size={18} className="text-[#c20c0b]" />
                                            Factory Offer
                                        </h3>
                                        {response_details.respondedAt && (
                                            <span className="text-xs text-gray-500 dark:text-gray-200">Received {formatFriendlyDate(response_details.respondedAt)}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-200 uppercase font-medium mb-1">Total Price</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${response_details.price}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-200 uppercase font-medium mb-1">Lead Time</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{response_details.leadTime}</p>
                                        </div>
                                    </div>
                                    {response_details.notes && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                            <p className="text-sm text-gray-600 dark:text-gray-200 italic">"{response_details.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Product Details (List) */}
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Product Specifications</h3>
                            <div className="hidden md:grid grid-cols-12 gap-4 w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 mb-2">
                                <div className="col-span-4 text-left">Product</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-2 text-right">Target</div>
                                <div className="col-span-2 text-right">Quoted</div>
                                <div className="col-span-2"></div>
                            </div>
                            
                            {order.lineItems.map((item, index) => {
                                const isExpanded = expandedItems.includes(index);
                                const itemResponse = response_details?.lineItemResponses?.find(r => r.lineItemId === item.id);
                                const history = getLineItemHistory(item.id);

                                const isClientApproved = quote.negotiation_details?.clientApprovedLineItems?.includes(item.id);
                                const isAdminApproved = quote.negotiation_details?.adminApprovedLineItems?.includes(item.id);

                                const isAccepted = status === 'Accepted';
                                const showAgreedPrice = isAccepted;
                                const agreedPrice = (isAccepted && response_details?.acceptedAt && itemResponse?.price)
                                    ? itemResponse.price
                                    : item.targetPrice;

                                return (
                                    <div key={index} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden transition-all duration-200">
                                        <div 
                                            onClick={() => toggleExpand(index)}
                                            className={`p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-white/10'}`}
                                        >
                                            {/* Product Info */}
                                            <div className="md:col-span-4 flex items-center gap-3">
                                                <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{item.category}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                        {item.fabricQuality} • {item.weightGSM} GSM
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Qty */}
                                            <div className="md:col-span-2 text-sm text-gray-700 dark:text-gray-200 md:text-center">
                                                <span className="md:hidden font-medium text-gray-500 mr-2">Qty:</span>
                                                {item.qty} {item.quantityType === 'container' ? '' : 'units'}
                                            </div>

                                            {/* Target Price */}
                                            <div className="md:col-span-2 text-sm text-right flex items-center justify-end gap-2">
                                                <span className="md:hidden font-medium text-gray-500">Target:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">${item.targetPrice}</span>
                                                {(status === 'Responded' || status === 'In Negotiation' || status === 'Admin Accepted') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setNegotiatingItem(item); }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                        title="Negotiate Item Price"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Quoted Price */}
                                            <div className="md:col-span-2 text-sm text-right">
                                                <span className="md:hidden font-medium text-gray-500 mr-2">Quoted:</span>
                                                {showAgreedPrice ? <span className="font-bold text-green-600 dark:text-green-400">${agreedPrice}</span> : (itemResponse?.price ? <span className="font-bold text-[#c20c0b] dark:text-red-400">${itemResponse.price}</span> : <span className="text-gray-400">-</span>)}
                                            </div>

                                            {/* Expand Icon */}
                                            <div className="md:col-span-2 flex justify-end items-center gap-2">
                                                {(status === 'Responded' || status === 'In Negotiation' || status === 'Admin Accepted' || status === 'Client Accepted') && (
                                                    <button
                                                        onClick={(e) => handleToggleLineItemApproval(item.id, e)}
                                                        className={`p-2 rounded-full transition-all border ${
                                                            isClientApproved
                                                                ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                                : isAdminApproved
                                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                                                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-green-600 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                                                        }`}
                                                        title={
                                                            isClientApproved && isAdminApproved ? "Price agreed by both parties" :
                                                            isClientApproved ? "Approved by you. Waiting for Admin." :
                                                            isAdminApproved ? "Admin has approved. Click to accept." :
                                                            "Click to approve this price"
                                                        }
                                                    >
                                                        {isClientApproved ? (
                                                            isAdminApproved ? <CheckCheck size={18} /> : <Check size={18} />
                                                        ) : (
                                                            <Circle size={18} />
                                                        )}
                                                    </button>
                                                )}
                                                {(history.length > 0 || itemResponse?.price) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setHistoryModalData({ item, history, itemResponse, response_details: quote.response_details, isAccepted, agreedPrice });
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                        title="View Price History"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                )}
                                                {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                            </div>
                                        </div>
                                        
                                        {isExpanded && (
                                            <div className="p-5 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-gray-800/30 animate-fade-in">
                                                {/* Item Details Grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                    <div className="rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-3 py-2">
                                                            <p className="text-xs text-white uppercase font-bold tracking-wider">Fabric</p>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-gray-800">
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.fabricQuality}</p>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-3 py-2">
                                                            <p className="text-xs text-white uppercase font-bold tracking-wider">Weight</p>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-gray-800">
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.weightGSM} GSM</p>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-3 py-2">
                                                            <p className="text-xs text-white uppercase font-bold tracking-wider">Quantity</p>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-gray-800">
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.qty} {item.quantityType === 'container' ? '' : 'units'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-3 py-2">
                                                            <p className="text-xs text-white uppercase font-bold tracking-wider">{showAgreedPrice ? 'Agreed Price' : 'Target Price'}</p>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-gray-800">
                                                            <p className={`font-bold text-sm ${showAgreedPrice ? 'text-green-600 dark:text-green-400' : 'text-[#c20c0b] dark:text-red-400'}`}>${showAgreedPrice ? agreedPrice : item.targetPrice}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Size Breakdown */}
                                                <div className="mb-6">
                                                    <p className="text-xs text-gray-500 dark:text-gray-200 uppercase font-bold tracking-wider mb-3">Size Breakdown</p>
                                                    {Object.keys(item.sizeRatio).length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(item.sizeRatio)
                                                                .sort(([sizeA], [sizeB]) => SIZE_ORDER.indexOf(sizeA) - SIZE_ORDER.indexOf(sizeB))
                                                                .map(([size, ratio]) => (
                                                                <div key={size} className="flex flex-col items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-white/10 rounded-md min-w-[3rem] py-1.5">
                                                                    <span className="text-xs font-bold text-gray-800 dark:text-white">{size}</span>
                                                                    <span className="text-[10px] text-gray-500 dark:text-gray-200 font-medium">{ratio}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.sizeRange.map(size => (
                                                                <span key={size} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-full">{size}</span>
                                                            ))}
                                                            {item.customSize && <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">{item.customSize}</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Detailed Requirements */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                    <div className="rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-5 py-3">
                                                            <p className="text-xs text-white uppercase font-bold tracking-wider">Packaging & Labeling</p>
                                                        </div>
                                                        <div className="p-5 bg-white dark:bg-gray-800 space-y-3 text-sm">
                                                            <div className="flex justify-between items-start"><span className="text-gray-500 dark:text-gray-200">Packaging:</span> <span className="font-medium text-gray-900 dark:text-white text-right ml-4">{item.packagingReqs}</span></div>
                                                            {item.labelingReqs && <div className="flex justify-between items-start"><span className="text-gray-500 dark:text-gray-200">Labeling:</span> <span className="font-medium text-gray-900 dark:text-white text-right ml-4">{item.labelingReqs}</span></div>}
                                                        </div>
                                                    </div>
                                                    {(item.trimsAndAccessories || item.specialInstructions) && (
                                                        <div className="rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                                            <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-5 py-3">
                                                                <p className="text-xs text-white uppercase font-bold tracking-wider">Additional Details</p>
                                                            </div>
                                                            <div className="p-5 bg-white dark:bg-gray-800 space-y-3 text-sm">
                                                                {item.trimsAndAccessories && <div><span className="text-gray-500 dark:text-gray-200 block mb-1">Trims:</span> <span className="font-medium text-gray-900 dark:text-white">{item.trimsAndAccessories}</span></div>}
                                                                {item.specialInstructions && <div><span className="text-gray-500 dark:text-gray-200 block mb-1">Instructions:</span> <span className="font-medium text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded border border-yellow-100 dark:border-yellow-800 inline-block w-full">{item.specialInstructions}</span></div>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Chat / History Section */}
                                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-inner flex flex-col h-[400px]">
                                                    <h4 className="text-sm font-bold text-gray-700 dark:text-white mb-3 flex items-center gap-2 px-1">
                                                        <MessageSquare size={16}/> Discussion & History
                                                    </h4>
                                                    
                                                    {/* Messages Area */}
                                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-3">
                                                        {history.length === 0 ? (
                                                            <div className="text-center text-gray-400 text-xs py-10">No history yet. Start a discussion.</div>
                                                        ) : (
                                                            history.map((h, i) => (
                                                                <div key={i} className={`flex ${h.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                                                                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${h.sender === 'client' ? 'bg-[#c20c0b] text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white rounded-tl-none'}`}>
                                                                        <div className="flex justify-between items-center gap-4 mb-1">
                                                                            <span className={`text-[10px] font-bold uppercase ${h.sender === 'client' ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                                                {h.sender === 'client' ? 'You' : 'Factory'}
                                                                            </span>
                                                                            <span className={`text-[10px] ${h.sender === 'client' ? 'text-red-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                                {new Date(h.timestamp).toLocaleDateString()}
                                                                            </span>
                                                                        </div>
                                                                        {h.price && <div className="font-bold text-lg mb-1">${h.price}</div>}
                                                                        {h.message && <p className="text-xs opacity-90 whitespace-pre-wrap">{h.message}</p>}
                                                                        {h.attachments && h.attachments.length > 0 && (
                                                                            <div className="mt-2 pt-2 border-t border-white/20">
                                                                                <div className="flex items-center gap-1 text-xs opacity-80">
                                                                                    <Paperclip size={12} />
                                                                                    <span>Attachment</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    {/* Input Area */}
                                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-2 flex items-end gap-2">
                                                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors relative" onClick={() => document.getElementById(`file-upload-${item.id}`)?.click()}>
                                                            <Paperclip size={20} />
                                                            {chatStates[item.id]?.file && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
                                                        </button>
                                                        <input type="file" id={`file-upload-${item.id}`} className="hidden" onChange={(e) => e.target.files && setChatStates(prev => ({ ...prev, [item.id]: { ...prev[item.id], file: e.target.files![0] } }))} />
                                                        
                                                        <textarea 
                                                            value={chatStates[item.id]?.message || ''}
                                                            onChange={(e) => setChatStates(prev => ({ ...prev, [item.id]: { ...prev[item.id], message: e.target.value } }))}
                                                            placeholder="Type a message..." 
                                                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 dark:text-white resize-none max-h-24 py-2"
                                                            rows={1}
                                                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(item.id); } }}
                                                        />
                                                        <button 
                                                            onClick={() => handleSendChat(item.id)}
                                                            disabled={!chatStates[item.id]?.message?.trim() && !chatStates[item.id]?.file}
                                                            className="p-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <Send size={18} />
                                                        </button>
                                                    </div>
                                                    {chatStates[item.id]?.file && (
                                                        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                            <span className="truncate max-w-[200px]">{chatStates[item.id].file?.name}</span>
                                                            <button onClick={() => setChatStates(prev => ({ ...prev, [item.id]: { ...prev[item.id], file: null } }))} className="text-red-500 hover:text-red-700"><X size={12}/></button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Respond Button */}
                                                {(status === 'Responded' || status === 'In Negotiation' || status === 'Admin Accepted') && (
                                                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setIsNegotiationModalOpen(true); }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                                        >
                                                            <MessageSquare size={16} /> Negotiate / Respond
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Totals Footer */}
                            {(() => {
                                const totalTargetCost = order.lineItems.reduce((acc, item) => {
                                    if (item.quantityType === 'units' && item.qty && item.targetPrice) {
                                        const qty = parseFloat(item.qty);
                                        const price = parseFloat(item.targetPrice);
                                        if (!isNaN(qty) && !isNaN(price)) {
                                            return acc + (qty * price);
                                        }
                                    }
                                    return acc;
                                }, 0);
                                return (
                                    <>
                                        {/* Desktop */}
                                        <div className="hidden md:grid grid-cols-12 gap-4 w-full px-4 mt-2 border-t border-gray-200 dark:border-white/10 pt-4">
                                            <div className="col-span-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">Totals</div>
                                            <div className="col-span-2 text-center">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{quote.order?.lineItems?.reduce((acc, item) => acc + (parseInt(item.qty) || 0), 0).toLocaleString()}</p>
                                            </div>
                                            <div className="col-span-2 text-right">
                                                {totalTargetCost > 0 && (
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white" title="Total Estimated Target Cost">
                                                        ${totalTargetCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="col-span-4"></div>
                                        </div>

                                        {/* Mobile */}
                                        <div className="md:hidden mt-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-white/10 flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total Quantity</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{quote.order?.lineItems?.reduce((acc, item) => acc + (parseInt(item.qty) || 0), 0).toLocaleString()}</span>
                                        </div>
                                        {totalTargetCost > 0 && (
                                            <div className="md:hidden mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-white/10 flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Est. Target Cost</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">${totalTargetCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Execution Plan Section */}
                        {showExecutionPlan && (
                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden p-6 sm:p-8">
                                <div 
                                    className="flex justify-between items-center mb-8 cursor-pointer"
                                    onClick={() => setIsExecutionPlanExpanded(!isExecutionPlanExpanded)}
                                >
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <ClipboardList size={24} className="mr-3 text-[#c20c0b]" /> Execution Plan
                                    </h3>
                                    <div className="flex items-center gap-3">
                                    {layoutProps.isAdmin && isExecutionPlanExpanded && (
                                        <button 
                                            onClick={() => setIsExecutionPlanModalOpen(true)}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                        >
                                            <Edit size={16} /> Edit Plan
                                        </button>
                                    )}
                                    {isExecutionPlanExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                    </div>
                                </div>

                                {isExecutionPlanExpanded && (
                                <div className="relative animate-fade-in">
                                    {/* Connecting Line */}
                                    <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                                    <div className="space-y-8">
                                        {executionPlan.map((step, index) => {
                                            const color = STEP_COLORS[index % STEP_COLORS.length];
                                            const isExpanded = expandedExecutionSteps.includes(index);
                                            return (
                                                <div 
                                                    key={index} 
                                                    className="relative flex items-start group animate-fade-in"
                                                    style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'both' }}
                                                >
                                                    {/* Step Number/Icon */}
                                                    <div 
                                                        className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-2 shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-300 cursor-pointer ${color.border} ${color.text} ${color.bg}`}
                                                        onClick={() => toggleExecutionStep(index)}
                                                    >
                                                        {getStepIcon(index, step.title)}
                                                    </div>
                                                    
                                                    {/* Content */}
                                                    <div 
                                                        className={`ml-6 flex-1 cursor-pointer rounded-xl border p-4 transition-all ${isExpanded ? 'bg-white dark:bg-gray-800 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent'} ${isExpanded ? color.subtleBorder : ''}`} 
                                                        onClick={() => toggleExecutionStep(index)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <h4 className={`text-lg font-bold ${isExpanded ? color.text : 'text-gray-900 dark:text-white'} mb-1`}>{step.title}</h4>
                                                            {isExpanded ? <ChevronUp size={16} className={color.text} /> : <ChevronDown size={16} className="text-gray-400" />}
                                                        </div>
                                                        {isExpanded && (
                                                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed animate-fade-in mt-2">{step.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                )}
                            </div>
                        )}

                        {/* Attachments Section */}
                        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <FileText size={20} className="mr-2 text-[#c20c0b]" /> Attachments
                            </h3>
                            {isLoadingFiles ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c20c0b]"></div>
                                </div>
                            ) : fileLinks.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {fileLinks.map((file, i) => {
                                        const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                        const hasUrl = !!file.url;
                                        const errorMsg = (file as any).error;
                                        return (
                                        <div key={i} className={`flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all group ${hasUrl ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' : 'opacity-70'}`} onClick={() => hasUrl && (isImage ? openLightbox(file.url) : window.open(file.url, '_blank'))}>
                                            <div className="p-2.5 bg-white dark:bg-gray-700 rounded-lg text-[#c20c0b] shadow-sm">
                                                {isImage ? (
                                                    hasUrl ? <img src={file.url} alt={file.name} className="w-6 h-6 object-cover" /> : <ImageIcon size={20} />
                                                ) : (
                                                    <FileText size={20} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-[#c20c0b] transition-colors flex items-center gap-1">
                                                    {hasUrl ? (isImage ? <><Eye size={12}/> Preview</> : 'Click to download') : <span className="text-red-500">{errorMsg || 'Failed to load'}</span>}
                                                </p>
                                            </div>
                                            {hasUrl && (
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#c20c0b] transition-colors" title="Download" onClick={(e) => e.stopPropagation()}>
                                                    <Download size={18} />
                                                </a>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            ) : quote?.files && quote.files.length > 0 ? (
                                <div className="text-center py-8 text-red-500 dark:text-red-400 italic bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                    <p className="mb-2">Failed to load attachments.</p>
                                    <button onClick={fetchSignedUrls} className="text-sm font-bold underline hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-1 mx-auto">
                                        <RefreshCw size={14} /> Retry
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    No attachments found for this quote.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        {/* Factory Card */}
                        <div className="rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                            <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-6 py-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Factory Details</h3>
                            </div>
                            <div className="p-6 bg-white dark:bg-gray-800">
                                {factory ? (
                                    <div className="flex items-start gap-4">
                                        <img src={factory.imageUrl} alt={factory.name} className="w-16 h-16 rounded-lg object-cover border border-gray-100 dark:border-white/10" />
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">{factory.name}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-200 flex items-center mt-1">
                                                <MapPin size={14} className="mr-1" /> {factory.location}
                                            </p>
                                            <button className="text-xs font-bold text-[#c20c0b] mt-3 hover:text-[#a50a09] underline underline-offset-2">View Profile</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-200 italic">Open Request (No specific factory)</p>
                                )}
                            </div>
                        </div>

                        {/* Logistics Card */}
                        <div className="rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                            <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-6 py-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Logistics</h3>
                            </div>
                            <div className="p-6 bg-white dark:bg-gray-800 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-200">Destination</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{order.shippingCountry}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-200">Port</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{order.shippingPort}</span>
                                </div>
                            </div>
                        </div>

                        {/* Help Card */}
                         <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
                            <h3 className="font-bold mb-2 flex items-center gap-2">
                                <AlertCircle size={18} /> Need Assistance?
                            </h3>
                            <p className="text-sm text-gray-300 mb-4">Our sourcing experts can help you with negotiations.</p>
                            <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/10">
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>

                {/* Negotiation Timeline */}
                <div className="mt-8 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-white/10">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                        <History size={24} className="mr-3 text-[#c20c0b]" /> Negotiation History
                    </h3>
                    <div className="relative pl-4 sm:pl-6 space-y-8 before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-white/10">
                        
                        {/* 1. Submission */}
                        <div className="relative pl-10">
                            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 ring-4 ring-gray-50 dark:ring-white/10 z-10"></div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1">
                                <span className="font-bold text-gray-900 dark:text-white">Quote Request Submitted</span>
                                <span className="text-xs text-gray-400 dark:text-gray-200 font-medium">{formatFriendlyDate(submittedAt)}</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-200">Initial request sent to {factory?.name || 'factories'}.</p>
                        </div>

                        {/* 2. History Items */}
                        {negotiationHistory.map((item: any, index: number) => (
                            <div key={index} className="relative pl-10">
                                <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ring-4 z-10 ${
                                    item.sender === 'client' ? 'bg-blue-500 ring-blue-50 dark:ring-blue-900/30' : 'bg-[#c20c0b] ring-red-50 dark:ring-red-900/30'
                                }`}></div>
                                
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold ${item.sender === 'client' ? 'text-blue-700 dark:text-blue-400' : 'text-[#c20c0b] dark:text-red-400'}`}>
                                                {item.sender === 'client' ? 'You' : factory?.name || 'Factory'}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-200 font-medium uppercase tracking-wide">
                                                {item.action}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 dark:text-gray-200 font-medium">{formatFriendlyDate(item.timestamp)}</span>
                                    </div>
                                    
                                    {item.price && (
                                        <div className="mb-3 flex items-baseline gap-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-200">Price:</span>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">${item.price}</span>
                                        </div>
                                    )}
                                    
                                    {item.message && (
                                        <div className="text-sm text-gray-600 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                            {item.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* 3. Current Status */}
                        <div className="relative pl-10">
                            <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ring-4 z-10 ${
                                status === 'Accepted' || status === 'Admin Accepted' || status === 'Client Accepted' ? 'bg-emerald-500 ring-emerald-50 dark:ring-emerald-900/30' : 
                                status === 'Declined' ? 'bg-red-500 ring-red-50 dark:ring-red-900/30' : 'bg-amber-500 ring-amber-50 dark:ring-amber-900/30'
                            }`}></div>
                            <div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(status)} gap-1`}>
                                    {status === 'Accepted' && <CheckCheck size={12} />}
                                    {(status === 'Admin Accepted' || status === 'Client Accepted') && <Check size={12} />}
                                    Current Status: {status === 'Admin Accepted' ? 'Admin Approved' : status === 'Client Accepted' ? 'Client Approved' : status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden PDF Template - Formal Quote Layout */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div ref={pdfContentRef} className="bg-white p-10 w-[800px] text-gray-800 font-sans border border-gray-300">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">FORMAL QUOTE</h1>
                            <p className="text-sm text-gray-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-xl text-gray-900">Quote #{id.slice(0, 8)}</p>
                            <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full border ${getStatusColor(status)}`}>
                                {status}
                            </span>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-12 mb-10">
                        <div>
                            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Client Details</h3>
                            <div className="text-sm">
                                <p className="font-bold text-gray-900 text-lg">{(quote as any).companyName || 'Client Company'}</p>
                                <p className="text-gray-600">{(quote as any).clientName || 'Client Name'}</p>
                                <div className="mt-3 text-gray-500">
                                    <p>Destination: {order.shippingCountry}</p>
                                    <p>Port: {order.shippingPort}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Factory Details</h3>
                            {factory ? (
                                <div className="text-sm">
                                    <p className="font-bold text-gray-900 text-lg">{factory.name}</p>
                                    <p className="text-gray-600">{factory.location}</p>
                                </div>
                            ) : (
                                <p className="text-sm italic text-gray-500">General Inquiry (No specific factory)</p>
                            )}
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-8">
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Product Specifications</h3>
                        {order.lineItems.map((item, index) => (
                            <div key={index} className="break-inside-avoid mb-6">
                                <div className="flex justify-between items-center mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <h4 className="font-bold text-lg text-gray-900">#{index + 1} {item.category}</h4>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500 uppercase font-bold mr-2">Target Price</span>
                                        <span className="font-bold text-lg text-[#c20c0b]">${item.targetPrice}</span>
                                    </div>
                                </div>
                                <table className="w-full text-sm border-collapse">
                                    <tbody>
                                        <tr className="border-b border-gray-100"><td className="py-2 w-1/3 text-gray-500 font-medium">Quantity</td><td className="py-2 font-bold">{item.qty} {item.quantityType === 'container' ? '' : 'units'}</td></tr>
                                        <tr className="border-b border-gray-100"><td className="py-2 text-gray-500 font-medium">Fabric</td><td className="py-2">{item.fabricQuality}</td></tr>
                                        <tr className="border-b border-gray-100"><td className="py-2 text-gray-500 font-medium">Weight</td><td className="py-2">{item.weightGSM} GSM</td></tr>
                                        {item.styleOption && <tr className="border-b border-gray-100"><td className="py-2 text-gray-500 font-medium">Style</td><td className="py-2">{item.styleOption}</td></tr>}
                                        <tr className="border-b border-gray-100"><td className="py-2 text-gray-500 font-medium">Size Range</td><td className="py-2">{item.sizeRange.join(', ')}</td></tr>
                                        <tr className="border-b border-gray-100"><td className="py-2 text-gray-500 font-medium">Packaging</td><td className="py-2">{item.packagingReqs}</td></tr>
                                        {item.specialInstructions && <tr><td className="py-2 text-gray-500 font-medium">Instructions</td><td className="py-2 text-orange-700 bg-orange-50 px-2 rounded">{item.specialInstructions}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    {(status === 'Responded' || status === 'Accepted' || status === 'Admin Accepted' || status === 'Client Accepted') && response_details && (
                        <div className="mt-10 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-white/10 break-inside-avoid">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Total Quoted Price</h3>
                                <p className="text-4xl font-bold text-green-700 dark:text-green-400">${response_details.price}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div><span className="text-gray-500 dark:text-gray-400 font-medium">Lead Time:</span> <span className="font-bold dark:text-white">{response_details.leadTime}</span></div>
                                {response_details.respondedAt && <div><span className="text-gray-500 dark:text-gray-400 font-medium">Date:</span> <span className="dark:text-white">{formatFriendlyDate(response_details.respondedAt)}</span></div>}
                            </div>
                            {response_details.notes && (
                                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 italic">
                                    <span className="font-bold not-italic text-gray-800 dark:text-gray-100">Notes:</span> {response_details.notes}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox Modal */}
            {isLightboxOpen && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsLightboxOpen(false)}>
                    <button onClick={() => setIsLightboxOpen(false)} className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50">
                        <X size={32} />
                    </button>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        {imageFiles.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + imageFiles.length) % imageFiles.length); }} className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all border border-white/10 backdrop-blur-sm group cursor-pointer">
                                    <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % imageFiles.length); }} className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all border border-white/10 backdrop-blur-sm group cursor-pointer">
                                    <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </>
                        )}
                        {imageFiles[currentImageIndex] && (
                            <img src={imageFiles[currentImageIndex].url} alt={imageFiles[currentImageIndex].name} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none" />
                        )}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full border border-white/20">
                            {currentImageIndex + 1} / {imageFiles.length}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Negotiation Modal */}
            {isNegotiationModalOpen && (
                <NegotiationModal 
                    onSubmit={handleNegotiationSubmit} 
                    onClose={() => setIsNegotiationModalOpen(false)} 
                    lineItems={order.lineItems}
                />
            )}

            {/* Single Item Negotiation Modal */}
            {negotiatingItem && (
                <SingleItemNegotiationModal
                    item={negotiatingItem}
                    onSubmit={handleSingleItemNegotiation}
                    onClose={() => setNegotiatingItem(null)}
                />
            )}

            {/* Price History Modal */}
            {historyModalData && (
                <PriceHistoryModal
                    data={historyModalData}
                    onClose={() => setHistoryModalData(null)}
                />
            )}

            {/* Execution Plan Edit Modal */}
            {isExecutionPlanModalOpen && (
                <EditExecutionPlanModal
                    initialPlan={executionPlan}
                    onSave={handleSaveExecutionPlan}
                    onClose={() => setIsExecutionPlanModalOpen(false)}
                />
            )}
        </MainLayout>
    );
};

const NegotiationModal: FC<{ onSubmit: (counterPrice: string, details: string, lineItemNegotiations: any[]) => void; onClose: () => void; lineItems: any[] }> = ({ onSubmit, onClose, lineItems }) => {
    const [counterPrice, setCounterPrice] = useState('');
    const [details, setDetails] = useState('');
    const [lineItemPrices, setLineItemPrices] = useState<Record<number, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const lineItemNegotiations = lineItems.map(item => ({
            lineItemId: item.id,
            counterPrice: lineItemPrices[item.id] || ''
        })).filter(item => item.counterPrice !== '');
        onSubmit(counterPrice, details, lineItemNegotiations);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in z-[60]">
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100 border border-gray-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Negotiate Quote</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Item Breakdown</h3>
                        {lineItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white">{item.category}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.qty}</p>
                                </div>
                                <div className="w-32">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Offer ($)"
                                        value={lineItemPrices[item.id] || ''}
                                        onChange={(e) => setLineItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label htmlFor="counterPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overall Counter Price (Optional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="number"
                                id="counterPrice"
                                value={counterPrice}
                                onChange={(e) => setCounterPrice(e.target.value)}
                                className="w-full pl-7 p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#c20c0b] focus:border-[#c20c0b] outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message to Factory</label>
                        <textarea
                            id="details"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#c20c0b] focus:border-[#c20c0b] outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={4}
                            placeholder="Explain your counter offer or request changes..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-transparent dark:border-white/10">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-[#c20c0b] text-white font-semibold rounded-xl hover:bg-[#a50a09] transition-colors shadow-md">Submit Offer</button>
                    </div>
                </form>
            </div>
        </div>
    , document.body);
};

const EditExecutionPlanModal: FC<{ initialPlan: ExecutionStep[]; onSave: (plan: ExecutionStep[]) => void; onClose: () => void }> = ({ initialPlan, onSave, onClose }) => {
    const [plan, setPlan] = useState<ExecutionStep[]>(initialPlan);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleStepChange = (index: number, field: keyof ExecutionStep, value: string) => {
        const newPlan = [...plan];
        newPlan[index] = { ...newPlan[index], [field]: value };
        setPlan(newPlan);
    };

    const handleAddStep = () => {
        setPlan([...plan, { title: '', description: '' }]);
    };

    const handleRemoveStep = (index: number) => {
        setPlan(plan.filter((_, i) => i !== index));
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        
        const newPlan = [...plan];
        const draggedItem = newPlan[draggedIndex];
        newPlan.splice(draggedIndex, 1);
        newPlan.splice(index, 0, draggedItem);
        
        setPlan(newPlan);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-6 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-white/10 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Execution Plan</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6 custom-scrollbar">
                    {plan.map((step, index) => (
                        <div 
                            key={index} 
                            className={`bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-white/10 relative group transition-all ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <div className="p-1.5 text-gray-400 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                                    <GripVertical size={16} />
                                </div>
                                <button onClick={() => handleRemoveStep(index)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Remove Step">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-grab active:cursor-grabbing">
                                    {index + 1}
                                </span>
                                <input
                                    type="text"
                                    value={step.title}
                                    onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                                    placeholder="Step Title"
                                    className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-[#c20c0b] outline-none px-1 py-0.5 font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                            <textarea
                                value={step.description}
                                onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                                placeholder="Step Description"
                                rows={2}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#c20c0b] outline-none text-gray-700 dark:text-gray-200"
                            />
                        </div>
                    ))}
                    <button onClick={handleAddStep} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 font-medium hover:border-[#c20c0b] hover:text-[#c20c0b] transition-colors flex items-center justify-center gap-2">
                        <Plus size={20} /> Add Step
                    </button>
                </div>

                <div className="flex justify-end gap-3 shrink-0 pt-4 border-t border-gray-100 dark:border-white/10">
                    <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                    <button onClick={() => onSave(plan)} className="px-5 py-2.5 bg-[#c20c0b] text-white font-semibold rounded-xl hover:bg-[#a50a09] transition-colors shadow-md">Save Plan</button>
                </div>
            </div>
        </div>
    , document.body);
};

const PriceHistoryModal: FC<{ 
    data: { item: any, history: any[], itemResponse: any, response_details: any, isAccepted: boolean, agreedPrice: string }; 
    onClose: () => void 
}> = ({ data, onClose }) => {
    const { item, history, itemResponse, response_details, isAccepted, agreedPrice } = data;
    
    // Group history into rows (Client Counter -> Factory Response)
    const groupedHistory = React.useMemo(() => {
        const rows: { client?: any, factory?: any }[] = [];
        let currentRow: { client?: any, factory?: any } = {};

        // Process history chronologically
        history.forEach(h => {
            if (h.sender === 'client') {
                if (currentRow.factory) {
                    rows.push(currentRow);
                    currentRow = {};
                }
                currentRow.client = h;
            } else {
                if (currentRow.client) {
                    currentRow.factory = h;
                    rows.push(currentRow);
                    currentRow = {};
                } else {
                    rows.push({ factory: h });
                }
            }
        });
        if (currentRow.client || currentRow.factory) rows.push(currentRow);
        return rows.reverse(); // Show newest first
    }, [history]);

    const acceptedHistoryRowIndex = isAccepted && agreedPrice 
        ? groupedHistory.findIndex(row => row.factory?.price === agreedPrice) 
        : -1;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-6 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-white/10 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <History size={20} className="text-blue-600"/> Price History
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{item.category}</p>
                
                <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">Your Target Price</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">Factory Price</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                            {groupedHistory.map((row, i) => (
                                <tr key={i} className={i === acceptedHistoryRowIndex ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                                    <td className="px-4 py-3 whitespace-nowrap text-right align-top">
                                        {row.client ? (
                                            <div>
                                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">${row.client.price}</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    {new Date(row.client.timestamp).toLocaleDateString()} <span className="opacity-75">{new Date(row.client.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </div>
                                        ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right align-top">
                                        {row.factory ? (
                                            <div>
                                                <div className="text-lg font-bold text-[#c20c0b] dark:text-red-400">${row.factory.price}</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    {new Date(row.factory.timestamp).toLocaleDateString()} <span className="opacity-75">{new Date(row.factory.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </div>
                                        ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                                    </td>
                                </tr>
                            ))}
                            <tr className={isAccepted && acceptedHistoryRowIndex === -1 ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                                <td className="px-4 py-3 whitespace-nowrap text-right align-top">
                                    <span className="text-gray-300 dark:text-gray-600">-</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right align-top">
                                    <div>
                                        <div className="text-lg font-bold text-[#c20c0b] dark:text-red-400">${itemResponse?.price || '-'}</div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {response_details?.respondedAt ? (
                                                <>
                                                    {new Date(response_details.respondedAt).toLocaleDateString()} <span className="opacity-75">{new Date(response_details.respondedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </>
                                            ) : 'Initial Quote'}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    , document.body);
};

const SingleItemNegotiationModal: FC<{ item: any; onSubmit: (price: string, note: string) => void; onClose: () => void }> = ({ item, onSubmit, onClose }) => {
    const [price, setPrice] = useState('');
    const [note, setNote] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(price, note);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in z-[70]">
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Negotiate {item.category}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Current Target: ${item.targetPrice}</label>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Counter Price ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (Optional)</label>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} placeholder="Reason for price change..." />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] text-sm font-medium">Update Price</button>
                    </div>
                </form>
            </div>
        </div>
    , document.body);
};