import React, { useState, useEffect, FC } from 'react';
import { MainLayout } from './MainLayout';
import { quoteService } from './quote.service';
import { QuoteRequest } from './types';
import { MapPin, MoreHorizontal, Shirt, Package, Clock, ChevronRight, ChevronLeft, FileQuestion, MessageSquare, CheckCircle, XCircle, X } from 'lucide-react';

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
}

export const AdminRFQPage: FC<AdminRFQPageProps> = (props) => {
    const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [responseForm, setResponseForm] = useState({ price: '', leadTime: '', notes: '' });
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

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
                userId: q.user_id,
                files: q.files || [],
                response_details: q.response_details,
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
        const { error } = await quoteService.update(selectedQuote.id, {
            status: 'Responded',
            response_details: responseForm
        });
        setIsSubmittingResponse(false);

        if (error) {
            showToast('Failed to send response: ' + error.message, 'error');
        } else {
            showToast('Quote response sent successfully!');
            setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, status: 'Responded' } : q));
            setSelectedQuote(prev => prev ? { ...prev, status: 'Responded' } : null);
            setIsResponseModalOpen(false);
        }
    };

    if (selectedQuote) {
        return (
            <MainLayout {...props}>
                <button onClick={() => setSelectedQuote(null)} className="text-purple-600 font-semibold mb-4 flex items-center hover:underline">
                    <ChevronLeft className="h-5 w-5 mr-1" /> Back to RFQ List
                </button>
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">Quote Request Details</h2>
                            <p className="text-gray-500 mt-1">From: <span className="font-semibold text-gray-800">{(selectedQuote as any).clientName}</span> ({(selectedQuote as any).companyName})</p>
                            <p className="text-gray-400 text-sm">Submitted on {new Date(selectedQuote.submittedAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedQuote.status)}`}>{selectedQuote.status}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Target Factory</h3>
                            {selectedQuote.factory ? (
                                <div className="flex items-center gap-4">
                                    <img src={selectedQuote.factory.imageUrl} alt={selectedQuote.factory.name} className="w-16 h-16 rounded-lg object-cover"/>
                                    <div>
                                        <p className="font-bold text-gray-900">{selectedQuote.factory.name}</p>
                                        <p className="text-sm text-gray-500">{selectedQuote.factory.location}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 italic">General Inquiry (No specific factory selected)</div>
                            )}
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Specs</h3>
                            <div className="space-y-2 text-sm">
                                <p><strong>Product:</strong> {selectedQuote.order.category}</p>
                                <p><strong>Quantity:</strong> {selectedQuote.order.qty} units</p>
                                <p><strong>Target Price:</strong> ${selectedQuote.order.targetPrice}</p>
                                <p><strong>Fabric:</strong> {selectedQuote.order.fabricQuality}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Admin Actions</h3>
                        <div className="flex gap-4">
                            <button onClick={() => setIsResponseModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <MessageSquare size={18} /> Respond to Quote
                            </button>
                            <button onClick={() => handleUpdateStatus(selectedQuote.id, 'Accepted')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <CheckCircle size={18} /> Accept Quote
                            </button>
                            <button onClick={() => handleUpdateStatus(selectedQuote.id, 'Declined')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                <XCircle size={18} /> Decline
                            </button>
                        </div>
                    </div>

                    {isResponseModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Send Quote Response</h2>
                                    <button onClick={() => setIsResponseModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleSubmitResponse} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quote Price (per unit)</label>
                                        <input type="number" step="0.01" required value={responseForm.price} onChange={e => setResponseForm({...responseForm, price: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g. 4.25" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time</label>
                                        <input type="text" required value={responseForm.leadTime} onChange={e => setResponseForm({...responseForm, leadTime: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g. 30-40 days" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Terms</label>
                                        <textarea required value={responseForm.notes} onChange={e => setResponseForm({...responseForm, notes: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" rows={4} placeholder="Additional details..." />
                                    </div>
                                    <div className="flex justify-end gap-4 pt-2">
                                        <button type="button" onClick={() => setIsResponseModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
                                        <button type="submit" disabled={isSubmittingResponse} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                                            {isSubmittingResponse ? 'Sending...' : 'Send Response'}
                                        </button>
                                    </div>
                                </form>
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
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">RFQ Management</h1>
                    <p className="text-gray-500 mt-1">Manage and respond to client quote requests.</p>
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
                                        {(quote as any).clientName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{(quote as any).clientName}</p>
                                        <p className="text-xs text-gray-500">{(quote as any).companyName}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusColor(quote.status)}`}>{quote.status}</span>
                            </div>
                            <div className="p-4 flex-grow space-y-3">
                                <div className="flex items-center text-sm">
                                    <Shirt size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                    <span className="font-semibold text-gray-700">{quote.order.category}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Package size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                    <span className="text-gray-600">{quote.order.qty} units</span>
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