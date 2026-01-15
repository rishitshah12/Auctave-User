import React, { FC, useState } from 'react';
import {
    Star, MapPin, ChevronLeft, ChevronRight, BookOpen
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
}

const CertificationBadge: FC<{ cert: string }> = ({ cert }) => {
    const certStyles: { [key: string]: string } = {
        'Sedex': 'bg-blue-100 text-blue-800',
        'Oeko-Tex Standard 100': 'bg-green-100 text-green-800',
        'BCI': 'bg-yellow-100 text-yellow-800',
        'WRAP': 'bg-indigo-100 text-indigo-800',
        'ISO 9001': 'bg-red-100 text-red-800'
    };
    return <span className={`text-sm font-semibold px-3 py-1 rounded-full ${certStyles[cert] || 'bg-gray-100 text-gray-800'}`}>{cert}</span>
}

const MachineSlotRow: FC<{ slot: MachineSlot }> = ({ slot }) => {
    const usagePercentage = (slot.availableSlots / slot.totalSlots) * 100;
    return (
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.machineType}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                    </div>
                    <span>{slot.availableSlots}/{slot.totalSlots}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{slot.nextAvailable}</td>
        </tr>
    )
}

export const FactoryDetailPage: FC<FactoryDetailPageProps> = (props) => {
    const { selectedFactory, handleSetCurrentPage, suggestedFactories } = props;
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
            <div className="space-y-6">
                <div>
                    <button onClick={() => handleSetCurrentPage(suggestedFactories.length > 0 ? 'factorySuggestions' : 'sourcing')} className="text-[#c20c0b] font-semibold mb-4 flex items-center hover:underline">
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Back to Factories
                    </button>
                </div>
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Image Gallery */}
                    <div className="relative">
                        <img className="h-64 md:h-96 w-full object-cover transition-opacity duration-300" src={gallery[currentImageIndex]} alt={`${selectedFactory.name} gallery image ${currentImageIndex + 1}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                        {gallery.length > 1 && (
                            <>
                                <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white p-2 rounded-full shadow-md transition">
                                    <ChevronLeft className="h-6 w-6 text-gray-800" />
                                </button>
                                <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white p-2 rounded-full shadow-md transition">
                                    <ChevronRight className="h-6 w-6 text-gray-800" />
                                </button>
                            </>
                        )}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                            {gallery.map((_, index) => (
                                <button key={index} onClick={() => setCurrentImageIndex(index)} className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}></button>
                            ))}
                        </div>
                    </div>

                    <div className="p-8">
                        <h1 className="text-3xl font-bold text-gray-900">{selectedFactory.name}</h1>
                        <div className="flex flex-wrap gap-2 mt-2 mb-4">
                            {selectedFactory.tags?.map(tag => (
                                <span key={tag} className={`text-sm font-semibold px-3 py-1 rounded-full ${ tag === 'Prime' ? 'bg-blue-100 text-blue-800' : tag === 'Tech Enabled' ? 'bg-red-100 text-[#a50a09]' : tag === 'Sustainable' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800' }`}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <p className="mt-2 text-gray-600">{selectedFactory.description}</p>
                        <button onClick={() => handleSetCurrentPage('factoryCatalog', selectedFactory)} className="mt-6 w-full md:w-auto px-6 py-3 text-white rounded-lg font-semibold bg-gray-800 hover:bg-black transition shadow-md flex items-center justify-center">
                            <BookOpen className="mr-2 h-5 w-5" /> View Product Catalog
                        </button>
                    </div>
                    
                    <div className="px-8 py-6 border-t border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Factory Details</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                            <div> <p className="text-sm font-medium text-gray-500">Location</p> <p className="font-semibold text-gray-800 flex items-center justify-center"><MapPin size={14} className="mr-1.5"/>{selectedFactory.location}</p> </div>
                            <div> <p className="text-sm font-medium text-gray-500">Rating</p> <p className="font-semibold text-gray-800 flex items-center justify-center"><Star size={16} className="text-yellow-400 fill-current mr-1.5"/>{selectedFactory.rating}</p> </div>
                            <div> <p className="text-sm font-medium text-gray-500">MOQ</p> <p className="font-semibold text-gray-800">{selectedFactory.minimumOrderQuantity} units</p> </div>
                            <div> <p className="text-sm font-medium text-gray-500">Specialties</p> <p className="font-semibold text-gray-800">{selectedFactory.specialties.join(', ')}</p> </div>
                        </div>
                    </div>
                    <div className="px-8 py-6 border-t border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Certifications & Compliance</h3>
                        <div className="flex flex-wrap gap-3">
                            {selectedFactory.certifications?.map(cert => <CertificationBadge key={cert} cert={cert} />)}
                        </div>
                    </div>
                    <div className="px-8 py-6 border-t border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Production Capacity</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine Type</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Capacity</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Available Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {selectedFactory.machineSlots.map(slot => (
                                        <MachineSlotRow key={slot.machineType} slot={slot} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="px-8 py-6 bg-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h4 className="font-semibold text-gray-800">Ready to proceed?</h4>
                            <p className="text-sm text-gray-600">Request a quote or use our AI tools to prepare your inquiry.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleSetCurrentPage('factoryTools', selectedFactory)} className="w-full md:w-auto px-6 py-3 text-[#c20c0b] bg-red-100 rounded-lg font-semibold hover:bg-red-200 transition">
                                Use AI Sourcing Tools
                            </button>
                            <button onClick={() => handleSetCurrentPage('quoteRequest', selectedFactory)} className="w-full md:w-auto px-6 py-3 text-white rounded-lg font-semibold bg-[#c20c0b] hover:bg-[#a50a09] transition shadow-md">
                                Request a Quote
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};