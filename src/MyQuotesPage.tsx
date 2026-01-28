import React, { useState, FC, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MainLayout } from './MainLayout';
import { QuoteRequest } from './types';
import {
    Plus, MapPin, Globe, Shirt, Package, Clock, ChevronRight, FileQuestion, RefreshCw, MessageSquare, Bell, Calendar, DollarSign, CheckCircle, Check, CheckCheck, FileText, Trash2
} from 'lucide-react';
import { formatFriendlyDate, getStatusColor, getStatusGradientBorder, getStatusHoverShadow } from './utils';
import { useToast } from './ToastContext';

interface MyQuotesPageProps {
    quoteRequests: QuoteRequest[];
    handleSetCurrentPage: (page: string, data?: any) => void;
    layoutProps: any;
    isLoading: boolean;
    onRefresh: () => void;
    initialFilterStatus?: string;
}

const EmptyState: FC<{ filterStatus: string; onClearFilter: () => void; onRequestQuote: () => void; }> = ({ filterStatus, onClearFilter, onRequestQuote }) => {
    let title = "No Quotes Found";
    let message = `No quotes match the "${filterStatus}" filter.`;
    let action: React.ReactNode = <button onClick={onClearFilter} className="mt-4 text-sm font-bold text-[#c20c0b] hover:underline">Show All Quotes</button>;

    if (filterStatus !== 'All') {
        switch (filterStatus) {
            case 'Drafts':
                title = "No Drafts";
                message = "You don't have any saved drafts.";
                break;
            case 'Pending':
                title = "No Pending Quotes";
                message = "You have no quotes awaiting a response from factories.";
                action = <button onClick={onRequestQuote} className="mt-4 bg-[#c20c0b] text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#a50a09] transition shadow-md"><Plus size={18} /> Request a New Quote</button>;
                break;
            case 'Responded':
                title = "No New Responses";
                message = "You haven't received any new quotes from factories yet. When you do, they'll appear here.";
                break;
            case 'In Negotiation':
                title = "No Active Negotiations";
                message = "You are not currently negotiating any quotes. Quotes you respond to will appear here.";
                break;
            case 'Accepted':
                title = "No Accepted Quotes";
                message = "You haven't accepted any quotes yet. Once accepted, they will appear here and move to the CRM.";
                break;
            case 'Declined':
                title = "No Declined Quotes";
                message = "You have not declined any quotes.";
                break;
            case 'Admin Accepted':
                title = "No Admin Accepted Quotes";
                message = "There are no quotes currently accepted by the admin waiting for your action.";
                break;
            case 'Client Accepted':
                title = "No Quotes Awaiting Admin Acceptance";
                message = "You have not accepted any quotes that are now waiting for admin finalization.";
                break;
        }
    } else {
        title = "You haven't requested any quotes yet.";
        message = "Start by creating a new quote request to get offers from factories.";
        action = <button onClick={onRequestQuote} className="mt-4 bg-[#c20c0b] text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#a50a09] transition shadow-md"><Plus size={18} /> Request a New Quote</button>;
    }

    return (
        <div className="text-center py-16 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-100 dark:border-white/10">
            <FileQuestion className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-200 max-w-md mx-auto">{message}</p>
            {action}
        </div>
    );
};

export const MyQuotesPage: FC<MyQuotesPageProps> = ({ quoteRequests, handleSetCurrentPage, layoutProps, isLoading, onRefresh, initialFilterStatus }) => {
    const [filterStatus, setFilterStatus] = useState(initialFilterStatus || 'All');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const todayString = new Date().toISOString().split('T')[0];
    const [draftQuotes, setDraftQuotes] = useState<QuoteRequest[]>([]);
    const { showToast } = useToast();

    // Load drafts from local storage
    useEffect(() => {
        const draftData = localStorage.getItem('garment_erp_saved_drafts');
        if (draftData) {
            try {
                const parsedDrafts = JSON.parse(draftData);
                setDraftQuotes(parsedDrafts);
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }, []);

    const getQuoteTimestamp = (quote: QuoteRequest) => {
        if (quote.status === 'Accepted' && quote.acceptedAt) return quote.acceptedAt;
        if (quote.status === 'In Negotiation' && quote.negotiation_details?.submittedAt) return quote.negotiation_details.submittedAt;
        if (quote.status === 'Responded' && quote.response_details?.respondedAt) return quote.response_details.respondedAt;
        // Fallback for Responded if respondedAt is missing
        if (quote.status === 'Responded') return quote.submittedAt;
        if (quote.status === 'Declined') return quote.response_details?.respondedAt || quote.submittedAt;
        return quote.submittedAt;
    };

    const getDisplayDateInfo = (quote: QuoteRequest) => {
        const date = getQuoteTimestamp(quote);
        let label = 'Submitted';
        if (quote.status === 'Accepted') label = 'Accepted';
        else if (quote.status === 'In Negotiation') label = 'Updated';
        else if (quote.status === 'Responded') label = 'Received';
        else if (quote.status === 'Declined') label = 'Declined';
        else if (quote.status === 'Admin Accepted') label = 'Admin Accepted';
        else if (quote.status === 'Client Accepted') label = 'You Accepted';
        return { label, date: formatFriendlyDate(date) };
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

    const isResponseAwaited = (quote: QuoteRequest) => {
        if (quote.status === 'Pending') return true;
        if (quote.status === 'In Negotiation') {
            const history = quote.negotiation_details?.history;
            if (history && Array.isArray(history) && history.length > 0) {
                return history[history.length - 1].sender === 'client';
            }
            return true; // Assume client started negotiation if no history
        }
        return false;
    };

    const isNewReply = (quote: QuoteRequest) => {
        if (quote.status === 'In Negotiation') {
             const history = quote.negotiation_details?.history;
             if (history && Array.isArray(history) && history.length > 0) {
                 return history[history.length - 1].sender === 'factory';
             }
        }
        return false;
    };

    const isUnread = (quote: QuoteRequest) => {
        const timestamp = getQuoteTimestamp(quote);
        const lastRead = localStorage.getItem(`quote_read_${quote.id}`);
        if (!lastRead) return true;
        return new Date(timestamp).toISOString() > new Date(lastRead).toISOString();
    };

    const handleCardClick = (quote: QuoteRequest) => {
        if (quote.status === 'Draft') {
            handleSetCurrentPage('orderForm');
            return;
        }
        const timestamp = getQuoteTimestamp(quote);
        localStorage.setItem(`quote_read_${quote.id}`, timestamp);
        handleSetCurrentPage('quoteDetail', quote);
    };

    const handleRequestNewQuote = () => {
        localStorage.removeItem('garment_erp_order_draft');
        handleSetCurrentPage('orderForm');
    };

    const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this draft permanently?")) {
            const newDrafts = draftQuotes.filter(d => d.id !== draftId);
            setDraftQuotes(newDrafts);
            localStorage.setItem('garment_erp_saved_drafts', JSON.stringify(newDrafts));
            
            // Also clear current working draft if it matches
            const currentWork = localStorage.getItem('garment_erp_order_draft');
            if (currentWork) {
                const parsed = JSON.parse(currentWork);
                if (parsed.draftId === draftId) {
                    localStorage.removeItem('garment_erp_order_draft');
                }
            }
            
            showToast("Draft deleted successfully.", "success");
        }
    };

    const handleResumeDraft = (quote: QuoteRequest) => {
        localStorage.setItem('garment_erp_order_draft', JSON.stringify(quote.order));
        handleSetCurrentPage('orderForm');
    };

    const filteredQuotes = (quoteRequests || [])
        .filter(quote => quote.status !== 'Trashed')
        .filter(quote => filterStatus === 'All' ? quote.status !== 'Draft' : quote.status === filterStatus)
        .concat(filterStatus === 'Drafts' ? draftQuotes : [])
        .filter(checkDateFilter)
        .sort((a, b) => new Date(getQuoteTimestamp(b)).getTime() - new Date(getQuoteTimestamp(a)).getTime());

    const filterOptions = ['All', 'Drafts', 'Pending', 'Responded', 'In Negotiation', 'Accepted', 'Declined', 'Admin Accepted', 'Client Accepted'];

    return (
        <MainLayout {...layoutProps}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Quote Requests</h1>
                    <p className="text-gray-500 dark:text-gray-200 mt-1">Track and manage your quotes with factories.</p>
                    </div>
                    <button onClick={onRefresh} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors ${isLoading ? 'animate-spin' : ''}`} title="Refresh Quotes"><RefreshCw size={20}/></button>
                </div>
                <button onClick={handleRequestNewQuote} className="bg-[#c20c0b] text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#a50a09] transition shadow-md">
                    <Plus size={18} />
                    <span>Request New Quote</span>
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-2">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    {filterOptions.map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-md transition-colors ${
                                filterStatus === status
                                    ? 'bg-red-100 dark:bg-red-900/30 text-[#c20c0b] dark:text-red-400'
                                    : 'text-gray-500 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                    </div>

                    <div className="flex items-center gap-2 px-2">
                        <Calendar size={16} className="text-gray-500 dark:text-gray-200" />
                        <select 
                            value={dateFilter} 
                            onChange={(e) => {
                                if (e.target.value === 'Custom Range') {
                                    setIsDateModalOpen(true);
                                } else {
                                    setDateFilter(e.target.value);
                                }
                            }}
                            className="text-sm border-none bg-transparent font-medium text-gray-600 dark:text-gray-300 focus:ring-0 cursor-pointer outline-none"
                        >
                            <option>All Time</option>
                            <option>Today</option>
                            <option>Yesterday</option>
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Custom Range</option>
                        </select>
                        {dateFilter === 'Custom Range' && (
                            <button 
                                onClick={() => setIsDateModalOpen(true)}
                                className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                {customStartDate ? new Date(customStartDate).toLocaleDateString() : 'Start'} - {customEndDate ? new Date(customEndDate).toLocaleDateString() : 'End'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quotes Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-64 animate-pulse"></div>
                    ))}
                </div>
            ) : filteredQuotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuotes.map((quote, index) => (
                        <div
                            key={quote.id} 
                            onClick={() => quote.status === 'Draft' ? handleResumeDraft(quote) : handleCardClick(quote)}
                            className={`bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl p-6 shadow-md ${getStatusHoverShadow(quote.status)} border border-gray-200 dark:border-white/10 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col hover:-translate-y-1`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${getStatusGradientBorder(quote.status)}`} />
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                    #{quote.id.slice(0, 8)}
                                </span>
                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getStatusColor(quote.status)} flex items-center gap-1`}>
                                    {quote.status === 'Accepted' && <CheckCheck size={12} />}
                                    {(quote.status === 'Admin Accepted' || quote.status === 'Client Accepted') && <Check size={12} />}
                                    {quote.status === 'Admin Accepted' ? 'Admin Accepted' : quote.status === 'Client Accepted' ? 'You Accepted' : quote.status}
                                </span>
                            </div>

                            {quote.status === 'Draft' ? (
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <FileText size={16} className="text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Draft Order</p>
                                </div>
                            ) : quote.factory && (
                                <div className="flex items-center gap-3 mb-5">
                                    <img className="h-9 w-9 rounded-full object-cover border border-gray-100 dark:border-gray-700 shadow-sm" src={quote.factory.imageUrl} alt={quote.factory.name} />
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight group-hover:text-[#c20c0b] transition-colors">{quote.factory.name}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-200 flex items-center mt-0.5"><MapPin size={10} className="mr-1"/>{quote.factory.location}</p>
                                    </div>
                                </div>
                            )}

                            {/* Card Body */}
                            <div className="flex-grow">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-[#c20c0b] transition-colors">
                                    {quote.order?.lineItems?.length > 1 ? `${quote.order.lineItems.length} Product Types` : (quote.order?.lineItems?.[0]?.category || 'Unknown Product')}
                                </h3>
                                <p className="text-xs text-gray-400 dark:text-gray-200 mb-6">
                                    {getDisplayDateInfo(quote).label} {getDisplayDateInfo(quote).date}
                                </p>

                                <div className="flex items-center gap-8 mb-6">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-200 mb-1">Quantity</p>
                                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 font-medium text-sm">
                                            <Package size={14} className="text-gray-300 dark:text-gray-600" />
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
                                                    return `${total} total units`;
                                                }
                                                return 'Multiple quantities';
                                            })()}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-200 mb-1">{quote.status === 'Accepted' ? 'Agreed Price' : 'Target Price'}</p>
                                        <div className={`flex items-center gap-1.5 font-medium text-sm ${quote.status === 'Accepted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                            <DollarSign size={14} className={quote.status === 'Accepted' ? 'text-emerald-400' : 'text-gray-300 dark:text-gray-600'} />
                                            {(() => {
                                                const isAccepted = quote.status === 'Accepted';
                                                let priceValue = 'N/A';

                                                if (isAccepted) {
                                                    if (quote.response_details?.price) priceValue = `$${quote.response_details.price}`;
                                                    else if (quote.order?.lineItems?.length === 1) {
                                                        const itemId = quote.order.lineItems[0].id;
                                                        const itemResponse = quote.response_details?.lineItemResponses?.find(r => r.lineItemId === itemId);
                                                        if (itemResponse?.price) priceValue = `$${itemResponse.price}`;
                                                    } else {
                                                        priceValue = 'See Details';
                                                    }
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
                                {isResponseAwaited(quote) ? (
                                    <div className="flex items-center text-xs text-amber-600 dark:text-amber-500 font-medium">
                                        <Clock size={14} className="mr-1.5" /> Awaiting response
                                    </div>
                                ) : quote.status === 'Draft' ? (
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        <FileText size={14} className="mr-1.5" /> Resume Editing
                                    </div>
                                ) : (quote.status === 'Responded' || isNewReply(quote)) && isUnread(quote) ? (
                                    <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        <MessageSquare size={14} className="mr-1.5" /> New response
                                    </div>
                                ) : quote.status === 'Accepted' && isUnread(quote) ? (
                                    <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                        <CheckCircle size={14} className="mr-1.5" /> Quote Accepted
                                    </div>
                                ) : quote.status === 'Client Accepted' ? (
                                    <div className="flex items-center text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                                        <Check size={14} className="mr-1.5" /> You Accepted
                                    </div>
                                ) : quote.status === 'Admin Accepted' ? (
                                    <div className="flex items-center text-xs text-teal-600 dark:text-teal-400 font-medium">
                                        <Check size={14} className="mr-1.5" /> Action Required: Finalize
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 dark:text-gray-200 font-medium">View Details</div>
                                )}
                                
                                {quote.status === 'Draft' && (
                                    <button onClick={(e) => handleDeleteDraft(e, quote.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors ml-auto mr-2" title="Delete Draft">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                
                                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-800 group-hover:bg-[#c20c0b] flex items-center justify-center text-gray-400 dark:text-gray-200 group-hover:text-white transition-all duration-300">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    filterStatus={filterStatus}
                    onClearFilter={() => setFilterStatus('All')}
                    onRequestQuote={handleRequestNewQuote}
                />
            )}

            {/* Date Range Modal */}
            {isDateModalOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Date Range</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                <input 
                                    type="date" 
                                    value={customStartDate} 
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    max={todayString}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                <input 
                                    type="date" 
                                    value={customEndDate} 
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    max={todayString}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsDateModalOpen(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            <button onClick={() => {
                                setDateFilter('Custom Range');
                                setIsDateModalOpen(false);
                            }} className="px-4 py-2 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] transition-colors">Apply</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </MainLayout>
    );
};