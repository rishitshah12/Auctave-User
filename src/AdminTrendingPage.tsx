import React, { useState, useEffect, FC, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit, Image, ShoppingBag, FileText, Video, X, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Bold, Italic, Heading1, Heading2, List, ListOrdered, Link, ImageIcon, Quote, Code, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Type, Maximize2, Minimize2, Move, ZoomIn, ZoomOut, Monitor, Smartphone, Crosshair, ArrowRight, PlayCircle, Sparkles, TrendingUp, Clock, User, Tag, Upload, Palette, Layers, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { bannerService, trendingProductService, blogService, shortsService } from './trending.service';
import { supabase } from './supabaseClient';

interface AdminTrendingPageProps {
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

type TabKey = 'banners' | 'products' | 'blogs' | 'shorts';

// ─── Rich Text Blog Editor ─────────────────────────────────────────
const BlogEditor: FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, []);

    const exec = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
        editorRef.current?.focus();
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const handleInput = () => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const insertLink = () => {
        if (linkUrl) exec('createLink', linkUrl);
        setLinkUrl('');
        setShowLinkModal(false);
    };

    const insertImage = () => {
        if (imageUrl) exec('insertImage', imageUrl);
        setImageUrl('');
        setShowImageModal(false);
    };

    const ToolBtn: FC<{ onClick: () => void; title: string; children: React.ReactNode; active?: boolean }> = ({ onClick, title, children, active }) => (
        <button type="button" onClick={onClick} title={title} className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${active ? 'bg-gray-200 dark:bg-gray-600 text-[#c20c0b]' : 'text-gray-600 dark:text-gray-300'}`}>
            {children}
        </button>
    );

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
                <ToolBtn onClick={() => exec('undo')} title="Undo"><Undo2 size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('redo')} title="Redo"><Redo2 size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => exec('formatBlock', '<h1>')} title="Heading 1"><Heading1 size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('formatBlock', '<h2>')} title="Heading 2"><Heading2 size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('formatBlock', '<p>')} title="Paragraph"><Type size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => exec('bold')} title="Bold"><Bold size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('italic')} title="Italic"><Italic size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('justifyRight')} title="Align Right"><AlignRight size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => exec('insertUnorderedList')} title="Bullet List"><List size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('insertOrderedList')} title="Numbered List"><ListOrdered size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('formatBlock', '<blockquote>')} title="Quote"><Quote size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('formatBlock', '<pre>')} title="Code Block"><Code size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => setShowLinkModal(true)} title="Insert Link"><Link size={16} /></ToolBtn>
                <ToolBtn onClick={() => setShowImageModal(true)} title="Insert Image"><ImageIcon size={16} /></ToolBtn>
            </div>
            {/* Editor area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="min-h-[300px] p-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none prose prose-sm dark:prose-invert max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_p]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:bg-gray-100 [&_pre]:dark:bg-gray-800 [&_pre]:p-3 [&_pre]:rounded [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-blue-600 [&_a]:underline"
                data-placeholder="Start writing your blog post..."
            />
            {/* Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
                        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Insert Link</h3>
                        <input type="url" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3" autoFocus />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowLinkModal(false)} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded">Cancel</button>
                            <button type="button" onClick={insertLink} className="px-3 py-1.5 text-sm bg-[#c20c0b] text-white rounded">Insert</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Image Modal */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
                        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Insert Image</h3>
                        <input type="url" placeholder="Image URL..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3" autoFocus />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowImageModal(false)} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded">Cancel</button>
                            <button type="button" onClick={insertImage} className="px-3 py-1.5 text-sm bg-[#c20c0b] text-white rounded">Insert</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Banner Builder (Wix-style) ─────────────────────────────────────
const BANNER_HEIGHT_PRESETS = [
    { label: '240px', value: 240 },
    { label: '320px', value: 320 },
    { label: '400px', value: 400 },
    { label: '500px', value: 500 },
];

const HEADING_SIZE_PRESETS = [
    { label: '20px', value: 20 },
    { label: '24px', value: 24 },
    { label: '30px', value: 30 },
    { label: '36px', value: 36 },
    { label: '48px', value: 48 },
    { label: '60px', value: 60 },
];

const SUBTITLE_SIZE_PRESETS = [
    { label: '14px', value: 14 },
    { label: '16px', value: 16 },
    { label: '18px', value: 18 },
    { label: '20px', value: 20 },
    { label: '24px', value: 24 },
];

// Helper: resolve font size to inline style (handles both legacy Tailwind classes and new px numbers)
const fontSizeStyle = (size: any): React.CSSProperties => {
    if (typeof size === 'number') return { fontSize: `${size}px` };
    if (typeof size === 'string' && /^\d+$/.test(size)) return { fontSize: `${size}px` };
    return {};
};
const fontSizeClass = (size: any): string => {
    if (typeof size === 'number' || (typeof size === 'string' && /^\d+$/.test(size))) return '';
    return size || '';
};

const GRADIENT_PRESETS = [
    { label: 'Dark', from: '0,0,0', to: '0,0,0' },
    { label: 'Red', from: '194,12,11', to: '0,0,0' },
    { label: 'Blue', from: '30,64,175', to: '0,0,0' },
    { label: 'Purple', from: '126,34,206', to: '0,0,0' },
    { label: 'Teal', from: '13,148,136', to: '0,0,0' },
    { label: 'Amber', from: '180,83,9', to: '0,0,0' },
    { label: 'Rose', from: '190,18,60', to: '0,0,0' },
    { label: 'Green', from: '22,101,52', to: '0,0,0' },
];

const GRADIENT_DIRS = [
    { label: 'Bottom', value: 'to top' },
    { label: 'Top', value: 'to bottom' },
    { label: 'Right', value: 'to left' },
    { label: 'Left', value: 'to right' },
    { label: 'Corner ↗', value: 'to top right' },
    { label: 'Corner ↘', value: 'to bottom right' },
];

const TEXT_POSITIONS: Record<string, { label: string; cls: string }> = {
    'bottom-left': { label: 'Bottom Left', cls: 'items-start justify-end' },
    'bottom-center': { label: 'Bottom Center', cls: 'items-center justify-end text-center' },
    'bottom-right': { label: 'Bottom Right', cls: 'items-end justify-end text-right' },
    'center-left': { label: 'Center Left', cls: 'items-start justify-center' },
    'center': { label: 'Center', cls: 'items-center justify-center text-center' },
    'center-right': { label: 'Center Right', cls: 'items-end justify-center text-right' },
    'top-left': { label: 'Top Left', cls: 'items-start justify-start' },
    'top-center': { label: 'Top Center', cls: 'items-center justify-start text-center' },
    'top-right': { label: 'Top Right', cls: 'items-end justify-start text-right' },
};

interface SlideItem {
    type: 'image' | 'video';
    url: string;
    selected?: boolean;
    title?: string;
    subtitle?: string;
    heading_size?: string;
    subtitle_size?: string;
    text_position?: string;
    text_x?: number | null;
    text_y?: number | null;
    focal_point_x?: number;
    focal_point_y?: number;
    image_fit?: string;
    overlay_opacity?: number;
    gradient_color?: string;
    gradient_direction?: string;
    cta_text?: string;
    cta_link?: string;
}

const BannerBuilder: FC<{
    item: any;
    onChange: (item: any) => void;
    onSave: (e: React.FormEvent) => void;
    onClose: () => void;
    allBanners: any[];
    products: any[];
    blogs: any[];
    shorts: any[];
}> = ({ item, onChange, onSave, onClose, allBanners, products, blogs, shorts }) => {
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [activeSection, setActiveSection] = useState<string>('media');
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const focalRef = useRef<HTMLDivElement>(null);
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
    const previewBannerRef = useRef<HTMLDivElement>(null);

    const set = (key: string, val: any) => onChange({ ...item, [key]: val });
    const setMulti = (updates: Record<string, any>) => onChange({ ...item, ...updates });

    const slides: SlideItem[] = item.slides || [];
    const isSlideshow = item.is_slideshow ?? false;

    // Per-slide settings resolution
    const currentSlide = isSlideshow && slides.length > 0 ? slides[previewSlideIdx % slides.length] : null;
    const resolveSlide = (key: string, fallback: any) => {
        const slideVal = currentSlide?.[key as keyof SlideItem];
        return slideVal != null ? slideVal : (item[key] ?? fallback);
    };

    // Mobile settings resolution
    const mobile = item.mobile || {};
    const resolveMobile = (key: string, val: any) => previewDevice === 'mobile' && mobile[key] != null ? mobile[key] : val;

    // Helper to update a specific slide's field
    const setSlideField = (idx: number, key: string, val: any) => {
        const newSlides = [...slides];
        newSlides[idx] = { ...newSlides[idx], [key]: val };
        set('slides', newSlides);
    };

    // Mobile setting helpers
    const setMobile = (key: string, val: any) => {
        onChange({ ...item, mobile: { ...mobile, [key]: val } });
    };
    const clearMobile = (key: string) => {
        const m = { ...mobile };
        delete m[key];
        onChange({ ...item, mobile: m });
    };

    const focalX = resolveMobile('focal_point_x', isSlideshow ? resolveSlide('focal_point_x', 50) : (item.focal_point_x ?? 50));
    const focalY = resolveMobile('focal_point_y', isSlideshow ? resolveSlide('focal_point_y', 50) : (item.focal_point_y ?? 50));
    const imageFit = isSlideshow ? resolveSlide('image_fit', 'cover') : (item.image_fit || 'cover');
    const bannerHeightPx = resolveMobile('banner_height', item.banner_height || 320);
    const bannerPx = typeof bannerHeightPx === 'number' ? bannerHeightPx : 320;
    const overlayOpacity = resolveMobile('overlay_opacity', isSlideshow ? resolveSlide('overlay_opacity', 60) : (item.overlay_opacity ?? 60));
    const textPos = resolveMobile('text_position', isSlideshow ? resolveSlide('text_position', 'bottom-left') : (item.text_position || 'bottom-left'));
    const headingSize = resolveMobile('heading_size', isSlideshow ? resolveSlide('heading_size', 36) : (item.heading_size || 36));
    const subtitleSize = resolveMobile('subtitle_size', isSlideshow ? resolveSlide('subtitle_size', 18) : (item.subtitle_size || 18));
    const gradientColor = isSlideshow ? resolveSlide('gradient_color', '0,0,0') : (item.gradient_color || '0,0,0');
    const gradientDir = isSlideshow ? resolveSlide('gradient_direction', 'to top') : (item.gradient_direction || 'to top');
    const textX = resolveMobile('text_x', isSlideshow ? resolveSlide('text_x', null) : (item.text_x ?? null));
    const textY = resolveMobile('text_y', isSlideshow ? resolveSlide('text_y', null) : (item.text_y ?? null));

    // Current active media (either single image_url or current slide)
    const currentMediaUrl = isSlideshow && slides.length > 0
        ? slides[previewSlideIdx % slides.length]?.url
        : item.image_url;
    const currentMediaType = isSlideshow && slides.length > 0
        ? slides[previewSlideIdx % slides.length]?.type
        : 'image';

    // ─── File Upload ───
    const uploadFile = async (file: File) => {
        setIsUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const filePath = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('trending-media').upload(filePath, file);
            if (uploadError) {
                // Try quote-attachments as fallback bucket
                const { error: uploadError2 } = await supabase.storage.from('quote-attachments').upload(`banners/${filePath}`, file);
                if (uploadError2) throw uploadError2;
                const { data: { publicUrl } } = supabase.storage.from('quote-attachments').getPublicUrl(`banners/${filePath}`);
                return publicUrl;
            }
            const { data: { publicUrl } } = supabase.storage.from('trending-media').getPublicUrl(filePath);
            return publicUrl;
        } catch (err: any) {
            console.error('Upload failed:', err);
            if ((window as any).showToast) (window as any).showToast('Upload failed: ' + err.message, 'error');
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isVideo = file.type.startsWith('video/');
            const url = await uploadFile(file);
            if (!url) continue;
            if (isSlideshow) {
                const newSlides = [...slides, { type: isVideo ? 'video' as const : 'image' as const, url, selected: true }];
                set('slides', newSlides);
            } else {
                if (isVideo) {
                    set('video_url', url);
                } else {
                    set('image_url', url);
                }
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    };

    // ─── Focal point ───
    const handleFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
        if (isSlideshow && slides.length > 0) {
            const idx = previewSlideIdx % slides.length;
            const newSlides = [...slides];
            newSlides[idx] = { ...newSlides[idx], focal_point_x: x, focal_point_y: y };
            set('slides', newSlides);
        } else {
            setMulti({ focal_point_x: x, focal_point_y: y });
        }
    };

    // ─── Text dragging on preview ───
    const handleTextMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = previewBannerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setIsDraggingText(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            tx: textX ?? (e.clientX - rect.left) / rect.width * 100,
            ty: textY ?? (e.clientY - rect.top) / rect.height * 100
        });
    };

    useEffect(() => {
        if (!isDraggingText) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStart || !previewBannerRef.current) return;
            const rect = previewBannerRef.current.getBoundingClientRect();
            const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
            const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
            const nx = Math.max(5, Math.min(95, dragStart.tx + dx));
            const ny = Math.max(5, Math.min(95, dragStart.ty + dy));
            setMulti({ text_x: Math.round(nx), text_y: Math.round(ny), text_position: 'custom' });
        };
        const handleMouseUp = () => {
            setIsDraggingText(false);
            setDragStart(null);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingText, dragStart]);

    // No auto-rotate in editor — user controls slide navigation manually

    // Preview data
    const previewBanners = allBanners.filter(b => b.is_active).map(b =>
        b.id === item.id ? { ...b, ...item } : b
    );
    if (!item.id && (item.image_url || slides.length > 0)) {
        previewBanners.unshift({ ...item, id: '__new__' });
    }
    const featuredProducts = products.filter(p => p.is_featured && p.is_active);
    const activeProducts = products.filter(p => p.is_active);
    const activeBlogs = blogs.filter(b => b.is_published);
    const activeShorts = shorts.filter(s => s.is_active);

    const Section: FC<{ id: string; title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ id, title, icon, children }) => (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <button type="button" onClick={() => setActiveSection(activeSection === id ? '' : id)} className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeSection === id ? 'text-[#c20c0b] bg-red-50 dark:bg-red-900/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {icon}
                <span className="flex-1 text-left">{title}</span>
                <ChevronDown size={14} className={`transition-transform ${activeSection === id ? 'rotate-180' : ''}`} />
            </button>
            {activeSection === id && <div className="px-4 pb-4 space-y-3">{children}</div>}
        </div>
    );

    const buildGradient = (opacity: number, color: string, dir: string) => {
        const o = opacity / 100;
        return `linear-gradient(${dir}, rgba(${color},${o}), rgba(${color},${o * 0.3}), transparent)`;
    };

    // ─── Banner Preview Renderer ───
    const renderBannerPreview = (banner: any, height: number, interactive = false) => {
        const bSlides: SlideItem[] = banner.slides || [];
        const bIsSlideshow = banner.is_slideshow && bSlides.length > 0;
        const activeSlide = bIsSlideshow ? bSlides[previewSlideIdx % bSlides.length] : null;
        const bMobile = banner.mobile || {};

        // Resolve per-slide then mobile overrides
        const rSlide = (key: string, fallback: any) => {
            const sv = activeSlide?.[key as keyof SlideItem];
            return sv != null ? sv : (banner[key] ?? fallback);
        };
        const rMobile = (key: string, val: any) => previewDevice === 'mobile' && bMobile[key] != null ? bMobile[key] : val;

        const fpx = rMobile('focal_point_x', bIsSlideshow ? rSlide('focal_point_x', 50) : (banner.focal_point_x ?? 50));
        const fpy = rMobile('focal_point_y', bIsSlideshow ? rSlide('focal_point_y', 50) : (banner.focal_point_y ?? 50));
        const fp = `${fpx}% ${fpy}%`;
        const fit = bIsSlideshow ? rSlide('image_fit', 'cover') : (banner.image_fit || 'cover');
        const opacity = rMobile('overlay_opacity', bIsSlideshow ? rSlide('overlay_opacity', 60) : (banner.overlay_opacity ?? 60));
        const gc = bIsSlideshow ? rSlide('gradient_color', '0,0,0') : (banner.gradient_color || '0,0,0');
        const gd = bIsSlideshow ? rSlide('gradient_direction', 'to top') : (banner.gradient_direction || 'to top');
        const rTextPos = rMobile('text_position', bIsSlideshow ? rSlide('text_position', 'bottom-left') : (banner.text_position || 'bottom-left'));
        const pos = TEXT_POSITIONS[rTextPos];
        const hs = rMobile('heading_size', bIsSlideshow ? rSlide('heading_size', 36) : (banner.heading_size || 36));
        const ss = rMobile('subtitle_size', bIsSlideshow ? rSlide('subtitle_size', 18) : (banner.subtitle_size || 18));
        const rTx = rMobile('text_x', bIsSlideshow ? rSlide('text_x', null) : (banner.text_x ?? null));
        const rTy = rMobile('text_y', bIsSlideshow ? rSlide('text_y', null) : (banner.text_y ?? null));
        const useCustomPos = rTextPos === 'custom' && rTx != null;

        // Per-slide title/subtitle/cta overrides
        const displayTitle = (bIsSlideshow && activeSlide?.title) ? activeSlide.title : banner.title;
        const displaySubtitle = (bIsSlideshow && activeSlide?.subtitle) ? activeSlide.subtitle : banner.subtitle;
        const displayCtaText = (bIsSlideshow && activeSlide?.cta_text) ? activeSlide.cta_text : banner.cta_text;

        // Filter to selected slides only for navigation
        const visibleSlides = bSlides.filter(s => s.selected !== false);
        const mediaUrl = bIsSlideshow ? bSlides[previewSlideIdx % bSlides.length]?.url : banner.image_url;
        const mediaType = bIsSlideshow ? bSlides[previewSlideIdx % bSlides.length]?.type : 'image';

        return (
            <div ref={interactive ? previewBannerRef : undefined} className="relative w-full overflow-hidden rounded-2xl" style={{ height }}>
                {mediaUrl ? (
                    mediaType === 'video' ? (
                        <video src={mediaUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                        <img src={mediaUrl} alt={banner.title} className="absolute inset-0 w-full h-full" style={{ objectFit: fit as any, objectPosition: fp }} />
                    )
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                        <ImageIcon size={48} className="text-gray-400 dark:text-gray-500" />
                    </div>
                )}
                <div className="absolute inset-0" style={{ background: buildGradient(opacity, gc, gd) }} />

                {/* Slideshow nav */}
                {bIsSlideshow && bSlides.length > 1 && (
                    <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewSlideIdx(p => (p - 1 + bSlides.length) % bSlides.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white p-1.5 rounded-full transition z-20"><ChevronLeft size={16} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewSlideIdx(p => (p + 1) % bSlides.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white p-1.5 rounded-full transition z-20"><ChevronRight size={16} /></button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                            {bSlides.map((_, i) => (
                                <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setPreviewSlideIdx(i); }} className={`h-1.5 rounded-full transition-all ${i === previewSlideIdx % bSlides.length ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`} />
                            ))}
                        </div>
                    </>
                )}

                {/* Text overlay */}
                {useCustomPos ? (
                    <div
                        className={`absolute z-10 max-w-[60%] ${interactive ? 'cursor-move' : ''}`}
                        style={{ left: `${rTx}%`, top: `${rTy}%`, transform: 'translate(-50%, -50%)' }}
                        onMouseDown={interactive ? handleTextMouseDown : undefined}
                    >
                        {interactive && <div className="absolute -inset-2 border border-dashed border-white/40 rounded-lg pointer-events-none" />}
                        <h2 className={`${fontSizeClass(hs)} font-bold text-white mb-2`} style={fontSizeStyle(hs)}>{displayTitle || 'Banner Title'}</h2>
                        {displaySubtitle && <p className={`${fontSizeClass(ss)} text-white/90 mb-4`} style={fontSizeStyle(ss)}>{displaySubtitle}</p>}
                        {displayCtaText && (
                            <button className="bg-white text-black font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 text-sm">
                                {displayCtaText} <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`absolute inset-0 flex flex-col p-8 ${pos?.cls || ''}`}>
                        <div
                            className={`max-w-2xl ${interactive ? 'cursor-move' : ''}`}
                            onMouseDown={interactive ? handleTextMouseDown : undefined}
                        >
                            {interactive && <div className="absolute -inset-2 border border-dashed border-white/30 rounded-lg pointer-events-none opacity-0 hover:opacity-100 transition-opacity" />}
                            <h2 className={`${fontSizeClass(hs)} font-bold text-white mb-2`} style={fontSizeStyle(hs)}>{displayTitle || 'Banner Title'}</h2>
                            {displaySubtitle && <p className={`${fontSizeClass(ss)} text-white/90 mb-4`} style={fontSizeStyle(ss)}>{displaySubtitle}</p>}
                            {displayCtaText && (
                                <button className="bg-white text-black font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 text-sm">
                                    {displayCtaText} <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 z-50 flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"><X size={20} /></button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                    <h2 className="font-semibold text-gray-800 dark:text-white text-sm">{item.id ? 'Edit Banner' : 'New Banner'}</h2>
                    {item.title && <span className="text-xs text-gray-400 dark:text-gray-500">— {item.title}</span>}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                        <button type="button" onClick={() => setPreviewDevice('desktop')} className={`p-1.5 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-white dark:bg-gray-700 shadow-sm text-[#c20c0b]' : 'text-gray-500'}`}><Monitor size={16} /></button>
                        <button type="button" onClick={() => setPreviewDevice('mobile')} className={`p-1.5 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-white dark:bg-gray-700 shadow-sm text-[#c20c0b]' : 'text-gray-500'}`}><Smartphone size={16} /></button>
                    </div>
                    <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                    <button type="button" onClick={onSave} className="px-4 py-1.5 text-sm bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] transition-colors shadow-md shadow-red-200 dark:shadow-none">{item.id ? 'Update' : 'Create'}</button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* ─── Left Panel: Controls ─── */}
                <div className="w-80 min-w-[320px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">

                    {/* ── Media & Upload ── */}
                    <Section id="media" title="Media & Upload" icon={<Upload size={16} />}>
                        {/* Slideshow toggle */}
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Layers size={12} /> Slideshow Mode</label>
                            <button type="button" onClick={() => {
                                if (!isSlideshow && item.image_url) {
                                    setMulti({ is_slideshow: true, slides: [{ type: 'image', url: item.image_url, selected: true }, ...slides] });
                                } else {
                                    set('is_slideshow', !isSlideshow);
                                }
                            }} className={`relative w-10 h-5 rounded-full transition-colors ${isSlideshow ? 'bg-[#c20c0b]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isSlideshow ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        {/* Drag & Drop Zone */}
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${isDragOver ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
                            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple={isSlideshow} className="hidden" onChange={e => handleFileSelect(e.target.files)} />
                            {isUploading ? (
                                <div className="flex flex-col items-center gap-2 py-2">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#c20c0b]" />
                                    <span className="text-xs text-gray-500">Uploading...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1.5 py-1">
                                    <Upload size={20} className="text-gray-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Drop {isSlideshow ? 'images/videos' : 'an image or video'} here
                                    </span>
                                    <span className="text-[10px] text-gray-400">or click to browse</span>
                                </div>
                            )}
                        </div>

                        {/* URL input */}
                        {!isSlideshow && (
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Or paste URL</label>
                                <input type="text" placeholder="https://..." value={item.image_url || ''} onChange={e => set('image_url', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                        )}

                        {/* Slideshow slides manager */}
                        {isSlideshow && (
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Slides ({slides.length})</label>
                                {slides.length === 0 && <p className="text-[10px] text-gray-400 italic">Upload or paste URLs to add slides</p>}
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {slides.map((slide, idx) => (
                                        <div key={idx} className={`flex items-center gap-2 p-1.5 rounded-lg border transition-colors ${slide.selected === false ? 'opacity-40' : ''} ${idx === previewSlideIdx % slides.length ? 'border-[#c20c0b]/50 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                            <input type="checkbox" checked={slide.selected !== false} onChange={e => setSlideField(idx, 'selected', e.target.checked)} className="w-3.5 h-3.5 accent-[#c20c0b] flex-shrink-0" title="Include in slideshow" />
                                            <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                                                {slide.type === 'video' ? (
                                                    <div className="w-full h-full flex items-center justify-center"><Video size={12} className="text-gray-400" /></div>
                                                ) : (
                                                    <img src={slide.url} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 flex-1 truncate">{slide.title || (slide.type === 'video' ? 'Video' : 'Image')} {idx + 1}</span>
                                            <button type="button" onClick={() => setPreviewSlideIdx(idx)} className={`transition-colors ${idx === previewSlideIdx % slides.length ? 'text-[#c20c0b]' : 'text-gray-400 hover:text-[#c20c0b]'}`}><Eye size={12} /></button>
                                            {idx > 0 && <button type="button" onClick={() => {
                                                const n = [...slides]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; set('slides', n);
                                            }} className="text-gray-400 hover:text-gray-600"><ChevronUp size={12} /></button>}
                                            <button type="button" onClick={() => set('slides', slides.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                                {/* Add URL input for slideshow */}
                                <div className="flex gap-1.5 mt-2">
                                    <input type="text" placeholder="Paste image/video URL..." id="slide-url-input" className="flex-1 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const input = e.currentTarget;
                                            const url = input.value.trim();
                                            if (!url) return;
                                            const isVid = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
                                            set('slides', [...slides, { type: isVid ? 'video' : 'image', url, selected: true }]);
                                            input.value = '';
                                        }
                                    }} />
                                    <button type="button" onClick={() => {
                                        const input = document.getElementById('slide-url-input') as HTMLInputElement;
                                        const url = input?.value?.trim();
                                        if (!url) return;
                                        const isVid = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
                                        set('slides', [...slides, { type: isVid ? 'video' : 'image', url, selected: true }]);
                                        if (input) input.value = '';
                                    }} className="px-2 py-1 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Add</button>
                                </div>

                                {/* Per-slide settings panel */}
                                {slides.length > 0 && (
                                    <div className="mt-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-2.5">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Layers size={12} className="text-[#c20c0b]" />
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Slide {(previewSlideIdx % slides.length) + 1} Overrides</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 italic">Leave blank to use banner defaults</p>
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Slide Title</label>
                                            <input type="text" placeholder={item.title || 'Banner default'} value={slides[previewSlideIdx % slides.length]?.title || ''} onChange={e => setSlideField(previewSlideIdx % slides.length, 'title', e.target.value || undefined)} className="w-full p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Slide Subtitle</label>
                                            <input type="text" placeholder={item.subtitle || 'Banner default'} value={slides[previewSlideIdx % slides.length]?.subtitle || ''} onChange={e => setSlideField(previewSlideIdx % slides.length, 'subtitle', e.target.value || undefined)} className="w-full p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">CTA Text</label>
                                                <input type="text" placeholder={item.cta_text || 'Banner default'} value={slides[previewSlideIdx % slides.length]?.cta_text || ''} onChange={e => setSlideField(previewSlideIdx % slides.length, 'cta_text', e.target.value || undefined)} className="w-full p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">CTA Link</label>
                                                <input type="text" placeholder={item.cta_link || 'Banner default'} value={slides[previewSlideIdx % slides.length]?.cta_link || ''} onChange={e => setSlideField(previewSlideIdx % slides.length, 'cta_link', e.target.value || undefined)} className="w-full p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                            </div>
                                        </div>
                                        {(slides[previewSlideIdx % slides.length]?.title || slides[previewSlideIdx % slides.length]?.subtitle || slides[previewSlideIdx % slides.length]?.cta_text) && (
                                            <button type="button" onClick={() => {
                                                const idx = previewSlideIdx % slides.length;
                                                const newSlides = [...slides];
                                                const { title: _t, subtitle: _s, cta_text: _ct, cta_link: _cl, ...rest } = newSlides[idx];
                                                newSlides[idx] = rest as SlideItem;
                                                set('slides', newSlides);
                                            }} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#c20c0b] transition-colors">
                                                <RotateCcw size={10} /> Clear slide overrides
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </Section>

                    {/* ── Image Focus & Fit ── */}
                    <Section id="focus" title="Focus & Resize" icon={<Crosshair size={16} />}>
                        {currentMediaUrl && currentMediaType === 'image' && (
                            <>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><Crosshair size={12} /> Click to set focal point</label>
                                    <div ref={focalRef} className="relative w-full h-40 rounded-lg overflow-hidden cursor-crosshair border border-gray-300 dark:border-gray-600" onClick={handleFocalClick}>
                                        <img src={currentMediaUrl} alt="" className="w-full h-full" style={{ objectFit: imageFit as any, objectPosition: `${focalX}% ${focalY}%` }} />
                                        <div className="absolute pointer-events-none" style={{ left: `${focalX}%`, top: `${focalY}%`, transform: 'translate(-50%, -50%)' }}>
                                            <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg bg-[#c20c0b]/40 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </div>
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-px bg-white/60" />
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-10 bg-white/60" />
                                        </div>
                                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">{focalX}%, {focalY}%</div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Image Fit {isSlideshow && slides.length > 0 && <span className="text-[10px] text-gray-400">(Slide {(previewSlideIdx % slides.length) + 1})</span>}</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {(['cover', 'contain', 'fill'] as const).map(fit => (
                                            <button key={fit} type="button" onClick={() => {
                                                if (isSlideshow && slides.length > 0) {
                                                    setSlideField(previewSlideIdx % slides.length, 'image_fit', fit);
                                                } else {
                                                    set('image_fit', fit);
                                                }
                                            }} className={`p-1.5 text-xs rounded-lg border transition-colors ${imageFit === fit ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                                {fit.charAt(0).toUpperCase() + fit.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button type="button" onClick={() => {
                                    if (isSlideshow && slides.length > 0) {
                                        const idx = previewSlideIdx % slides.length;
                                        const newSlides = [...slides];
                                        const { focal_point_x: _fx, focal_point_y: _fy, ...rest } = newSlides[idx];
                                        newSlides[idx] = rest as SlideItem;
                                        set('slides', newSlides);
                                    } else {
                                        setMulti({ focal_point_x: 50, focal_point_y: 50 });
                                    }
                                }} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <RotateCcw size={10} /> Reset focal point
                                </button>
                            </>
                        )}
                        {(!currentMediaUrl || currentMediaType !== 'image') && (
                            <p className="text-xs text-gray-400 italic py-2">Add an image to configure focus & fit settings</p>
                        )}
                    </Section>

                    {/* ── Banner Sizing ── */}
                    <Section id="sizing" title={`Banner Size${previewDevice === 'mobile' ? ' (Mobile)' : ''}`} icon={<Maximize2 size={16} />}>
                        {previewDevice === 'mobile' && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Editing mobile banner height. Changes only affect mobile view.</p>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Height (px)</label>
                            <div className="flex gap-1.5 flex-wrap mb-2">
                                {BANNER_HEIGHT_PRESETS.map(p => (
                                    <button key={p.value} type="button" onClick={() => previewDevice === 'mobile' ? setMobile('banner_height', p.value) : set('banner_height', p.value)} className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${bannerPx === p.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" min={100} max={800} step={10} value={bannerPx} onChange={e => {
                                    const val = parseInt(e.target.value) || 320;
                                    if (previewDevice === 'mobile') setMobile('banner_height', val);
                                    else set('banner_height', val);
                                }} className="w-24 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                <span className="text-[10px] text-gray-400">px</span>
                                {previewDevice === 'mobile' && mobile.banner_height != null && (
                                    <button type="button" onClick={() => clearMobile('banner_height')} className="text-[10px] text-gray-400 hover:text-[#c20c0b] flex items-center gap-0.5"><RotateCcw size={9} /> Use desktop</button>
                                )}
                            </div>
                        </div>
                    </Section>

                    {/* ── Gradient Overlay ── */}
                    <Section id="overlay" title={`Overlay & Gradient${previewDevice === 'mobile' ? ' (Mobile)' : ''}`} icon={<Palette size={16} />}>
                        {isSlideshow && slides.length > 0 && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">Editing Slide {(previewSlideIdx % slides.length) + 1} overlay. Clear values to use banner defaults.</p>
                        )}
                        {previewDevice === 'mobile' && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Editing mobile overlay. Changes only affect mobile view.</p>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Intensity: {overlayOpacity}%</label>
                            <input type="range" min={0} max={100} value={overlayOpacity} onChange={e => {
                                const val = parseInt(e.target.value);
                                if (previewDevice === 'mobile') {
                                    setMobile('overlay_opacity', val);
                                } else if (isSlideshow && slides.length > 0) {
                                    setSlideField(previewSlideIdx % slides.length, 'overlay_opacity', val);
                                } else {
                                    set('overlay_opacity', val);
                                }
                            }} className="w-full accent-[#c20c0b]" />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                <span>None</span>
                                <span>Full</span>
                            </div>
                            {previewDevice === 'mobile' && mobile.overlay_opacity != null && (
                                <button type="button" onClick={() => clearMobile('overlay_opacity')} className="text-[10px] text-gray-400 hover:text-[#c20c0b] flex items-center gap-0.5 mt-1"><RotateCcw size={9} /> Use desktop</button>
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Gradient Color</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {GRADIENT_PRESETS.map(preset => (
                                    <button key={preset.label} type="button" onClick={() => {
                                        if (isSlideshow && slides.length > 0) {
                                            setSlideField(previewSlideIdx % slides.length, 'gradient_color', preset.from);
                                        } else {
                                            set('gradient_color', preset.from);
                                        }
                                    }} className={`relative group p-1 rounded-lg border transition-colors ${gradientColor === preset.from ? 'border-[#c20c0b] ring-1 ring-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'}`}>
                                        <div className="h-6 rounded" style={{ background: `linear-gradient(to top, rgba(${preset.from},0.9), rgba(${preset.from},0.1))` }} />
                                        <span className="text-[9px] text-gray-500 dark:text-gray-400 block text-center mt-0.5">{preset.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Custom Color</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={`#${gradientColor.split(',').map((c: string) => parseInt(c).toString(16).padStart(2, '0')).join('')}`} onChange={e => {
                                    const hex = e.target.value;
                                    const r = parseInt(hex.slice(1, 3), 16);
                                    const g = parseInt(hex.slice(3, 5), 16);
                                    const b = parseInt(hex.slice(5, 7), 16);
                                    const val = `${r},${g},${b}`;
                                    if (isSlideshow && slides.length > 0) {
                                        setSlideField(previewSlideIdx % slides.length, 'gradient_color', val);
                                    } else {
                                        set('gradient_color', val);
                                    }
                                }} className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                                <span className="text-[10px] text-gray-400 font-mono">rgb({gradientColor})</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Direction</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {GRADIENT_DIRS.map(d => (
                                    <button key={d.value} type="button" onClick={() => {
                                        if (isSlideshow && slides.length > 0) {
                                            setSlideField(previewSlideIdx % slides.length, 'gradient_direction', d.value);
                                        } else {
                                            set('gradient_direction', d.value);
                                        }
                                    }} className={`p-1.5 text-[10px] rounded-lg border transition-colors ${gradientDir === d.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Live gradient preview swatch */}
                        <div className="mt-1">
                            <div className="h-8 rounded-lg border border-gray-200 dark:border-gray-600" style={{ background: buildGradient(overlayOpacity, gradientColor, gradientDir) }} />
                        </div>
                    </Section>

                    {/* ── Text & Typography ── */}
                    <Section id="text" title={`Text & Typography${previewDevice === 'mobile' ? ' (Mobile)' : ''}`} icon={<Type size={16} />}>
                        {isSlideshow && slides.length > 0 && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">These are banner defaults. Override per-slide in the Media section above.</p>
                        )}
                        {previewDevice === 'mobile' && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Editing mobile overrides. Changes only affect mobile view.</p>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Title *</label>
                            <input type="text" placeholder="Banner Title" value={item.title || ''} onChange={e => set('title', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Heading Size (px)</label>
                            <div className="flex gap-1 flex-wrap mb-1.5">
                                {HEADING_SIZE_PRESETS.map(s => (
                                    <button key={s.value} type="button" onClick={() => previewDevice === 'mobile' ? setMobile('heading_size', s.value) : set('heading_size', s.value)} className={`px-2 py-1.5 text-xs rounded-lg border font-semibold transition-colors ${headingSize === s.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" min={10} max={120} value={typeof headingSize === 'number' ? headingSize : 36} onChange={e => {
                                    const val = parseInt(e.target.value) || 36;
                                    if (previewDevice === 'mobile') setMobile('heading_size', val);
                                    else set('heading_size', val);
                                }} className="w-20 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                <span className="text-[10px] text-gray-400">px</span>
                                {previewDevice === 'mobile' && mobile.heading_size != null && (
                                    <button type="button" onClick={() => clearMobile('heading_size')} className="text-[10px] text-gray-400 hover:text-[#c20c0b] flex items-center gap-0.5"><RotateCcw size={9} /> Use desktop</button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Subtitle</label>
                            <input type="text" placeholder="Optional subtitle text" value={item.subtitle || ''} onChange={e => set('subtitle', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Subtitle Size (px)</label>
                            <div className="flex gap-1 flex-wrap mb-1.5">
                                {SUBTITLE_SIZE_PRESETS.map(s => (
                                    <button key={s.value} type="button" onClick={() => previewDevice === 'mobile' ? setMobile('subtitle_size', s.value) : set('subtitle_size', s.value)} className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${subtitleSize === s.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" min={10} max={60} value={typeof subtitleSize === 'number' ? subtitleSize : 18} onChange={e => {
                                    const val = parseInt(e.target.value) || 18;
                                    if (previewDevice === 'mobile') setMobile('subtitle_size', val);
                                    else set('subtitle_size', val);
                                }} className="w-20 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                <span className="text-[10px] text-gray-400">px</span>
                                {previewDevice === 'mobile' && mobile.subtitle_size != null && (
                                    <button type="button" onClick={() => clearMobile('subtitle_size')} className="text-[10px] text-gray-400 hover:text-[#c20c0b] flex items-center gap-0.5"><RotateCcw size={9} /> Use desktop</button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center justify-between">
                                <span>Text Position{previewDevice === 'mobile' ? ' (Mobile)' : ''}</span>
                                {textPos === 'custom' && (
                                    <button type="button" onClick={() => {
                                        if (previewDevice === 'mobile') { setMobile('text_position', 'bottom-left'); clearMobile('text_x'); clearMobile('text_y'); }
                                        else setMulti({ text_position: 'bottom-left', text_x: null, text_y: null });
                                    }} className="text-[10px] text-gray-400 hover:text-[#c20c0b] flex items-center gap-0.5"><RotateCcw size={9} /> Reset</button>
                                )}
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                                {Object.entries(TEXT_POSITIONS).map(([key, val]) => (
                                    <button key={key} type="button" onClick={() => {
                                        if (previewDevice === 'mobile') { setMobile('text_position', key); clearMobile('text_x'); clearMobile('text_y'); }
                                        else setMulti({ text_position: key, text_x: null, text_y: null });
                                    }} className={`p-1 text-[10px] rounded-lg border transition-colors ${textPos === key ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {val.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1"><Move size={10} /> Or drag the text on the preview to position freely</p>
                            {previewDevice === 'mobile' && mobile.text_position != null && (
                                <button type="button" onClick={() => { clearMobile('text_position'); clearMobile('text_x'); clearMobile('text_y'); }} className="text-[10px] text-gray-400 hover:text-[#c20c0b] flex items-center gap-0.5 mt-1"><RotateCcw size={9} /> Use desktop position</button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">CTA Text</label>
                                <input type="text" placeholder="Explore Now" value={item.cta_text || ''} onChange={e => set('cta_text', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">CTA Link</label>
                                <input type="text" placeholder="/page" value={item.cta_link || ''} onChange={e => set('cta_link', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                        </div>
                    </Section>

                    {/* ── Settings ── */}
                    <Section id="settings" title="Settings" icon={<GripVertical size={16} />}>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Sort Order</label>
                                <input type="number" value={item.sort_order || 0} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={item.is_active ?? true} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-[#c20c0b]" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                                </label>
                            </div>
                        </div>
                    </Section>

                </div>

                {/* ─── Right Panel: Live Preview ─── */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6">
                    <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-5xl'}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Live Preview</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">— Drag text to reposition</span>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp size={20} className="text-[#c20c0b]" />
                                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">What's Trending</h1>
                                </div>
                                <p className="text-xs text-gray-400">Discover the latest in fashion, materials, and manufacturing.</p>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Banner — editable */}
                                <div className="relative">
                                    <div className="absolute -top-2 -left-2 -right-2 -bottom-2 border-2 border-dashed border-[#c20c0b]/40 rounded-2xl pointer-events-none z-10" />
                                    <div className="absolute -top-3 left-3 bg-[#c20c0b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
                                        <Edit size={10} /> Editing{isSlideshow && slides.length > 0 ? ` (Slide ${(previewSlideIdx % slides.length) + 1}/${slides.length})` : ''}
                                    </div>
                                    {renderBannerPreview(item, bannerPx, true)}
                                    {previewBanners.length > 1 && !isSlideshow && (
                                        <div className="absolute bottom-3 right-3 flex gap-1.5 z-20">
                                            {previewBanners.map((_, idx) => (
                                                <div key={idx} className={`h-2 rounded-full transition-all ${idx === 0 ? 'bg-white w-5' : 'bg-white/50 w-2'}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {featuredProducts.length > 0 && (
                                    <div className="opacity-50">
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <Sparkles size={14} className="text-yellow-500" />
                                            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Featured Products</h2>
                                        </div>
                                        <div className={`grid ${previewDevice === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
                                            {featuredProducts.slice(0, 4).map(p => (
                                                <div key={p.id} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                    <img src={p.image_url} alt={p.name} className="h-20 w-full object-cover" />
                                                    <div className="p-2"><p className="text-[10px] font-semibold text-gray-800 dark:text-white truncate">{p.name}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeProducts.length > 0 && (
                                    <div className="opacity-50">
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <ShoppingBag size={14} className="text-[#c20c0b]" />
                                            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Trending Products</h2>
                                        </div>
                                        <div className={`grid ${previewDevice === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
                                            {activeProducts.slice(0, 4).map(p => (
                                                <div key={p.id} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                    <img src={p.image_url} alt={p.name} className="h-16 w-full object-cover" />
                                                    <div className="p-2"><p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate">{p.name}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeBlogs.length > 0 && (
                                    <div className="opacity-50">
                                        <h2 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Latest Articles</h2>
                                        <div className={`grid ${previewDevice === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
                                            {activeBlogs.slice(0, 3).map(b => (
                                                <div key={b.id} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                    {b.cover_image_url && <img src={b.cover_image_url} alt={b.title} className="h-16 w-full object-cover" />}
                                                    <div className="p-2"><p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate">{b.title}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeShorts.length > 0 && (
                                    <div className="opacity-50">
                                        <h2 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Fashion Shorts</h2>
                                        <div className={`grid ${previewDevice === 'mobile' ? 'grid-cols-3' : 'grid-cols-5'} gap-2`}>
                                            {activeShorts.slice(0, 5).map(s => (
                                                <div key={s.id} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-[9/16] relative bg-gray-200 dark:bg-gray-700">
                                                    {s.thumbnail_url && <img src={s.thumbnail_url} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />}
                                                    <div className="absolute inset-0 flex items-center justify-center"><PlayCircle size={16} className="text-white/70" /></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Admin CMS ─────────────────────────────────────────────────
export const AdminTrendingPage: FC<AdminTrendingPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<TabKey>('banners');
    const [banners, setBanners] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [blogs, setBlogs] = useState<any[]>([]);
    const [shorts, setShorts] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);
    const [previewBlog, setPreviewBlog] = useState<any>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if ((window as any).showToast) (window as any).showToast(message, type);
    };

    const getService = (tab: TabKey) => {
        switch (tab) {
            case 'banners': return bannerService;
            case 'products': return trendingProductService;
            case 'blogs': return blogService;
            case 'shorts': return shortsService;
        }
    };

    const getItems = (tab: TabKey) => {
        switch (tab) {
            case 'banners': return banners;
            case 'products': return products;
            case 'blogs': return blogs;
            case 'shorts': return shorts;
        }
    };

    const setItems = (tab: TabKey, data: any[]) => {
        switch (tab) {
            case 'banners': setBanners(data); break;
            case 'products': setProducts(data); break;
            case 'blogs': setBlogs(data); break;
            case 'shorts': setShorts(data); break;
        }
    };

    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        const [b, p, bl, s] = await Promise.all([
            bannerService.getAll(),
            trendingProductService.getAll(),
            blogService.getAll(),
            shortsService.getAll()
        ]);
        if (b.data) setBanners(b.data);
        if (p.data) setProducts(p.data);
        if (bl.data) setBlogs(bl.data);
        if (s.data) setShorts(s.data);
        setIsLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const service = getService(activeTab);
        const { id, ...payload } = editingItem;

        // Clean up payload based on tab
        if (activeTab === 'banners') {
            delete payload.created_at;
            delete payload.updated_at;
        }
        if (activeTab === 'products' && typeof payload.tags === 'string') {
            payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        if (activeTab === 'blogs' && payload.is_published && !payload.published_at) {
            payload.published_at = new Date().toISOString();
        }
        delete payload.created_at;
        delete payload.updated_at;

        if (id) {
            const { error } = await service.update(id, payload);
            if (error) showToast(error.message, 'error');
            else { showToast('Updated successfully'); setIsModalOpen(false); fetchAll(); }
        } else {
            const { error } = await service.create(payload);
            if (error) showToast(error.message, 'error');
            else { showToast('Created successfully'); setIsModalOpen(false); fetchAll(); }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this item?')) return;
        const { error } = await getService(activeTab).delete(id);
        if (error) showToast(error.message, 'error');
        else { showToast('Deleted'); fetchAll(); }
    };

    const handleToggleActive = async (item: any, field: string = 'is_active') => {
        const service = getService(activeTab);
        const { error } = await service.update(item.id, { [field]: !item[field] });
        if (error) showToast(error.message, 'error');
        else fetchAll();
    };

    const openAdd = () => {
        const defaults: Record<TabKey, any> = {
            banners: { title: '', subtitle: '', image_url: '', cta_text: 'Explore Now', cta_link: '', sort_order: 0, is_active: true, focal_point_x: 50, focal_point_y: 50, image_fit: 'cover', banner_height: 320, overlay_opacity: 60, text_position: 'bottom-left', heading_size: 36, subtitle_size: 18, gradient_color: '0,0,0', gradient_direction: 'to top', is_slideshow: false, slides: [], text_x: null, text_y: null, mobile: {} },
            products: { name: '', category: '', image_url: '', price_range: '', description: '', tags: '', moq: '', is_featured: false, is_active: true, sort_order: 0 },
            blogs: { title: '', category: '', author: '', cover_image_url: '', content: '', excerpt: '', is_published: false },
            shorts: { title: '', creator: '', video_url: '', thumbnail_url: '', views: '0', is_active: true, sort_order: 0 }
        };
        setEditingItem(defaults[activeTab]);
        setIsModalOpen(true);
    };

    const openEdit = (item: any) => {
        const copy = { ...item };
        if (activeTab === 'products' && Array.isArray(copy.tags)) {
            copy.tags = copy.tags.join(', ');
        }
        setEditingItem(copy);
        setIsModalOpen(true);
    };

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
        { key: 'banners', label: 'Banners', icon: <Image size={18} />, count: banners.length },
        { key: 'products', label: 'Products', icon: <ShoppingBag size={18} />, count: products.length },
        { key: 'blogs', label: 'Blogs', icon: <FileText size={18} />, count: blogs.length },
        { key: 'shorts', label: 'Fashion Shorts', icon: <Video size={18} />, count: shorts.length },
    ];

    // ─── Form Renderers ────────────────────────────────────────────
    const renderBannerForm = () => (
        <>
            <input type="text" placeholder="Banner Title *" required value={editingItem.title || ''} onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="text" placeholder="Subtitle" value={editingItem.subtitle || ''} onChange={e => setEditingItem({ ...editingItem, subtitle: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="text" placeholder="Image URL *" required value={editingItem.image_url || ''} onChange={e => setEditingItem({ ...editingItem, image_url: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            {editingItem.image_url && <img src={editingItem.image_url} alt="Preview" className="h-32 w-full object-cover rounded-lg" />}
            <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="CTA Text" value={editingItem.cta_text || ''} onChange={e => setEditingItem({ ...editingItem, cta_text: e.target.value })} className="p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="text" placeholder="CTA Link" value={editingItem.cta_link || ''} onChange={e => setEditingItem({ ...editingItem, cta_link: e.target.value })} className="p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Sort Order</label>
                    <input type="number" value={editingItem.sort_order || 0} onChange={e => setEditingItem({ ...editingItem, sort_order: parseInt(e.target.value) || 0 })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" checked={editingItem.is_active ?? true} onChange={e => setEditingItem({ ...editingItem, is_active: e.target.checked })} className="w-4 h-4 accent-[#c20c0b]" />
                    <label className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                </div>
            </div>
        </>
    );

    const renderProductForm = () => (
        <>
            <input type="text" placeholder="Product Name *" required value={editingItem.name || ''} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Category" value={editingItem.category || ''} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })} className="p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="text" placeholder="Price Range (e.g. $15-$25)" value={editingItem.price_range || ''} onChange={e => setEditingItem({ ...editingItem, price_range: e.target.value })} className="p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <input type="text" placeholder="Image URL *" required value={editingItem.image_url || ''} onChange={e => setEditingItem({ ...editingItem, image_url: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            {editingItem.image_url && <img src={editingItem.image_url} alt="Preview" className="h-32 w-full object-cover rounded-lg" />}
            <textarea placeholder="Description" value={editingItem.description || ''} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} rows={3} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" />
            <input type="text" placeholder="Tags (comma separated: bestseller, eco-friendly, new)" value={editingItem.tags || ''} onChange={e => setEditingItem({ ...editingItem, tags: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="text" placeholder="MOQ (e.g. 500 pcs)" value={editingItem.moq || ''} onChange={e => setEditingItem({ ...editingItem, moq: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingItem.is_featured ?? false} onChange={e => setEditingItem({ ...editingItem, is_featured: e.target.checked })} className="w-4 h-4 accent-[#c20c0b]" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingItem.is_active ?? true} onChange={e => setEditingItem({ ...editingItem, is_active: e.target.checked })} className="w-4 h-4 accent-[#c20c0b]" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
            </div>
        </>
    );

    const renderBlogForm = () => (
        <>
            <input type="text" placeholder="Blog Title *" required value={editingItem.title || ''} onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Category (e.g. Materials, Styles)" value={editingItem.category || ''} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })} className="p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="text" placeholder="Author" value={editingItem.author || ''} onChange={e => setEditingItem({ ...editingItem, author: e.target.value })} className="p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <input type="text" placeholder="Cover Image URL" value={editingItem.cover_image_url || ''} onChange={e => setEditingItem({ ...editingItem, cover_image_url: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            {editingItem.cover_image_url && <img src={editingItem.cover_image_url} alt="Cover Preview" className="h-32 w-full object-cover rounded-lg" />}
            <textarea placeholder="Excerpt (short summary shown on cards)" value={editingItem.excerpt || ''} onChange={e => setEditingItem({ ...editingItem, excerpt: e.target.value })} rows={2} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" />
            <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Blog Content</label>
                <BlogEditor value={editingItem.content || ''} onChange={v => setEditingItem({ ...editingItem, content: v })} />
            </div>
            <label className="flex items-center gap-2">
                <input type="checkbox" checked={editingItem.is_published ?? false} onChange={e => setEditingItem({ ...editingItem, is_published: e.target.checked })} className="w-4 h-4 accent-[#c20c0b]" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Publish immediately</span>
            </label>
        </>
    );

    const renderShortsForm = () => (
        <>
            <input type="text" placeholder="Title" value={editingItem.title || ''} onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="text" placeholder="Creator (e.g. @fashionista)" value={editingItem.creator || ''} onChange={e => setEditingItem({ ...editingItem, creator: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="text" placeholder="Video URL *" required value={editingItem.video_url || ''} onChange={e => setEditingItem({ ...editingItem, video_url: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="text" placeholder="Thumbnail URL" value={editingItem.thumbnail_url || ''} onChange={e => setEditingItem({ ...editingItem, thumbnail_url: e.target.value })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            {editingItem.thumbnail_url && <img src={editingItem.thumbnail_url} alt="Thumbnail Preview" className="h-40 w-28 object-cover rounded-lg" />}
            <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Views (e.g. 1.2M)" value={editingItem.views || ''} onChange={e => setEditingItem({ ...editingItem, views: e.target.value })} className="p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Sort Order</label>
                    <input type="number" value={editingItem.sort_order || 0} onChange={e => setEditingItem({ ...editingItem, sort_order: parseInt(e.target.value) || 0 })} className="w-full p-2.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
            </div>
            <label className="flex items-center gap-2">
                <input type="checkbox" checked={editingItem.is_active ?? true} onChange={e => setEditingItem({ ...editingItem, is_active: e.target.checked })} className="w-4 h-4 accent-[#c20c0b]" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
        </>
    );

    const renderForm = () => {
        switch (activeTab) {
            case 'banners': return renderBannerForm();
            case 'products': return renderProductForm();
            case 'blogs': return renderBlogForm();
            case 'shorts': return renderShortsForm();
        }
    };

    // ─── Card Renderers ─────────────────────────────────────────────
    const renderBannerCard = (item: any) => (
        <div key={item.id} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden group">
            <div className="relative h-40">
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                {!item.is_active && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-semibold text-sm bg-red-600 px-3 py-1 rounded-full">Inactive</span></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 text-white">
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    {item.subtitle && <p className="text-sm opacity-80">{item.subtitle}</p>}
                </div>
            </div>
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {item.cta_text && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{item.cta_text}</span>}
                    <span className="text-xs text-gray-500">Order: {item.sort_order}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleToggleActive(item)} className={`transition-colors ${item.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>{item.is_active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 transition-colors"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 transition-colors"><Trash2 size={18} /></button>
                </div>
            </div>
        </div>
    );

    const renderProductCard = (item: any) => (
        <div key={item.id} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden group">
            <div className="relative h-48">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                {item.is_featured && <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">Featured</span>}
                {!item.is_active && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-semibold text-sm bg-red-600 px-3 py-1 rounded-full">Inactive</span></div>}
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        {item.category && <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-2 py-0.5 rounded-full">{item.category}</span>}
                        <h3 className="font-bold text-gray-900 dark:text-white mt-1">{item.name}</h3>
                    </div>
                    {item.price_range && <span className="text-sm font-semibold text-green-600">{item.price_range}</span>}
                </div>
                {item.description && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{item.description}</p>}
                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {(Array.isArray(item.tags) ? item.tags : []).map((tag: string, i: number) => (
                            <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                    </div>
                )}
                {item.moq && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">MOQ: {item.moq}</p>}
                <div className="flex justify-end gap-2">
                    <button onClick={() => handleToggleActive(item)} className={`transition-colors ${item.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>{item.is_active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button onClick={() => handleToggleActive(item, 'is_featured')} className={`transition-colors ${item.is_featured ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-gray-600'}`}>★</button>
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 transition-colors"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 transition-colors"><Trash2 size={18} /></button>
                </div>
            </div>
        </div>
    );

    const renderBlogCard = (item: any) => (
        <div key={item.id} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden group">
            {item.cover_image_url && <img src={item.cover_image_url} alt={item.title} className="h-44 w-full object-cover" />}
            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    {item.category && <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-[#c20c0b] px-2 py-0.5 rounded-full">{item.category}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_published ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>{item.is_published ? 'Published' : 'Draft'}</span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{item.title}</h3>
                {item.excerpt && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{item.excerpt}</p>}
                <p className="text-xs text-gray-400 mb-3">By {item.author || 'Unknown'} {item.published_at ? `· ${new Date(item.published_at).toLocaleDateString()}` : ''}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setPreviewBlog(item)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"><Eye size={18} /></button>
                    <button onClick={() => handleToggleActive(item, 'is_published')} className={`transition-colors ${item.is_published ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>{item.is_published ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 transition-colors"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 transition-colors"><Trash2 size={18} /></button>
                </div>
            </div>
        </div>
    );

    const renderShortsCard = (item: any) => (
        <div key={item.id} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden group">
            <div className="relative aspect-[9/16] max-h-64">
                {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title || item.creator} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><Video size={40} className="text-gray-400" /></div>
                )}
                {!item.is_active && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-semibold text-sm bg-red-600 px-3 py-1 rounded-full">Inactive</span></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3 text-white">
                    {item.title && <p className="font-semibold text-sm">{item.title}</p>}
                    {item.creator && <p className="text-xs opacity-80">{item.creator}</p>}
                    {item.views && item.views !== '0' && <p className="text-xs opacity-60">{item.views} views</p>}
                </div>
            </div>
            <div className="p-3 flex justify-end gap-2">
                <button onClick={() => handleToggleActive(item)} className={`transition-colors ${item.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>{item.is_active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 transition-colors"><Edit size={18} /></button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 transition-colors"><Trash2 size={18} /></button>
            </div>
        </div>
    );

    const renderCards = () => {
        const items = getItems(activeTab);
        if (items.length === 0) {
            return (
                <div className="col-span-full text-center py-16">
                    <div className="text-gray-400 dark:text-gray-500 mb-3">{tabs.find(t => t.key === activeTab)?.icon}</div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No {activeTab} yet</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Click "Add New" to create your first one</p>
                </div>
            );
        }
        switch (activeTab) {
            case 'banners': return items.map(renderBannerCard);
            case 'products': return items.map(renderProductCard);
            case 'blogs': return items.map(renderBlogCard);
            case 'shorts': return items.map(renderShortsCard);
        }
    };

    const gridCols = activeTab === 'shorts' ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

    return (
        <MainLayout {...props}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Trending CMS</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage banners, products, blogs, and fashion shorts</p>
                </div>
                <button onClick={openAdd} className="bg-[#c20c0b] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#a50a09] transition-colors shadow-lg shadow-red-200 dark:shadow-none">
                    <Plus size={18} /> Add New
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.key
                                ? 'bg-white dark:bg-gray-700 text-[#c20c0b] shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-red-100 dark:bg-red-900/30 text-[#c20c0b]' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Content Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c20c0b]" />
                </div>
            ) : (
                <div className={`grid ${gridCols} gap-6`}>
                    {renderCards()}
                </div>
            )}

            {/* Banner Builder (full-screen Wix-style) */}
            {isModalOpen && activeTab === 'banners' && (
                <BannerBuilder
                    item={editingItem}
                    onChange={setEditingItem}
                    onSave={handleSave}
                    onClose={() => setIsModalOpen(false)}
                    allBanners={banners}
                    products={products}
                    blogs={blogs}
                    shorts={shorts}
                />
            )}

            {/* Add/Edit Modal (non-banner tabs) */}
            {isModalOpen && activeTab !== 'banners' && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingItem.id ? 'Edit' : 'Add'} {activeTab === 'products' ? 'Product' : activeTab === 'blogs' ? 'Blog Post' : 'Fashion Short'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {renderForm()}
                        </form>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                            <button type="submit" onClick={handleSave} className="px-5 py-2.5 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] transition-colors">
                                {editingItem.id ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Blog Preview Modal */}
            {previewBlog && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-3xl my-8 border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Blog Preview</h2>
                            <button onClick={() => setPreviewBlog(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            {previewBlog.cover_image_url && <img src={previewBlog.cover_image_url} alt={previewBlog.title} className="w-full h-64 object-cover rounded-lg mb-6" />}
                            {previewBlog.category && <span className="text-xs font-semibold bg-red-100 text-[#c20c0b] px-2 py-1 rounded-full">{previewBlog.category}</span>}
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-3 mb-2">{previewBlog.title}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">By {previewBlog.author || 'Unknown'} {previewBlog.published_at ? `· ${new Date(previewBlog.published_at).toLocaleDateString()}` : ''}</p>
                            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewBlog.content || '<p class="text-gray-400">No content yet.</p>' }} />
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
