import React, { useState, FC, useRef, useEffect, ReactNode } from 'react';
import { MainLayout } from './MainLayout';
import { QuoteRequest, NegotiationHistoryItem } from './types';
import { quoteService } from './quote.service';
import {
    ChevronLeft, MapPin, Calendar, Package, Shirt, DollarSign, Clock,
    FileText, MessageSquare, CheckCircle, AlertCircle, X, Globe, Download, ChevronDown, History
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

    useEffect(() => {
        const generateSignedUrls = async () => {
            if (selectedQuote?.files && selectedQuote.files.length > 0) {
                const urls = await Promise.all(selectedQuote.files.map(async (path) => {
                    const { data } = await layoutProps.supabase.storage
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
            }
        };
        generateSignedUrls();
    }, [selectedQuote, layoutProps.supabase]);

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
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Responded': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Accepted': return 'bg-green-100 text-green-800 border-green-200';
            case 'Declined': return 'bg-red-100 text-red-800 border-red-200';
            case 'In Negotiation': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

    return (
        <MainLayout {...layoutProps}>
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => handleSetCurrentPage('myQuotes')} className="group flex items-center text-gray-500 hover:text-purple-600 font-medium transition-colors">
                        <div className="p-1 rounded-full bg-gray-100 group-hover:bg-purple-100 mr-2 transition-colors">
                            <ChevronLeft size={20} />
                        </div>
                        Back to My Quotes
                    </button>
                    <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm" title="Download as PDF">
                        <Download size={16} />
                        Download PDF
                    </button>
                </div>

                <div ref={quoteDetailsRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900">Quote Request</h1>
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full border ${getStatusColor(status)}`}>
                                    {status}
                                </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 gap-4">
                                <span className="flex items-center"><Calendar size={14} className="mr-1.5"/> Submitted on {new Date(submittedAt).toLocaleDateString()}</span>
                                <span className="hidden sm:inline text-gray-300">|</span>
                                <span className="flex items-center">ID: #{id.slice(0, 8)}</span>
                            </div>
                        </div>
                        {(status === 'Responded' || status === 'In Negotiation') && (
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button onClick={() => setIsNegotiationModalOpen(true)} className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition shadow-sm">
                                    Negotiate
                                </button>
                                <button onClick={handleDeclineQuote} className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition shadow-sm flex items-center justify-center gap-2">
                                    <X size={18} /> Decline
                                </button>
                                <button onClick={handleAcceptQuote} className="flex-1 sm:flex-none px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition shadow-md flex items-center justify-center gap-2">
                                    <CheckCircle size={18} /> Accept
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Factory & Response */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Factory Response Card */}
                            {(status === 'Responded' || status === 'In Negotiation') && response_details && (
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <MessageSquare size={120} className="text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center relative z-10">
                                        <MessageSquare size={20} className="mr-2" /> Factory Response
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                                        <div className="bg-white/60 p-4 rounded-lg backdrop-blur-sm">
                                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Quoted Price</p>
                                            <p className="text-3xl font-bold text-gray-900">${response_details.price} <span className="text-sm font-normal text-gray-500">/ unit</span></p>
                                            {response_details.respondedAt && (
                                                <p className="text-xs text-gray-500 mt-2 flex items-center">
                                                    <Clock size={12} className="mr-1" />
                                                    {new Date(response_details.respondedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="bg-white/60 p-4 rounded-lg backdrop-blur-sm">
                                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Lead Time</p>
                                            <p className="text-xl font-bold text-gray-900">{response_details.leadTime}</p>
                                        </div>
                                        <div className="sm:col-span-2 bg-white/60 p-4 rounded-lg backdrop-blur-sm">
                                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Notes from Factory</p>
                                            <p className="text-gray-700 text-sm leading-relaxed">{response_details.notes || 'No additional notes provided.'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Order Specifications */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <FileText size={20} className="mr-2 text-gray-400" /> Order Specifications
                                </h3>
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    {/* Tabs Header */}
                                    <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 scrollbar-hide">
                                        {order.lineItems.map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setActiveTab(index)}
                                                className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 focus:outline-none flex items-center gap-2 ${
                                                    activeTab === index
                                                        ? 'border-purple-600 text-purple-700 bg-white shadow-sm'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${activeTab === index ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>{index + 1}</span>
                                                {item.category}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    <div className="p-6">
                                        {order.lineItems.map((item, index) => {
                                            if (index !== activeTab) return null;
                                            const itemResponse = response_details?.lineItemResponses?.find(r => r.lineItemId === item.id);
                                            const history = getLineItemHistory(item.id);

                                            const isAccepted = status === 'Accepted';
                                            const showAgreedPrice = isAccepted;
                                            // If client accepted (timestamp present), use factory price. Else (admin accepted), use client target.
                                            const agreedPrice = (isAccepted && response_details?.acceptedAt && itemResponse?.price) 
                                                ? itemResponse.price 
                                                : item.targetPrice;

                                            return (
                                                <div key={index} className="animate-fade-in space-y-6">
                                                    {/* New Header with Target Price */}
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-gray-900">{item.category}</h3>
                                                            <div className="flex items-center gap-4 mt-1">
                                                                <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                                                                    Qty: {item.qty} {item.quantityType === 'container' ? '' : 'units'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">{showAgreedPrice ? 'Agreed Price' : 'Target Price'}</p>
                                                            <p className={`text-3xl font-bold ${showAgreedPrice ? 'text-green-600' : 'text-purple-600'}`}>${showAgreedPrice ? agreedPrice : item.targetPrice}</p>
                                                        </div>
                                                    </div>

                                                    {/* Specs Grid */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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

                                                    {/* Display Line Item Response if available */}
                                                    {itemResponse && (
                                                        <div className="mb-8 bg-green-50/50 border border-green-100 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-green-100 rounded-full text-green-600">
                                                                    <CheckCircle size={24} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-green-800 uppercase tracking-wide">Factory Quoted Price</p>
                                                                    <p className="text-xs text-green-600">Per unit for this item</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-3xl font-bold text-green-700">${itemResponse.price}</span>
                                                                <PriceDifference target={item.targetPrice} quoted={itemResponse.price} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Price History Log */}
                                                    {history.length > 0 && (
                                                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                                                            <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                                <History size={16}/> Price Negotiation History
                                                            </h4>
                                                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                                {history.map((h, i) => (
                                                                    <div key={i} className={`flex ${h.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                                                                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${h.sender === 'client' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                                                                            <div className="flex justify-between items-center gap-4 mb-1">
                                                                                <span className={`text-[10px] font-bold uppercase ${h.sender === 'client' ? 'text-purple-200' : 'text-gray-500'}`}>
                                                                                    {h.sender === 'client' ? 'You' : 'Factory'}
                                                                                </span>
                                                                                <span className={`text-[10px] ${h.sender === 'client' ? 'text-purple-200' : 'text-gray-400'}`}>
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
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Final Price Footer */}
                                    {status === 'Accepted' && response_details?.price && (
                                        <div className="bg-gray-50 p-6 border-t border-gray-200 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total / Final Price</p>
                                                <div className="flex items-center font-bold text-green-600 text-lg">
                                                    <DollarSign size={18} className="mr-2" /> ${response_details.price}
                                                </div>
                                            </div>
                                            {selectedQuote.acceptedAt && (
                                                <div className="text-right text-xs text-green-600">
                                                    Accepted on {new Date(selectedQuote.acceptedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attached Files */}
                            {fileLinks.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                        <FileText size={20} className="mr-2 text-gray-400" /> Attached Documents
                                    </h3>
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        <ul className="space-y-3">
                                            {fileLinks.map((file, index) => (
                                                <li key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                                                    <div className="flex items-center truncate mr-4">
                                                        <div className="bg-purple-100 p-2 rounded-lg mr-3">
                                                            <FileText size={18} className="text-purple-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                                                    </div>
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 flex items-center text-sm font-bold bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">
                                                        <Download size={16} className="mr-1.5" /> Download
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Factory Info */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Selected Factory</h3>
                                {factory ? (
                                    <div className="text-center">
                                        <img src={factory.imageUrl} alt={factory.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-gray-50 shadow-sm" />
                                        <h4 className="text-xl font-bold text-gray-900 mb-1">{factory.name}</h4>
                                        <p className="text-sm text-gray-500 flex items-center justify-center mb-4">
                                            <MapPin size={14} className="mr-1" /> {factory.location}
                                        </p>
                                        <button className="w-full py-2.5 px-4 bg-gray-50 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition text-sm">
                                            View Factory Profile
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                        <p className="text-gray-500 text-sm">General Inquiry<br/>(No specific factory)</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center"><Globe size={16} className="mr-2"/>Logistics</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Destination Country</p>
                                        <p className="font-semibold text-gray-900">{order.shippingCountry}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Destination Port</p>
                                        <p className="font-semibold text-gray-900">{order.shippingPort}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                                <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider mb-3 flex items-center">
                                    <AlertCircle size={16} className="mr-2" /> Need Help?
                                </h3>
                                <p className="text-sm text-purple-800 mb-4">
                                    Our sourcing experts can help you negotiate terms or find alternative factories.
                                </p>
                                <button className="text-sm font-semibold text-purple-700 hover:text-purple-900 hover:underline">
                                    Contact Support &rarr;
                                </button>
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
                                        <span className="font-bold text-lg text-purple-700">${item.targetPrice}</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Negotiate Quote</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        <h3 className="text-sm font-semibold text-gray-700">Item Breakdown</h3>
                        {lineItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{item.category}</p>
                                    <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                                </div>
                                <div className="w-32">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Offer ($)"
                                        value={lineItemPrices[item.id] || ''}
                                        onChange={(e) => setLineItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label htmlFor="counterPrice" className="block text-sm font-medium text-gray-700 mb-1">Overall Counter Price (Optional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="number"
                                id="counterPrice"
                                value={counterPrice}
                                onChange={(e) => setCounterPrice(e.target.value)}
                                className="w-full pl-7 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">Message to Factory</label>
                        <textarea
                            id="details"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            rows={4}
                            placeholder="Explain your counter offer or request changes..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors shadow-md">Submit Offer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};