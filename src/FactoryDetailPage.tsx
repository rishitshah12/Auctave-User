import React, { FC, useState, useEffect } from 'react';
import {
    Star, MapPin, ChevronLeft, ChevronRight, BookOpen, Activity, ShieldCheck, X, ZoomIn, TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react';
import { MainLayout } from '../src/MainLayout';
import { Factory } from '../src/types';
import { TrustTierBadge } from '../src/FactoryCard';
import ProductCatalog from '../src/ProductCatalog';
import ProductionFloorLayout from '../src/ProductionFloorLayout';
import { factoryService } from '../src/factory.service';
import { supabase } from '../src/supabaseClient';

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
    const { selectedFactory: propFactory, handleSetCurrentPage, suggestedFactories, initialTab = 'overview' } = props;
    const [factory, setFactory] = useState<Factory>(propFactory);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'overview' | 'catalog'>(initialTab);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    // Fetch fresh data on mount and subscribe to real-time updates
    useEffect(() => {
        if (!propFactory?.id) return;

        // Initial fresh fetch
        factoryService.getById(propFactory.id).then(({ data }) => {
            if (data) setFactory(data);
        });

        // Real-time subscription — reflects admin changes instantly
        const channel = supabase
            .channel(`factory-detail-${propFactory.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'factories',
                filter: `id=eq.${propFactory.id}`,
            }, () => {
                factoryService.getById(propFactory.id).then(({ data }) => {
                    if (data) setFactory(data);
                });
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [propFactory?.id]);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

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

    const { gallery } = factory;

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
                MOBILE LAYOUT
            ══════════════════════════════════════ */}
            <div className="sm:hidden -mx-3 -mt-3">

                {/* ── Hero image — full-bleed, tall ── */}
                <div
                    className="relative h-[60vh] min-h-[260px] cursor-zoom-in"
                    onClick={() => setIsLightboxOpen(true)}
                >
                    <img
                        src={gallery[currentImageIndex]}
                        alt={factory.name}
                        className="w-full h-full object-cover"
                    />
                    {/* Gradient overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/35 pointer-events-none" />

                    {/* Back button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSetCurrentPage(backDest); }}
                        className="absolute top-5 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform z-10"
                    >
                        <ChevronLeft size={22} />
                    </button>

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
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
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
                            onClick={() => setActiveTab('overview')}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-[#2a2930] text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Overview
                        </button>
                        <button
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
                            {(factory.productionLines?.length ?? 0) > 0 && (
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                                        <Activity size={13} className="text-[#c20c0b]" /> Production Lines
                                    </h3>
                                    <ProductionFloorLayout lines={factory.productionLines || []} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <ProductCatalog catalog={factory.catalog} />
                    )}
                </div>

                {/* ── Fixed bottom CTA ── */}
                <div
                    className="fixed left-0 right-0 z-30 px-4 pb-2"
                    style={{ bottom: 'calc(env(safe-area-inset-bottom) + 82px)' }}
                >
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSetCurrentPage('factoryTools', factory)}
                            className="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-white/8 font-bold text-sm text-gray-700 dark:text-white shadow-lg active:scale-95 transition-transform"
                        >
                            AI Tools
                        </button>
                        <button
                            onClick={() => handleSetCurrentPage('quoteRequest', factory)}
                            className="flex-1 py-3.5 rounded-2xl bg-[#c20c0b] font-bold text-sm text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                            style={{ boxShadow: '0 4px 20px rgba(194,12,11,0.4)' }}
                        >
                            Request Quote <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════
                DESKTOP LAYOUT (unchanged)
            ══════════════════════════════════════ */}
            <div className="hidden sm:block max-w-6xl mx-auto space-y-6">
                <button onClick={() => handleSetCurrentPage(backDest)} className="group flex items-center text-gray-500 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors mb-2">
                    <div className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 mr-3 shadow-sm transition-all">
                        <ChevronLeft size={18} />
                    </div>
                    <span className="font-medium">Back to Factories</span>
                </button>

                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
                    {/* Hero Image */}
                    <div className="relative h-96 md:h-[500px] group cursor-zoom-in" onClick={() => setIsLightboxOpen(true)}>
                        <img src={gallery[currentImageIndex]} alt={factory.name} className="w-full h-full object-cover transition-transform duration-700" />
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
                            <button onClick={() => setActiveTab('overview')} className={`py-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'overview' ? 'border-[#c20c0b] text-[#c20c0b]' : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-white'}`}>Overview</button>
                            <button onClick={() => setActiveTab('catalog')} className={`py-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'catalog' ? 'border-[#c20c0b] text-[#c20c0b]' : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-white'}`}>Product Catalog</button>
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
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-[#c20c0b]" /> Production Lines</h3>
                                            <ProductionFloorLayout lines={factory.productionLines || []} />
                                        </div>
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
                                        <button onClick={() => setActiveTab('catalog')} className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center justify-center gap-2 group cursor-pointer">
                                            <BookOpen size={18} className="group-hover:text-[#c20c0b] transition-colors" /> View Product Catalog
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <ProductCatalog catalog={factory.catalog} />
                        )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/10 p-6 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">Interested in this factory?</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-200">Start a conversation or get an AI-assisted brief.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleSetCurrentPage('factoryTools', factory)} className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-white font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">AI Tools</button>
                                <button onClick={() => handleSetCurrentPage('quoteRequest', factory)} className="px-6 py-3 bg-[#c20c0b] text-white font-bold rounded-xl hover:bg-[#a50a09] transition-colors shadow-md flex items-center justify-center gap-2">Request Quote <ChevronRight size={18} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Lightbox (shared mobile + desktop) ── */}
            {isLightboxOpen && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsLightboxOpen(false)}>
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
                </div>
            )}
        </MainLayout>
    );
};