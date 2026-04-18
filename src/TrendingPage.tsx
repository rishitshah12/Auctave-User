import React, { useState, useEffect, useRef, FC, useCallback } from 'react';
import { analyticsService } from './analytics.service';
import { KnittingPreloader } from './KnittingPreloader';
import { PlayCircle, X, ChevronLeft, ChevronRight, ArrowRight, Clock, User, Tag, ShoppingBag, Sparkles, TrendingUp, Volume2, VolumeX } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { bannerService, trendingProductService, blogService, shortsService } from './trending.service';

// ─── YouTube helpers ────────────────────────────────────────────────
const extractYouTubeId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
};

const isYouTubeUrl = (url: string): boolean => extractYouTubeId(url) !== null;
const getYouTubeEmbedUrl = (url: string): string | null => {
    const id = extractYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1` : null;
};
const getYouTubeThumbnail = (videoId: string): string => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

// ─── Animation CSS helpers ──────────────────────────────────────────
// `state`: 'active' = currently visible, 'exiting' = leaving, 'queued' = off-screen waiting
const getSlideAnimationStyles = (animation: string, state: 'active' | 'exiting' | 'queued', duration: number): React.CSSProperties => {
    // Queued slides should not animate — they jump instantly to their off-screen position
    const base: React.CSSProperties = { transition: state === 'queued' ? 'none' : `all ${duration}ms ease-in-out`, position: 'absolute', inset: 0 };
    const pe = state === 'active' ? 'auto' : 'none';
    const op = state === 'active' ? 1 : 0;
    if (animation === 'fade') return { ...base, opacity: op, pointerEvents: pe };
    if (animation === 'slide-left') {
        const tx = state === 'active' ? 'translateX(0)' : state === 'exiting' ? 'translateX(-100%)' : 'translateX(100%)';
        return { ...base, opacity: op, transform: tx, pointerEvents: pe };
    }
    if (animation === 'slide-right') {
        const tx = state === 'active' ? 'translateX(0)' : state === 'exiting' ? 'translateX(100%)' : 'translateX(-100%)';
        return { ...base, opacity: op, transform: tx, pointerEvents: pe };
    }
    if (animation === 'slide-up') {
        const ty = state === 'active' ? 'translateY(0)' : state === 'exiting' ? 'translateY(-100%)' : 'translateY(100%)';
        return { ...base, opacity: op, transform: ty, pointerEvents: pe };
    }
    if (animation === 'slide-down') {
        const ty = state === 'active' ? 'translateY(0)' : state === 'exiting' ? 'translateY(100%)' : 'translateY(-100%)';
        return { ...base, opacity: op, transform: ty, pointerEvents: pe };
    }
    if (animation === 'zoom-in') return { ...base, opacity: op, transform: state === 'active' ? 'scale(1)' : 'scale(0.8)', pointerEvents: pe };
    if (animation === 'zoom-out') return { ...base, opacity: op, transform: state === 'active' ? 'scale(1)' : 'scale(1.2)', pointerEvents: pe };
    if (animation === 'flip') return { ...base, opacity: op, transform: state === 'active' ? 'rotateY(0deg)' : 'rotateY(90deg)', pointerEvents: pe };
    return { ...base, opacity: op, pointerEvents: pe };
};

// Hover animation: returns inline styles for hovered/unhovered state (scoped to banner container)
const getHoverAnimationStyles = (animation: string, isHovered: boolean): React.CSSProperties => {
    const base: React.CSSProperties = { transition: 'transform 0.5s ease, filter 0.5s ease' };
    if (animation === 'scale') return { ...base, transform: isHovered ? 'scale(1.05)' : 'scale(1)' };
    if (animation === 'brightness') return { ...base, filter: isHovered ? 'brightness(1.1)' : 'brightness(1)' };
    if (animation === 'grayscale') return { ...base, filter: isHovered ? 'grayscale(0)' : 'grayscale(1)' };
    if (animation === 'blur-edge') return { ...base, filter: isHovered ? 'blur(0.5px)' : 'blur(0)' };
    return base;
};

// ─── CTA style defaults ─────────────────────────────────────────────
const DEFAULT_CTA_STYLE = {
    bg_color: '#ffffff', text_color: '#000000', border_radius: 8, border_width: 0,
    border_color: '#ffffff', font_size: 14, padding_x: 24, padding_y: 10,
    hover_bg_color: '#f3f3f3', hover_text_color: '#000000', hover_scale: 100,
    shadow: false, icon: true,
};

// Fallback/default fonts to load for blog posts — ensures GOOGLE_FONTS is defined
const GOOGLE_FONTS = [
    'Roboto',
    'Inter',
    'Montserrat',
    'Lora',
    'Playfair Display',
    'Merriweather',
];

// Minimal fallback blog styles to avoid undefined variable errors; can be extended as needed.
const BLOG_STYLES = `
/* Minimal blog editor styles used by BlogBuilder / BlogEditor */
.blog-rich-editor {
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
  color: #000000;
  line-height: 1.6;
}

/* Basic content styling */
.blog-rich-editor h1 { font-size: 2.25rem; font-weight: 700; margin: 0 0 0.5rem; }
.blog-rich-editor h2 { font-size: 1.75rem; font-weight: 700; margin: 0 0 0.5rem; }
.blog-rich-editor p { margin: 0 0 1rem; }
.blog-rich-editor img { max-width: 100%; height: auto; border-radius: 0.5rem; }
.blog-rich-editor blockquote { border-left: 4px solid #c20c0b; padding: 0.5rem 1rem; color: rgba(0,0,0,0.65); background: rgba(0,0,0,0.02); margin: 0 0 1rem; font-style: italic; }
.blog-rich-editor pre { background: #0f172a; color: #e6eef8; padding: 1rem; border-radius: 0.5rem; overflow: auto; margin: 0 0 1rem; }
.blog-rich-editor code { background: rgba(0,0,0,0.04); padding: 0.15rem 0.3rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; }

/* Light/dark support hooks used elsewhere in the app */
.dark .blog-rich-editor {
  color: #ffffff;
}
.dark .blog-rich-editor blockquote {
  background: rgba(255,255,255,0.02);
  color: rgba(255,255,255,0.85);
  border-left-color: #c20c0b;
}
.dark .blog-rich-editor pre {
  background: #0b1220;
}
`;

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
const FullscreenVideoPlayer: FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
    const ytEmbed = getYouTubeEmbedUrl(src);
    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100]" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-[101]">
                <X size={32} />
            </button>
            <div className="relative w-auto h-[90vh] aspect-[9/16]" onClick={e => e.stopPropagation()}>
                {ytEmbed ? (
                    <iframe src={ytEmbed.replace('mute=1', 'mute=0').replace('controls=0', 'controls=1')} allow="autoplay; encrypted-media; fullscreen" allowFullScreen className="w-full h-full rounded-xl border-0" />
                ) : (
                    <video src={src} autoPlay controls loop className="w-full h-full rounded-xl" />
                )}
            </div>
        </div>
    );
};

// ─── Blog Full Page View ────────────────────────────────────────────
const BlogFullPageView: FC<{ blog: any; onBack: () => void }> = ({ blog, onBack }) => {
    useEffect(() => {
        // Load Google Fonts dynamically for the blog post
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS.join('&family=').replace(/ /g, '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => {
            document.head.removeChild(link);
        };
    }, []);

    return (
        <div className="animate-fade-in min-h-screen bg-white dark:bg-black">
            <style>{BLOG_STYLES}</style>
            
            {/* Header / Back Button */}
            <div className="sticky top-14 md:top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                        <span className="font-medium">Back to Trending</span>
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12 pb-32">
                <div className="text-center mb-10">
                    {blog.category && (
                        <span className="inline-block px-3 py-1 mb-4 text-xs font-bold text-[#c20c0b] bg-red-50 dark:bg-red-900/20 rounded-full uppercase tracking-wider">
                            {blog.category}
                        </span>
                    )}
                    <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                        {blog.title}
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        {blog.author && (
                            <span className="flex items-center gap-1.5">
                                <User size={16} />
                                {blog.author}
                            </span>
                        )}
                        <span>•</span>
                        {blog.published_at && (
                            <span className="flex items-center gap-1.5">
                                <Clock size={16} />
                                {new Date(blog.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>

                {blog.cover_image_url && (
                    <div className="mb-12 rounded-2xl overflow-hidden shadow-xl aspect-video relative">
                        <img 
                            src={blog.cover_image_url} 
                            alt={blog.title} 
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                )}

                <div 
                    className="blog-rich-editor" 
                    dangerouslySetInnerHTML={{ __html: blog.content || '' }} 
                />
            </div>
        </div>
    );
};

// ─── Main Trending Page ─────────────────────────────────────────────
export const TrendingPage: FC<TrendingPageProps> = (props) => {
    const [banners, setBanners] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [blogs, setBlogs] = useState<any[]>([]);
    const [shorts, setShorts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
    const [isBannerMuted, setIsBannerMuted] = useState(true);
    const [selectedBlog, setSelectedBlog] = useState<any>(null);
    const [productFilter, setProductFilter] = useState<string>('all');
    const [isBannerHovered, setIsBannerHovered] = useState(false);
    const [ctaHoveredIdx, setCtaHoveredIdx] = useState<number | null>(null);
    const [prevBanner, setPrevBanner] = useState<number | null>(null);

    // Wrap setCurrentBanner to track the exiting slide
    const changeBanner = useCallback((nextOrFn: number | ((prev: number) => number)) => {
        setCurrentBanner(prev => {
            const next = typeof nextOrFn === 'function' ? nextOrFn(prev) : nextOrFn;
            if (next !== prev) setPrevBanner(prev);
            return next;
        });
    }, []);

    // Clear prevBanner after transition completes
    useEffect(() => {
        if (prevBanner === null) return;
        const timer = setTimeout(() => setPrevBanner(null), 800);
        return () => clearTimeout(timer);
    }, [prevBanner]);

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

    // Auto-rotate banners with configurable timer & hover pause
    useEffect(() => {
        if (banners.length <= 1) return;
        const activeBanner = banners[currentBanner];
        const interval = activeBanner?.auto_scroll_interval ?? 5;
        if (interval <= 0) return;
        const pauseOnHover = activeBanner?.pause_on_hover ?? true;
        if (pauseOnHover && isBannerHovered) return;

        // Check if current slide is a video with play_full
        const slides = activeBanner?.slides || [];
        const isSlideshow = activeBanner?.is_slideshow && slides.length > 0;
        if (isSlideshow) {
            // Individual slide timers are handled within BannerSlide
        }

        const timer = setInterval(() => changeBanner(prev => (prev + 1) % banners.length), interval * 1000);
        return () => clearInterval(timer);
    }, [banners.length, currentBanner, isBannerHovered, banners, changeBanner]);

    // If a blog is selected, render the full page view directly
    if (selectedBlog) {
        return (
            <MainLayout {...props}>
                <BlogFullPageView blog={selectedBlog} onBack={() => setSelectedBlog(null)} />
            </MainLayout>
        );
    }

    const productCategories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
    const filteredProducts = productFilter === 'all' ? products : products.filter(p => p.category === productFilter);
    const featuredProducts = products.filter(p => p.is_featured);

    if (isLoading) {
        return (
            <MainLayout {...props}>
                <KnittingPreloader />
            </MainLayout>
        );
    }

    const hasContent = banners.length > 0 || products.length > 0 || blogs.length > 0 || shorts.length > 0;

    return (
        <MainLayout {...props}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-4 sm:mb-8">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <TrendingUp size={22} className="text-[#c20c0b]" />
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white">What's Trending</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Discover the latest in fashion, materials, and manufacturing.</p>
                </div>

                {!hasContent && (
                    <div className="text-center py-20">
                        <Sparkles size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Content coming soon!</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Check back for the latest trends and updates.</p>
                    </div>
                )}

                {/* ─── Banner Slideshow ─────────────────────────────────────── */}
                {banners.length > 0 && (() => {
                    const TEXT_POS_MAP: Record<string, string> = {
                        'bottom-left': 'items-start justify-end',
                        'bottom-center': 'items-center justify-end text-center',
                        'bottom-right': 'items-end justify-end text-right',
                        'center-left': 'items-start justify-center',
                        'center': 'items-center justify-center text-center',
                        'center-right': 'items-end justify-center text-right',
                        'top-left': 'items-start justify-start',
                        'top-center': 'items-center justify-start text-center',
                        'top-right': 'items-end justify-start text-right',
                    };
                    const isMobileView = window.innerWidth < 768;
                    const activeBanner = banners[currentBanner];
                    const mob = activeBanner?.mobile || {};
                    const LEGACY_HEIGHT_MAP: Record<string, number> = { sm: 240, md: 320, lg: 400, xl: 500 };
                    const LEGACY_MOBILE_HEIGHT_MAP: Record<string, number> = { sm: 192, md: 240, lg: 288, xl: 320 };
                    const resolveHeight = (val: any, legacyMap: Record<string, number>, fallback: number): number => {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) return num;
                            if (legacyMap[val]) return legacyMap[val];
                        }
                        return fallback;
                    };
                    const rawDesktopHeight = activeBanner?.banner_height ?? 320;
                    const rawMobileHeight = mob.banner_height ?? rawDesktopHeight;
                    const bannerHeightPx = isMobileView
                        ? resolveHeight(rawMobileHeight, LEGACY_MOBILE_HEIGHT_MAP, 240)
                        : resolveHeight(rawDesktopHeight, LEGACY_HEIGHT_MAP, 320);
                    const fontSizeStyle = (size: any): React.CSSProperties => {
                        if (typeof size === 'number') return { fontSize: `${size}px` };
                        if (typeof size === 'string' && /^\d+$/.test(size)) return { fontSize: `${size}px` };
                        return {};
                    };
                    const fontSizeClass = (size: any): string => {
                        if (typeof size === 'number' || (typeof size === 'string' && /^\d+$/.test(size))) return '';
                        return size || '';
                    };

                    // Animation settings from banner
                    const slideAnimation = activeBanner?.slide_animation || 'fade';
                    const transitionDuration = activeBanner?.transition_duration ?? 700;
                    const hoverAnimation = activeBanner?.hover_animation || 'scale';

                    // Per-banner slideshow state
                    const BannerSlide: FC<{ banner: any; isActive: boolean; isExiting: boolean; bannerIdx: number }> = ({ banner, isActive, isExiting, bannerIdx }) => {
                        const videoRef = React.useRef<HTMLVideoElement>(null);
                        const [slideIdx, setSlideIdx] = useState(0);
                        const allSlides: any[] = banner.slides || [];
                        const bSlides = allSlides.filter((s: any) => s.selected !== false);
                        const bIsSlideshow = banner.is_slideshow && bSlides.length > 0;
                        const currentSlide = bIsSlideshow ? bSlides[slideIdx % bSlides.length] : null;
                        const slideFallback = !bIsSlideshow && bSlides.length > 0 ? bSlides[0] : null;
                        const mediaUrl = bIsSlideshow ? currentSlide?.url : (slideFallback?.url || banner.image_url);
                        const mediaType = bIsSlideshow ? currentSlide?.type : (slideFallback ? slideFallback.type : 'image');

                        // Check YouTube
                        const slideData = bIsSlideshow ? currentSlide : slideFallback;
                        const isYt = slideData?.is_youtube || (mediaUrl && isYouTubeUrl(mediaUrl));
                        const ytEmbedUrl = isYt && mediaUrl ? getYouTubeEmbedUrl(mediaUrl) : null;

                        // Inner slideshow auto-rotate with video play_full support
                        useEffect(() => {
                            if (!bIsSlideshow || bSlides.length <= 1) return;
                            const cs = bSlides[slideIdx % bSlides.length];
                            // If current slide is video with play_full, wait for video ended event
                            if (cs?.type === 'video' && cs?.video_play_full && !cs?.is_youtube) return;
                            const interval = banner.auto_scroll_interval ?? 5;
                            if (interval <= 0) return;
                            // Pause on hover
                            if ((banner.pause_on_hover ?? true) && isBannerHovered) return;
                            const timer = setInterval(() => setSlideIdx(p => (p + 1) % bSlides.length), interval * 1000);
                            return () => clearInterval(timer);
                        }, [bIsSlideshow, bSlides.length, slideIdx, isBannerHovered, banner.auto_scroll_interval, banner.pause_on_hover]);

                        // Play/pause video when slide becomes active/inactive
                        useEffect(() => {
                            const vid = videoRef.current;
                            if (!vid) return;
                            if (isActive) {
                                const tryPlay = () => vid.play().catch(() => {});
                                if (vid.readyState >= 3) {
                                    tryPlay();
                                } else {
                                    vid.addEventListener('canplay', tryPlay, { once: true });
                                    vid.load();
                                    return () => vid.removeEventListener('canplay', tryPlay);
                                }
                            } else {
                                vid.pause();
                            }
                        }, [isActive, mediaUrl]);

                        // Video ended handler for play_full
                        useEffect(() => {
                            const vid = videoRef.current;
                            if (!vid || !bIsSlideshow) return;
                            const cs = bSlides[slideIdx % bSlides.length];
                            if (!cs?.video_play_full) return;
                            const onEnded = () => setSlideIdx(p => (p + 1) % bSlides.length);
                            vid.addEventListener('ended', onEnded);
                            // Don't loop if play_full
                            vid.loop = false;
                            return () => { vid.removeEventListener('ended', onEnded); vid.loop = true; };
                        }, [bIsSlideshow, slideIdx, bSlides]);

                        const mobB = banner.mobile || {};
                        const resolve = (key: string, fallback: any) => {
                            const slideVal = currentSlide?.[key];
                            const bannerVal = banner[key];
                            const base = slideVal != null ? slideVal : (bannerVal != null ? bannerVal : fallback);
                            if (isMobileView) {
                                const slideMob = currentSlide?.mobile || {};
                                if (slideMob[key] != null) return slideMob[key];
                                if (mobB[key] != null) return mobB[key];
                            }
                            return base;
                        };

                        const fpx = resolve('focal_point_x', 50);
                        const fpy = resolve('focal_point_y', 50);
                        const fp = `${fpx}% ${fpy}%`;
                        const fit = resolve('image_fit', 'cover');
                        const opacity = (resolve('overlay_opacity', 60)) / 100;
                        const gc = resolve('gradient_color', '0,0,0');
                        const gd = resolve('gradient_direction', 'to top');
                        const hs = resolve('heading_size', 36);
                        const ss = resolve('subtitle_size', 18);
                        const tp = resolve('text_position', 'bottom-left');
                        const tx = resolve('text_x', null);
                        const ty = resolve('text_y', null);
                        const useCustomPos = tp === 'custom' && tx != null;
                        const posClass = TEXT_POS_MAP[tp] || TEXT_POS_MAP['bottom-left'];

                        const title = currentSlide?.title || banner.title;
                        const subtitle = currentSlide?.subtitle || banner.subtitle;
                        const ctaText = currentSlide?.cta_text || banner.cta_text;
                        const ctaLink = currentSlide?.cta_link || banner.cta_link;

                        // CTA style
                        const ctaS = { ...DEFAULT_CTA_STYLE, ...(banner.cta_style || {}) };
                        const isCtaHovered = ctaHoveredIdx === bannerIdx;

                        const textContent = (
                            <div className="max-w-2xl">
                                <h2 className={`${fontSizeClass(hs)} font-bold mb-2 text-white`} style={fontSizeStyle(hs)}>{title}</h2>
                                {subtitle && <p className={`${fontSizeClass(ss)} text-white/90 mb-4`} style={fontSizeStyle(ss)}>{subtitle}</p>}
                                {ctaText && (
                                    <a
                                        href={ctaLink || '#'}
                                        onClick={e => { if (!ctaLink) e.preventDefault(); }}
                                        onMouseEnter={() => setCtaHoveredIdx(bannerIdx)}
                                        onMouseLeave={() => setCtaHoveredIdx(null)}
                                        className="inline-flex items-center gap-2 font-semibold transition-all no-underline"
                                        style={{
                                            backgroundColor: isCtaHovered ? ctaS.hover_bg_color : ctaS.bg_color,
                                            color: isCtaHovered ? ctaS.hover_text_color : ctaS.text_color,
                                            borderRadius: `${ctaS.border_radius === 9999 ? 9999 : ctaS.border_radius}px`,
                                            border: ctaS.border_width ? `${ctaS.border_width}px solid ${ctaS.border_color}` : 'none',
                                            fontSize: `${ctaS.font_size}px`,
                                            paddingLeft: `${ctaS.padding_x}px`,
                                            paddingRight: `${ctaS.padding_x}px`,
                                            paddingTop: `${ctaS.padding_y}px`,
                                            paddingBottom: `${ctaS.padding_y}px`,
                                            boxShadow: ctaS.shadow ? '0 4px 14px rgba(0,0,0,0.25)' : 'none',
                                            transform: isCtaHovered ? `scale(${(ctaS.hover_scale || 100) / 100})` : 'scale(1)',
                                        }}
                                    >
                                        {ctaText} {ctaS.icon !== false && <ArrowRight size={14} />}
                                    </a>
                                )}
                            </div>
                        );

                        const slideState: 'active' | 'exiting' | 'queued' = isActive ? 'active' : isExiting ? 'exiting' : 'queued';
                        const hoverStyles = getHoverAnimationStyles(hoverAnimation, isBannerHovered && isActive);

                        return (
                            <div style={getSlideAnimationStyles(slideAnimation, slideState, transitionDuration)}>
                                {mediaUrl && (
                                    isYt && ytEmbedUrl ? (
                                        <iframe key={mediaUrl} src={ytEmbedUrl} allow="autoplay; encrypted-media" allowFullScreen className="absolute inset-0 w-full h-full border-0" />
                                    ) : mediaType === 'video' ? (
                                        <video ref={(el) => { (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el; if (el) el.muted = isBannerMuted; }} key={mediaUrl} src={mediaUrl} autoPlay muted={isBannerMuted} loop playsInline className="absolute inset-0 w-full h-full object-cover" style={hoverStyles} />
                                    ) : (
                                        <img src={mediaUrl} alt={title} className="absolute inset-0 w-full h-full" style={{ objectFit: fit as any, objectPosition: fp, ...hoverStyles }} />
                                    )
                                )}
                                <div className="absolute inset-0" style={{ background: `linear-gradient(${gd}, rgba(${gc},${opacity}), rgba(${gc},${opacity * 0.3}), transparent)` }} />
                                {useCustomPos ? (
                                    <div className="absolute z-10" style={{ left: `${tx}%`, top: `${ty}%`, transform: 'translate(-50%, -50%)' }}>
                                        {textContent}
                                    </div>
                                ) : (
                                    <div className={`absolute inset-0 flex flex-col p-8 ${posClass}`}>
                                        {textContent}
                                    </div>
                                )}
                                {bIsSlideshow && bSlides.length > 1 && (
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                                        {bSlides.map((_: any, i: number) => (
                                            <button key={i} onClick={(e) => { e.stopPropagation(); setSlideIdx(i); }} className={`h-1.5 rounded-full transition-all ${i === slideIdx % bSlides.length ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    };

                    return (
                        <section className="mb-12">
                            <div
                                className="relative rounded-2xl overflow-hidden group"
                                style={{ height: `${bannerHeightPx}px`, perspective: slideAnimation === 'flip' ? '1200px' : undefined }}
                                onMouseEnter={() => setIsBannerHovered(true)}
                                onMouseLeave={() => setIsBannerHovered(false)}
                            >
                                {banners.map((banner, idx) => (
                                    <BannerSlide key={banner.id} banner={banner} isActive={idx === currentBanner} isExiting={idx === prevBanner} bannerIdx={idx} />
                                ))}
                                {/* Mute/unmute for video slides */}
                                {(() => {
                                    const ab = banners[currentBanner];
                                    const abSlides = (ab?.slides || []).filter((s: any) => s.selected !== false);
                                    const hasNonYtVideo = ab?.is_slideshow
                                        ? abSlides.some((s: any) => s.type === 'video' && !s.is_youtube && !isYouTubeUrl(s.url || ''))
                                        : (!!ab?.video_url && !isYouTubeUrl(ab?.video_url || ''));
                                    if (!hasNonYtVideo) return null;
                                    return (
                                        <button onClick={() => setIsBannerMuted(!isBannerMuted)} className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100 z-30">
                                            {isBannerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                        </button>
                                    );
                                })()}
                                {banners.length > 1 && (
                                    <>
                                        <button onClick={() => changeBanner(prev => (prev - 1 + banners.length) % banners.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white p-2 rounded-full transition z-30"><ChevronLeft size={20} /></button>
                                        <button onClick={() => changeBanner(prev => (prev + 1) % banners.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white p-2 rounded-full transition z-30"><ChevronRight size={20} /></button>
                                        <div className="absolute bottom-4 right-4 flex gap-2 z-30">
                                            {banners.map((_: any, idx: number) => (
                                                <button key={idx} onClick={() => changeBanner(idx)} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentBanner ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'}`} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    );
                })()}

                {/* ─── Featured Products ──────────────────────────────────── */}
                {featuredProducts.length > 0 && (
                    <section className="mb-6 sm:mb-12">
                        <div className="flex items-center gap-2 mb-3 sm:mb-6">
                            <Sparkles size={18} className="text-yellow-500" />
                            <h2 className="text-base sm:text-2xl font-bold text-gray-800 dark:text-white">Featured Products</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                            {featuredProducts.slice(0, 4).map(product => (
                                <div key={product.id} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden group cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1">
                                    <div className="relative overflow-hidden">
                                        <img src={product.image_url} alt={product.name} className="h-36 sm:h-52 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <span className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Sparkles size={10} /> Featured</span>
                                        {product.price_range && <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full">{product.price_range}</span>}
                                    </div>
                                    <div className="p-2.5 sm:p-4">
                                        {product.category && <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-2 py-0.5 rounded-full">{product.category}</span>}
                                        <h3 className="font-bold text-gray-800 dark:text-white mt-1 sm:mt-1.5 text-xs sm:text-sm">{product.name}</h3>
                                        {product.moq && <p className="text-[10px] text-gray-400 mt-0.5 sm:mt-1">MOQ: {product.moq}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── All Products ───────────────────────────────────────── */}
                {products.length > 0 && (
                    <section className="mb-6 sm:mb-12">
                        <div className="flex items-center justify-between mb-3 sm:mb-6">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} className="text-[#c20c0b]" />
                                <h2 className="text-base sm:text-2xl font-bold text-gray-800 dark:text-white">Trending Products</h2>
                            </div>
                        </div>
                        {/* Category Filter */}
                        {productCategories.length > 2 && (
                            <div className="flex gap-2 mb-3 sm:mb-6 overflow-x-auto pb-1 scrollbar-hide">
                                {productCategories.map(cat => (
                                    <button key={cat} onClick={() => setProductFilter(cat)} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${productFilter === cat ? 'bg-[#c20c0b] text-white shadow-lg shadow-red-200 dark:shadow-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                        {cat === 'all' ? 'All' : cat}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-5">
                            {filteredProducts.map(product => (
                                <div key={product.id} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden group cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1">
                                    <div className="relative overflow-hidden">
                                        <img src={product.image_url} alt={product.name} className="h-36 sm:h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        {product.price_range && <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">{product.price_range}</span>}
                                    </div>
                                    <div className="p-2.5 sm:p-4">
                                        {product.category && <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-2 py-0.5 rounded-full">{product.category}</span>}
                                        <h3 className="font-semibold text-gray-800 dark:text-white mt-1 sm:mt-1.5 text-xs sm:text-sm">{product.name}</h3>
                                        {product.description && <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 line-clamp-2 hidden sm:block">{product.description}</p>}
                                        {product.tags && product.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5 hidden sm:flex">
                                                {(Array.isArray(product.tags) ? product.tags : []).slice(0, 3).map((tag: string, i: number) => (
                                                    <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                        {product.moq && <p className="text-[10px] text-gray-400 mt-1 sm:mt-2">MOQ: {product.moq}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── Blog Articles ──────────────────────────────────────── */}
                {blogs.length > 0 && (
                    <section className="mb-6 sm:mb-12">
                        <h2 className="text-base sm:text-2xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-6">Latest Articles</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                            {blogs.map(blog => (
                                <div key={blog.id} onClick={() => { setSelectedBlog(blog); analyticsService.track('trending_blog_view', { blog_id: blog.id, blog_title: blog.title, blog_category: blog.category }); }} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden group cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1">
                                    {blog.cover_image_url && (
                                        <div className="overflow-hidden">
                                            <img src={blog.cover_image_url} alt={blog.title} className="h-36 sm:h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    )}
                                    <div className="p-3 sm:p-6">
                                        <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
                                            {blog.category && <span className="text-[10px] sm:text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-2 py-0.5 sm:py-1 rounded-full">{blog.category}</span>}
                                        </div>
                                        <h3 className="font-bold text-sm sm:text-lg text-gray-800 dark:text-white mb-1 sm:mb-2 group-hover:text-[#c20c0b] transition-colors line-clamp-2">{blog.title}</h3>
                                        {blog.excerpt && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 sm:mb-3 hidden sm:block">{blog.excerpt}</p>}
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
                        <h2 className="text-base sm:text-2xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-6">Fashion Shorts</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                            {shorts.map(short => {
                                // Auto-pick YouTube thumbnail if no thumbnail_url set
                                const ytId = extractYouTubeId(short.video_url || '');
                                const thumbUrl = short.thumbnail_url || (ytId ? getYouTubeThumbnail(ytId) : null);
                                return (
                                    <div key={short.id} className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/10 group cursor-pointer aspect-[9/16] hover:shadow-xl transition-all hover:-translate-y-1" onClick={() => { setFullscreenVideo(short.video_url); analyticsService.track('trending_video_play', { video_id: short.id, video_title: short.title, creator: short.creator }); }}>
                                        {thumbUrl ? (
                                            <img src={thumbUrl} alt={short.title || short.creator} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>

            {/* Modals */}
            {fullscreenVideo && <FullscreenVideoPlayer src={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />}
        </MainLayout>
    );
};
