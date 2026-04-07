import React, { FC, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    Search, LayoutGrid, List, Filter, FileDown, Star, ChevronLeft, ChevronRight,
    X, Tag, Package, Ruler, Clock, DollarSign, Layers, Eye, Download, Sparkles, Scroll,
    ChevronDown, Folder
} from 'lucide-react';
import { CatalogProduct, FabricOption, FactoryCatalog } from './types';

// --- Tag badge styles ---
const TAG_STYLES: Record<string, string> = {
    bestseller: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700',
    new: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
    'eco-friendly': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
    premium: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    budget: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
};
const getTagStyle = (tag: string) => TAG_STYLES[tag.toLowerCase()] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';

// --- Color swatch display ---
const COLOR_MAP: Record<string, string> = {
    white: '#ffffff', black: '#000000', red: '#ef4444', blue: '#3b82f6', navy: '#1e3a5f',
    green: '#22c55e', yellow: '#eab308', orange: '#f97316', pink: '#ec4899', purple: '#a855f7',
    gray: '#6b7280', grey: '#6b7280', brown: '#92400e', beige: '#d4c5a9', cream: '#fffdd0',
    maroon: '#800000', teal: '#14b8a6', coral: '#f97171', olive: '#84cc16', charcoal: '#374151',
    khaki: '#c3b091', burgundy: '#800020', indigo: '#6366f1', lavender: '#c4b5fd', mint: '#86efac',
    peach: '#fbbf7e', rust: '#b45309', sage: '#9caf88', tan: '#d2b48c', wine: '#722f37',
};
const getColorHex = (color: string) => COLOR_MAP[color.toLowerCase().trim()] || color;

// --- Migrate old catalog format ---
export const migrateCatalog = (catalog: FactoryCatalog): FactoryCatalog => {
    if (catalog.products?.length > 0) return catalog;
    if (!catalog.productCategories?.length) return { ...catalog, products: catalog.products || [] };
    const products: CatalogProduct[] = catalog.productCategories.map((cat, i) => ({
        id: `legacy-${i}`,
        name: cat.name,
        description: cat.description,
        category: cat.name,
        images: cat.imageUrl ? [cat.imageUrl] : [],
        fabricComposition: '',
        availableColors: [],
        sizeRange: '',
        tags: [],
    }));
    return { ...catalog, products };
};

// --- Image Carousel ---
const ImageCarousel: FC<{ images: string[]; name: string; compact?: boolean }> = ({ images, name, compact }) => {
    const [idx, setIdx] = useState(0);
    const validImages = images.filter(Boolean);
    if (validImages.length === 0) return (
        <div className={`${compact ? 'h-36' : 'h-56'} bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center`}>
            <Package size={compact ? 28 : 40} className="text-gray-300 dark:text-gray-600" />
        </div>
    );
    return (
        <div className={`relative ${compact ? 'h-36' : 'h-56'} overflow-hidden group/carousel`}>
            <img src={validImages[idx]} alt={name} className="w-full h-full object-cover transition-transform duration-700 group-hover/carousel:scale-105" />
            {validImages.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + validImages.length) % validImages.length); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % validImages.length); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity">
                        <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {validImages.map((_, i) => (
                            <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-3' : 'bg-white/50'}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// --- Color Swatches ---
const ColorSwatches: FC<{ colors: string[] }> = ({ colors }) => {
    if (!colors.length) return null;
    const show = colors.slice(0, 5);
    const extra = colors.length - 5;
    return (
        <div className="flex items-center gap-1">
            {show.map((c, i) => (
                <span key={i} title={c} className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm inline-block"
                    style={{ backgroundColor: getColorHex(c) }} />
            ))}
            {extra > 0 && <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">+{extra}</span>}
        </div>
    );
};

// --- Product Card (Grid View) ---
const ProductCard: FC<{ product: CatalogProduct; onView: (p: CatalogProduct) => void }> = ({ product, onView }) => (
    <div onClick={() => onView(product)}
        className="group bg-gray-50 dark:bg-black rounded-2xl hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1">
        {/* Padded image with all corners rounded */}
        <div className="p-3 pb-0">
            <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/2' }}>
                <ImageCarousel images={product.images} name={product.name} />
                {/* Tags overlay — top-left */}
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
                    {product.featured && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#c20c0b] text-white flex items-center gap-0.5 shadow-sm">
                            <Sparkles size={10} /> FEATURED
                        </span>
                    )}
                    {product.tags.slice(0, 2).map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-sm ${getTagStyle(tag)}`}>
                            {tag.toUpperCase()}
                        </span>
                    ))}
                </div>
                {/* Brochure download — top-right */}
                {product.brochureUrl && (
                    <a href={product.brochureUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="absolute top-2.5 right-2.5 bg-white/90 dark:bg-gray-800/90 p-1.5 rounded-lg shadow-md hover:bg-white dark:hover:bg-gray-700 transition-colors z-10" title="Download Brochure">
                        <FileDown size={14} className="text-[#c20c0b]" />
                    </a>
                )}
                {/* Price banner — bottom-left, small with fade-out */}
                {product.priceRange && (
                    <div className="absolute bottom-0 left-0 z-10 max-w-[80%]">
                        <div
                            className="flex items-center gap-1.5 pl-3 pr-5 py-1.5"
                            style={{
                                background: 'linear-gradient(to right, rgba(37, 99, 235, 0.92) 60%, rgba(37, 99, 235, 0) 100%)',
                                borderTopRightRadius: '12px',
                            }}
                        >
                            <DollarSign size={12} className="text-white flex-shrink-0" />
                            <span className="text-white text-xs font-bold whitespace-nowrap">{product.priceRange}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
        {/* Content */}
        <div className="px-3.5 pt-3 pb-3.5 flex flex-col flex-grow">
            <h4 className="font-bold text-gray-900 dark:text-white text-[15px] line-clamp-1 group-hover:text-[#c20c0b] transition-colors mb-0.5">{product.name}</h4>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-1 mb-0.5">
                {product.category}{product.subcategory ? ` / ${product.subcategory}` : ''}
                {product.fabricComposition ? ` - ${product.fabricComposition}` : ''}
            </p>

            {/* Colors + Size */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
                <ColorSwatches colors={product.availableColors} />
                {product.sizeRange && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                        <Ruler size={10} /> {product.sizeRange}
                    </span>
                )}
            </div>

            {/* Thin divider */}
            <div className="border-t border-gray-100 dark:border-gray-800 mt-auto" />

            {/* Bottom metrics */}
            <div className="flex items-center justify-between pt-2.5 text-xs text-gray-500 dark:text-gray-400">
                {product.moq && (
                    <span className="flex items-center gap-1">
                        <Package size={11} className="text-gray-400" />
                        <span>MOQ: {product.moq}</span>
                    </span>
                )}
                {product.leadTime && (
                    <span className="flex items-center gap-1 ml-auto">
                        <Clock size={11} className="text-gray-400" />
                        <span>{product.leadTime}</span>
                    </span>
                )}
            </div>
        </div>
    </div>
);

// --- Product Row (List View) ---
const ProductRow: FC<{ product: CatalogProduct; onView: (p: CatalogProduct) => void }> = ({ product, onView }) => (
    <div onClick={() => onView(product)}
        className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#c20c0b]/30 transition-all duration-300 cursor-pointer flex">
        <div className="w-32 sm:w-40 flex-shrink-0 relative">
            <ImageCarousel images={product.images} name={product.name} compact />
            {product.featured && (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#c20c0b] text-white flex items-center gap-0.5">
                    <Sparkles size={9} /> FEATURED
                </span>
            )}
        </div>
        <div className="p-3 sm:p-4 flex-grow flex flex-col justify-between min-w-0">
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[10px] font-semibold text-[#c20c0b] uppercase tracking-wider">{product.category}</p>
                    {product.tags.slice(0, 2).map(tag => (
                        <span key={tag} className={`px-1.5 py-0 rounded text-[9px] font-bold border ${getTagStyle(tag)}`}>{tag}</span>
                    ))}
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-[#c20c0b] transition-colors truncate">{product.name}</h4>
                {product.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
                {product.fabricComposition && <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5"><Layers size={10} /> {product.fabricComposition}</span>}
                <ColorSwatches colors={product.availableColors} />
                {product.sizeRange && <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5"><Ruler size={10} /> {product.sizeRange}</span>}
                {product.priceRange && <span className="text-xs font-bold text-[#c20c0b]">{product.priceRange}</span>}
                {product.moq && <span className="text-[10px] text-gray-400">MOQ: {product.moq}</span>}
                {product.leadTime && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock size={10} /> {product.leadTime}</span>}
                {product.brochureUrl && (
                    <a href={product.brochureUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="text-[10px] text-[#c20c0b] font-semibold flex items-center gap-0.5 hover:underline"><FileDown size={10} /> Brochure</a>
                )}
            </div>
        </div>
    </div>
);

// --- Fabric Swatch Card ---
const FabricCard: FC<{ fabric: FabricOption }> = ({ fabric }) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-sm hover:shadow-md transition-all group">
        {fabric.swatchImageUrl ? (
            <div className="h-24 overflow-hidden">
                <img src={fabric.swatchImageUrl} alt={fabric.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
        ) : (
            <div className="h-24 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <Scroll size={24} className="text-gray-300 dark:text-gray-600" />
            </div>
        )}
        <div className="p-3">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{fabric.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fabric.composition}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
                {fabric.weightGSM && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">{fabric.weightGSM} GSM</span>
                )}
                {fabric.useCases && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">{fabric.useCases}</span>
                )}
            </div>
            {fabric.pricePerMeter && (
                <p className="text-xs font-bold text-[#c20c0b] mt-2">{fabric.pricePerMeter}/m</p>
            )}
        </div>
    </div>
);

// --- Product Detail Modal ---
const ProductDetailModal: FC<{ product: CatalogProduct; onClose: () => void }> = ({ product, onClose }) => {
    const [imgIdx, setImgIdx] = useState(0);
    const validImages = product.images.filter(Boolean);
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 p-1.5 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <X size={18} className="text-gray-600 dark:text-gray-300" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Image Gallery */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-6">
                        <div className="aspect-square rounded-xl overflow-hidden mb-3 border border-gray-200 dark:border-gray-700">
                            {validImages.length > 0 ? (
                                <img src={validImages[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                    <Package size={48} className="text-gray-300 dark:text-gray-600" />
                                </div>
                            )}
                        </div>
                        {validImages.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto">
                                {validImages.map((img, i) => (
                                    <button key={i} onClick={() => setImgIdx(i)}
                                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${i === imgIdx ? 'border-[#c20c0b] shadow-md' : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'}`}>
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="p-6">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {product.featured && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#c20c0b] text-white flex items-center gap-0.5">
                                    <Sparkles size={10} /> FEATURED
                                </span>
                            )}
                            {product.tags.map(tag => (
                                <span key={tag} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTagStyle(tag)}`}>{tag.toUpperCase()}</span>
                            ))}
                        </div>
                        <p className="text-xs font-semibold text-[#c20c0b] uppercase tracking-wider">{product.category}{product.subcategory ? ` / ${product.subcategory}` : ''}</p>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{product.name}</h2>
                        {product.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{product.description}</p>}

                        <div className="mt-5 space-y-3">
                            {product.fabricComposition && (
                                <div className="flex items-center gap-2">
                                    <Layers size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{product.fabricComposition}</span>
                                </div>
                            )}
                            {product.sizeRange && (
                                <div className="flex items-center gap-2">
                                    <Ruler size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{product.sizeRange}</span>
                                </div>
                            )}
                            {product.leadTime && (
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{product.leadTime}</span>
                                </div>
                            )}
                            {product.moq && (
                                <div className="flex items-center gap-2">
                                    <Package size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">MOQ: {product.moq} pcs</span>
                                </div>
                            )}
                        </div>

                        {product.availableColors.length > 0 && (
                            <div className="mt-5">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Available Colors</p>
                                <div className="flex flex-wrap gap-2">
                                    {product.availableColors.map((c, i) => (
                                        <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600"
                                                style={{ backgroundColor: getColorHex(c) }} />
                                            <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{c}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            {product.priceRange && (
                                <span className="text-lg font-bold text-[#c20c0b]">{product.priceRange}</span>
                            )}
                            {product.brochureUrl && (
                                <a href={product.brochureUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-4 py-2 bg-[#c20c0b] text-white text-sm font-bold rounded-xl hover:bg-[#a50a09] transition-colors shadow-md">
                                    <Download size={14} /> Download Brochure
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// =====================
// MAIN COMPONENT
// =====================
interface ProductCatalogProps {
    catalog: FactoryCatalog;
    compact?: boolean; // For admin preview
}

const ProductCatalog: FC<ProductCatalogProps> = ({ catalog, compact }) => {
    const data = useMemo(() => migrateCatalog(catalog), [catalog]);
    const products = data.products || [];
    const fabrics = data.fabricOptions || [];

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const categories = useMemo(() => {
        const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
        return ['All', ...cats];
    }, [products]);

    // Category -> products map for sidebar
    const categoryMap = useMemo(() => {
        const map: Record<string, CatalogProduct[]> = {};
        products.forEach(p => {
            const cat = p.category || 'Uncategorized';
            if (!map[cat]) map[cat] = [];
            map[cat].push(p);
        });
        return map;
    }, [products]);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const filteredProducts = useMemo(() => {
        let result = products;
        if (activeCategory !== 'All') result = result.filter(p => p.category === activeCategory);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.fabricComposition?.toLowerCase().includes(q) ||
                p.tags.some(t => t.toLowerCase().includes(q))
            );
        }
        // Featured products first
        return [...result].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }, [products, activeCategory, search]);

    if (products.length === 0 && fabrics.length === 0) {
        return (
            <div className="text-center py-16">
                <Package size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-bold text-gray-400 dark:text-gray-500">No products in catalog</h3>
                <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">This factory hasn't added any products yet.</p>
            </div>
        );
    }

    return (
        <div className="animate-[fadeIn_0.3s_ease-out]">
            <div className={`flex gap-6 ${compact ? 'flex-col' : ''}`}>

                {/* Sidebar — categories with product names */}
                {!compact && products.length > 0 && (
                    <div className="w-56 flex-shrink-0 hidden lg:block">
                        <div className="sticky top-4 space-y-1">
                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">Categories</h4>

                            {/* All */}
                            <button
                                onClick={() => { setActiveCategory('All'); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeCategory === 'All'
                                        ? 'bg-[#c20c0b]/10 text-[#c20c0b] font-bold'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                                }`}
                            >
                                All Products
                                <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500">({products.length})</span>
                            </button>

                            {/* Categories with expandable product lists */}
                            {Object.entries(categoryMap).map(([cat, catProducts]) => (
                                <div key={cat}>
                                    <button
                                        onClick={() => { setActiveCategory(cat); toggleCategory(cat); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between group/cat ${
                                            activeCategory === cat
                                                ? 'bg-[#c20c0b]/10 text-[#c20c0b] font-bold'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2 min-w-0">
                                            <Folder size={14} className={`flex-shrink-0 ${activeCategory === cat ? 'text-[#c20c0b]' : 'text-gray-400'}`} />
                                            <span className="truncate">{cat}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">({catProducts.length})</span>
                                        </span>
                                        <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${expandedCategories.has(cat) ? 'rotate-180' : ''} ${activeCategory === cat ? 'text-[#c20c0b]' : 'text-gray-400'}`} />
                                    </button>

                                    {/* Expandable product names */}
                                    {expandedCategories.has(cat) && (
                                        <div className="ml-4 mt-0.5 mb-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3 space-y-0.5">
                                            {catProducts.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); }}
                                                    className="w-full text-left px-2 py-1.5 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:text-[#c20c0b] hover:bg-[#c20c0b]/5 transition-all truncate"
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Fabric section link */}
                            {fabrics.length > 0 && (
                                <>
                                    <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                                    <div className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <Scroll size={14} className="text-gray-400" />
                                        <span>Fabrics</span>
                                        <span className="text-[10px] text-gray-400">({fabrics.length})</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-6">
                    {/* Header Bar */}
                    {products.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                            {/* Category pills — visible on small screens where sidebar is hidden */}
                            <div className="flex items-center gap-3 flex-wrap lg:hidden">
                                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                                    {categories.map(cat => (
                                        <button key={cat} onClick={() => setActiveCategory(cat)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                                activeCategory === cat
                                                    ? 'bg-[#c20c0b] text-white shadow-md'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                            }`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                                {/* Search */}
                                <div className="relative flex-grow sm:flex-grow-0">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                                        className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent outline-none" />
                                    {search && (
                                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                {/* View Toggle */}
                                {!compact && (
                                    <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                        <button onClick={() => setViewMode('grid')}
                                            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#c20c0b] text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                            <LayoutGrid size={14} />
                                        </button>
                                        <button onClick={() => setViewMode('list')}
                                            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[#c20c0b] text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                            <List size={14} />
                                        </button>
                                    </div>
                                )}
                                {/* Factory Brochure */}
                                {data.brochureUrl && (
                                    <a href={data.brochureUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#c20c0b] border border-[#c20c0b]/30 rounded-lg hover:bg-[#c20c0b]/5 transition-colors">
                                        <FileDown size={13} /> Brochure
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Products */}
                    {products.length > 0 && (
                        <>
                            {filteredProducts.length === 0 ? (
                                <div className="text-center py-10">
                                    <Search size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No products match your search.</p>
                                </div>
                            ) : viewMode === 'grid' || compact ? (
                                <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'}`}>
                                    {filteredProducts.map(p => <ProductCard key={p.id} product={p} onView={setSelectedProduct} />)}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredProducts.map(p => <ProductRow key={p.id} product={p} onView={setSelectedProduct} />)}
                                </div>
                            )}
                        </>
                    )}

                    {/* Fabric Options */}
                    {fabrics.length > 0 && (
                        <div className="mt-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Scroll size={18} className="text-[#c20c0b]" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fabric Options</h3>
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({fabrics.length})</span>
                            </div>
                            <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'}`}>
                                {fabrics.map((f, i) => <FabricCard key={i} fabric={f} />)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
        </div>
    );
};

export default ProductCatalog;
