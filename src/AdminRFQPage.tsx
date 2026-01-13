import React, { useState, useEffect, FC, useRef } from 'react';
import { MainLayout } from './MainLayout';
import { quoteService } from './quote.service';
import { QuoteRequest } from './types';
import { MapPin, Shirt, Package, Clock, ChevronRight, ChevronLeft, FileQuestion, MessageSquare, CheckCircle, XCircle, X, Download, RefreshCw, User, Building, Calendar, FileText } from 'lucide-react';
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

    const handleUpdateStatus = async (quoteId: string, newStatus: string) => {
        const { error } = await quoteService.update(quoteId, { status: newStatus });
        if (error) {
            showToast('Failed to update status', 'error');
        } else {
            showToast(`Quote marked as ${newStatus}`);
            setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus as any } : q));
            if (selectedQuote && selectedQuote.id === quoteId) {
                setSelectedQuote(prev => prev ? { ...prev, status: newStatus as any } : null);
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

    const filteredQuotes = quotes.filter(quote => filterStatus === 'All' || quote.status === filterStatus);
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

        const newStatus = selectedQuote.status === 'In Negotiation' ? 'In Negotiation' : 'Responded';

        const { error } = await quoteService.update(selectedQuote.id, {
            status: newStatus,
            response_details: { ...responseForm, lineItemResponses, respondedAt: new Date().toISOString() }
        });
        setIsSubmittingResponse(false);

        if (error) {
            showToast('Failed to send response: ' + error.message, 'error');
        } else {
            showToast('Quote response sent successfully!');
            setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, status: newStatus as any } : q));
            setSelectedQuote(prev => prev ? { ...prev, status: newStatus as any } : null);
            setIsResponseModalOpen(false);
        }
    };

    const handleDeclineSubmit = async () => {
        if (!selectedQuote) return;
        
        // Preserve existing response details but add the decline note
        const updatedResponseDetails = {
            ...selectedQuote.response_details,
            notes: declineMessage ? `${selectedQuote.response_details?.notes || ''}\n\n[Declined Reason]: ${declineMessage}` : selectedQuote.response_details?.notes || '',
            price: selectedQuote.response_details?.price || '',
            leadTime: selectedQuote.response_details?.leadTime || ''
        };

        const { error } = await quoteService.update(selectedQuote.id, { 
            status: 'Declined',
            response_details: updatedResponseDetails
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
                        <div className="flex gap-3">
                            <button onClick={() => setIsResponseModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition shadow-md">
                                <MessageSquare size={18} /> Respond
                            </button>
                            <button onClick={() => handleUpdateStatus(selectedQuote.id, 'Declined')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition">
                                <XCircle size={18} /> Decline
                            </button>
                        </div>
                    </div>

                    {/* Negotiation / Counter Offer Section - Displayed Above Details */}
                    {selectedQuote.negotiation_details && (
                        <div className={`mb-8 border rounded-xl p-6 animate-fade-in ${selectedQuote.status === 'In Negotiation' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div>
                                    <h3 className={`text-lg font-bold flex items-center gap-2 ${selectedQuote.status === 'In Negotiation' ? 'text-orange-900' : 'text-gray-700'}`}>
                                        <MessageSquare size={20} /> {selectedQuote.status === 'In Negotiation' ? 'Active Client Counter-Offer' : 'Negotiation History'}
                                    </h3>
                                    {selectedQuote.status === 'In Negotiation' && (
                                        <p className="text-orange-800 mt-2 text-sm">
                                            The client has proposed new terms. Review their offer below.
                                        </p>
                                    )}
                                </div>
                                {selectedQuote.status === 'In Negotiation' && (
                                    <div className="flex gap-3">
                                        <button onClick={() => setIsDeclineModalOpen(true)} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition shadow-sm flex items-center gap-2">
                                            <XCircle size={18} /> Decline Offer
                                        </button>
                                        <button onClick={() => setIsResponseModalOpen(true)} className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition shadow-md flex items-center gap-2">
                                            <MessageSquare size={18} /> Respond / Counter
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Client Message</p>
                                    <p className="text-gray-800 italic">"{selectedQuote.negotiation_details.message}"</p>
                                </div>
                                {selectedQuote.negotiation_details.counterPrice && (
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Proposed Total / Unit Price</p>
                                            <p className="text-2xl font-bold text-gray-900">${selectedQuote.negotiation_details.counterPrice}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedQuote.negotiation_details.lineItemNegotiations && selectedQuote.negotiation_details.lineItemNegotiations.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-bold text-gray-800 mb-3">Item-wise Offer Breakdown</h4>
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Original Target</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client Offer</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedQuote.negotiation_details.lineItemNegotiations.map((neg, idx) => {
                                                    const item = selectedQuote.order.lineItems.find(i => i.id === neg.lineItemId);
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-2 text-sm text-gray-800">{item ? item.category : 'Unknown Item'}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-500">${item ? item.targetPrice : '-'}</td>
                                                            <td className="px-4 py-2 text-sm font-bold text-orange-700">${neg.counterPrice}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        {/* Left Column: Order Details */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <Package size={20} className="mr-2 text-purple-600" /> Products & Specifications
                                </h3>
                                <div className="space-y-6">
                                    {selectedQuote.order?.lineItems?.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                    <span className="bg-white text-gray-600 text-xs px-2 py-1 rounded border">#{idx + 1}</span>
                                                    {item.category}
                                                </h4>
                                                <span className="text-sm font-medium text-gray-600">Qty: {item.qty} {item.quantityType === 'container' ? '' : 'units'}</span>
                                            </div>
                                            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 text-sm">
                                                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Target Price</p><p className="font-semibold text-gray-900">${item.targetPrice}</p></div>
                                                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Fabric</p><p className="font-semibold text-gray-900">{item.fabricQuality}</p></div>
                                                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Weight</p><p className="font-semibold text-gray-900">{item.weightGSM} GSM</p></div>
                                                {item.styleOption && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Style</p><p className="font-semibold text-gray-900">{item.styleOption}</p></div>}
                                                {item.sleeveOption && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Sleeve</p><p className="font-semibold text-gray-900">{item.sleeveOption}</p></div>}
                                                <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Sizes</p><p className="font-semibold text-gray-900">{item.sizeRange.join(', ')}</p></div>
                                                {item.customSize && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Custom Sizes</p><p className="font-semibold text-gray-900">{item.customSize}</p></div>}
                                                
                                                {Object.keys(item.sizeRatio).length > 0 && (
                                                    <div className="col-span-full bg-white p-3 rounded-lg border border-gray-100">
                                                        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Size Breakdown</p>
                                                        <div className="flex flex-wrap gap-3">
                                                            {Object.entries(item.sizeRatio).map(([size, ratio]) => (
                                                                <div key={size} className="flex flex-col items-center bg-gray-50 px-3 py-1 rounded">
                                                                    <span className="text-xs font-bold text-gray-700">{size}</span>
                                                                    <span className="text-xs text-gray-500">{ratio}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="col-span-full space-y-3">
                                                    <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Packaging</p><p className="text-gray-700">{item.packagingReqs}</p></div>
                                                    {item.labelingReqs && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Labeling</p><p className="text-gray-700">{item.labelingReqs}</p></div>}
                                                    {item.trimsAndAccessories && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Trims & Accessories</p><p className="text-gray-700">{item.trimsAndAccessories}</p></div>}
                                                    {item.specialInstructions && <div><p className="text-xs text-gray-400 uppercase font-semibold mb-1">Special Instructions</p><p className="text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-100">{item.specialInstructions}</p></div>}
                                                </div>
                                            </div>
                                            
                                            {/* Display Response if available */}
                                            {selectedQuote.response_details?.lineItemResponses?.find(r => r.lineItemId === item.id) && (
                                                <div className="bg-green-50 px-6 py-3 border-t border-green-100 flex justify-between items-center">
                                                    <span className="text-sm font-bold text-green-800 flex items-center gap-2"><CheckCircle size={16}/> Quoted Price</span>
                                                    <div className="text-right">
                                                        <span className="text-lg font-bold text-green-800">${selectedQuote.response_details.lineItemResponses.find(r => r.lineItemId === item.id)?.price}</span>
                                                        {selectedQuote.response_details.respondedAt && (
                                                            <p className="text-xs text-green-600 mt-0.5">
                                                                {new Date(selectedQuote.response_details.respondedAt).toLocaleDateString()}
                                                            </p>
                                                        )}
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
                    <button onClick={fetchQuotes} className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors ${isLoading ? 'animate-spin' : ''}`} title="Refresh Quotes"><RefreshCw size={20}/></button>
                </div>
            </div>

            <div className="mb-6 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                    {filterOptions.map(status => (
                        <button key={status} onClick={() => setFilterStatus(status)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-md transition-colors ${filterStatus === status ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading quotes...</div>
            ) : filteredQuotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuotes.map((quote, index) => (
                        <div key={quote.id} className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col transition-transform hover:scale-[1.02]">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                        {(quote.clientName || 'U').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{quote.clientName || 'Unknown Client'}</p>
                                        <p className="text-xs text-gray-500">{quote.companyName || 'Unknown Company'}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusColor(quote.status)}`}>{quote.status}</span>
                            </div>
                            <div className="p-4 flex-grow space-y-3">
                                <div className="flex items-center text-sm">
                                    <Shirt size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                    <span className="font-semibold text-gray-700">{quote.order?.lineItems?.length > 1 ? `${quote.order.lineItems.length} Items` : quote.order?.lineItems?.[0]?.category || 'N/A'}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Package size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600">{quote.order?.lineItems?.reduce((acc, item) => acc + (parseInt(item.qty) || 0), 0) || 0} units</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Clock size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600">{new Date(quote.submittedAt).toLocaleDateString()}</span>
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