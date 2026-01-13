import React, { useState, FC } from 'react';
import { MainLayout } from './MainLayout';
import { QuoteRequest } from './types';
import {
    Plus, MapPin, Globe, Shirt, Package, Clock, ChevronRight, FileQuestion, RefreshCw, MessageSquare, Bell
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

    const filteredQuotes = (quoteRequests || []).filter(quote => filterStatus === 'All' || quote.status === filterStatus);

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
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-hide">
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
                            onClick={() => handleSetCurrentPage('quoteDetail', quote)}
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
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
                                            {quote.order?.lineItems?.reduce((acc, item) => acc + (parseInt(item.qty) || 0), 0) || 0} units
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Submitted</p>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Clock size={16} className="text-gray-400 mr-2" />
                                        {new Date(quote.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                {quote.status === 'Responded' && quote.response_details && (
                                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                                        <div className="flex items-center text-blue-700">
                                            <MessageSquare size={18} className="mr-2" />
                                            <span className="font-semibold text-sm">Message Notification</span>
                                        </div>
                                        <span className="font-bold text-blue-800 text-lg">${quote.response_details.price}</span>
                                    </div>
                                )}
                                {quote.status === 'Accepted' && quote.response_details && (
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