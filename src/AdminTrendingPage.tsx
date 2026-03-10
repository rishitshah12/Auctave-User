import React, { useState, useEffect, FC, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit, Image, ShoppingBag, FileText, Video, X, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Bold, Italic, Heading1, Heading2, List, ListOrdered, Link, ImageIcon, Quote, Code, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Type, Maximize2, Minimize2, Move, ZoomIn, ZoomOut, Monitor, Smartphone, Crosshair, ArrowRight, PlayCircle, Sparkles, TrendingUp, Clock, User, Tag, Upload, Palette, Layers, ChevronLeft, ChevronRight, RotateCcw, Volume2, VolumeX, PanelLeftClose, PanelLeftOpen, Timer, Pause, Play, MousePointer, Youtube, Square, RectangleHorizontal, LayoutTemplate, Smartphone as MobileIcon, Monitor as DesktopIcon, Crop } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { bannerService, trendingProductService, blogService, shortsService } from './trending.service';
import { supabase } from './supabaseClient';
import { useToast } from './ToastContext';

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

const GOOGLE_FONTS = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway', 'Merriweather', 'Playfair Display', 'Poppins', 'Nunito'];

// ─── Image Cropper Modal ───────────────────────────────────────────
const CropModal: FC<{ src: string; onClose: () => void; onSave: (newSrc: string) => void }> = ({ src, onClose, onSave }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 }); // Percentages
    const dragRef = useRef<{ startX: number; startY: number; startCrop: typeof crop; type: string } | null>(null);

    const handleMouseDown = (e: React.MouseEvent, type: string) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startCrop: { ...crop },
            type
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragRef.current || !containerRef.current) return;
            const { startX, startY, startCrop, type } = dragRef.current;
            const rect = containerRef.current.getBoundingClientRect();
            const dx = ((e.clientX - startX) / rect.width) * 100;
            const dy = ((e.clientY - startY) / rect.height) * 100;

            let newCrop = { ...startCrop };

            if (type === 'move') {
                newCrop.x = Math.max(0, Math.min(100 - newCrop.w, startCrop.x + dx));
                newCrop.y = Math.max(0, Math.min(100 - newCrop.h, startCrop.y + dy));
            } else if (type === 'se') {
                newCrop.w = Math.max(10, Math.min(100 - startCrop.x, startCrop.w + dx));
                newCrop.h = Math.max(10, Math.min(100 - startCrop.y, startCrop.h + dy));
            }
            setCrop(newCrop);
        };
        const handleMouseUp = () => { dragRef.current = null; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, []);

    const performCrop = () => {
        const img = imgRef.current;
        if (!img) return;
        const canvas = document.createElement('canvas');
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;
        const pixelX = crop.x * img.width / 100 * scaleX;
        const pixelY = crop.y * img.height / 100 * scaleY;
        const pixelW = crop.w * img.width / 100 * scaleX;
        const pixelH = crop.h * img.height / 100 * scaleY;
        canvas.width = pixelW;
        canvas.height = pixelH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);
        onSave(canvas.toDataURL('image/jpeg', 0.9));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center"><h3 className="font-bold text-gray-900 dark:text-white">Crop Image</h3><button onClick={onClose}><X size={20} className="text-gray-500" /></button></div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100 dark:bg-black/50"><div ref={containerRef} className="relative inline-block select-none"><img ref={imgRef} src={src} alt="Crop target" className="max-h-[60vh] max-w-full object-contain block" draggable={false} crossOrigin="anonymous" /><div className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: `${crop.h}%` }} onMouseDown={(e) => handleMouseDown(e, 'move')}><div className="absolute bottom-0 right-0 w-4 h-4 bg-[#c20c0b] cursor-se-resize translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white" onMouseDown={(e) => handleMouseDown(e, 'se')} /></div></div></div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button><button onClick={performCrop} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#c20c0b] hover:bg-[#a50a09]">Apply Crop</button></div>
            </div>
        </div>
    );
};

// ─── Rich Text Blog Editor ─────────────────────────────────────────
const BlogEditor: FC<{ value: string; onChange: (v: string) => void; className?: string }> = ({ value, onChange, className }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imageUploadTab, setImageUploadTab] = useState<'url' | 'upload'>('url');
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
    const [savedRange, setSavedRange] = useState<Range | null>(null);
    const [imageControlStyle, setImageControlStyle] = useState<React.CSSProperties>({});
    const [showCropModal, setShowCropModal] = useState(false);

    // State for toolbar active states
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUL, setIsUL] = useState(false);
    const [isOL, setIsOL] = useState(false);
    const [currentAlign, setCurrentAlign] = useState('left'); // 'left', 'center', 'right'
    const [currentBlock, setCurrentBlock] = useState('p');
    const [currentFontFamily, setCurrentFontFamily] = useState('Roboto');
    const [currentFontSize, setCurrentFontSize] = useState('16'); // Storing as number string

    const FONT_FAMILIES = ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'monospace', ...GOOGLE_FONTS];
    const FONT_SIZES_PX = ['12px', '14px', '16px', '18px', '24px', '32px'];

    const updateImageControlPosition = useCallback(() => {
        if (selectedImg && editorRef.current) {
            const imgRect = selectedImg.getBoundingClientRect();
            const editorRect = editorRef.current.getBoundingClientRect();
            setImageControlStyle({
                position: 'absolute',
                top: `${imgRect.top - editorRect.top + editorRef.current.scrollTop}px`,
                left: `${imgRect.left - editorRect.left + editorRef.current.scrollLeft}px`,
                width: `${imgRect.width}px`,
                height: `${imgRect.height}px`,
            });
        }
    }, [selectedImg]);

    useEffect(() => {
        if (selectedImg) {
            updateImageControlPosition();
            const editor = editorRef.current;
            const observer = new MutationObserver(updateImageControlPosition);
            observer.observe(selectedImg, { attributes: true, attributeFilter: ['style', 'class'] });
            window.addEventListener('resize', updateImageControlPosition);
            editor?.addEventListener('scroll', updateImageControlPosition);
            return () => {
                observer.disconnect();
                window.removeEventListener('resize', updateImageControlPosition);
                editor?.removeEventListener('scroll', updateImageControlPosition);
            };
        } else {
            setImageControlStyle({ display: 'none' });
        }
    }, [selectedImg, updateImageControlPosition]);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, []);

    const exec = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val); // eslint-disable-line
        editorRef.current?.focus();
        if (editorRef.current) onChange(editorRef.current.innerHTML);
        updateToolbarState(); // Update toolbar state after command
    };

    const applyStyle = (style: string, value: string) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        const span = document.createElement('span');
        // @ts-ignore
        span.style[style] = value;
        
        const content = range.extractContents();
        span.appendChild(content);
        range.insertNode(span);
        
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    // Function to update toolbar states based on current selection
    const updateToolbarState = useCallback(() => {
        if (!editorRef.current) return;
        setIsBold(document.queryCommandState('bold'));
        setIsItalic(document.queryCommandState('italic'));
        setIsUL(document.queryCommandState('insertUnorderedList'));
        setIsOL(document.queryCommandState('insertOrderedList'));
        setCurrentAlign(document.queryCommandValue('justifyLeft') ? 'left' : document.queryCommandValue('justifyCenter') ? 'center' : document.queryCommandValue('justifyRight') ? 'right' : 'left');
        setCurrentBlock(document.queryCommandValue('formatBlock').toLowerCase());

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            let node = selection.anchorNode;
            // Traverse up to find relevant style
            while (node && node !== editorRef.current) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as HTMLElement;
                    const computedStyle = window.getComputedStyle(element);

                    const fontFamily = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                    if (fontFamily && FONT_FAMILIES.includes(fontFamily)) {
                        setCurrentFontFamily(fontFamily);
                    } else if (node === editorRef.current) {
                        setCurrentFontFamily('Roboto'); // Default if no specific font found
                    }

                    const fontSize = computedStyle.fontSize;
                    if (fontSize) {
                        setCurrentFontSize(fontSize.replace('px', ''));
                    } else if (node === editorRef.current) {
                        setCurrentFontSize('16'); // Default if no specific size found
                    }
                }
                node = node.parentNode;
            }
        } else {
            setCurrentFontFamily('Roboto');
            setCurrentFontSize('16');
        }
    }, []);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.addEventListener('mouseup', updateToolbarState);
        editor.addEventListener('keyup', updateToolbarState);
        editor.addEventListener('input', updateToolbarState);
        updateToolbarState(); // Initial state update
        return () => { editor.removeEventListener('mouseup', updateToolbarState); editor.removeEventListener('keyup', updateToolbarState); editor.removeEventListener('input', updateToolbarState); };
    }, [updateToolbarState]);

    const handleInput = () => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
                setSavedRange(range);
            }
        }
    };

    const restoreSelection = () => {
        if (savedRange) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedRange);
            }
        } else {
            editorRef.current?.focus();
        }
    };

    const insertLink = () => {
        restoreSelection();
        if (linkUrl) exec('createLink', linkUrl);
        setLinkUrl('');
        setShowLinkModal(false);
    };

    const insertImageHTML = (url: string) => {
        restoreSelection();
        const html = `<img src="${url}" style="max-width: 100%; height: auto; border-radius: 0.5rem;" />`;
        exec('insertHTML', html);
        setImageUrl('');
        setShowImageModal(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `blog/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const { error } = await supabase.storage.from('trending-media').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('trending-media').getPublicUrl(fileName);
            if (data?.publicUrl) insertImageHTML(data.publicUrl);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const repositionImage = (alignment: 'left' | 'center' | 'right' | 'none') => {
        if (selectedImg) {
            // Reset styles first
            selectedImg.style.float = 'none';
            selectedImg.style.display = 'block';
            selectedImg.style.marginLeft = '';
            selectedImg.style.marginRight = '';
            selectedImg.style.marginBottom = '';

            if (alignment === 'left') {
                selectedImg.style.float = 'left';
                selectedImg.style.marginRight = '1rem';
                selectedImg.style.marginBottom = '0.5rem';
            } else if (alignment === 'right') {
                selectedImg.style.float = 'right';
                selectedImg.style.marginLeft = '1rem';
                selectedImg.style.marginBottom = '0.5rem';
            } else if (alignment === 'center') {
                selectedImg.style.marginLeft = 'auto';
                selectedImg.style.marginRight = 'auto';
            }
            if (editorRef.current) onChange(editorRef.current.innerHTML);
        }
    };

    const resizeImage = (width: string) => {
        if (selectedImg) {
            selectedImg.style.width = width;
            if (editorRef.current) onChange(editorRef.current.innerHTML);
            setSelectedImg(null);
        }
    };

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, corner: 'se' | 'sw' | 'ne' | 'nw') => {
        if (!selectedImg) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = selectedImg.offsetWidth;
        const aspect = startWidth / selectedImg.offsetHeight;

        const doDrag = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            let newWidth = startWidth + (corner.includes('e') ? dx : -dx);
            newWidth = Math.max(50, newWidth); // min width 50px
            
            selectedImg.style.width = `${newWidth}px`;
            selectedImg.style.height = 'auto'; // maintain aspect ratio
            
            updateImageControlPosition();
        };

        const stopDrag = () => {
            window.removeEventListener('mousemove', doDrag);
            window.removeEventListener('mouseup', stopDrag);
            if (editorRef.current) onChange(editorRef.current.innerHTML);
        };
        window.addEventListener('mousemove', doDrag);
        window.addEventListener('mouseup', stopDrag);
    };

    const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const font = e.target.value;
        setCurrentFontFamily(font);
        applyStyle('fontFamily', font);
    };

    const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const size = e.target.value;
        setCurrentFontSize(size);
        applyStyle('fontSize', `${size}px`);
    };

    const ToolBtn: FC<{ onClick: () => void; title: string; children: React.ReactNode; active?: boolean }> = ({ onClick, title, children, active }) => (
        <button type="button" onClick={onClick} title={title} className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${active ? 'bg-gray-200 dark:bg-gray-600 text-[#c20c0b]' : 'text-gray-600 dark:text-gray-300'}`}>
            {children}
        </button>
    );

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden relative">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
                <ToolBtn onClick={() => exec('undo')} title="Undo" active={document.queryCommandState('undo')}><Undo2 size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('redo')} title="Redo" active={document.queryCommandState('redo')}><Redo2 size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                
                <select value={currentFontFamily} onChange={handleFontFamilyChange} className="p-1.5 text-xs rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-0 focus:border-[#c20c0b] outline-none w-32">
                    {FONT_FAMILIES.map(font => (
                        <option key={font} value={font}>{font}</option>
                    ))}
                </select>

                {/* Font Size */}
                <div className="flex items-center gap-1 mx-1">
                    <input type="number" min="8" max="120" value={currentFontSize} onChange={handleFontSizeChange} className="w-12 p-1.5 text-xs rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-0 focus:border-[#c20c0b] outline-none text-center" />
                    <span className="text-[10px] text-gray-500">px</span>
                </div>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => exec('formatBlock', 'h1')} title="Heading 1" active={currentBlock === 'h1'}><Heading1 size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('formatBlock', 'h2')} title="Heading 2" active={currentBlock === 'h2'}><Heading2 size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('formatBlock', 'p')} title="Paragraph" active={currentBlock === 'p'}><Type size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => exec('bold')} title="Bold" active={isBold}><Bold size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('italic')} title="Italic" active={isItalic}><Italic size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => exec('justifyLeft')} title="Align Left" active={currentAlign === 'left'}><AlignLeft size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('justifyCenter')} title="Align Center" active={currentAlign === 'center'}><AlignCenter size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('justifyRight')} title="Align Right" active={currentAlign === 'right'}><AlignRight size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => exec('insertUnorderedList')} title="Bullet List" active={isUL}><List size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('insertOrderedList')} title="Numbered List" active={isOL}><ListOrdered size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('formatBlock', 'blockquote')} title="Quote" active={currentBlock === 'blockquote'}><Quote size={16} /></ToolBtn>
                <ToolBtn onClick={() => exec('formatBlock', 'pre')} title="Code Block" active={currentBlock === 'pre'}><Code size={16} /></ToolBtn>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolBtn onClick={() => { saveSelection(); setShowLinkModal(true); }} title="Insert Link"><Link size={16} /></ToolBtn>
                <ToolBtn onClick={() => { saveSelection(); setShowImageModal(true); }} title="Insert Image"><ImageIcon size={16} /></ToolBtn>
            </div>
            
            {/* Image Controls (Toolbar + Resizable Frame) */}
            {selectedImg && (
                <div style={imageControlStyle} className="z-20 pointer-events-none">
                    {/* Toolbar */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-top-2 pointer-events-auto">
                        <button onClick={() => repositionImage('left')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Align Left"><AlignLeft size={16} /></button>
                        <button onClick={() => repositionImage('center')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Align Center"><AlignCenter size={16} /></button>
                        <button onClick={() => repositionImage('right')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Align Right"><AlignRight size={16} /></button>
                        <button onClick={() => repositionImage('none')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Full Width"><RectangleHorizontal size={16} /></button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                        <button onClick={() => setShowCropModal(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Crop"><Crop size={16} /></button>
                        <button onClick={() => resizeImage('25%')} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">25%</button>
                        <button onClick={() => resizeImage('50%')} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">50%</button>
                        <button onClick={() => resizeImage('100%')} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">100%</button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                        <button onClick={() => setSelectedImg(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5"><X size={14} /></button>
                    </div>
                    {/* Resizable Frame */}
                    <div className="absolute inset-0 border-2 border-dashed border-[#c20c0b] rounded-lg" />
                    <div onMouseDown={(e) => handleResizeMouseDown(e, 'se')} className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-[#c20c0b] rounded-full border-2 border-white dark:border-gray-800 cursor-se-resize pointer-events-auto" />
                    <div onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-[#c20c0b] rounded-full border-2 border-white dark:border-gray-800 cursor-sw-resize pointer-events-auto" />
                    <div onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#c20c0b] rounded-full border-2 border-white dark:border-gray-800 cursor-ne-resize pointer-events-auto" />
                    <div onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#c20c0b] rounded-full border-2 border-white dark:border-gray-800 cursor-nw-resize pointer-events-auto" />
                </div>
            )}
            
            {showCropModal && selectedImg && (
                <CropModal 
                    src={selectedImg.src} 
                    onClose={() => setShowCropModal(false)}
                    onSave={(newUrl) => { selectedImg.src = newUrl; if (editorRef.current) onChange(editorRef.current.innerHTML); setShowCropModal(false); }}
                />
            )}

            {/* Editor area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'IMG') {
                        setSelectedImg(target as HTMLImageElement);
                    } else {
                        setSelectedImg(null);
                    }
                }}
                className={`min-h-[300px] p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none prose prose-lg dark:prose-invert max-w-none [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:break-words [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:break-words [&_p]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#c20c0b] [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:bg-gray-100 [&_pre]:dark:bg-gray-800 [&_pre]:p-4 [&_pre]:rounded [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-blue-600 [&_a]:underline ${className || ''}`}
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
                        
                        <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                            <button onClick={() => setImageUploadTab('url')} className={`pb-2 text-sm font-medium ${imageUploadTab === 'url' ? 'text-[#c20c0b] border-b-2 border-[#c20c0b]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>From URL</button>
                            <button onClick={() => setImageUploadTab('upload')} className={`pb-2 text-sm font-medium ${imageUploadTab === 'upload' ? 'text-[#c20c0b] border-b-2 border-[#c20c0b]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Upload</button>
                        </div>

                        {imageUploadTab === 'url' ? (
                            <input type="url" placeholder="Image URL..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3" autoFocus />
                        ) : (
                            <div className="mb-3">
                                <label className="block w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center cursor-pointer hover:border-[#c20c0b] transition-colors">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{isUploading ? 'Uploading...' : 'Click to upload image'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                </label>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-2">
                            <button type="button" onClick={() => setShowImageModal(false)} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded">Cancel</button>
                            {imageUploadTab === 'url' && <button type="button" onClick={() => insertImageHTML(imageUrl)} className="px-3 py-1.5 text-sm bg-[#c20c0b] text-white rounded">Insert</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Blog Builder (Wix-style Full Page) ─────────────────────────────
const BlogBuilder: FC<{
    item: any;
    onChange: (item: any) => void;
    onSave: (e: React.FormEvent) => void;
    onClose: () => void;
    isSaving?: boolean;
}> = ({ item, onChange, onSave, onClose, isSaving }) => {
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [isPanelHidden, setIsPanelHidden] = useState(false);

    const set = (key: string, val: any) => onChange({ ...item, [key]: val });

    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 z-50 flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"><X size={20} /></button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                    <h2 className="font-semibold text-gray-800 dark:text-white text-sm">{item.id ? 'Edit Blog Post' : 'New Blog Post'}</h2>
                    {item.title && <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">— {item.title}</span>}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                        <button type="button" onClick={() => setViewMode('edit')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'edit' ? 'bg-white dark:bg-gray-700 shadow-sm text-[#c20c0b]' : 'text-gray-500'}`}>Edit</button>
                        <button type="button" onClick={() => setViewMode('preview')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'preview' ? 'bg-white dark:bg-gray-700 shadow-sm text-[#c20c0b]' : 'text-gray-500'}`}>Preview</button>
                    </div>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
                    <button type="button" onClick={onSave} disabled={isSaving} className="px-5 py-2 text-sm bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] transition-colors shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                Saving...
                            </>
                        ) : (
                            item.id ? 'Update & Publish' : 'Publish'
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar (Metadata) */}
                {viewMode === 'edit' && (
                    <div className={`w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-y-auto transition-all duration-300 ${isPanelHidden ? '-ml-80' : ''}`}>
                        <div className="p-5 space-y-5">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Post Settings</h3>
                            
                            <div className="space-y-4">
                                <input type="text" placeholder="Blog Title *" required value={item.title || ''} onChange={e => set('title', e.target.value)} className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] outline-none font-bold" />
                                <input type="text" placeholder="Category (e.g. Trends)" value={item.category || ''} onChange={e => set('category', e.target.value)} className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] outline-none" />
                                <input type="text" placeholder="Author Name" value={item.author || ''} onChange={e => set('author', e.target.value)} className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] outline-none" />
                                <input type="text" placeholder="Cover Image URL" value={item.cover_image_url || ''} onChange={e => set('cover_image_url', e.target.value)} className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] outline-none" />
                                {item.cover_image_url && <img src={item.cover_image_url} alt="Cover" className="w-full h-40 object-cover rounded-xl shadow-sm" />}
                                <textarea placeholder="Short Excerpt (for cards)" value={item.excerpt || ''} onChange={e => set('excerpt', e.target.value)} rows={3} className="w-full p-3 text-sm border dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] outline-none resize-none" />
                                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                                    <input type="checkbox" checked={item.is_published ?? false} onChange={e => set('is_published', e.target.checked)} className="w-4 h-4 accent-[#c20c0b]" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Visible to public</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 relative">
                    {viewMode === 'edit' && (
                        <button onClick={() => setIsPanelHidden(!isPanelHidden)} className="absolute top-4 left-4 z-20 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-[#c20c0b] transition-colors">
                            {isPanelHidden ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                        </button>
                    )}
                    
                    <div className="max-w-4xl mx-auto min-h-full bg-white dark:bg-gray-900 shadow-xl my-8 rounded-xl overflow-hidden">
                        {viewMode === 'edit' ? (
                            <BlogEditor value={item.content || ''} onChange={v => set('content', v)} className="min-h-[800px]" />
                        ) : (
                            <div className="p-12">
                                {/* Preview Header */}
                                <div className="mb-8 text-center">
                                    {item.category && <span className="text-xs font-bold text-[#c20c0b] uppercase tracking-wider mb-2 block">{item.category}</span>}
                                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">{item.title || 'Untitled Post'}</h1>
                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span>By {item.author || 'Unknown'}</span>
                                        <span>•</span>
                                        <span>{new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {item.cover_image_url && (
                                    <div className="mb-10 rounded-2xl overflow-hidden shadow-lg">
                                        <img src={item.cover_image_url} alt={item.title} className="w-full h-[400px] object-cover" />
                                    </div>
                                )}
                                <div className="prose prose-lg dark:prose-invert max-w-none mx-auto" dangerouslySetInnerHTML={{ __html: item.content || '<p class="text-gray-400 italic text-center">Start writing to see content here...</p>' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
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

// ─── YouTube / Platform helpers ──────────────────────────────────────
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

const getYouTubeThumbnail = (videoId: string, quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' | 'sddefault' = 'hqdefault'): string =>
    `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

const isYouTubeUrl = (url: string): boolean => extractYouTubeId(url) !== null;

const getYouTubeEmbedUrl = (url: string): string | null => {
    const id = extractYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1` : null;
};

const extractVimeoId = (url: string): string | null => {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
};

// ─── Slide animation options ────────────────────────────────────────
const SLIDE_ANIMATIONS = [
    { label: 'Fade', value: 'fade' },
    { label: 'Slide Left', value: 'slide-left' },
    { label: 'Slide Right', value: 'slide-right' },
    { label: 'Slide Up', value: 'slide-up' },
    { label: 'Slide Down', value: 'slide-down' },
    { label: 'Zoom In', value: 'zoom-in' },
    { label: 'Zoom Out', value: 'zoom-out' },
    { label: 'Flip', value: 'flip' },
];

const HOVER_ANIMATIONS = [
    { label: 'None', value: 'none' },
    { label: 'Scale Up', value: 'scale' },
    { label: 'Brightness', value: 'brightness' },
    { label: 'Blur Edge', value: 'blur-edge' },
    { label: 'Grayscale', value: 'grayscale' },
];

// ─── CTA style presets ──────────────────────────────────────────────
const CTA_CORNER_PRESETS = [
    { label: 'Square', value: 0 },
    { label: 'Slight', value: 4 },
    { label: 'Rounded', value: 8 },
    { label: 'More', value: 12 },
    { label: 'Pill', value: 9999 },
];

interface CtaStyle {
    bg_color?: string;
    text_color?: string;
    border_radius?: number;
    border_width?: number;
    border_color?: string;
    font_size?: number;
    padding_x?: number;
    padding_y?: number;
    hover_bg_color?: string;
    hover_text_color?: string;
    hover_scale?: number;
    shadow?: boolean;
    icon?: boolean;
}

const DEFAULT_CTA_STYLE: CtaStyle = {
    bg_color: '#ffffff',
    text_color: '#000000',
    border_radius: 8,
    border_width: 0,
    border_color: '#ffffff',
    font_size: 14,
    padding_x: 24,
    padding_y: 10,
    hover_bg_color: '#f3f3f3',
    hover_text_color: '#000000',
    hover_scale: 100,
    shadow: false,
    icon: true,
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
    cta_style?: CtaStyle;
    mobile?: Record<string, any>;
    is_youtube?: boolean;
    youtube_id?: string;
    video_play_full?: boolean;
}

const Section: FC<{ id: string; title: string; icon: React.ReactNode; children: React.ReactNode; activeSection: string; setActiveSection: (s: string) => void }> = ({ id, title, icon, children, activeSection, setActiveSection }) => (
    <div>
        <button type="button" onClick={() => setActiveSection(activeSection === id ? '' : id)} className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors rounded-lg ${activeSection === id ? 'text-[#c20c0b] bg-red-50 dark:bg-red-900/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {icon}
            <span className="flex-1 text-left">{title}</span>
            <ChevronDown size={12} className={`transition-transform ${activeSection === id ? 'rotate-180' : ''}`} />
        </button>
        {activeSection === id && <div className="px-3 pb-3 pt-1 space-y-3">{children}</div>}
    </div>
);

const BannerBuilder: FC<{
    item: any;
    onChange: (item: any) => void;
    onSave: (e: React.FormEvent) => void;
    onClose: () => void;
    allBanners: any[];
    products: any[];
    blogs: any[];
    shorts: any[];
    isSaving?: boolean;
}> = ({ item, onChange, onSave, onClose, allBanners, products, blogs, shorts, isSaving }) => {
    const { showToast } = useToast();
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
    const [isVideoMuted, setIsVideoMuted] = useState(true);
    const [isPanelHidden, setIsPanelHidden] = useState(false);
    const [inlineEditing, setInlineEditing] = useState<'title' | 'subtitle' | 'cta' | null>(null);
    const inlineInputRef = useRef<HTMLInputElement>(null);

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
    // Per-slide mobile setting helpers
    const setSlideMobile = (idx: number, key: string, val: any) => {
        const newSlides = [...slides];
        const slideMob = { ...(newSlides[idx]?.mobile || {}), [key]: val };
        newSlides[idx] = { ...newSlides[idx], mobile: slideMob };
        set('slides', newSlides);
    };
    const clearSlideMobile = (idx: number, key: string) => {
        const newSlides = [...slides];
        const slideMob = { ...(newSlides[idx]?.mobile || {}) };
        delete slideMob[key];
        newSlides[idx] = { ...newSlides[idx], mobile: slideMob };
        set('slides', newSlides);
    };

    const focalX = resolveMobile('focal_point_x', isSlideshow ? resolveSlide('focal_point_x', 50) : (item.focal_point_x ?? 50));
    const focalY = resolveMobile('focal_point_y', isSlideshow ? resolveSlide('focal_point_y', 50) : (item.focal_point_y ?? 50));
    const imageFit = isSlideshow ? resolveSlide('image_fit', 'cover') : (item.image_fit || 'cover');
    const bannerHeightPx = resolveMobile('banner_height', item.banner_height || 320);
    const bannerPx = typeof bannerHeightPx === 'number' ? bannerHeightPx : 320;
    const overlayOpacity = resolveMobile('overlay_opacity', isSlideshow ? resolveSlide('overlay_opacity', 60) : (item.overlay_opacity ?? 60));
    const textPos = resolveMobile('text_position', isSlideshow ? resolveSlide('text_position', 'bottom-left') : (item.text_position || 'bottom-left'));
    const headingSize = (() => {
        if (isSlideshow && currentSlide) {
            const slideDesktop = currentSlide.heading_size != null ? currentSlide.heading_size : (item.heading_size || 36);
            if (previewDevice === 'mobile') {
                const slideMob = currentSlide.mobile || {};
                return slideMob.heading_size != null ? slideMob.heading_size : slideDesktop;
            }
            return slideDesktop;
        }
        return resolveMobile('heading_size', item.heading_size || 36);
    })();
    const subtitleSize = (() => {
        if (isSlideshow && currentSlide) {
            const slideDesktop = currentSlide.subtitle_size != null ? currentSlide.subtitle_size : (item.subtitle_size || 18);
            if (previewDevice === 'mobile') {
                const slideMob = currentSlide.mobile || {};
                return slideMob.subtitle_size != null ? slideMob.subtitle_size : slideDesktop;
            }
            return slideDesktop;
        }
        return resolveMobile('subtitle_size', item.subtitle_size || 18);
    })();
    const gradientColor = isSlideshow ? resolveSlide('gradient_color', '0,0,0') : (item.gradient_color || '0,0,0');
    const gradientDir = isSlideshow ? resolveSlide('gradient_direction', 'to top') : (item.gradient_direction || 'to top');
    const textX = resolveMobile('text_x', isSlideshow ? resolveSlide('text_x', null) : (item.text_x ?? null));
    const textY = resolveMobile('text_y', isSlideshow ? resolveSlide('text_y', null) : (item.text_y ?? null));

    // Current active media (either single image_url or current slide)
    // Fallback: if not slideshow but slides exist (e.g. video saved with broken is_slideshow flag), use first slide
    const slideFallback = !isSlideshow && slides.length > 0 ? slides[0] : null;
    const currentMediaUrl = isSlideshow && slides.length > 0
        ? slides[previewSlideIdx % slides.length]?.url
        : (slideFallback?.url || item.image_url);
    const currentMediaType = isSlideshow && slides.length > 0
        ? slides[previewSlideIdx % slides.length]?.type
        : (slideFallback ? slideFallback.type : 'image');

    // ─── File Upload ───
    const uploadFile = async (file: File) => {
        setIsUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const filePath = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('trending-media').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('trending-media').getPublicUrl(filePath);
            return publicUrl;
        } catch (err: any) {
            console.error('Upload failed:', err);
            showToast('Upload failed: ' + err.message, 'error');
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
                    // Auto-enable slideshow for video (video_url column doesn't exist, use slides JSONB)
                    setMulti({ is_slideshow: true, slides: [{ type: 'video' as const, url, selected: true }] });
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

    // Focus inline input when editing starts
    useEffect(() => {
        if (inlineEditing && inlineInputRef.current) {
            inlineInputRef.current.focus();
            inlineInputRef.current.select();
        }
    }, [inlineEditing]);

    const handleInlineChange = (field: 'title' | 'subtitle' | 'cta', value: string) => {
        if (isSlideshow && slides.length > 0) {
            const idx = previewSlideIdx % slides.length;
            if (field === 'title') setSlideField(idx, 'title', value || undefined);
            else if (field === 'subtitle') setSlideField(idx, 'subtitle', value || undefined);
            else if (field === 'cta') setSlideField(idx, 'cta_text', value || undefined);
        } else {
            if (field === 'title') set('title', value);
            else if (field === 'subtitle') set('subtitle', value);
            else if (field === 'cta') set('cta_text', value);
        }
    };

    const getInlineValue = (field: 'title' | 'subtitle' | 'cta'): string => {
        if (isSlideshow && slides.length > 0) {
            const slide = slides[previewSlideIdx % slides.length];
            if (field === 'title') return slide?.title || item.title || '';
            if (field === 'subtitle') return slide?.subtitle || item.subtitle || '';
            if (field === 'cta') return slide?.cta_text || item.cta_text || '';
        }
        if (field === 'title') return item.title || '';
        if (field === 'subtitle') return item.subtitle || '';
        return item.cta_text || '';
    };

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

    const sectionProps = { activeSection, setActiveSection };

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
        const hs = (() => {
            if (bIsSlideshow && activeSlide) {
                const slideDesktop = activeSlide.heading_size != null ? activeSlide.heading_size : (banner.heading_size || 36);
                if (previewDevice === 'mobile') {
                    const sMob = (activeSlide as any).mobile || {};
                    return sMob.heading_size != null ? sMob.heading_size : slideDesktop;
                }
                return slideDesktop;
            }
            return rMobile('heading_size', banner.heading_size || 36);
        })();
        const ss = (() => {
            if (bIsSlideshow && activeSlide) {
                const slideDesktop = activeSlide.subtitle_size != null ? activeSlide.subtitle_size : (banner.subtitle_size || 18);
                if (previewDevice === 'mobile') {
                    const sMob = (activeSlide as any).mobile || {};
                    return sMob.subtitle_size != null ? sMob.subtitle_size : slideDesktop;
                }
                return slideDesktop;
            }
            return rMobile('subtitle_size', banner.subtitle_size || 18);
        })();
        const rTx = rMobile('text_x', bIsSlideshow ? rSlide('text_x', null) : (banner.text_x ?? null));
        const rTy = rMobile('text_y', bIsSlideshow ? rSlide('text_y', null) : (banner.text_y ?? null));
        const useCustomPos = rTextPos === 'custom' && rTx != null;

        // Per-slide title/subtitle/cta overrides
        const displayTitle = (bIsSlideshow && activeSlide?.title) ? activeSlide.title : banner.title;
        const displaySubtitle = (bIsSlideshow && activeSlide?.subtitle) ? activeSlide.subtitle : banner.subtitle;
        const displayCtaText = (bIsSlideshow && activeSlide?.cta_text) ? activeSlide.cta_text : banner.cta_text;

        // Filter to selected slides only for navigation
        const visibleSlides = bSlides.filter(s => s.selected !== false);
        const bSlideFallback = !bIsSlideshow && bSlides.length > 0 ? bSlides[0] : null;
        const mediaUrl = bIsSlideshow ? bSlides[previewSlideIdx % bSlides.length]?.url : (bSlideFallback?.url || banner.image_url);
        const mediaType = bIsSlideshow ? bSlides[previewSlideIdx % bSlides.length]?.type : (bSlideFallback ? bSlideFallback.type : 'image');

        // Check if current slide is YouTube
        const currentSlideData = bIsSlideshow ? bSlides[previewSlideIdx % bSlides.length] : bSlideFallback;
        const isYt = currentSlideData?.is_youtube || (mediaUrl && isYouTubeUrl(mediaUrl));
        const ytEmbedUrl = isYt && mediaUrl ? getYouTubeEmbedUrl(mediaUrl) : null;

        // CTA style
        const ctaS: CtaStyle = { ...DEFAULT_CTA_STYLE, ...(banner.cta_style || {}) };

        return (
            <div ref={interactive ? previewBannerRef : undefined} className="relative w-full overflow-hidden rounded-2xl" style={{ height }}>
                {mediaUrl ? (
                    isYt && ytEmbedUrl ? (
                        <iframe key={mediaUrl} src={ytEmbedUrl} allow="autoplay; encrypted-media" allowFullScreen className="absolute inset-0 w-full h-full border-0" style={{ pointerEvents: interactive ? 'none' : 'auto' }} />
                    ) : mediaType === 'video' ? (
                        <video key={mediaUrl} src={mediaUrl} autoPlay muted={isVideoMuted} loop playsInline className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                        <img src={mediaUrl} alt={banner.title} className="absolute inset-0 w-full h-full" style={{ objectFit: fit as any, objectPosition: fp }} />
                    )
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                        <ImageIcon size={48} className="text-gray-400 dark:text-gray-500" />
                    </div>
                )}
                {mediaType === 'video' && mediaUrl && !isYt && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsVideoMuted(!isVideoMuted); }} className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white p-2 rounded-full transition z-20">
                        {isVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
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

                {/* Text overlay with inline editing */}
                {(() => {
                    const renderInlineTitle = () => (
                        interactive && inlineEditing === 'title' ? (
                            <input
                                ref={inlineInputRef}
                                type="text"
                                value={getInlineValue('title')}
                                onChange={e => handleInlineChange('title', e.target.value)}
                                onBlur={() => setInlineEditing(null)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEditing(null); }}
                                className={`${fontSizeClass(hs)} font-bold text-white mb-2 bg-transparent border-b-2 border-white/60 outline-none w-full placeholder-white/40`}
                                style={{ ...fontSizeStyle(hs), caretColor: 'white' }}
                                placeholder="Banner Title"
                            />
                        ) : (
                            <h2
                                className={`${fontSizeClass(hs)} font-bold text-white mb-2 ${interactive ? 'cursor-text hover:ring-2 hover:ring-white/40 hover:ring-offset-0 rounded px-1 -mx-1 transition-all' : ''}`}
                                style={fontSizeStyle(hs)}
                                onClick={interactive ? (e) => { e.stopPropagation(); setInlineEditing('title'); } : undefined}
                                title={interactive ? 'Click to edit title' : undefined}
                            >
                                {displayTitle || 'Banner Title'}
                            </h2>
                        )
                    );
                    const renderInlineSubtitle = () => (
                        interactive && inlineEditing === 'subtitle' ? (
                            <input
                                ref={inlineInputRef}
                                type="text"
                                value={getInlineValue('subtitle')}
                                onChange={e => handleInlineChange('subtitle', e.target.value)}
                                onBlur={() => setInlineEditing(null)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEditing(null); }}
                                className={`${fontSizeClass(ss)} text-white/90 mb-4 bg-transparent border-b-2 border-white/40 outline-none w-full placeholder-white/30`}
                                style={{ ...fontSizeStyle(ss), caretColor: 'white' }}
                                placeholder="Add subtitle..."
                            />
                        ) : (
                            (displaySubtitle || interactive) && (
                                <p
                                    className={`${fontSizeClass(ss)} text-white/90 mb-4 ${interactive ? 'cursor-text hover:ring-2 hover:ring-white/30 hover:ring-offset-0 rounded px-1 -mx-1 transition-all' : ''} ${!displaySubtitle && interactive ? 'text-white/30 italic' : ''}`}
                                    style={fontSizeStyle(ss)}
                                    onClick={interactive ? (e) => { e.stopPropagation(); setInlineEditing('subtitle'); } : undefined}
                                    title={interactive ? 'Click to edit subtitle' : undefined}
                                >
                                    {displaySubtitle || 'Add subtitle...'}
                                </p>
                            )
                        )
                    );
                    const renderInlineCta = () => (
                        interactive && inlineEditing === 'cta' ? (
                            <div className="inline-flex items-center gap-2" style={{ backgroundColor: ctaS.bg_color, borderRadius: `${ctaS.border_radius}px`, paddingLeft: `${ctaS.padding_x}px`, paddingRight: `${ctaS.padding_x}px`, paddingTop: `${ctaS.padding_y}px`, paddingBottom: `${ctaS.padding_y}px`, border: ctaS.border_width ? `${ctaS.border_width}px solid ${ctaS.border_color}` : 'none' }}>
                                <input
                                    ref={inlineInputRef}
                                    type="text"
                                    value={getInlineValue('cta')}
                                    onChange={e => handleInlineChange('cta', e.target.value)}
                                    onBlur={() => setInlineEditing(null)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEditing(null); }}
                                    className="font-semibold bg-transparent outline-none placeholder-gray-400 w-28"
                                    style={{ color: ctaS.text_color, fontSize: `${ctaS.font_size}px` }}
                                    placeholder="CTA text..."
                                />
                                {ctaS.icon !== false && <ArrowRight size={14} style={{ color: ctaS.text_color }} />}
                            </div>
                        ) : (
                            (displayCtaText || interactive) && (
                                <button
                                    className={`font-semibold flex items-center gap-2 transition-all ${interactive ? 'hover:ring-2 hover:ring-white/40' : ''} ${!displayCtaText && interactive ? 'opacity-40' : ''}`}
                                    style={{
                                        backgroundColor: ctaS.bg_color,
                                        color: ctaS.text_color,
                                        borderRadius: `${ctaS.border_radius}px`,
                                        border: ctaS.border_width ? `${ctaS.border_width}px solid ${ctaS.border_color}` : 'none',
                                        fontSize: `${ctaS.font_size}px`,
                                        paddingLeft: `${ctaS.padding_x}px`,
                                        paddingRight: `${ctaS.padding_x}px`,
                                        paddingTop: `${ctaS.padding_y}px`,
                                        paddingBottom: `${ctaS.padding_y}px`,
                                        boxShadow: ctaS.shadow ? '0 4px 14px rgba(0,0,0,0.25)' : 'none',
                                    }}
                                    onClick={interactive ? (e) => { e.preventDefault(); e.stopPropagation(); setInlineEditing('cta'); } : undefined}
                                    title={interactive ? 'Click to edit CTA' : undefined}
                                >
                                    {displayCtaText || 'Add CTA...'} {ctaS.icon !== false && <ArrowRight size={14} />}
                                </button>
                            )
                        )
                    );

                    const textContent = (
                        <div className="max-w-2xl" onClick={e => e.stopPropagation()}>
                            {renderInlineTitle()}
                            {renderInlineSubtitle()}
                            {renderInlineCta()}
                        </div>
                    );

                    return useCustomPos ? (
                        <div
                            className={`absolute z-10 max-w-[60%] ${interactive && !inlineEditing ? 'cursor-move' : ''}`}
                            style={{ left: `${rTx}%`, top: `${rTy}%`, transform: 'translate(-50%, -50%)' }}
                            onMouseDown={interactive && !inlineEditing ? handleTextMouseDown : undefined}
                        >
                            {interactive && <div className="absolute -inset-2 border border-dashed border-white/40 rounded-lg pointer-events-none" />}
                            {textContent}
                        </div>
                    ) : (
                        <div className={`absolute inset-0 flex flex-col p-8 ${pos?.cls || ''}`}>
                            <div
                                className={`max-w-2xl ${interactive && !inlineEditing ? 'cursor-move' : ''}`}
                                onMouseDown={interactive && !inlineEditing ? handleTextMouseDown : undefined}
                            >
                                {interactive && <div className="absolute -inset-2 border border-dashed border-white/30 rounded-lg pointer-events-none opacity-0 hover:opacity-100 transition-opacity" />}
                                {textContent}
                            </div>
                        </div>
                    );
                })()}
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
                    <button type="button" onClick={() => setIsPanelHidden(!isPanelHidden)} className={`p-1.5 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${isPanelHidden ? 'text-[#c20c0b]' : 'text-gray-500'}`} title={isPanelHidden ? 'Show panel' : 'Hide panel for full preview'}>
                        {isPanelHidden ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                        <button type="button" onClick={() => setPreviewDevice('desktop')} className={`p-1.5 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-white dark:bg-gray-700 shadow-sm text-[#c20c0b]' : 'text-gray-500'}`}><Monitor size={16} /></button>
                        <button type="button" onClick={() => setPreviewDevice('mobile')} className={`p-1.5 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-white dark:bg-gray-700 shadow-sm text-[#c20c0b]' : 'text-gray-500'}`}><Smartphone size={16} /></button>
                    </div>
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                    <button type="button" onClick={onSave} disabled={isSaving} className="px-4 py-1.5 text-sm bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] transition-colors shadow-md shadow-red-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">{isSaving ? (<><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>) : (item.id ? 'Update' : 'Create')}</button>
                </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
                {/* ─── Floating Controls Panel (Wix-style) ─── */}
                <div className={`absolute left-4 top-4 bottom-4 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-200/80 dark:border-gray-700/80 overflow-y-auto z-40 shadow-2xl flex flex-col transition-all duration-300 ${isPanelHidden ? '-translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
                    <div className="p-2 space-y-0.5 flex-1">
                    {/* ── Media & Upload ── */}
                    <Section {...sectionProps} id="media" title="Media & Upload" icon={<Upload size={16} />}>
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
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Or paste URL (image/video/YouTube)</label>
                                <input type="text" placeholder="https://..." value={item.image_url || ''} onChange={e => {
                                    const url = e.target.value;
                                    const ytId = extractYouTubeId(url);
                                    if (ytId && url.length > 10) {
                                        // Auto-convert YouTube URL to slideshow with embedded video
                                        setMulti({ is_slideshow: true, slides: [{ type: 'video' as const, url, selected: true, is_youtube: true, youtube_id: ytId }], image_url: '' });
                                    } else {
                                        set('image_url', url);
                                    }
                                }} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Youtube size={10} /> YouTube links auto-detected</p>
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
                                                {slide.is_youtube && slide.youtube_id ? (
                                                    <img src={getYouTubeThumbnail(slide.youtube_id, 'mqdefault')} alt="" className="w-full h-full object-cover" />
                                                ) : slide.type === 'video' ? (
                                                    <div className="w-full h-full flex items-center justify-center"><Video size={12} className="text-gray-400" /></div>
                                                ) : (
                                                    <img src={slide.url} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 flex-1 truncate">{slide.title || (slide.is_youtube ? 'YouTube' : slide.type === 'video' ? 'Video' : 'Image')} {idx + 1}</span>
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
                                    <input type="text" placeholder="Paste image/video/YouTube URL..." id="slide-url-input" className="flex-1 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const input = e.currentTarget;
                                            const url = input.value.trim();
                                            if (!url) return;
                                            const ytId = extractYouTubeId(url);
                                            if (ytId) {
                                                set('slides', [...slides, { type: 'video' as const, url, selected: true, is_youtube: true, youtube_id: ytId }]);
                                            } else {
                                                const isVid = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
                                                set('slides', [...slides, { type: isVid ? 'video' as const : 'image' as const, url, selected: true }]);
                                            }
                                            input.value = '';
                                        }
                                    }} />
                                    <button type="button" onClick={() => {
                                        const input = document.getElementById('slide-url-input') as HTMLInputElement;
                                        const url = input?.value?.trim();
                                        if (!url) return;
                                        const ytId = extractYouTubeId(url);
                                        if (ytId) {
                                            set('slides', [...slides, { type: 'video' as const, url, selected: true, is_youtube: true, youtube_id: ytId }]);
                                        } else {
                                            const isVid = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
                                            set('slides', [...slides, { type: isVid ? 'video' as const : 'image' as const, url, selected: true }]);
                                        }
                                        if (input) input.value = '';
                                    }} className="px-2 py-1 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Add</button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Youtube size={10} /> YouTube/Vimeo links auto-detected with thumbnail</p>

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
                    <Section {...sectionProps} id="focus" title="Focus & Resize" icon={<Crosshair size={16} />}>
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
                    <Section {...sectionProps} id="sizing" title={`Banner Size${previewDevice === 'mobile' ? ' (Mobile)' : ''}`} icon={<Maximize2 size={16} />}>
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
                    <Section {...sectionProps} id="overlay" title={`Overlay & Gradient${previewDevice === 'mobile' ? ' (Mobile)' : ''}`} icon={<Palette size={16} />}>
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
                    <Section {...sectionProps} id="text" title={`Text & Typography${previewDevice === 'mobile' ? ' (Mobile)' : ''}${isSlideshow && slides.length > 0 ? ` (Slide ${(previewSlideIdx % slides.length) + 1})` : ''}`} icon={<Type size={16} />}>
                        {isSlideshow && slides.length > 0 && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Editing Slide {(previewSlideIdx % slides.length) + 1}. Leave blank to use banner defaults.</p>
                        )}
                        {previewDevice === 'mobile' && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Editing mobile overrides. Changes only affect mobile view.</p>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Title {isSlideshow && slides.length > 0 ? '' : '*'}</label>
                            {isSlideshow && slides.length > 0 ? (
                                <input type="text" placeholder={item.title || 'Banner default'} value={slides[previewSlideIdx % slides.length]?.title || ''} onChange={e => setSlideField(previewSlideIdx % slides.length, 'title', e.target.value || undefined)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            ) : (
                                <input type="text" placeholder="Banner Title" value={item.title || ''} onChange={e => set('title', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Heading Size (px)</label>
                            <div className="flex gap-1 flex-wrap mb-1.5">
                                {HEADING_SIZE_PRESETS.map(s => (
                                    <button key={s.value} type="button" onClick={() => {
                                        const idx = isSlideshow && slides.length > 0 ? previewSlideIdx % slides.length : -1;
                                        if (idx >= 0 && previewDevice === 'mobile') setSlideMobile(idx, 'heading_size', s.value);
                                        else if (idx >= 0) setSlideField(idx, 'heading_size', s.value);
                                        else if (previewDevice === 'mobile') setMobile('heading_size', s.value);
                                        else set('heading_size', s.value);
                                    }} className={`px-2 py-1.5 text-xs rounded-lg border font-semibold transition-colors ${headingSize === s.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" min={10} max={120} value={typeof headingSize === 'number' ? headingSize : 36} onChange={e => {
                                    const val = parseInt(e.target.value) || 36;
                                    const idx = isSlideshow && slides.length > 0 ? previewSlideIdx % slides.length : -1;
                                    if (idx >= 0 && previewDevice === 'mobile') setSlideMobile(idx, 'heading_size', val);
                                    else if (idx >= 0) setSlideField(idx, 'heading_size', val);
                                    else if (previewDevice === 'mobile') setMobile('heading_size', val);
                                    else set('heading_size', val);
                                }} className="w-20 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                <span className="text-[10px] text-gray-400">px</span>
                                {previewDevice === 'mobile' && (() => {
                                    const idx = isSlideshow && slides.length > 0 ? previewSlideIdx % slides.length : -1;
                                    const hasMobileOverride = idx >= 0 ? (slides[idx]?.mobile?.heading_size != null) : (mobile.heading_size != null);
                                    if (!hasMobileOverride) return null;
                                    return <button type="button" onClick={() => idx >= 0 ? clearSlideMobile(idx, 'heading_size') : clearMobile('heading_size')} className="text-[10px] text-gray-400 hover:text-[#c20c0b] flex items-center gap-0.5"><RotateCcw size={9} /> Reset</button>;
                                })()}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Subtitle</label>
                            {isSlideshow && slides.length > 0 ? (
                                <input type="text" placeholder={item.subtitle || 'Banner default'} value={slides[previewSlideIdx % slides.length]?.subtitle || ''} onChange={e => setSlideField(previewSlideIdx % slides.length, 'subtitle', e.target.value || undefined)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            ) : (
                                <input type="text" placeholder="Optional subtitle text" value={item.subtitle || ''} onChange={e => set('subtitle', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Subtitle Size (px)</label>
                            <div className="flex gap-1 flex-wrap mb-1.5">
                                {SUBTITLE_SIZE_PRESETS.map(s => (
                                    <button key={s.value} type="button" onClick={() => {
                                        const idx = isSlideshow && slides.length > 0 ? previewSlideIdx % slides.length : -1;
                                        if (idx >= 0 && previewDevice === 'mobile') setSlideMobile(idx, 'subtitle_size', s.value);
                                        else if (idx >= 0) setSlideField(idx, 'subtitle_size', s.value);
                                        else if (previewDevice === 'mobile') setMobile('subtitle_size', s.value);
                                        else set('subtitle_size', s.value);
                                    }} className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${subtitleSize === s.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" min={10} max={60} value={typeof subtitleSize === 'number' ? subtitleSize : 18} onChange={e => {
                                    const val = parseInt(e.target.value) || 18;
                                    const idx = isSlideshow && slides.length > 0 ? previewSlideIdx % slides.length : -1;
                                    if (idx >= 0 && previewDevice === 'mobile') setSlideMobile(idx, 'subtitle_size', val);
                                    else if (idx >= 0) setSlideField(idx, 'subtitle_size', val);
                                    else if (previewDevice === 'mobile') setMobile('subtitle_size', val);
                                    else set('subtitle_size', val);
                                }} className="w-20 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                <span className="text-[10px] text-gray-400">px</span>
                                {previewDevice === 'mobile' && (() => {
                                    const idx = isSlideshow && slides.length > 0 ? previewSlideIdx % slides.length : -1;
                                    const hasMobileOverride = idx >= 0 ? (slides[idx]?.mobile?.subtitle_size != null) : (mobile.subtitle_size != null);
                                    if (!hasMobileOverride) return null;
                                    return <button type="button" onClick={() => idx >= 0 ? clearSlideMobile(idx, 'subtitle_size') : clearMobile('subtitle_size')} className="text-[10px] text-gray-400 hover:text-[#c20c0b] flex items-center gap-0.5"><RotateCcw size={9} /> Reset</button>;
                                })()}
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
                                {isSlideshow && slides.length > 0 ? (
                                    <input type="text" placeholder={item.cta_text || 'Banner default'} value={slides[previewSlideIdx % slides.length]?.cta_text || ''} onChange={e => setSlideField(previewSlideIdx % slides.length, 'cta_text', e.target.value || undefined)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                ) : (
                                    <input type="text" placeholder="Explore Now" value={item.cta_text || ''} onChange={e => set('cta_text', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">CTA Link</label>
                                {isSlideshow && slides.length > 0 ? (
                                    <input type="text" placeholder={item.cta_link || 'Banner default'} value={slides[previewSlideIdx % slides.length]?.cta_link || ''} onChange={e => setSlideField(previewSlideIdx % slides.length, 'cta_link', e.target.value || undefined)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                ) : (
                                    <input type="text" placeholder="/page" value={item.cta_link || ''} onChange={e => set('cta_link', e.target.value)} className="w-full p-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                )}
                            </div>
                        </div>
                        {isSlideshow && slides.length > 0 && (slides[previewSlideIdx % slides.length]?.title || slides[previewSlideIdx % slides.length]?.subtitle || slides[previewSlideIdx % slides.length]?.cta_text) && (
                            <button type="button" onClick={() => {
                                const idx = previewSlideIdx % slides.length;
                                const newSlides = [...slides];
                                const { title: _t, subtitle: _s, cta_text: _ct, cta_link: _cl, ...rest } = newSlides[idx];
                                newSlides[idx] = rest as SlideItem;
                                set('slides', newSlides);
                            }} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#c20c0b] transition-colors">
                                <RotateCcw size={9} /> Clear slide overrides, use banner defaults
                            </button>
                        )}
                        {isSlideshow && slides.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Banner Defaults</span>
                                <div>
                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Default Title *</label>
                                    <input type="text" placeholder="Banner Title" value={item.title || ''} onChange={e => set('title', e.target.value)} className="w-full p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Default Subtitle</label>
                                    <input type="text" placeholder="Optional subtitle" value={item.subtitle || ''} onChange={e => set('subtitle', e.target.value)} className="w-full p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Default CTA Text</label>
                                        <input type="text" placeholder="Explore Now" value={item.cta_text || ''} onChange={e => set('cta_text', e.target.value)} className="w-full p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Default CTA Link</label>
                                        <input type="text" placeholder="/page" value={item.cta_link || ''} onChange={e => set('cta_link', e.target.value)} className="w-full p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* ── CTA Button Style ── */}
                    <Section {...sectionProps} id="cta-style" title="CTA Button Design" icon={<RectangleHorizontal size={16} />}>
                        {(() => {
                            const ctaStyle: CtaStyle = { ...DEFAULT_CTA_STYLE, ...(item.cta_style || {}) };
                            const setCtaStyle = (key: keyof CtaStyle, val: any) => {
                                set('cta_style', { ...ctaStyle, [key]: val });
                            };
                            return (
                                <>
                                    {/* Live CTA Preview */}
                                    <div className="p-4 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <button type="button" className="transition-all flex items-center gap-2 font-semibold" style={{
                                            backgroundColor: ctaStyle.bg_color,
                                            color: ctaStyle.text_color,
                                            borderRadius: `${ctaStyle.border_radius}px`,
                                            border: ctaStyle.border_width ? `${ctaStyle.border_width}px solid ${ctaStyle.border_color}` : 'none',
                                            fontSize: `${ctaStyle.font_size}px`,
                                            paddingLeft: `${ctaStyle.padding_x}px`,
                                            paddingRight: `${ctaStyle.padding_x}px`,
                                            paddingTop: `${ctaStyle.padding_y}px`,
                                            paddingBottom: `${ctaStyle.padding_y}px`,
                                            boxShadow: ctaStyle.shadow ? '0 4px 14px rgba(0,0,0,0.25)' : 'none',
                                        }}>
                                            {item.cta_text || 'Explore Now'} {ctaStyle.icon !== false && <ArrowRight size={14} />}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Background</label>
                                            <div className="flex items-center gap-1.5">
                                                <input type="color" value={ctaStyle.bg_color || '#ffffff'} onChange={e => setCtaStyle('bg_color', e.target.value)} className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                                                <input type="text" value={ctaStyle.bg_color || '#ffffff'} onChange={e => setCtaStyle('bg_color', e.target.value)} className="flex-1 p-1 text-[10px] border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Text Color</label>
                                            <div className="flex items-center gap-1.5">
                                                <input type="color" value={ctaStyle.text_color || '#000000'} onChange={e => setCtaStyle('text_color', e.target.value)} className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                                                <input type="text" value={ctaStyle.text_color || '#000000'} onChange={e => setCtaStyle('text_color', e.target.value)} className="flex-1 p-1 text-[10px] border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Corner Radius</label>
                                        <div className="flex gap-1 flex-wrap">
                                            {CTA_CORNER_PRESETS.map(p => (
                                                <button key={p.value} type="button" onClick={() => setCtaStyle('border_radius', p.value)} className={`px-2 py-1 text-[10px] rounded-lg border transition-colors ${ctaStyle.border_radius === p.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                        <input type="range" min={0} max={50} value={ctaStyle.border_radius === 9999 ? 50 : (ctaStyle.border_radius || 0)} onChange={e => setCtaStyle('border_radius', parseInt(e.target.value))} className="w-full mt-1 accent-[#c20c0b]" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Border W</label>
                                            <input type="number" min={0} max={6} value={ctaStyle.border_width || 0} onChange={e => setCtaStyle('border_width', parseInt(e.target.value) || 0)} className="w-full p-1 text-xs border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Border Color</label>
                                            <input type="color" value={ctaStyle.border_color || '#ffffff'} onChange={e => setCtaStyle('border_color', e.target.value)} className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Font Size</label>
                                            <input type="number" min={10} max={28} value={ctaStyle.font_size || 14} onChange={e => setCtaStyle('font_size', parseInt(e.target.value) || 14)} className="w-full p-1 text-xs border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Padding X (px)</label>
                                            <input type="number" min={8} max={60} value={ctaStyle.padding_x || 24} onChange={e => setCtaStyle('padding_x', parseInt(e.target.value) || 24)} className="w-full p-1 text-xs border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Padding Y (px)</label>
                                            <input type="number" min={4} max={30} value={ctaStyle.padding_y || 10} onChange={e => setCtaStyle('padding_y', parseInt(e.target.value) || 10)} className="w-full p-1 text-xs border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Hover BG</label>
                                            <input type="color" value={ctaStyle.hover_bg_color || '#f3f3f3'} onChange={e => setCtaStyle('hover_bg_color', e.target.value)} className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Hover Text</label>
                                            <input type="color" value={ctaStyle.hover_text_color || '#000000'} onChange={e => setCtaStyle('hover_text_color', e.target.value)} className="w-full h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">Hover Scale: {ctaStyle.hover_scale || 100}%</label>
                                        <input type="range" min={95} max={115} value={ctaStyle.hover_scale || 100} onChange={e => setCtaStyle('hover_scale', parseInt(e.target.value))} className="w-full accent-[#c20c0b]" />
                                    </div>

                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={ctaStyle.shadow ?? false} onChange={e => setCtaStyle('shadow', e.target.checked)} className="w-3.5 h-3.5 accent-[#c20c0b]" />
                                            <span className="text-[10px] text-gray-600 dark:text-gray-400">Shadow</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={ctaStyle.icon !== false} onChange={e => setCtaStyle('icon', e.target.checked)} className="w-3.5 h-3.5 accent-[#c20c0b]" />
                                            <span className="text-[10px] text-gray-600 dark:text-gray-400">Arrow Icon</span>
                                        </label>
                                    </div>

                                    <button type="button" onClick={() => set('cta_style', { ...DEFAULT_CTA_STYLE })} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#c20c0b] transition-colors">
                                        <RotateCcw size={9} /> Reset to defaults
                                    </button>
                                </>
                            );
                        })()}
                    </Section>

                    {/* ── Auto-Scroll & Video ── */}
                    <Section {...sectionProps} id="auto-scroll" title="Auto-Scroll & Video" icon={<Timer size={16} />}>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Auto-Scroll Interval</label>
                            <div className="flex gap-1.5 flex-wrap mb-2">
                                {[3, 5, 7, 10, 15, 0].map(s => (
                                    <button key={s} type="button" onClick={() => set('auto_scroll_interval', s)} className={`px-2 py-1 text-[10px] rounded-lg border transition-colors ${(item.auto_scroll_interval ?? 5) === s ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                                        {s === 0 ? 'Off' : `${s}s`}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" min={0} max={60} value={item.auto_scroll_interval ?? 5} onChange={e => set('auto_scroll_interval', parseInt(e.target.value) || 0)} className="w-20 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                <span className="text-[10px] text-gray-400">seconds (0 = off)</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Pause size={12} /> Pause on Hover</label>
                            <button type="button" onClick={() => set('pause_on_hover', !(item.pause_on_hover ?? true))} className={`relative w-10 h-5 rounded-full transition-colors ${(item.pause_on_hover ?? true) ? 'bg-[#c20c0b]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(item.pause_on_hover ?? true) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        {/* Video-specific controls */}
                        {isSlideshow && slides.some(s => s.type === 'video') && (
                            <div className="mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-2.5">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Video size={12} /> Video Slide Behavior</span>
                                <div className="space-y-1.5">
                                    {slides.map((slide, idx) => slide.type === 'video' && (
                                        <div key={idx} className="flex items-center justify-between py-1">
                                            <span className="text-[10px] text-gray-500">Slide {idx + 1}: {slide.is_youtube ? 'YouTube' : 'Video'}</span>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setSlideField(idx, 'video_play_full', !(slide.video_play_full ?? false))} className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${slide.video_play_full ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-500'}`}>
                                                    {slide.video_play_full ? 'Play Full' : 'Timer'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 italic">"Play Full" waits for video to end before advancing. "Timer" follows the auto-scroll interval.</p>
                            </div>
                        )}

                        {/* Single video (non-slideshow) */}
                        {!isSlideshow && slides.length > 0 && slides[0]?.type === 'video' && (
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Play size={12} /> Play Full Video</label>
                                <button type="button" onClick={() => setSlideField(0, 'video_play_full', !(slides[0]?.video_play_full ?? false))} className={`relative w-10 h-5 rounded-full transition-colors ${(slides[0]?.video_play_full ?? false) ? 'bg-[#c20c0b]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(slides[0]?.video_play_full ?? false) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        )}
                    </Section>

                    {/* ── Slide Animations ── */}
                    <Section {...sectionProps} id="animations" title="Animations" icon={<Sparkles size={16} />}>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Slide Transition</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {SLIDE_ANIMATIONS.map(a => (
                                    <button key={a.value} type="button" onClick={() => set('slide_animation', a.value)} className={`p-1.5 text-[10px] rounded-lg border transition-colors ${(item.slide_animation || 'fade') === a.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 block">Transition Duration (ms)</label>
                            <div className="flex items-center gap-2">
                                <input type="number" min={200} max={3000} step={100} value={item.transition_duration ?? 700} onChange={e => set('transition_duration', parseInt(e.target.value) || 700)} className="w-24 p-1.5 text-xs border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                <span className="text-[10px] text-gray-400">ms</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Hover Animation</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {HOVER_ANIMATIONS.map(a => (
                                    <button key={a.value} type="button" onClick={() => set('hover_animation', a.value)} className={`p-1.5 text-[10px] rounded-lg border transition-colors ${(item.hover_animation || 'scale') === a.value ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20 text-[#c20c0b]' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* ── Settings ── */}
                    <Section {...sectionProps} id="settings" title="Settings" icon={<GripVertical size={16} />}>
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
                </div>

                {/* ─── Full-Width Live Preview ─── */}
                <div className="w-full h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6">
                    <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-full'}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Live Preview</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">— Click text to edit inline · Drag to reposition</span>
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
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const pendingSaveEvent = useRef<React.FormEvent | null>(null);
    const { showToast } = useToast();

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

    // Load Google Fonts
    useEffect(() => {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS.join('&family=').replace(/ /g, '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        pendingSaveEvent.current = e;
        setShowConfirmDialog(true);
    };

    // Allowed DB columns per table — keeps payloads clean and prevents schema-cache errors
    const ALLOWED_COLUMNS: Record<TabKey, string[]> = {
        banners: [
            'title', 'subtitle', 'image_url', 'cta_text', 'cta_link', 'sort_order', 'is_active',
            'focal_point_x', 'focal_point_y', 'image_fit', 'banner_height', 'overlay_opacity',
            'text_position', 'heading_size', 'subtitle_size', 'gradient_color', 'gradient_direction',
            'is_slideshow', 'slides', 'text_x', 'text_y', 'mobile',
            'cta_style', 'auto_scroll_interval', 'pause_on_hover', 'slide_animation', 'transition_duration', 'hover_animation',
        ],
        products: [
            'name', 'category', 'image_url', 'price_range', 'description', 'tags', 'moq',
            'is_featured', 'is_active', 'sort_order',
        ],
        blogs: [
            'title', 'category', 'author', 'cover_image_url', 'content', 'excerpt',
            'is_published', 'published_at',
        ],
        shorts: [
            'title', 'creator', 'video_url', 'thumbnail_url', 'views', 'is_active', 'sort_order',
        ],
    };

    const confirmSave = async () => {
        setIsSaving(true);
        const service = getService(activeTab);
        const { id, ...raw } = editingItem;

        // Only keep columns that exist in the DB table
        const allowed = new Set(ALLOWED_COLUMNS[activeTab]);
        const payload: Record<string, any> = {};
        for (const key of Object.keys(raw)) {
            if (allowed.has(key)) payload[key] = raw[key];
        }

        if (activeTab === 'products' && typeof payload.tags === 'string') {
            payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        if (activeTab === 'blogs' && payload.is_published && !payload.published_at) {
            payload.published_at = new Date().toISOString();
        }

        try {
            if (id) {
                const { error } = await service.update(id, payload);
                if (error) { showToast(error.message, 'error'); }
                else { showToast('Updated & published successfully'); setIsModalOpen(false); fetchAll(); }
            } else {
                const { error } = await service.create(payload);
                if (error) { showToast(error.message, 'error'); }
                else { showToast('Created & published successfully'); setIsModalOpen(false); fetchAll(); }
            }
        } finally {
            setIsSaving(false);
            setShowConfirmDialog(false);
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
            banners: { title: '', subtitle: '', image_url: '', cta_text: 'Explore Now', cta_link: '', sort_order: 0, is_active: true, focal_point_x: 50, focal_point_y: 50, image_fit: 'cover', banner_height: 320, overlay_opacity: 60, text_position: 'bottom-left', heading_size: 36, subtitle_size: 18, gradient_color: '0,0,0', gradient_direction: 'to top', is_slideshow: false, slides: [], text_x: null, text_y: null, mobile: {}, cta_style: { ...DEFAULT_CTA_STYLE }, auto_scroll_interval: 5, pause_on_hover: true, slide_animation: 'fade', transition_duration: 700, hover_animation: 'scale' },
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
                    <button onClick={() => handleToggleActive(item)} disabled={isSaving} className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${item.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>{item.is_active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button onClick={() => openEdit(item)} disabled={isSaving} className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} disabled={isSaving} className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={18} /></button>
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
                    <button onClick={() => handleToggleActive(item)} disabled={isSaving} className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${item.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>{item.is_active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button onClick={() => handleToggleActive(item, 'is_featured')} disabled={isSaving} className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${item.is_featured ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-gray-600'}`}>★</button>
                    <button onClick={() => openEdit(item)} disabled={isSaving} className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} disabled={isSaving} className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={18} /></button>
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
                    <button onClick={() => setPreviewBlog(item)} disabled={isSaving} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Eye size={18} /></button>
                    <button onClick={() => handleToggleActive(item, 'is_published')} disabled={isSaving} className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${item.is_published ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>{item.is_published ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                    <button onClick={() => openEdit(item)} disabled={isSaving} className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} disabled={isSaving} className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={18} /></button>
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
                <button onClick={() => handleToggleActive(item)} disabled={isSaving} className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${item.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>{item.is_active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                <button onClick={() => openEdit(item)} disabled={isSaving} className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Edit size={18} /></button>
                <button onClick={() => handleDelete(item.id)} disabled={isSaving} className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={18} /></button>
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
                <button onClick={openAdd} disabled={isSaving} className="bg-[#c20c0b] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#a50a09] transition-colors shadow-lg shadow-red-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus size={18} /> Add New
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
                    isSaving={isSaving}
                />
            )}

            {/* Blog Builder (Full Page) */}
            {isModalOpen && activeTab === 'blogs' && (
                <BlogBuilder
                    item={editingItem}
                    onChange={setEditingItem}
                    onSave={handleSave}
                    onClose={() => setIsModalOpen(false)}
                    isSaving={isSaving}
                />
            )}

            {/* Add/Edit Modal (products & shorts) */}
            {isModalOpen && activeTab !== 'banners' && activeTab !== 'blogs' && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingItem.id ? 'Edit' : 'Add'} {activeTab === 'products' ? 'Product' : 'Fashion Short'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {renderForm()}
                        </form>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                            <button type="submit" onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 bg-[#c20c0b] text-white rounded-lg hover:bg-[#a50a09] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                {isSaving ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Saving...
                                    </>
                                ) : (
                                    editingItem.id ? 'Update' : 'Create'
                                )}
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

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 border border-gray-200 dark:border-white/10 overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                                <Sparkles size={24} className="text-[#c20c0b]" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Confirm {editingItem.id ? 'Update' : 'Creation'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Are you sure you want to {editingItem.id ? 'update' : 'create'} this {activeTab === 'products' ? 'product' : activeTab === 'blogs' ? 'blog post' : activeTab === 'shorts' ? 'fashion short' : 'banner'}? This will be reflected on the live website.
                            </p>
                        </div>
                        <div className="flex border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                disabled={isSaving}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmSave}
                                disabled={isSaving}
                                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-[#c20c0b] hover:bg-[#a50a09] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Saving...
                                    </>
                                ) : (
                                    `Yes, ${editingItem.id ? 'Update' : 'Create'}`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
