import React, { useState, FC, useRef, useEffect, ReactNode, useCallback } from 'react';
import { MainLayout } from './MainLayout';
import { QuoteRequest, NegotiationHistoryItem } from './types';
import { quoteService } from './quote.service';
import {
    ChevronLeft, MapPin, Calendar, Package, Shirt, DollarSign, Clock, ArrowRight,
    FileText, MessageSquare, CheckCircle, AlertCircle, X, Globe, Download, ChevronDown, History, Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QuoteDetailPageProps {
    selectedQuote: QuoteRequest | null;
    handleSetCurrentPage: (page: string, data?: any) => void;
    updateQuoteStatus: (id: string, status: string, additionalData?: any) => void;
    createCrmOrder: (quote: QuoteRequest) => void;
    layoutProps: any;
}

export const QuoteDetailPage: FC<QuoteDetailPageProps> = ({ 
    selectedQuote, 
    handleSetCurrentPage, 
    updateQuoteStatus, 
    createCrmOrder, 
    layoutProps 
}) => {
    const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
    const quoteDetailsRef = useRef<HTMLDivElement>(null);
    const pdfContentRef = useRef<HTMLDivElement>(null);
    const [fileLinks, setFileLinks] = useState<{ name: string; url: string }[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const fileLinksAbortController = useRef<AbortController | null>(null);

    const fetchSignedUrls = useCallback(async () => {
        if (!selectedQuote?.files || selectedQuote.files.length === 0) {
            setFileLinks([]);
            return;
        }

        const CACHE_KEY = `garment_erp_quote_files_${selectedQuote.id}`;
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp, links } = JSON.parse(cached);
            // Cache valid for 50 minutes (URLs expire in 60)
            if (Date.now() - timestamp < 50 * 60 * 1000) {
                setFileLinks(links);
                return;
            }
        }

        if (fileLinksAbortController.current) fileLinksAbortController.current.abort();
        fileLinksAbortController.current = new AbortController();
        const signal = fileLinksAbortController.current.signal;

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000));
                
                const urlsPromise = Promise.all(selectedQuote.files.map(async (path) => {
                    const { data, error } = await layoutProps.supabase.storage
                        .from('quote-attachments')
                        .createSignedUrl(path, 3600); // URL valid for 1 hour
                    
                    if (error) throw error;

                    const fileName = path.split('/').pop() || 'document';
                    const cleanName = fileName.replace(/^\d+_/, '');

                    return {
                        name: cleanName,
                        url: data?.signedUrl || '#'
                    };
                }));

                const urls = await Promise.race([urlsPromise, timeoutPromise]) as { name: string; url: string }[];

                if (!signal.aborted) {
                    setFileLinks(urls);
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                        timestamp: Date.now(),
                        links: urls
                    }));
                }
                return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                attempts++;
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, [selectedQuote, layoutProps.supabase]);

    useEffect(() => {
        fetchSignedUrls();
        return () => {
            if (fileLinksAbortController.current) fileLinksAbortController.current.abort();
        };
    }, [fetchSignedUrls]);

    if (!selectedQuote) {
        handleSetCurrentPage('myQuotes');
        return null;
    }

    const { factory, order, status, submittedAt, id, response_details } = selectedQuote;

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

    const handleAcceptQuote = async () => {
        const acceptedAt = new Date().toISOString();
        const updatedResponseDetails = {
            ...(response_details || {}),
            acceptedAt: acceptedAt
        };
        const { error } = await quoteService.update(id, { status: 'Accepted', response_details: updatedResponseDetails });

        if (error) {
            showToast('Failed to update quote status: ' + error.message, 'error');
            return;
        }

        updateQuoteStatus(id, 'Accepted', { acceptedAt, response_details: updatedResponseDetails });
        createCrmOrder(selectedQuote);
        showToast('Quote Accepted! A new order has been created in the CRM portal.');
        handleSetCurrentPage('crm');
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
        const updatedLineItems = selectedQuote.order.lineItems.map(item => {
            const negotiation = lineItemNegotiations.find(neg => neg.lineItemId === item.id);
            if (negotiation && negotiation.counterPrice) {
                return { ...item, targetPrice: negotiation.counterPrice };
            }
            return item;
        });

        const updatedOrderDetails = {
            ...selectedQuote.order,
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

        const updatedHistory = [...(selectedQuote.negotiation_details?.history || []), newHistoryItem];

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

    const PriceDifference: FC<{ target: string, quoted: string }> = ({ target, quoted }) => {
        const targetNum = parseFloat(target);
        if (!target || isNaN(targetNum) || targetNum === 0) return null;

        return (
            <div className="text-xs font-medium text-gray-500 mt-1">
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
            default: return 'from-gray-400 to-gray-300';
        }
    };

    const getLineItemHistory = (lineItemId: number) => {
        if (!selectedQuote?.negotiation_details?.history) return [];
        return selectedQuote.negotiation_details.history
            .filter(h => h.lineItemPrices?.some(p => p.lineItemId === lineItemId))
            .map(h => ({
                ...h,
                price: h.lineItemPrices?.find(p => p.lineItemId === lineItemId)?.price
            }));
    };

    const negotiationHistory = React.useMemo(() => {
        if (selectedQuote.negotiation_details?.history && selectedQuote.negotiation_details.history.length > 0) {
            return selectedQuote.negotiation_details.history;
        }
        
        const history: any[] = [];
        // If we have response details but no history array, treat it as the first history item
        if (selectedQuote.response_details && (selectedQuote.status === 'Responded' || selectedQuote.status === 'Accepted' || selectedQuote.status === 'Declined' || selectedQuote.status === 'In Negotiation')) {
             history.push({
                id: 'initial-response',
                sender: 'factory',
                message: selectedQuote.response_details.notes,
                price: selectedQuote.response_details.price,
                timestamp: selectedQuote.response_details.respondedAt || selectedQuote.submittedAt,
                action: 'offer'
            });
        }
        return history;
    }, [selectedQuote]);

    return (
        <MainLayout {...layoutProps}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation & Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <button onClick={() => handleSetCurrentPage('myQuotes')} className="group flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <div className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 mr-3 shadow-sm transition-all">
                            <ChevronLeft size={18} />
                        </div>
                        <span className="font-medium">Back to Quotes</span>
                    </button>
                    <div className="flex gap-3">
                        <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                            <Printer size={18} />
                            <span className="hidden sm:inline">Download PDF</span>
                        </button>
                        {(status === 'Responded' || status === 'In Negotiation') && (
                            <>
                                <button onClick={() => setIsNegotiationModalOpen(true)} className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                                    Negotiate
                                </button>
                                <button onClick={handleAcceptQuote} className="px-5 py-2 bg-[#c20c0b] text-white font-medium rounded-lg hover:bg-[#a50a09] transition-all shadow-md flex items-center gap-2">
                                    <CheckCircle size={18} /> Accept Quote
                                </button>
                            </>
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
                                    <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center">
                                        <Calendar size={14} className="mr-1.5"/> Submitted on {new Date(submittedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full border ${getStatusColor(status)}`}>
                                    {status}
                                </span>
                            </div>
                            
                            {/* Factory Response Summary (if available) */}
                            {(status === 'Responded' || status === 'In Negotiation' || status === 'Accepted') && response_details && (
                                <div className="mt-6 p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <MessageSquare size={18} className="text-[#c20c0b]" />
                                            Factory Offer
                                        </h3>
                                        {response_details.respondedAt && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Received {new Date(response_details.respondedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-1">Total Price</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${response_details.price}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-1">Lead Time</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{response_details.leadTime}</p>
                                        </div>
                                    </div>
                                    {response_details.notes && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{response_details.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Product Details (Tabs) */}
                        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                            <div className="border-b border-gray-200 dark:border-white/10 px-6 pt-4 bg-gray-50/30 dark:bg-gray-700/30">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Product Specifications</h3>
                                <div className="flex gap-6 overflow-x-auto scrollbar-hide -mb-px">
                                    {order.lineItems.map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActiveTab(index)}
                                            className={`pb-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                                                activeTab === index
                                                    ? 'border-[#c20c0b] text-[#c20c0b]'
                                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                        >
                                            {item.category}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-6">
                                {order.lineItems.map((item, index) => {
                                    if (index !== activeTab) return null;
                                    const itemResponse = response_details?.lineItemResponses?.find(r => r.lineItemId === item.id);
                                    const history = getLineItemHistory(item.id);

                                    const isAccepted = status === 'Accepted';
                                    const showAgreedPrice = isAccepted;
                                    const agreedPrice = (isAccepted && response_details?.acceptedAt && itemResponse?.price) 
                                        ? itemResponse.price 
                                        : item.targetPrice;

                                    return (
                                        <div key={index} className="animate-fade-in">
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
                                                        <p className={`font-bold text-sm ${showAgreedPrice ? 'text-green-600' : 'text-[#c20c0b]'}`}>${showAgreedPrice ? agreedPrice : item.targetPrice}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Size Breakdown */}
                                            <div className="mb-6">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-3">Size Breakdown</p>
                                                {Object.keys(item.sizeRatio).length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(item.sizeRatio).map(([size, ratio]) => (
                                                            <div key={size} className="flex flex-col items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-white/10 rounded-md min-w-[3rem] py-1.5">
                                                                <span className="text-xs font-bold text-gray-800 dark:text-white">{size}</span>
                                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{ratio}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.sizeRange.map(size => (
                                                            <span key={size} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">{size}</span>
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
                                                        <div className="flex justify-between items-start"><span className="text-gray-500 dark:text-gray-400">Packaging:</span> <span className="font-medium text-gray-900 dark:text-white text-right ml-4">{item.packagingReqs}</span></div>
                                                        {item.labelingReqs && <div className="flex justify-between items-start"><span className="text-gray-500 dark:text-gray-400">Labeling:</span> <span className="font-medium text-gray-900 dark:text-white text-right ml-4">{item.labelingReqs}</span></div>}
                                                    </div>
                                                </div>
                                                {(item.trimsAndAccessories || item.specialInstructions) && (
                                                    <div className="rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                                        <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-5 py-3">
                                                            <p className="text-xs text-white uppercase font-bold tracking-wider">Additional Details</p>
                                                        </div>
                                                        <div className="p-5 bg-white dark:bg-gray-800 space-y-3 text-sm">
                                                            {item.trimsAndAccessories && <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Trims:</span> <span className="font-medium text-gray-900 dark:text-white">{item.trimsAndAccessories}</span></div>}
                                                            {item.specialInstructions && <div><span className="text-gray-500 dark:text-gray-400 block mb-1">Instructions:</span> <span className="font-medium text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded border border-yellow-100 dark:border-yellow-800 inline-block w-full">{item.specialInstructions}</span></div>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Price History Log */}
                                            {history.length > 0 && (
                                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-inner">
                                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                                        <History size={16}/> Price Negotiation History
                                                    </h4>
                                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                        {history.map((h, i) => (
                                                            <div key={i} className={`flex ${h.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${h.sender === 'client' ? 'bg-[#c20c0b] text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                                                    <div className="flex justify-between items-center gap-4 mb-1">
                                                                        <span className={`text-[10px] font-bold uppercase ${h.sender === 'client' ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                                            {h.sender === 'client' ? 'You' : 'Factory'}
                                                                        </span>
                                                                        <span className={`text-[10px] ${h.sender === 'client' ? 'text-red-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                            {new Date(h.timestamp).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="font-bold text-lg mb-1">
                                                                        ${h.price}
                                                                    </div>
                                                                    {h.message && <p className="text-xs opacity-90 whitespace-pre-wrap">{h.message}</p>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
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
                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                                <MapPin size={14} className="mr-1" /> {factory.location}
                                            </p>
                                            <button className="text-xs font-bold text-[#c20c0b] mt-3 hover:text-[#a50a09] underline underline-offset-2">View Profile</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">Open Request (No specific factory)</p>
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
                                    <span className="text-gray-500 dark:text-gray-400">Destination</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{order.shippingCountry}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Port</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{order.shippingPort}</span>
                                </div>
                            </div>
                        </div>

                        {/* Documents Card */}
                        {fileLinks.length > 0 && (
                            <div className="rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                <div className="bg-gradient-to-r from-[#c20c0b] to-pink-600 px-6 py-4">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Documents</h3>
                                </div>
                                <ul className="p-6 bg-white dark:bg-gray-800 space-y-3">
                                    {fileLinks.map((file, i) => (
                                        <li key={i}>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-white/10 transition-all group">
                                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-[#c20c0b] shadow-sm overflow-hidden">
                                                    {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                        <img src={file.url} alt={file.name} className="w-5 h-5 object-cover" />
                                                    ) : (
                                                        <FileText size={18} />
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">{file.name}</span>
                                                <Download size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-[#c20c0b]" />
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
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
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{new Date(submittedAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Initial request sent to {factory?.name || 'factories'}.</p>
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
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                                                {item.action}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{new Date(item.timestamp).toLocaleString()}</span>
                                    </div>
                                    
                                    {item.price && (
                                        <div className="mb-3 flex items-baseline gap-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Price:</span>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">${item.price}</span>
                                        </div>
                                    )}
                                    
                                    {item.message && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {item.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* 3. Current Status */}
                        <div className="relative pl-10">
                            <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ring-4 z-10 ${
                                status === 'Accepted' ? 'bg-emerald-500 ring-emerald-50 dark:ring-emerald-900/30' : 
                                status === 'Declined' ? 'bg-red-500 ring-red-50 dark:ring-red-900/30' : 'bg-amber-500 ring-amber-50 dark:ring-amber-900/30'
                            }`}></div>
                            <div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(status)}`}>
                                    Current Status: {status}
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
                                <p className="font-bold text-gray-900 text-lg">{(selectedQuote as any).companyName || 'Client Company'}</p>
                                <p className="text-gray-600">{(selectedQuote as any).clientName || 'Client Name'}</p>
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
                    {(status === 'Responded' || status === 'Accepted') && response_details && (
                        <div className="mt-10 bg-gray-50 p-6 rounded-xl border border-gray-200 break-inside-avoid">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Total Quoted Price</h3>
                                <p className="text-4xl font-bold text-green-700">${response_details.price}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-200 pt-4">
                                <div><span className="text-gray-500 font-medium">Lead Time:</span> <span className="font-bold">{response_details.leadTime}</span></div>
                                {response_details.respondedAt && <div><span className="text-gray-500 font-medium">Date:</span> <span>{new Date(response_details.respondedAt).toLocaleDateString()}</span></div>}
                            </div>
                            {response_details.notes && (
                                <div className="mt-4 text-sm text-gray-600 italic">
                                    <span className="font-bold not-italic text-gray-800">Notes:</span> {response_details.notes}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Negotiation Modal */}
            {isNegotiationModalOpen && (
                <NegotiationModal 
                    onSubmit={handleNegotiationSubmit} 
                    onClose={() => setIsNegotiationModalOpen(false)} 
                    lineItems={order.lineItems}
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

    return (
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
    );
};