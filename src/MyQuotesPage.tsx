import React, { useState, FC } from 'react';
import { MainLayout } from './MainLayout';
import { QuoteRequest } from './types';
import {
    Plus, MapPin, Globe, Shirt, Package, Clock, ChevronRight, FileQuestion, RefreshCw, MessageSquare, Bell, Calendar, DollarSign
} from 'lucide-react';

interface MyQuotesPageProps {
    quoteRequests: QuoteRequest[];
    handleSetCurrentPage: (page: string, data?: any) => void;
    layoutProps: any;
    isLoading: boolean;
    onRefresh: () => void;
}

export const MyQuotesPage: FC<MyQuotesPageProps> = ({ quoteRequests, handleSetCurrentPage, layoutProps, isLoading, onRefresh }) => {
    const [filterStatus, setFilterStatus] = useState('All');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const todayString = new Date().toISOString().split('T')[0];

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
        return { label, date };
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
        return new Date(timestamp).getTime() > new Date(lastRead).getTime();
    };

    const handleCardClick = (quote: QuoteRequest) => {
        const timestamp = getQuoteTimestamp(quote);
        localStorage.setItem(`quote_read_${quote.id}`, timestamp);
        handleSetCurrentPage('quoteDetail', quote);
    };

    const filteredQuotes = (quoteRequests || [])
        .filter(quote => filterStatus === 'All' || quote.status === filterStatus)
        .filter(checkDateFilter)
        .sort((a, b) => new Date(getQuoteTimestamp(b)).getTime() - new Date(getQuoteTimestamp(a)).getTime());

    const filterOptions = ['All', 'Pending', 'Responded', 'In Negotiation', 'Accepted', 'Declined'];

    return (
        <MainLayout {...layoutProps}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div>
                    <h1 className="text-3xl font-bold text-gray-800">My Quote Requests</h1>
                    <p className="text-gray-500 mt-1">Track and manage your quotes with factories.</p>
                    </div>
                    <button onClick={onRefresh} className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors ${isLoading ? 'animate-spin' : ''}`} title="Refresh Quotes"><RefreshCw size={20}/></button>
                </div>
                <button onClick={() => handleSetCurrentPage('orderForm')} className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition shadow-md">
                    <Plus size={18} />
                    <span>Request New Quote</span>
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    {filterOptions.map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-md transition-colors ${
                                filterStatus === status
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'text-gray-500 hover:bg-gray-100'
                            }`}
                        >
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

            {/* Quotes Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse"></div>
                    ))}
                </div>
            ) : filteredQuotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuotes.map((quote, index) => (
                        <div 
                            key={quote.id} 
                            onClick={() => handleCardClick(quote)}
                            className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 flex flex-col transition-all duration-200 cursor-pointer group animate-card-enter" 
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    {quote.factory ? (
                                        <>
                                            <img className="h-12 w-12 rounded-lg object-cover border border-gray-100" src={quote.factory.imageUrl} alt={quote.factory.name} />
                                            <div>
                                                <p className="font-bold text-gray-900 text-base">{quote.factory.name}</p>
                                                <p className="text-xs text-gray-500 flex items-center mt-0.5"><MapPin size={12} className="mr-1"/>{quote.factory.location}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100"><Globe size={24} /></div>
                                            <div><p className="font-bold text-gray-900 text-base">General Request</p><p className="text-xs text-gray-500 mt-0.5">Open to all factories</p></div>
                                        </div>
                                    )}
                                </div>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                                    {quote.status}
                                </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-grow space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <p className="text-xs text-gray-500 mb-1">Product</p>
                                        <div className="flex items-center text-sm font-medium text-gray-800">
                                            <Shirt size={16} className="text-gray-400 mr-2" />
                                            {quote.order?.lineItems?.length > 1 ? `${quote.order.lineItems.length} Items` : (quote.order?.lineItems?.[0]?.category || 'Unknown Product')}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Quantity</p>
                                        <div className="flex items-center text-sm font-medium text-gray-800">
                                            <Package size={16} className="text-gray-400 mr-2" />
                                            {(() => {
                                                const items = quote.order?.lineItems || [];
                                                if (items.length === 0) return '0 units';
                                                if (items.length === 1) {
                                                    const item = items[0];
                                                    return `${item.qty} ${item.quantityType === 'container' ? '' : 'units'}`;
                                                }
                                                // For multiple items, check if all are units to sum them up
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
                                        <p className="text-xs text-gray-500 mb-1">{quote.status === 'Accepted' ? 'Agreed Price' : 'Target Price'}</p>
                                        <div className={`flex items-center text-sm font-medium ${quote.status === 'Accepted' ? 'text-green-600' : 'text-gray-800'}`}>
                                            <DollarSign size={16} className={`${quote.status === 'Accepted' ? 'text-green-500' : 'text-gray-400'} mr-2`} />
                                            {(() => {
                                                const isAccepted = quote.status === 'Accepted';
                                                if (isAccepted) {
                                                    if (quote.response_details?.price) return quote.response_details.price;
                                                    if (quote.order?.lineItems?.length === 1) {
                                                        const itemId = quote.order.lineItems[0].id;
                                                        const itemResponse = quote.response_details?.lineItemResponses?.find(r => r.lineItemId === itemId);
                                                        if (itemResponse?.price) return itemResponse.price;
                                                    }
                                                }
                                                if (quote.order?.lineItems?.length === 1) return quote.order.lineItems[0].targetPrice;
                                                return 'View Details';
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">{getDisplayDateInfo(quote).label}</p>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Clock size={16} className="text-gray-400 mr-2" />
                                        {new Date(getDisplayDateInfo(quote).date).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </div>
                                </div>

                                {isResponseAwaited(quote) && (
                                    <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex items-center text-yellow-700 animate-fade-in">
                                        <Clock size={18} className="mr-2" />
                                        <span className="font-semibold text-sm">Response Awaited</span>
                                    </div>
                                )}

                                {quote.status === 'Responded' && quote.response_details && isUnread(quote) && (
                                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center text-blue-700">
                                                <MessageSquare size={18} className="mr-2" />
                                                <span className="font-semibold text-sm">Message Notification</span>
                                            </div>
                                            <span className="font-bold text-blue-800 text-lg">${quote.response_details.price}</span>
                                        </div>
                                        {quote.response_details.respondedAt && (
                                            <div className="text-right mt-1 text-xs text-blue-600">{new Date(quote.response_details.respondedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                                        )}
                                    </div>
                                )}
                                {isNewReply(quote) && isUnread(quote) && (
                                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center text-blue-700">
                                                <MessageSquare size={18} className="mr-2" />
                                                <span className="font-semibold text-sm">New Reply</span>
                                            </div>
                                        </div>
                                        <div className="text-right mt-1 text-xs text-blue-600">{new Date(quote.negotiation_details?.history?.slice(-1)[0]?.timestamp || Date.now()).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                                    </div>
                                )}
                                {quote.status === 'Accepted' && quote.response_details && isUnread(quote) && (
                                    <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center text-green-700">
                                                <Bell size={18} className="mr-2" />
                                                <span className="font-semibold text-sm">Notification: Final Price</span>
                                            </div>
                                            <span className="font-bold text-green-800 text-lg">${quote.response_details.price}</span>
                                        </div>
                                        {quote.acceptedAt && (
                                            <div className="text-right mt-1 text-xs text-green-600">Accepted on {new Date(quote.acceptedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Card Footer */}
                            <div className="px-5 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100 flex items-center justify-between group-hover:bg-purple-50 transition-colors duration-200">
                                <span className="text-xs text-gray-500 font-medium group-hover:text-purple-600 transition-colors">View full details</span>
                                <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:border-purple-200 group-hover:text-purple-600 transition-all">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100">
                    <FileQuestion className="mx-auto h-16 w-16 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-800">No Quotes Found</h3>
                    <p className="mt-1 text-sm text-gray-500">No quotes match the "{filterStatus}" filter.</p>
                    <button onClick={() => setFilterStatus('All')} className="mt-4 text-sm font-bold text-purple-600 hover:underline">
                        Show All Quotes
                    </button>
                </div>
            )}
        </MainLayout>
    );
};