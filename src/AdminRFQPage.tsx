import React, { useState, useEffect, FC, useRef, useCallback } from 'react';
import { MainLayout } from './MainLayout';
import { quoteService } from './quote.service';
import { crmService } from './crm.service';
import { QuoteRequest, NegotiationHistoryItem } from './types';
import { MapPin, Shirt, Package, Clock, ChevronRight, ChevronLeft, FileQuestion, MessageSquare, CheckCircle, XCircle, X, Download, RefreshCw, User, Building, Calendar, FileText, Eye, EyeOff, CheckSquare, ArrowUp, ArrowDown, ChevronDown, History, DollarSign, Search, Mail, Phone, Check, CheckCheck, Trash2, RotateCcw, Image as ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

export const AdminRFQPage: FC<AdminRFQPageProps> = (props) => {
    const CACHE_KEY = 'garment_erp_admin_quotes';
    const [quotes, setQuotes] = useState<QuoteRequest[]>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
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
        const saved = localStorage.getItem('admin_hidden_quotes');
        return saved ? JSON.parse(saved) : [];
    });
    const [showHidden, setShowHidden] = useState(false);
    const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [hoveredQuoteId, setHoveredQuoteId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileLinksAbortController = useRef<AbortController | null>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    
    // Pagination state
    const [currentPageIndex, setCurrentPageIndex] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    
    // Lightbox state
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

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
                    clientSpecialization: client?.category_specialization || 'N/A'
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
        setSelectedQuoteIds([]);
    }, [filterStatus, showHidden, dateFilter, selectedClientId, viewMode]);

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
        const { error } = await quoteService.update(quoteId, { status: newStatus });
        if (error) {
            showToast('Failed to update status', 'error');
        } else {
            showToast(`Quote marked as ${newStatus}`);
            setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
            if (selectedQuote && selectedQuote.id === quoteId) {
                setSelectedQuote(prev => prev ? { ...prev, status: newStatus } : null);
            }

            if (newStatus === 'Accepted') {
                const quoteToProcess = selectedQuote && selectedQuote.id === quoteId ? selectedQuote : quotes.find(q => q.id === quoteId);
                if (quoteToProcess) {
                    await createCrmOrderFromQuote(quoteToProcess);
                }
            }
        }
    };

    const getStatusGradientBorder = (status: string) => {
        switch (status) {
            case 'Pending': return 'from-amber-300 to-yellow-200';
            case 'Responded': return 'from-blue-400 to-cyan-300';
            case 'Accepted': return 'from-emerald-600 to-emerald-300';
            case 'Declined': return 'from-red-500 to-pink-400';
            case 'In Negotiation': return 'from-purple-500 to-indigo-300';
            default: return 'from-gray-400 to-gray-200';
        }
    };

    const getStatusHoverShadow = (status: string) => {
        switch (status) {
            case 'Pending': return 'hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]';
            case 'Responded': return 'hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]';
            case 'Accepted': return 'hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]';
            case 'Declined': return 'hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]';
            case 'In Negotiation': return 'hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]';
            default: return 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800';
            case 'Responded': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800';
            case 'Accepted': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
            case 'Declined': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800';
            case 'In Negotiation': return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800';
            case 'Admin Accepted': return 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-800';
            case 'Client Accepted': return 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800';
            case 'Trashed': return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
            default: return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700';
        }
    };

    const getQuoteTimestamp = (quote: QuoteRequest) => {
        if (quote.status === 'Accepted' && quote.acceptedAt) return quote.acceptedAt;
        if (quote.status === 'In Negotiation' && quote.negotiation_details?.submittedAt) return quote.negotiation_details.submittedAt;
        if (quote.status === 'Responded' && quote.response_details?.respondedAt) return quote.response_details.respondedAt;
        if (quote.status === 'Declined') return quote.response_details?.respondedAt || quote.submittedAt;
        return quote.submittedAt;
    };

    const getDisplayDateInfo = (quote: QuoteRequest) => {
        const date = getQuoteTimestamp(quote);
        let label = 'Submitted';
        if (quote.status === 'Accepted') label = 'Accepted';
        else if (quote.status === 'In Negotiation') label = 'Updated';
        else if (quote.status === 'Responded') label = 'Responded';
        else if (quote.status === 'Declined') label = 'Declined';
        else if (quote.status === 'Admin Accepted') label = 'Approved by You';
        else if (quote.status === 'Client Accepted') label = 'Approved by Client';
        else if (quote.status === 'Trashed') label = 'Deleted';
        return { label, date };
    };

    const getPriority = (status: string) => {
        switch (status) {
            case 'Pending': return 1;
            case 'In Negotiation': return 2;
            case 'Responded': return 3;
            case 'Declined': return 4;
            case 'Client Accepted': return 0; // High priority
            case 'Admin Accepted': return 3;
            case 'Trashed': return 6;
            default: return 5;
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

        const newStatus: QuoteRequest['status'] = selectedQuote.status === 'In Negotiation' ? 'In Negotiation' : 'Responded';

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
            localStorage.setItem('admin_hidden_quotes', JSON.stringify(newHidden));
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

    const handleBulkHide = () => {
        const newHiddenIds = [...new Set([...hiddenQuoteIds, ...selectedQuoteIds])];
        setHiddenQuoteIds(newHiddenIds);
        localStorage.setItem('admin_hidden_quotes', JSON.stringify(newHiddenIds));
        setSelectedQuoteIds([]);
        showToast(`${selectedQuoteIds.length} quotes hidden.`);
    };

    const handleBulkUnhide = () => {
        const newHiddenIds = hiddenQuoteIds.filter(id => !selectedQuoteIds.includes(id));
        setHiddenQuoteIds(newHiddenIds);
        localStorage.setItem('admin_hidden_quotes', JSON.stringify(newHiddenIds));
        setSelectedQuoteIds([]);
        showToast(`${selectedQuoteIds.length} quotes unhidden.`);
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
            showToast('Failed to delete quote: ' + error.message, 'error');
        } else if (count === 0) {
            showToast('Delete failed. Please check RLS policies on Supabase.', 'error');
        } else {
            showToast('Quote permanently deleted.');
            setQuotes(prev => prev.filter(q => q.id !== quoteId));
        }
    };

    const handleBulkRestore = async () => {
        if (!confirm(`Are you sure you want to restore ${selectedQuoteIds.length} quotes?`)) return;

        const updates = selectedQuoteIds.map(id => {
            const quote = quotes.find(q => q.id === id);
            if (!quote) return Promise.resolve();

            let newStatus = (quote.negotiation_details as any)?.previousStatus;
            if (!newStatus) {
                newStatus = 'Pending';
                if ((quote.negotiation_details?.history?.length ?? 0) > 0) newStatus = 'In Negotiation';
                else if (quote.response_details) newStatus = 'Responded';
            }
            
            const updatedNegotiationDetails = { ...quote.negotiation_details };
            delete (updatedNegotiationDetails as any).previousStatus;
            const finalNegotiationDetails = Object.keys(updatedNegotiationDetails).length > 0 ? updatedNegotiationDetails : undefined;

            return quoteService.update(id, { status: newStatus, negotiation_details: finalNegotiationDetails });
        });

        await Promise.all(updates);
        showToast(`${selectedQuoteIds.length} quotes restored.`);
        fetchQuotes();
        setSelectedQuoteIds([]);
    };

    const handleBulkPermanentDelete = async () => {
        if (!confirm(`Are you sure you want to permanently delete ${selectedQuoteIds.length} quotes? This cannot be undone.`)) return;

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

    const handleDownloadPdf = () => {
        const input = quoteDetailsRef.current;
        if (!input || !selectedQuote) {
            showToast('Could not find content to download.', 'error');
            return;
        }

        showToast('Generating PDF...', 'success');

        html2canvas(input, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`RFQ-${selectedQuote.id.slice(0, 8)}.pdf`);
        }).catch(err => {
            showToast('Failed to generate PDF.', 'error');
            console.error("PDF generation error:", err);
        });
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
            .filter(h => h.lineItemPrices?.some(p => p.lineItemId === lineItemId))
            .map(h => ({
                ...h,
                price: h.lineItemPrices?.find(p => p.lineItemId === lineItemId)?.price
            }))
            .reverse();
    };

    if (selectedQuote) {
        return (
            <MainLayout {...props}>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setSelectedQuote(null)} className="text-[#c20c0b] font-semibold flex items-center hover:underline">
                        <ChevronLeft className="h-5 w-5 mr-1" /> Back to RFQ List
                    </button>
                    <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm" title="Download as PDF">
                        <Download size={16} /> Download PDF
                    </button>
                </div>
                <div ref={quoteDetailsRef} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg p-8 border border-gray-200 dark:border-white/10">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-gray-100 dark:border-white/10 gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Quote #{selectedQuote.id.slice(0, 8)}</h2>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedQuote.status)} flex items-center gap-1`}>
                                    {selectedQuote.status === 'Accepted' && <CheckCheck size={14} />}
                                    {(selectedQuote.status === 'Admin Accepted' || selectedQuote.status === 'Client Accepted') && <Check size={14} />}
                                    {selectedQuote.status === 'Admin Accepted' ? 'Admin Approved' : selectedQuote.status === 'Client Accepted' ? 'Client Approved' : selectedQuote.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1"><Calendar size={16}/> {new Date(selectedQuote.submittedAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* User Details Card */}
                    <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-200 text-2xl font-bold shadow-sm border-2 border-white dark:border-blue-700">
                                {(selectedQuote as any).clientName?.charAt(0) || 'U'}
                            </div>
                        </div>
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full">
                            <div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-1">Client Name</p>
                                <p className="font-semibold text-gray-900 dark:text-white text-lg">{(selectedQuote as any).clientName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1"><Building size={12}/> {(selectedQuote as any).companyName}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">{(selectedQuote as any).clientJobRole}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-1">Contact Info</p>
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 font-medium">
                                    <Mail size={14} className="text-gray-400" /> {(selectedQuote as any).clientEmail}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 mt-1">
                                    <Phone size={14} className="text-gray-400" /> {(selectedQuote as any).clientPhone}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-1">Location</p>
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 font-medium">
                                    <MapPin size={14} className="text-gray-400" /> {(selectedQuote as any).clientCountry}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-1">Business Profile</p>
                                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">Rev: {(selectedQuote as any).clientRevenue}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Spec: {(selectedQuote as any).clientSpecialization}</p>
                            </div>
                        </div>
                    </div>

                    {/* Negotiation / Counter Offer Section - Displayed Above Details */}
                    <div className="mb-8 border rounded-xl p-6 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-white/10">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-700 dark:text-white mb-6">
                            <History size={20} /> Negotiation Timeline
                        </h3>
                        
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
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(selectedQuote.submittedAt).toLocaleDateString()}</span>
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
                                                    {new Date(item.timestamp).toLocaleDateString()}
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
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                                <button onClick={() => setIsDeclineModalOpen(true)} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition shadow-sm flex items-center gap-2">
                                    <XCircle size={18} /> Decline
                                </button>
                                <button onClick={() => setIsResponseModalOpen(true)} className="px-4 py-2 bg-[#c20c0b] text-white font-semibold rounded-lg hover:bg-[#a50a09] transition shadow-md flex items-center gap-2">
                                    <MessageSquare size={18} /> Respond / Counter
                                </button>
                                <button onClick={() => handleUpdateStatus(selectedQuote.id, selectedQuote.status === 'Client Accepted' ? 'Accepted' : 'Admin Accepted')} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md flex items-center gap-2">
                                    {selectedQuote.status === 'Client Accepted' ? <CheckCheck size={18} /> : <Check size={18} />}
                                    {selectedQuote.status === 'Client Accepted' ? 'Finalize Acceptance' : 'Approve Quote'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        {/* Left Column: Order Details */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                    <Package size={20} className="mr-2 text-[#c20c0b]" /> Products & Specifications
                                </h3>
                                <div className="space-y-6">
                                    {selectedQuote.order?.lineItems?.map((item, idx) => (
                                        <div key={idx} className="bg-white/60 dark:bg-gray-800/40 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-200">
                                            {/* Item Header with Target Price Prominence */}
                                            <div className="bg-gray-50/50 dark:bg-gray-700/30 px-6 py-4 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-red-100 text-[#c20c0b] text-xs font-bold px-2.5 py-1 rounded-md border border-red-200">#{idx + 1}</span>
                                                    <h4 className="font-bold text-gray-800 dark:text-white text-lg">{item.category}</h4>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-gray-500 dark:text-white uppercase font-bold tracking-wider">Quantity</p>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{item.qty} {item.quantityType === 'container' ? '' : 'units'}</p>
                                                    </div>
                                                    <div className="text-right pl-6 border-l border-gray-200 dark:border-gray-600">
                                                        {(() => {
                                                            const itemResponse = selectedQuote.response_details?.lineItemResponses?.find(r => r.lineItemId === item.id);
                                                            const isAccepted = selectedQuote.status === 'Accepted';
                                                            const showAgreedPrice = isAccepted;
                                                            const agreedPrice = (isAccepted && selectedQuote.response_details?.acceptedAt && itemResponse?.price)
                                                                ? itemResponse.price
                                                                : item.targetPrice;
                                                            return (
                                                                <>
                                                                    <p className="text-[10px] text-gray-500 dark:text-white uppercase font-bold tracking-wider">{showAgreedPrice ? 'Agreed Price' : 'Target Price'}</p>
                                                                    <p className={`text-xl font-bold ${showAgreedPrice ? 'text-green-600 dark:text-green-400' : 'text-[#c20c0b] dark:text-red-400'}`}>${showAgreedPrice ? agreedPrice : item.targetPrice}</p>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Price History Log */}
                                                {(() => {
                                                    const history = getLineItemHistory(item.id);
                                                    if (history.length === 0) return null;
                                                    return (
                                                        <details className="group mt-4 border-t border-gray-100 dark:border-white/10 pt-3">
                                                            <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-500 dark:text-white hover:text-[#c20c0b] transition-colors list-none select-none">
                                                                <span className="flex items-center gap-1"><History size={12}/> Price History ({history.length})</span>
                                                                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                                                            </summary>
                                                            <div className="mt-3 space-y-2 pl-2 border-l-2 border-gray-100 dark:border-gray-700">
                                                                {history.map((h, i) => (
                                                                    <div key={i} className="flex justify-between items-center text-xs">
                                                                        <div>
                                                                            <span className={`font-medium ${h.sender === 'factory' ? 'text-[#c20c0b]' : 'text-blue-600'}`}>
                                                                                {h.sender === 'factory' ? 'You' : 'Client'}
                                                                            </span>
                                                                            <span className="text-gray-400 dark:text-white ml-2">{new Date(h.timestamp).toLocaleDateString()}</span>
                                                                        </div>
                                                                        <span className="font-bold text-gray-700 dark:text-gray-300">${h.price}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    );
                                                })()}
                                            </div>

                                            <div className="p-6">
                                                {/* Core Specs Grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-white/10">
                                                        <p className="text-xs text-gray-500 dark:text-white mb-1">Fabric</p>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.fabricQuality}</p>
                                                    </div>
                                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-white/10">
                                                        <p className="text-xs text-gray-500 dark:text-white mb-1">Weight</p>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.weightGSM} GSM</p>
                                                    </div>
                                                    {item.styleOption && (
                                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-white/10">
                                                            <p className="text-xs text-gray-500 dark:text-white mb-1">Style</p>
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.styleOption}</p>
                                                        </div>
                                                    )}
                                                    {item.sleeveOption && (
                                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-white/10">
                                                            <p className="text-xs text-gray-500 dark:text-white mb-1">Sleeve</p>
                                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.sleeveOption}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Size Breakdown */}
                                                <div className="mb-6">
                                                    <p className="text-xs text-gray-500 dark:text-white uppercase font-bold tracking-wider mb-3">Size Breakdown</p>
                                                    {Object.keys(item.sizeRatio).length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(item.sizeRatio).map(([size, ratio]) => (
                                                                <div key={size} className="flex flex-col items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md min-w-[3rem] py-1.5">
                                                                    <span className="text-xs font-bold text-gray-800 dark:text-white">{size}</span>
                                                                    <span className="text-[10px] text-gray-500 dark:text-white font-medium">{ratio}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.sizeRange.map(size => (
                                                                <span key={size} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white text-xs font-medium rounded-full">{size}</span>
                                                            ))}
                                                            {item.customSize && <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white text-xs font-medium rounded-full">{item.customSize}</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Detailed Requirements */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-white/10">
                                                        <p className="text-xs text-gray-500 dark:text-white uppercase font-bold tracking-wider mb-2">Packaging & Labeling</p>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between"><span className="text-gray-500 dark:text-white">Packaging:</span> <span className="font-medium text-gray-900 dark:text-white text-right">{item.packagingReqs}</span></div>
                                                            {item.labelingReqs && <div className="flex justify-between"><span className="text-gray-500 dark:text-white">Labeling:</span> <span className="font-medium text-gray-900 dark:text-white text-right">{item.labelingReqs}</span></div>}
                                                        </div>
                                                    </div>
                                                    {(item.trimsAndAccessories || item.specialInstructions) && (
                                                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-white/10">
                                                            <p className="text-xs text-gray-500 dark:text-white uppercase font-bold tracking-wider mb-2">Additional Details</p>
                                                            <div className="space-y-2 text-sm">
                                                                {item.trimsAndAccessories && <div><span className="text-gray-500 dark:text-white block mb-1">Trims:</span> <span className="font-medium text-gray-900 dark:text-white">{item.trimsAndAccessories}</span></div>}
                                                                {item.specialInstructions && <div><span className="text-gray-500 dark:text-white block mb-1">Instructions:</span> <span className="font-medium text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded border border-yellow-100 dark:border-yellow-800 inline-block w-full">{item.specialInstructions}</span></div>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Display Response if available */}
                                            {selectedQuote.response_details?.lineItemResponses?.find(r => r.lineItemId === item.id) && (
                                                <div className="bg-green-50/50 px-6 py-4 border-t border-green-100 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-green-100 text-green-700 rounded-full"><CheckCircle size={18}/></div>
                                                        <div>
                                                            <p className="text-sm font-bold text-green-900">Quoted Price</p>
                                                            {selectedQuote.response_details.respondedAt && (
                                                                <p className="text-[10px] text-green-600">
                                                                    {new Date(selectedQuote.response_details.respondedAt).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-2xl font-bold text-green-700">${selectedQuote.response_details.lineItemResponses.find(r => r.lineItemId === item.id)?.price}</span>
                                                        <PriceDifference target={item.targetPrice} quoted={selectedQuote.response_details.lineItemResponses.find(r => r.lineItemId === item.id)?.price || '0'} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Attachments Section */}
                            <div className="bg-white/60 dark:bg-gray-800/40 p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                    <FileText size={20} className="mr-2 text-[#c20c0b]" /> Attachments
                                </h3>
                                {isLoadingFiles ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                        <p className="text-sm">Loading attachments...</p>
                                    </div>
                                ) : fileLinks.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {fileLinks.map((file, i) => {
                                            const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                            return (
                                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-white/10 transition-all group cursor-pointer" onClick={() => isImage ? openLightbox(file.url) : window.open(file.url, '_blank')}>
                                                <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[#c20c0b] shadow-sm overflow-hidden">
                                                    {isImage ? (
                                                        <img src={file.url} alt={file.name} className="w-6 h-6 object-cover" />
                                                    ) : (
                                                        <FileText size={20} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-[#c20c0b] transition-colors flex items-center gap-1">
                                                        {isImage ? <><Eye size={12}/> Preview</> : 'Click to download'}
                                                    </p>
                                                </div>
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#c20c0b] transition-colors" title="Download" onClick={(e) => e.stopPropagation()}>
                                                    <Download size={18} />
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
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                                        No attachments found for this quote.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Logistics & Factory */}
                        <div className="space-y-6">
                            <div className="bg-white/60 dark:bg-gray-800/40 p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Building size={20} className="mr-2 text-[#c20c0b]"/> Target Factory</h3>
                                {selectedQuote.factory?.name ? (
                                    <div className="flex items-center gap-4">
                                        <img src={selectedQuote.factory.imageUrl} alt={selectedQuote.factory.name} className="w-16 h-16 rounded-lg object-cover border border-gray-100 dark:border-gray-600"/>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{selectedQuote.factory.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-white flex items-center mt-1"><MapPin size={12} className="mr-1"/> {selectedQuote.factory.location}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 dark:text-white italic bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg text-center">General Inquiry (No specific factory selected)</div>
                                )}
                            </div>
                            
                            <div className="bg-white/60 dark:bg-gray-800/40 p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><MapPin size={20} className="mr-2 text-[#c20c0b]"/> Logistics</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-gray-100 dark:border-white/10 pb-2">
                                        <span className="text-sm text-gray-500 dark:text-white">Destination Country</span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedQuote.order?.shippingCountry || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-white/10 pb-2">
                                        <span className="text-sm text-gray-500 dark:text-white">Destination Port</span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedQuote.order?.shippingPort || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isResponseModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                                                    <p className="text-xs text-gray-500 dark:text-white">Qty: {item.qty} | Target: ${item.targetPrice}</p>
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
                        </div>
                    )}

                    {/* Decline Modal */}
                    {isDeclineModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
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
                        </div>
                    )}

                    {/* Lightbox Modal */}
                    {isLightboxOpen && (
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
                        </div>
                    )}
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
                                    <button onClick={handleBulkRestore} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <RotateCcw size={14} /> Restore Selected
                                    </button>
                                    <button onClick={handleBulkPermanentDelete} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <Trash2 size={14} /> Delete Selected
                                    </button>
                                </>
                            ) : (
                                showHidden ? (
                                    <button onClick={handleBulkUnhide} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <Eye size={14} /> Unhide Selected
                                    </button>
                                ) : (
                                    <button onClick={handleBulkHide} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
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
                                 <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getStatusColor(quote.status)} flex items-center gap-1`}>
                                     {quote.status === 'Accepted' && <CheckCheck size={12} />}
                                     {(quote.status === 'Admin Accepted' || quote.status === 'Client Accepted') && <Check size={12} />}
                                     {quote.status === 'Admin Accepted' ? 'Admin Approved' : quote.status === 'Client Accepted' ? 'Client Approved' : quote.status}
                                </span>
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
                                    {getDisplayDateInfo(quote).label} {new Date(getDisplayDateInfo(quote).date).toLocaleDateString()}
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
                                                return `${item.qty} ${item.quantityType === 'container' ? '' : 'units'}`;
                                            }
                                            const allUnits = items.every(i => !i.quantityType || i.quantityType === 'units');
                                            if (allUnits) {
                                                const total = items.reduce((acc, i) => acc + (parseInt(i.qty) || 0), 0);
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