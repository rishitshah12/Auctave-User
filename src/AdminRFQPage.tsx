import React, { useState, useEffect, FC, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MainLayout } from './MainLayout';
import { quoteService } from './quote.service';
import { crmService } from './crm.service';
import { QuoteRequest, NegotiationHistoryItem } from './types';
import { MapPin, Shirt, Package, Clock, ChevronRight, ChevronLeft, FileQuestion, MessageSquare, CheckCircle, XCircle, X, Download, RefreshCw, User, Building, Calendar, FileText, Eye, EyeOff, CheckSquare, ArrowUp, ArrowDown, ChevronDown, ChevronUp, History, DollarSign, Search, Mail, Phone, Check, CheckCheck, Trash2, RotateCcw, Image as ImageIcon, Scale, Paperclip, Send, Circle, Layers, Scissors, Factory, ShieldCheck, Truck, LifeBuoy, ClipboardList, Plus, Edit, GripVertical, Info, Sparkles, Globe, Box, Link as LinkIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { formatFriendlyDate, getStatusColor, getStatusGradient, getStatusGradientBorder, getStatusHoverShadow } from './utils';
import { useToast } from './ToastContext';

interface AdminRFQPageProps {
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    isAdmin: boolean;
    supabase: any;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// Tab type for quote detail view
type AdminQuoteTabType = 'overview' | 'products' | 'timeline' | 'files';

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

export const AdminRFQPage: FC<AdminRFQPageProps> = (props) => {
    const CACHE_KEY = 'garment_erp_admin_quotes';
    const [quotes, setQuotes] = useState<QuoteRequest[]>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (!cached) return [];
        try {
            return JSON.parse(cached);
        } catch (e) {
            console.error('Failed to parse cached quotes:', e);
            return [];
        }
    });
    const [filterStatus, setFilterStatus] = useState('All');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const todayString = new Date().toISOString().split('T')[0];
    const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
    const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem(CACHE_KEY));
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [responseForm, setResponseForm] = useState({ price: '', leadTime: '', notes: '' });
    const [lineItemPrices, setLineItemPrices] = useState<Record<number, string>>({});
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
    const quoteDetailsRef = useRef<HTMLDivElement>(null);
    const [fileLinks, setFileLinks] = useState<{ name: string; url: string }[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [declineMessage, setDeclineMessage] = useState('');
    const [hiddenQuoteIds, setHiddenQuoteIds] = useState<string[]>(() => {
        const saved = sessionStorage.getItem('admin_hidden_quotes');
        if (!saved) return [];
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse hidden quotes:', e);
            return [];
        }
    });
    const [showHidden, setShowHidden] = useState(false);
    const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>(() => {
        const saved = sessionStorage.getItem('admin_selected_quotes');
        if (!saved) return [];
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse selected quotes:', e);
            return [];
        }
    });
    const [isSelectionMode, setIsSelectionMode] = useState(() => selectedQuoteIds.length > 0);
    const [hoveredQuoteId, setHoveredQuoteId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileLinksAbortController = useRef<AbortController | null>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    
    // Pagination state
    const [currentPageIndex, setCurrentPageIndex] = useState(1);
    const isFirstRender = useRef(true);
    const [itemsPerPage, setItemsPerPage] = useState(9);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    
    // Lightbox state
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [expandedItems, setExpandedItems] = useState<number[]>([]);
    const [chatStates, setChatStates] = useState<Record<number, { message: string; file: File | null }>>({});
    const [historyModalData, setHistoryModalData] = useState<any | null>(null);
    const [isExecutionPlanModalOpen, setIsExecutionPlanModalOpen] = useState(false);
    const [expandedExecutionSteps, setExpandedExecutionSteps] = useState<number[]>([]);
    const [isExecutionPlanExpanded, setIsExecutionPlanExpanded] = useState(false);
    const [negotiatingItem, setNegotiatingItem] = useState<any | null>(null);
    const [activeQuoteTab, setActiveQuoteTab] = useState<AdminQuoteTabType>('overview');
    const [uploadingChats, setUploadingChats] = useState<Record<number, boolean>>({});
    const cancellationRefs = useRef<Record<number, boolean>>({});
    const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
    const [isSampleResponseModalOpen, setIsSampleResponseModalOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<'hide' | 'unhide' | 'delete' | 'restore' | null>(null);
    const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
    const [shippingForm, setShippingForm] = useState({ trackingNumber: '', trackingLink: '', courier: '' });
    const { showToast } = useToast();

    const toggleExpand = (index: number) => {
        setExpandedItems(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    useEffect(() => {
        if (selectedQuote) {
             setExpandedExecutionSteps([]);
        }
    }, [selectedQuote]);

    const fetchQuotes = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const hasCache = !!sessionStorage.getItem(CACHE_KEY);
        if (!hasCache) setIsLoading(true);
        
        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
                const requestPromise = props.supabase
                    .from('quotes')
                    .select('*, clients:user_id(*)')
                    .order('created_at', { ascending: false });
                
                const { data, error } = await Promise.race([
                    requestPromise,
                    timeoutPromise,
                    new Promise<any>((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
                ]);

                if (error) throw new Error(error.message);

            // Transform DB data to QuoteRequest type
            const transformedQuotes: QuoteRequest[] = data.map((q: any) => {
                const client = Array.isArray(q.clients) ? q.clients[0] : q.clients;
                return {
                    id: q.id,
                    factory: q.factory_data,
                    order: q.order_details,
                    status: q.status,
                    submittedAt: q.created_at,
                    acceptedAt: q.accepted_at || q.response_details?.acceptedAt,
                    userId: q.user_id,
                    files: q.files || [],
                    response_details: q.response_details,
                    negotiation_details: q.negotiation_details,
                    // Add client info for display
                    clientName: client?.name || 'Unknown',
                    companyName: client?.company_name || 'Unknown',
                    clientEmail: client?.email || 'N/A',
                    clientPhone: client?.phone || 'N/A',
                    clientCountry: client?.country || 'N/A',
                    clientJobRole: client?.job_role || 'N/A',
                    clientRevenue: client?.yearly_est_revenue || 'N/A',
                    clientSpecialization: client?.category_specialization || 'N/A',
                    modification_count: q.modification_count || 0,
                    modified_at: q.modified_at
                };
            });
            
            if (!signal.aborted) {
                setQuotes(transformedQuotes);
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(transformedQuotes));
                setIsLoading(false);
            }
            return;
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                attempts++;
                if (attempts >= 3) {
                    showToast('Failed to fetch quotes after retries.', 'error');
                    setIsLoading(false);
                }
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, [props.supabase]);

    useEffect(() => {
        fetchQuotes();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchQuotes]);

    useEffect(() => {
        sessionStorage.setItem('admin_selected_quotes', JSON.stringify(selectedQuoteIds));
    }, [selectedQuoteIds]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setSelectedQuoteIds([]);
    }, [filterStatus, showHidden, dateFilter, selectedClientId, viewMode, searchTerm]);

    // Close client dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter for image files for the lightbox
    const imageFiles = fileLinks.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));

    const openLightbox = (fileUrl: string) => {
        const index = imageFiles.findIndex(img => img.url === fileUrl);
        if (index !== -1) {
            setCurrentImageIndex(index);
            setIsLightboxOpen(true);
        }
    };

    const fetchSignedUrls = useCallback(async () => {
        console.log('[AdminRFQPage] fetchSignedUrls called, selectedQuote.files:', selectedQuote?.files);
        if (!selectedQuote?.files || selectedQuote.files.length === 0) {
            console.log('[AdminRFQPage] No files found in selectedQuote');
            setFileLinks([]);
            setIsLoadingFiles(false);
            return;
        }

        const CACHE_KEY = `garment_erp_admin_quote_files_${selectedQuote.id}`;
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp, links } = JSON.parse(cached);
            // Cache valid for 50 minutes (URLs expire in 60)
            // Also invalidate cache if it's empty but we now have files (data was updated)
            if (Date.now() - timestamp < 50 * 60 * 1000 && links.length > 0) {
                setFileLinks(links);
                setIsLoadingFiles(false);
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

                const urlsPromise = Promise.all(selectedQuote.files.map(async (path) => {
                    try {
                        // Ensure path doesn't have leading slash if not needed, or handle bucket prefix if present
                        // The path stored in DB is likely "userId/filename".
                        const cleanPath = path.startsWith('quote-attachments/') ? path.replace('quote-attachments/', '') : path;
                        
                        const { data, error } = await props.supabase.storage
                            .from('quote-attachments')
                            .createSignedUrl(cleanPath, 3600); // URL valid for 1 hour

                        const fileName = path.split('/').pop() || 'document';
                        const cleanName = fileName.replace(/^\d+_/, '');

                        if (error) {
                            console.error(`[AdminRFQPage] Error loading ${path}. User Email: ${props.user?.email}`, error);
                            // If RLS error, it means the user (admin) doesn't have permission.
                            // This usually means the Admin RLS policy isn't matching the user's email.
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
                        console.error(`[AdminRFQPage] Failed to load attachment: ${path}`, err);
                        const fileName = path.split('/').pop() || 'document';
                        const cleanName = fileName.replace(/^\d+_/, '');
                        return { name: cleanName, url: '' };
                    }
                }));

                const results = await Promise.race([urlsPromise, timeoutPromise]) as { name: string; url: string }[];
                const urls = results;
                console.log('[AdminRFQPage] Signed URLs generated:', urls.length, 'of', selectedQuote.files.length);

                if (!signal.aborted) {
                    const hasErrors = urls.some(u => !u.url);
                    setFileLinks(urls);
                    setIsLoadingFiles(false);
                    if (!hasErrors) {
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                            timestamp: Date.now(),
                            links: urls
                        }));
                    }
                }
                return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                console.warn(`[AdminRFQPage] Attempt ${attempts + 1} failed:`, err);
                attempts++;
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
        
        // Fallback: If all retries failed, show files with error state
        if (!signal.aborted && fileLinks.length === 0) {
            setFileLinks(selectedQuote.files.map(path => ({
                name: path.split('/').pop()?.replace(/^\d+_/, '') || 'document',
                url: '',
                error: 'Failed to load'
            })));
        }
        setIsLoadingFiles(false);
    }, [selectedQuote, props.supabase]);

    useEffect(() => {
        fetchSignedUrls();
        return () => {
            if (fileLinksAbortController.current) fileLinksAbortController.current.abort();
        };
    }, [fetchSignedUrls]);

    // Fetch fresh quote data if files are empty to ensure we have the latest data
    useEffect(() => {
        const refreshQuoteIfNeeded = async () => {
            if (!selectedQuote?.id) return;

            // If files are already present, no need to fetch
            if (selectedQuote.files && selectedQuote.files.length > 0) {
                console.log('[AdminRFQPage] Files already present in selectedQuote:', selectedQuote.files);
                return;
            }

            console.log('[AdminRFQPage] Fetching fresh quote data for:', selectedQuote.id);
            try {
                const { data, error } = await quoteService.getQuoteById(selectedQuote.id);
                if (error) {
                    console.error('[AdminRFQPage] Error fetching quote:', error);
                    return;
                }
                if (data && data.files && data.files.length > 0) {
                    console.log('[AdminRFQPage] Fresh quote data received, files:', data.files);
                    // Update the selected quote with fresh files data
                    setSelectedQuote(prev => prev ? {
                        ...prev,
                        files: data.files || []
                    } : null);
                }
            } catch (err) {
                console.error('[AdminRFQPage] Exception fetching quote:', err);
            }
        };

        refreshQuoteIfNeeded();
    }, [selectedQuote?.id]);

    const createCrmOrderFromQuote = async (quote: QuoteRequest) => {
        if (!quote.userId) return;

        const lineItems = quote.order?.lineItems || [];
        let productName = 'Custom Order';
        if (lineItems.length === 1) {
            productName = `${lineItems[0].qty} ${lineItems[0].category}`;
        } else if (lineItems.length > 1) {
            productName = `${lineItems.length} Items Order`;
        }

        const documents = (quote.files || []).map(filePath => ({
            name: filePath.split('/').pop()?.replace(/^\d+_/, '') || 'Attachment',
            type: 'Quote Attachment',
            lastUpdated: new Date().toISOString().split('T')[0],
            path: filePath
        }));

        const payload = {
            client_id: quote.userId,
            product_name: productName,
            factory_id: quote.factory?.id || null,
            status: 'Pending',
            tasks: [
                { id: Date.now(), name: 'Order Confirmation', status: 'COMPLETE', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date().toISOString().split('T')[0], responsible: 'Admin', actualStartDate: new Date().toISOString().split('T')[0], actualEndDate: new Date().toISOString().split('T')[0] },
                { id: Date.now() + 1, name: 'Fabric Sourcing', status: 'TO DO', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], responsible: 'Merch Team' }
            ],
            documents: documents
        };

        const { error } = await crmService.create(payload);
        if (error) {
            console.error('Failed to create CRM order:', error);
            showToast('Quote accepted, but failed to create CRM order automatically.', 'error');
        } else {
            showToast('CRM Order created automatically.');
        }
    };

    const handleUpdateStatus = async (quoteId: string, newStatus: QuoteRequest['status']) => {
        let negotiationUpdate = {};
        let updatedNegotiationDetails = null;

        // If approving, select all line items
        if (newStatus === 'Admin Accepted' || newStatus === 'Accepted') {
             const quote = quotes.find(q => q.id === quoteId);
             if (quote) {
                 const allLineItemIds = quote.order.lineItems.map(i => i.id);
                 updatedNegotiationDetails = {
                     ...(quote.negotiation_details || {}),
                     adminApprovedLineItems: allLineItemIds
                 };
                 negotiationUpdate = { negotiation_details: updatedNegotiationDetails };
             }
        }

        const { error } = await quoteService.update(quoteId, { status: newStatus, ...negotiationUpdate });
        if (error) {
            showToast('Failed to update status', 'error');
        } else {
            showToast(`Quote marked as ${newStatus}`);
            
            setQuotes(prev => prev.map(q => q.id === quoteId ? { 
                ...q, 
                status: newStatus,
                ...(updatedNegotiationDetails ? { negotiation_details: updatedNegotiationDetails } : {})
            } : q));

            if (selectedQuote && selectedQuote.id === quoteId) {
                setSelectedQuote(prev => prev ? { 
                    ...prev, 
                    status: newStatus,
                    ...(updatedNegotiationDetails ? { negotiation_details: updatedNegotiationDetails } : {})
                } : null);
            }

            if (newStatus === 'Accepted' || newStatus === 'Admin Accepted') {
                runCelebration();
            }

            if (newStatus === 'Accepted') {
                const quoteToProcess = selectedQuote && selectedQuote.id === quoteId ? selectedQuote : quotes.find(q => q.id === quoteId);
                if (quoteToProcess) {
                    await createCrmOrderFromQuote(quoteToProcess);
                }
            }
        }
    };

    const getQuoteTimestamp = (quote: QuoteRequest) => {
        if (quote.modified_at) return quote.modified_at;
        if (quote.status === 'Accepted' && quote.acceptedAt) return quote.acceptedAt;
        if (quote.status === 'In Negotiation' && quote.negotiation_details?.submittedAt) return quote.negotiation_details.submittedAt;
        if (quote.status === 'Responded' && quote.response_details?.respondedAt) return quote.response_details.respondedAt;
        if (quote.status === 'Declined') return quote.response_details?.respondedAt || quote.submittedAt;
        return quote.submittedAt;
    };

    const getDisplayDateInfo = (quote: QuoteRequest) => {
        const date = getQuoteTimestamp(quote);
        let label = 'Submitted';
        if (quote.modified_at) label = 'Modified';
        else if (quote.status === 'Accepted') label = 'Accepted';
        else if (quote.status === 'In Negotiation') label = 'Updated';
        else if (quote.status === 'Responded') label = 'Responded';
        else if (quote.status === 'Declined') label = 'Declined';
        else if (quote.status === 'Admin Accepted') label = 'Accepted by You';
        else if (quote.status === 'Client Accepted') label = 'Accepted by Client';
        else if (quote.status === 'Trashed') label = 'Deleted';
        return { label, date: formatFriendlyDate(date) };
    };

    const getPriority = (status: string) => {
        switch (status) {
            case 'Client Accepted': return 0; // Highest priority - needs admin action
            case 'Pending': return 1; // Needs response
            case 'In Negotiation': return 2; // Active
            case 'Admin Accepted': return 3; // Waiting for client
            case 'Responded': return 4; // Waiting for client
            case 'Accepted': return 5; // Done
            case 'Declined': return 6; // Done
            case 'Trashed': return 7;
            default: return 8;
        }
    };

    const uniqueClients = React.useMemo(() => {
        const clientsMap = new Map();
        quotes.forEach(q => {
            if (q.userId && q.clientName) {
                clientsMap.set(q.userId, q.clientName);
            }
        });
        return Array.from(clientsMap.entries()).map(([id, name]) => ({ id, name }));
    }, [quotes]);

    const handleClearFilters = () => {
        setFilterStatus('All');
        setDateFilter('All Time');
        setCustomStartDate('');
        setCustomEndDate('');
        setSearchTerm('');
        setSelectedClientId(null);
        setClientSearchTerm('');
    };

    const checkDateFilter = (quote: QuoteRequest) => {
        if (dateFilter === 'All Time') return true;
        const quoteDate = new Date(getQuoteTimestamp(quote));
        
        if (dateFilter === 'Custom Range') {
            const start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(-8640000000000000);
            const end = customEndDate ? new Date(customEndDate + 'T23:59:59.999') : new Date(8640000000000000);
            return quoteDate >= start && quoteDate <= end;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);

        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);

        if (dateFilter === 'Today') {
            return quoteDate >= today;
        }
        if (dateFilter === 'Yesterday') {
            return quoteDate >= yesterday && quoteDate < today;
        }
        if (dateFilter === 'Last 7 Days') {
            return quoteDate >= last7Days;
        }
        return quoteDate >= last30Days; // Last 30 Days
    };

    const filteredQuotes = quotes.filter(quote => {
        const matchesStatus = filterStatus === 'All' || quote.status === filterStatus;
        const isHidden = hiddenQuoteIds.includes(quote.id);
        
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            (quote.clientName && quote.clientName.toLowerCase().includes(searchLower)) ||
            (quote.id.toLowerCase().includes(searchLower)) ||
            (quote.order?.lineItems?.some(item => item.category.toLowerCase().includes(searchLower)));

        const matchesClient = !selectedClientId || quote.userId === selectedClientId;

        const matchesViewMode = viewMode === 'active' 
            ? quote.status !== 'Trashed' 
            : quote.status === 'Trashed';

        // In trash mode, ignore the hidden filter logic to show all trashed items
        return matchesStatus && (viewMode === 'trash' || (showHidden ? isHidden : !isHidden)) && checkDateFilter(quote) && matchesSearch && matchesClient && matchesViewMode;
    }).sort((a, b) => {
        const priorityA = getPriority(a.status);
        const priorityB = getPriority(b.status);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(getQuoteTimestamp(b)).getTime() - new Date(getQuoteTimestamp(a)).getTime();
    });
    const filterOptions = ['All', 'Pending', 'Responded', 'In Negotiation', 'Accepted', 'Declined'];

    // Reset page when filters change
    useEffect(() => {
        setCurrentPageIndex(1);
    }, [filterStatus, dateFilter, searchTerm, showHidden, selectedClientId, viewMode]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
    const displayedQuotes = filteredQuotes.slice(
        (currentPageIndex - 1) * itemsPerPage,
        currentPageIndex * itemsPerPage
    );

    const handleSubmitResponse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuote) return;

        setIsSubmittingResponse(true);
        
        // Construct line item responses
        const lineItemResponses = selectedQuote.order.lineItems.map(item => ({
            lineItemId: item.id,
            price: lineItemPrices[item.id] || '',
            notes: '' 
        })).filter(r => r.price !== '');

        const newStatus: QuoteRequest['status'] = (selectedQuote.status === 'In Negotiation' || selectedQuote.status === 'Client Accepted') ? 'In Negotiation' : 'Responded';

        const newHistoryItem: NegotiationHistoryItem = {
            id: Date.now().toString(),
            sender: 'factory' as const,
            message: responseForm.notes,
            price: responseForm.price,
            timestamp: new Date().toISOString(),
            action: 'offer' as const,
            lineItemPrices: lineItemResponses.map(l => ({ lineItemId: l.lineItemId, price: l.price }))
        };
        const updatedHistory = [...(selectedQuote.negotiation_details?.history || []), newHistoryItem];

        const newResponseDetails = { ...responseForm, lineItemResponses, respondedAt: new Date().toISOString() };

        const { error } = await quoteService.update(selectedQuote.id, {
            status: newStatus,
            response_details: newResponseDetails,
            negotiation_details: {
                ...(selectedQuote.negotiation_details || {}),
                history: updatedHistory
            }
        });
        setIsSubmittingResponse(false);

        if (error) {
            showToast('Failed to send response: ' + error.message, 'error');
        } else {
            showToast('Quote response sent successfully!');
            setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? {
                ...q,
                status: newStatus,
                response_details: newResponseDetails,
                negotiation_details: { ...(q.negotiation_details || {}), history: updatedHistory }
            } : q));
            setSelectedQuote(prev => prev ? {
                ...prev,
                status: newStatus,
                response_details: newResponseDetails,
                negotiation_details: { ...(prev.negotiation_details || {}), history: updatedHistory }
            } : null);
            setIsResponseModalOpen(false);
        }
    };

    const handleDeclineSubmit = async () => {
        if (!selectedQuote) return;
        
        // Preserve existing response details but add the decline note
        const updatedResponseDetails = {
            ...(selectedQuote.response_details || {}),
            notes: declineMessage ? `${selectedQuote.response_details?.notes || ''}\n\n[Declined Reason]: ${declineMessage}` : selectedQuote.response_details?.notes || '',
            price: selectedQuote.response_details?.price || '', // Ensure price is string
            leadTime: selectedQuote.response_details?.leadTime || '' // Ensure leadTime is string
        };

        const newHistoryItem = {
            id: Date.now().toString(),
            sender: 'factory' as const,
            message: declineMessage || 'Quote declined.',
            timestamp: new Date().toISOString(),
            action: 'decline'
        };
        const updatedHistory = [...(selectedQuote.negotiation_details?.history || []), newHistoryItem];

        const { error } = await quoteService.update(selectedQuote.id, { 
            status: 'Declined',
            response_details: updatedResponseDetails,
            negotiation_details: {
                ...(selectedQuote.negotiation_details || {}),
                history: updatedHistory
            }
        });

        if (error) {
            showToast('Failed to decline quote: ' + error.message, 'error');
        } else {
            showToast('Quote declined and message sent.');
            setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, status: 'Declined', response_details: updatedResponseDetails } : q));
            setSelectedQuote(prev => prev ? { ...prev, status: 'Declined', response_details: updatedResponseDetails } : null);
            setIsDeclineModalOpen(false);
            setDeclineMessage('');
        }
    };

    const toggleHideQuote = (quoteId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setHiddenQuoteIds(prev => {
            const newHidden = prev.includes(quoteId)
                ? prev.filter(id => id !== quoteId)
                : [...prev, quoteId];
            sessionStorage.setItem('admin_hidden_quotes', JSON.stringify(newHidden));
            return newHidden;
        });
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedQuoteIds([]);
    };

    const toggleSelectQuote = (quoteId: string) => {
        setSelectedQuoteIds(prev => 
            prev.includes(quoteId) ? prev.filter(id => id !== quoteId) : [...prev, quoteId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedQuoteIds.length === filteredQuotes.length && filteredQuotes.length > 0) {
            setSelectedQuoteIds([]);
        } else {
            setSelectedQuoteIds(filteredQuotes.map(q => q.id));
        }
    };

    const handleSoftDelete = async (quoteId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!confirm('Are you sure you want to move this quote to trash? It will be hidden from the client.')) return;
        
        const quote = quotes.find(q => q.id === quoteId);
        if (!quote) return;

        const updatedNegotiationDetails = {
            ...(quote.negotiation_details || {}),
            previousStatus: quote.status
        };

        const { error } = await quoteService.update(quoteId, { status: 'Trashed', negotiation_details: updatedNegotiationDetails });
        if (error) {
            showToast('Failed to delete quote: ' + error.message, 'error');
        } else {
            showToast('Quote moved to trash.');
            setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'Trashed', negotiation_details: updatedNegotiationDetails } : q));
        }
    };

    const handleRestore = async (quote: QuoteRequest, e?: React.MouseEvent) => {
        e?.stopPropagation();
        
        // Retrieve previous status from negotiation_details, or infer if missing
        let newStatus = (quote.negotiation_details as any)?.previousStatus;
        
        if (!newStatus) {
            // Fallback inference for older items
            newStatus = 'Pending';
            if ((quote.negotiation_details?.history?.length ?? 0) > 0) newStatus = 'In Negotiation';
            else if (quote.response_details) newStatus = 'Responded';
        }

        // Clean up previousStatus
        const updatedNegotiationDetails = { ...quote.negotiation_details };
        delete (updatedNegotiationDetails as any).previousStatus;

        // If negotiation_details is empty after cleanup, set it to undefined to keep DB clean
        const finalNegotiationDetails = Object.keys(updatedNegotiationDetails).length > 0 ? updatedNegotiationDetails : undefined;

        const { error } = await quoteService.update(quote.id, { status: newStatus, negotiation_details: finalNegotiationDetails });
        if (error) showToast('Failed to restore quote: ' + error.message, 'error');
        else {
            showToast(`Quote restored to ${newStatus}.`);
            setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: newStatus as any, negotiation_details: finalNegotiationDetails } : q));
        }
    };

    const handlePermanentDelete = async (quoteId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!confirm('Are you sure you want to permanently delete this quote? This action cannot be undone.')) return;
        
        const { error, count } = await props.supabase
            .from('quotes')
            .delete({ count: 'exact' })
            .eq('id', quoteId);

        if (error) {
            if (error.code === '42501') {
                showToast('Permission denied. You do not have rights to delete this quote.', 'error');
            } else {
                showToast('Failed to delete quote: ' + error.message, 'error');
            }
        } else if (count === 0) {
            showToast('Quote could not be deleted. It may have been already deleted or permission denied.', 'error');
        } else {
            showToast('Quote permanently deleted.');
            setQuotes(prev => prev.filter(q => q.id !== quoteId));
        }
    };

    const openBulkActionModal = (type: 'hide' | 'unhide' | 'delete' | 'restore') => {
        setBulkActionType(type);
        setIsBulkActionModalOpen(true);
    };

    const performBulkAction = async () => {
        if (!bulkActionType) return;

        if (bulkActionType === 'hide') {
            const newHiddenIds = [...new Set([...hiddenQuoteIds, ...selectedQuoteIds])];
            setHiddenQuoteIds(newHiddenIds);
            sessionStorage.setItem('admin_hidden_quotes', JSON.stringify(newHiddenIds));
            showToast(`${selectedQuoteIds.length} quotes hidden.`);
            setSelectedQuoteIds([]);
        } else if (bulkActionType === 'unhide') {
            const newHiddenIds = hiddenQuoteIds.filter(id => !selectedQuoteIds.includes(id));
            setHiddenQuoteIds(newHiddenIds);
            sessionStorage.setItem('admin_hidden_quotes', JSON.stringify(newHiddenIds));
            showToast(`${selectedQuoteIds.length} quotes unhidden.`);
            setSelectedQuoteIds([]);
        } else if (bulkActionType === 'restore') {
            const results = await Promise.all(selectedQuoteIds.map(async (id) => {
                const quote = quotes.find(q => q.id === id);
                if (!quote) return { id, error: { message: 'Quote not found' } };

                let newStatus = (quote.negotiation_details as any)?.previousStatus;
                if (!newStatus) {
                    newStatus = 'Pending';
                    if ((quote.negotiation_details?.history?.length ?? 0) > 0) newStatus = 'In Negotiation';
                    else if (quote.response_details) newStatus = 'Responded';
                }
                
                const updatedNegotiationDetails = { ...quote.negotiation_details };
                delete (updatedNegotiationDetails as any).previousStatus;
                const finalNegotiationDetails = Object.keys(updatedNegotiationDetails).length > 0 ? updatedNegotiationDetails : undefined;

                const { error } = await quoteService.update(id, { status: newStatus, negotiation_details: finalNegotiationDetails });
                return { id, error };
            }));

            const failures = results.filter(r => r.error);
            const successCount = results.length - failures.length;

            if (failures.length > 0) {
                console.error('Bulk restore failures:', failures);
                showToast(`Restored ${successCount} quotes. Failed to restore ${failures.length} quotes.`, 'error');
            } else {
                showToast(`${successCount} quotes restored.`);
            }

            fetchQuotes();
            setSelectedQuoteIds([]);
        } else if (bulkActionType === 'delete') {
            const { error, count } = await props.supabase
                .from('quotes')
                .delete({ count: 'exact' })
                .in('id', selectedQuoteIds);

            if (error) {
                showToast('Failed to delete quotes: ' + error.message, 'error');
            } else {
                showToast(`${count} quotes permanently deleted.`);
                setQuotes(prev => prev.filter(q => !selectedQuoteIds.includes(q.id)));
                setSelectedQuoteIds([]);
            }
        }

        setIsBulkActionModalOpen(false);
        setBulkActionType(null);
    };

    const PriceDifference: FC<{ target: string, quoted: string }> = ({ target, quoted }) => {
        const targetPrice = parseFloat(target);
        const quotedPrice = parseFloat(quoted);
    
        if (isNaN(targetPrice) || isNaN(quotedPrice) || targetPrice === 0) {
            return null;
        }
    
        const difference = quotedPrice - targetPrice;
        const percentage = (difference / targetPrice) * 100;
    
        const isHigher = difference > 0;
        const color = isHigher ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400';
        const Icon = isHigher ? ArrowUp : ArrowDown;
    
        return (
            <div className={`flex items-center justify-end text-xs font-semibold mt-1 ${color}`}>
                <Icon size={14} className="mr-0.5" />
                <span>
                    {Math.abs(percentage).toFixed(1)}%
                </span>
                <span className="mx-1">|</span>
                <span>
                    ${Math.abs(difference).toFixed(2)}
                </span>
            </div>
        );
    };

    const handleDownloadPdf = async () => {
        const input = quoteDetailsRef.current;
        if (!input || !selectedQuote) {
            showToast('Could not find content to download.', 'error');
            return;
        }

        showToast('Generating PDF...', 'success');

        try {
            // Create a temporary container to render the content for capture
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.top = '0';
            tempContainer.style.left = '0';
            tempContainer.style.zIndex = '-9999';
            tempContainer.style.width = `${input.offsetWidth}px`;
            
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

            // Wait a brief moment for images to settle
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Clean up
            document.body.removeChild(tempContainer);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`RFQ-${selectedQuote.id.slice(0, 8)}.pdf`);
            showToast('PDF downloaded successfully!', 'success');
        } catch (err) {
            showToast('Failed to generate PDF.', 'error');
            console.error("PDF generation error:", err);
        }
    };

    // Construct history for display
    const displayHistory = React.useMemo(() => {
        if (!selectedQuote) return [];
        if (selectedQuote.negotiation_details?.history && selectedQuote.negotiation_details.history.length > 0) return selectedQuote.negotiation_details.history;
        
        const history: any[] = [];
        if (selectedQuote.response_details) {
            history.push({
                id: 'initial-response',
                sender: 'factory',
                message: selectedQuote.response_details.notes,
                price: selectedQuote.response_details.price,
                timestamp: selectedQuote.response_details.respondedAt || selectedQuote.submittedAt,
                action: 'offer'
            });
        }
        if (selectedQuote.negotiation_details && (selectedQuote.negotiation_details.message || selectedQuote.negotiation_details.counterPrice)) {
            history.push({
                id: 'client-counter',
                sender: 'client',
                message: selectedQuote.negotiation_details.message,
                price: selectedQuote.negotiation_details.counterPrice,
                timestamp: selectedQuote.negotiation_details.submittedAt,
                action: 'counter'
            });
        }
        return history;
    }, [selectedQuote]);

    const getLineItemHistory = (lineItemId: number) => {
        if (!selectedQuote?.negotiation_details?.history) return [];
        return selectedQuote.negotiation_details.history
            .filter(h => h.lineItemPrices?.some(p => p.lineItemId === lineItemId) || h.relatedLineItemId === lineItemId)
            .map(h => ({
                ...h,
                price: h.lineItemPrices?.find(p => p.lineItemId === lineItemId)?.price
            }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    };

    const handleSendChat = async (lineItemId: number) => {
        if (!selectedQuote) return;
        const chatState = chatStates[lineItemId] || { message: '', file: null };
        if (!chatState.message.trim() && !chatState.file) return;

        cancellationRefs.current[lineItemId] = false;
        setUploadingChats(prev => ({ ...prev, [lineItemId]: true }));

        let attachmentUrl = '';
        if (chatState.file) {
            try {
                const fileExt = chatState.file.name.split('.').pop();
                const fileName = `${selectedQuote.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { data, error } = await props.supabase.storage
                    .from('quote-attachments')
                    .upload(fileName, chatState.file);
                
                if (cancellationRefs.current[lineItemId]) {
                    if (data?.path) {
                        await props.supabase.storage.from('quote-attachments').remove([data.path]);
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
            sender: 'factory',
            message: chatState.message,
            timestamp: new Date().toISOString(),
            action: 'info',
            relatedLineItemId: lineItemId,
            attachments: attachmentUrl ? [attachmentUrl] : []
        };

        const updatedHistory = [...(selectedQuote.negotiation_details?.history || []), newHistoryItem];
        const { error } = await quoteService.update(selectedQuote.id, {
            negotiation_details: { ...selectedQuote.negotiation_details, history: updatedHistory }
        });

        if (error) showToast('Failed to send message', 'error');
        else {
            setSelectedQuote(prev => prev ? { ...prev, negotiation_details: { ...prev.negotiation_details, history: updatedHistory } } : null);
            setChatStates(prev => ({ ...prev, [lineItemId]: { message: '', file: null } }));
        }
        setUploadingChats(prev => ({ ...prev, [lineItemId]: false }));
    };

    const handleCancelUpload = (lineItemId: number) => {
        cancellationRefs.current[lineItemId] = true;
        setUploadingChats(prev => ({ ...prev, [lineItemId]: false }));
        showToast('Upload cancelled');
    };

    const handleSingleItemResponse = async (price: string, note: string) => {
        if (!selectedQuote || !negotiatingItem) return;

        const currentResponses = selectedQuote.response_details?.lineItemResponses || [];
        const otherResponses = currentResponses.filter(r => r.lineItemId !== negotiatingItem.id);
        
        const newResponse = {
            lineItemId: negotiatingItem.id,
            price: price,
            notes: note
        };
        
        const updatedLineItemResponses = [...otherResponses, newResponse];

        const newHistoryItem: NegotiationHistoryItem = {
            id: Date.now().toString(),
            sender: 'factory',
            message: note || `Updated price for ${negotiatingItem.category}`,
            timestamp: new Date().toISOString(),
            action: 'offer',
            lineItemPrices: [{ lineItemId: negotiatingItem.id, price: price }]
        };

        const updatedHistory = [...(selectedQuote.negotiation_details?.history || []), newHistoryItem];
        
        const newResponseDetails = {
            ...(selectedQuote.response_details || { leadTime: '', notes: '', price: '' }),
            lineItemResponses: updatedLineItemResponses,
            respondedAt: new Date().toISOString()
        };

        const newStatus: QuoteRequest['status'] = (selectedQuote.status === 'In Negotiation' || selectedQuote.status === 'Client Accepted') ? 'In Negotiation' : 'Responded';

        const { error } = await quoteService.update(selectedQuote.id, {
            status: newStatus,
            response_details: newResponseDetails,
            negotiation_details: {
                ...(selectedQuote.negotiation_details || {}),
                history: updatedHistory
            }
        });

        if (error) {
            showToast('Failed to update price: ' + error.message, 'error');
        } else {
            showToast('Price updated successfully');
            const updatedQuote = {
                ...selectedQuote,
                status: newStatus,
                response_details: newResponseDetails,
                negotiation_details: { ...(selectedQuote.negotiation_details || {}), history: updatedHistory }
            };
            setSelectedQuote(updatedQuote);
            setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? updatedQuote : q));
            setNegotiatingItem(null);
        }
    };

    const handleToggleLineItemApproval = async (lineItemId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedQuote) return;

        const currentApprovals = selectedQuote.negotiation_details?.adminApprovedLineItems || [];
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
            ...(selectedQuote.negotiation_details || {}),
            adminApprovedLineItems: newApprovals
        };

        // Check statuses
        const allLineItems = selectedQuote.order.lineItems;
        const allAdminApproved = allLineItems.every(item => newApprovals.includes(item.id));
        const clientApprovals = selectedQuote.negotiation_details?.clientApprovedLineItems || [];
        const allClientApproved = allLineItems.every(item => clientApprovals.includes(item.id));

        let newStatus = selectedQuote.status;
        let toastMessage = '';
        
        if (allAdminApproved && allClientApproved) {
            newStatus = 'Accepted';
            toastMessage = 'All items approved by both parties. Quote Accepted!';
            runCelebration();
        } else if (allAdminApproved) {
            newStatus = 'Admin Accepted';
            toastMessage = 'All items approved. Quote marked as Admin Accepted.';
            runCelebration();
        } else if (allClientApproved) {
            newStatus = 'Client Accepted';
        } else {
            newStatus = 'In Negotiation';
        }

        const updates: any = { status: newStatus, negotiation_details: updatedNegotiationDetails };
        if (newStatus === 'Accepted' && selectedQuote.status !== 'Accepted') {
            updates.response_details = { ...(selectedQuote.response_details || {}), acceptedAt: new Date().toISOString() };
        }

        // Optimistic update
        const updatedQuote = { ...selectedQuote, ...updates };
        setSelectedQuote(updatedQuote);
        setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? updatedQuote : q));
        await quoteService.update(selectedQuote.id, updates);

        if (toastMessage && newStatus !== selectedQuote.status) showToast(toastMessage);

        if (newStatus === 'Accepted' && selectedQuote.status !== 'Accepted') {
             createCrmOrderFromQuote(updatedQuote);
        }
    };

    const handleSaveExecutionPlan = async (newPlan: ExecutionStep[]) => {
        if (!selectedQuote) return;
        const updatedQuote = { ...selectedQuote, execution_plan: newPlan };
        setSelectedQuote(updatedQuote as any);
        setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, execution_plan: newPlan } as any : q));
        setIsExecutionPlanModalOpen(false);
        
        const { error } = await quoteService.update(selectedQuote.id, {
            execution_plan: newPlan
        } as any);
        
        if (error) {
            showToast('Failed to update execution plan', 'error');
        } else {
            showToast('Execution plan updated successfully');
        }
    };

    const handleSampleResponseSubmit = async (itemsData: any[], shippingCost: string, notes: string, commercialData: any) => {
        if (!selectedQuote) return;

        const sampleRequest = (selectedQuote.negotiation_details as any)?.sample_request;
        if (!sampleRequest) return;

        try {
            showToast('Uploading sample photos and generating invoice...');

            // Upload photos for each item
            const itemsWithPhotos = await Promise.all(
                itemsData.map(async (item) => {
                    const photoUrls: string[] = [];

                    for (const file of item.photos) {
                        const fileName = `${selectedQuote.id}/samples/${item.lineItemId}/${Date.now()}_${file.name}`;
                        const { data, error } = await props.supabase.storage
                            .from('quote-attachments')
                            .upload(fileName, file);

                        if (!error && data) {
                            photoUrls.push(data.path);
                        }
                    }

                    return {
                        lineItemId: item.lineItemId,
                        category: item.category,
                        sampleQty: item.sampleQty,
                        sampleCost: parseFloat(item.sampleCost),
                        photos: photoUrls
                    };
                })
            );

            const subtotal = itemsData.reduce((sum, item) => sum + parseFloat(item.sampleCost) * item.sampleQty, 0);
            const shipping = parseFloat(shippingCost);
            const total = subtotal + shipping;

            const updatedSampleRequest = {
                ...sampleRequest,
                status: 'payment_pending',
                admin_response: {
                    items: itemsWithPhotos,
                    subtotal: subtotal.toFixed(2),
                    shippingCost: shipping.toFixed(2),
                    total: total.toFixed(2),
                    notes,
                    commercialData,
                    invoiceNumber: `INV-SAMPLE-${Date.now()}`,
                    invoiceDate: new Date().toISOString(),
                    respondedAt: new Date().toISOString()
                }
            };

            const updatedNegotiationDetails = {
                ...(selectedQuote.negotiation_details || {}),
                sample_request: updatedSampleRequest
            };

            await quoteService.update(selectedQuote.id, { negotiation_details: updatedNegotiationDetails });
            setSelectedQuote(prev => prev ? { ...prev, negotiation_details: updatedNegotiationDetails } : null);
            setIsSampleResponseModalOpen(false);
            showToast('Sample invoice sent successfully!');
        } catch (error) {
            console.error('Error processing sample response:', error);
            showToast('Failed to process sample response', 'error');
        }
    };

    const handleConfirmPayment = async () => {
        if (!selectedQuote) return;
        const sampleRequest = (selectedQuote.negotiation_details as any)?.sample_request;
        const updatedNegotiationDetails = {
            ...(selectedQuote.negotiation_details || {}),
            sample_request: {
                ...sampleRequest,
                status: 'paid'
            }
        };
        await quoteService.update(selectedQuote.id, { negotiation_details: updatedNegotiationDetails });
        setSelectedQuote(prev => prev ? { ...prev, negotiation_details: updatedNegotiationDetails } : null);
        setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, negotiation_details: updatedNegotiationDetails } : q));
        showToast('Payment confirmed. Ready to ship.');
    };

    const handleOpenShippingModal = () => {
        if (!selectedQuote) return;
        const sampleRequest = (selectedQuote.negotiation_details as any)?.sample_request;
        const commercialData = sampleRequest?.admin_response?.commercialData || {};
        setShippingForm({
            trackingNumber: commercialData.trackingNumber || '',
            trackingLink: commercialData.trackingLink || '',
            courier: commercialData.courierService || ''
        });
        setIsShippingModalOpen(true);
    };

    const handleSubmitShipping = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuote) return;
        const sampleRequest = (selectedQuote.negotiation_details as any)?.sample_request;
        
        const updatedCommercialData = {
            ...(sampleRequest.admin_response.commercialData || {}),
            trackingNumber: shippingForm.trackingNumber,
            courierService: shippingForm.courier,
            trackingLink: shippingForm.trackingLink
        };

        const updatedNegotiationDetails = {
            ...(selectedQuote.negotiation_details || {}),
            sample_request: {
                ...sampleRequest,
                status: 'sent',
                admin_response: {
                    ...sampleRequest.admin_response,
                    commercialData: updatedCommercialData
                }
            }
        };
        
        await quoteService.update(selectedQuote.id, { negotiation_details: updatedNegotiationDetails });
        setSelectedQuote(prev => prev ? { ...prev, negotiation_details: updatedNegotiationDetails } : null);
        setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, negotiation_details: updatedNegotiationDetails } : q));
        setIsShippingModalOpen(false);
        showToast('Sample marked as shipped.');
    };

    const handleMarkDelivered = async () => {
        if (!selectedQuote) return;
        const sampleRequest = (selectedQuote.negotiation_details as any)?.sample_request;
        const updatedNegotiationDetails = {
            ...(selectedQuote.negotiation_details || {}),
            sample_request: {
                ...sampleRequest,
                status: 'delivered'
            }
        };
        await quoteService.update(selectedQuote.id, { negotiation_details: updatedNegotiationDetails });
        setSelectedQuote(prev => prev ? { ...prev, negotiation_details: updatedNegotiationDetails } : null);
        setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, negotiation_details: updatedNegotiationDetails } : q));
        showToast('Sample marked as delivered.');
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

    const toggleAllExecutionSteps = (e: React.MouseEvent) => {
        e.stopPropagation();
        const plan = (selectedQuote as any).execution_plan || DEFAULT_EXECUTION_PLAN;
        if (expandedExecutionSteps.length === plan.length) {
            setExpandedExecutionSteps([]);
        } else {
            setExpandedExecutionSteps(plan.map((_: any, i: number) => i));
        }
    };

    // Tabs configuration for quote detail view
    const quoteTabs: { id: AdminQuoteTabType; label: string; icon: React.ReactNode; badge?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <Info size={18} /> },
        { id: 'products', label: 'Products', icon: <Package size={18} />, badge: selectedQuote?.order?.lineItems?.length || 0 },
        { id: 'timeline', label: 'Timeline', icon: <History size={18} />, badge: displayHistory.length },
        { id: 'files', label: 'Files', icon: <FileText size={18} />, badge: fileLinks.length || selectedQuote?.files?.length || 0 },
    ];

    const sampleRequest = (selectedQuote?.negotiation_details as any)?.sample_request;

    // Sample Response Page (Full Page instead of Modal)
    if (isSampleResponseModalOpen && selectedQuote && sampleRequest) {
        const requestedLineItems = selectedQuote.order.lineItems.filter((item: any) =>
            sampleRequest.requestedItems.includes(item.id)
        );

        return (
            <SampleResponsePage
                requestedLineItems={requestedLineItems}
                sampleRequest={sampleRequest}
                quoteName={`Quote #${selectedQuote.id}`}
                buyerInfo={{
                    name: selectedQuote.clientName || selectedQuote.companyName || '',
                    address: '',
                    city: '',
                    country: selectedQuote.clientCountry || selectedQuote.order.shippingCountry || '',
                    phone: selectedQuote.clientPhone || '',
                    email: selectedQuote.clientEmail || ''
                }}
                onSubmit={handleSampleResponseSubmit}
                onClose={() => setIsSampleResponseModalOpen(false)}
                supabase={props.supabase}
            />
        );
    }

    if (selectedQuote) {
        return (
            <MainLayout {...props}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
                    {/* Compact Header - Zomato Style */}
                    <div className="mb-6">
                        {/* Back button row */}
                        <button onClick={() => { setSelectedQuote(null); setActiveQuoteTab('overview'); }} className="group flex items-center text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-4">
                            <ChevronLeft size={20} className="mr-1" />
                            <span className="text-sm font-medium">Back to RFQ List</span>
                        </button>

                        {/* Main Header Card - Compact */}
                        <div ref={quoteDetailsRef} className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                            <div className={`h-1.5 bg-gradient-to-r ${getStatusGradient(selectedQuote.status)}`}></div>
                            <div className="p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex w-14 h-14 rounded-xl bg-gradient-to-br from-[#c20c0b] to-pink-600 items-center justify-center text-white shadow-lg">
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quote #{selectedQuote.id.slice(0, 8)}</h1>
                                                {(selectedQuote.modification_count || 0) > 0 && (
                                                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                        <Edit size={10} />
                                                        Modified
                                                    </span>
                                                )}
                                                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full border ${getStatusColor(selectedQuote.status)} flex items-center gap-1`}>
                                                    {selectedQuote.status === 'Accepted' && <CheckCheck size={12} />}
                                                    {(selectedQuote.status === 'Admin Accepted' || selectedQuote.status === 'Client Accepted') && <Check size={12} />}
                                                    {selectedQuote.status === 'Admin Accepted' ? 'Admin Approved' : selectedQuote.status === 'Client Accepted' ? 'Client Approved' : selectedQuote.status}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-3">
                                                <span className="flex items-center"><Calendar size={14} className="mr-1"/> {selectedQuote.modified_at ? formatFriendlyDate(selectedQuote.modified_at) : formatFriendlyDate(selectedQuote.submittedAt)}</span>
                                                <span className="flex items-center"><Package size={14} className="mr-1"/> {selectedQuote.order?.lineItems?.length || 0} items</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Quick Actions - Desktop only */}
                                    <div className="hidden md:flex items-center gap-2">
                                        <button onClick={handleDownloadPdf} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all" title="Download PDF">
                                            <Download size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Factory Response Summary - Compact */}
                                {(selectedQuote.status === 'Responded' || selectedQuote.status === 'In Negotiation' || selectedQuote.status === 'Accepted' || selectedQuote.status === 'Admin Accepted' || selectedQuote.status === 'Client Accepted') && selectedQuote.response_details && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                <DollarSign size={20} className="text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Quoted Price</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">${selectedQuote.response_details.price}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Lead Time</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedQuote.response_details.leadTime}</p>
                                            </div>
                                        </div>
                                        {selectedQuote.response_details.notes && (
                                            <div className="flex-1 min-w-[200px]">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">"{selectedQuote.response_details.notes}"</p>
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
                            {quoteTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveQuoteTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                        activeQuoteTab === tab.id
                                            ? 'bg-[#c20c0b] text-white shadow-md'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                                    }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    {tab.badge !== undefined && tab.badge > 0 && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                            activeQuoteTab === tab.id
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
                        {activeQuoteTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                                {/* Status Timeline */}
                                <div className="lg:col-span-2 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-white/10">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Sparkles size={20} className="text-[#c20c0b]" /> Order Progress
                                    </h3>
                                    <StatusTimeline status={selectedQuote.status} />

                                    {/* Quick Summary */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedQuote.order?.lineItems?.length || 0}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Products</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedQuote.order?.lineItems?.reduce((acc: number, item: any) => acc + (item.qty || 0), 0).toLocaleString()}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Qty</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                            <p className="text-2xl font-bold text-[#c20c0b] dark:text-red-400">${selectedQuote.response_details?.price || '—'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Quoted</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedQuote.response_details?.leadTime || '—'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Lead Time</p>
                                        </div>
                                    </div>

                                    {/* Sample Request Section */}
                                    {sampleRequest && (
                                        <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 border border-purple-100 dark:border-purple-800">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                                                    <Box size={18} /> Sample Request
                                                </h4>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                                                    sampleRequest.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                                                    sampleRequest.status === 'sent' ? 'bg-blue-100 text-blue-700' : 
                                                    sampleRequest.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                    sampleRequest.status === 'paid' ? 'bg-indigo-100 text-indigo-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {sampleRequest.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
                                                <p><strong>Requested Items:</strong> {sampleRequest.requestedItems.length} items</p>
                                                <p><strong>Speed:</strong> {sampleRequest.deliverySpeed}</p>
                                                {sampleRequest.specifications && <p><strong>Specs:</strong> {sampleRequest.specifications}</p>}

                                                {/* Show invoice details if sent or confirmed */}
                                                {sampleRequest.admin_response && (sampleRequest.status === 'sent' || sampleRequest.status === 'confirmed' || sampleRequest.status === 'delivered' || sampleRequest.status === 'paid' || sampleRequest.status === 'payment_pending') && (
                                                    <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                                                        <p className="font-semibold mb-2">Invoice Details:</p>
                                                        <div className="bg-white dark:bg-purple-900/30 rounded-lg p-3 space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span>Invoice #:</span>
                                                                <span className="font-mono">{sampleRequest.admin_response.invoiceNumber}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span>Subtotal:</span>
                                                                <span className="font-semibold">${sampleRequest.admin_response.subtotal}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span>Shipping:</span>
                                                                <span className="font-semibold">${sampleRequest.admin_response.shippingCost}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-purple-200 dark:border-purple-700">
                                                                <span>Total:</span>
                                                                <span className="text-purple-600 dark:text-purple-400">${sampleRequest.admin_response.total}</span>
                                                            </div>
                                                        </div>
                                                        {sampleRequest.admin_response.notes && (
                                                            <p className="text-xs mt-2"><strong>Notes:</strong> {sampleRequest.admin_response.notes}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {sampleRequest.status === 'requested' && (
                                                    <button onClick={() => setIsSampleResponseModalOpen(true)} className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-2">
                                                        <FileText size={14} /> Process Request
                                                    </button>
                                                )}
                                                {sampleRequest.status === 'payment_pending' && (
                                                    <button onClick={handleConfirmPayment} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                                        <CheckCircle size={14} /> Confirm Payment
                                                    </button>
                                                )}
                                                {sampleRequest.status === 'paid' && (
                                                    <button onClick={handleOpenShippingModal} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                                                        <Truck size={14} /> Ship Sample
                                                    </button>
                                                )}
                                                {sampleRequest.status === 'sent' && (
                                                    <div className="flex gap-2 mt-2">
                                                        <button onClick={handleOpenShippingModal} className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                                            Update Tracking
                                                        </button>
                                                        <button onClick={handleMarkDelivered} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors">
                                                            Mark Delivered
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Product Preview */}
                                    <div className="mt-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-800 dark:text-white">Products</h4>
                                            <button onClick={() => setActiveQuoteTab('products')} className="text-sm text-[#c20c0b] font-medium hover:underline">View All →</button>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedQuote.order?.lineItems?.slice(0, 3).map((item: any, idx: number) => {
                                                const itemResponse = selectedQuote.response_details?.lineItemResponses?.find((r: any) => r.lineItemId === item.id);
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
                                            {selectedQuote.order?.lineItems?.length > 3 && (
                                                <button onClick={() => setActiveQuoteTab('products')} className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] transition-colors">
                                                    +{selectedQuote.order.lineItems.length - 3} more products
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Admin Actions */}
                                    {selectedQuote.status !== 'Accepted' && selectedQuote.status !== 'Declined' && (
                                        <div className="flex flex-wrap justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/10">
                                            <button onClick={() => setIsDeclineModalOpen(true)} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition shadow-sm flex items-center gap-2">
                                                <XCircle size={18} /> Decline
                                            </button>
                                            <button onClick={() => setIsResponseModalOpen(true)} className="px-4 py-2 bg-[#c20c0b] text-white font-semibold rounded-lg hover:bg-[#a50a09] transition shadow-md flex items-center gap-2">
                                                <MessageSquare size={18} /> Respond
                                            </button>
                                            <button onClick={() => handleUpdateStatus(selectedQuote.id, selectedQuote.status === 'Client Accepted' ? 'Accepted' : 'Admin Accepted')} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md flex items-center gap-2">
                                                {selectedQuote.status === 'Client Accepted' ? <CheckCheck size={18} /> : <Check size={18} />}
                                                {selectedQuote.status === 'Client Accepted' ? 'Finalize' : 'Accept'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-6">
                                    {/* Client Card */}
                                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><User size={16} /> Client</h3>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                                                    {selectedQuote.clientName?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{selectedQuote.clientName}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-300 flex items-center">
                                                        <Building size={12} className="mr-1" /> {selectedQuote.companyName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                    <Mail size={14} className="text-gray-400" /> {selectedQuote.clientEmail}
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                    <Phone size={14} className="text-gray-400" /> {selectedQuote.clientPhone}
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                    <MapPin size={14} className="text-gray-400" /> {selectedQuote.clientCountry}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Factory Card */}
                                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                        <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-5 py-3">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Building size={16} /> Factory</h3>
                                        </div>
                                        <div className="p-5">
                                            {selectedQuote.factory ? (
                                                <div className="flex items-start gap-3">
                                                    <img src={selectedQuote.factory.imageUrl} alt={selectedQuote.factory.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100 dark:border-white/10" />
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white">{selectedQuote.factory.name}</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-300 flex items-center mt-0.5">
                                                            <MapPin size={12} className="mr-1" /> {selectedQuote.factory.location}
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
                                                <span className="font-medium text-gray-900 dark:text-white">{selectedQuote.order?.shippingCountry || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-300">Port</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{selectedQuote.order?.shippingPort || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PRODUCTS TAB */}
                        {activeQuoteTab === 'products' && (
                            <div className="animate-fade-in">
                                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Package size={20} className="text-[#c20c0b]" /> Product Specifications
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click on any product to view details or set pricing</p>
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
                                        {selectedQuote.order?.lineItems?.map((item: any, idx: number) => {
                                    const isExpanded = expandedItems.includes(idx);
                                    const itemResponse = selectedQuote.response_details?.lineItemResponses?.find(r => r.lineItemId === item.id);
                                    const history = getLineItemHistory(item.id);
                                    const isAccepted = selectedQuote.status === 'Accepted' || selectedQuote.status === 'Admin Accepted' || selectedQuote.status === 'Client Accepted';
                                    const isClientApproved = selectedQuote.negotiation_details?.clientApprovedLineItems?.includes(item.id);
                                    const isAdminApproved = selectedQuote.negotiation_details?.adminApprovedLineItems?.includes(item.id);

                                    const getAgreedPrice = () => {
                                        const factoryPrice = itemResponse?.price;
                                        const clientPrice = item.targetPrice;
                                        if (!factoryPrice) return clientPrice;
                                        
                                        const fullHistory = selectedQuote.negotiation_details?.history || [];
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

                                    // Group history into rows (Client Counter -> Factory Response)
                                    const groupedHistory: { client?: { price: string; timestamp: string }; factory?: { price: string; timestamp: string } }[] = (() => {
                                        const rows: { client?: { price: string; timestamp: string }; factory?: { price: string; timestamp: string } }[] = [];
                                        let currentRow: { client?: { price: string; timestamp: string }; factory?: { price: string; timestamp: string } } = {};
                                        history.forEach((h: { sender: string; price?: string; timestamp: string }) => {
                                            if (h.sender === 'client') {
                                                if (currentRow.factory) {
                                                    rows.push(currentRow);
                                                    currentRow = {};
                                                }
                                                currentRow.client = { price: h.price || '', timestamp: h.timestamp };
                                            } else {
                                                if (currentRow.client) {
                                                    currentRow.factory = { price: h.price || '', timestamp: h.timestamp };
                                                    rows.push(currentRow);
                                                    currentRow = {};
                                                } else {
                                                    rows.push({ factory: { price: h.price || '', timestamp: h.timestamp } });
                                                }
                                            }
                                        });
                                        if (currentRow.client || currentRow.factory) rows.push(currentRow);
                                        return rows.reverse();
                                    })();

                                    const acceptedHistoryRowIndex = isAccepted && agreedPrice
                                        ? groupedHistory.findIndex(row => row.factory?.price === agreedPrice)
                                        : -1;

                                    return (
                                        <div key={idx} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden transition-all duration-200">
                                            <div 
                                                onClick={() => toggleExpand(idx)}
                                                className={`p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                                            >
                                                {/* Product Info */}
                                                <div className="md:col-span-4 flex items-center gap-3">
                                                    <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
                                                        {idx + 1}
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
                                                    {item.quantityType === 'container' ? item.containerType : `${item.qty} units`}
                                                </div>

                                                {/* Target Price */}
                                                <div className="md:col-span-2 text-sm text-right flex items-center justify-end gap-2">
                                                    <span className="md:hidden font-medium text-gray-500">Target:</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">${item.targetPrice}</span>
                                                </div>

                                                {/* Quoted Price */}
                                                <div className="md:col-span-2 text-sm text-right flex items-center justify-end gap-2">
                                                    <span className="md:hidden font-medium text-gray-500 mr-2">Quoted:</span>
                                                    {showAgreedPrice ? <span className="font-bold text-green-600 dark:text-green-400">${agreedPrice}</span> : (itemResponse?.price ? <span className="font-bold text-[#c20c0b] dark:text-red-400">${itemResponse.price}</span> : <span className="text-gray-400">-</span>)}
                                                    {(selectedQuote.status !== 'Accepted' && selectedQuote.status !== 'Declined') && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setNegotiatingItem(item); }}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                            title="Edit Quoted Price"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Expand Icon */}
                                                <div className="md:col-span-2 flex justify-end items-center gap-2">
                                                    {(selectedQuote.status !== 'Pending' && selectedQuote.status !== 'Trashed') && (
                                                        <button
                                                            onClick={(e) => handleToggleLineItemApproval(item.id, e)}
                                                            className={`p-2 rounded-full transition-all border ${
                                                                isAdminApproved
                                                                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                                    : isClientApproved
                                                                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                                                        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-green-600 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                                                            }`}
                                                            title={
                                                                isClientApproved && isAdminApproved ? "Price agreed by both parties" :
                                                                isAdminApproved ? "Accepted by you. Waiting for Client." :
                                                                isClientApproved ? "Client has accepted. Click to accept." :
                                                                "Click to approve this price"
                                                            }
                                                        >
                                                            {isAdminApproved ? (
                                                                isClientApproved ? <CheckCheck size={18} /> : <Check size={18} />
                                                            ) : (
                                                                <Circle size={18} />
                                                            )}
                                                        </button>
                                                    )}
                                                    {(history.length > 0 || itemResponse?.price) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setHistoryModalData({ item, history, itemResponse, response_details: selectedQuote.response_details, isAccepted, agreedPrice });
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
                                                                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.quantityType === 'container' ? item.containerType : `${item.qty} units`}</p>
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
                                                                        <span className="text-[10px] text-gray-500 dark:text-gray-200 font-medium">{String(ratio)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-2">
                                                                {item.sizeRange.map((size: string) => (
                                                                    <span key={size} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-full">{size}</span>
                                                                ))}
                                                                {item.customSize && <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">{item.customSize}</span>}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Price Comparison Card */}
                                                    {itemResponse?.price && (
                                                        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                                                    <Scale size={18} className="text-blue-600" /> Price History
                                                                </h4>
                                                            </div>
                                                            <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                                                                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                                                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">Client Target Price</th>
                                                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">Your Quoted Price</th>
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
                                                                        {/* Always show initial quote row at the bottom */}
                                                                        <tr className={isAccepted && acceptedHistoryRowIndex === -1 ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                                                                            <td className="px-4 py-3 whitespace-nowrap text-right align-top">
                                                                                <span className="text-gray-300 dark:text-gray-600">-</span>
                                                                            </td>
                                                                            <td className="px-4 py-3 whitespace-nowrap text-right align-top">
                                                                                <div>
                                                                                    <div className="text-lg font-bold text-[#c20c0b] dark:text-red-400">${itemResponse.price}</div>
                                                                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                                        {selectedQuote.response_details?.respondedAt ? (
                                                                                            <>
                                                                                                {new Date(selectedQuote.response_details.respondedAt).toLocaleDateString()} <span className="opacity-75">{new Date(selectedQuote.response_details.respondedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
                                                    )}

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
                                                        {(item.trimsAndAccessories || item.specialInstructions || item.sleeveOption || (item as any).printOption) && (
                                                            <div className="rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                                                <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-5 py-3">
                                                                    <p className="text-xs text-white uppercase font-bold tracking-wider">Additional Details</p>
                                                                </div>
                                                                <div className="p-5 bg-white dark:bg-gray-800 space-y-3 text-sm">
                                                                    {item.sleeveOption && <div><span className="text-gray-500 dark:text-gray-200 block mb-1">Sleeve:</span> <span className="font-medium text-gray-900 dark:text-white">{item.sleeveOption}</span></div>}
                                                                    {(item as any).printOption && <div><span className="text-gray-500 dark:text-gray-200 block mb-1">Print:</span> <span className="font-medium text-gray-900 dark:text-white">{(item as any).printOption}</span></div>}
                                                                    {item.trimsAndAccessories && <div><span className="text-gray-500 dark:text-gray-200 block mb-1">Trims:</span> <span className="font-medium text-gray-900 dark:text-white">{item.trimsAndAccessories}</span></div>}
                                                                    {item.specialInstructions && <div><span className="text-gray-500 dark:text-gray-200 block mb-1">Instructions:</span> <span className="font-medium text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded border border-yellow-100 dark:border-yellow-800 inline-block w-full">{item.specialInstructions}</span></div>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Chat / History Section */}
                                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-inner flex flex-col h-[400px] mb-6">
                                                        <h4 className="text-sm font-bold text-gray-700 dark:text-white mb-3 flex items-center gap-2 px-1">
                                                            <MessageSquare size={16}/> Discussion & History
                                                        </h4>

                                                        {/* Messages Area */}
                                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-3">
                                                            {history.length === 0 ? (
                                                                <div className="text-center text-gray-400 text-xs py-10">No history yet.</div>
                                                            ) : (
                                                                history.map((h, i) => (
                                                                    <div key={i} className={`flex ${h.sender === 'factory' ? 'justify-end' : 'justify-start'}`}>
                                                                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${h.sender === 'factory' ? 'bg-[#c20c0b] text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white rounded-tl-none'}`}>
                                                                            <div className="flex justify-between items-center gap-4 mb-1">
                                                                                <span className={`text-[10px] font-bold uppercase ${h.sender === 'factory' ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                                                    {h.sender === 'factory' ? 'You' : 'Client'}
                                                                                </span>
                                                                                <span className={`text-[10px] ${h.sender === 'factory' ? 'text-red-200' : 'text-gray-400 dark:text-gray-500'}`}>
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
                                                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end">
                                                        <button onClick={() => setIsResponseModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                                                            <MessageSquare size={16} /> Set Price
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Totals Footer (Desktop) */}
                                <div className="hidden md:grid grid-cols-12 gap-4 w-full px-4 mt-2 border-t border-gray-200 dark:border-white/10 pt-4">
                                    <div className="col-span-4 text-right text-xs font-bold text-gray-500 dark:text-white uppercase tracking-wider self-center">Total Quantity</div>
                                    <div className="col-span-2 text-center">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedQuote.order?.lineItems?.reduce((acc, item) => acc + (item.qty || 0), 0).toLocaleString()}</p>
                                    </div>
                                    <div className="col-span-6"></div>
                                </div>

                                {/* Totals Footer (Mobile) */}
                                <div className="md:hidden mt-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-white/10 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total Quantity</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedQuote.order?.lineItems?.reduce((acc: number, item: any) => acc + (item.qty || 0), 0).toLocaleString()}</span>
                                </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TIMELINE TAB */}
                        {activeQuoteTab === 'timeline' && (
                            <div className="animate-fade-in space-y-6">
                                {/* Negotiation Timeline Card */}
                                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <History size={20} className="text-[#c20c0b]" /> Negotiation Timeline
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track the quote negotiation progress</p>
                                    </div>
                                    <div className="p-6">
                                        <div className="relative">
                                            {/* Horizontal Line */}
                                            <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700" />

                                            <div className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2">
                                                {/* Initial Request Node */}
                                                <div className="flex-shrink-0 w-64 relative pt-8">
                                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 z-10" />
                                                    <div className="bg-white dark:bg-gray-900/60 p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm h-full flex flex-col">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Request</span>
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">{formatFriendlyDate(selectedQuote.submittedAt)}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-white font-medium">Initial Quote Request</p>
                                                    </div>
                                                </div>

                                                {displayHistory.map((item, idx) => (
                                                    <div key={idx} className="flex-shrink-0 w-72 relative pt-8">
                                                        <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 z-10 ${item.sender === 'factory' ? 'bg-[#c20c0b]' : 'bg-blue-500'}`} />
                                                        <div className={`p-4 rounded-xl border shadow-sm h-full flex flex-col ${item.sender === 'factory' ? 'bg-white dark:bg-gray-900/60 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-gray-900/60 border-blue-100 dark:border-blue-900/30'}`}>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className={`text-xs font-bold uppercase ${item.sender === 'factory' ? 'text-[#c20c0b]' : 'text-blue-600'}`}>
                                                                    {item.sender === 'factory' ? 'You' : 'Client'}
                                                                </span>
                                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                    {formatFriendlyDate(item.timestamp)}
                                                                </span>
                                                            </div>
                                                            {item.price && (
                                                                <div className="mb-2">
                                                                    <span className="text-lg font-bold text-gray-900 dark:text-white">${item.price}</span>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/ unit</span>
                                                                </div>
                                                            )}
                                                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap flex-grow">
                                                                {item.message}
                                                            </p>
                                                            {item.action === 'accept' && <div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/10 text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle size={12}/> Accepted</div>}
                                                            {item.action === 'decline' && <div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/10 text-xs font-bold text-red-600 flex items-center gap-1"><X size={12}/> Declined</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Admin Actions */}
                                        {selectedQuote.status !== 'Accepted' && selectedQuote.status !== 'Declined' && (
                                            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                                                <button onClick={() => setIsDeclineModalOpen(true)} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition shadow-sm flex items-center gap-2">
                                                    <XCircle size={18} /> Decline
                                                </button>
                                                <button onClick={() => setIsResponseModalOpen(true)} className="px-4 py-2 bg-[#c20c0b] text-white font-semibold rounded-lg hover:bg-[#a50a09] transition shadow-md flex items-center gap-2">
                                                    <MessageSquare size={18} /> Respond
                                                </button>
                                                <button onClick={() => handleUpdateStatus(selectedQuote.id, selectedQuote.status === 'Client Accepted' ? 'Accepted' : 'Admin Accepted')} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md flex items-center gap-2">
                                                    {selectedQuote.status === 'Client Accepted' ? <CheckCheck size={18} /> : <Check size={18} />}
                                                    {selectedQuote.status === 'Client Accepted' ? 'Finalize' : 'Accept'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Execution Plan Section */}
                                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden p-6 sm:p-8">
                                    <div
                                        className="flex justify-between items-center mb-8 cursor-pointer"
                                        onClick={() => setIsExecutionPlanExpanded(!isExecutionPlanExpanded)}
                                    >
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                            <ClipboardList size={24} className="mr-3 text-[#c20c0b]" /> Execution Plan
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            {isExecutionPlanExpanded && (
                                                <>
                                                <button
                                                    onClick={toggleAllExecutionSteps}
                                                    className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mr-2"
                                                >
                                                    {expandedExecutionSteps.length === ((selectedQuote as any).execution_plan || DEFAULT_EXECUTION_PLAN).length ? 'Collapse All' : 'Expand All'}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsExecutionPlanModalOpen(true); }}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                                >
                                                    <Edit size={16} /> Edit Plan
                                                </button>
                                                </>
                                            )}
                                            {isExecutionPlanExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                        </div>
                                    </div>

                                    {isExecutionPlanExpanded && (
                                    <div className="relative animate-fade-in">
                                        {/* Connecting Line */}
                                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                                        <div className="space-y-8">
                                            {((selectedQuote as any).execution_plan || DEFAULT_EXECUTION_PLAN).map((step: ExecutionStep, index: number) => {
                                                const color = STEP_COLORS[index % STEP_COLORS.length];
                                                const isStepExpanded = expandedExecutionSteps.includes(index);
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
                                                            className={`ml-6 flex-1 cursor-pointer rounded-xl border p-4 transition-all ${isStepExpanded ? 'bg-white dark:bg-gray-800 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent'} ${isStepExpanded ? color.subtleBorder : ''}`}
                                                            onClick={() => toggleExecutionStep(index)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <h4 className={`text-lg font-bold ${isStepExpanded ? color.text : 'text-gray-900 dark:text-white'} mb-1`}>{step.title}</h4>
                                                                {isStepExpanded ? <ChevronUp size={16} className={color.text} /> : <ChevronDown size={16} className="text-gray-400" />}
                                                            </div>
                                                            {isStepExpanded && (
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
                            </div>
                        )}

                        {/* FILES TAB */}
                        {activeQuoteTab === 'files' && (
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
                                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                                <p className="text-sm">Loading attachments...</p>
                                            </div>
                                        ) : fileLinks.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {fileLinks.map((file, i) => {
                                                    const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                                    return (
                                                    <div key={i} className="group relative rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:shadow-lg transition-all cursor-pointer" onClick={() => isImage ? openLightbox(file.url) : window.open(file.url, '_blank')}>
                                                        {isImage ? (
                                                            <div className="aspect-video bg-gray-100 dark:bg-gray-800">
                                                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="aspect-video bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                                                <FileText size={48} className="text-gray-300 dark:text-gray-600" />
                                                            </div>
                                                        )}
                                                        <div className="p-3 bg-white dark:bg-gray-900">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-[#c20c0b] transition-colors">
                                                                {isImage ? 'Click to preview' : 'Click to download'}
                                                            </p>
                                                        </div>
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-[#c20c0b]" title="Download" onClick={(e) => e.stopPropagation()}>
                                                            <Download size={16} />
                                                        </a>
                                                    </div>
                                                )})}
                                            </div>
                                        ) : selectedQuote.files && selectedQuote.files.length > 0 ? (
                                            <div className="text-center py-8 text-red-500 dark:text-red-400 italic bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                                <p className="mb-2">Failed to load attachments.</p>
                                                <button onClick={fetchSignedUrls} className="text-sm font-bold underline hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-1 mx-auto">
                                                    <RefreshCw size={14} /> Retry
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                                                <FileText size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                                <p>No attachments found for this quote.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {isResponseModalOpen && (
                        createPortal(<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white/90 backdrop-blur-xl dark:bg-gray-900/95 dark:backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-white/10 pb-4">
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Send Quote Response</h2>
                                    <button onClick={() => setIsResponseModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleSubmitResponse} className="space-y-4">
                                    
                                    {/* Line Item Pricing */}
                                    <div className="space-y-4 mb-6">
                                        <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Product Pricing</h3>
                                        {selectedQuote.order.lineItems.map((item, idx) => (
                                            <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-800 dark:text-white">{item.category}</p>
                                                    <p className="text-xs text-gray-500 dark:text-white">Qty: {item.quantityType === 'container' ? item.containerType : item.qty} | Target: ${item.targetPrice}</p>
                                                </div>
                                                <div className="w-1/3">
                                                    <label className="block text-xs font-medium text-gray-500 dark:text-white mb-1">Your Price ($)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={lineItemPrices[item.id] || ''} 
                                                        onChange={(e) => setLineItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                                                        placeholder="0.00" 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Summary Price (Optional)</label>
                                        <input type="text" value={responseForm.price} onChange={e => setResponseForm({...responseForm, price: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="e.g. Varies by item or Total $5000" />
                                        <p className="text-xs text-gray-500 dark:text-white mt-1">This will be displayed on the main card.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Lead Time</label>
                                        <input type="text" required value={responseForm.leadTime} onChange={e => setResponseForm({...responseForm, leadTime: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="e.g. 30-40 days" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Notes / Terms</label>
                                        <textarea required value={responseForm.notes} onChange={e => setResponseForm({...responseForm, notes: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" rows={4} placeholder="Additional details..." />
                                    </div>
                                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-white/10">
                                        <button type="button" onClick={() => setIsResponseModalOpen(false)} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
                                        <button type="submit" disabled={isSubmittingResponse} className="px-6 py-2.5 bg-[#c20c0b] text-white font-semibold rounded-xl hover:bg-[#a50a09] transition shadow-md disabled:opacity-50">
                                            {isSubmittingResponse ? 'Sending...' : 'Send Response'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>, document.body)
                    )}

                    {/* Decline Modal */}
                    {isDeclineModalOpen && (
                        createPortal(<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                            <div className="bg-white/90 backdrop-blur-xl dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-md p-6 relative border border-gray-200 dark:border-white/10">
                                <button onClick={() => setIsDeclineModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Decline Offer</h2>
                                <p className="text-gray-500 dark:text-white text-sm mb-6">Are you sure you want to decline this offer? This will mark the quote as declined. You can send a message to the client explaining why.</p>
                                
                                <textarea
                                    value={declineMessage}
                                    onChange={(e) => setDeclineMessage(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    rows={4}
                                    placeholder="Reason for declining..."
                                />
                                
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setIsDeclineModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
                                    <button onClick={handleDeclineSubmit} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-md">Decline Quote</button>
                                </div>
                            </div>
                        </div>, document.body)
                    )}

                    {/* Shipping Modal */}
                    {isShippingModalOpen && (
                        createPortal(<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                            <div className="bg-white/90 backdrop-blur-xl dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-md p-6 relative border border-gray-200 dark:border-white/10">
                                <button onClick={() => setIsShippingModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Truck size={20} className="text-blue-600"/> Shipping Details</h2>
                                <form onSubmit={handleSubmitShipping} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Courier Service</label>
                                        <input type="text" required value={shippingForm.courier} onChange={e => setShippingForm({...shippingForm, courier: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="DHL, FedEx, etc." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking Number</label>
                                        <input type="text" required value={shippingForm.trackingNumber} onChange={e => setShippingForm({...shippingForm, trackingNumber: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tracking #" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking Link (Optional)</label>
                                        <input type="url" value={shippingForm.trackingLink} onChange={e => setShippingForm({...shippingForm, trackingLink: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setIsShippingModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
                                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md">Confirm Shipment</button>
                                    </div>
                                </form>
                            </div>
                        </div>, document.body)
                    )}

                    {/* Price History Modal */}
                    {historyModalData && (
                        <PriceHistoryModal
                            data={historyModalData}
                            onClose={() => setHistoryModalData(null)}
                        />
                    )}

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
                        </div>, document.body
                    )}

                    {/* Single Item Negotiation Modal */}
                    {negotiatingItem && (
                        <SingleItemNegotiationModal
                            item={negotiatingItem}
                            onSubmit={handleSingleItemResponse}
                            onClose={() => setNegotiatingItem(null)}
                        />
                    )}

                    {/* Bulk Action Confirmation Modal */}
                    {isBulkActionModalOpen && createPortal(
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 animate-fade-in">
                            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col max-h-[80vh]">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {bulkActionType === 'hide' ? 'Hide Quotes' : 
                                     bulkActionType === 'unhide' ? 'Unhide Quotes' : 
                                     bulkActionType === 'restore' ? 'Restore Quotes' : 
                                     'Delete Quotes'}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                    Are you sure you want to {bulkActionType} the following {selectedQuoteIds.length} quotes?
                                </p>
                                
                                <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg mb-6 bg-gray-50 dark:bg-gray-800/50 p-2 custom-scrollbar">
                                    {quotes.filter(q => selectedQuoteIds.includes(q.id)).map(quote => (
                                        <div key={quote.id} className="flex justify-between items-center p-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
                                            <span className="font-medium text-gray-800 dark:text-gray-200">#{quote.id.slice(0, 8)}</span>
                                            <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{quote.clientName}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => setIsBulkActionModalOpen(false)}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={performBulkAction}
                                        className={`px-4 py-2 text-white rounded-lg transition-colors ${bulkActionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#c20c0b] hover:bg-[#a50a09]'}`}
                                    >
                                        Confirm {bulkActionType === 'hide' ? 'Hide' : bulkActionType === 'unhide' ? 'Unhide' : bulkActionType === 'restore' ? 'Restore' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Execution Plan Edit Modal */}
                    {isExecutionPlanModalOpen && (
                        <EditExecutionPlanModal
                            initialPlan={(selectedQuote as any).execution_plan || DEFAULT_EXECUTION_PLAN}
                            onSave={handleSaveExecutionPlan}
                            onClose={() => setIsExecutionPlanModalOpen(false)}
                        />
                    )}

                    {/* Sample Response Modal - Now rendered as full page above */}
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout {...props}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">RFQ Management</h1>
                        <p className="text-gray-500 dark:text-white mt-1">Manage and respond to client quote requests.</p>
                    </div>
                    {viewMode === 'active' && (
                        <button onClick={() => setShowHidden(!showHidden)} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${showHidden ? 'text-[#c20c0b] bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400'}`} title={showHidden ? "View Active Quotes" : "View Hidden Quotes"}>
                            {showHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                    )}
                    <button onClick={toggleSelectionMode} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isSelectionMode ? 'text-[#c20c0b] bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400'}`} title={isSelectionMode ? "Exit Selection Mode" : "Select Quotes"}>
                        <CheckSquare size={20} />
                    </button>
                    <button onClick={fetchQuotes} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors ${isLoading ? 'animate-spin' : ''}`} title="Refresh Quotes"><RefreshCw size={20}/></button>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {filterOptions.map(status => (
                            <button key={status} onClick={() => setFilterStatus(status)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-md transition-colors ${filterStatus === status ? 'bg-red-100 dark:bg-red-900/30 text-[#c20c0b] dark:text-red-400' : 'text-gray-500 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                {status}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <div className="relative mr-2">
                             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                             <input 
                                 type="text" 
                                 placeholder="Search..." 
                                 value={searchTerm}
                                 onChange={(e) => setSearchTerm(e.target.value)}
                                 className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-32 sm:w-40 focus:w-56 transition-all"
                             />
                        </div>
                        
                        {/* Client Filter Dropdown */}
                        <div className="relative mr-2" ref={clientDropdownRef}>
                            <button 
                                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                                className={`flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors ${selectedClientId ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-[#c20c0b] dark:text-red-400' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white'}`}
                            >
                                <User size={14} />
                                <span className="max-w-[100px] truncate">
                                    {selectedClientId ? uniqueClients.find(c => c.id === selectedClientId)?.name : 'All Clients'}
                                </span>
                                <ChevronDown size={14} />
                            </button>
                            
                            {isClientDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-2 animate-fade-in">
                                    <div className="relative mb-2">
                                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search user..." 
                                            value={clientSearchTerm}
                                            onChange={(e) => setClientSearchTerm(e.target.value)}
                                            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c20c0b]"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                        <button onClick={() => { setSelectedClientId(null); setIsClientDropdownOpen(false); }} className={`w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${!selectedClientId ? 'bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>All Clients</button>
                                        {uniqueClients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).map(client => (
                                            <button key={client.id} onClick={() => { setSelectedClientId(client.id); setIsClientDropdownOpen(false); }} className={`w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedClientId === client.id ? 'bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>{client.name}</button>
                                        ))}
                                        {uniqueClients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).length === 0 && <div className="px-2 py-2 text-xs text-gray-500 text-center">No users found</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
                        <select 
                            value={dateFilter} 
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="text-sm border-none bg-transparent font-medium text-gray-600 dark:text-gray-300 focus:ring-0 cursor-pointer outline-none dark:bg-black"
                        >
                            <option>All Time</option>
                            <option>Today</option>
                            <option>Yesterday</option>
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Custom Range</option>
                        </select>
                        {dateFilter === 'Custom Range' && (
                            <div className="flex items-center gap-2 ml-2 animate-fade-in">
                                <input 
                                    type="date" 
                                    value={customStartDate} 
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    max={todayString}
                                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                                />
                                <span className="text-gray-400">-</span>
                                <input 
                                    type="date" 
                                    value={customEndDate} 
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    max={todayString}
                                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                                />
                            </div>
                        )}
                        
                        {(filterStatus !== 'All' || dateFilter !== 'All Time' || searchTerm || selectedClientId) && (
                            <button 
                                onClick={handleClearFilters}
                                className="ml-2 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                            >
                                <X size={14} /> Clear
                            </button>
                        )}

                        <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
                            <button onClick={() => setViewMode(viewMode === 'active' ? 'trash' : 'active')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'trash' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                <Trash2 size={16} />
                                {viewMode === 'active' ? 'Trash' : 'Active Quotes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {!isLoading && filteredQuotes.length > 0 && isSelectionMode && (
                <div className="flex justify-between items-center mb-4 bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-3 rounded-lg border border-gray-200 dark:border-white/10 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={selectedQuoteIds.length === filteredQuotes.length && filteredQuotes.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded text-[#c20c0b] focus:ring-[#c20c0b] h-4 w-4 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-white">Select All ({filteredQuotes.length})</span>
                    </div>
                    {selectedQuoteIds.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-white mr-2">{selectedQuoteIds.length} selected</span>
                            {viewMode === 'trash' ? (
                                <>
                                    <button onClick={() => openBulkActionModal('restore')} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <RotateCcw size={14} /> Restore Selected
                                    </button>
                                    <button onClick={() => openBulkActionModal('delete')} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <Trash2 size={14} /> Delete Selected
                                    </button>
                                </>
                            ) : (
                                showHidden ? (
                                    <button onClick={() => openBulkActionModal('unhide')} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <Eye size={14} /> Unhide Selected
                                    </button>
                                ) : (
                                    <button onClick={() => openBulkActionModal('hide')} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <EyeOff size={14} /> Hide Selected
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading quotes...</div>
            ) : filteredQuotes.length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {displayedQuotes.map((quote, index) => (
                        <div 
                            key={quote.id} 
                            onClick={() => setSelectedQuote(quote)} 
                            onMouseEnter={() => setHoveredQuoteId(quote.id)}
                            onMouseLeave={() => setHoveredQuoteId(null)}
                            className={`bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl p-6 shadow-md ${getStatusHoverShadow(quote.status)} border border-gray-200 dark:border-white/10 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col hover:-translate-y-1`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${getStatusGradientBorder(quote.status)}`} />
                            
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    {isSelectionMode && (
                                        <input 
                                            type="checkbox" 
                                            checked={selectedQuoteIds.includes(quote.id)}
                                            onChange={(e) => { e.stopPropagation(); toggleSelectQuote(quote.id); }}
                                            className="rounded text-[#c20c0b] focus:ring-[#c20c0b] h-4 w-4 cursor-pointer mr-1"
                                        />
                                    )}
                                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                        #{quote.id.slice(0, 8)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {(quote.modification_count || 0) > 0 && (
                                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <Edit size={10} />
                                            Modified
                                        </span>
                                    )}
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getStatusColor(quote.status)} flex items-center gap-1`}>
                                        {quote.status === 'Accepted' && <CheckCheck size={12} />}
                                        {(quote.status === 'Admin Accepted' || quote.status === 'Client Accepted') && <Check size={12} />}
                                        {quote.status === 'Admin Accepted' ? 'Admin Accepted' : quote.status === 'Client Accepted' ? 'Client Accepted' : quote.status}
                                    </span>
                                </div>
                            </div>

                            {/* Client Info (Replaces Factory Info from MyQuotesPage) */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-[#c20c0b] dark:text-red-400 font-bold border border-red-200 dark:border-red-800 shadow-sm">
                                    {(quote.clientName || 'U').charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight group-hover:text-[#c20c0b] transition-colors">{quote.clientName || 'Unknown Client'}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-white flex items-center mt-0.5"><Building size={10} className="mr-1"/>{quote.companyName || 'Unknown Company'}</p>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="flex-grow">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-[#c20c0b] transition-colors">
                                    {quote.order?.lineItems?.length > 1 ? `${quote.order.lineItems.length} Product Types` : (quote.order?.lineItems?.[0]?.category || 'Unknown Product')}
                                </h3>
                                <p className="text-xs text-gray-400 dark:text-white mb-6">
                                    {getDisplayDateInfo(quote).label} {getDisplayDateInfo(quote).date}
                                </p>

                                <div className="flex items-center gap-8 mb-6">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-white mb-1">Quantity</p>
                                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-white font-medium text-sm">
                                            <Package size={14} className="text-gray-300 dark:text-white" />
                                        {(() => {
                                            const items = quote.order?.lineItems || [];
                                            if (items.length === 0) return '0 units';
                                            if (items.length === 1) {
                                                const item = items[0];
                                                return item.quantityType === 'container' ? item.containerType : `${item.qty} units`;
                                            }
                                            const allUnits = items.every(i => !i.quantityType || i.quantityType === 'units');
                                            if (allUnits) {
                                                const total = items.reduce((acc, i) => acc + (i.qty || 0), 0);
                                                return `${total} units`;
                                            }
                                            return 'Various';
                                        })()}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-white mb-1">{quote.status === 'Accepted' ? 'Agreed Price' : 'Target Price'}</p>
                                        <div className={`flex items-center gap-1.5 font-medium text-sm ${quote.status === 'Accepted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-white'}`}>
                                            <DollarSign size={14} className={quote.status === 'Accepted' ? 'text-emerald-400' : 'text-gray-300 dark:text-white'} />
                                            {(() => {
                                                const isAccepted = quote.status === 'Accepted';
                                                let priceValue = 'N/A';
                                                if (isAccepted) {
                                                    if (quote.response_details?.price) priceValue = `$${quote.response_details.price}`;
                                                    else priceValue = 'See Details';
                                                } else {
                                                    if (quote.order?.lineItems?.length === 1) priceValue = `$${quote.order.lineItems[0].targetPrice}`;
                                                    else priceValue = 'See Details';
                                                }
                                                return priceValue;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="mt-auto pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                                {viewMode === 'active' ? (
                                    <div className="flex gap-2">
                                        <button onClick={(e) => toggleHideQuote(quote.id, e)} className="text-gray-400 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 p-1" title={showHidden ? "Unhide Quote" : "Hide Quote"}>{showHidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                                        <button onClick={(e) => handleSoftDelete(quote.id, e)} className="text-gray-400 dark:text-white hover:text-red-600 dark:hover:text-red-400 p-1" title="Move to Trash"><Trash2 size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={(e) => handleRestore(quote, e)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1 flex items-center gap-1 text-xs font-medium" title="Restore Quote"><RotateCcw size={14} /> Restore</button>
                                        <button onClick={(e) => handlePermanentDelete(quote.id, e)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 flex items-center gap-1 text-xs font-medium" title="Delete Permanently"><Trash2 size={14} /> Delete</button>
                                    </div>
                                )}
                                
                                {viewMode === 'active' && (
                                    <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-800 group-hover:bg-[#c20c0b] flex items-center justify-center text-gray-400 dark:text-white group-hover:text-white transition-all duration-300">
                                        <ChevronRight size={16} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pb-8 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span>Rows per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPageIndex(1);
                            }}
                            className="border border-gray-300 dark:border-gray-600 rounded-md p-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#c20c0b]"
                        >
                            {[9, 18, 54, 99].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setCurrentPageIndex(p => Math.max(1, p - 1))}
                                disabled={currentPageIndex === 1}
                                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-200" />
                            </button>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                                Page {currentPageIndex} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPageIndex(p => Math.min(totalPages, p + 1))}
                                disabled={currentPageIndex === totalPages}
                                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                                <ChevronRight size={20} className="text-gray-600 dark:text-gray-200" />
                            </button>
                        </div>
                    )}
                </div>
                </>
            ) : (
                <div className="text-center py-16 bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10">
                    <FileQuestion className="mx-auto h-16 w-16 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white">No Quotes Found</h3>
                </div>
            )}
        </MainLayout>
    );
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
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">Client Target Price</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/2">Your Quoted Price</th>
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

interface SampleItemData {
    lineItemId: number;
    category: string;
    qty: number;
    targetPrice: string;
    sampleQty: number;
    sampleCost: string;
    photos: File[];
}

interface CommercialInvoiceData {
    // Shipper/Exporter
    shipperName: string;
    shipperAddress: string;
    shipperCity: string;
    shipperCountry: string;
    shipperPhone: string;
    shipperEmail: string;

    // Consignee/Buyer
    consigneeName: string;
    consigneeAddress: string;
    consigneeCity: string;
    consigneeCountry: string;
    consigneePhone: string;
    consigneeEmail: string;

    // Shipping Details
    portOfLoading: string;
    portOfDischarge: string;
    termsOfDelivery: string;
    paymentTerms: string;

    // Courier/Tracking
    courierService: string;
    trackingNumber: string;
}

const SampleResponsePage: FC<{
    requestedLineItems: any[];
    sampleRequest: any;
    quoteName: string;
    buyerInfo: {
        name: string;
        address: string;
        city: string;
        country: string;
        phone: string;
        email: string;
    };
    supabase: any;
    onSubmit: (itemsData: SampleItemData[], shippingCost: string, notes: string, commercialData: CommercialInvoiceData) => void;
    onClose: () => void;
}> = ({ requestedLineItems, sampleRequest, quoteName, buyerInfo, supabase, onSubmit, onClose }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [notes, setNotes] = useState('');
    const [shippingCost, setShippingCost] = useState('');
    const [itemsData, setItemsData] = useState<SampleItemData[]>(
        requestedLineItems.map(item => ({
            lineItemId: item.id,
            category: item.category,
            qty: item.qty,
            targetPrice: item.targetPrice,
            sampleQty: 1,
            sampleCost: '',
            photos: []
        }))
    );
    const [commercialData, setCommercialData] = useState<CommercialInvoiceData>({
        shipperName: '',
        shipperAddress: '',
        shipperCity: '',
        shipperCountry: '',
        shipperPhone: '',
        shipperEmail: '',
        consigneeName: buyerInfo.name,
        consigneeAddress: buyerInfo.address,
        consigneeCity: buyerInfo.city,
        consigneeCountry: buyerInfo.country,
        consigneePhone: buyerInfo.phone,
        consigneeEmail: buyerInfo.email,
        portOfLoading: '',
        portOfDischarge: '',
        termsOfDelivery: 'DDP',
        paymentTerms: 'Prepaid',
        courierService: '',
        trackingNumber: ''
    });
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const updateItemData = (index: number, field: keyof SampleItemData, value: any) => {
        const updated = [...itemsData];
        updated[index] = { ...updated[index], [field]: value };
        setItemsData(updated);
    };

    const handlePhotoUpload = (index: number, files: FileList | null) => {
        if (!files) return;
        updateItemData(index, 'photos', [...itemsData[index].photos, ...Array.from(files)]);
    };

    const removePhoto = (itemIndex: number, photoIndex: number) => {
        const updated = [...itemsData];
        updated[itemIndex].photos = updated[itemIndex].photos.filter((_, i) => i !== photoIndex);
        setItemsData(updated);
    };

    const calculateSubtotal = () => {
        return itemsData.reduce((sum, item) => sum + (parseFloat(item.sampleCost) || 0) * (item.sampleQty || 1), 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + (parseFloat(shippingCost) || 0);
    };

    const generateInvoicePDF = async () => {
        if (!invoiceRef.current) return;
        setIsGeneratingPDF(true);

        try {
            const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Sample_Invoice_${Date.now()}.pdf`);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all items have costs
        if (itemsData.some(item => !item.sampleCost || parseFloat(item.sampleCost) <= 0)) {
            alert('Please enter sample cost for all items');
            return;
        }

        if (!shippingCost || parseFloat(shippingCost) <= 0) {
            alert('Please enter shipping cost');
            return;
        }

        // Validate required commercial invoice fields
        if (!commercialData.shipperName || !commercialData.consigneeName) {
            alert('Please fill in shipper and consignee details');
            return;
        }

        onSubmit(itemsData, shippingCost, notes, commercialData);
    };

    const invoiceDate = new Date().toLocaleDateString();
    const invoiceNumber = `INV-SAMPLE-${Date.now()}`;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                aria-label="Go back"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Box size={24} className="text-blue-600" /> Process Sample Request
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                    {quoteName} - Commercial Invoice
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Form Fields */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <FileText size={20} className="text-blue-600" /> Invoice Information
                        </h2>

                        {/* Shipper/Exporter Details */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                Shipper / Exporter Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
                                    <input
                                        type="text"
                                        value={commercialData.shipperName}
                                        onChange={(e) => setCommercialData({...commercialData, shipperName: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Exporter Company Name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={commercialData.shipperPhone}
                                        onChange={(e) => setCommercialData({...commercialData, shipperPhone: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={commercialData.shipperAddress}
                                        onChange={(e) => setCommercialData({...commercialData, shipperAddress: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Street Address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={commercialData.shipperEmail}
                                        onChange={(e) => setCommercialData({...commercialData, shipperEmail: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="email@company.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                                    <input
                                        type="text"
                                        value={commercialData.shipperCity}
                                        onChange={(e) => setCommercialData({...commercialData, shipperCity: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                                    <input
                                        type="text"
                                        value={commercialData.shipperCountry}
                                        onChange={(e) => setCommercialData({...commercialData, shipperCountry: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Country"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Consignee/Buyer Details */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                Consignee / Buyer Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
                                    <input
                                        type="text"
                                        value={commercialData.consigneeName}
                                        onChange={(e) => setCommercialData({...commercialData, consigneeName: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Buyer Company Name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={commercialData.consigneePhone}
                                        onChange={(e) => setCommercialData({...commercialData, consigneePhone: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={commercialData.consigneeAddress}
                                        onChange={(e) => setCommercialData({...commercialData, consigneeAddress: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Street Address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={commercialData.consigneeEmail}
                                        onChange={(e) => setCommercialData({...commercialData, consigneeEmail: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="email@company.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                                    <input
                                        type="text"
                                        value={commercialData.consigneeCity}
                                        onChange={(e) => setCommercialData({...commercialData, consigneeCity: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                                    <input
                                        type="text"
                                        value={commercialData.consigneeCountry}
                                        onChange={(e) => setCommercialData({...commercialData, consigneeCountry: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Country"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Shipping & Payment Terms */}
                        <div className="mb-0">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                Shipping & Payment Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port of Loading</label>
                                    <input
                                        type="text"
                                        value={commercialData.portOfLoading}
                                        onChange={(e) => setCommercialData({...commercialData, portOfLoading: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Port Name, Country"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port of Discharge</label>
                                    <input
                                        type="text"
                                        value={commercialData.portOfDischarge}
                                        onChange={(e) => setCommercialData({...commercialData, portOfDischarge: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Port Name, Country"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terms of Delivery</label>
                                    <select
                                        value={commercialData.termsOfDelivery}
                                        onChange={(e) => setCommercialData({...commercialData, termsOfDelivery: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="DDP">DDP - Delivered Duty Paid</option>
                                        <option value="FOB">FOB - Free On Board</option>
                                        <option value="CIF">CIF - Cost, Insurance & Freight</option>
                                        <option value="EXW">EXW - Ex Works</option>
                                        <option value="FCA">FCA - Free Carrier</option>
                                        <option value="CPT">CPT - Carriage Paid To</option>
                                        <option value="DAP">DAP - Delivered At Place</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                                    <select
                                        value={commercialData.paymentTerms}
                                        onChange={(e) => setCommercialData({...commercialData, paymentTerms: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Prepaid">Prepaid</option>
                                        <option value="COD">COD - Cash On Delivery</option>
                                        <option value="Net 30">Net 30</option>
                                        <option value="Net 60">Net 60</option>
                                        <option value="Net 90">Net 90</option>
                                        <option value="50% Advance">50% Advance, 50% On Delivery</option>
                                        <option value="Letter of Credit">Letter of Credit</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Courier Service</label>
                                    <input
                                        type="text"
                                        value={commercialData.courierService}
                                        onChange={(e) => setCommercialData({...commercialData, courierService: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="DHL, FedEx, UPS, etc."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking Number</label>
                                    <input
                                        type="text"
                                        value={commercialData.trackingNumber}
                                        onChange={(e) => setCommercialData({...commercialData, trackingNumber: e.target.value})}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Tracking number"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item Costs Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <DollarSign size={20} className="text-green-600" /> Item Costs & Pricing
                        </h2>
                        <div className="space-y-3">
                            {itemsData.map((item, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-white">{item.category}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Order Qty: {item.qty} units | Target: ${item.targetPrice}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Sample Qty:</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.sampleQty}
                                                onChange={(e) => updateItemData(index, 'sampleQty', parseInt(e.target.value) || 1)}
                                                className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                required
                                            />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">pcs</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Unit Cost:</label>
                                            <div className="flex items-center gap-1">
                                                <span className="text-gray-600 dark:text-gray-400">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.sampleCost}
                                                    onChange={(e) => updateItemData(index, 'sampleCost', e.target.value)}
                                                    className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {item.sampleQty > 0 && item.sampleCost && (
                                        <div className="mt-2 text-sm text-right">
                                            <span className="text-gray-600 dark:text-gray-400">Total: </span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                ${((parseFloat(item.sampleCost) || 0) * item.sampleQty).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 dark:text-white">Shipping & Handling</p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost:</label>
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-600 dark:text-gray-400">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={shippingCost}
                                            onChange={(e) => setShippingCost(e.target.value)}
                                            className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Total Preview */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
                                <div className="flex justify-between items-center text-sm mb-2">
                                    <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">${calculateSubtotal().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mb-3 pb-3 border-b border-blue-200 dark:border-blue-700">
                                    <span className="text-gray-700 dark:text-gray-300">Shipping:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">${(parseFloat(shippingCost) || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount:</span>
                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${calculateTotal().toFixed(2)} USD</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Photo Upload Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <ImageIcon size={20} className="text-purple-600" /> Upload Sample Photos
                        </h2>
                        <div className="space-y-4">
                            {itemsData.map((item, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-semibold text-gray-900 dark:text-white">{item.category}</p>
                                        <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                            <Plus size={16} /> Add Photos
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => handlePhotoUpload(index, e.target.files)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {item.photos.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                                            {item.photos.map((photo, photoIndex) => (
                                                <div key={photoIndex} className="relative group">
                                                    <img
                                                        src={URL.createObjectURL(photo)}
                                                        alt={`${item.category} ${photoIndex + 1}`}
                                                        className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePhoto(index, photoIndex)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{photo.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {item.photos.length === 0 && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">No photos uploaded yet</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MessageSquare size={20} className="text-orange-600" /> Additional Notes
                        </h2>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={4}
                            placeholder="Any special instructions, shipping notes, or additional details..."
                        />
                    </div>

                    {/* Section 2: Invoice Preview */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Eye size={20} className="text-indigo-600" /> Commercial Invoice Preview
                        </h2>
                        <div ref={invoiceRef} className="bg-white rounded-xl border-2 border-black p-8">
                        {/* Invoice Header */}
                        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-black">
                            <div>
                                <h1 className="text-3xl font-bold text-black mb-2">COMMERCIAL INVOICE</h1>
                                <p className="text-sm text-gray-700">Sample Request</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-700">Invoice Number</p>
                                <p className="text-lg font-bold text-black">{invoiceNumber}</p>
                                <p className="text-sm text-gray-700 mt-2">Date: {invoiceDate}</p>
                            </div>
                        </div>

                        {/* Shipper & Consignee Info */}
                        <div className="grid grid-cols-2 gap-8 mb-6 pb-6 border-b border-black">
                            <div>
                                <p className="text-xs font-bold text-black uppercase mb-2 border-b border-gray-400 pb-1">Shipper / Exporter</p>
                                {commercialData.shipperName && <p className="text-sm font-bold text-black">{commercialData.shipperName}</p>}
                                {commercialData.shipperAddress && <p className="text-sm text-gray-700">{commercialData.shipperAddress}</p>}
                                {(commercialData.shipperCity || commercialData.shipperCountry) && (
                                    <p className="text-sm text-gray-700">
                                        {commercialData.shipperCity}{commercialData.shipperCity && commercialData.shipperCountry && ', '}{commercialData.shipperCountry}
                                    </p>
                                )}
                                {commercialData.shipperPhone && <p className="text-sm text-gray-700">Tel: {commercialData.shipperPhone}</p>}
                                {commercialData.shipperEmail && <p className="text-sm text-gray-700">Email: {commercialData.shipperEmail}</p>}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-black uppercase mb-2 border-b border-gray-400 pb-1">Consignee / Buyer</p>
                                {commercialData.consigneeName && <p className="text-sm font-bold text-black">{commercialData.consigneeName}</p>}
                                {commercialData.consigneeAddress && <p className="text-sm text-gray-700">{commercialData.consigneeAddress}</p>}
                                {(commercialData.consigneeCity || commercialData.consigneeCountry) && (
                                    <p className="text-sm text-gray-700">
                                        {commercialData.consigneeCity}{commercialData.consigneeCity && commercialData.consigneeCountry && ', '}{commercialData.consigneeCountry}
                                    </p>
                                )}
                                {commercialData.consigneePhone && <p className="text-sm text-gray-700">Tel: {commercialData.consigneePhone}</p>}
                                {commercialData.consigneeEmail && <p className="text-sm text-gray-700">Email: {commercialData.consigneeEmail}</p>}
                            </div>
                        </div>

                        {/* Shipping Details */}
                        <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-black">
                            <div>
                                <p className="text-xs font-bold text-black uppercase mb-2">Shipping Information</p>
                                {commercialData.portOfLoading && (
                                    <p className="text-sm text-gray-700"><span className="font-semibold">Port of Loading:</span> {commercialData.portOfLoading}</p>
                                )}
                                {commercialData.portOfDischarge && (
                                    <p className="text-sm text-gray-700"><span className="font-semibold">Port of Discharge:</span> {commercialData.portOfDischarge}</p>
                                )}
                                {commercialData.courierService && (
                                    <p className="text-sm text-gray-700"><span className="font-semibold">Courier:</span> {commercialData.courierService}</p>
                                )}
                                {commercialData.trackingNumber && (
                                    <p className="text-sm text-gray-700"><span className="font-semibold">Tracking:</span> {commercialData.trackingNumber}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-black uppercase mb-2">Terms & Conditions</p>
                                <p className="text-sm text-gray-700"><span className="font-semibold">Terms of Delivery:</span> {commercialData.termsOfDelivery}</p>
                                <p className="text-sm text-gray-700"><span className="font-semibold">Payment Terms:</span> {commercialData.paymentTerms}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-6">
                            <thead>
                                <tr className="border-b-2 border-black bg-gray-100">
                                    <th className="text-left py-3 px-2 text-xs font-bold text-black uppercase">#</th>
                                    <th className="text-left py-3 px-2 text-xs font-bold text-black uppercase">Description</th>
                                    <th className="text-center py-3 px-2 text-xs font-bold text-black uppercase">Quantity</th>
                                    <th className="text-right py-3 px-2 text-xs font-bold text-black uppercase">Unit Price</th>
                                    <th className="text-right py-3 px-2 text-xs font-bold text-black uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsData.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-300">
                                        <td className="py-4 px-2 text-sm text-black">{index + 1}</td>
                                        <td className="py-4 px-2">
                                            <p className="text-sm font-semibold text-black">{item.category}</p>
                                            <p className="text-xs text-gray-600">Sample for order qty: {item.qty} units</p>
                                        </td>
                                        <td className="py-4 px-2 text-center text-sm text-black">{item.sampleQty} {item.sampleQty === 1 ? 'pc' : 'pcs'}</td>
                                        <td className="py-4 px-2 text-right text-sm text-black">
                                            ${(parseFloat(item.sampleCost) || 0).toFixed(2)}
                                        </td>
                                        <td className="py-4 px-2 text-right text-sm font-semibold text-black">
                                            ${((parseFloat(item.sampleCost) || 0) * item.sampleQty).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-black">
                                    <td colSpan={4} className="py-3 px-2 text-right text-sm font-semibold text-black">Subtotal:</td>
                                    <td className="py-3 px-2 text-right text-sm font-bold text-black">${calculateSubtotal().toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="py-3 px-2 text-right text-sm font-semibold text-black">Shipping & Handling:</td>
                                    <td className="py-3 px-2 text-right text-sm font-bold text-black">
                                        ${(parseFloat(shippingCost) || 0).toFixed(2)}
                                    </td>
                                </tr>
                                <tr className="border-t-2 border-black bg-gray-100">
                                    <td colSpan={4} className="py-4 px-2 text-right text-lg font-bold text-black">TOTAL AMOUNT:</td>
                                    <td className="py-4 px-2 text-right text-xl font-bold text-black">
                                        ${calculateTotal().toFixed(2)} USD
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Terms & Conditions Footer */}
                        <div className="border-t border-gray-400 pt-4">
                            <p className="text-xs text-gray-700">
                                This invoice represents sample products for evaluation purposes. Payment terms and delivery conditions as specified above.
                            </p>
                        </div>
                        </div>
                    </div>

                    {/* Section 3: Action Buttons */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 sticky bottom-0 z-10">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <button
                                type="button"
                                onClick={generateInvoicePDF}
                                disabled={isGeneratingPDF || !itemsData.every(item => item.sampleCost) || !shippingCost}
                                className="w-full sm:w-auto px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                <Download size={18} /> {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                            </button>

                            <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg font-bold flex items-center justify-center gap-2"
                                >
                                    <Send size={18} /> Submit Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
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
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Update Price: {item.category}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client Target: ${item.targetPrice}</label>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Quoted Price ($)</label>
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
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={2} placeholder="Reason for price..." />
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