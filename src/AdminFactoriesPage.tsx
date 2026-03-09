import React, { useState, useEffect, FC, useRef, useCallback, useMemo } from 'react';
import {
    Plus, X, Trash2, Image as ImageIcon, Edit, MapPin, Star,
    ChevronLeft, ChevronRight, GripVertical, UploadCloud, Palette,
    Check, Building2, Megaphone, Cog, BookOpen, Images,
    PackageCheck, Clock, Award, ShieldCheck, BarChart3, TrendingUp, AlertTriangle, Eye, Copy,
    Activity, LayoutGrid, Scroll, CheckCircle2, AlertCircle, ZoomIn, Link2, ArrowLeft
} from 'lucide-react';
import { MainLayout } from './MainLayout';
import { factoryService } from './factory.service';
import { Factory, MachineSlot, CatalogProduct, FabricOption } from './types';
import { FactoryCard, TrustTierBadge } from './FactoryCard';
import ProductCatalog, { migrateCatalog } from './ProductCatalog';
import { seedAllFactories } from './seedFactories';
import { useToast } from './ToastContext';

interface AdminFactoriesPageProps {
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    isAdmin: boolean;
    supabase: any;
}

const TAG_COLORS = [
    '#ef4444', '#f97316', '#d97706', '#16a34a', '#06b6d4',
    '#2563eb', '#4f46e5', '#9333ea', '#db2777', '#e11d48'
];

const STEPS = [
    { label: 'Basic Info', icon: Building2 },
    { label: 'Marketing', icon: Megaphone },
    { label: 'Capacity', icon: Cog },
    { label: 'Catalog', icon: BookOpen },
    { label: 'Gallery', icon: Images },
];

// --- Shared input class ---
const inputCls = "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent outline-none transition-all placeholder:text-gray-400";
const smallInputCls = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent outline-none transition-all placeholder:text-gray-400";
const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5";

// --- Helper Components ---

const ChipInput: FC<{
    label: string;
    values: string[];
    placeholder: string;
    onAdd: (value: string) => void;
    onRemove: (index: number) => void;
    suggestions?: string[];
    enableColor?: boolean;
    required?: boolean;
}> = ({ label, values, placeholder, onAdd, onRemove, suggestions, enableColor, required }) => {
    const [input, setInput] = useState('');
    const [color, setColor] = useState(TAG_COLORS[5]);
    const [showPicker, setShowPicker] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (input.trim()) {
                onAdd(enableColor ? `${input.trim()}:${color}` : input.trim());
                setInput('');
            }
        }
    };

    return (
        <div>
            <label className={labelCls}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {values?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2.5">
                    {values.map((v, i) => {
                        const [text, tagColor] = enableColor ? v.split(':') : [v, null];
                        return (
                            <span
                                key={i}
                                style={tagColor ? { backgroundColor: tagColor, color: '#fff', borderColor: tagColor } : {}}
                                className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-300 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                            >
                                {text}
                                <button type="button" onClick={() => onRemove(i)} className="hover:text-red-700 dark:hover:text-red-200 transition-colors ml-0.5"><X size={12} /></button>
                            </span>
                        );
                    })}
                </div>
            )}
            <div className="flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} className={inputCls} />
                {enableColor && (
                    <div className="relative flex-shrink-0 flex">
                        <button
                            type="button"
                            onClick={() => setShowPicker(!showPicker)}
                            className="w-[50px] rounded-xl border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-transform hover:scale-105 shadow-sm self-stretch"
                            style={{ backgroundColor: color }}
                            title="Pick tag color"
                        >
                            <Palette size={18} className="text-white drop-shadow-md" />
                        </button>
                        {showPicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                                <div className="absolute right-0 top-14 z-50 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 grid grid-cols-5 gap-2 w-48">
                                    {TAG_COLORS.map(c => (
                                        <button key={c} type="button" onClick={() => { setColor(c); setShowPicker(false); }}
                                            className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${color === c ? 'border-gray-600 dark:border-white scale-110' : 'border-transparent hover:scale-110'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            {suggestions && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestions.filter(s => !values.includes(s)).map(s => (
                        <button key={s} type="button" onClick={() => onAdd(s)}
                            className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer font-medium">
                            + {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const FileDropZone = ({ onDrop, label, compact = false }: { onDrop: (files: File[]) => void; label: string; compact?: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files?.length) onDrop(Array.from(e.dataTransfer.files));
    };

    return (
        <label
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 scale-[1.02]' : 'border-gray-300 dark:border-gray-600 hover:border-[#c20c0b] hover:bg-gray-50 dark:hover:bg-gray-800/50'} ${compact ? 'p-2 h-full' : 'aspect-square bg-gray-50 dark:bg-gray-800/30'}`}
        >
            <div className={`p-3 rounded-full ${isDragging ? 'bg-white text-[#c20c0b]' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                <UploadCloud size={compact ? 20 : 24} />
            </div>
            {!compact && <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-3 uppercase tracking-wide">{label}</span>}
            <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.length) onDrop(Array.from(e.target.files)); }} className="hidden" />
        </label>
    );
};

const ColorListInput = ({ value, onChange, className, placeholder }: { value: string[], onChange: (v: string[]) => void, className: string, placeholder: string }) => {
    const [text, setText] = useState(value.join(', '));
    const [showPicker, setShowPicker] = useState(false);
    const [pickerColor, setPickerColor] = useState('#000000');

    useEffect(() => {
        const currentArr = text.split(',').map(s => s.trim()).filter(Boolean);
        if (JSON.stringify(currentArr) !== JSON.stringify(value)) {
            setText(value.join(', '));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setText(val);
        onChange(val.split(',').map(s => s.trim()).filter(Boolean));
    };

    const addPickedColor = () => {
        const newColors = [...value, pickerColor];
        onChange(newColors);
        setText(newColors.join(', '));
        setShowPicker(false);
    };

    return (
        <div className="relative group">
            {value.length > 0 && (
                <div className="flex gap-1 mb-1.5 flex-wrap">
                    {value.map((c, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" style={{ backgroundColor: c.toLowerCase().replace(/ /g, '') }} title={c} />
                    ))}
                </div>
            )}
            <div className="flex gap-2">
                <div className="flex-1">
                    <input type="text" value={text} onChange={handleChange} className={className} placeholder={placeholder} />
                </div>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowPicker(!showPicker)}
                        className="h-full px-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                        title="Pick a color"
                    >
                        <Palette size={16} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    
                    {showPicker && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                            <div className="absolute right-0 top-full mt-2 z-50 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-48">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Pick Color</p>
                                <div className="flex gap-2 mb-3">
                                    <input 
                                        type="color" 
                                        value={pickerColor} 
                                        onChange={(e) => setPickerColor(e.target.value)}
                                        className="h-10 w-full rounded cursor-pointer border-0 p-0 bg-transparent" 
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={addPickedColor}
                                    className="w-full py-1.5 bg-[#c20c0b] text-white text-xs font-bold rounded-lg hover:bg-[#a50a09] transition-colors"
                                >
                                    Add {pickerColor}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Factory Preview (Card + Detail Page) ---
const FactoryPreview: FC<{ factory: Factory }> = ({ factory }) => {
    const [previewTab, setPreviewTab] = useState<'card' | 'detail'>('card');
    const [detailTab, setDetailTab] = useState<'overview' | 'catalog'>('overview');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const gallery = factory.gallery || [];

    return (
        <div className="space-y-6">
            {/* Toggle between Card and Detail preview */}
            <div className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 max-w-xs mx-auto">
                <button onClick={() => setPreviewTab('card')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${previewTab === 'card' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    Card View
                </button>
                <button onClick={() => setPreviewTab('detail')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${previewTab === 'detail' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    Detail Page
                </button>
            </div>

            {previewTab === 'card' ? (
                <div className="flex flex-col items-center space-y-4 animate-[fadeIn_0.3s_ease-out]">
                    <div className="w-full max-w-sm transform hover:scale-[1.02] transition-transform duration-300">
                        <FactoryCard factory={factory} onSelect={() => {}} style={{}} />
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm max-w-md text-center">
                        This is how the factory card will appear to clients on the sourcing page.
                    </div>
                </div>
            ) : (
                <div className="animate-[fadeIn_0.3s_ease-out] max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
                        {/* Hero Image Section */}
                        <div className="relative h-64 md:h-80">
                            {gallery.length > 0 ? (
                                <img src={gallery[currentImageIndex]} alt={factory.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                    <ImageIcon size={64} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                            {/* Gallery Navigation */}
                            {gallery.length > 1 && (
                                <>
                                    <button onClick={() => setCurrentImageIndex(i => (i - 1 + gallery.length) % gallery.length)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button onClick={() => setCurrentImageIndex(i => (i + 1) % gallery.length)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10">
                                        <ChevronRight size={18} />
                                    </button>
                                    <div className="absolute bottom-16 right-4 flex space-x-1.5">
                                        {gallery.map((_, index) => (
                                            <button key={index} onClick={() => setCurrentImageIndex(index)}
                                                className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Hero Content Overlay */}
                            <div className="absolute bottom-0 left-0 p-5 w-full">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{factory.name || 'Factory Name'}</h1>
                                            {factory.rating >= 4.5 && (
                                                <span className="px-2 py-0.5 rounded bg-[#c20c0b] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">Top Rated</span>
                                            )}
                                            <TrustTierBadge tier={factory.trustTier} />
                                        </div>
                                        <p className="text-gray-200 flex items-center text-sm font-medium">
                                            <MapPin size={14} className="mr-1 text-[#c20c0b]" /> {factory.location || 'Location'}
                                        </p>
                                    </div>
                                    <div className="flex items-center bg-green-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl shadow-lg border border-white/10">
                                        <span className="font-bold text-xl mr-1">{factory.rating || 0}</span>
                                        <div className="flex flex-col leading-none">
                                            <Star size={12} className="fill-current mb-0.5" />
                                            <span className="text-[9px] opacity-90 font-medium">Quality</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="border-b border-gray-200 dark:border-white/10 px-5">
                            <div className="flex space-x-6">
                                <button onClick={() => setDetailTab('overview')}
                                    className={`py-3 text-sm font-bold border-b-2 transition-colors ${detailTab === 'overview' ? 'border-[#c20c0b] text-[#c20c0b]' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                                    Overview
                                </button>
                                <button onClick={() => setDetailTab('catalog')}
                                    className={`py-3 text-sm font-bold border-b-2 transition-colors ${detailTab === 'catalog' ? 'border-[#c20c0b] text-[#c20c0b]' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                                    Product Catalog
                                </button>
                            </div>
                        </div>

                        <div className="p-5">
                            {detailTab === 'overview' ? (
                                <>
                                    {/* Tags */}
                                    {factory.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {factory.tags.map(tag => {
                                                const [text] = tag.split(':');
                                                return (
                                                    <span key={tag} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                                                        text === 'Prime' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
                                                        text === 'Sustainable' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                                                        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                                                    }`}>{text}</span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Main Column */}
                                        <div className="lg:col-span-2 space-y-6">
                                            {/* About */}
                                            <div>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">About Factory</h3>
                                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{factory.description || 'No description provided.'}</p>
                                            </div>

                                            {/* Performance Metrics */}
                                            {factory.onTimeDeliveryRate !== undefined && (
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                        <TrendingUp size={16} className="text-[#c20c0b]" /> Performance Metrics
                                                    </h3>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-white/10 text-center">
                                                            <div className={`text-xl font-bold ${factory.onTimeDeliveryRate >= 90 ? 'text-green-600' : factory.onTimeDeliveryRate >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                                {factory.onTimeDeliveryRate}%
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">On-Time Delivery</div>
                                                        </div>
                                                        {factory.qualityRejectionRate !== undefined && (
                                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-white/10 text-center">
                                                                <div className={`text-xl font-bold ${factory.qualityRejectionRate <= 2 ? 'text-green-600' : factory.qualityRejectionRate <= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                                    {factory.qualityRejectionRate}%
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Quality Rejection</div>
                                                            </div>
                                                        )}
                                                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-white/10 text-center">
                                                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                                {factory.completedOrdersCount ?? 0}+
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Completed Orders</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Production Capacity */}
                                            <div>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <Activity size={16} className="text-[#c20c0b]" /> Production Capacity
                                                </h3>
                                                {factory.machineSlots?.length > 0 ? (
                                                    <>
                                                        {/* Summary */}
                                                        {(() => {
                                                            const totalAll = factory.machineSlots.reduce((s, m) => s + (m.totalSlots || 0), 0);
                                                            const availAll = factory.machineSlots.reduce((s, m) => s + (m.availableSlots || 0), 0);
                                                            const pct = totalAll > 0 ? Math.round((availAll / totalAll) * 100) : 0;
                                                            const colorCls = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500';
                                                            return (
                                                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-white/10 p-3 mb-3">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Overall Capacity</span>
                                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{availAll} / {totalAll} slots</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                                        <div className={`h-2 rounded-full transition-all ${colorCls}`} style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {factory.machineSlots.map(slot => {
                                                                const pct = slot.totalSlots > 0 ? Math.round((slot.availableSlots / slot.totalSlots) * 100) : 0;
                                                                const colorCls = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : slot.totalSlots === 0 ? 'bg-gray-400' : 'bg-red-500';
                                                                return (
                                                                    <div key={slot.machineType} className="bg-white dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-white/10 p-3">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${colorCls}`}>
                                                                                {slot.totalSlots > 0 ? `${pct}%` : '—'}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{slot.machineType}</h4>
                                                                                {slot.nextAvailable && <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock size={8} /> {slot.nextAvailable}</p>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                                                            <div className={`h-1.5 rounded-full ${colorCls}`} style={{ width: `${pct}%` }} />
                                                                        </div>
                                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                                                            <span className="font-bold text-gray-700 dark:text-gray-200">{slot.availableSlots}</span> / {slot.totalSlots} slots
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-white/10">
                                                        <Cog size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">No capacity information available</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sidebar Column */}
                                        <div className="space-y-4">
                                            {/* Key Stats */}
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                                                <h3 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Key Stats</h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500 dark:text-gray-300">Min. Order Qty</span>
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{(factory.minimumOrderQuantity || 0).toLocaleString()} units</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500 dark:text-gray-300">Turnaround</span>
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{factory.turnaround || 'N/A'}</span>
                                                    </div>
                                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider block mb-1.5">Specialties</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {factory.specialties?.map(s => (
                                                                <span key={s} className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-200 font-medium">{s}</span>
                                                            ))}
                                                            {(!factory.specialties || factory.specialties.length === 0) && <span className="text-[10px] text-gray-400">None added</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Certifications */}
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                                                <h3 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                    <ShieldCheck size={12} /> Certifications
                                                </h3>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {factory.certifications?.map(cert => (
                                                        <span key={cert} className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white border-gray-200 dark:border-gray-700">{cert}</span>
                                                    ))}
                                                    {(!factory.certifications || factory.certifications.length === 0) && <span className="text-[10px] text-gray-400">None added</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <ProductCatalog catalog={factory.catalog || { products: [], fabricOptions: [] }} compact />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 dark:border-white/10 p-4 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">Interested in this factory?</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-300">Start a conversation or get an AI-assisted brief.</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700">AI Tools</span>
                                    <span className="px-4 py-2 bg-[#c20c0b] text-white text-xs font-bold rounded-xl flex items-center gap-1">Request Quote <ChevronRight size={14} /></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm text-center mt-4">
                        This is how the factory detail page will appear to clients.
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
export const AdminFactoriesPage: FC<AdminFactoriesPageProps> = (props) => {
    const CACHE_KEY = 'garment_erp_admin_factories';
    const [factories, setFactories] = useState<Factory[]>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem(CACHE_KEY));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFactory, setEditingFactory] = useState<Partial<Factory>>({
        name: '', location: '', description: '', minimumOrderQuantity: 0, rating: 0, imageUrl: '',
        turnaround: '', offer: '',
        specialties: [], tags: [], certifications: [], gallery: [],
        machineSlots: [], catalog: { products: [], fabricOptions: [] }
    });

    const [currentStep, setCurrentStep] = useState(0);
    const [currentPageIndex, setCurrentPageIndex] = useState(1);
    const itemsPerPage = 9;
    const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
    const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [draggedProductImage, setDraggedProductImage] = useState<{ productIndex: number; imageIndex: number } | null>(null);
    const [previewProductIdx, setPreviewProductIdx] = useState<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [originalFactory, setOriginalFactory] = useState<string | null>(null);
    const { showToast } = useToast();

    const isDirty = useMemo(() => {
        if (!editingFactory.id) return true;
        return JSON.stringify(editingFactory) !== originalFactory;
    }, [editingFactory, originalFactory]);

    const fetchFactories = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        const hasCache = !!sessionStorage.getItem(CACHE_KEY);
        if (!hasCache) setIsLoading(true);

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
                const { data, error } = await Promise.race([factoryService.getAll(), timeoutPromise]) as any;
                if (error) throw error;
                if (!signal.aborted) {
                    setFactories(data || []);
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
                    setIsLoading(false);
                }
                return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                attempts++;
                if (attempts >= 3) setIsLoading(false);
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, []);

    useEffect(() => {
        fetchFactories();
        return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, [fetchFactories]);

    const totalPages = Math.ceil(factories.length / itemsPerPage);
    const displayedFactories = factories.slice((currentPageIndex - 1) * itemsPerPage, currentPageIndex * itemsPerPage);

    useEffect(() => {
        if (currentPageIndex > totalPages && totalPages > 0) setCurrentPageIndex(totalPages);
    }, [factories.length, totalPages, currentPageIndex]);

    // --- Step Validation ---
    const validateStep = (step: number): boolean => {
        if (step === 0) {
            if (!editingFactory.name?.trim()) { showToast('Factory Name is required', 'error'); return false; }
            const parts = (editingFactory.location || '').split(',').map(s => s.trim());
            if (!parts[0] || !parts[1]) { showToast('City and Country are required', 'error'); return false; }
            if (!editingFactory.description?.trim()) { showToast('Description is required', 'error'); return false; }
            if (!editingFactory.minimumOrderQuantity) { showToast('MOQ is required', 'error'); return false; }
        }
        if (step === 1) {
            if (!editingFactory.tags?.length) { showToast('At least one tag is required', 'error'); return false; }
            if (!editingFactory.specialties?.length) { showToast('At least one specialty is required', 'error'); return false; }
        }
        return true;
    };

    const nextStep = () => { if (validateStep(currentStep)) setCurrentStep(s => Math.min(s + 1, STEPS.length - 1)); };
    const prevStep = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

    // --- Save ---
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isDirty) return;
        // Validate required steps (0 = basic, 1 = marketing)
        for (let i = 0; i <= 1; i++) { if (!validateStep(i)) { setCurrentStep(i); return; } }

        const payload: any = { ...editingFactory };
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;

        if (payload.gallery?.length > 0) payload.imageUrl = payload.gallery[0];
        else payload.imageUrl = '';

        if (editingFactory.id) {
            const { error } = await factoryService.update(editingFactory.id, payload);
            if (error) showToast(error.message, 'error');
            else { showToast('Factory updated'); setIsModalOpen(false); fetchFactories(); }
        } else {
            const { error } = await factoryService.create(payload);
            if (error) showToast(error.message, 'error');
            else { showToast('Factory created'); setIsModalOpen(false); fetchFactories(); }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this factory?')) return;
        const { error } = await factoryService.delete(id);
        if (error) showToast(error.message, 'error');
        else { showToast('Factory deleted'); fetchFactories(); }
    };

    // --- Upload ---
    const uploadFileToStorage = async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `factories/${fileName}`;
            const { error: uploadError } = await props.supabase.storage.from('factory-gallery').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = props.supabase.storage.from('factory-gallery').getPublicUrl(filePath);
            return publicUrl;
        } catch (error: any) {
            showToast('Upload failed: ' + error.message, 'error');
            return null;
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement> | File[], target: 'gallery' | 'catalog' | 'fabric-swatch' | 'brochure' = 'gallery', index?: number) => {
        let file: File | null = null;
        if (Array.isArray(e)) { if (e.length > 0) file = e[0]; }
        else { if (e.target.files?.length) file = e.target.files[0]; }
        if (!file) return;
        const publicUrl = await uploadFileToStorage(file);
        if (publicUrl) {
            if (target === 'gallery') setEditingFactory(prev => ({ ...prev, gallery: [...(prev.gallery || []), publicUrl] }));
            else if (target === 'catalog' && index !== undefined) addProductImage(index, publicUrl);
            else if (target === 'fabric-swatch' && index !== undefined) updateFabricOption(index, 'swatchImageUrl', publicUrl);
            else if (target === 'brochure' && index !== undefined) updateProduct(index, 'brochureUrl', publicUrl);
            showToast('File uploaded');
        }
    };

    const removeGalleryImage = (index: number) => {
        const g = [...(editingFactory.gallery || [])];
        g.splice(index, 1);
        setEditingFactory(prev => ({ ...prev, gallery: g }));
    };

    const handleDragStart = (index: number) => setDraggedImageIndex(index);
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedImageIndex === null || draggedImageIndex === index) return;
        const g = [...(editingFactory.gallery || [])];
        const item = g[draggedImageIndex];
        g.splice(draggedImageIndex, 1);
        g.splice(index, 0, item);
        setEditingFactory(prev => ({ ...prev, gallery: g }));
        setDraggedImageIndex(index);
    };
    const handleDragEnd = () => setDraggedImageIndex(null);

    // --- Machine Slots ---
    const MACHINE_PRESETS = ['Lockstitch', 'Overlock', 'Flatlock', 'Coverstitch', 'Bartack', 'Button Hole', 'Button Attach', 'Snap Button', 'Heat Press', 'Cutting Table', 'Embroidery', 'Screen Print'];

    const addMachineSlot = (type = '') => setEditingFactory(prev => ({ ...prev, machineSlots: [...(prev.machineSlots || []), { machineType: type, totalSlots: 0, availableSlots: 0, nextAvailable: '' }] }));
    const updateMachineSlot = (index: number, field: keyof MachineSlot, value: any) => {
        const s = [...(editingFactory.machineSlots || [])];
        s[index] = { ...s[index], [field]: value };
        if (field === 'totalSlots' && s[index].availableSlots > value) s[index].availableSlots = value;
        setEditingFactory(prev => ({ ...prev, machineSlots: s }));
    };
    const removeMachineSlot = (index: number) => {
        const s = [...(editingFactory.machineSlots || [])];
        s.splice(index, 1);
        setEditingFactory(prev => ({ ...prev, machineSlots: s }));
    };
    const duplicateMachineSlot = (index: number) => {
        const s = [...(editingFactory.machineSlots || [])];
        s.splice(index + 1, 0, { ...s[index] });
        setEditingFactory(prev => ({ ...prev, machineSlots: s }));
    };

    // --- Catalog ---
    const ensureCatalog = (): { products: CatalogProduct[]; fabricOptions: FabricOption[]; brochureUrl?: string } => {
        const cat = editingFactory.catalog || { products: [], fabricOptions: [] };
        // Migrate legacy data if needed
        const migrated = migrateCatalog(cat as any);
        return { products: migrated.products || [], fabricOptions: migrated.fabricOptions || [], brochureUrl: migrated.brochureUrl };
    };

    const addProduct = () => {
        const cat = ensureCatalog();
        const newProduct: CatalogProduct = {
            id: `prod-${Date.now()}`, name: '', description: '', category: '', images: [],
            fabricComposition: '', availableColors: [], sizeRange: '', tags: [], featured: false,
        };
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, products: [...cat.products, newProduct] } }));
    };
    const updateProduct = (index: number, field: keyof CatalogProduct, value: any) => {
        const cat = ensureCatalog();
        const p = [...cat.products];
        p[index] = { ...p[index], [field]: value };
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, products: p } }));
    };
    const removeProduct = (index: number) => {
        const cat = ensureCatalog();
        const p = [...cat.products];
        p.splice(index, 1);
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, products: p } }));
    };
    const addProductImage = (index: number, url: string) => {
        const cat = ensureCatalog();
        const p = [...cat.products];
        p[index] = { ...p[index], images: [...p[index].images, url] };
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, products: p } }));
    };
    const removeProductImage = (prodIdx: number, imgIdx: number) => {
        const cat = ensureCatalog();
        const p = [...cat.products];
        const imgs = [...p[prodIdx].images];
        imgs.splice(imgIdx, 1);
        p[prodIdx] = { ...p[prodIdx], images: imgs };
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, products: p } }));
    };

    const handleProductImageDragStart = (productIndex: number, imageIndex: number) => {
        setDraggedProductImage({ productIndex, imageIndex });
    };

    const handleProductImageDragOver = (e: React.DragEvent, productIndex: number, imageIndex: number) => {
        e.preventDefault();
        if (!draggedProductImage || draggedProductImage.productIndex !== productIndex || draggedProductImage.imageIndex === imageIndex) {
            return;
        }

        const cat = ensureCatalog();
        const p = [...cat.products];
        const images = [...p[productIndex].images];
        const draggedItem = images[draggedProductImage.imageIndex];
        images.splice(draggedProductImage.imageIndex, 1);
        images.splice(imageIndex, 0, draggedItem);
        p[productIndex] = { ...p[productIndex], images };

        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, products: p } }));
        setDraggedProductImage({ productIndex, imageIndex });
    };

    const handleProductImageDragEnd = () => {
        setDraggedProductImage(null);
    };

    const handleProductDragStart = (index: number) => setDraggedProductIndex(index);
    const handleProductDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedProductIndex === null || draggedProductIndex === index) return;
        const cat = ensureCatalog();
        const p = [...cat.products];
        const item = p[draggedProductIndex];
        p.splice(draggedProductIndex, 1);
        p.splice(index, 0, item);
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, products: p } }));
        setDraggedProductIndex(index);
    };
    const handleProductDragEnd = () => setDraggedProductIndex(null);

    const addFabricOption = () => {
        const cat = ensureCatalog();
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, fabricOptions: [...cat.fabricOptions, { name: '', composition: '', useCases: '' }] } }));
    };
    const updateFabricOption = (index: number, field: keyof FabricOption, value: string) => {
        const cat = ensureCatalog();
        const o = [...cat.fabricOptions];
        o[index] = { ...o[index], [field]: value };
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, fabricOptions: o } }));
    };
    const removeFabricOption = (index: number) => {
        const cat = ensureCatalog();
        const o = [...cat.fabricOptions];
        o.splice(index, 1);
        setEditingFactory(prev => ({ ...prev, catalog: { ...cat, fabricOptions: o } }));
    };

    const PRODUCT_TAG_PRESETS = ['bestseller', 'new', 'eco-friendly', 'premium', 'budget'];
    const CATEGORY_PRESETS = ['T-Shirts', 'Polo Shirts', 'Hoodies', 'Sweatshirts', 'Joggers', 'Shorts', 'Jackets', 'Denim', 'Dresses', 'Activewear', 'Kids Wear', 'Loungewear'];

    const openModal = (factory?: Factory) => {
        if (factory) {
            setEditingFactory(factory);
            setOriginalFactory(JSON.stringify(factory));
        } else {
            setEditingFactory({
                name: '', location: '', description: '', minimumOrderQuantity: 0, rating: 0, imageUrl: '',
                turnaround: '', offer: '', specialties: [], tags: [], certifications: [], gallery: [],
                machineSlots: [], catalog: { products: [], fabricOptions: [] }
            });
            setOriginalFactory(null);
        }
        setCurrentStep(0);
        setIsPreviewMode(false);
        setIsModalOpen(true);
    };

    const isLastStep = currentStep === STEPS.length - 1;

    return (
        <MainLayout {...props}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Factory CMS</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage factory profiles, media, and capabilities.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (!confirm('This will insert 10 sample factories into the database. Continue?')) return;
                            showToast('Seeding factories...');
                            const result = await seedAllFactories();
                            if (result.success > 0) {
                                showToast(`${result.success} factories added successfully!`);
                                sessionStorage.removeItem(CACHE_KEY);
                                fetchFactories();
                            }
                            if (result.failed > 0) showToast(`${result.failed} failed: ${result.errors[0]}`, 'error');
                        }}
                        className="border border-[#c20c0b] text-[#c20c0b] px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#c20c0b]/5 transition-colors font-semibold text-sm"
                    >
                        <Plus size={16} /> Seed 10 Factories
                    </button>
                    <button onClick={() => openModal()} className="bg-[#c20c0b] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#a50a09] transition-colors font-semibold shadow-lg shadow-red-200 dark:shadow-red-900/20">
                        <Plus size={18} /> Add Factory
                    </button>
                </div>
            </div>

            {/* Factory Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-80 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedFactories.map((f: any) => (
                        <div key={f.id} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col transition-all hover:shadow-xl group hover:-translate-y-1 duration-300">
                            <div className="relative h-48">
                                {f.imageUrl ? (
                                    <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = `https://placehold.co/600x400/e9d5ff/4c1d95?text=${encodeURIComponent(f.name || 'Factory')}`; }} />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400"><ImageIcon size={48} /></div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(f)} className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors" title="Edit"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(f.id)} className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-700 text-red-600 dark:text-red-400 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded flex items-center">
                                    <Star size={12} className="text-yellow-400 fill-current mr-1" />{f.rating}
                                </div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{f.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-300 flex items-center mb-4"><MapPin size={14} className="mr-1" />{f.location}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {f.specialties?.slice(0, 3).map((spec: string, i: number) => (
                                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700">{spec}</span>
                                    ))}
                                    {(f.specialties?.length || 0) > 3 && <span className="text-xs text-gray-400 px-1 py-1">+{f.specialties!.length - 3} more</span>}
                                </div>
                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10 flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 uppercase font-semibold">MOQ</span>
                                        <span className="font-medium text-gray-700 dark:text-white">{f.minimumOrderQuantity}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-xs text-gray-400 uppercase font-semibold">Turnaround</span>
                                        <span className="font-medium text-gray-700 dark:text-white">{f.turnaround}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
                <div className="flex justify-center items-center mt-8 gap-4">
                    <button onClick={() => setCurrentPageIndex(p => Math.max(1, p - 1))} disabled={currentPageIndex === 1}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-200" />
                    </button>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-200">Page {currentPageIndex} of {totalPages}</span>
                    <button onClick={() => setCurrentPageIndex(p => Math.min(totalPages, p + 1))} disabled={currentPageIndex === totalPages}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                        <ChevronRight size={20} className="text-gray-600 dark:text-gray-200" />
                    </button>
                </div>
            )}

            {/* ===== FULL PAGE EDITOR ===== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 overflow-hidden flex flex-col">

                    {/* Page Header */}
                    <div className="px-6 md:px-8 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0 bg-white dark:bg-gray-900 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {isPreviewMode ? 'Preview' : (editingFactory.id ? 'Edit Factory' : 'Add New Factory')}
                                </h2>
                                {!isPreviewMode && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        Step {currentStep + 1} of {STEPS.length} &mdash; {STEPS[currentStep].label}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!isPreviewMode && (
                                <button type="button" onClick={() => setIsPreviewMode(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl font-semibold transition-colors text-sm">
                                    <Eye size={16} /> Preview
                                </button>
                            )}
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Stepper */}
                    {!isPreviewMode && (
                        <div className="px-6 md:px-8 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
                            <div className="flex items-center justify-between relative max-w-2xl mx-auto">
                                <div className="absolute left-0 top-[18px] w-full h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                <div className="absolute left-0 top-[18px] h-0.5 bg-[#c20c0b] rounded-full transition-all duration-500 ease-out" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
                                {STEPS.map((step, idx) => {
                                    const isCompleted = idx < currentStep;
                                    const isActive = idx === currentStep;
                                    const StepIcon = step.icon;
                                    return (
                                        <div key={idx} className="flex flex-col items-center z-10 cursor-pointer group" onClick={() => { if (idx < currentStep) setCurrentStep(idx); }}>
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                                                isActive ? 'bg-[#c20c0b] border-[#c20c0b] text-white scale-110 shadow-lg shadow-red-200 dark:shadow-red-900/30' :
                                                isCompleted ? 'bg-[#c20c0b] border-[#c20c0b] text-white' :
                                                'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 group-hover:border-gray-400'
                                            }`}>
                                                {isCompleted ? <Check size={14} strokeWidth={3} /> : <StepIcon size={14} />}
                                            </div>
                                            <span className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider transition-colors ${
                                                isActive ? 'text-[#c20c0b]' : isCompleted ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                                            }`}>{step.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            {isPreviewMode ? (
                                <FactoryPreview factory={editingFactory as Factory} />
                            ) : (
                                <form id="factory-form" onSubmit={handleSave} className="max-w-3xl mx-auto">

                                    {/* === STEP 1: Basic Info === */}
                                    {currentStep === 0 && (
                                        <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Building2 size={18} className="text-[#c20c0b]" />
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Basic Information</h3>
                                                </div>
                                                <p className="text-sm text-gray-400">Factory identity, location, and core details.</p>
                                            </div>

                                            <div>
                                                <label className={labelCls}>Factory Name <span className="text-red-500">*</span></label>
                                                <input type="text" value={editingFactory.name} onChange={e => setEditingFactory({ ...editingFactory, name: e.target.value })} className={inputCls} placeholder="e.g. Acme Garments Ltd." autoFocus />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelCls}>City <span className="text-red-500">*</span></label>
                                                    <input type="text" value={(editingFactory.location?.split(',') || [])[0]?.trim() || ''} onChange={e => { const country = (editingFactory.location?.split(',') || []).slice(1).join(',').trim() || ''; setEditingFactory({ ...editingFactory, location: `${e.target.value}, ${country}` }); }} className={inputCls} placeholder="e.g. Dhaka" />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Country <span className="text-red-500">*</span></label>
                                                    <input type="text" value={(editingFactory.location?.split(',') || []).slice(1).join(',').trim() || ''} onChange={e => { const city = (editingFactory.location?.split(',') || [])[0]?.trim() || ''; setEditingFactory({ ...editingFactory, location: `${city}, ${e.target.value}` }); }} className={inputCls} placeholder="e.g. Bangladesh" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelCls}>MOQ <span className="text-red-500">*</span></label>
                                                    <input type="number" min="0" value={editingFactory.minimumOrderQuantity} onChange={e => setEditingFactory({ ...editingFactory, minimumOrderQuantity: Math.max(0, parseInt(e.target.value) || 0) })} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Turnaround Time</label>
                                                    <input type="text" value={editingFactory.turnaround} onChange={e => setEditingFactory({ ...editingFactory, turnaround: e.target.value })} className={inputCls} placeholder="e.g. 4-6 weeks" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className={labelCls}>Promo Offer Banner</label>
                                                <input type="text" value={editingFactory.offer || ''} onChange={e => setEditingFactory({ ...editingFactory, offer: e.target.value })} className={inputCls} placeholder="e.g. 5% off first order (optional)" />
                                            </div>

                                            <div>
                                                <label className={labelCls}>Description <span className="text-red-500">*</span></label>
                                                <textarea value={editingFactory.description} onChange={e => setEditingFactory({ ...editingFactory, description: e.target.value })} className={`${inputCls} resize-none`} rows={4} placeholder="Describe the factory's history, capabilities, and values..." />
                                            </div>
                                        </div>
                                    )}

                                    {/* === STEP 2: Marketing === */}
                                    {currentStep === 1 && (
                                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Megaphone size={18} className="text-[#c20c0b]" />
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Marketing & Compliance</h3>
                                                </div>
                                                <p className="text-sm text-gray-400">Tags, specialties, and trust signals that help clients find this factory.</p>
                                            </div>

                                            <ChipInput label="Tags" values={editingFactory.tags || []} placeholder="e.g. Prime, Sustainable (Enter to add)"
                                                onAdd={val => setEditingFactory(prev => ({ ...prev, tags: [...(prev.tags || []), val] }))}
                                                onRemove={idx => setEditingFactory(prev => ({ ...prev, tags: (prev.tags || []).filter((_, i) => i !== idx) }))}
                                                enableColor required />

                                            <ChipInput label="Specialties" values={editingFactory.specialties || []} placeholder="Add custom specialty... (Enter to add)"
                                                onAdd={val => setEditingFactory(prev => ({ ...prev, specialties: [...(prev.specialties || []), val] }))}
                                                onRemove={idx => setEditingFactory(prev => ({ ...prev, specialties: (prev.specialties || []).filter((_, i) => i !== idx) }))}
                                                suggestions={['T-shirt', 'Polo Shirt', 'Shirts', 'Casual Shirts', 'Trousers', 'Jeans', 'Hoodies', 'Jackets']}
                                                required />

                                            <ChipInput label="Certifications" values={editingFactory.certifications || []} placeholder="e.g. ISO 9001, SA8000 (Enter to add)"
                                                onAdd={val => setEditingFactory(prev => ({ ...prev, certifications: [...(prev.certifications || []), val] }))}
                                                onRemove={idx => setEditingFactory(prev => ({ ...prev, certifications: (prev.certifications || []).filter((_, i) => i !== idx) }))}
                                                required />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                <div>
                                                    <label className={labelCls}>Rating (0-5)</label>
                                                    <input type="number" step="0.1" max="5" min="0" value={editingFactory.rating} onChange={e => setEditingFactory({ ...editingFactory, rating: parseFloat(e.target.value) || 0 })} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Trust Tier</label>
                                                    <select value={editingFactory.trustTier || 'unverified'} onChange={e => setEditingFactory({ ...editingFactory, trustTier: e.target.value as any })} className={`${inputCls} cursor-pointer`}>
                                                        <option value="unverified">Unverified</option>
                                                        <option value="bronze">Bronze</option>
                                                        <option value="silver">Silver</option>
                                                        <option value="gold">Gold</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Completed Orders</label>
                                                    <input type="number" min="0" value={editingFactory.completedOrdersCount ?? 0} onChange={e => setEditingFactory({ ...editingFactory, completedOrdersCount: parseInt(e.target.value) || 0 })} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>On-Time Delivery Rate (%)</label>
                                                    <input type="number" step="0.1" min="0" max="100" value={editingFactory.onTimeDeliveryRate ?? ''} onChange={e => setEditingFactory({ ...editingFactory, onTimeDeliveryRate: e.target.value ? parseFloat(e.target.value) : undefined })} className={inputCls} placeholder="e.g. 94.5" />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Quality Rejection Rate (%)</label>
                                                    <input type="number" step="0.1" min="0" max="100" value={editingFactory.qualityRejectionRate ?? ''} onChange={e => setEditingFactory({ ...editingFactory, qualityRejectionRate: e.target.value ? parseFloat(e.target.value) : undefined })} className={inputCls} placeholder="e.g. 1.2" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* === STEP 3: Capacity === */}
                                    {currentStep === 2 && (
                                        <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Cog size={18} className="text-[#c20c0b]" />
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Production Capacity</h3>
                                                </div>
                                                <p className="text-sm text-gray-400">Click a machine type to quick-add, or add a custom one below.</p>
                                            </div>

                                            {/* Quick-add presets */}
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Quick Add</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {MACHINE_PRESETS.filter(p => !(editingFactory.machineSlots || []).some(s => s.machineType === p)).map(preset => (
                                                        <button key={preset} type="button" onClick={() => addMachineSlot(preset)}
                                                            className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-[#c20c0b] hover:text-white text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#c20c0b] transition-all font-medium cursor-pointer">
                                                            + {preset}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Summary bar */}
                                            {(editingFactory.machineSlots?.length || 0) > 0 && (() => {
                                                const totalAll = (editingFactory.machineSlots || []).reduce((s, m) => s + (m.totalSlots || 0), 0);
                                                const availAll = (editingFactory.machineSlots || []).reduce((s, m) => s + (m.availableSlots || 0), 0);
                                                const pct = totalAll > 0 ? Math.round((availAll / totalAll) * 100) : 0;
                                                return (
                                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Overall Capacity</span>
                                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{availAll} / {totalAll} slots available</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                                            <div className={`h-2.5 rounded-full transition-all duration-500 ${pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <div className="flex justify-between mt-1.5">
                                                            <span className="text-[10px] text-gray-400 uppercase font-semibold">{editingFactory.machineSlots?.length} machine type{(editingFactory.machineSlots?.length || 0) !== 1 ? 's' : ''}</span>
                                                            <span className={`text-[10px] font-bold uppercase ${pct > 50 ? 'text-green-600' : pct > 20 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}% available</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Machine slot cards */}
                                            <div className="space-y-3">
                                                {editingFactory.machineSlots?.map((slot, idx) => {
                                                    const pct = slot.totalSlots > 0 ? Math.round((slot.availableSlots / slot.totalSlots) * 100) : 0;
                                                    return (
                                                        <div key={idx} className="bg-white dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                                            {/* Header */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3 flex-grow">
                                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : slot.totalSlots === 0 ? 'bg-gray-400' : 'bg-red-500'}`}>
                                                                        {slot.totalSlots > 0 ? `${pct}%` : '—'}
                                                                    </div>
                                                                    <input type="text" value={slot.machineType} onChange={e => updateMachineSlot(idx, 'machineType', e.target.value)}
                                                                        className="text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-[#c20c0b] focus:ring-0 outline-none py-0.5 px-0 w-full transition-colors"
                                                                        placeholder="Machine type name..." />
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                    <button type="button" onClick={() => duplicateMachineSlot(idx)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Duplicate"><Copy size={14} /></button>
                                                                    <button type="button" onClick={() => removeMachineSlot(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove"><Trash2 size={14} /></button>
                                                                </div>
                                                            </div>

                                                            {/* Capacity visual */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Available: <span className="font-bold text-gray-700 dark:text-gray-200">{slot.availableSlots}</span> / {slot.totalSlots}</span>
                                                                    {slot.nextAvailable && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10} />Next: {slot.nextAvailable}</span>}
                                                                </div>
                                                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                                    <div className={`h-2 rounded-full transition-all duration-300 ${pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : slot.totalSlots === 0 ? 'bg-gray-300' : 'bg-red-500'}`}
                                                                        style={{ width: `${slot.totalSlots > 0 ? pct : 0}%` }} />
                                                                </div>
                                                            </div>

                                                            {/* Inputs */}
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block uppercase font-semibold tracking-wider">Total Slots</label>
                                                                    <input type="number" min="0" value={slot.totalSlots} onChange={e => updateMachineSlot(idx, 'totalSlots', Math.max(0, parseInt(e.target.value) || 0))} className={smallInputCls} />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block uppercase font-semibold tracking-wider">Available</label>
                                                                    <div className="relative">
                                                                        <input type="range" min="0" max={slot.totalSlots || 0} value={slot.availableSlots}
                                                                            onChange={e => updateMachineSlot(idx, 'availableSlots', parseInt(e.target.value))}
                                                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#c20c0b] mt-3"
                                                                            disabled={!slot.totalSlots} />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block uppercase font-semibold tracking-wider">Next Available</label>
                                                                    <input type="date" value={slot.nextAvailable} onChange={e => updateMachineSlot(idx, 'nextAvailable', e.target.value)} className={smallInputCls} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Custom add button */}
                                            <button type="button" onClick={() => addMachineSlot('')} className="flex items-center gap-2 text-sm text-[#c20c0b] font-semibold hover:text-[#a50a09] transition-colors px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#c20c0b] w-full justify-center">
                                                <Plus size={16} /> Add Custom Machine
                                            </button>

                                            {(editingFactory.machineSlots?.length || 0) === 0 && (
                                                <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                                                    <Cog size={40} className="mx-auto mb-3 opacity-30" />
                                                    <p className="text-sm font-medium">No machines added yet</p>
                                                    <p className="text-xs mt-1">Use the quick-add buttons above or add a custom machine</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* === STEP 4: Catalog === */}
                                    {currentStep === 3 && (
                                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <BookOpen size={18} className="text-[#c20c0b]" />
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Product Catalog</h3>
                                                </div>
                                                <p className="text-sm text-gray-400">Add products with images, colors, sizing, and pricing details.</p>
                                            </div>

                                            {/* Products */}
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
                                                    <PackageCheck size={14} className="text-gray-400" /> Products <span className="text-red-500">*</span>
                                                </h4>
                                                <div className="space-y-4">
                                                    {(ensureCatalog().products).map((prod, idx) => (
                                                        <div key={prod.id}
                                                            draggable
                                                            onDragStart={() => handleProductDragStart(idx)}
                                                            onDragOver={(e) => handleProductDragOver(e, idx)}
                                                            onDragEnd={handleProductDragEnd}
                                                            className={`bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border-2 space-y-3 transition-all ${draggedProductIndex === idx ? 'border-[#c20c0b] scale-[0.98] opacity-75' : 'border-gray-200 dark:border-gray-700'}`}>
                                                            {/* Header: Drag handle + Name + Actions */}
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                                                                    <GripVertical size={16} />
                                                                </div>
                                                                <input type="text" placeholder="Product Name" value={prod.name} onChange={e => updateProduct(idx, 'name', e.target.value)} className={`${smallInputCls} font-semibold flex-grow`} />
                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    <label className="relative inline-flex items-center cursor-pointer" title="Featured">
                                                                        <input type="checkbox" checked={prod.featured || false} onChange={e => updateProduct(idx, 'featured', e.target.checked)} className="sr-only peer" />
                                                                        <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-[#c20c0b] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#c20c0b]"></div>
                                                                    </label>
                                                                    <span className="text-[10px] text-gray-400">Featured</span>
                                                                </div>
                                                                <button type="button" onClick={() => setPreviewProductIdx(previewProductIdx === idx ? null : idx)} className={`p-1 transition-colors ${previewProductIdx === idx ? 'text-[#c20c0b]' : 'text-gray-400 hover:text-gray-600'}`} title="Preview card"><Eye size={16} /></button>
                                                                <button type="button" onClick={() => removeProduct(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1"><Trash2 size={16} /></button>
                                                            </div>

                                                            {/* Description */}
                                                            <textarea placeholder="Description" value={prod.description} onChange={e => updateProduct(idx, 'description', e.target.value)} className={`${smallInputCls} resize-none`} rows={2} />

                                                            {/* Image Gallery Section */}
                                                            <div>
                                                                <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 block uppercase font-semibold tracking-wider">Product Images ({prod.images.length}/5)</label>
                                                                <div className="flex gap-2 flex-wrap items-start">
                                                                    {prod.images.map((img, imgIdx) => (
                                                                        <div
                                                                            key={imgIdx}
                                                                            className={`w-20 h-20 rounded-lg overflow-hidden relative group/img border-2 flex-shrink-0 cursor-move transition-all ${draggedProductImage?.productIndex === idx && draggedProductImage?.imageIndex === imgIdx ? 'border-[#c20c0b] scale-95 opacity-75' : 'border-gray-200 dark:border-gray-600'}`}
                                                                            draggable
                                                                            onDragStart={() => handleProductImageDragStart(idx, imgIdx)}
                                                                            onDragOver={(e) => handleProductImageDragOver(e, idx, imgIdx)}
                                                                            onDragEnd={handleProductImageDragEnd}
                                                                        >
                                                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                                                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                                                                <GripVertical className="text-white drop-shadow-lg" size={20} />
                                                                            </div>
                                                                            <button type="button" onClick={() => removeProductImage(idx, imgIdx)}
                                                                                className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-600 shadow-lg">
                                                                                <X size={12} />
                                                                            </button>
                                                                            {imgIdx === 0 && <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] px-1 rounded font-bold">COVER</span>}
                                                                        </div>
                                                                    ))}
                                                                    {prod.images.length < 5 && (
                                                                        <div className="w-20 h-20 flex-shrink-0">
                                                                            <FileDropZone onDrop={(files) => handleImageUpload(files, 'catalog', idx)} label="" compact />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Add image via URL */}
                                                                {prod.images.length < 5 && (
                                                                    <div className="mt-2 flex gap-2 items-center">
                                                                        <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Paste image URL and press Enter..."
                                                                            className={`${smallInputCls} text-xs`}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    const url = (e.target as HTMLInputElement).value.trim();
                                                                                    if (url) {
                                                                                        addProductImage(idx, url);
                                                                                        (e.target as HTMLInputElement).value = '';
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Row 2: Category, Subcategory, Fabric */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Category</label>
                                                                    <div className="relative">
                                                                        <input type="text" list={`cat-list-${idx}`} placeholder="e.g. T-Shirts" value={prod.category} onChange={e => updateProduct(idx, 'category', e.target.value)} className={smallInputCls} />
                                                                        <datalist id={`cat-list-${idx}`}>
                                                                            {CATEGORY_PRESETS.map(c => <option key={c} value={c} />)}
                                                                        </datalist>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Subcategory</label>
                                                                    <input type="text" placeholder="e.g. Oversized" value={prod.subcategory || ''} onChange={e => updateProduct(idx, 'subcategory', e.target.value)} className={smallInputCls} />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Fabric Composition</label>
                                                                    <input type="text" placeholder="e.g. 100% Cotton 240GSM" value={prod.fabricComposition} onChange={e => updateProduct(idx, 'fabricComposition', e.target.value)} className={smallInputCls} />
                                                                </div>
                                                            </div>

                                                            {/* Row 3: Colors, Size Range, Price, MOQ, Lead Time */}
                                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                                <div className="col-span-2 sm:col-span-1">
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Colors (comma sep.)</label>
                                                                    <ColorListInput value={prod.availableColors} onChange={vals => updateProduct(idx, 'availableColors', vals)} className={smallInputCls} placeholder="Black, White, Navy" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Size Range</label>
                                                                    <input type="text" placeholder="XS - 5XL" value={prod.sizeRange} onChange={e => updateProduct(idx, 'sizeRange', e.target.value)} className={smallInputCls} />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Price Range</label>
                                                                    <input type="text" placeholder="$3.50 - $5.20" value={prod.priceRange || ''} onChange={e => updateProduct(idx, 'priceRange', e.target.value)} className={smallInputCls} />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">MOQ</label>
                                                                    <input type="number" placeholder="500" value={prod.moq || ''} onChange={e => updateProduct(idx, 'moq', e.target.value ? parseInt(e.target.value) : undefined)} className={smallInputCls} />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Lead Time</label>
                                                                    <input type="text" placeholder="25-30 days" value={prod.leadTime || ''} onChange={e => updateProduct(idx, 'leadTime', e.target.value)} className={smallInputCls} />
                                                                </div>
                                                            </div>

                                                            {/* Row 4: Tags + Brochure */}
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Tags:</span>
                                                                {PRODUCT_TAG_PRESETS.map(tag => {
                                                                    const active = prod.tags.includes(tag);
                                                                    return (
                                                                        <button key={tag} type="button" onClick={() => {
                                                                            const newTags = active ? prod.tags.filter(t => t !== tag) : [...prod.tags, tag];
                                                                            updateProduct(idx, 'tags', newTags);
                                                                        }}
                                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${active ? 'bg-[#c20c0b] text-white border-[#c20c0b]' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#c20c0b]/50'}`}>
                                                                            {tag}
                                                                        </button>
                                                                    );
                                                                })}
                                                                <div className="ml-auto flex items-center gap-2">
                                                                    {prod.brochureUrl ? (
                                                                        <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                                                                            <Check size={12} /> Brochure attached
                                                                            <button type="button" onClick={() => updateProduct(idx, 'brochureUrl', '')} className="text-red-400 hover:text-red-600 ml-1"><X size={12} /></button>
                                                                        </div>
                                                                    ) : (
                                                                        <FileDropZone onDrop={(files) => handleImageUpload(files, 'brochure', idx)} label="Brochure PDF" compact />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Inline Preview */}
                                                            {previewProductIdx === idx && (
                                                                <div className="mt-2 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
                                                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Eye size={10} /> Card Preview</p>
                                                                    <div className="max-w-[260px]">
                                                                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-sm">
                                                                            {/* Preview image */}
                                                                            <div className="h-36 overflow-hidden relative">
                                                                                {prod.images.length > 0 ? (
                                                                                    <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                                                                                        <PackageCheck size={28} className="text-gray-300 dark:text-gray-600" />
                                                                                    </div>
                                                                                )}
                                                                                <div className="absolute top-1.5 left-1.5 flex gap-1">
                                                                                    {prod.featured && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#c20c0b] text-white">FEATURED</span>}
                                                                                    {prod.tags.slice(0, 2).map(t => <span key={t} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{t}</span>)}
                                                                                </div>
                                                                            </div>
                                                                            {/* Preview content */}
                                                                            <div className="p-3">
                                                                                <p className="text-[8px] font-semibold text-[#c20c0b] uppercase tracking-wider">{prod.category || 'Category'}{prod.subcategory ? ` / ${prod.subcategory}` : ''}</p>
                                                                                <h4 className="font-bold text-gray-900 dark:text-white text-xs mt-0.5 truncate">{prod.name || 'Product Name'}</h4>
                                                                                {prod.fabricComposition && <p className="text-[9px] text-gray-500 mt-0.5">{prod.fabricComposition}</p>}
                                                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                                    {prod.availableColors.length > 0 && (
                                                                                        <div className="flex gap-0.5">
                                                                                            {prod.availableColors.slice(0, 4).map((c, ci) => (
                                                                                                <span key={ci} className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 inline-block"
                                                                                                    style={{ backgroundColor: c.startsWith('#') ? c : ({'white':'#fff','black':'#000','red':'#ef4444','blue':'#3b82f6','navy':'#1e3a5f','green':'#22c55e','yellow':'#eab308','orange':'#f97316','pink':'#ec4899','gray':'#6b7280','brown':'#92400e','beige':'#d4c5a9','charcoal':'#374151'}[c.toLowerCase()] || '#9ca3af') }} />
                                                                                            ))}
                                                                                            {prod.availableColors.length > 4 && <span className="text-[8px] text-gray-400">+{prod.availableColors.length - 4}</span>}
                                                                                        </div>
                                                                                    )}
                                                                                    {prod.sizeRange && <span className="text-[8px] text-gray-500">{prod.sizeRange}</span>}
                                                                                </div>
                                                                                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                                                                                    {prod.priceRange ? <span className="text-xs font-bold text-[#c20c0b]">{prod.priceRange}</span> : <span />}
                                                                                    {prod.leadTime && <span className="text-[8px] text-gray-400">{prod.leadTime}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <button type="button" onClick={addProduct} className="mt-3 flex items-center gap-2 text-sm text-[#c20c0b] font-semibold hover:text-[#a50a09] transition-colors px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#c20c0b] w-full justify-center">
                                                    <Plus size={16} /> Add Product
                                                </button>
                                            </div>

                                            {/* Fabric Options */}
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
                                                    <Award size={14} className="text-gray-400" /> Fabric Options
                                                </h4>
                                                <div className="space-y-3">
                                                    {(ensureCatalog().fabricOptions).map((opt, idx) => (
                                                        <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                                            <div className="flex gap-3">
                                                                {/* Swatch image */}
                                                                <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                                                                    {opt.swatchImageUrl ? (
                                                                        <img src={opt.swatchImageUrl} alt="Swatch" className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity" onClick={() => updateFabricOption(idx, 'swatchImageUrl', '')} title="Click to remove" />
                                                                    ) : (
                                                                        <FileDropZone onDrop={(files) => handleImageUpload(files, 'fabric-swatch', idx)} label="" compact />
                                                                    )}
                                                                </div>
                                                                <div className="flex-grow">
                                                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                                        <div>
                                                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Fabric Name</label>
                                                                            <input type="text" placeholder="e.g. Cotton Jersey" value={opt.name} onChange={e => updateFabricOption(idx, 'name', e.target.value)} className={smallInputCls} />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Composition</label>
                                                                            <input type="text" placeholder="e.g. 100% Cotton" value={opt.composition} onChange={e => updateFabricOption(idx, 'composition', e.target.value)} className={smallInputCls} />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Weight (GSM)</label>
                                                                            <input type="text" placeholder="e.g. 240" value={opt.weightGSM || ''} onChange={e => updateFabricOption(idx, 'weightGSM', e.target.value)} className={smallInputCls} />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Use Cases</label>
                                                                            <input type="text" placeholder="e.g. T-shirts, Polos" value={opt.useCases} onChange={e => updateFabricOption(idx, 'useCases', e.target.value)} className={smallInputCls} />
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <div className="flex-grow">
                                                                                <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Price/meter</label>
                                                                                <input type="text" placeholder="e.g. $2.50" value={opt.pricePerMeter || ''} onChange={e => updateFabricOption(idx, 'pricePerMeter', e.target.value)} className={smallInputCls} />
                                                                            </div>
                                                                            <button type="button" onClick={() => removeFabricOption(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1 self-end mb-0.5"><Trash2 size={16} /></button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button type="button" onClick={addFabricOption} className="mt-3 flex items-center gap-2 text-sm text-[#c20c0b] font-semibold hover:text-[#a50a09] transition-colors px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#c20c0b] w-full justify-center">
                                                    <Plus size={16} /> Add Fabric
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* === STEP 5: Gallery === */}
                                    {currentStep === 4 && (
                                        <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Images size={18} className="text-[#c20c0b]" />
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Factory Gallery</h3>
                                                </div>
                                                <p className="text-sm text-gray-400">Upload photos of the factory. First image becomes the thumbnail. Drag to reorder.</p>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {editingFactory.gallery?.map((url: string, index: number) => (
                                                    <div
                                                        key={index}
                                                        className={`relative group aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border-2 transition-all cursor-move ${draggedImageIndex === index ? 'border-[#c20c0b] scale-95 opacity-75' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                                        draggable
                                                        onDragStart={() => handleDragStart(index)}
                                                        onDragOver={(e) => handleDragOver(e, index)}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <GripVertical className="text-white drop-shadow-lg" size={24} />
                                                        </div>
                                                        <button type="button" onClick={() => removeGalleryImage(index)}
                                                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg">
                                                            <X size={12} />
                                                        </button>
                                                        {index === 0 && (
                                                            <span className="absolute bottom-2 left-2 bg-[#c20c0b] text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">Cover</span>
                                                        )}
                                                    </div>
                                                ))}
                                                <FileDropZone onDrop={(files) => handleImageUpload(files, 'gallery')} label="Upload Photos" />
                                            </div>

                                            {/* Add gallery image via URL */}
                                            <div className="flex gap-2 items-center">
                                                <Link2 size={16} className="text-gray-400 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Paste image URL and press Enter to add to gallery..."
                                                    className={inputCls}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const url = (e.target as HTMLInputElement).value.trim();
                                                            if (url) {
                                                                setEditingFactory(prev => ({ ...prev, gallery: [...(prev.gallery || []), url] }));
                                                                (e.target as HTMLInputElement).value = '';
                                                                showToast('Image added from URL');
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>

                                            {(editingFactory.gallery?.length || 0) === 0 && (
                                                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                                    <Images size={48} className="mx-auto mb-3 opacity-50" />
                                                    <p className="text-sm font-medium">No images yet</p>
                                                    <p className="text-xs mt-1">Upload photos or paste image URLs above</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>

                        {/* Footer Navigation */}
                        <div className="px-6 md:px-8 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                            {isPreviewMode ? (
                                <>
                                    <button type="button" onClick={() => setIsPreviewMode(false)} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-semibold transition-colors">
                                        <ChevronLeft size={18} /> Back to Edit
                                    </button>
                                    <button onClick={(e) => handleSave(e as any)} disabled={!isDirty}
                                        className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-semibold transition-all shadow-lg ${!isDirty ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-[#c20c0b] hover:bg-[#a50a09] shadow-red-200 dark:shadow-red-900/20'}`}>
                                        <Check size={18} /> Save Factory
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type="button" onClick={prevStep} disabled={currentStep === 0}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${currentStep === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                        <ChevronLeft size={18} /> Back
                                    </button>

                                    {/* Dot indicators */}
                                    <div className="flex items-center gap-1.5">
                                        {STEPS.map((_, idx) => (
                                            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-[#c20c0b]' : idx < currentStep ? 'w-1.5 bg-[#c20c0b]/40' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`} />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {isLastStep ? (
                                            <button type="submit" form="factory-form" disabled={!isDirty}
                                                className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-semibold transition-all shadow-lg ${!isDirty ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-[#c20c0b] hover:bg-[#a50a09] shadow-red-200 dark:shadow-red-900/20'}`}>
                                                <Check size={18} /> Save Factory
                                            </button>
                                        ) : (
                                            <button type="button" onClick={nextStep}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-[#c20c0b] text-white rounded-xl font-semibold hover:bg-[#a50a09] transition-all shadow-lg shadow-red-200 dark:shadow-red-900/20">
                                                Continue <ChevronRight size={18} />
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                </div>
            )}
        </MainLayout>
    );
};
