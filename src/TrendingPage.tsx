import React, { useState, useEffect, FC, useCallback } from 'react';
import { PlayCircle, X, ChevronLeft, ChevronRight, ArrowRight, Clock, User, Tag, ShoppingBag, Sparkles, TrendingUp } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { bannerService, trendingProductService, blogService, shortsService } from './trending.service';

interface TrendingPageProps {
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
}

// ─── Fullscreen Video Player ────────────────────────────────────────
const FullscreenVideoPlayer: FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100]" onClick={onClose}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-[101]">
            <X size={32} />
        </button>
        <div className="relative w-auto h-[90vh] aspect-[9/16]" onClick={e => e.stopPropagation()}>
            <video src={src} autoPlay controls loop className="w-full h-full rounded-xl" />
        </div>
    </div>
);

// ─── Blog Detail Modal ──────────────────────────────────────────────
const BlogDetailModal: FC<{ blog: any; onClose: () => void }> = ({ blog, onClose }) => (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[80] p-4 overflow-y-auto" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10"><X size={24} /></button>
            {blog.cover_image_url && <img src={blog.cover_image_url} alt={blog.title} className="w-full h-72 object-cover" />}
            <div className="p-8">
                <div className="flex items-center gap-2 mb-3">
                    {blog.category && <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-3 py-1 rounded-full">{blog.category}</span>}
                    {blog.published_at && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> {new Date(blog.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{blog.title}</h1>
                {blog.author && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-1"><User size={14} /> By {blog.author}</p>}
                <div className="prose prose-lg dark:prose-invert max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_img]:rounded-lg [&_a]:text-[#c20c0b] [&_blockquote]:border-l-4 [&_blockquote]:border-[#c20c0b] [&_blockquote]:pl-4" dangerouslySetInnerHTML={{ __html: blog.content || '' }} />
            </div>
        </div>
    </div>
);

// ─── Main Trending Page ─────────────────────────────────────────────
export const TrendingPage: FC<TrendingPageProps> = (props) => {
    const [banners, setBanners] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [blogs, setBlogs] = useState<any[]>([]);
    const [shorts, setShorts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
    const [selectedBlog, setSelectedBlog] = useState<any>(null);
    const [productFilter, setProductFilter] = useState<string>('all');

    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        try {
            const [b, p, bl, s] = await Promise.all([
                bannerService.getAll(),
                trendingProductService.getAll(),
                blogService.getAll(),
                shortsService.getAll()
            ]);
            if (b.error) console.error('Banners fetch error:', b.error);
            if (p.error) console.error('Products fetch error:', p.error);
            if (bl.error) console.error('Blogs fetch error:', bl.error);
            if (s.error) console.error('Shorts fetch error:', s.error);

            setBanners((b.data || []).filter((x: any) => x.is_active).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)));
            setProducts((p.data || []).filter((x: any) => x.is_active).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)));
            setBlogs((bl.data || []).filter((x: any) => x.is_published).sort((a: any, b: any) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()));
            setShorts((s.data || []).filter((x: any) => x.is_active).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)));
        } catch (err) {
            console.error('TrendingPage fetch error:', err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-rotate banners
    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => setCurrentBanner(prev => (prev + 1) % banners.length), 5000);
        return () => clearInterval(interval);
    }, [banners.length]);

    const productCategories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
    const filteredProducts = productFilter === 'all' ? products : products.filter(p => p.category === productFilter);
    const featuredProducts = products.filter(p => p.is_featured);

    if (isLoading) {
        return (
            <MainLayout {...props}>
                <div className="flex items-center justify-center py-32">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c20c0b]" />
                </div>
            </MainLayout>
        );
    }

    const hasContent = banners.length > 0 || products.length > 0 || blogs.length > 0 || shorts.length > 0;

    return (
        <MainLayout {...props}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp size={28} className="text-[#c20c0b]" />
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">What's Trending</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Discover the latest in fashion, materials, and manufacturing.</p>
                </div>

                {!hasContent && (
                    <div className="text-center py-20">
                        <Sparkles size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Content coming soon!</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Check back for the latest trends and updates.</p>
                    </div>
                )}

                {/* ─── Banner Slideshow ─────────────────────────────────────── */}
                {banners.length > 0 && (
                    <section className="mb-12">
                        <div className="relative rounded-2xl overflow-hidden h-72 md:h-80 group">
                            {banners.map((banner, idx) => (
                                <div key={banner.id} className={`absolute inset-0 transition-opacity duration-700 ${idx === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                    <img src={banner.image_url} alt={banner.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[8000ms] group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                    <div className="absolute bottom-0 left-0 p-8 text-white max-w-2xl">
                                        <h2 className="text-3xl md:text-4xl font-bold mb-2">{banner.title}</h2>
                                        {banner.subtitle && <p className="text-lg opacity-90 mb-4">{banner.subtitle}</p>}
                                        {banner.cta_text && (
                                            <button className="bg-white text-black font-semibold py-2.5 px-6 rounded-lg hover:bg-opacity-90 transition flex items-center gap-2">
                                                {banner.cta_text} <ArrowRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {/* Nav arrows */}
                            {banners.length > 1 && (
                                <>
                                    <button onClick={() => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"><ChevronLeft size={20} /></button>
                                    <button onClick={() => setCurrentBanner(prev => (prev + 1) % banners.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"><ChevronRight size={20} /></button>
                                    {/* Dots */}
                                    <div className="absolute bottom-4 right-4 flex gap-2">
                                        {banners.map((_, idx) => (
                                            <button key={idx} onClick={() => setCurrentBanner(idx)} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentBanner ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'}`} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                )}

                {/* ─── Featured Products ──────────────────────────────────── */}
                {featuredProducts.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center gap-2 mb-6">
                            <Sparkles size={20} className="text-yellow-500" />
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Featured Products</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {featuredProducts.slice(0, 4).map(product => (
                                <div key={product.id} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden group cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1">
                                    <div className="relative overflow-hidden">
                                        <img src={product.image_url} alt={product.name} className="h-52 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <span className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Sparkles size={10} /> Featured</span>
                                        {product.price_range && <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full">{product.price_range}</span>}
                                    </div>
                                    <div className="p-4">
                                        {product.category && <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-2 py-0.5 rounded-full">{product.category}</span>}
                                        <h3 className="font-bold text-gray-800 dark:text-white mt-1.5 text-sm">{product.name}</h3>
                                        {product.moq && <p className="text-[10px] text-gray-400 mt-1">MOQ: {product.moq}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── All Products ───────────────────────────────────────── */}
                {products.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={20} className="text-[#c20c0b]" />
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Trending Products</h2>
                            </div>
                        </div>
                        {/* Category Filter */}
                        {productCategories.length > 2 && (
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                {productCategories.map(cat => (
                                    <button key={cat} onClick={() => setProductFilter(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${productFilter === cat ? 'bg-[#c20c0b] text-white shadow-lg shadow-red-200 dark:shadow-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                        {cat === 'all' ? 'All' : cat}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {filteredProducts.map(product => (
                                <div key={product.id} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden group cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1">
                                    <div className="relative overflow-hidden">
                                        <img src={product.image_url} alt={product.name} className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        {product.price_range && <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full">{product.price_range}</span>}
                                    </div>
                                    <div className="p-4">
                                        {product.category && <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-2 py-0.5 rounded-full">{product.category}</span>}
                                        <h3 className="font-semibold text-gray-800 dark:text-white mt-1.5 text-sm">{product.name}</h3>
                                        {product.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{product.description}</p>}
                                        {product.tags && product.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {(Array.isArray(product.tags) ? product.tags : []).slice(0, 3).map((tag: string, i: number) => (
                                                    <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                        {product.moq && <p className="text-[10px] text-gray-400 mt-2">MOQ: {product.moq}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── Blog Articles ──────────────────────────────────────── */}
                {blogs.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Latest Articles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {blogs.map(blog => (
                                <div key={blog.id} onClick={() => setSelectedBlog(blog)} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden group cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1">
                                    {blog.cover_image_url && (
                                        <div className="overflow-hidden">
                                            <img src={blog.cover_image_url} alt={blog.title} className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    )}
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            {blog.category && <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-2 py-1 rounded-full">{blog.category}</span>}
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2 group-hover:text-[#c20c0b] transition-colors">{blog.title}</h3>
                                        {blog.excerpt && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{blog.excerpt}</p>}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-gray-400">
                                                {blog.author && `By ${blog.author}`}
                                                {blog.published_at && ` · ${new Date(blog.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                            </p>
                                            <span className="text-xs text-[#c20c0b] font-medium flex items-center gap-1">Read <ArrowRight size={12} /></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── Fashion Shorts ─────────────────────────────────────── */}
                {shorts.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Fashion Shorts</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {shorts.map(short => (
                                <div key={short.id} className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/10 group cursor-pointer aspect-[9/16] hover:shadow-xl transition-all hover:-translate-y-1" onClick={() => setFullscreenVideo(short.video_url)}>
                                    {short.thumbnail_url ? (
                                        <img src={short.thumbnail_url} alt={short.title || short.creator} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 group-hover:scale-110 group-hover:bg-white/30 transition-all">
                                            <PlayCircle size={36} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 p-4 text-white">
                                        {short.title && <p className="font-semibold text-sm mb-0.5">{short.title}</p>}
                                        {short.creator && <p className="text-xs opacity-80">{short.creator}</p>}
                                        {short.views && short.views !== '0' && <p className="text-[10px] opacity-60 mt-0.5">{short.views} views</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Modals */}
            {fullscreenVideo && <FullscreenVideoPlayer src={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />}
            {selectedBlog && <BlogDetailModal blog={selectedBlog} onClose={() => setSelectedBlog(null)} />}
        </MainLayout>
    );
};
