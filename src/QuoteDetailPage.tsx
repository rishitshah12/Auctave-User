import React, { useState, FC } from 'react';
import { MainLayout } from './MainLayout';
import { QuoteRequest } from './types';
import { quoteService } from './quote.service';
import { 
    ChevronLeft, MapPin, Calendar, Package, Shirt, DollarSign, 
    FileText, MessageSquare, CheckCircle, AlertCircle, X 
} from 'lucide-react';

interface QuoteDetailPageProps {
    selectedQuote: QuoteRequest | null;
    handleSetCurrentPage: (page: string, data?: any) => void;
    updateQuoteStatus: (id: string, status: string) => void;
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

    if (!selectedQuote) {
        handleSetCurrentPage('myQuotes');
        return null;
    }

    const { factory, order, status, submittedAt, id, response_details } = selectedQuote;

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    const handleAcceptQuote = async () => {
        const { error } = await quoteService.update(id, { status: 'Accepted' });

        if (error) {
            showToast('Failed to update quote status: ' + error.message, 'error');
            return;
        }

        updateQuoteStatus(id, 'Accepted');
        createCrmOrder(selectedQuote);
        showToast('Quote Accepted! A new order has been created in the CRM portal.');
        handleSetCurrentPage('crm');
    };

    const handleNegotiationSubmit = async (counterPrice: string, details: string) => {
        const { error } = await quoteService.update(id, { 
            status: 'In Negotiation',
            negotiation_details: {
                counterPrice,
                message: details,
                submittedAt: new Date().toISOString()
            }
        });

        if (error) {
            showToast('Failed to update quote status: ' + error.message, 'error');
            return;
        }

        updateQuoteStatus(id, 'In Negotiation');
        showToast('Negotiation submitted. The quote is now marked as "In Negotiation".');
        setIsNegotiationModalOpen(false);
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

    return (
        <MainLayout {...layoutProps}>
            <div className="max-w-5xl mx-auto">
                <button onClick={() => handleSetCurrentPage('myQuotes')} className="group flex items-center text-gray-500 hover:text-purple-600 font-medium mb-6 transition-colors">
                    <div className="p-1 rounded-full bg-gray-100 group-hover:bg-purple-100 mr-2 transition-colors">
                        <ChevronLeft size={20} />
                    </div>
                    Back to My Quotes
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                        {status === 'Responded' && (
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button onClick={() => setIsNegotiationModalOpen(true)} className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition shadow-sm">
                                    Negotiate
                                </button>
                                <button onClick={handleAcceptQuote} className="flex-1 sm:flex-none px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition shadow-md flex items-center justify-center gap-2">
                                    <CheckCircle size={18} /> Accept Quote
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Factory & Response */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Factory Response Card */}
                            {status === 'Responded' && response_details && (
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
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Product Category</p>
                                            <div className="flex items-center font-semibold text-gray-900">
                                                <Shirt size={16} className="mr-2 text-purple-500" /> {order.category}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Quantity</p>
                                            <div className="flex items-center font-semibold text-gray-900">
                                                <Package size={16} className="mr-2 text-purple-500" /> {order.qty} units
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Target Price</p>
                                            <div className="flex items-center font-semibold text-gray-900">
                                                <DollarSign size={16} className="mr-2 text-purple-500" /> ${order.targetPrice}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Fabric</p>
                                            <p className="font-semibold text-gray-900">{order.fabricQuality}</p>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Style Details</p>
                                            <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">{order.styleOption}</p>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Packaging Requirements</p>
                                            <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">{order.packagingReqs}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Factory Info */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
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

            {/* Negotiation Modal */}
            {isNegotiationModalOpen && (
                <NegotiationModal onSubmit={handleNegotiationSubmit} onClose={() => setIsNegotiationModalOpen(false)} />
            )}
        </MainLayout>
    );
};

const NegotiationModal: FC<{ onSubmit: (counterPrice: string, details: string) => void; onClose: () => void; }> = ({ onSubmit, onClose }) => {
    const [counterPrice, setCounterPrice] = useState('');
    const [details, setDetails] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(counterPrice, details);
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
                    <div>
                        <label htmlFor="counterPrice" className="block text-sm font-medium text-gray-700 mb-1">Counter Offer Price ($/unit)</label>
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
                                required
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