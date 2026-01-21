import React, { FC, useState, useEffect } from 'react';
import {
    Star, MapPin, ChevronLeft, ChevronRight, BookOpen, Activity, ShieldCheck, LayoutGrid, Scroll, X, ZoomIn
} from 'lucide-react';
import { MainLayout } from '../src/MainLayout';
import { Factory, MachineSlot } from '../src/types';

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

const MachineSlotRow: FC<{ slot: MachineSlot }> = ({ slot }) => {
    const usagePercentage = (slot.availableSlots / slot.totalSlots) * 100;
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{slot.machineType}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                <div className="flex items-center">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                        <div className="bg-[#c20c0b] h-2 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                    </div>
                    <span className="font-medium">{slot.availableSlots}/{slot.totalSlots}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">{slot.nextAvailable}</td>
        </tr>
    )
}

export const FactoryDetailPage: FC<FactoryDetailPageProps> = (props) => {
    const { selectedFactory, handleSetCurrentPage, suggestedFactories, initialTab = 'overview' } = props;
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'overview' | 'catalog'>(initialTab);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (!isLightboxOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsLightboxOpen(false);
            if (e.key === 'ArrowLeft') setCurrentImageIndex((prev) => (prev - 1 + selectedFactory.gallery.length) % selectedFactory.gallery.length);
            if (e.key === 'ArrowRight') setCurrentImageIndex((prev) => (prev + 1) % selectedFactory.gallery.length);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLightboxOpen, selectedFactory]);

    if (!selectedFactory) {
        handleSetCurrentPage('sourcing');
        return null;
    }

    const { gallery } = selectedFactory;

    const nextImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % gallery.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex - 1 + gallery.length) % gallery.length);
    };

    return (
        <MainLayout {...props}>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Navigation */}
                <button onClick={() => handleSetCurrentPage(suggestedFactories.length > 0 ? 'factorySuggestions' : 'sourcing')} className="group flex items-center text-gray-500 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors mb-2">
                    <div className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 mr-3 shadow-sm transition-all">
                        <ChevronLeft size={18} />
                    </div>
                    <span className="font-medium">Back to Factories</span>
                </button>

                <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
                    {/* Hero Image Section */}
                    <div 
                        className="relative h-96 md:h-[500px] group cursor-zoom-in"
                        onClick={() => setIsLightboxOpen(true)}
                    >
                        <img 
                            src={gallery[currentImageIndex]} 
                            alt={selectedFactory.name} 
                            className="w-full h-full object-cover transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                        
                        {/* Zoom Hint */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-md text-white p-2 rounded-full border border-white/10 z-20">
                            <ZoomIn size={20} />
                        </div>
                        
                        {/* Gallery Navigation */}
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
                                        <button key={index} onClick={() => setCurrentImageIndex(index)} className={`w-2 h-2 rounded-full transition-all cursor-pointer ${index === currentImageIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}></button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Hero Content Overlay */}
                        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{selectedFactory.name}</h1>
                                        {selectedFactory.rating >= 4.5 && (
                                            <span className="px-2 py-0.5 rounded bg-[#c20c0b] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">Top Rated</span>
                                        )}
                                    </div>
                                    <p className="text-gray-200 flex items-center text-sm md:text-base font-medium">
                                        <MapPin size={18} className="mr-1.5 text-[#c20c0b]" /> {selectedFactory.location}
                                    </p>
                                </div>
                                <div className="flex items-center bg-green-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-lg border border-white/10">
                                    <span className="font-bold text-2xl mr-1.5">{selectedFactory.rating}</span>
                                    <div className="flex flex-col leading-none">
                                        <Star size={14} className="fill-current mb-0.5" />
                                        <span className="text-[10px] opacity-90 font-medium">Quality Score</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 dark:border-white/10 px-6 md:px-8">
                        <div className="flex space-x-8">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`py-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'overview' ? 'border-[#c20c0b] text-[#c20c0b]' : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-white'}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('catalog')}
                                className={`py-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'catalog' ? 'border-[#c20c0b] text-[#c20c0b]' : 'border-transparent text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-white'}`}
                            >
                                Product Catalog
                            </button>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        {activeTab === 'overview' ? (
                            <>
                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {selectedFactory.tags?.map(tag => (
                                        <span key={tag} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                                            tag === 'Prime' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
                                            tag === 'Sustainable' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                                            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                                        }`}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Info Column */}
                            <div className="lg:col-span-2 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About Factory</h3>
                                    <p className="text-gray-600 dark:text-gray-200 leading-relaxed text-sm md:text-base">{selectedFactory.description}</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Activity size={20} className="text-[#c20c0b]"/> Production Capacity
                                    </h3>
                                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                                            <thead className="bg-gray-50 dark:bg-gray-800">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-200 uppercase tracking-wider">Machine</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-200 uppercase tracking-wider">Availability</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-200 uppercase tracking-wider">Next Slot</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-200 dark:divide-white/10">
                                                {selectedFactory.machineSlots.map(slot => (
                                                    <MachineSlotRow key={slot.machineType} slot={slot} />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Column */}
                            <div className="space-y-6">
                                {/* Key Stats Card */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-white/10">
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Key Stats</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500 dark:text-gray-200">Min. Order Qty</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{selectedFactory.minimumOrderQuantity.toLocaleString()} units</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500 dark:text-gray-200">Turnaround</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{selectedFactory.turnaround}</span>
                                        </div>
                                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-200 uppercase tracking-wider block mb-2">Specialties</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedFactory.specialties.map(s => (
                                                    <span key={s} className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-200 font-medium">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Certifications Card */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-white/10">
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <ShieldCheck size={14}/> Certifications
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFactory.certifications?.map(cert => <CertificationBadge key={cert} cert={cert} />)}
                                    </div>
                                </div>
                                
                                <button onClick={() => setActiveTab('catalog')} className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center justify-center gap-2 group cursor-pointer">
                                    <BookOpen size={18} className="group-hover:text-[#c20c0b] transition-colors" /> View Product Catalog
                                </button>
                            </div>
                        </div>
                            </>
                        ) : (
                            <div className="space-y-8 animate-fade-in">
                                {/* Categories */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-white/10">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <LayoutGrid size={20} className="text-[#c20c0b]" /> Product Categories
                                    </h3>
                                    {selectedFactory.catalog.productCategories.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {selectedFactory.catalog.productCategories.map((category, index) => (
                                                <div key={index} className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                                    <div className="aspect-[4/3] overflow-hidden">
                                                        <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                                    </div>
                                                    <div className="absolute bottom-0 left-0 p-4 w-full">
                                                        <h4 className="text-white font-bold text-lg">{category.name}</h4>
                                                        <p className="text-gray-200 text-xs mt-1 line-clamp-2">{category.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-200">No categories available.</div>
                                    )}
                                </div>

                                {/* Fabrics */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-white/10">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Scroll size={20} className="text-[#c20c0b]" /> Fabric Options
                                    </h3>
                                    {selectedFactory.catalog.fabricOptions.length > 0 ? (
                                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                                                <thead className="bg-white dark:bg-gray-900/40">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-200 uppercase tracking-wider">Fabric Name</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-200 uppercase tracking-wider">Composition</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-200 uppercase tracking-wider">Best For</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-200 dark:divide-white/10">
                                                    {selectedFactory.catalog.fabricOptions.map((fabric, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{fabric.name}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-200">{fabric.composition}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-200">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                    {fabric.useCases}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-200">No fabric options listed.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Action Bar */}
                    <div className="border-t border-gray-200 dark:border-white/10 p-6 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">Interested in this factory?</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-200">Start a conversation or get an AI-assisted brief.</p>
                        </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button onClick={() => handleSetCurrentPage('factoryTools', selectedFactory)} className="flex-1 sm:flex-none px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-white font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                                    AI Tools
                            </button>
                                <button onClick={() => handleSetCurrentPage('quoteRequest', selectedFactory)} className="flex-1 sm:flex-none px-6 py-3 bg-[#c20c0b] text-white font-bold rounded-xl hover:bg-[#a50a09] transition-colors shadow-md flex items-center justify-center gap-2">
                                    Request Quote <ChevronRight size={18} />
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
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
                        <img src={gallery[currentImageIndex]} alt={selectedFactory.name} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none" />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                            {gallery.map((_, index) => (
                                <button key={index} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }} className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}></button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};