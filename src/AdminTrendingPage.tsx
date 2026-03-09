import React, { useState, useEffect, FC, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit, Image, ShoppingBag, FileText, Video, X, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Bold, Italic, Heading1, Heading2, List, ListOrdered, Link, ImageIcon, Quote, Code, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { bannerService, trendingProductService, blogService, shortsService } from './trending.service';

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
            banners: { title: '', subtitle: '', image_url: '', cta_text: 'Explore Now', cta_link: '', sort_order: 0, is_active: true },
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

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingItem.id ? 'Edit' : 'Add'} {activeTab === 'banners' ? 'Banner' : activeTab === 'products' ? 'Product' : activeTab === 'blogs' ? 'Blog Post' : 'Fashion Short'}
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
