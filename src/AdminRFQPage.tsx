import React, { useState, useEffect, FC, useRef } from 'react';
import { MainLayout } from './MainLayout';
import { quoteService } from './quote.service';
import { QuoteRequest, NegotiationHistoryItem } from './types';
import { MapPin, Shirt, Package, Clock, ChevronRight, ChevronLeft, FileQuestion, MessageSquare, CheckCircle, XCircle, X, Download, RefreshCw, User, Building, Calendar, FileText, Eye, EyeOff, CheckSquare, ArrowUp, ArrowDown, ChevronDown, History } from 'lucide-react';
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
    const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const todayString = new Date().toISOString().split('T')[0];
    const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [responseForm, setResponseForm] = useState({ price: '', leadTime: '', notes: '' });
    const [lineItemPrices, setLineItemPrices] = useState<Record<number, string>>({});
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
    const quoteDetailsRef = useRef<HTMLDivElement>(null);
    const [fileLinks, setFileLinks] = useState<{ name: string; url: string }[]>([]);
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [declineMessage, setDeclineMessage] = useState('');
    const [hiddenQuoteIds, setHiddenQuoteIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('admin_hidden_quotes');
        return saved ? JSON.parse(saved) : [];
    });
    const [showHidden, setShowHidden] = useState(false);
    const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    const fetchQuotes = async () => {
        setIsLoading(true);
        const { data, error } = await quoteService.getAllQuotes();
        if (error) {
            showToast('Failed to fetch quotes: ' + error.message, 'error');
        } else if (data) {
            // Transform DB data to QuoteRequest type
            const transformedQuotes: QuoteRequest[] = data.map((q: any) => ({
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
                clientName: q.clients?.name || 'Unknown',
                companyName: q.clients?.company_name || 'Unknown'
            }));
            setQuotes(transformedQuotes);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    useEffect(() => {
        setSelectedQuoteIds([]);
    }, [filterStatus, showHidden, dateFilter]);

    useEffect(() => {
        const generateSignedUrls = async () => {
            if (selectedQuote?.files && selectedQuote.files.length > 0) {
                const urls = await Promise.all(selectedQuote.files.map(async (path) => {
                    const { data } = await props.supabase.storage
                        .from('quote-attachments')
                        .createSignedUrl(path, 3600); // URL valid for 1 hour
                    
                    const fileName = path.split('/').pop() || 'document';
                    // Remove timestamp prefix (e.g., "123456789_filename.pdf" -> "filename.pdf")
                    const cleanName = fileName.replace(/^\d+_/, '');

                    return {
                        name: cleanName,
                        url: data?.signedUrl || '#'
                    };
                }));
                setFileLinks(urls);
            } else {
                setFileLinks([]);
            }
        };
        generateSignedUrls();
    }, [selectedQuote, props.supabase]);

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
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Responded': return 'bg-blue-100 text-blue-800';
            case 'Accepted': return 'bg-green-100 text-green-800';
            case 'Declined': return 'bg-red-100 text-red-800';
            case 'In Negotiation': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getQuoteTimestamp = (quote: QuoteRequest) => {
        if (quote.status === 'Accepted' && quote.acceptedAt) return quote.acceptedAt;
        if (quote.status === 'In Negotiation' && quote.negotiation_details?.submittedAt) return quote.negotiation_details.submittedAt;
        if (quote.status === 'Responded' && quote.response_details?.respondedAt) return quote.response_details.respondedAt;
        if (quote.status === 'Declined') return quote.response_details?.respondedAt || quote.submittedAt;
        return quote.submittedAt;
    };

    const getPriority = (status: string) => {
        switch (status) {
            case 'Pending': return 1;
            case 'In Negotiation': return 2;
            case 'Responded': return 3;
            case 'Declined': return 4;
            default: return 5;
        }
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
        return matchesStatus && (showHidden ? isHidden : !isHidden) && checkDateFilter(quote);
    }).sort((a, b) => {
        const priorityA = getPriority(a.status);
        const priorityB = getPriority(b.status);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(getQuoteTimestamp(b)).getTime() - new Date(getQuoteTimestamp(a)).getTime();
    });
    const filterOptions = ['All', 'Pending', 'Responded', 'In Negotiation', 'Accepted', 'Declined'];

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

    const PriceDifference: FC<{ target: string, quoted: string }> = ({ target, quoted }) => {
        const targetPrice = parseFloat(target);
        const quotedPrice = parseFloat(quoted);
    
        if (isNaN(targetPrice) || isNaN(quotedPrice) || targetPrice === 0) {
            return null;
        }
    
        const difference = quotedPrice - targetPrice;
        const percentage = (difference / targetPrice) * 100;
    
        const isHigher = difference > 0;
        const color = isHigher ? 'text-red-500' : 'text-green-600';
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
        if (selectedQuote.negotiation_details) {
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
                    <button onClick={() => setSelectedQuote(null)} className="text-purple-600 font-semibold flex items-center hover:underline">
                        <ChevronLeft className="h-5 w-5 mr-1" /> Back to RFQ List
                    </button>
                    <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm" title="Download as PDF">
                        <Download size={16} /> Download PDF
                    </button>
                </div>
                <div ref={quoteDetailsRef} className="bg-white rounded-xl shadow-lg p-8">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-gray-100 gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-3xl font-bold text-gray-900">Quote #{selectedQuote.id.slice(0, 8)}</h2>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedQuote.status)}`}>{selectedQuote.status}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1"><User size={16}/> {selectedQuote.clientName || 'Unknown Client'}</div>
                                <div className="flex items-center gap-1"><Building size={16}/> {selectedQuote.companyName || 'Unknown Company'}</div>
                                <div className="flex items-center gap-1"><Calendar size={16}/> {new Date(selectedQuote.submittedAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Negotiation / Counter Offer Section - Displayed Above Details */}
                    <div className="mb-8 border rounded-xl p-6 bg-gray-50 border-gray-200">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-700 mb-4">
                            <MessageSquare size={20} /> Negotiation History
                        </h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4">
                            {displayHistory.map((item, idx) => (
                                <div key={idx} className={`flex ${item.sender === 'factory' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-4 ${item.sender === 'factory' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                                        <div className="flex justify-between items-center gap-4 mb-2">
                                            <span className={`text-xs font-bold uppercase ${item.sender === 'factory' ? 'text-purple-200' : 'text-gray-500'}`}>{item.sender === 'factory' ? 'You' : 'Client'}</span>
                                            <span className={`text-xs ${item.sender === 'factory' ? 'text-purple-200' : 'text-gray-400'}`}>{new Date(item.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        {item.price && (
                                            <div className={`mb-2 text-lg font-bold ${item.sender === 'factory' ? 'text-white' : 'text-gray-900'}`}>
                                                ${item.price} <span className="text-xs font-normal opacity-80">/ unit</span>
                                            </div>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                                        {item.action === 'accept' && <div className="mt-2 pt-2 border-t border-white/20 text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Accepted</div>}
                                        {item.action === 'decline' && <div className="mt-2 pt-2 border-t border-white/20 text-xs font-bold flex items-center gap-1"><X size={12}/> Declined</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Admin Actions */}
                        {selectedQuote.status !== 'Accepted' && selectedQuote.status !== 'Declined' && (
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button onClick={() => setIsDeclineModalOpen(true)} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition shadow-sm flex items-center gap-2">
                                    <XCircle size={18} /> Decline
                                </button>
                                <button onClick={() => setIsResponseModalOpen(true)} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition shadow-md flex items-center gap-2">
                                    <MessageSquare size={18} /> Respond / Counter
                                </button>
                                <button onClick={() => handleUpdateStatus(selectedQuote.id, 'Accepted')} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md flex items-center gap-2">
                                    <CheckCircle size={18} /> Accept
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        {/* Left Column: Order Details */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <Package size={20} className="mr-2 text-purple-600" /> Products & Specifications
                                </h3>
                                <div className="space-y-6">
                                    {selectedQuote.order?.lineItems?.map((item, idx) => (
                                        <div key={idx} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                                            {/* Item Header with Target Price Prominence */}
                                            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-md border border-purple-200">#{idx + 1}</span>
                                                    <h4 className="font-bold text-gray-800 text-lg">{item.category}</h4>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Quantity</p>
                                                        <p className="font-semibold text-gray-900">{item.qty} {item.quantityType === 'container' ? '' : 'units'}</p>
                                                    </div>
                                                    <div className="text-right pl-6 border-l border-gray-200">
                                                        {(() => {
                                                            const itemResponse = selectedQuote.response_details?.lineItemResponses?.find(r => r.lineItemId === item.id);
                                                            const isAccepted = selectedQuote.status === 'Accepted';
                                                            const showAgreedPrice = isAccepted;
                                                            const agreedPrice = (isAccepted && selectedQuote.response_details?.acceptedAt && itemResponse?.price)
                                                                ? itemResponse.price
                                                                : item.targetPrice;
                                                            return (
                                                                <>
                                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{showAgreedPrice ? 'Agreed Price' : 'Target Price'}</p>
                                                                    <p className={`text-xl font-bold ${showAgreedPrice ? 'text-green-600' : 'text-purple-600'}`}>${showAgreedPrice ? agreedPrice : item.targetPrice}</p>
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
                                                        <details className="group mt-4 border-t border-gray-100 pt-3">
                                                            <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-500 hover:text-purple-600 transition-colors list-none select-none">
                                                                <span className="flex items-center gap-1"><History size={12}/> Price History ({history.length})</span>
                                                                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                                                            </summary>
                                                            <div className="mt-3 space-y-2 pl-2 border-l-2 border-gray-100">
                                                                {history.map((h, i) => (
                                                                    <div key={i} className="flex justify-between items-center text-xs">
                                                                        <div>
                                                                            <span className={`font-medium ${h.sender === 'factory' ? 'text-purple-600' : 'text-blue-600'}`}>
                                                                                {h.sender === 'factory' ? 'You' : 'Client'}
                                                                            </span>
                                                                            <span className="text-gray-400 ml-2">{new Date(h.timestamp).toLocaleDateString()}</span>
                                                                        </div>
                                                                        <span className="font-bold text-gray-700">${h.price}</span>
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
                                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                        <p className="text-xs text-gray-500 mb-1">Fabric</p>
                                                        <p className="font-semibold text-gray-900 text-sm">{item.fabricQuality}</p>
                                                    </div>
                                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                        <p className="text-xs text-gray-500 mb-1">Weight</p>
                                                        <p className="font-semibold text-gray-900 text-sm">{item.weightGSM} GSM</p>
                                                    </div>
                                                    {item.styleOption && (
                                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                            <p className="text-xs text-gray-500 mb-1">Style</p>
                                                            <p className="font-semibold text-gray-900 text-sm">{item.styleOption}</p>
                                                        </div>
                                                    )}
                                                    {item.sleeveOption && (
                                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                            <p className="text-xs text-gray-500 mb-1">Sleeve</p>
                                                            <p className="font-semibold text-gray-900 text-sm">{item.sleeveOption}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Size Breakdown */}
                                                <div className="mb-6">
                                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">Size Breakdown</p>
                                                    {Object.keys(item.sizeRatio).length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(item.sizeRatio).map(([size, ratio]) => (
                                                                <div key={size} className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-md min-w-[3rem] py-1.5">
                                                                    <span className="text-xs font-bold text-gray-800">{size}</span>
                                                                    <span className="text-[10px] text-gray-500 font-medium">{ratio}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.sizeRange.map(size => (
                                                                <span key={size} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{size}</span>
                                                            ))}
                                                            {item.customSize && <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{item.customSize}</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Detailed Requirements */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Packaging & Labeling</p>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between"><span className="text-gray-500">Packaging:</span> <span className="font-medium text-gray-900 text-right">{item.packagingReqs}</span></div>
                                                            {item.labelingReqs && <div className="flex justify-between"><span className="text-gray-500">Labeling:</span> <span className="font-medium text-gray-900 text-right">{item.labelingReqs}</span></div>}
                                                        </div>
                                                    </div>
                                                    {(item.trimsAndAccessories || item.specialInstructions) && (
                                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Additional Details</p>
                                                            <div className="space-y-2 text-sm">
                                                                {item.trimsAndAccessories && <div><span className="text-gray-500 block mb-1">Trims:</span> <span className="font-medium text-gray-900">{item.trimsAndAccessories}</span></div>}
                                                                {item.specialInstructions && <div><span className="text-gray-500 block mb-1">Instructions:</span> <span className="font-medium text-gray-900 bg-yellow-50 px-2 py-1 rounded border border-yellow-100 inline-block w-full">{item.specialInstructions}</span></div>}
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
                        </div>

                        {/* Right Column: Logistics & Factory */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Building size={20} className="mr-2 text-purple-600"/> Target Factory</h3>
                                {selectedQuote.factory?.name ? (
                                    <div className="flex items-center gap-4">
                                        <img src={selectedQuote.factory.imageUrl} alt={selectedQuote.factory.name} className="w-16 h-16 rounded-lg object-cover border border-gray-100"/>
                                        <div>
                                            <p className="font-bold text-gray-900">{selectedQuote.factory.name}</p>
                                            <p className="text-sm text-gray-500 flex items-center mt-1"><MapPin size={12} className="mr-1"/> {selectedQuote.factory.location}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic bg-gray-50 p-4 rounded-lg text-center">General Inquiry (No specific factory selected)</div>
                                )}
                            </div>
                            
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MapPin size={20} className="mr-2 text-purple-600"/> Logistics</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-gray-100 pb-2">
                                        <span className="text-sm text-gray-500">Destination Country</span>
                                        <span className="text-sm font-semibold text-gray-900">{selectedQuote.order?.shippingCountry || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-2">
                                        <span className="text-sm text-gray-500">Destination Port</span>
                                        <span className="text-sm font-semibold text-gray-900">{selectedQuote.order?.shippingPort || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedQuote.files && selectedQuote.files.length > 0 && (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><FileText size={20} className="mr-2 text-purple-600"/> Attachments</h3>
                                    <div className="space-y-2">
                                        {fileLinks.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
                                                <div className="flex items-center gap-3 truncate">
                                                    <div className="bg-white p-1.5 rounded border border-gray-200">
                                                        <FileText size={16} className="text-purple-500"/>
                                                    </div>
                                                    <span className="truncate font-medium text-gray-700">{file.name}</span>
                                                </div>
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold text-xs bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors">
                                                    <Download size={14} /> Download
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isResponseModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                    <h2 className="text-2xl font-bold text-gray-800">Send Quote Response</h2>
                                    <button onClick={() => setIsResponseModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleSubmitResponse} className="space-y-4">
                                    
                                    {/* Line Item Pricing */}
                                    <div className="space-y-4 mb-6">
                                        <h3 className="text-lg font-semibold text-gray-700">Product Pricing</h3>
                                        {selectedQuote.order.lineItems.map((item, idx) => (
                                            <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-800">{item.category}</p>
                                                    <p className="text-xs text-gray-500">Qty: {item.qty} | Target: ${item.targetPrice}</p>
                                                </div>
                                                <div className="w-1/3">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Your Price ($)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={lineItemPrices[item.id] || ''} 
                                                        onChange={(e) => setLineItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                                                        placeholder="0.00" 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Summary Price (Optional)</label>
                                        <input type="text" value={responseForm.price} onChange={e => setResponseForm({...responseForm, price: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. Varies by item or Total $5000" />
                                        <p className="text-xs text-gray-500 mt-1">This will be displayed on the main card.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time</label>
                                        <input type="text" required value={responseForm.leadTime} onChange={e => setResponseForm({...responseForm, leadTime: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. 30-40 days" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Terms</label>
                                        <textarea required value={responseForm.notes} onChange={e => setResponseForm({...responseForm, notes: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" rows={4} placeholder="Additional details..." />
                                    </div>
                                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                                        <button type="button" onClick={() => setIsResponseModalOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition">Cancel</button>
                                        <button type="submit" disabled={isSubmittingResponse} className="px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition shadow-md disabled:opacity-50">
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
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                                <button onClick={() => setIsDeclineModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Decline Offer</h2>
                                <p className="text-gray-500 text-sm mb-6">Are you sure you want to decline this offer? This will mark the quote as declined. You can send a message to the client explaining why.</p>
                                
                                <textarea
                                    value={declineMessage}
                                    onChange={(e) => setDeclineMessage(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none mb-4"
                                    rows={4}
                                    placeholder="Reason for declining..."
                                />
                                
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setIsDeclineModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition">Cancel</button>
                                    <button onClick={handleDeclineSubmit} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-md">Decline Quote</button>
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
                        <h1 className="text-3xl font-bold text-gray-800">RFQ Management</h1>
                        <p className="text-gray-500 mt-1">Manage and respond to client quote requests.</p>
                    </div>
                    <button onClick={() => setShowHidden(!showHidden)} className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${showHidden ? 'text-purple-600 bg-purple-50' : 'text-gray-500'}`} title={showHidden ? "View Active Quotes" : "View Hidden Quotes"}>
                        {showHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                    <button onClick={toggleSelectionMode} className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${isSelectionMode ? 'text-purple-600 bg-purple-50' : 'text-gray-500'}`} title={isSelectionMode ? "Exit Selection Mode" : "Select Quotes"}>
                        <CheckSquare size={20} />
                    </button>
                    <button onClick={fetchQuotes} className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors ${isLoading ? 'animate-spin' : ''}`} title="Refresh Quotes"><RefreshCw size={20}/></button>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {filterOptions.map(status => (
                            <button key={status} onClick={() => setFilterStatus(status)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-md transition-colors ${filterStatus === status ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                                {status}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <Calendar size={16} className="text-gray-500" />
                        <select 
                            value={dateFilter} 
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="text-sm border-none bg-transparent font-medium text-gray-600 focus:ring-0 cursor-pointer outline-none"
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
                                    className="text-xs border border-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                />
                                <span className="text-gray-400">-</span>
                                <input 
                                    type="date" 
                                    value={customEndDate} 
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    max={todayString}
                                    className="text-xs border border-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {!isLoading && filteredQuotes.length > 0 && isSelectionMode && (
                <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={selectedQuoteIds.length === filteredQuotes.length && filteredQuotes.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">Select All ({filteredQuotes.length})</span>
                    </div>
                    {selectedQuoteIds.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 mr-2">{selectedQuoteIds.length} selected</span>
                            {showHidden ? (
                                <button onClick={handleBulkUnhide} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">
                                    <Eye size={14} /> Unhide Selected
                                </button>
                            ) : (
                                <button onClick={handleBulkHide} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">
                                    <EyeOff size={14} /> Hide Selected
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading quotes...</div>
            ) : filteredQuotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuotes.map((quote, index) => (
                        <div key={quote.id} className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col transition-transform hover:scale-[1.02]">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    {isSelectionMode && (
                                        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedQuoteIds.includes(quote.id)}
                                                onChange={() => toggleSelectQuote(quote.id)}
                                                className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                                            />
                                        </div>
                                    )}
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                        {(quote.clientName || 'U').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{quote.clientName || 'Unknown Client'}</p>
                                        <p className="text-xs text-gray-500">{quote.companyName || 'Unknown Company'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusColor(quote.status)}`}>{quote.status}</span>
                                    <button onClick={(e) => toggleHideQuote(quote.id, e)} className="text-gray-400 hover:text-gray-600 p-1" title={showHidden ? "Unhide Quote" : "Hide Quote"}>{showHidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                                </div>
                            </div>
                            <div className="p-4 flex-grow space-y-3">
                                <div className="flex items-center text-sm">
                                    <Shirt size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                    <span className="font-semibold text-gray-700">{quote.order?.lineItems?.length > 1 ? `${quote.order.lineItems.length} Items` : quote.order?.lineItems?.[0]?.category || 'N/A'}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Package size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600">
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
                                    </span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Clock size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600">{new Date(getQuoteTimestamp(quote)).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50/70 rounded-b-xl">
                                <button onClick={() => setSelectedQuote(quote)} className="w-full text-sm font-bold text-purple-600 hover:text-purple-800 flex items-center justify-center">
                                    View & Reply <ChevronRight size={16} className="ml-1" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100">
                    <FileQuestion className="mx-auto h-16 w-16 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-800">No Quotes Found</h3>
                </div>
            )}
        </MainLayout>
    );
};