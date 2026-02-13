// Import React and necessary hooks for state and side effects
import React, { FC, useState, useMemo, useEffect, useRef, ReactNode, useCallback } from 'react';
// Import icons for UI elements
import {
    Search, Star, SlidersHorizontal, ChevronDown, Menu, User as UserIcon, LogOut, Briefcase, Truck, DollarSign,
    Building, ChevronLeft, ChevronRight, Package, Trash2, X, Bell,
    Sparkles, TrendingUp, ArrowRight, Zap, Globe, Award, ShieldCheck, Clock
} from 'lucide-react';
import { Factory, UserProfile, QuoteRequest } from '../src/types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../src/supabaseClient';
import { MainLayout } from '../src/MainLayout';
import { FactoryCard } from '../src/FactoryCard';

interface SourcingPageProps {
    pageKey: number;
    user: any;
    userProfile: UserProfile | null;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    handleSelectFactory: (factory: Factory) => void;
    selectedGarmentCategory: string;
    setSelectedGarmentCategory: (category: string) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    notificationCount?: number;
    quoteRequests?: QuoteRequest[];
    setGlobalLoading?: (isLoading: boolean) => void;
}

const DashboardCard: FC<{ icon: ReactNode; title: string; value: string | number; colorClass: string; index?: number }> = React.memo(({ icon, title, value, colorClass, index = 0 }) => (
    <div className={`relative p-5 rounded-2xl overflow-hidden bg-white dark:bg-gray-900/40 dark:backdrop-blur-md shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 cursor-pointer group hover-pulse-glow animate-stagger-in`} style={{ animationDelay: `${index * 100}ms` }}>
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${colorClass} transition-all duration-300 group-hover:h-2`}></div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 bg-gradient-to-br from-current" style={{ color: colorClass.includes('red') || colorClass.includes('#c20c0b') ? '#c20c0b' : colorClass.includes('blue') ? '#2563EB' : colorClass.includes('green') ? '#059669' : '#D97706' }}></div>
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-300 tracking-wide">{title}</p>
                <p className="text-3xl font-extrabold text-gray-800 dark:text-white mt-1 animate-count-up">{value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                <div className="text-white">{icon}</div>
            </div>
        </div>
    </div>
));

const Dashboard: FC<{ quoteRequests: QuoteRequest[]; handleSetCurrentPage: (page: string, data?: any) => void; setSelectedGarmentCategory: (category: string) => void }> = React.memo(({ quoteRequests, handleSetCurrentPage, setSelectedGarmentCategory }) => {
    // Calculate dynamic metrics from quoteRequests
    const acceptedQuotes = useMemo(() => quoteRequests.filter(q => q.status === 'Accepted'), [quoteRequests]);
    const activeOrdersCount = acceptedQuotes.length;
    
    const unitsInProduction = useMemo(() => acceptedQuotes.reduce((total, quote) => {
        const lineItems = quote.order?.lineItems || [];
        const qty = lineItems.reduce((acc, item) => {
            // Handle potential non-numeric qty (e.g. "5000" or "20ft Container")
            const parsed = parseInt(String(item.qty || '0').replace(/[^0-9]/g, ''));
            return acc + (isNaN(parsed) ? 0 : parsed);
        }, 0);
        return total + qty;
    }, 0), [acceptedQuotes]);

    const totalOrderValue = useMemo(() => acceptedQuotes.reduce((total, quote) => {
        // Price might be a range or text, try to parse float
        const priceStr = String(quote.response_details?.price || '0').replace(/[^0-9.]/g, '');
        const price = parseFloat(priceStr);
        return total + (isNaN(price) ? 0 : price);
    }, 0), [acceptedQuotes]);

    const uniqueFactories = useMemo(() => new Set(quoteRequests.map(q => q.factory?.id).filter(Boolean)).size, [quoteRequests]);

    // Prepare Chart Data
    const { pieData, barData } = useMemo(() => {
        const statusCounts = quoteRequests.reduce((acc, quote) => {
            acc[quote.status] = (acc[quote.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const pieData = Object.keys(statusCounts).map(status => ({
            name: status,
            value: statusCounts[status]
        }));
        
        // If no data, provide placeholder for pie chart to look good or just empty
        if (pieData.length === 0) {
            pieData.push({ name: 'No Data', value: 1 });
        }

        const categoryDataMap = quoteRequests.reduce((acc, quote) => {
            const lineItems = quote.order?.lineItems || [];
            lineItems.forEach(item => {
                const qty = parseInt(String(item.qty || '0').replace(/[^0-9]/g, '')) || 0;
                if (!acc[item.category]) acc[item.category] = 0;
                acc[item.category] += qty;
            });
            return acc;
        }, {} as Record<string, number>);

        const barData = Object.keys(categoryDataMap).map(cat => ({
            name: cat,
            units: categoryDataMap[cat]
        })).sort((a, b) => b.units - a.units).slice(0, 5);

        return { pieData, barData };
    }, [quoteRequests]);

    const STATUS_GRADIENTS: Record<string, { id: string; start: string; end: string }> = {
        'Accepted': { id: 'gradAccepted', start: '#34D399', end: '#059669' },       // Emerald 400 -> 600
        'In Negotiation': { id: 'gradNegotiation', start: '#A78BFA', end: '#7C3AED' }, // Purple 400 -> 600
        'Pending': { id: 'gradPending', start: '#FBBF24', end: '#D97706' },        // Amber 400 -> 600
        'Responded': { id: 'gradResponded', start: '#60A5FA', end: '#2563EB' },      // Blue 400 -> 600
        'Declined': { id: 'gradDeclined', start: '#F87171', end: '#DC2626' },       // Red 400 -> 600
        'No Data': { id: 'gradNoData', start: '#E5E7EB', end: '#9CA3AF' },        // Gray 200 -> 400
    };

    const CATEGORY_GRADIENTS = [
        { id: 'catGrad0', start: '#60A5FA', end: '#2563EB' }, // Blue
        { id: 'catGrad1', start: '#34D399', end: '#059669' }, // Emerald
        { id: 'catGrad2', start: '#FBBF24', end: '#D97706' }, // Amber
        { id: 'catGrad3', start: '#F87171', end: '#DC2626' }, // Red
        { id: 'catGrad4', start: '#A78BFA', end: '#7C3AED' }, // Purple
        { id: 'catGrad5', start: '#2DD4BF', end: '#0F766E' }, // Teal
    ];

    return(
        <section className="mb-8 space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Accepted Orders" value={activeOrdersCount} icon={<Briefcase size={22}/>} colorClass="from-[#c20c0b] to-red-500" index={0} />
                <DashboardCard title="Units (Accepted)" value={unitsInProduction.toLocaleString()} icon={<Truck size={22}/>} colorClass="from-blue-500 to-cyan-500" index={1} />
                <DashboardCard title="Total Value" value={`$${totalOrderValue.toLocaleString()}`} icon={<DollarSign size={22}/>} colorClass="from-green-500 to-emerald-500" index={2} />
                <DashboardCard title="Engaged Factories" value={uniqueFactories} icon={<Building size={22}/>} colorClass="from-orange-500 to-amber-500" index={3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quote Status Chart */}
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 flex flex-col transition-all duration-300 hover:shadow-xl animate-stagger-in" style={{ animationDelay: '400ms' }}>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Sparkles size={18} className="text-amber-500" /> Quote Status Distribution</h3>
                    <div className="flex-grow min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    {Object.values(STATUS_GRADIENTS).map(grad => (
                                        <linearGradient key={grad.id} id={grad.id} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={grad.start} stopOpacity={1}/>
                                            <stop offset="100%" stopColor={grad.end} stopOpacity={1}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    onClick={(data) => {
                                        if (data && data.name && data.name !== 'No Data') {
                                            handleSetCurrentPage('myQuotes', data.name);
                                        }
                                    }}
                                    animationDuration={1000}
                                    animationEasing="ease-out"
                                >
                                    {pieData.map((entry, index) => {
                                        const grad = STATUS_GRADIENTS[entry.name] || STATUS_GRADIENTS['No Data'];
                                        return (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={`url(#${grad.id})`} 
                                                style={{ cursor: entry.name !== 'No Data' ? 'pointer' : 'default' }}
                                                className="transition-all duration-300 hover:brightness-110 hover:drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] stroke-none"
                                            />
                                        );
                                    })}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#374151' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Volume Chart */}
                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 flex flex-col transition-all duration-300 hover:shadow-xl animate-stagger-in" style={{ animationDelay: '500ms' }}>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> Requested Volume by Category</h3>
                    <div className="flex-grow min-h-[300px]">
                        {barData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <defs>
                                        {CATEGORY_GRADIENTS.map(grad => (
                                            <linearGradient key={grad.id} id={grad.id} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={grad.start} stopOpacity={1}/>
                                                <stop offset="100%" stopColor={grad.end} stopOpacity={1}/>
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ color: '#374151' }}
                                    />
                                    <Bar dataKey="units" fill="#c20c0b" radius={[4, 4, 0, 0]} barSize={50} animationDuration={1500} animationEasing="ease-out">
                                        {barData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={`url(#${CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length].id})`} 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSelectedGarmentCategory(entry.name)}
                                                className="transition-all duration-300 hover:brightness-110 hover:drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No volume data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
});

export const SourcingPage: FC<SourcingPageProps> = (props) => {
    const { pageKey, user, userProfile, handleSelectFactory, toggleMenu, selectedGarmentCategory, setSelectedGarmentCategory, handleSetCurrentPage, handleSignOut, showToast, notificationCount = 0, quoteRequests = [], setGlobalLoading } = props;
    
    const CACHE_KEY = 'garment_erp_factories';
    // State to hold the complete list of factories fetched from the database
    const [allFactories, setAllFactories] = useState<Factory[]>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });

    // Default values for filters to allow easy resetting
    const initialFilters = { rating: 0, maxMoq: 10000, tags: [] as string[], categories: [] as string[], location: '', certifications: [] as string[] };
    // State for the text typed in the search bar
    const [searchTerm, setSearchTerm] = useState('');
    // State to track active filters (rating, location, etc.)
    const [filters, setFilters] = useState(initialFilters);
    // State to control visibility of the side filter panel
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    // State to show loading indicators while data is being fetched
    const [isFiltering, setIsFiltering] = useState(() => !sessionStorage.getItem(CACHE_KEY));
    // State for the user profile dropdown menu
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const garmentCategories = useMemo(() => ['T-shirt', 'Polo Shirt', 'Hoodies', 'Jeans', 'Jackets', 'Shirts', 'Casual Shirts', 'Trousers'], []);
    const allCertifications = useMemo(() => ['Sedex', 'Oeko-Tex Standard 100', 'BCI', 'WRAP', 'ISO 9001'], []);

    const clearFilters = () => {
        setFilters(initialFilters);
    };

    // Close profile dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchFactories = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const hasCache = !!sessionStorage.getItem(CACHE_KEY);
        if (!hasCache) {
            setIsFiltering(true);
            if (setGlobalLoading) setGlobalLoading(true);
        }

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));

                // Fetch all rows from the 'factories' table in Supabase
                const { data, error } = await Promise.race([
                    supabase.from('factories').select('*').abortSignal(signal),
                    timeoutPromise
                ]) as any;

                if (signal.aborted) return;

                if (error) {
                    throw error;
                } else if (data) {
                    // Transform the raw database data (snake_case) into the format our app uses (camelCase)
                    // This ensures the rest of the app doesn't break if DB column names change
                    const transformedFactories: Factory[] = data.map((f: any) => ({
                        id: f.id,
                        name: f.name,
                        location: f.location,
                        description: f.description,
                        rating: f.rating,
                        turnaround: f.turnaround,
                        minimumOrderQuantity: f.minimum_order_quantity,
                        offer: f.offer,
                        imageUrl: f.cover_image_url,
                        gallery: f.gallery || [],
                        tags: f.tags || [],
                        certifications: f.certifications || [],
                        specialties: f.specialties || [],
                        machineSlots: f.machine_slots || [],
                        catalog: f.catalog || { productCategories: [], fabricOptions: [] }
                    }));
                    // Update state with the processed list of factories
                    setAllFactories(transformedFactories);
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(transformedFactories));
                }
                break;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                attempts++;
                if (attempts >= 3) {
                    showToast('Could not fetch factories.', 'error');
                    console.error(err);
                }
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }

        if (!signal.aborted) {
            setIsFiltering(false);
            if (setGlobalLoading) setGlobalLoading(false);
        }
    }, [showToast, setGlobalLoading]);

    useEffect(() => {
        fetchFactories();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchFactories]);

    // Core Filtering Logic: Determines which factories to display
    // useMemo ensures this calculation only runs when dependencies (filters, search, etc.) change
    const filteredFactories = useMemo(() => {
        return allFactories
            // 1. Filter by the main category selected in the top carousel (e.g., "T-shirt")
            .filter(f => selectedGarmentCategory === 'All' || f.specialties.includes(selectedGarmentCategory))
            // 2. Filter by search text (checks both factory name and location)
            .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.location.toLowerCase().includes(searchTerm.toLowerCase()))
            // 3. Filter by minimum star rating
            .filter(f => f.rating >= filters.rating)
            // 4. Filter by Maximum Order Quantity (MOQ) - ensures factory accepts the user's order size
            .filter(f => f.minimumOrderQuantity <= filters.maxMoq)
            // 5. Filter by Tags (e.g., "Sustainable") - factory must have ALL selected tags
            .filter(f => filters.tags.length === 0 || filters.tags.every(tag => f.tags.includes(tag as string)))
            // 6. Filter by specific categories from the detailed filter panel
            .filter(f => filters.categories.length === 0 || filters.categories.some(cat => f.specialties.includes(cat as string)))
            // 7. Filter by specific location text from the filter panel
            .filter(f => filters.location === '' || f.location.toLowerCase().includes(filters.location.toLowerCase()))
            // 8. Filter by certifications (e.g., "ISO 9001") - factory must have ALL selected certs
            .filter(f => filters.certifications.length === 0 || filters.certifications.every(cert => f.certifications.includes(cert as string)));
    }, [selectedGarmentCategory, searchTerm, filters, allFactories]);

    const displayCategories = [
        { name: 'All', icon: <SlidersHorizontal size={28} /> },
        { name: 'T-shirt', imageUrl: 'https://images.meesho.com/images/products/319819104/emgui_512.webp' },
        { name: 'Polo Shirt', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOzMIpappu3uVuhjfgNBRsGLNyjc-QDK9oOg&s' },
        { name: 'Shirts', imageUrl: 'https://thehouseofrare.com/cdn/shop/products/IMG_0180_f6c0cc37-6ce6-4d0b-82ac-fd550ecd4ada.jpg?v=1743587518' },
        { name: 'Casual Shirts', imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2023/1/RR/KJ/UE/102058255/shimak-casual-shirts-printed-full-sleeve-500x500.jpeg' },
        { name: 'Trousers', imageUrl: 'https://www.urbanofashion.com/cdn/shop/files/chino-olivegrn.jpg?v=1738593135' },
        { name: 'Jeans', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlDNy727l9wMphtlsqFGgkikBgIpFZy5-7CQ&s' },
        { name: 'Hoodies', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTob-lFFOTnZnxHaLaB7JPF7okEnYqyViiGDg&s' },
        { name: 'Jackets', imageUrl: 'https://thehouseofrare.com/cdn/shop/files/royban-2-mens-jacket-olive9_b797e9f6-b0e3-4e35-ac41-37063bd008fa.webp?v=1740640005' }
    ];

    const quickFilters = [
        { name: 'Rating: 4.0+', type: 'rating', value: 4.0 },
        { name: 'Sustainable', type: 'tag', value: 'Sustainable' },
        { name: 'Prime', type: 'tag', value: 'Prime' },
        { name: 'Fast Turnaround', type: 'tag', value: 'Fast Turnaround' }
    ];

    // Function to handle clicks on the quick filter buttons (top bar)
    const handleQuickFilter = (type: string, value: any) => {
        if (type === 'rating') {
            setFilters(f => f.rating === value ? { ...f, rating: 0 } : { ...f, rating: value });
        }
        if (type === 'tag') {
            setFilters(f => f.tags.includes(value) ? { ...f, tags: f.tags.filter(t => t !== value) } : { ...f, tags: [...f.tags, value] });
        }
    };

    const isQuickFilterActive = (type: string, value: any) => {
        if (type === 'rating') return filters.rating === value;
        if (type === 'tag') return filters.tags.includes(value);
        return false;
    };

    const CategoryCarousel: FC = () => {
        const scrollRef = useRef<HTMLDivElement>(null);
        const scroll = (direction: 'left' | 'right') => {
            if (scrollRef.current) {
                const { current } = scrollRef;
                const scrollAmount = direction === 'left' ? -current.offsetWidth / 2 : current.offsetWidth / 2;
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        };
        return (
            <div className="relative">
                <button onClick={() => scroll('left')} className="absolute left-0 z-10 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-md top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-700 transition-all">
                    <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
                <div ref={scrollRef} className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-4 px-12 scrollbar-hide">
                    {displayCategories.map(cat => {
                        const isSelected = selectedGarmentCategory === cat.name;
                        return (
                            <button key={cat.name} onClick={() => setSelectedGarmentCategory(cat.name)} className="flex-shrink-0 flex flex-col items-center justify-start space-y-2 p-1 transition-transform hover:scale-105 group w-24 text-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md group-hover:shadow-[0_0_15px_rgba(194,12,11,0.5)] ${isSelected ? 'p-1 bg-gradient-to-br from-red-500 to-pink-700' : 'bg-transparent'}`}>
                                    <div className={`w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center ${!isSelected ? 'ring-1 ring-gray-200 dark:ring-white/10' : ''}`}>
                                        {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover rounded-full" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src=`https://placehold.co/80x80/e9d5ff/4c1d95?text=${cat.name}`; }} /> : <div className="text-gray-600">{cat.icon}</div>}
                                    </div>
                                </div>
                                <span className={`font-semibold text-xs transition-colors ${isSelected ? 'text-[#c20c0b]' : 'text-gray-600 dark:text-gray-200'}`}>{cat.name}</span>
                            </button>
                        );
                    })}
                </div>
                <button onClick={() => scroll('right')} className="absolute right-0 z-10 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-md top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-gray-700 transition-all">
                    <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
            </div>
        );
    };

    const SkeletonCard: FC = () => (
        <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden animate-pulse">
            <div className="h-48 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]" style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}></div>
            <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
                <div className="border-t border-dashed border-gray-100 dark:border-gray-800 my-2"></div>
                <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/4"></div>
                </div>
            </div>
        </div>
    );

    const FilterPanel: FC = () => (
        <>
            <div className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-50 transition-opacity duration-500 ${showFilterPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowFilterPanel(false)}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${showFilterPanel ? 'translate-x-0' : 'translate-x-[120%]'}`}>
                <div className="flex flex-col h-full text-gray-800 dark:text-gray-200">
                    <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                        <h3 className="text-xl font-bold dark:text-white">Filters</h3>
                        <button onClick={() => setShowFilterPanel(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X size={24} /></button>
                    </div>
                    <div className="flex-grow p-6 space-y-6 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">Minimum Rating</label>
                            <div className="flex justify-center space-x-2">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={32} onClick={() => setFilters(f => ({ ...f, rating: star }))} className={`cursor-pointer transition-colors ${filters.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}</div>
                        </div>
                        <div>
                            <label htmlFor="moq" className="block text-sm font-medium text-gray-700 dark:text-white">Max. MOQ: {filters.maxMoq.toLocaleString()} units</label>
                            <input type="range" id="moq" min="0" max="10000" step="100" value={filters.maxMoq} onChange={e => setFilters(f => ({ ...f, maxMoq: parseInt(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#c20c0b]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">Product Categories</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{garmentCategories.map(cat => <button key={cat} onClick={() => { const newCategories = filters.categories.includes(cat) ? filters.categories.filter(c => c !== cat) : [...filters.categories, cat]; setFilters(f => ({ ...f, categories: newCategories })); }} className={`text-sm p-2 rounded-md transition-colors ${filters.categories.includes(cat) ? 'bg-[#c20c0b] text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'}`}>{cat}</button>)}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">Certifications</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{allCertifications.map(cert => <button key={cert} onClick={() => { const newCerts = filters.certifications.includes(cert) ? filters.certifications.filter(c => c !== cert) : [...filters.certifications, cert]; setFilters(f => ({ ...f, certifications: newCerts })); }} className={`text-sm p-2 rounded-md transition-colors ${filters.certifications.includes(cert) ? 'bg-[#c20c0b] text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'}`}>{cert}</button>)}</div>
                        </div>
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-white">Location</label>
                            <input type="text" id="location" value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Dhaka, Bangladesh" className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c20c0b] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        </div>
                         <div className="pt-6 border-t dark:border-gray-700 grid grid-cols-2 gap-4">
                            <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"><Trash2 size={16} /> Clear All</button>
                            <button onClick={() => setShowFilterPanel(false)} className="w-full bg-[#c20c0b] text-white py-3 rounded-lg font-semibold hover:bg-[#a50a09] transition-all shadow-md">Apply Filters</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    const NotificationBell: FC = () => {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const notifications = quoteRequests.filter(q => q.status === 'Responded' || q.status === 'In Negotiation');

        return (
            <div className="relative mr-1 md:mr-2" ref={dropdownRef}>
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative text-gray-600 dark:text-gray-200">
                    <Bell size={20} />
                    {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                    )}
                </button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-lg py-2 z-50 border border-gray-100 dark:border-white/10 animate-fade-in">
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Notifications</h3>
                            <span className="text-xs text-gray-500">{notifications.length} new</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map(quote => (
                                    <button 
                                        key={quote.id} 
                                        onClick={() => { setIsOpen(false); handleSetCurrentPage('quoteDetail', quote); }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden w-full">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${quote.status === 'Responded' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                                            <p className="text-sm text-gray-700 dark:text-gray-200 truncate w-full">
                                                <span className="font-semibold text-gray-900 dark:text-white">{quote.factory?.name || 'Request'}</span>
                                                <span className="text-gray-400 mx-1">•</span>
                                                <span className={quote.status === 'Responded' ? 'text-blue-600' : 'text-orange-600'}>
                                                    {quote.status === 'Responded' ? 'New Quote' : 'Negotiating'}
                                                </span>
                                            </p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                    No new notifications
                                </div>
                            )}
                        </div>
                        <div className="px-2 py-2 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => { setIsOpen(false); handleSetCurrentPage('myQuotes'); }} className="w-full py-2 text-xs font-semibold text-[#c20c0b] hover:bg-red-50 rounded-lg transition-colors">
                                View All Quotes
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const ProfileDropdown: FC = () => (
        <div ref={profileDropdownRef} className="relative">
            <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="hidden md:flex w-12 h-12 rounded-full bg-red-200 border-2 border-white items-center justify-center text-[#c20c0b] font-bold text-xl shadow-md cursor-pointer">
                {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
            </button>
            {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-md shadow-lg py-1 z-20 animate-fade-in border border-gray-100 dark:border-white/10">
                    <button onClick={() => { handleSetCurrentPage('profile'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"><UserIcon size={16} className="mr-2" /> My Profile</button>
                    <button onClick={() => { handleSignOut(); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[#c20c0b] hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"><LogOut size={16} className="mr-2" /> Logout</button>
                </div>
            )}
        </div>
    );

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
        if (hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
        return { text: 'Good Evening', emoji: '🌙' };
    };
    const greeting = getGreeting();
    const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'User';

    const promoBanners = [
        {
            title: 'Verified Factories',
            description: 'All factories are vetted and certified for quality assurance.',
            icon: <ShieldCheck size={28} />,
            gradient: 'from-emerald-500 to-teal-600',
            bgGlow: 'bg-emerald-500/20',
        },
        {
            title: 'Fast Turnaround',
            description: 'Get quotes within 24 hours from top manufacturers.',
            icon: <Clock size={28} />,
            gradient: 'from-blue-500 to-indigo-600',
            bgGlow: 'bg-blue-500/20',
        },
        {
            title: 'Global Network',
            description: 'Access 500+ factories across Asia, Europe & Americas.',
            icon: <Globe size={28} />,
            gradient: 'from-purple-500 to-pink-600',
            bgGlow: 'bg-purple-500/20',
        },
    ];

    return (
        <MainLayout {...props}>
            {/* Hero Welcome Section */}
            <header className="mb-8 relative">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6 sm:p-8 shadow-2xl border border-white/5">
                    {/* Animated background blobs */}
                    <div className="absolute top-0 left-0 w-72 h-72 bg-pink-500/30 rounded-full filter blur-3xl animate-blob"></div>
                    <div className="absolute top-10 right-10 w-64 h-64 bg-purple-500/30 rounded-full filter blur-3xl animate-blob-delay-2"></div>
                    <div className="absolute -bottom-10 left-1/3 w-56 h-56 bg-cyan-500/30 rounded-full filter blur-3xl animate-blob-delay-4"></div>

                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{greeting.emoji}</span>
                                <p className="text-gray-300 text-sm font-medium tracking-wide uppercase">{greeting.text}</p>
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                                Welcome back, <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent animate-gradient-x font-black">{firstName}</span>
                            </h1>
                            <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-xl">
                                {userProfile?.companyName ? `${userProfile.companyName} • ` : ''}Discover top-rated factories, get instant quotes, and scale your garment production.
                            </p>

                            {/* Quick action buttons */}
                            <div className="flex flex-wrap gap-3 mt-5">
                                <button onClick={() => handleSetCurrentPage('orderForm')} className="px-5 py-2.5 bg-gradient-to-r from-[#c20c0b] to-red-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 hover:scale-[1.03] flex items-center gap-2">
                                    <Zap size={16} /> Place New Order
                                </button>
                                <button onClick={() => handleSetCurrentPage('myQuotes')} className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-sm border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center gap-2">
                                    View My Quotes <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Right side: Profile + Notification cluster */}
                        <div className="flex items-center space-x-2 self-start sm:self-center">
                            <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm shadow-sm md:hidden hover:bg-white/20 transition-colors"><Search size={20} className="text-white" /></button>
                            <button onClick={toggleMenu} className="p-2 rounded-full bg-white/10 backdrop-blur-sm shadow-sm md:hidden hover:bg-white/20 transition-colors"><Menu size={20} className="text-white" /></button>
                            <NotificationBell />
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>

                {/* Search Bar - floating below the hero */}
                <div className="relative -mt-5 mx-4 sm:mx-8 flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow group">
                        <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#c20c0b] transition-colors" />
                        <input type="text" placeholder="Search factories by name or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent shadow-lg bg-white dark:bg-gray-900/80 dark:backdrop-blur-md dark:text-white text-gray-900 text-sm" />
                    </div>
                    <button onClick={() => setShowFilterPanel(true)} className="flex-shrink-0 px-5 py-3.5 bg-white dark:bg-gray-900/80 dark:backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold shadow-lg text-gray-700 dark:text-white text-sm transition-all duration-200 hover:scale-[1.02]"><SlidersHorizontal size={16} /> <span className="hidden sm:inline">Filters</span></button>
                </div>
            </header>

            {/* Promotional Banners */}
            <section className="mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {promoBanners.map((banner, i) => (
                        <div key={banner.title} className="relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-1 animate-banner-slide banner-shimmer" style={{ animationDelay: `${i * 150}ms` }}>
                            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${banner.bgGlow} filter blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                            <div className="relative z-10">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${banner.gradient} flex items-center justify-center text-white shadow-lg mb-3 group-hover:scale-110 transition-transform duration-300`}>
                                    {banner.icon}
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm">{banner.title}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{banner.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Dashboard Stats: Displays key metrics like Active Orders */}
            <section className="mb-8">
                <div className="flex items-center gap-2 mb-5">
                    <Award size={20} className="text-[#c20c0b]" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Your Performance</h2>
                </div>
                <Dashboard quoteRequests={quoteRequests} handleSetCurrentPage={handleSetCurrentPage} setSelectedGarmentCategory={setSelectedGarmentCategory} />
            </section>

            {/* Category Carousel: Horizontal scrollable list of garment types */}
            <section className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package size={20} className="text-purple-500" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Browse Categories</h2>
                </div>
                <CategoryCarousel />
            </section>

            {/* Quick Filters: Sticky bar with easy-access filters (Rating, Sustainable, etc.) */}
            <section className="mb-6 sticky top-0 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md py-3 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-colors border-b border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-7xl mx-auto">
                    <button onClick={() => setShowFilterPanel(true)} className="flex-shrink-0 px-4 py-2 border rounded-xl text-sm font-semibold transition-all duration-200 bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-white flex items-center gap-2 hover:scale-[1.03]"><SlidersHorizontal size={16} />Filters</button>
                    {quickFilters.map(filter => {
                        const isActive = isQuickFilterActive(filter.type, filter.value);
                        return (<button key={filter.name} onClick={() => handleQuickFilter(filter.type, filter.value)} className={`flex-shrink-0 px-4 py-2 border rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.03] ${isActive ? 'bg-[#c20c0b] text-white border-[#c20c0b] shadow-md shadow-red-500/20' : 'bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-white'}`}>{filter.name}</button>)
                    })}
                </div>
            </section>

            {/* Factory Grid: The main content area displaying the list of factories */}
            <section>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-amber-500" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recommended For You</h2>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {!isFiltering && `${filteredFactories.length} ${filteredFactories.length === 1 ? 'factory' : 'factories'}`}
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Conditional Rendering: Show Skeletons while loading, Cards if data exists, or 'No Results' message */}
                    {isFiltering ? (
                        Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
                    ) : filteredFactories.length > 0 ? (
                        filteredFactories.map((factory, index) => (
                            <FactoryCard key={factory.id} factory={factory} onSelect={() => handleSelectFactory(factory)} style={{ animationDelay: `${index * 60}ms` }} />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-white/10">
                            <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <Package className="h-10 w-10 text-gray-400" />
                            </div>
                            <p className="text-gray-600 dark:text-gray-200 font-bold text-lg">No Factories Found</p>
                            <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">Try adjusting your category or search filters to discover more manufacturers.</p>
                            <button onClick={clearFilters} className="mt-4 px-5 py-2 bg-[#c20c0b] text-white rounded-xl text-sm font-semibold hover:bg-[#a50a09] transition-all shadow-md">Clear All Filters</button>
                        </div>
                    )}
                </div>
            </section>

            {/* Filter Panel: The slide-out modal for detailed filtering options */}
            <FilterPanel />
        </MainLayout>
    );
};