import React, { useState, useEffect, FC, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { trendingService } from './trending.service';

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

export const AdminTrendingPage: FC<AdminTrendingPageProps> = (props) => {
    const CACHE_KEY = 'garment_erp_admin_trending';
    const [items, setItems] = useState<any[]>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>({});
    const abortControllerRef = useRef<AbortController | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    const fetchItems = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
                const { data, error } = await Promise.race([trendingService.getAll(), timeoutPromise]) as any;

                if (error) throw error;
                if (!signal.aborted) {
                    setItems(data || []);
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
                }
                return;
            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) return;
                attempts++;
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
    }, []);

    useEffect(() => {
        fetchItems();
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchItems]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: editingItem.title,
            category: editingItem.category,
            author: editingItem.author,
            date: editingItem.date || new Date().toLocaleDateString(),
            image_url: editingItem.image_url,
            type: editingItem.type || 'article',
            video_url: editingItem.video_url,
            views: editingItem.views
        };

        if (editingItem.id) {
            const { error } = await trendingService.update(editingItem.id, payload);
            if (error) showToast(error.message, 'error');
            else { showToast('Item updated'); setIsModalOpen(false); fetchItems(); }
        } else {
            const { error } = await trendingService.create(payload);
            if (error) showToast(error.message, 'error');
            else { showToast('Item created'); setIsModalOpen(false); fetchItems(); }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this item?')) return;
        const { error } = await trendingService.delete(id);
        if (error) showToast(error.message, 'error');
        else { showToast('Item deleted'); fetchItems(); }
    };

    return (
        <MainLayout {...props}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Trending CMS</h1>
                <button onClick={() => { setEditingItem({}); setIsModalOpen(true); }} className="bg-[#c20c0b] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#a50a09] transition-colors">
                    <Plus size={18} /> Add Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {items.map(item => (
                    <div key={item.id} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                        <img src={item.image_url} alt={item.title} className="h-48 w-full object-cover" />
                        <div className="p-4">
                            <span className="text-xs font-semibold bg-red-100 text-[#c20c0b] px-2 py-1 rounded-full">{item.category}</span>
                            <h3 className="font-bold text-lg mt-2 text-gray-900 dark:text-white">{item.title}</h3>
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 transition-colors"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 transition-colors"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-200 dark:border-white/10">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{editingItem.id ? 'Edit' : 'Add'} Item</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <input type="text" placeholder="Title" required value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            <input type="text" placeholder="Category" required value={editingItem.category || ''} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            <input type="text" placeholder="Author" value={editingItem.author || ''} onChange={e => setEditingItem({...editingItem, author: e.target.value})} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            <input type="text" placeholder="Image URL" required value={editingItem.image_url || ''} onChange={e => setEditingItem({...editingItem, image_url: e.target.value})} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            <select value={editingItem.type || 'article'} onChange={e => setEditingItem({...editingItem, type: e.target.value})} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                <option value="article">Article</option>
                                <option value="video">Video</option>
                            </select>
                            {editingItem.type === 'video' && <input type="text" placeholder="Video URL" value={editingItem.video_url || ''} onChange={e => setEditingItem({...editingItem, video_url: e.target.value})} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />}
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[#c20c0b] text-white rounded">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};