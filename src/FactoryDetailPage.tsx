import React, { FC, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { analyticsService } from './analytics.service';
import ReactDOM from 'react-dom';
import {
    Star, MapPin, ChevronLeft, ChevronRight, BookOpen, Activity, ShieldCheck, X, ZoomIn, TrendingUp, AlertCircle, CheckCircle2, Search, Check, Package, Send, DollarSign, MessageSquare, ChevronDown, Loader
} from 'lucide-react';
import { MainLayout } from '../src/MainLayout';
import { Factory, LineItem, OrderFormData } from '../src/types';
import { TrustTierBadge } from '../src/FactoryCard';
import ProductCatalog, { migrateCatalog } from '../src/ProductCatalog';
import ProductionFloorLayout from '../src/ProductionFloorLayout';
import { factoryService } from '../src/factory.service';
import { supabase } from '../src/supabaseClient';
import { getCache, setCache, TTL_FACTORY_DETAIL } from '../src/sessionCache';

interface FactoryDetailPageProps {
    // Props for MainLayout
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    // Page specific props
    selectedFactory: Factory;
    suggestedFactories: Factory[];
    initialTab?: 'overview' | 'catalog';
    onSubmitRFQ?: (quoteData: { factory?: { id: string; name: string; location: string; imageUrl: string }, order: OrderFormData, filesPerProduct?: File[][] }) => Promise<boolean>;
}

const CertificationBadge: FC<{ cert: string }> = ({ cert }) => {
    const certStyles: { [key: string]: string } = {
        'Sedex': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        'Oeko-Tex Standard 100': 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        'BCI': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
        'WRAP': 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        'ISO 9001': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
    };
    return <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${certStyles[cert] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white border-gray-200 dark:border-gray-700'}`}>{cert}</span>
}


export const FactoryDetailPage: FC<FactoryDetailPageProps> = (props) => {
    const { selectedFactory: propFactory, handleSetCurrentPage, suggestedFactories, initialTab = 'overview', onSubmitRFQ } = props;
    const [factory, setFactory] = useState<Factory>(propFactory);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'overview' | 'catalog'>(initialTab);
    const catalogEnterTimeRef = useRef<number | null>(initialTab === 'catalog' ? Date.now() : null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');

    // Track catalog tab entry and time spent
    useEffect(() => {
        if (activeTab === 'catalog') {
            catalogEnterTimeRef.current = Date.now();
            analyticsService.track('catalog_view', { factory_id: factory.id, factory_name: factory.name, factory_location: factory.location });
        } else if (catalogEnterTimeRef.current !== null) {
            const duration_ms = Date.now() - catalogEnterTimeRef.current;
            if (duration_ms > 1000) {
                analyticsService.track('catalog_exit', { factory_id: factory.id, factory_name: factory.name, duration_ms });
            }
            catalogEnterTimeRef.current = null;
        }
    }, [activeTab]);

    // When user types in the header search bar, auto-switch to catalog tab
    const catalogSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleCatalogSearch = (value: string) => {
        setCatalogSearch(value);
        if (value && activeTab !== 'catalog') setActiveTab('catalog');
        if (catalogSearchTimerRef.current) clearTimeout(catalogSearchTimerRef.current);
        if (value.trim().length >= 2) {
            catalogSearchTimerRef.current = setTimeout(() => {
                analyticsService.track('catalog_search', {
                    query: value.trim(),
                    factory_id: factory.id,
                    factory_name: factory.name,
                });
            }, 800);
        }
    };
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [showProductSelector, setShowProductSelector] = useState(false);
    const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());

    // RFQ form state — step 2 inputs per product
    const [rfqStep, setRfqStep] = useState<1 | 2>(1);
    const [rfqInputs, setRfqInputs] = useState<Record<string, { qty: string; targetPrice: string; comments: string }>>({});
    const [isSubmittingRFQ, setIsSubmittingRFQ] = useState(false);
    const [rfqSubmitted, setRfqSubmitted] = useState(false);

    // Migrate old productCategories format so the selector always has a products array
    const catalogProducts = React.useMemo(() => {
        if (!factory.catalog) return [];
        return migrateCatalog(factory.catalog).products || [];
    }, [factory.catalog]);

    // Fetch the heavy fields (gallery, catalog, machine_slots) that are not included
    // in the slim SourcingPage list query, then merge them into local state.
    // Checks sessionStorage cache first (populated by hover-prefetch in SourcingPage)
    // so the detail page renders instantly when the user hovers before clicking.
    useEffect(() => {
        if (!propFactory?.id) return;

        const cacheKey = `garment_erp_factory_detail_${propFactory.id}`;

        const applyData = (data: { gallery: any; catalog: any; machine_slots: any }) => {
            setFactory(prev => ({
                ...prev,
                gallery: data.gallery || [],
                catalog: data.catalog || { products: [], fabricOptions: [] },
                productionLines: data.machine_slots || [],
            }));
        };

        const fetchHeavyFields = () => {
            setIsFetchingDetails(true);
            supabase
                .from('factories')
                .select('gallery, catalog, machine_slots')
                .eq('id', propFactory.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setCache(cacheKey, data);
                        applyData(data);
                    }
                    setIsFetchingDetails(false);
                });
        };

        // Use cached data immediately if available — skips the initial network round-trip.
        // Real-time subscription is still set up so admin edits reflect live.
        const cached = getCache<{ gallery: any; catalog: any; machine_slots: any }>(cacheKey, TTL_FACTORY_DETAIL);
        if (cached) {
            applyData(cached);
        } else {
            fetchHeavyFields();
        }

        // Real-time subscription — reflects admin changes instantly
        const channel = supabase
            .channel(`factory-detail-${propFactory.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'factories',
                filter: `id=eq.${propFactory.id}`,
            }, fetchHeavyFields)
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [propFactory?.id]);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    useEffect(() => {
        if (!isLightboxOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsLightboxOpen(false);
            if (e.key === 'ArrowLeft') setCurrentImageIndex((prev) => (prev - 1 + factory.gallery.length) % factory.gallery.length);
            if (e.key === 'ArrowRight') setCurrentImageIndex((prev) => (prev + 1) % factory.gallery.length);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLightboxOpen, factory]);

    if (!factory) {
        handleSetCurrentPage('sourcing');
        return null;
    }

    const closeRFQModal = () => {
        setShowProductSelector(false);
        setSelectedCatalogIds(new Set());
        setRfqInputs({});
        setRfqStep(1);
        setRfqSubmitted(false);
    };

    const handleGoToStep2 = () => {
        const inputs: Record<string, { qty: string; targetPrice: string; comments: string }> = {};
        catalogProducts.filter(p => selectedCatalogIds.has(p.id)).forEach(product => {
            inputs[product.id] = rfqInputs[product.id] || {
                qty: product.moq ? String(product.moq) : '',
                targetPrice: product.priceRange ? product.priceRange.replace(/[^0-9.]/g, '') : '',
                comments: '',
            };
        });
        setRfqInputs(inputs);
        setRfqStep(2);
    };

    const isStep2Valid = () => catalogProducts
        .filter(p => selectedCatalogIds.has(p.id))
        .every(p => {
            const input = rfqInputs[p.id];
            return input && parseInt(input.qty) > 0;
        });

    const handleSubmitRFQ = async () => {
        if (!onSubmitRFQ) return;
        const selected = catalogProducts.filter(p => selectedCatalogIds.has(p.id));
        const lineItems: LineItem[] = selected.map((product, i) => {
            const input = rfqInputs[product.id] || { qty: '', targetPrice: '', comments: '' };
            return {
                id: Date.now() + i,
                category: product.category || 'T-shirt',
                fabricQuality: product.fabricComposition || '',
                weightGSM: '',
                styleOption: '',
                qty: parseInt(input.qty) || 0,
                containerType: '',
                targetPrice: input.targetPrice || '',
                packagingReqs: '',
                labelingReqs: '',
                sizeRange: [],
                customSize: '',
                sizeRatio: {},
                sleeveOption: '',
                printOption: '',
                trimsAndAccessories: '',
                specialInstructions: input.comments || '',
                quantityType: 'units' as const,
                productImageUrl: product.images?.[0] || '',
                productName: product.name,
            };
        });
        setIsSubmittingRFQ(true);
        const success = await onSubmitRFQ({
            factory: { id: factory.id, name: factory.name, location: factory.location, imageUrl: factory.imageUrl },
            order: { lineItems, shippingCountry: '', shippingPort: '' },
        });
        setIsSubmittingRFQ(false);
        if (success) {
            analyticsService.track('rfq_submit', {
                factory_id: factory.id,
                factory_name: factory.name,
                factory_location: factory.location,
                item_count: lineItems.length,
            });
            setRfqSubmitted(true);
            try {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            } catch (_) {}
            setTimeout(() => {
                closeRFQModal();
                setRfqSubmitted(false);
                handleSetCurrentPage('myQuotes');
            }, 1800);
        }
    };

    const gallery = factory.gallery?.length ? factory.gallery : (factory.imageUrl ? [factory.imageUrl] : []);

    const nextImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % gallery.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex - 1 + gallery.length) % gallery.length);
    };

    const backDest = suggestedFactories.length > 0 ? 'factorySuggestions' : 'sourcing';

    return (
        <MainLayout {...props}>

            {/* ══════════════════════════════════════
                STICKY HEADER — portal into document.body
                Using a portal bypasses any ancestor CSS
                transform (from animate-fade-in) that would
                otherwise re-parent position:fixed elements.
            ══════════════════════════════════════ */}
            {ReactDOM.createPortal(
                <div className="fixed top-0 left-0 md:left-[76px] right-0 z-[45] h-14
                    bg-white/85 dark:bg-[#18171c]/90 backdrop-blur-xl
                    border-b border-gray-200/70 dark:border-white/8
                    flex items-center gap-3 px-4">

                    {/* Back button */}
                    <button
                        onClick={() => handleSetCurrentPage(backDest)}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10
                            flex items-center justify-center
                            hover:bg-gray-200 dark:hover:bg-white/18 active:scale-90
                            transition-all duration-150"
                        aria-label="Go back"
                    >
                        <ChevronLeft size={20} className="text-gray-700 dark:text-white" />
                    </button>

                    {/* Factory name */}
                    <span className="flex-1 min-w-0 font-bold text-sm text-gray-900 dark:text-white truncate">
                        {factory.name}
                    </span>

                    {/* Pill-shaped catalog search */}
                    <div className="relative flex-shrink-0">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={catalogSearch}
                            onChange={e => handleCatalogSearch(e.target.value)}
                            placeholder="Search catalog…"
                            className="w-36 sm:w-52 pl-8 pr-7 py-[7px] text-[13px] rounded-full
                                bg-gray-100 dark:bg-white/10
                                border border-gray-200 dark:border-white/12
                                text-gray-900 dark:text-white
                                placeholder-gray-400 dark:placeholder-gray-500
                                focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/35 focus:border-[#c20c0b]/50
                                transition-all"
                        />
                        {catalogSearch && (
                            <button
                                onClick={() => setCatalogSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* ══════════════════════════════════════
                MOBILE LAYOUT
            ══════════════════════════════════════ */}
            {/* pt-14 = 56px — clears the fixed header */}
            <div className="sm:hidden -mx-3 -mt-3 pt-14">

                {/* ── Hero image — full-bleed, tall ── */}
                <div
                    className="relative h-[60vh] min-h-[260px] cursor-zoom-in"
                    onClick={() => setIsLightboxOpen(true)}
                >
                    <img
                        src={gallery[currentImageIndex]}
                        alt={factory.name}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover"
                    />
                    {/* Gradient overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Gallery prev/next */}
                    {gallery.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </>
                    )}

                    {/* Slide dots */}
                    {gallery.length > 1 && (
                        <div className="absolute bottom-[148px] left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                            {gallery.map((_, i) => (
                                <span
                                    key={i}
                                    className={`block h-[5px] rounded-full transition-all duration-300 ${i === currentImageIndex ? 'w-6 bg-white' : 'w-[5px] bg-white/50'}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Name + rating overlay at bottom of image */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pb-8">
                        <div className="flex items-end justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-[28px] font-black text-white leading-tight tracking-tight drop-shadow-lg">
                                    {factory.name}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <MapPin size={13} className="text-[#ff6b6b] flex-shrink-0" />
                                    <span className="text-[13px] font-medium text-white/85">{factory.location}</span>
                                </div>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-2xl shadow-xl mb-1">
                                <Star size={13} className="fill-current" />
                                <span className="font-black text-[16px] leading-none">{factory.rating}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content sheet — slides up over image ── */}
                <div className="relative -mt-7 rounded-t-[28px] bg-white dark:bg-[#18171c] px-4 pt-3 pb-40">
                    {/* Pull handle */}
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-4" />

                    {/* Badges row */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <TrustTierBadge tier={factory.trustTier} />
                        {factory.rating >= 4.5 && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#c20c0b] text-white text-[10px] font-black uppercase tracking-wider">Top Rated</span>
                        )}
                        {factory.tags?.slice(0, 2).map(tag => {
                            const [text, tagColor] = tag.split(':');
                            return (
                                <span
                                    key={tag}
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${tagColor ? 'border-transparent text-white' : 'bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10'}`}
                                    style={tagColor ? { backgroundColor: tagColor, borderColor: tagColor } : {}}
                                >
                                    {text}
                                </span>
                            );
                        })}
                    </div>

                    {/* ── Key stats row ── */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                        <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 text-center border border-gray-100 dark:border-white/8">
                            <p className="text-[15px] font-black text-gray-900 dark:text-white leading-tight">{factory.minimumOrderQuantity.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Min. Order</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 text-center border border-gray-100 dark:border-white/8">
                            <p className="text-[14px] font-black text-gray-900 dark:text-white leading-tight">{factory.turnaround}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Turnaround</p>
                        </div>
                        {factory.onTimeDeliveryRate !== undefined ? (
                            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 text-center border border-gray-100 dark:border-white/8">
                                <p className={`text-[15px] font-black leading-tight ${factory.onTimeDeliveryRate >= 90 ? 'text-green-600' : factory.onTimeDeliveryRate >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {factory.onTimeDeliveryRate}%
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">On-Time</p>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 text-center border border-gray-100 dark:border-white/8">
                                <p className="text-[15px] font-black text-blue-600 dark:text-blue-400 leading-tight">{factory.completedOrdersCount ?? 0}+</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Orders</p>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-white/8 mb-5" />

                    {/* ── Tab toggle ── */}
                    <div className="flex bg-gray-100 dark:bg-white/8 rounded-2xl p-1 mb-5">
                        <button
                            data-testid="overview-tab"
                            onClick={() => setActiveTab('overview')}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-[#2a2930] text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Overview
                        </button>
                        <button
                            data-testid="catalog-tab"
                            onClick={() => setActiveTab('catalog')}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'catalog' ? 'bg-white dark:bg-[#2a2930] text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Catalog
                        </button>
                    </div>

                    {/* ── Tab content ── */}
                    {activeTab === 'overview' ? (
                        <div className="space-y-5">
                            {/* About */}
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">About</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{factory.description}</p>
                            </div>

                            {/* Specialties */}
                            {(factory.specialties?.length ?? 0) > 0 && (
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">Specialties</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {factory.specialties.map(s => (
                                            <span key={s} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 font-semibold">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Certifications */}
                            {(factory.certifications?.length ?? 0) > 0 && (
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                                        <ShieldCheck size={13} className="text-[#c20c0b]" /> Certifications
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {factory.certifications!.map(cert => <CertificationBadge key={cert} cert={cert} />)}
                                    </div>
                                </div>
                            )}

                            {/* Performance */}
                            {factory.onTimeDeliveryRate !== undefined && (
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                                        <TrendingUp size={13} className="text-[#c20c0b]" /> Performance
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 text-center">
                                            <p className={`text-xl font-black ${factory.onTimeDeliveryRate >= 90 ? 'text-green-600' : 'text-yellow-500'}`}>{factory.onTimeDeliveryRate}%</p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">On-Time Delivery</p>
                                        </div>
                                        {factory.qualityRejectionRate !== undefined && (
                                            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 text-center">
                                                <p className={`text-xl font-black ${factory.qualityRejectionRate <= 2 ? 'text-green-600' : 'text-yellow-500'}`}>{factory.qualityRejectionRate}%</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Quality Rejection</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Production lines */}
                            {isFetchingDetails && (!factory.productionLines || factory.productionLines.length === 0) ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                                    <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl w-full border border-gray-100 dark:border-white/10"></div>
                                </div>
                            ) : (
                                (factory.productionLines?.length ?? 0) > 0 && (
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                                            <Activity size={13} className="text-[#c20c0b]" /> Production Lines
                                        </h3>
                                        <ProductionFloorLayout lines={factory.productionLines || []} />
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        isFetchingDetails && (!factory.catalog?.products?.length && !factory.catalog?.fabricOptions?.length) ? (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="animate-pulse bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
                                        <div className="h-32 bg-gray-200 dark:bg-gray-800 w-full"></div>
                                        <div className="p-3 space-y-2.5">
                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                            <div className="border-t border-gray-200 dark:border-gray-700 my-1.5"></div>
                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ProductCatalog catalog={factory.catalog} externalSearch={catalogSearch} onItemView={p => analyticsService.track('catalog_item_select', { factory_id: factory.id, factory_name: factory.name, item_id: p.id, item_name: p.name, item_category: p.category })} />
                        )
                    )}
                </div>

                {/* ── Fixed bottom CTA ── */}
                <div
                    className="fixed left-0 right-0 z-30 px-4 pb-2"
                    style={{ bottom: 'calc(env(safe-area-inset-bottom) + 82px)' }}
                >
                    <button
                        data-testid="request-quote-button"
                        onClick={() => setShowProductSelector(true)}
                        className="w-full py-3.5 rounded-2xl bg-[#c20c0b] font-bold text-sm text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                        style={{ boxShadow: '0 4px 20px rgba(194,12,11,0.4)' }}
                    >
                        Request Quote <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════
                DESKTOP LAYOUT
            ══════════════════════════════════════ */}
            {/* pt-20 = 80px — clears the 56px fixed header with breathing room */}
            <div className="hidden sm:block max-w-6xl mx-auto space-y-6 pt-20">

                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
                    {/* Hero Image */}
                    <div className="relative h-96 md:h-[500px] group cursor-zoom-in" onClick={() => setIsLightboxOpen(true)}>
                        <img src={gallery[currentImageIndex]} alt={factory.name} loading="eager" decoding="async" className="w-full h-full object-cover transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-md text-white p-2 rounded-full border border-white/10 z-20">
                            <ZoomIn size={20} />
                        </div>
                        {gallery.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-all opacity-0 group-hover:opacity-100 border border-white/10 cursor-pointer">
                                    <ChevronLeft size={24} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-all opacity-0 group-hover:opacity-100 border border-white/10 cursor-pointer">
                                    <ChevronRight size={24} />
                                </button>
                                <div className="absolute bottom-6 right-6 flex space-x-2">
                                    {gallery.map((_, index) => (
                                        <button key={index} onClick={() => setCurrentImageIndex(index)} className={`w-2 h-2 rounded-full transition-all cursor-pointer ${index === currentImageIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`} />
                                    ))}
                                </div>
                            </>
                        )}
                        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{factory.name}</h1>
                                        {factory.rating >= 4.5 && <span className="px-2 py-0.5 rounded bg-[#c20c0b] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">Top Rated</span>}
                                        <TrustTierBadge tier={factory.trustTier} />
                                    </div>
                                    <p className="text-gray-200 flex items-center text-base font-medium">
                                        <MapPin size={18} className="mr-1.5 text-[#c20c0b]" /> {factory.location}
                                    </p>
                                </div>
                                <div className="flex items-center bg-green-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-lg border border-white/10">
                                    <span className="font-bold text-2xl mr-1.5">{factory.rating}</span>
                                    <div className="flex flex-col leading-none">
                                        <Star size={14} className="fill-current mb-0.5" />
                                        <span className="text-[10px] opacity-90 font-medium">Quality Score</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-white/10 px-6 md:px-8">
                        <div className="flex space-x-8">
                            <button data-testid="overview-tab" onClick={() => setActiveTab('overview')} className={`py-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'overview' ? 'border-[#c20c0b] text-[#c20c0b]' : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-white'}`}>Overview</button>
                            <button data-testid="catalog-tab" onClick={() => setActiveTab('catalog')} className={`py-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'catalog' ? 'border-[#c20c0b] text-[#c20c0b]' : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-white'}`}>Product Catalog</button>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        {activeTab === 'overview' ? (
                            <>
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {factory.tags?.map(tag => {
                                        const [text, tagColor] = tag.split(':');
                                        return (
                                            <span key={tag} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${tagColor ? 'border-transparent' : text === 'Prime' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' : text === 'Sustainable' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`} style={tagColor ? { backgroundColor: tagColor, color: '#fff', borderColor: tagColor } : {}}>{text}</span>
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About Factory</h3>
                                            <p className="text-gray-600 dark:text-gray-200 leading-relaxed">{factory.description}</p>
                                        </div>
                                        {factory.onTimeDeliveryRate !== undefined && (
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-[#c20c0b]" /> Performance Metrics</h3>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-white/10 text-center">
                                                        <div className={`text-2xl font-bold ${factory.onTimeDeliveryRate >= 90 ? 'text-green-600' : factory.onTimeDeliveryRate >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{factory.onTimeDeliveryRate}%</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">On-Time Delivery</div>
                                                        {factory.onTimeDeliveryRate >= 90 ? <CheckCircle2 size={14} className="text-green-500 mx-auto mt-1" /> : <AlertCircle size={14} className="text-yellow-500 mx-auto mt-1" />}
                                                    </div>
                                                    {factory.qualityRejectionRate !== undefined && (
                                                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-white/10 text-center">
                                                            <div className={`text-2xl font-bold ${factory.qualityRejectionRate <= 2 ? 'text-green-600' : factory.qualityRejectionRate <= 5 ? 'text-yellow-500' : 'text-red-500'}`}>{factory.qualityRejectionRate}%</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Quality Rejection</div>
                                                            {factory.qualityRejectionRate <= 2 ? <CheckCircle2 size={14} className="text-green-500 mx-auto mt-1" /> : <AlertCircle size={14} className="text-yellow-500 mx-auto mt-1" />}
                                                        </div>
                                                    )}
                                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-white/10 text-center">
                                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{factory.completedOrdersCount ?? 0}+</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Completed Orders</div>
                                                        <TrustTierBadge tier={factory.trustTier} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {/* Production Floor Layout */}
                                        {isFetchingDetails && (!factory.productionLines || factory.productionLines.length === 0) ? (
                                            <div className="animate-pulse space-y-4">
                                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
                                                <div className="h-48 bg-gray-100 dark:bg-gray-800/50 rounded-xl w-full border border-gray-200 dark:border-white/10"></div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-[#c20c0b]" /> Production Lines</h3>
                                                <ProductionFloorLayout lines={factory.productionLines || []} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-white/10">
                                            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Key Stats</h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500 dark:text-gray-200">Min. Order Qty</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{factory.minimumOrderQuantity.toLocaleString()} units</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500 dark:text-gray-200">Turnaround</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{factory.turnaround}</span>
                                                </div>
                                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-200 uppercase tracking-wider block mb-2">Specialties</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {factory.specialties.map(s => (
                                                            <span key={s} className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-200 font-medium">{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-white/10">
                                            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldCheck size={14} /> Certifications</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {factory.certifications?.map(cert => <CertificationBadge key={cert} cert={cert} />)}
                                            </div>
                                        </div>
                                        <button data-testid="view-catalog-button" onClick={() => setActiveTab('catalog')} className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center justify-center gap-2 group cursor-pointer">
                                            <BookOpen size={18} className="group-hover:text-[#c20c0b] transition-colors" /> View Product Catalog
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            isFetchingDetails && (!factory.catalog?.products?.length && !factory.catalog?.fabricOptions?.length) ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-4">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="animate-pulse bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                                            <div className="h-48 bg-gray-200 dark:bg-gray-800 w-full"></div>
                                            <div className="p-4 space-y-3">
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                                <div className="border-t border-gray-100 dark:border-gray-800 my-2"></div>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <ProductCatalog catalog={factory.catalog} externalSearch={catalogSearch} onItemView={p => analyticsService.track('catalog_item_select', { factory_id: factory.id, factory_name: factory.name, item_id: p.id, item_name: p.name, item_category: p.category })} />
                            )
                        )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/10 p-6 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">Interested in this factory?</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-200">Select products from the catalog and request a quote.</p>
                            </div>
                            <button data-testid="request-quote-button" data-tour-id="factory-rfq-btn" onClick={() => setShowProductSelector(true)} className="px-6 py-3 bg-[#c20c0b] text-white font-bold rounded-xl hover:bg-[#a50a09] transition-colors shadow-md flex items-center justify-center gap-2">Request Quote <ChevronRight size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── RFQ Modal (2-step) ── */}
            {showProductSelector && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 z-[90] flex flex-col items-end sm:items-center justify-end sm:justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) closeRFQModal(); }}
                >
                    {/* Panel */}
                    <div className="flex flex-col w-full sm:w-[600px] max-h-[92vh] sm:max-h-[86vh] rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1c1b22] shadow-2xl overflow-hidden">

                        {/* Pull handle (mobile only) */}
                        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                            <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>

                        {/* ─── STEP INDICATOR ─── */}
                        <div className="flex-shrink-0 px-5 pt-4 pb-3">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {rfqStep === 2 && (
                                        <button
                                            data-testid="rfq-back-button"
                                            onClick={() => setRfqStep(1)}
                                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/18 transition-all active:scale-90"
                                        >
                                            <ChevronLeft size={16} className="text-gray-700 dark:text-white" />
                                        </button>
                                    )}
                                    <div>
                                        <h2 className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight">
                                            {rfqStep === 1 ? 'Select Products' : 'Quote Details'}
                                        </h2>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{factory.name}</p>
                                    </div>
                                </div>
                                <button
                                    data-testid="close-rfq-modal-button"
                                    onClick={closeRFQModal}
                                    className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/18 transition-all active:scale-90 flex-shrink-0"
                                >
                                    <X size={16} className="text-gray-700 dark:text-white" />
                                </button>
                            </div>
                            {/* Step pills */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 flex-1">
                                    <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all ${rfqStep >= 1 ? 'bg-[#c20c0b] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                        {rfqStep > 1 ? <Check size={10} /> : '1'}
                                    </div>
                                    <span className={`text-xs font-semibold transition-colors ${rfqStep === 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>Select Products</span>
                                </div>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 mx-1" />
                                <div className="flex items-center gap-1.5 flex-1 justify-end">
                                    <span className={`text-xs font-semibold transition-colors ${rfqStep === 2 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>Quote Details</span>
                                    <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all ${rfqStep >= 2 ? 'bg-[#c20c0b] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>2</div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-white/8 flex-shrink-0" />

                        {/* ─── STEP 1: Product Grid ─── */}
                        {rfqStep === 1 && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 pb-2">
                                    {isFetchingDetails && catalogProducts.length === 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <div key={i} className="animate-pulse rounded-2xl border border-gray-100 dark:border-white/8 overflow-hidden">
                                                    <div className="h-32 bg-gray-200 dark:bg-gray-800" />
                                                    <div className="p-3 space-y-2">
                                                        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : catalogProducts.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                                                <Package size={28} className="text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">No products in catalog</p>
                                            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">You can still submit a custom quote request.</p>
                                            <button
                                                onClick={() => { closeRFQModal(); handleSetCurrentPage('orderForm', { factory, lineItems: [] }); }}
                                                className="px-6 py-3 bg-[#c20c0b] text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform"
                                                style={{ boxShadow: '0 4px 16px rgba(194,12,11,0.3)' }}
                                            >
                                                Continue to Quote Form
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 font-medium">
                                                Tap products to include them in your quote
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {catalogProducts.map(product => {
                                                    const isSelected = selectedCatalogIds.has(product.id);
                                                    return (
                                                        <button
                                                            key={product.id}
                                                            data-testid={`select-product-${product.id}`}
                                                            onClick={() => setSelectedCatalogIds(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(product.id)) {
                                                                    next.delete(product.id);
                                                                } else {
                                                                    next.add(product.id);
                                                                    analyticsService.track('catalog_item_select', {
                                                                        factory_id: factory.id,
                                                                        factory_name: factory.name,
                                                                        item_id: product.id,
                                                                        item_name: product.name,
                                                                        item_category: product.category,
                                                                    });
                                                                }
                                                                return next;
                                                            })}
                                                            className={`relative rounded-2xl text-left transition-all duration-200 active:scale-[0.97] ${
                                                                isSelected
                                                                    ? 'ring-2 ring-[#c20c0b] shadow-lg shadow-red-100 dark:shadow-red-900/20'
                                                                    : 'ring-1 ring-gray-200 dark:ring-white/10 hover:ring-gray-300 dark:hover:ring-white/20 hover:shadow-md'
                                                            }`}
                                                        >
                                                            {/* Image */}
                                                            <div className="relative h-32 rounded-t-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                                {product.images?.[0] ? (
                                                                    <img src={product.images[0]} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Package size={28} className="text-gray-300 dark:text-gray-600" />
                                                                    </div>
                                                                )}
                                                                {isSelected && <div className="absolute inset-0 bg-[#c20c0b]/12" />}
                                                                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                                                                    isSelected ? 'bg-[#c20c0b] shadow-md scale-100' : 'bg-white/80 dark:bg-black/50 scale-90 opacity-70'
                                                                }`}>
                                                                    <Check size={12} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                                                </div>
                                                            </div>
                                                            {/* Info */}
                                                            <div className={`p-3 rounded-b-2xl transition-colors ${isSelected ? 'bg-red-50 dark:bg-[#c20c0b]/10' : 'bg-white dark:bg-[#26252d]'}`}>
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider leading-none">{product.category}</p>
                                                                <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight mt-1 line-clamp-2">{product.name}</p>
                                                                <div className="flex items-center justify-between mt-1.5 gap-1">
                                                                    {product.moq && (
                                                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">MOQ {product.moq.toLocaleString()}</p>
                                                                    )}
                                                                    {product.priceRange && (
                                                                        <p className="text-[11px] font-bold text-[#c20c0b] ml-auto">{product.priceRange}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {catalogProducts.length > 0 && (
                                    <div
                                        className="flex-shrink-0 px-4 pt-3 pb-safe border-t border-gray-100 dark:border-white/8"
                                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
                                    >
                                        {selectedCatalogIds.size > 0 && (
                                            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                                                {selectedCatalogIds.size} product{selectedCatalogIds.size !== 1 ? 's' : ''} selected
                                            </p>
                                        )}
                                        <button
                                            data-testid="rfq-continue-button"
                                            onClick={handleGoToStep2}
                                            disabled={selectedCatalogIds.size === 0}
                                            className="w-full py-4 rounded-2xl bg-[#c20c0b] text-white font-bold text-[15px] disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                                            style={selectedCatalogIds.size > 0 ? { boxShadow: '0 4px 20px rgba(194,12,11,0.4)' } : {}}
                                        >
                                            {selectedCatalogIds.size === 0
                                                ? 'Select at least one product'
                                                : <>Continue <ChevronRight size={18} /></>}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ─── STEP 2: Quote Details Form ─── */}
                        {rfqStep === 2 && (
                            <>
                                <div className="flex-1 overflow-y-auto">
                                    <div className="p-4 space-y-4">
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                            Fill in the details for each product. Quantity is required.
                                        </p>

                                        {catalogProducts.filter(p => selectedCatalogIds.has(p.id)).map((product, idx) => {
                                            const input = rfqInputs[product.id] || { qty: '', targetPrice: '', comments: '' };
                                            const update = (field: string, value: string) =>
                                                setRfqInputs(prev => ({ ...prev, [product.id]: { ...prev[product.id], [field]: value } }));
                                            const hasQty = parseInt(input.qty) > 0;

                                            return (
                                                <div
                                                    key={product.id}
                                                    className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#26252d] shadow-sm"
                                                >
                                                    {/* Product header */}
                                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.04] border-b border-gray-100 dark:border-white/8">
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                                            {product.images?.[0] ? (
                                                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Package size={16} className="text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{product.category}</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{product.name}</p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${hasQty ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                                            {hasQty ? <Check size={10} /> : idx + 1}
                                                        </div>
                                                    </div>

                                                    {/* Inputs */}
                                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {/* Quantity — required */}
                                                        <div className="sm:col-span-2 md:col-span-1">
                                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                                                                <Package size={11} className="text-gray-400" />
                                                                Quantity
                                                                <span className="text-[#c20c0b] ml-0.5">*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    data-testid={`rfq-qty-${product.id}`}
                                                                    type="number"
                                                                    min={1}
                                                                    placeholder={product.moq ? `Min. ${product.moq.toLocaleString()} units` : 'Enter quantity'}
                                                                    value={input.qty}
                                                                    onChange={e => update('qty', e.target.value)}
                                                                    className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#1c1b22] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all ${
                                                                        hasQty
                                                                            ? 'border-green-300 dark:border-green-700 focus:ring-green-500/20'
                                                                            : 'border-gray-200 dark:border-white/12 focus:ring-[#c20c0b]/25 focus:border-[#c20c0b]/50'
                                                                    }`}
                                                                />
                                                                {input.qty && (
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">units</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Target Price — optional */}
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                                                                <DollarSign size={11} className="text-gray-400" />
                                                                Target Price
                                                                <span className="text-gray-400 dark:text-gray-500 font-normal text-[10px] ml-1">(optional)</span>
                                                            </label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-medium pointer-events-none">$</span>
                                                                <input
                                                                    data-testid={`rfq-price-${product.id}`}
                                                                    type="text"
                                                                    placeholder={product.priceRange ? product.priceRange.replace(/[^0-9.-]/g, '') : '0.00'}
                                                                    value={input.targetPrice}
                                                                    onChange={e => update('targetPrice', e.target.value)}
                                                                    className="w-full pl-7 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/12 bg-white dark:bg-[#1c1b22] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/25 focus:border-[#c20c0b]/50 transition-all"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Comments — optional, full width */}
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                                                                <MessageSquare size={11} className="text-gray-400" />
                                                                Comments
                                                                <span className="text-gray-400 dark:text-gray-500 font-normal text-[10px] ml-1">(optional)</span>
                                                            </label>
                                                            <textarea
                                                                data-testid={`rfq-comments-${product.id}`}
                                                                rows={2}
                                                                placeholder="Any special requirements, fabric preferences, or notes for this product…"
                                                                value={input.comments}
                                                                onChange={e => update('comments', e.target.value)}
                                                                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/12 bg-white dark:bg-[#1c1b22] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/25 focus:border-[#c20c0b]/50 transition-all resize-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Submit button */}
                                <div
                                    className="flex-shrink-0 px-4 pt-3 border-t border-gray-100 dark:border-white/8 bg-gray-50/50 dark:bg-white/[0.02]"
                                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
                                >
                                    {!isStep2Valid() && (
                                        <p className="text-center text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">
                                            Please enter a quantity for each product
                                        </p>
                                    )}
                                    <button
                                        data-testid="submit-rfq-button"
                                        onClick={handleSubmitRFQ}
                                        disabled={!isStep2Valid() || isSubmittingRFQ || rfqSubmitted || !onSubmitRFQ}
                                        className={`w-full py-4 rounded-2xl font-bold text-[15px] disabled:cursor-not-allowed active:scale-[0.97] transition-all flex items-center justify-center gap-2 ${
                                            rfqSubmitted
                                                ? 'bg-green-500 text-white'
                                                : 'bg-[#c20c0b] text-white disabled:opacity-40'
                                        }`}
                                        style={rfqSubmitted ? { boxShadow: '0 4px 20px rgba(34,197,94,0.4)' } : isStep2Valid() && !isSubmittingRFQ ? { boxShadow: '0 4px 20px rgba(194,12,11,0.4)' } : {}}
                                    >
                                        {rfqSubmitted ? (
                                            <><CheckCircle2 size={18} /> Quote Submitted!</>
                                        ) : isSubmittingRFQ ? (
                                            <><Loader size={18} className="animate-spin" /> Submitting…</>
                                        ) : (
                                            <><Send size={16} /> Submit Quote Request</>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* ── Lightbox (shared mobile + desktop) ── */}
            {isLightboxOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setIsLightboxOpen(false)}>
                    <button onClick={() => setIsLightboxOpen(false)} className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50">
                        <X size={32} />
                    </button>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        {gallery.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all border border-white/10 backdrop-blur-sm group cursor-pointer">
                                    <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all border border-white/10 backdrop-blur-sm group cursor-pointer">
                                    <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </>
                        )}
                        <img src={gallery[currentImageIndex]} alt={factory.name} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none" />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                            {gallery.map((_, index) => (
                                <button key={index} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }} className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`} />
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </MainLayout>
    );
};