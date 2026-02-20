import React, { useState, FC, useRef, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MainLayout } from './MainLayout';
import { QuoteRequest, NegotiationHistoryItem } from './types';
import { quoteService } from './quote.service';
import {
    ChevronLeft, ChevronRight, MapPin, Calendar, Package, Shirt, DollarSign, Clock, ArrowRight,
    FileText, MessageSquare, CheckCircle, AlertCircle, X, Globe, Download, ChevronDown, ChevronUp, History, Printer, Check, CheckCheck, Eye, RefreshCw, Image as ImageIcon, Edit, Scale, Paperclip, Send, Circle,
    Layers, Scissors, Factory, ShieldCheck, Truck, LifeBuoy, ClipboardList, Plus, Trash2, GripVertical,
    Sparkles, Info, ListOrdered, Phone, Building, CreditCard, Box, Copy, Activity, ExternalLink
} from 'lucide-react';

// Tab type for the main content area - Zomato-style progressive disclosure
type TabType = 'overview' | 'products' | 'timeline' | 'files' | 'tracking';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { formatFriendlyDate, getStatusColor, getStatusGradient } from './utils';
import { useToast } from './ToastContext';

interface QuoteDetailPageProps {
    selectedQuote: QuoteRequest | null;
    handleSetCurrentPage: (page: string, data?: any) => void;
    updateQuoteStatus: (id: string, status: string, additionalData?: any) => void;
    createCrmOrder: (quote: QuoteRequest) => void;
    layoutProps: any;
}

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

const runCelebration = () => {
    const count = 200;
    const defaults = {
        origin: { y: 0.6 }
    };

    function fire(particleRatio: number, opts: any) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
        });
    }

    fire(0.25, {
        spread: 26,
        startVelocity: 55,
    });
    fire(0.2, {
        spread: 60,
    });
    fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 45,
    });
};

const StatusTimeline: FC<{ status: string }> = ({ status }) => {
    const steps = [
        { label: 'Pending', key: 'Pending' },
        { label: 'Responded', key: 'Responded' },
        { label: 'Negotiating', key: 'In Negotiation' },
        { label: 'Accepted', key: 'Accepted' }
    ];

    const getStepIndex = (s: string) => {
        if (s === 'Pending') return 0;
        if (s === 'Responded') return 1;
        if (s === 'In Negotiation') return 2;
        if (['Accepted', 'Admin Accepted', 'Client Accepted'].includes(s)) return 3;
        return -1;
    };

    const activeIndex = getStepIndex(status);
    if (activeIndex === -1) return null;

    const getActiveColor = (s: string) => {
         if (s === 'Pending') return { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', shadow: 'shadow-[0_0_0_4px_rgba(245,158,11,0.2)]' };
         if (s === 'Responded') return { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', shadow: 'shadow-[0_0_0_4px_rgba(59,130,246,0.2)]' };
         if (s === 'In Negotiation') return { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400', shadow: 'shadow-[0_0_0_4px_rgba(168,85,247,0.2)]' };
         if (['Accepted', 'Admin Accepted', 'Client Accepted'].includes(s)) return { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-600 dark:text-green-400', shadow: 'shadow-[0_0_0_4px_rgba(34,197,94,0.2)]' };
         return { bg: 'bg-gray-500', border: 'border-gray-500', text: 'text-gray-600 dark:text-gray-400', shadow: 'shadow-[0_0_0_4px_rgba(107,114,128,0.2)]' };
    };

    const activeColor = getActiveColor(status);

    return (
        <div className="w-full py-6 px-2 sm:px-8 mb-6">
            <div className="relative flex items-center justify-between">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full -z-10" />
                <div 
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full -z-10 transition-all duration-1000 ease-out ${activeColor.bg}`}
                    style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                />
                {steps.map((step, index) => {
                    const isActive = index <= activeIndex;
                    const isCurrent = index === activeIndex;
                    return (
                        <div key={step.label} className="flex flex-col items-center relative">
                            <div className={`w-4 h-4 rounded-full border-2 transition-all duration-500 z-10 flex items-center justify-center ${isActive ? `bg-white dark:bg-gray-900 ${activeColor.border} scale-125 ${activeColor.shadow}` : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
                                {isActive && <div className={`w-2 h-2 rounded-full ${activeColor.bg} ${isCurrent ? 'animate-pulse' : ''}`} />}
                            </div>
                            <span className={`absolute top-6 text-[10px] uppercase tracking-wider font-bold transition-all duration-500 ${isActive ? `${activeColor.text} translate-y-0 opacity-100` : 'text-gray-400 dark:text-gray-500 translate-y-1 opacity-70'}`}>{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

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
    const [isSampleRequestModalOpen, setIsSampleRequestModalOpen] = useState(false);
    const [historyModalData, setHistoryModalData] = useState<any | null>(null);
    const quoteDetailsRef = useRef<HTMLDivElement>(null);
    const pdfContentRef = useRef<HTMLDivElement>(null);
    const invoiceTemplateRef = useRef<HTMLDivElement>(null);
    const [fileLinks, setFileLinks] = useState<{ name: string; url: string }[]>([]);
    const [expandedItems, setExpandedItems] = useState<number[]>([]);
    const [chatStates, setChatStates] = useState<Record<number, { message: string; file: File | null }>>({});
    const [uploadingChats, setUploadingChats] = useState<Record<number, boolean>>({});
    const cancellationRefs = useRef<Record<number, boolean>>({});
    const [expandedExecutionSteps, setExpandedExecutionSteps] = useState<number[]>([]);
    const [isExecutionPlanExpanded, setIsExecutionPlanExpanded] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const { showToast } = useToast();

    // New Zomato-style UI states
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
    const [activeChatItemId, setActiveChatItemId] = useState<number | null>(null);
    const chatPanelRef = useRef<HTMLDivElement>(null);
    const chatMessagesEndRef = useRef<HTMLDivElement>(null);

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
    const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
    
    // Tracking Tab State
    const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
    const [isTrackingLoading, setIsTrackingLoading] = useState(false);
    const [expandedSampleItems, setExpandedSampleItems] = useState<number[]>([]);
    const [samplePhotoUrls, setSamplePhotoUrls] = useState<Record<string, string>>({});

    const sampleRequest = (quote?.negotiation_details as any)?.sample_request;

    useEffect(() => {
        const fetchSamplePhotoUrls = async () => {
            if (!sampleRequest?.admin_response?.items) return;
            
            const paths: string[] = [];
            sampleRequest.admin_response.items.forEach((item: any) => {
                if (item.photos && Array.isArray(item.photos)) {
                    paths.push(...item.photos);
                }
            });

            if (paths.length === 0) return;

            const newUrls: Record<string, string> = {};
            let hasNew = false;

            await Promise.all(paths.map(async (path) => {
                if (path.startsWith('http') || path.startsWith('https') || path.startsWith('blob:')) return;
                
                if (samplePhotoUrls[path]) return;

                const cleanPath = path.startsWith('quote-attachments/') ? path.replace('quote-attachments/', '') : path;
                const { data, error } = await layoutProps.supabase.storage
                    .from('quote-attachments')
                    .createSignedUrl(cleanPath, 3600);

                if (error) {
                    console.error('Error signing URL for:', cleanPath, error);
                }

                if (data?.signedUrl) {
                    newUrls[path] = data.signedUrl;
                    hasNew = true;
                }
            }));

            if (hasNew) {
                setSamplePhotoUrls(prev => ({ ...prev, ...newUrls }));
            }
        };

        fetchSamplePhotoUrls();
    }, [sampleRequest, layoutProps.supabase]);

    const toggleSampleItem = (index: number) => {
        setExpandedSampleItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
    };

    // Helper function to get public URL from storage path
    const getPhotoUrl = (path: string) => {
        if (!path) return '';
        // If it's already a full URL, return it
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        // Check if we have a signed URL
        if (samplePhotoUrls[path]) {
            return samplePhotoUrls[path];
        }
        // Otherwise, get public URL from Supabase storage
        const { data: { publicUrl } } = layoutProps.supabase.storage
            .from('quote-attachments')
            .getPublicUrl(path);
        return publicUrl;
    };

    // Filter for image files for the lightbox
    const imageFiles = fileLinks.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));

    // Collect all sample photos for the lightbox
    const samplePhotos: { url: string; name: string }[] = [];
    if (sampleRequest?.admin_response?.items) {
        sampleRequest.admin_response.items.forEach((item: any, itemIndex: number) => {
            if (item.photos && item.photos.length > 0) {
                item.photos.forEach((photo: string, photoIndex: number) => {
                    samplePhotos.push({
                        url: getPhotoUrl(photo),
                        name: `${item.category} - Photo ${photoIndex + 1}`
                    });
                });
            }
        });
    }

    // Combine quote attachments and sample photos for lightbox
    const allImages = [...imageFiles, ...samplePhotos];

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
             setExpandedExecutionSteps([]);
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

    // Effect to fetch tracking data
    useEffect(() => {
        if (activeTab === 'tracking' && sampleRequest?.admin_response?.commercialData?.trackingNumber) {
            setIsTrackingLoading(true);
            // Simulate API call to courier
            setTimeout(() => {
                const today = new Date();
                const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                
                setTrackingEvents([
                    { id: 1, status: 'In Transit', location: 'New York, NY', time: '09:45 AM', date: today.toLocaleDateString(), description: 'Arrived at destination facility', current: true },
                    { id: 2, status: 'Departed', location: 'Heathrow Airport, London', time: '11:30 PM', date: yesterday.toLocaleDateString(), description: 'Flight departed', current: false },
                    { id: 3, status: 'Customs Cleared', location: 'London, UK', time: '04:15 PM', date: yesterday.toLocaleDateString(), description: 'Export customs clearance completed', current: false },
                    { id: 4, status: 'Picked Up', location: 'Factory Warehouse', time: '10:00 AM', date: twoDaysAgo.toLocaleDateString(), description: 'Shipment picked up by courier', current: false },
                ]);
                setIsTrackingLoading(false);
            }, 1500);
        }
    }, [activeTab, sampleRequest]);

    const openLightbox = (fileUrl: string) => {
        const index = allImages.findIndex(img => img.url === fileUrl);
        if (index !== -1) {
            setCurrentImageIndex(index);
            setIsLightboxOpen(true);
        }
    };

    if (!quote) {
        return (
            <MainLayout {...layoutProps}>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                    <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
                        <AlertCircle size={48} className="text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Quote Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">The quote details could not be loaded. It may have been deleted or you don't have permission to view it.</p>
                    <button 
                        onClick={() => handleSetCurrentPage('myQuotes')}
                        className="px-6 py-2 bg-[#c20c0b] text-white font-semibold rounded-lg hover:bg-[#a50a09] transition shadow-md"
                    >
                        Back to My Quotes
                    </button>
                </div>
            </MainLayout>
        );
    }

    console.log('[QuoteDetailPage] Rendering with quote.files:', quote.files);

    const { factory, order, status, submittedAt, id, response_details } = quote;

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
            runCelebration();
        } else if (allClientApproved) {
            newStatus = 'Client Accepted';
            toastMessage = 'All items approved. Quote marked as Client Approved.';
            runCelebration();
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
            runCelebration();
            createCrmOrder(updatedQuote);
            showToast('Quote Accepted! A new order has been created in the CRM portal.');
            handleSetCurrentPage('crm');
        } else {
            runCelebration();
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

    const handleSampleRequestSubmit = async (selectedIds: number[], specs: string, speed: string) => {
        if (!quote) return;

        const sampleRequest = {
            status: 'requested',
            requestedItems: selectedIds,
            specifications: specs,
            deliverySpeed: speed,
            requestedAt: new Date().toISOString()
        };

        const updatedNegotiationDetails = {
            ...(quote.negotiation_details || {}),
            sample_request: sampleRequest
        };

        const { error } = await quoteService.update(quote.id, { negotiation_details: updatedNegotiationDetails });

        if (error) {
            showToast('Failed to submit sample request', 'error');
        } else {
            showToast('Sample request submitted successfully');
            setQuote(prev => prev ? { ...prev, negotiation_details: updatedNegotiationDetails } : null);
            setIsSampleRequestModalOpen(false);
        }
    };

    const handleConfirmSample = async () => {
        if (!quote) return;
        const updatedNegotiationDetails = {
            ...(quote.negotiation_details || {}),
            sample_request: {
                ...((quote.negotiation_details as any)?.sample_request || {}),
                status: 'confirmed',
                confirmedAt: new Date().toISOString()
            }
        };
        await quoteService.update(quote.id, { negotiation_details: updatedNegotiationDetails });
        setQuote(prev => prev ? { ...prev, negotiation_details: updatedNegotiationDetails } : null);
        showToast('Sample details confirmed');
    };

    const handleDownloadInvoice = async () => {
        if (!invoiceTemplateRef.current) {
            showToast('Invoice template not found', 'error');
            return;
        }

        try {
            showToast('Generating PDF...');

            // Create a temporary container to render the content for capture
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.top = '0';
            tempContainer.style.left = '0';
            tempContainer.style.zIndex = '-9999';
            
            // Clone the content
            const clone = invoiceTemplateRef.current.cloneNode(true) as HTMLElement;
            
            // Reset positioning on the clone so it's visible in the temp container
            clone.style.position = 'relative';
            clone.style.left = '0';
            clone.style.top = '0';
            
            tempContainer.appendChild(clone);
            document.body.appendChild(tempContainer);

            // Explicitly set crossOrigin for images to help html2canvas capture them
            const allImages = clone.getElementsByTagName('img');
            for (let i = 0; i < allImages.length; i++) {
                allImages[i].crossOrigin = "anonymous";
            }

            // Wait a brief moment for images to settle
            await new Promise(resolve => setTimeout(resolve, 100));

            // Generate canvas from the invoice template
            const canvas = await html2canvas(clone, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: false
            });

            // Clean up
            document.body.removeChild(tempContainer);

            // Create PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Calculate scaling to fit the page
            const imgWidthMM = (canvas.width * 25.4) / 96; // Convert px to mm
            const imgHeightMM = (canvas.height * 25.4) / 96;
            const scale = Math.min(pdfWidth / imgWidthMM, pdfHeight / imgHeightMM);

            const scaledWidth = imgWidthMM * scale;
            const scaledHeight = imgHeightMM * scale;

            // Center on page
            const x = (pdfWidth - scaledWidth) / 2;
            const y = 10;

            pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

            const sampleRequest = (quote?.negotiation_details as any)?.sample_request;
            const invoiceNumber = sampleRequest?.admin_response?.invoiceNumber || 'invoice';
            pdf.save(`${invoiceNumber}.pdf`);

            showToast('Invoice downloaded successfully');
        } catch (error) {
            console.error('Error generating PDF:', error);
            showToast('Failed to download invoice. Please try again.', 'error');
        }
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

    // Compute total unread messages for floating chat badge
    const totalChatMessages = useMemo(() => {
        if (!quote?.negotiation_details?.history) return 0;
        return quote.negotiation_details.history.filter(h => h.relatedLineItemId || h.action === 'info').length;
    }, [quote]);

    // Get all conversations grouped by product
    const productConversations = useMemo(() => {
        if (!quote?.order?.lineItems) return [];
        return quote.order.lineItems.map(item => ({
            item,
            messages: getLineItemHistory(item.id),
            hasUnread: getLineItemHistory(item.id).some(h => h.sender === 'factory')
        }));
    }, [quote]);

    // Auto-scroll chat to bottom when messages change
    useEffect(() => {
        if (chatMessagesEndRef.current && isChatPanelOpen) {
            chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [quote?.negotiation_details?.history, isChatPanelOpen, activeChatItemId]);

    // Close chat panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (chatPanelRef.current && !chatPanelRef.current.contains(event.target as Node)) {
                // Check if click is on the floating button
                const floatingBtn = document.getElementById('floating-chat-btn');
                if (floatingBtn && floatingBtn.contains(event.target as Node)) return;
                setIsChatPanelOpen(false);
            }
        };
        if (isChatPanelOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isChatPanelOpen]);

    // Open chat panel to specific product
    const openChatForProduct = (itemId: number) => {
        setActiveChatItemId(itemId);
        setIsChatPanelOpen(true);
    };

    const handleSendChat = async (lineItemId: number) => {
        const chatState = chatStates[lineItemId] || { message: '', file: null };
        if (!chatState.message.trim() && !chatState.file) return;

        cancellationRefs.current[lineItemId] = false;
        setUploadingChats(prev => ({ ...prev, [lineItemId]: true }));

        let attachmentUrl = '';
        if (chatState.file) {
            try {
                const fileExt = chatState.file.name.split('.').pop();
                const fileName = `${quote.userId}/${quote.id}/chat/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { data, error } = await layoutProps.supabase.storage
                    .from('quote-attachments')
                    .upload(fileName, chatState.file);
                
                if (cancellationRefs.current[lineItemId]) {
                    if (data?.path) {
                        await layoutProps.supabase.storage.from('quote-attachments').remove([data.path]);
                    }
                    return;
                }

                if (error) throw error;
                if (data) attachmentUrl = data.path;
            } catch (error: any) {
                console.error('Upload error:', error);
                if (cancellationRefs.current[lineItemId]) return;
                showToast('Failed to upload attachment', 'error');
                setUploadingChats(prev => ({ ...prev, [lineItemId]: false }));
                return;
            }
        }

        if (cancellationRefs.current[lineItemId]) return;

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
        setUploadingChats(prev => ({ ...prev, [lineItemId]: false }));
    };

    const handleCancelUpload = (lineItemId: number) => {
        cancellationRefs.current[lineItemId] = true;
        setUploadingChats(prev => ({ ...prev, [lineItemId]: false }));
        showToast('Upload cancelled');
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

    const toggleAllExecutionSteps = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (expandedExecutionSteps.length === executionPlan.length) {
            setExpandedExecutionSteps([]);
        } else {
            setExpandedExecutionSteps(executionPlan.map((_, i) => i));
        }
    };

    // Tab configuration
    const tabs: { id: TabType; label: string; icon: ReactNode; badge?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <Info size={18} /> },
        { id: 'products', label: 'Products', icon: <Package size={18} />, badge: order.lineItems.length },
        { id: 'timeline', label: 'Timeline', icon: <History size={18} />, badge: negotiationHistory.length },
        { id: 'files', label: 'Files', icon: <FileText size={18} />, badge: fileLinks.length || quote?.files?.length || 0 },
        ...(sampleRequest ?
            [{ id: 'tracking' as TabType, label: 'Sample Tracking', icon: <Truck size={18} /> }] :
            []
        )
    ];

    return (
        <MainLayout {...layoutProps}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
                {/* Compact Header - Zomato Style */}
                <div className="mb-6">
                    {/* Back button row */}
                    <button onClick={() => handleSetCurrentPage('myQuotes')} className="group flex items-center text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-4">
                        <ChevronLeft size={20} className="mr-1" />
                        <span className="text-sm font-medium">Back to Quotes</span>
                    </button>

                    {/* Main Header Card - Compact */}
                    <div ref={quoteDetailsRef} className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                        <div className={`h-1.5 bg-gradient-to-r ${getStatusGradient(status)}`}></div>
                        <div className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:flex w-14 h-14 rounded-xl bg-gradient-to-br from-[#c20c0b] to-pink-600 items-center justify-center text-white shadow-lg">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quote #{id.slice(0, 8)}</h1>
                                            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full border ${getStatusColor(status)} flex items-center gap-1`}>
                                                {status === 'Accepted' && <CheckCheck size={12} />}
                                                {(status === 'Admin Accepted' || status === 'Client Accepted') && <Check size={12} />}
                                                {status === 'Admin Accepted' ? 'Admin Approved' : status === 'Client Accepted' ? 'Client Approved' : status}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-3">
                                            <span className="flex items-center"><Calendar size={14} className="mr-1"/> {formatFriendlyDate(submittedAt)}</span>
                                            <span className="flex items-center"><Package size={14} className="mr-1"/> {order.lineItems.length} items</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Actions - Desktop only */}
                                <div className="hidden md:flex items-center gap-2">
                                    <button onClick={handleDownloadPdf} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all" title="Download PDF">
                                        <Download size={20} />
                                    </button>
                                    <button onClick={() => setIsHistoryModalOpen(true)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all" title="View History">
                                        <History size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Factory Response Summary - Compact */}
                            {(status === 'Responded' || status === 'In Negotiation' || status === 'Accepted' || status === 'Admin Accepted' || status === 'Client Accepted') && response_details && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <DollarSign size={20} className="text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Quoted Price</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">${response_details.price}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Lead Time</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{response_details.leadTime}</p>
                                        </div>
                                    </div>
                                    {response_details.notes && (
                                        <div className="flex-1 min-w-[200px]">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">"{response_details.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Zomato-style Tabs */}
                <div className="sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-md py-3 mb-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="max-w-6xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-[#c20c0b] text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        activeTab === tab.id
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}>{tab.badge}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                            {/* Status Timeline */}
                            <div className="lg:col-span-2 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-white/10">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Sparkles size={20} className="text-[#c20c0b]" /> Order Progress
                                </h3>
                                <StatusTimeline status={status} />

                                {/* Quick Summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{order.lineItems.length}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Products</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{order.lineItems.reduce((acc, item) => acc + (item.qty || 0), 0).toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Qty</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-[#c20c0b] dark:text-red-400">${response_details?.price || '—'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Quoted</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{response_details?.leadTime || '—'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Lead Time</p>
                                    </div>
                                </div>

                                {/* Product Preview */}
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-800 dark:text-white">Products</h4>
                                        <button onClick={() => setActiveTab('products')} className="text-sm text-[#c20c0b] font-medium hover:underline">View All →</button>
                                    </div>
                                    <div className="space-y-2">
                                        {order.lineItems.slice(0, 3).map((item, idx) => {
                                            const itemResponse = response_details?.lineItemResponses?.find(r => r.lineItemId === item.id);
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-[#c20c0b]/10 flex items-center justify-center text-[#c20c0b] font-bold text-sm">{idx + 1}</div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{item.category}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.qty} units • {item.fabricQuality}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">${itemResponse?.price || item.targetPrice}</p>
                                                        {itemResponse?.price && <p className="text-[10px] text-gray-400">Target: ${item.targetPrice}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {order.lineItems.length > 3 && (
                                            <button onClick={() => setActiveTab('products')} className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] transition-colors">
                                                +{order.lineItems.length - 3} more products
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {status !== 'Accepted' && status !== 'Declined' && (
                                    <div className="flex flex-wrap justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/10">
                                        {(status === 'Responded' || status === 'In Negotiation') && !sampleRequest && (
                                            <button
                                                onClick={() => setIsSampleRequestModalOpen(true)}
                                                className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700 font-semibold rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition shadow-sm flex items-center gap-2"
                                            >
                                                <Box size={18} /> Request Sample
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsNegotiationModalOpen(true)}
                                            className="px-4 py-2 bg-[#c20c0b] text-white font-semibold rounded-lg hover:bg-[#a50a09] transition shadow-md flex items-center gap-2"
                                        >
                                            <MessageSquare size={18} /> Negotiate / Respond
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Factory Card */}
                                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                    <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-5 py-3">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Building size={16} /> Factory</h3>
                                    </div>
                                    <div className="p-5">
                                        {factory ? (
                                            <div className="flex items-start gap-3">
                                                <img src={factory.imageUrl} alt={factory.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100 dark:border-white/10" />
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{factory.name}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-300 flex items-center mt-0.5">
                                                        <MapPin size={12} className="mr-1" /> {factory.location}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-300 italic">Open Request</p>
                                        )}
                                    </div>
                                </div>

                                {/* Logistics Card */}
                                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                    <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-5 py-3">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Truck size={16} /> Logistics</h3>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-300">Country</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{order.shippingCountry}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-300">Port</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{order.shippingPort}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sample Request Card */}
                                {sampleRequest && (
                                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                <Box size={16} /> Sample Request
                                            </h3>
                                        </div>
                                        <div className="p-5 space-y-3">
                                            {/* Status Badge */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500 dark:text-gray-300">Status</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                                                    sampleRequest.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                    sampleRequest.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                    sampleRequest.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                                    sampleRequest.status === 'paid' ? 'bg-indigo-100 text-indigo-700' :
                                                    sampleRequest.status === 'payment_pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {sampleRequest.status === 'sent' ? 'Shipped' : sampleRequest.status}
                                                </span>
                                            </div>

                                            {/* Quick Stats */}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-300">Items</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{sampleRequest.requestedItems.length}</span>
                                            </div>

                                            {sampleRequest.admin_response && (
                                                <>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500 dark:text-gray-300">Total</span>
                                                        <span className="font-bold text-purple-600 dark:text-purple-400">
                                                            ${sampleRequest.admin_response.total}
                                                        </span>
                                                    </div>

                                                    {/* Tracking Number */}
                                                    {sampleRequest.admin_response.commercialData?.trackingNumber && (
                                                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tracking</p>
                                                            <div className="flex items-center gap-2">
                                                                <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-gray-900 dark:text-white truncate">
                                                                    {sampleRequest.admin_response.commercialData.trackingNumber}
                                                                </code>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(sampleRequest.admin_response.commercialData.trackingNumber);
                                                                        showToast('Copied!');
                                                                    }}
                                                                    className="p-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                                                >
                                                                    <Copy size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="pt-3 space-y-2">
                                                        <button
                                                            onClick={handleDownloadInvoice}
                                                            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <Download size={14} /> Download Invoice
                                                        </button>
                                                        {(sampleRequest.status === 'sent' || sampleRequest.status === 'delivered' || sampleRequest.status === 'confirmed') && (
                                                            <button
                                                                onClick={() => setActiveTab('tracking')}
                                                                className="w-full py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Truck size={14} /> Track Shipment
                                                            </button>
                                                        )}
                                                    </div>

                                                    {sampleRequest.status === 'sent' && (
                                                        <button
                                                            onClick={handleConfirmSample}
                                                            className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle size={14} /> Confirm Receipt
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Help Card */}
                                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-lg">
                                    <h3 className="font-bold mb-2 flex items-center gap-2"><Phone size={16} /> Need Help?</h3>
                                    <p className="text-sm text-gray-300 mb-3">Our team can assist with negotiations.</p>
                                    <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/10">
                                        Contact Support
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PRODUCTS TAB */}
                    {activeTab === 'products' && (
                        <div className="animate-fade-in">
                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Package size={20} className="text-[#c20c0b]" /> Product Specifications
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click on any product to view details or chat with factory</p>
                                </div>

                                {/* Product Header - Desktop */}
                                <div className="hidden md:grid grid-cols-12 gap-4 w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <div className="col-span-4 text-left">Product</div>
                                    <div className="col-span-2 text-center">Qty</div>
                                    <div className="col-span-2 text-right">Target</div>
                                    <div className="col-span-2 text-right">Quoted</div>
                                    <div className="col-span-2 text-right">Actions</div>
                                </div>

                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {order.lineItems.map((item, index) => {
                                        const isExpanded = expandedItems.includes(index);
                                        const itemResponse = response_details?.lineItemResponses?.find(r => r.lineItemId === item.id);
                                        const history = getLineItemHistory(item.id);

                                        const isClientApproved = quote.negotiation_details?.clientApprovedLineItems?.includes(item.id);
                                        const isAdminApproved = quote.negotiation_details?.adminApprovedLineItems?.includes(item.id);

                                        const isAccepted = status === 'Accepted' || status === 'Admin Accepted' || status === 'Client Accepted';

                                        const getAgreedPrice = () => {
                                            const factoryPrice = itemResponse?.price;
                                            const clientPrice = item.targetPrice;
                                            if (!factoryPrice) return clientPrice;

                                            const fullHistory = quote.negotiation_details?.history || [];
                                            for (let i = fullHistory.length - 1; i >= 0; i--) {
                                                const h = fullHistory[i];
                                                if ((h.action === 'offer' || h.action === 'counter') && h.lineItemPrices?.some(p => p.lineItemId === item.id)) {
                                                    return h.sender === 'client' ? clientPrice : factoryPrice;
                                                }
                                            }
                                            return factoryPrice;
                                        };

                                        const agreedPrice = getAgreedPrice();
                                        const showAgreedPrice = isAccepted;

                                        return (
                                            <div key={index} className="transition-all duration-200">
                                                <div
                                                    onClick={() => toggleExpand(index)}
                                                    className={`p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center cursor-pointer transition-colors ${isExpanded ? 'bg-[#c20c0b]/5 dark:bg-[#c20c0b]/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
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
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleSendChat(item.id);
                                                                } else if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    if (uploadingChats[item.id]) handleCancelUpload(item.id);
                                                                    else setChatStates(prev => ({ ...prev, [item.id]: { message: '', file: null } }));
                                                                }
                                                            }}
                                                        />
                                                        <button 
                                                            onClick={() => handleSendChat(item.id)}
                                                            disabled={(!chatStates[item.id]?.message?.trim() && !chatStates[item.id]?.file) || uploadingChats[item.id]}
                                                            className="p-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {uploadingChats[item.id] ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                                        </button>
                                                        {uploadingChats[item.id] && (
                                                            <button 
                                                                onClick={() => handleCancelUpload(item.id)}
                                                                className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                                title="Cancel Upload"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}
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
                                </div>

                                {/* Totals Footer */}
                                <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total Items</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{order.lineItems.length}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total Quantity</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{order.lineItems.reduce((acc, item) => acc + (item.qty || 0), 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {response_details?.price && (
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total Quoted</p>
                                                <p className="text-2xl font-bold text-[#c20c0b] dark:text-red-400">${response_details.price}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TIMELINE TAB */}
                    {activeTab === 'timeline' && (
                        <div className="animate-fade-in">
                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <History size={20} className="text-[#c20c0b]" /> Negotiation Timeline
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete history of quotes, offers, and discussions</p>
                                </div>

                                <div className="p-6">
                                    {negotiationHistory.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <History size={32} className="text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400">No negotiation history yet.</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Activity will appear here once the factory responds.</p>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                            <div className="space-y-6">
                                                {negotiationHistory.map((entry, idx) => (
                                                    <div key={idx} className="relative flex gap-4">
                                                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                            entry.sender === 'client'
                                                                ? 'bg-[#c20c0b] text-white'
                                                                : 'bg-blue-500 text-white'
                                                        }`}>
                                                            {entry.sender === 'client' ? <Send size={14} /> : <MessageSquare size={14} />}
                                                        </div>
                                                        <div className="flex-1 pb-6">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                                                    {entry.sender === 'client' ? 'You' : 'Factory'}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {formatFriendlyDate(entry.timestamp)}
                                                                </span>
                                                            </div>
                                                            {entry.price && (
                                                                <div className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold rounded-lg text-sm mb-2">
                                                                    ${entry.price}
                                                                </div>
                                                            )}
                                                            {entry.message && (
                                                                <p className="text-gray-600 dark:text-gray-300 text-sm">{entry.message}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Execution Plan in Timeline Tab */}
                                {showExecutionPlan && (
                                    <div className="border-t border-gray-100 dark:border-gray-800">
                                        <div
                                            className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                            onClick={() => setIsExecutionPlanExpanded(!isExecutionPlanExpanded)}
                                        >
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <ClipboardList size={20} className="text-[#c20c0b]" /> Execution Plan
                                            </h3>
                                            {isExecutionPlanExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                        </div>

                                        {isExecutionPlanExpanded && (
                                            <div className="p-6 pt-0 animate-fade-in">
                                                <div className="space-y-4">
                                                    {executionPlan.map((step, index) => {
                                                        const color = STEP_COLORS[index % STEP_COLORS.length];
                                                        return (
                                                            <div key={index} className="flex items-start gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color.bg} ${color.text}`}>
                                                                    {getStepIcon(index, step.title)}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{step.title}</h4>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FILES TAB */}
                    {activeTab === 'files' && (
                        <div className="animate-fade-in">
                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <FileText size={20} className="text-[#c20c0b]" /> Attachments
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sample images, tech packs, and documents</p>
                                </div>

                                <div className="p-6">
                                    {isLoadingFiles ? (
                                        <div className="flex justify-center py-12">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c20c0b]"></div>
                                        </div>
                                    ) : fileLinks.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {fileLinks.map((file, i) => {
                                                const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                                const hasUrl = !!file.url;
                                                const errorMsg = (file as any).error;
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all group ${hasUrl ? 'hover:shadow-lg cursor-pointer' : 'opacity-70'}`}
                                                        onClick={() => hasUrl && (isImage ? openLightbox(file.url) : window.open(file.url, '_blank'))}
                                                    >
                                                        {isImage && hasUrl ? (
                                                            <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                                                                <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                                    <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="aspect-square bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center p-4">
                                                                <FileText size={40} className="text-gray-400 mb-2" />
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate w-full">{file.name.split('.').pop()?.toUpperCase()}</p>
                                                            </div>
                                                        )}
                                                        <div className="p-3 bg-white dark:bg-gray-900">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {hasUrl ? 'Click to view' : <span className="text-red-500">{errorMsg || 'Failed to load'}</span>}
                                                            </p>
                                                        </div>
                                                        {hasUrl && (
                                                            <a
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg text-gray-600 dark:text-gray-300 hover:text-[#c20c0b] transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Download"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Download size={16} />
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : quote?.files && quote.files.length > 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                <AlertCircle size={32} className="text-red-500" />
                                            </div>
                                            <p className="text-red-500 dark:text-red-400 mb-2">Failed to load attachments</p>
                                            <button onClick={fetchSignedUrls} className="text-sm font-medium text-[#c20c0b] hover:underline flex items-center gap-1 mx-auto">
                                                <RefreshCw size={14} /> Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <FileText size={32} className="text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400">No attachments found</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Files uploaded with this quote will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRACKING TAB */}
                    {activeTab === 'tracking' && sampleRequest && (
                        <div className="animate-fade-in space-y-6">
                            {/* Header Card with Status */}
                            <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Activity size={20} className="text-[#c20c0b]" /> Sample Request Activity
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                        sampleRequest.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                        sampleRequest.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                        sampleRequest.status === 'sent' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                        sampleRequest.status === 'paid' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' :
                                        sampleRequest.status === 'payment_pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                    }`}>
                                        {sampleRequest.status === 'sent' ? 'Shipped' : sampleRequest.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Complete timeline of your sample request from submission to delivery
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column: Activity Timeline */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 p-6">
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                            <History size={18} className="text-[#c20c0b]" /> Activity Timeline
                                        </h4>

                                        <SampleActivityTimeline
                                            sampleRequest={sampleRequest}
                                            lineItems={order.lineItems}
                                        />
                                    </div>

                                    {/* Show courier tracking ONLY when shipped */}
                                    {(sampleRequest.status === 'sent' || sampleRequest.status === 'delivered' || sampleRequest.status === 'confirmed') &&
                                     sampleRequest.admin_response?.commercialData?.trackingNumber && (
                                        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 p-6">
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <Truck size={18} className="text-blue-600" /> Live Courier Tracking
                                            </h4>

                                            {isTrackingLoading ? (
                                                <div className="space-y-6 p-4">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="flex gap-4 animate-pulse">
                                                            <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                                            <div className="flex-1 space-y-2">
                                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="relative pl-2">
                                                    {/* Vertical Line */}
                                                    <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-800"></div>

                                                    <div className="space-y-8">
                                                        {trackingEvents.map((event, idx) => (
                                                            <div key={idx} className="relative flex gap-6 group">
                                                                {/* Dot */}
                                                                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shrink-0 ${event.current ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                                                    {event.current ? (
                                                                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                                                                    ) : (
                                                                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                                                                    )}
                                                                </div>

                                                                {/* Content */}
                                                                <div className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${event.current ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800' : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}`}>
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className={`font-bold ${event.current ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                                                            {event.status}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                                            {event.time}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{event.description}</p>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                        <MapPin size={12} /> {event.location}
                                                                        <span className="mx-1">•</span>
                                                                        <Calendar size={12} /> {event.date}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Sample Contents Droplist */}
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 p-6">
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Box size={18} className="text-purple-600" /> Package Contents
                                        </h4>
                                        
                                        <div className="space-y-3">
                                            {sampleRequest.admin_response?.items?.map((item: any, idx: number) => (
                                                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md bg-white dark:bg-gray-800">
                                                    <button 
                                                        onClick={() => toggleSampleItem(idx)}
                                                        className="w-full flex items-center justify-between p-4 text-left"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                                                {item.photos && item.photos.length > 0 ? (
                                                                    <img src={getPhotoUrl(item.photos[0])} alt="" className="w-full h-full object-cover rounded-lg" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                                ) : (
                                                                    <Shirt size={24} className="text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.category}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{item.sampleQty || 1} unit(s)</p>
                                                            </div>
                                                        </div>
                                                        {expandedSampleItems.includes(idx) ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                                    </button>
                                                    
                                                    {expandedSampleItems.includes(idx) && (
                                                        <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                                <div>
                                                                    <span className="block text-gray-400 uppercase text-[10px] font-bold">Cost</span>
                                                                    ${item.sampleCost}
                                                                </div>
                                                                <div>
                                                                    <span className="block text-gray-400 uppercase text-[10px] font-bold">Total</span>
                                                                    ${((item.sampleCost || 0) * (item.sampleQty || 1)).toFixed(2)}
                                                                </div>
                                                            </div>
                                                            {item.photos && item.photos.length > 0 && (
                                                                <div className="mt-3">
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Photos</p>
                                                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                                        {item.photos.map((photo: string, pIdx: number) => (
                                                                            <img
                                                                                key={pIdx}
                                                                                src={getPhotoUrl(photo)}
                                                                                alt="Sample"
                                                                                className="w-32 h-32 rounded-lg object-cover border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                                                                                onClick={() => openLightbox(getPhotoUrl(photo))}
                                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Invoice Card */}
                                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Value</p>
                                                <p className="text-3xl font-bold mt-1">${sampleRequest.admin_response?.total}</p>
                                            </div>
                                            <div className="p-2 bg-white/10 rounded-lg">
                                                <FileText size={20} />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleDownloadInvoice}
                                            className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Download size={16} /> Download Invoice
                                        </button>
                                    </div>
                                    
                                    {(sampleRequest.status === 'sent' || sampleRequest.status === 'delivered') && (
                                        <button
                                            onClick={handleConfirmSample}
                                            className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-500/30 hover:bg-green-700 hover:shadow-green-500/40 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={20} /> Confirm Receipt
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating Chat Button - Positioned above Auctave Brain chat */}
                <button
                    id="floating-chat-btn"
                    onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
                    className="fixed bottom-36 md:bottom-28 right-6 z-[60] w-14 h-14 rounded-full bg-[#c20c0b] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
                >
                    <MessageSquare size={24} />
                    {totalChatMessages > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {totalChatMessages > 9 ? '9+' : totalChatMessages}
                        </span>
                    )}
                </button>

                {/* Slide-out Chat Panel */}
                {isChatPanelOpen && createPortal(
                    <div className="fixed inset-0 z-[70]">
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsChatPanelOpen(false)} />
                        <div
                            ref={chatPanelRef}
                            className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-right"
                        >
                            {/* Chat Panel Header */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-[#c20c0b] to-pink-600 text-white">
                                <h3 className="font-bold flex items-center gap-2">
                                    <MessageSquare size={20} /> Product Discussions
                                </h3>
                                <button onClick={() => setIsChatPanelOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Product List / Chat View */}
                            {activeChatItemId === null ? (
                                <div className="flex-1 overflow-y-auto">
                                    <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Select a product to view or start a discussion.</p>
                                    {order.lineItems.map((item, idx) => {
                                        const history = getLineItemHistory(item.id);
                                        const lastMessage = history[history.length - 1];
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveChatItemId(item.id)}
                                                className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 text-left"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-[#c20c0b]/10 flex items-center justify-center text-[#c20c0b] font-bold shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{item.category}</p>
                                                    {lastMessage ? (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {lastMessage.sender === 'client' ? 'You: ' : 'Factory: '}
                                                            {lastMessage.message || `$${lastMessage.price}`}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">No messages yet</p>
                                                    )}
                                                </div>
                                                {history.length > 0 && (
                                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                                        {history.length}
                                                    </span>
                                                )}
                                                <ChevronRight size={16} className="text-gray-400" />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <>
                                    {/* Chat View for Selected Product */}
                                    {(() => {
                                        const item = order.lineItems.find(i => i.id === activeChatItemId);
                                        if (!item) return null;
                                        const history = getLineItemHistory(item.id);
                                        const itemIndex = order.lineItems.findIndex(i => i.id === activeChatItemId);
                                        return (
                                            <>
                                                {/* Product Header */}
                                                <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
                                                    <button onClick={() => setActiveChatItemId(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                                                        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                                                    </button>
                                                    <div className="w-8 h-8 rounded-lg bg-[#c20c0b]/10 flex items-center justify-center text-[#c20c0b] font-bold text-sm">
                                                        {itemIndex + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{item.category}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.qty} units • ${item.targetPrice}/unit</p>
                                                    </div>
                                                </div>

                                                {/* Messages */}
                                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                    {history.length === 0 ? (
                                                        <div className="text-center py-8 text-gray-400 text-sm">
                                                            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                                            <p>No messages yet.</p>
                                                            <p className="text-xs mt-1">Start a discussion about this product.</p>
                                                        </div>
                                                    ) : (
                                                        history.map((h, i) => (
                                                            <div key={i} className={`flex ${h.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                                                                    h.sender === 'client'
                                                                        ? 'bg-[#c20c0b] text-white rounded-tr-none'
                                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-none'
                                                                }`}>
                                                                    <div className="flex justify-between items-center gap-4 mb-1">
                                                                        <span className={`text-[10px] font-bold uppercase ${h.sender === 'client' ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                                            {h.sender === 'client' ? 'You' : 'Factory'}
                                                                        </span>
                                                                        <span className={`text-[10px] ${h.sender === 'client' ? 'text-red-200' : 'text-gray-400'}`}>
                                                                            {new Date(h.timestamp).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    {h.price && <div className="font-bold text-lg mb-1">${h.price}</div>}
                                                                    {h.message && <p className="text-sm opacity-90 whitespace-pre-wrap">{h.message}</p>}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                    <div ref={chatMessagesEndRef} />
                                                </div>

                                                {/* Input */}
                                                <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                                                    <div className="flex items-end gap-2">
                                                        <button
                                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors relative"
                                                            onClick={() => document.getElementById(`chat-file-${item.id}`)?.click()}
                                                        >
                                                            <Paperclip size={20} />
                                                            {chatStates[item.id]?.file && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
                                                        </button>
                                                        <input type="file" id={`chat-file-${item.id}`} className="hidden" onChange={(e) => e.target.files && setChatStates(prev => ({ ...prev, [item.id]: { ...prev[item.id], file: e.target.files![0] } }))} />

                                                        <textarea
                                                            value={chatStates[item.id]?.message || ''}
                                                            onChange={(e) => setChatStates(prev => ({ ...prev, [item.id]: { ...prev[item.id], message: e.target.value } }))}
                                                            placeholder="Type a message..."
                                                            className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-white resize-none max-h-24 focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"
                                                            rows={1}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleSendChat(item.id);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleSendChat(item.id)}
                                                            disabled={(!chatStates[item.id]?.message?.trim() && !chatStates[item.id]?.file) || uploadingChats[item.id]}
                                                            className="p-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {uploadingChats[item.id] ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                                                        </button>
                                                    </div>
                                                    {chatStates[item.id]?.file && (
                                                        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                            <span className="truncate max-w-[200px]">{chatStates[item.id].file?.name}</span>
                                                            <button onClick={() => setChatStates(prev => ({ ...prev, [item.id]: { ...prev[item.id], file: null } }))} className="text-red-500 hover:text-red-700"><X size={12}/></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

                {/* Mobile Sticky Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 md:hidden z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 flex items-center gap-3 shadow-lg">
                    <button onClick={handleDownloadPdf} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg">
                        <Download size={20} />
                    </button>
                    <button onClick={() => setIsHistoryModalOpen(true)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg">
                        <History size={20} />
                    </button>
                    <div className="flex-1 flex gap-2 justify-end">
                        {(status === 'Responded' || status === 'In Negotiation' || status === 'Admin Accepted') && (
                            <button onClick={() => setIsNegotiationModalOpen(true)} className="px-4 py-2 text-gray-700 dark:text-white font-medium border border-gray-200 dark:border-gray-700 rounded-lg">
                                Negotiate
                            </button>
                        )}
                        {(status === 'Responded' || status === 'In Negotiation') && (
                            <button onClick={handleAcceptQuote} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg flex items-center gap-1">
                                <Check size={16} /> Accept
                            </button>
                        )}
                        {status === 'Admin Accepted' && (
                            <button onClick={handleAcceptQuote} className="px-4 py-2 bg-[#c20c0b] text-white font-medium rounded-lg flex items-center gap-1">
                                <CheckCheck size={16} /> Finalize
                            </button>
                        )}
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
                    {allImages[currentImageIndex] && (
                        <a 
                            href={allImages[currentImageIndex].url} 
                            download={allImages[currentImageIndex].name}
                            className="absolute top-6 right-20 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
                            onClick={(e) => e.stopPropagation()}
                            title="Download"
                        >
                            <Download size={32} />
                        </a>
                    )}
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        {allImages.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length); }} className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all border border-white/10 backdrop-blur-sm group cursor-pointer">
                                    <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % allImages.length); }} className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all border border-white/10 backdrop-blur-sm group cursor-pointer">
                                    <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </>
                        )}
                        {allImages[currentImageIndex] && (
                            <img src={allImages[currentImageIndex].url} alt={allImages[currentImageIndex].name} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none" />
                        )}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full border border-white/20">
                            {currentImageIndex + 1} / {allImages.length}
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

            {/* Sample Request Modal */}
            {isSampleRequestModalOpen && (
                <SampleRequestModal 
                    lineItems={order.lineItems}
                    onSubmit={handleSampleRequestSubmit}
                    onClose={() => setIsSampleRequestModalOpen(false)}
                />
            )}

            {/* Negotiation History Modal */}
            {isHistoryModalOpen && (
                <NegotiationHistoryModal
                    history={negotiationHistory}
                    submittedAt={submittedAt}
                    factoryName={factory?.name}
                    status={status}
                    lineItems={quote.order.lineItems}
                    onClose={() => setIsHistoryModalOpen(false)}
                />
            )}

            {/* Hidden Invoice Template for PDF Generation */}
            {sampleRequest?.admin_response && (
                <div
                    ref={invoiceTemplateRef}
                    style={{
                        position: 'absolute',
                        left: '-9999px',
                        top: '-9999px',
                        width: '210mm',
                        background: 'white',
                        padding: '20mm'
                    }}
                >
                    {/* Professional Commercial Invoice Template */}
                    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
                        {/* Header */}
                        <div style={{ borderBottom: '3px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>COMMERCIAL INVOICE</h1>
                            <div style={{ marginTop: '10px', fontSize: '12px' }}>
                                <p style={{ margin: '3px 0' }}><strong>Invoice Number:</strong> {sampleRequest.admin_response.invoiceNumber}</p>
                                {sampleRequest.admin_response.invoiceDate && (
                                    <p style={{ margin: '3px 0' }}><strong>Invoice Date:</strong> {new Date(sampleRequest.admin_response.invoiceDate).toLocaleDateString()}</p>
                                )}
                            </div>
                        </div>

                        {/* Shipper & Consignee Section */}
                        {sampleRequest.admin_response.commercialData && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                {/* Shipper */}
                                {sampleRequest.admin_response.commercialData.shipperName && (
                                    <div style={{ border: '1px solid #000', padding: '10px' }}>
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Shipper/Exporter</h3>
                                        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                                            <p style={{ margin: '2px 0', fontWeight: 'bold' }}>{sampleRequest.admin_response.commercialData.shipperName}</p>
                                            {sampleRequest.admin_response.commercialData.shipperAddress && (
                                                <p style={{ margin: '2px 0' }}>{sampleRequest.admin_response.commercialData.shipperAddress}</p>
                                            )}
                                            <p style={{ margin: '2px 0' }}>
                                                {[
                                                    sampleRequest.admin_response.commercialData.shipperCity,
                                                    sampleRequest.admin_response.commercialData.shipperCountry
                                                ].filter(Boolean).join(', ')}
                                            </p>
                                            {sampleRequest.admin_response.commercialData.shipperPhone && (
                                                <p style={{ margin: '2px 0' }}>Tel: {sampleRequest.admin_response.commercialData.shipperPhone}</p>
                                            )}
                                            {sampleRequest.admin_response.commercialData.shipperEmail && (
                                                <p style={{ margin: '2px 0' }}>Email: {sampleRequest.admin_response.commercialData.shipperEmail}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Consignee */}
                                {sampleRequest.admin_response.commercialData.consigneeName && (
                                    <div style={{ border: '1px solid #000', padding: '10px' }}>
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Consignee</h3>
                                        <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                                            <p style={{ margin: '2px 0', fontWeight: 'bold' }}>{sampleRequest.admin_response.commercialData.consigneeName}</p>
                                            {sampleRequest.admin_response.commercialData.consigneeAddress && (
                                                <p style={{ margin: '2px 0' }}>{sampleRequest.admin_response.commercialData.consigneeAddress}</p>
                                            )}
                                            <p style={{ margin: '2px 0' }}>
                                                {[
                                                    sampleRequest.admin_response.commercialData.consigneeCity,
                                                    sampleRequest.admin_response.commercialData.consigneeCountry
                                                ].filter(Boolean).join(', ')}
                                            </p>
                                            {sampleRequest.admin_response.commercialData.consigneePhone && (
                                                <p style={{ margin: '2px 0' }}>Tel: {sampleRequest.admin_response.commercialData.consigneePhone}</p>
                                            )}
                                            {sampleRequest.admin_response.commercialData.consigneeEmail && (
                                                <p style={{ margin: '2px 0' }}>Email: {sampleRequest.admin_response.commercialData.consigneeEmail}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Shipping Information */}
                        {sampleRequest.admin_response.commercialData && (
                            <div style={{ marginBottom: '20px', fontSize: '11px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {sampleRequest.admin_response.commercialData.portOfLoading && (
                                        <p style={{ margin: '2px 0' }}><strong>Port of Loading:</strong> {sampleRequest.admin_response.commercialData.portOfLoading}</p>
                                    )}
                                    {sampleRequest.admin_response.commercialData.portOfDischarge && (
                                        <p style={{ margin: '2px 0' }}><strong>Port of Discharge:</strong> {sampleRequest.admin_response.commercialData.portOfDischarge}</p>
                                    )}
                                    {sampleRequest.admin_response.commercialData.termsOfDelivery && (
                                        <p style={{ margin: '2px 0' }}><strong>Terms of Delivery:</strong> {sampleRequest.admin_response.commercialData.termsOfDelivery}</p>
                                    )}
                                    {sampleRequest.admin_response.commercialData.paymentTerms && (
                                        <p style={{ margin: '2px 0' }}><strong>Payment Terms:</strong> {sampleRequest.admin_response.commercialData.paymentTerms}</p>
                                    )}
                                    {sampleRequest.admin_response.commercialData.courierService && (
                                        <p style={{ margin: '2px 0' }}><strong>Courier Service:</strong> {sampleRequest.admin_response.commercialData.courierService}</p>
                                    )}
                                    {sampleRequest.admin_response.commercialData.trackingNumber && (
                                        <p style={{ margin: '2px 0' }}><strong>Tracking Number:</strong> {sampleRequest.admin_response.commercialData.trackingNumber}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Items Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f0f0f0', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Description</th>
                                    <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>Qty</th>
                                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Unit Price</th>
                                    <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Amount (USD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sampleRequest.admin_response.items?.map((item: any, idx: number) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                                        <td style={{ padding: '8px' }}>{item.category}</td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>{item.sampleQty || 1} {(item.sampleQty || 1) === 1 ? 'pc' : 'pcs'}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>${item.sampleCost?.toFixed(2)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>${((item.sampleCost || 0) * (item.sampleQty || 1)).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div style={{ marginLeft: 'auto', width: '300px', fontSize: '11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderTop: '1px solid #ddd' }}>
                                <span>Subtotal:</span>
                                <span>${sampleRequest.admin_response.subtotal}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderTop: '1px solid #ddd' }}>
                                <span>Shipping Cost:</span>
                                <span>${sampleRequest.admin_response.shippingCost}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderTop: '2px solid #000', fontWeight: 'bold', fontSize: '13px' }}>
                                <span>TOTAL:</span>
                                <span>${sampleRequest.admin_response.total}</span>
                            </div>
                        </div>

                        {/* Notes */}
                        {sampleRequest.admin_response.notes && (
                            <div style={{ marginTop: '20px', fontSize: '11px' }}>
                                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Notes:</p>
                                <p style={{ margin: 0 }}>{sampleRequest.admin_response.notes}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ marginTop: '30px', paddingTop: '10px', borderTop: '1px solid #ddd', fontSize: '10px', textAlign: 'center', color: '#666' }}>
                            <p style={{ margin: 0 }}>This is a computer-generated invoice and does not require a signature.</p>
                        </div>
                    </div>
                </div>
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

// Timeline Event Interface
interface TimelineEvent {
    status: string;
    title: string;
    timestamp: string | null;
    icon: string;
    color: 'purple' | 'blue' | 'green' | 'yellow';
    description: string;
    details?: Record<string, any>;
    isPending?: boolean;
    completed: boolean;
}

// Helper function to build timeline events from sample request data
const buildTimelineEvents = (sampleRequest: any, lineItems: any[]): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 1. Request Submitted
    if (sampleRequest.requestedAt) {
        const requestedItems = lineItems.filter(item =>
            sampleRequest.requestedItems?.includes(item.id)
        );
        events.push({
            status: 'requested',
            title: 'Sample Request Submitted',
            timestamp: sampleRequest.requestedAt,
            icon: 'Send',
            color: 'purple',
            description: `Requested ${requestedItems.length} sample${requestedItems.length !== 1 ? 's' : ''}`,
            details: {
                items: requestedItems.map(item => item.category),
                specifications: sampleRequest.specifications,
                deliverySpeed: sampleRequest.deliverySpeed
            },
            completed: true
        });
    }

    // 2. Invoice Generated
    if (sampleRequest.admin_response?.respondedAt) {
        events.push({
            status: 'payment_pending',
            title: 'Invoice Generated',
            timestamp: sampleRequest.admin_response.respondedAt,
            icon: 'FileText',
            color: 'blue',
            description: `Invoice ${sampleRequest.admin_response.invoiceNumber || 'N/A'} created`,
            details: {
                invoiceNumber: sampleRequest.admin_response.invoiceNumber,
                subtotal: sampleRequest.admin_response.subtotal,
                shipping: sampleRequest.admin_response.shippingCost,
                total: sampleRequest.admin_response.total
            },
            completed: true
        });
    }

    // 3. Payment Confirmed or Awaiting Payment
    if (sampleRequest.paidAt) {
        events.push({
            status: 'paid',
            title: 'Payment Confirmed',
            timestamp: sampleRequest.paidAt,
            icon: 'CheckCircle',
            color: 'green',
            description: 'Payment received and verified',
            details: {
                amount: sampleRequest.admin_response?.total
            },
            completed: true
        });
    } else if (sampleRequest.status === 'payment_pending' ||
               (sampleRequest.admin_response && !sampleRequest.paidAt &&
                sampleRequest.status !== 'paid' && sampleRequest.status !== 'sent' &&
                sampleRequest.status !== 'delivered' && sampleRequest.status !== 'confirmed')) {
        events.push({
            status: 'payment_pending',
            title: 'Awaiting Payment',
            timestamp: null,
            icon: 'Clock',
            color: 'yellow',
            description: 'Waiting for payment confirmation',
            isPending: true,
            completed: false
        });
    }

    // 4. Shipped or Preparing Shipment
    if (sampleRequest.sentAt) {
        events.push({
            status: 'sent',
            title: 'Sample Shipped',
            timestamp: sampleRequest.sentAt,
            icon: 'Truck',
            color: 'blue',
            description: `Shipped via ${sampleRequest.admin_response?.commercialData?.courierService || 'courier'}`,
            details: {
                courier: sampleRequest.admin_response?.commercialData?.courierService,
                trackingNumber: sampleRequest.admin_response?.commercialData?.trackingNumber,
                trackingLink: sampleRequest.admin_response?.commercialData?.trackingLink
            },
            completed: true
        });
    } else if (sampleRequest.status === 'paid') {
        events.push({
            status: 'paid',
            title: 'Preparing Shipment',
            timestamp: null,
            icon: 'Box',
            color: 'yellow',
            description: 'Sample is being prepared for shipment',
            isPending: true,
            completed: false
        });
    }

    // 5. Delivered or In Transit
    if (sampleRequest.deliveredAt) {
        events.push({
            status: 'delivered',
            title: 'Sample Delivered',
            timestamp: sampleRequest.deliveredAt,
            icon: 'MapPin',
            color: 'green',
            description: 'Sample delivered to destination',
            completed: true
        });
    } else if (sampleRequest.status === 'sent') {
        events.push({
            status: 'sent',
            title: 'In Transit',
            timestamp: null,
            icon: 'Truck',
            color: 'blue',
            description: 'Sample is on the way',
            isPending: true,
            completed: false
        });
    }

    // 6. Confirmed by Client or Awaiting Confirmation
    if (sampleRequest.confirmedAt) {
        events.push({
            status: 'confirmed',
            title: 'Receipt Confirmed',
            timestamp: sampleRequest.confirmedAt,
            icon: 'CheckCheck',
            color: 'green',
            description: 'Client confirmed receipt of sample',
            completed: true
        });
    } else if (sampleRequest.status === 'delivered') {
        events.push({
            status: 'delivered',
            title: 'Awaiting Confirmation',
            timestamp: null,
            icon: 'Clock',
            color: 'yellow',
            description: 'Waiting for client confirmation',
            isPending: true,
            completed: false
        });
    }

    return events;
};

// Timeline Event Component
const TimelineEventItem: FC<{ event: TimelineEvent; isLast: boolean }> = ({ event, isLast }) => {
    const [copied, setCopied] = useState(false);

    const iconMap: Record<string, any> = {
        Send, FileText, CheckCircle, Clock, Truck, Box, MapPin, CheckCheck
    };

    const colorMap = {
        purple: {
            bg: 'bg-purple-500',
            text: 'text-purple-600 dark:text-purple-400',
            border: 'border-purple-100 dark:border-purple-800',
            bgLight: 'bg-purple-50/50 dark:bg-purple-900/10'
        },
        blue: {
            bg: 'bg-blue-500',
            text: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-100 dark:border-blue-800',
            bgLight: 'bg-blue-50/50 dark:bg-blue-900/10'
        },
        green: {
            bg: 'bg-green-500',
            text: 'text-green-600 dark:text-green-400',
            border: 'border-green-100 dark:border-green-800',
            bgLight: 'bg-green-50/50 dark:bg-green-900/10'
        },
        yellow: {
            bg: 'bg-yellow-500',
            text: 'text-yellow-600 dark:text-yellow-400',
            border: 'border-yellow-100 dark:border-yellow-800',
            bgLight: 'bg-yellow-50/50 dark:bg-yellow-900/10'
        }
    };

    const Icon = iconMap[event.icon] || Circle;
    const colors = colorMap[event.color];

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="relative flex gap-4">
            {/* Icon */}
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                event.completed ? `${colors.bg} text-white` : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
            } ${event.isPending ? 'animate-pulse' : ''}`}>
                <Icon size={14} />
            </div>

            {/* Content */}
            <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${event.completed ? colors.text : 'text-gray-400 dark:text-gray-500'}`}>
                        {event.title}
                    </span>
                    {event.timestamp && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFriendlyDate(event.timestamp)}
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{event.description}</p>

                {/* Details */}
                {event.details && Object.keys(event.details).filter(k => event.details?.[k]).length > 0 && (
                    <div className={`mt-2 p-3 rounded-lg border ${colors.border} ${colors.bgLight}`}>
                        {event.details.items && event.details.items.length > 0 && (
                            <div className="mb-2">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Items Requested</p>
                                <div className="flex flex-wrap gap-1">
                                    {event.details.items.map((item: string, idx: number) => (
                                        <span key={idx} className="px-2 py-0.5 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {event.details.specifications && (
                            <div className="mb-2">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Specifications</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300">{event.details.specifications}</p>
                            </div>
                        )}

                        {event.details.deliverySpeed && (
                            <div className="mb-2">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Delivery Speed</p>
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                    event.details.deliverySpeed === 'express'
                                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {event.details.deliverySpeed.charAt(0).toUpperCase() + event.details.deliverySpeed.slice(1)}
                                </span>
                            </div>
                        )}

                        {event.details.invoiceNumber && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Invoice:</span>
                                    <span className="ml-1 font-mono text-gray-900 dark:text-white">{event.details.invoiceNumber}</span>
                                </div>
                                {event.details.total && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Total:</span>
                                        <span className="ml-1 font-bold text-gray-900 dark:text-white">${event.details.total}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {event.details.amount && !event.details.invoiceNumber && (
                            <div className="text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                                <span className="ml-1 font-bold text-gray-900 dark:text-white">${event.details.amount}</span>
                            </div>
                        )}

                        {event.details.trackingNumber && (
                            <div className="mt-2">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Tracking</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 rounded font-mono text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                                        {event.details.trackingNumber}
                                    </code>
                                    <button
                                        onClick={() => handleCopy(event.details?.trackingNumber)}
                                        className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                                        title="Copy tracking number"
                                    >
                                        {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="text-gray-500" />}
                                    </button>
                                    {event.details.trackingLink && (
                                        <a
                                            href={event.details.trackingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                        >
                                            Track <ExternalLink size={10} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Main Sample Activity Timeline Component
const SampleActivityTimeline: FC<{
    sampleRequest: any;
    lineItems: any[];
}> = ({ sampleRequest, lineItems }) => {
    const timelineEvents = useMemo(
        () => buildTimelineEvents(sampleRequest, lineItems),
        [sampleRequest, lineItems]
    );

    return (
        <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            <div className="space-y-6">
                {timelineEvents.map((event, idx) => (
                    <TimelineEventItem key={idx} event={event} isLast={idx === timelineEvents.length - 1} />
                ))}
            </div>
        </div>
    );
};

const SampleRequestModal: FC<{ 
    lineItems: any[]; 
    onSubmit: (selectedIds: number[], specs: string, speed: string) => void; 
    onClose: () => void 
}> = ({ lineItems, onSubmit, onClose }) => {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [specs, setSpecs] = useState('');
    const [speed, setSpeed] = useState('regular');

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) return;
        onSubmit(selectedIds, specs, speed);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Request Samples</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Products</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                            {lineItems.map(item => (
                                <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} className="rounded text-[#c20c0b] focus:ring-[#c20c0b]" />
                                    <span className="text-sm text-gray-800 dark:text-gray-200">{item.category}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Speed</label>
                        <select value={speed} onChange={(e) => setSpeed(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                            <option value="regular">Regular (Standard Shipping)</option>
                            <option value="express">Express (Fast Shipping)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specifications / Notes</label>
                        <textarea value={specs} onChange={(e) => setSpecs(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" rows={3} placeholder="Any specific requirements for the samples..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg">Cancel</button>
                        <button type="submit" disabled={selectedIds.length === 0} className="px-4 py-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] disabled:opacity-50">Submit Request</button>
                    </div>
                </form>
            </div>
        </div>
    , document.body);
};

const NegotiationHistoryModal: FC<{ 
    history: any[], 
    submittedAt: string, 
    factoryName?: string, 
    status: string,
    lineItems?: any[],
    onClose: () => void 
}> = ({ history, submittedAt, factoryName, status, lineItems = [], onClose }) => {
    const [expandedPrices, setExpandedPrices] = useState<Record<number, boolean>>({});

    const togglePriceExpand = (index: number) => {
        setExpandedPrices(prev => ({ ...prev, [index]: !prev[index] }));
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <History size={24} className="text-[#c20c0b]" /> Negotiation History
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track conversation and price updates.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gray-50/50 dark:bg-black/20">
                    {/* 1. Submission (System Event) */}
                    <div className="flex flex-col items-center">
                        <div className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold px-3 py-1 rounded-full mb-2 shadow-sm">
                            {formatFriendlyDate(submittedAt)}
                        </div>
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                            Quote Request Submitted to {factoryName || 'Factory'}
                        </div>
                    </div>

                    {/* 2. History Items */}
                    {history.map((item, index) => {
                        const isClient = item.sender === 'client';
                        const hasLineItemPrices = item.lineItemPrices && item.lineItemPrices.length > 0;
                        const isExpanded = expandedPrices[index];
                        const visiblePrices = hasLineItemPrices ? (isExpanded ? item.lineItemPrices : item.lineItemPrices.slice(0, 3)) : [];
                        const hiddenCount = hasLineItemPrices ? item.lineItemPrices.length - visiblePrices.length : 0;

                        return (
                            <div key={index} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-5 shadow-sm border ${
                                    isClient 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 rounded-tr-none' 
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-tl-none'
                                }`}>
                                    <div className="flex justify-between items-center gap-4 mb-3">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${isClient ? 'text-blue-700 dark:text-blue-400' : 'text-[#c20c0b] dark:text-red-400'}`}>
                                            {isClient ? 'You' : factoryName || 'Factory'}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    
                                    {item.price && !hasLineItemPrices && (
                                        <div className="mb-3 pb-3 border-b border-gray-200/50 dark:border-white/10">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Offered Price</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${item.price}</p>
                                        </div>
                                    )}

                                    {hasLineItemPrices && (
                                        <div className="mb-4 bg-white/60 dark:bg-black/20 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                                            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2 flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                <DollarSign size={12} /> Price Updates
                                            </p>
                                            <div className="space-y-2">
                                                {visiblePrices.map((u: any, i: number) => {
                                                    const product = lineItems.find(li => li.id === u.lineItemId);
                                                    return (
                                                        <div key={i} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 shrink-0">
                                                                    {lineItems.findIndex(li => li.id === u.lineItemId) + 1}
                                                                </span>
                                                                <span className="truncate text-gray-800 dark:text-gray-200">{product?.category || 'Item'}</span>
                                                            </div>
                                                            <span className="font-bold font-mono text-gray-900 dark:text-white">${u.price}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {item.lineItemPrices.length > 3 && (
                                                <button 
                                                    onClick={() => togglePriceExpand(index)}
                                                    className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-3 hover:underline flex items-center gap-1 w-full justify-center"
                                                >
                                                    {isExpanded ? <>Show Less <ChevronUp size={12} /></> : <>Show {hiddenCount} more items <ChevronDown size={12} /></>}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    
                                    {item.message && (
                                        <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                            {item.message}
                                        </div>
                                    )}

                                    {item.attachments && item.attachments.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-white/10">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Paperclip size={12}/> Attachments</p>
                                            <div className="flex flex-wrap gap-2">
                                                {item.attachments.map((att: string, i: number) => (
                                                    <div key={i} className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                        <FileText size={12} /> File {i + 1}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="mt-2 text-right">
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                            {new Date(item.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* 3. Current Status (System Event) */}
                    <div className="flex flex-col items-center pt-4 pb-4">
                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(status)} flex items-center gap-2 shadow-sm`}>
                            {status === 'Accepted' && <CheckCheck size={12} />}
                            {(status === 'Admin Accepted' || status === 'Client Accepted') && <Check size={12} />}
                            Current Status: {status === 'Admin Accepted' ? 'Admin Approved' : status === 'Client Accepted' ? 'Client Approved' : status}
                        </div>
                    </div>
                </div>
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

// Price History Chart Component with Conditional Formatting
interface PriceChartData {
    date: string;
    target: number;
    quoted: number;
}

const PriceHistoryChart: FC<{ data: PriceChartData[] }> = ({ data }) => {
    if (data.length === 0) return null;

    return (
        <div className="w-full h-72 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Price History: Target vs Quoted
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm bg-[#22c55e]"></span>
                        Within target
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm bg-[#ff8042]"></span>
                        Above target
                    </span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            backgroundColor: 'white',
                            fontSize: '12px'
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    />
                    <Bar
                        dataKey="target"
                        fill="#3b82f6"
                        name="Target Price"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    />
                    <Bar
                        dataKey="quoted"
                        name="Quoted Price"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.quoted > entry.target ? '#ff8042' : '#22c55e'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const PriceHistoryModal: FC<{
    data: { item: any, history: any[], itemResponse: any, response_details: any, isAccepted: boolean, agreedPrice: string };
    onClose: () => void
}> = ({ data, onClose }) => {
    const { item, history, itemResponse, response_details, isAccepted, agreedPrice } = data;

    // Group history into rows (Client Counter -> Factory Response)
    const groupedHistory = useMemo(() => {
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

    // Transform history data for the chart
    const chartData = useMemo((): PriceChartData[] => {
        const dataPoints: PriceChartData[] = [];

        // Add initial quote if available
        if (itemResponse?.price && response_details?.respondedAt) {
            dataPoints.push({
                date: new Date(response_details.respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                target: parseFloat(item.targetPrice) || 0,
                quoted: parseFloat(itemResponse.price) || 0
            });
        }

        // Process history chronologically (oldest first for chart)
        const chronologicalHistory = [...history].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        chronologicalHistory.forEach(h => {
            const dateStr = new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (h.sender === 'client') {
                // Client counter - update target
                const lastPoint = dataPoints[dataPoints.length - 1];
                dataPoints.push({
                    date: dateStr,
                    target: parseFloat(h.price) || 0,
                    quoted: lastPoint?.quoted || 0
                });
            } else {
                // Factory response - update quoted
                const lastPoint = dataPoints[dataPoints.length - 1];
                dataPoints.push({
                    date: dateStr,
                    target: lastPoint?.target || parseFloat(item.targetPrice) || 0,
                    quoted: parseFloat(h.price) || 0
                });
            }
        });

        return dataPoints;
    }, [history, itemResponse, response_details, item.targetPrice]);

    const acceptedHistoryRowIndex = isAccepted && agreedPrice 
        ? groupedHistory.findIndex(row => row.factory?.price === agreedPrice) 
        : -1;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-6 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-white/10 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"><X size={24} /></button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <History size={20} className="text-blue-600"/> Price History
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{item.category}</p>

                {/* Visual Price History Chart with conditional formatting */}
                {chartData.length > 0 && (
                    <PriceHistoryChart data={chartData} />
                )}

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