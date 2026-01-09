// Import React and necessary hooks for state and side effects
import React, { FC, useState, useMemo, useEffect, useRef, ReactNode } from 'react';
// Import icons for UI elements
import {
    Search, Star, SlidersHorizontal, ChevronDown, Menu, User as UserIcon, LogOut, Briefcase, Truck, DollarSign,
    Building, ChevronLeft, ChevronRight, Package, Trash2, X
} from 'lucide-react';
import { Factory, UserProfile } from '../src/types';
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
}

export const SourcingPage: FC<SourcingPageProps> = (props) => {
    const { pageKey, user, userProfile, handleSelectFactory, toggleMenu, selectedGarmentCategory, setSelectedGarmentCategory, handleSetCurrentPage, handleSignOut, showToast } = props;
    
    // State to hold the complete list of factories fetched from the database
    const [allFactories, setAllFactories] = useState<Factory[]>([]);
    // Default values for filters to allow easy resetting
    const initialFilters = { rating: 0, maxMoq: 10000, tags: [] as string[], categories: [] as string[], location: '', certifications: [] as string[] };
    // State for the text typed in the search bar
    const [searchTerm, setSearchTerm] = useState('');
    // State to track active filters (rating, location, etc.)
    const [filters, setFilters] = useState(initialFilters);
    // State to control visibility of the side filter panel
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    // State to show loading indicators while data is being fetched
    const [isFiltering, setIsFiltering] = useState(true);
    // State for the user profile dropdown menu
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

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

    // Effect to fetch factory data from the database when the page loads
    useEffect(() => {
        const fetchFactories = async () => {
            // Show loading state (skeletons)
            setIsFiltering(true);
            
            // Fetch all rows from the 'factories' table in Supabase
            const { data, error } = await supabase.from('factories').select('*');

            if (error) {
                showToast('Could not fetch factories.', 'error');
                console.error(error);
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
            }
            // Hide loading state
            setIsFiltering(false);
        };
        fetchFactories();
    }, [showToast]);

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

    const DashboardCard: FC<{ icon: ReactNode; title: string; value: string | number; colorClass: string }> = ({ icon, title, value, colorClass }) => (
        <div className={`relative p-5 rounded-xl overflow-hidden bg-white shadow-md transition-transform hover:scale-105`}>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colorClass}`}></div>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
                </div>
                <div className={`p-2 rounded-full bg-opacity-20 ${colorClass.split(' ')[0].replace('from-', 'bg-')}`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    const Dashboard: FC = () => {
        const dashboardData = {
            activeOrders: 3,
            unitsInProduction: '17,500',
            totalOrderValue: '$125.5K',
            partnerFactories: allFactories.length,
        };
        return(
            <section className="mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DashboardCard title="Active Orders" value={dashboardData.activeOrders} icon={<Briefcase className="text-purple-600" size={24}/>} colorClass="from-purple-500 to-indigo-500" />
                    <DashboardCard title="Units in Production" value={dashboardData.unitsInProduction} icon={<Truck className="text-blue-600" size={24}/>} colorClass="from-blue-500 to-cyan-500" />
                    <DashboardCard title="Total Order Value" value={dashboardData.totalOrderValue} icon={<DollarSign className="text-green-600" size={24}/>} colorClass="from-green-500 to-emerald-500" />
                    <DashboardCard title="Partner Factories" value={dashboardData.partnerFactories} icon={<Building className="text-orange-600" size={24}/>} colorClass="from-orange-500 to-amber-500" />
                </div>
            </section>
        );
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
                <button onClick={() => scroll('left')} className="absolute left-0 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all">
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <div ref={scrollRef} className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-4 px-12 scrollbar-hide">
                    {displayCategories.map(cat => {
                        const isSelected = selectedGarmentCategory === cat.name;
                        return (
                            <button key={cat.name} onClick={() => setSelectedGarmentCategory(cat.name)} className="flex-shrink-0 flex flex-col items-center justify-start space-y-2 p-1 transition-transform hover:scale-105 group w-24 text-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${isSelected ? 'p-1 bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-transparent'}`}>
                                    <div className={`w-full h-full rounded-full bg-white flex items-center justify-center ${!isSelected ? 'ring-1 ring-gray-200' : ''}`}>
                                        {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover rounded-full" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src=`https://placehold.co/80x80/e9d5ff/4c1d95?text=${cat.name}`; }} /> : <div className="text-gray-600">{cat.icon}</div>}
                                    </div>
                                </div>
                                <span className={`font-semibold text-xs transition-colors ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>{cat.name}</span>
                            </button>
                        );
                    })}
                </div>
                <button onClick={() => scroll('right')} className="absolute right-0 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all">
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
            </div>
        );
    };

    const SkeletonCard: FC = () => (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
            <div className="h-48 w-full bg-gray-300"></div>
            <div className="p-4">
                <div className="h-5 bg-gray-300 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-full"></div>
            </div>
        </div>
    );

    const FilterPanel: FC = () => (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity ${showFilterPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowFilterPanel(false)}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ${showFilterPanel ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-6 border-b">
                        <h3 className="text-xl font-bold">Filters</h3>
                        <button onClick={() => setShowFilterPanel(false)} className="p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
                    </div>
                    <div className="flex-grow p-6 space-y-6 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                            <div className="flex justify-center space-x-2">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={32} onClick={() => setFilters(f => ({ ...f, rating: star }))} className={`cursor-pointer transition-colors ${filters.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}</div>
                        </div>
                        <div>
                            <label htmlFor="moq" className="block text-sm font-medium text-gray-700">Max. MOQ: {filters.maxMoq.toLocaleString()} units</label>
                            <input type="range" id="moq" min="0" max="10000" step="100" value={filters.maxMoq} onChange={e => setFilters(f => ({ ...f, maxMoq: parseInt(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Product Categories</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{garmentCategories.map(cat => <button key={cat} onClick={() => { const newCategories = filters.categories.includes(cat) ? filters.categories.filter(c => c !== cat) : [...filters.categories, cat]; setFilters(f => ({ ...f, categories: newCategories })); }} className={`text-sm p-2 rounded-md transition-colors ${filters.categories.includes(cat) ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>{cat}</button>)}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{allCertifications.map(cert => <button key={cert} onClick={() => { const newCerts = filters.certifications.includes(cert) ? filters.certifications.filter(c => c !== cert) : [...filters.certifications, cert]; setFilters(f => ({ ...f, certifications: newCerts })); }} className={`text-sm p-2 rounded-md transition-colors ${filters.certifications.includes(cert) ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>{cert}</button>)}</div>
                        </div>
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                            <input type="text" id="location" value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Dhaka, Bangladesh" className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                         <div className="pt-6 border-t grid grid-cols-2 gap-4">
                            <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"><Trash2 size={16} /> Clear All</button>
                            <button onClick={() => setShowFilterPanel(false)} className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-md">Apply Filters</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    const ProfileDropdown: FC = () => (
        <div ref={profileDropdownRef} className="relative">
            <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="hidden md:flex w-12 h-12 rounded-full bg-purple-200 border-2 border-white items-center justify-center text-purple-700 font-bold text-xl shadow-md cursor-pointer">
                {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
            </button>
            {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 animate-fade-in">
                    <button onClick={() => { handleSetCurrentPage('profile'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><UserIcon size={16} className="mr-2" /> My Profile</button>
                    <button onClick={() => { handleSignOut(); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"><LogOut size={16} className="mr-2" /> Logout</button>
                </div>
            )}
        </div>
    );

    return (
        <MainLayout {...props}>
            {/* Header Section: Contains title, search bar, and profile menu */}
            <header className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <button className="flex items-center text-2xl font-bold text-gray-800">Dashboard <ChevronDown className="h-5 w-5 ml-1 text-gray-500" /></button>
                        <p className="text-gray-500 text-sm mt-1">Welcome back, {userProfile?.name ? userProfile.name.split(' ')[0] : 'User'}!</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button className="p-2 rounded-full bg-white shadow-sm md:hidden"><Search size={20} className="text-gray-600" /></button>
                        <button onClick={toggleMenu} className="p-2 rounded-full bg-white shadow-sm md:hidden"><Menu size={20} className="text-gray-600" /></button>
                        <ProfileDropdown />
                    </div>
                </div>
                {/* Search Bar and Filter Button Row */}
                <div className="relative mt-6 flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                        <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search factories by name or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm" />
                    </div>
                    <button onClick={() => setShowFilterPanel(true)} className="flex-shrink-0 px-4 py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 font-semibold shadow-sm"><SlidersHorizontal size={16} /> <span className="hidden sm:inline">Filters</span></button>
                </div>
            </header>

            {/* Dashboard Stats: Displays key metrics like Active Orders */}
            <Dashboard />

            {/* Category Carousel: Horizontal scrollable list of garment types */}
            <section className="mb-6"><CategoryCarousel /></section>

            {/* Quick Filters: Sticky bar with easy-access filters (Rating, Sustainable, etc.) */}
            <section className="mb-6 sticky top-0 bg-white/80 backdrop-blur-sm py-3 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-7xl mx-auto">
                    <button onClick={() => setShowFilterPanel(true)} className="flex-shrink-0 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors bg-white border-gray-300 hover:bg-gray-100 flex items-center gap-2"><SlidersHorizontal size={16} />Filters</button>
                    {quickFilters.map(filter => {
                        const isActive = isQuickFilterActive(filter.type, filter.value);
                        return (<button key={filter.name} onClick={() => handleQuickFilter(filter.type, filter.value)} className={`flex-shrink-0 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-300 hover:bg-gray-100'}`}>{filter.name}</button>)
                    })}
                </div>
            </section>

            {/* Factory Grid: The main content area displaying the list of factories */}
            <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Recommended For You</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Conditional Rendering: Show Skeletons while loading, Cards if data exists, or 'No Results' message */}
                    {isFiltering ? (
                        Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
                    ) : filteredFactories.length > 0 ? (
                        filteredFactories.map((factory, index) => (
                            <FactoryCard key={factory.id} factory={factory} onSelect={() => handleSelectFactory(factory)} style={{ animationDelay: `${index * 60}ms` }} />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm">
                            <Package className="mx-auto h-16 w-16 text-gray-400" />
                            <p className="text-gray-600 font-semibold mt-4">No Factories Found</p>
                            <p className="text-gray-500 text-sm">Try adjusting your category or search filters.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Filter Panel: The slide-out modal for detailed filtering options */}
            <FilterPanel />
        </MainLayout>
    );
};