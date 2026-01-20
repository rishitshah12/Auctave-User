// Import necessary React hooks and types
import React, { useState, useEffect, FC, useRef, useCallback, useMemo } from 'react';
// Import icons from lucide-react
import { Plus, X, Trash2, Upload, Image as ImageIcon, ChevronDown, ChevronUp, Edit, MapPin, Star, ChevronLeft, ChevronRight, GripVertical, UploadCloud, Palette } from 'lucide-react';
// Import the main layout component
import { MainLayout } from './MainLayout';
// Import the factory service for API calls
import { factoryService } from './factory.service';
// Import types for Factory and MachineSlot
import { Factory, MachineSlot } from './types';
import { FactoryCard } from './FactoryCard';

// Define props interface for the AdminFactoriesPage component
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

// Predefined bright colors for tags (Tailwind 500/600 shades for good contrast with white text)
const TAG_COLORS = [
    '#ef4444', '#f97316', '#d97706', '#16a34a', '#06b6d4', 
    '#2563eb', '#4f46e5', '#9333ea', '#db2777', '#e11d48'
];

// --- Helper Components (Moved outside to prevent re-renders/focus loss) ---

// Chip Input Helper
const ChipInput: FC<{ 
    label: string; 
    values: string[]; 
    placeholder: string;
    onAdd: (value: string) => void;
    onRemove: (index: number) => void;
    suggestions?: string[];
    enableColor?: boolean;
}> = ({ label, values, placeholder, onAdd, onRemove, suggestions, enableColor }) => {
    const [input, setInput] = useState('');
    const [color, setColor] = useState(TAG_COLORS[5]); // Default to Blue
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
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{label} <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2 mb-2">
                {values?.map((v, i) => {
                    const [text, tagColor] = enableColor ? v.split(':') : [v, null];
                    return (
                        <span key={i} style={tagColor ? { backgroundColor: tagColor, color: '#fff', borderColor: tagColor } : {}} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-sm flex items-center gap-1 border border-gray-200 dark:border-gray-600 dark:text-white">
                            {text} <button type="button" onClick={() => onRemove(i)}><X size={12}/></button>
                        </span>
                    );
                })}
            </div>
            <div className="flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" />
                {enableColor && (
                    <div className="relative flex-shrink-0 flex items-center">
                        <button 
                            type="button"
                            onClick={() => setShowPicker(!showPicker)}
                            className="h-10 w-10 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-transform hover:scale-105 shadow-sm"
                            style={{ backgroundColor: color }}
                            title="Pick tag color"
                        >
                            <Palette size={16} className="text-white drop-shadow-md" />
                        </button>
                        
                        {showPicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)}></div>
                                <div className="absolute right-0 top-12 z-50 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 grid grid-cols-5 gap-2 w-48 animate-fade-in">
                                    {TAG_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => { setColor(c); setShowPicker(false); }}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-gray-600 dark:border-white scale-110' : 'border-transparent hover:scale-110'}`}
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
                <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.filter(s => !values.includes(s)).map(s => (
                        <button 
                            key={s} 
                            type="button" 
                            onClick={() => onAdd(s)}
                            className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 transition-colors"
                        >
                            + {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// File Drop Zone Component
const FileDropZone = ({ onDrop, label, compact = false }: { onDrop: (files: File[]) => void, label: string, compact?: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onDrop(Array.from(e.dataTransfer.files));
        }
    };

    return (
        <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer transition-colors ${isDragging ? 'border-[#c20c0b] bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'} ${compact ? 'p-2 h-full' : 'aspect-video'}`}
        >
            <UploadCloud size={compact ? 20 : 32} className={isDragging ? 'text-[#c20c0b]' : 'text-gray-400'} />
            {!compact && <span className="text-xs text-gray-500 dark:text-gray-200 mt-2">{label}</span>}
            <input type="file" accept="image/*" onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) onDrop(Array.from(e.target.files));
            }} className="hidden" />
        </label>
    );
};

// Define the AdminFactoriesPage component
export const AdminFactoriesPage: FC<AdminFactoriesPageProps> = (props) => {
    const CACHE_KEY = 'garment_erp_admin_factories';
    // State to store the list of factories
    const [factories, setFactories] = useState<Factory[]>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    // State to manage loading status
    const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem(CACHE_KEY));
    // State to manage the visibility of the modal (add/edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    // State to manage the factory currently being edited or created
    const [editingFactory, setEditingFactory] = useState<Partial<Factory>>({
        name: '', location: '', description: '', minimumOrderQuantity: 0, rating: 0, imageUrl: '',
        turnaround: '', offer: '',
        specialties: [], tags: [], certifications: [], gallery: [],
        machineSlots: [], catalog: { productCategories: [], fabricOptions: [] }
    });
    // State to manage which section of the form is expanded
    const [expandedSection, setExpandedSection] = useState<string | null>('basic');
    // Pagination state
    const [currentPageIndex, setCurrentPageIndex] = useState(1);
    const itemsPerPage = 9;
    const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [originalFactory, setOriginalFactory] = useState<string | null>(null);

    // Check if the form is dirty (has changes)
    const isDirty = useMemo(() => {
        if (!editingFactory.id) return true; // Always dirty for new factories (or rely on validation)
        return JSON.stringify(editingFactory) !== originalFactory;
    }, [editingFactory, originalFactory]);

    // Helper function to show toast notifications
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    // Function to fetch all factories from the service
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
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [fetchFactories]);

    // Calculate pagination
    const totalPages = Math.ceil(factories.length / itemsPerPage);
    const displayedFactories = factories.slice(
        (currentPageIndex - 1) * itemsPerPage,
        currentPageIndex * itemsPerPage
    );

    // Reset page if out of bounds
    useEffect(() => {
        if (currentPageIndex > totalPages && totalPages > 0) {
            setCurrentPageIndex(totalPages);
        }
    }, [factories.length, totalPages, currentPageIndex]);

    // Function to handle saving (create or update) a factory
    const handleSave = async (e: React.FormEvent) => {
        // Prevent default form submission behavior
        e.preventDefault();

        if (!isDirty) return;

        // Validation
        if (!editingFactory.name?.trim()) return showToast('Factory Name is required', 'error');
        if (!editingFactory.location?.trim() || editingFactory.location === ', ') return showToast('City and Country are required', 'error');
        if (!editingFactory.description?.trim()) return showToast('Description is required', 'error');
        if ((editingFactory.minimumOrderQuantity || 0) < 0) return showToast('MOQ cannot be negative', 'error');
        if (!editingFactory.minimumOrderQuantity) return showToast('MOQ is required', 'error');
        if (!editingFactory.tags?.length) return showToast('At least one tag is required', 'error');
        if (!editingFactory.specialties?.length) return showToast('At least one specialty is required', 'error');
        if (!editingFactory.certifications?.length) return showToast('At least one certification is required', 'error');
        if (!editingFactory.machineSlots?.length) return showToast('Production Capacity information is required', 'error');
        if (!editingFactory.gallery?.length) return showToast('At least one gallery image is required', 'error');
        if (!editingFactory.catalog?.productCategories.length) return showToast('At least one product category is required', 'error');

        
        // The FactoryService now handles mapping between camelCase (App) and snake_case (DB).
        // We can pass the editingFactory object directly.
        // Create a copy of the editingFactory state
        const payload: any = { ...editingFactory };

        // Remove ID from payload as it's passed separately for updates
        delete payload.id;
        // Remove timestamps to prevent conflicts with database triggers or missing columns
        // Note: The "record 'new' has no field 'updated_at'" error requires running the SQL fix.
        delete payload.created_at;
        delete payload.updated_at;

        // Set the first gallery image as the thumbnail (cover image)
        if (payload.gallery && payload.gallery.length > 0) {
            payload.imageUrl = payload.gallery[0];
        } else {
            payload.imageUrl = '';
        }

        // Check if we are updating an existing factory (has ID)
        if (editingFactory.id) {
            // Call update method
            const { error } = await factoryService.update(editingFactory.id, payload);
            // Handle error
            if (error) showToast(error.message, 'error');
            // On success, show toast, close modal, and refresh list
            else { showToast('Factory updated'); setIsModalOpen(false); fetchFactories(); }
        } else {
            // Call create method for new factory
            const { error } = await factoryService.create(payload);
            // Handle error
            if (error) showToast(error.message, 'error');
            // On success, show toast, close modal, and refresh list
            else { showToast('Factory created'); setIsModalOpen(false); fetchFactories(); }
        }
    };

    // Function to handle deleting a factory
    const handleDelete = async (id: string) => {
        // Confirm deletion with the user
        if(!confirm('Delete this factory?')) return;
        // Call delete method
        const { error } = await factoryService.delete(id);
        // Handle error
        if(error) showToast(error.message, 'error');
        // On success, show toast and refresh list
        else { showToast('Factory deleted'); fetchFactories(); }
    };

    // Gallery Helpers
    // Helper to upload file to Supabase
    const uploadFileToStorage = async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `factories/${fileName}`;

            const { error: uploadError } = await props.supabase.storage
                .from('factory-gallery') // Ensure this bucket exists and is public
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = props.supabase.storage
                .from('factory-gallery')
                .getPublicUrl(filePath);
            
            return publicUrl;
        } catch (error: any) {
            console.error('Upload failed:', error);
            showToast('Upload failed: ' + error.message, 'error');
            return null;
        }
    };

    // Function to handle image upload for the gallery
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement> | File[], target: 'gallery' | 'catalog' = 'gallery', index?: number) => {
        let file: File | null = null;
        
        if (Array.isArray(e)) {
            if (e.length > 0) file = e[0];
        } else {
            if (e.target.files && e.target.files.length > 0) {
                file = e.target.files[0];
            }
        }

        if (!file) return;

        const publicUrl = await uploadFileToStorage(file);

        if (publicUrl) {
            if (target === 'gallery') {
                setEditingFactory((prev: any) => ({ ...prev, gallery: [...(prev.gallery || []), publicUrl] }));
            } else if (target === 'catalog' && index !== undefined) {
                updateProductCategory(index, 'imageUrl', publicUrl);
            }
            showToast('Image uploaded successfully');
        }
    };

    // Function to remove an image from the gallery
    const removeGalleryImage = (index: number) => {
        // Create a copy of the gallery array
        const newGallery = [...(editingFactory.gallery || [])];
        // Remove the image at the specified index
        newGallery.splice(index, 1);
        // Update state
        setEditingFactory((prev: any) => ({ ...prev, gallery: newGallery }));
    };

    // Gallery Drag and Drop Handlers
    const handleDragStart = (index: number) => setDraggedImageIndex(index);
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedImageIndex === null || draggedImageIndex === index) return;
        const newGallery = [...(editingFactory.gallery || [])];
        const draggedItem = newGallery[draggedImageIndex];
        newGallery.splice(draggedImageIndex, 1);
        newGallery.splice(index, 0, draggedItem);
        setEditingFactory(prev => ({ ...prev, gallery: newGallery }));
        setDraggedImageIndex(index);
    };
    const handleDragEnd = () => setDraggedImageIndex(null);

    // --- Complex Field Handlers ---

    // Machine Slots
    // Function to add a new machine slot
    const addMachineSlot = () => {
        setEditingFactory(prev => ({
            ...prev,
            // Add a new empty slot object to the machineSlots array
            machineSlots: [...(prev.machineSlots || []), { machineType: '', totalSlots: 0, availableSlots: 0, nextAvailable: '' }]
        }));
    };

    // Function to update a specific machine slot
    const updateMachineSlot = (index: number, field: keyof MachineSlot, value: any) => {
        // Copy existing slots
        const newSlots = [...(editingFactory.machineSlots || [])];
        // Update the specific field of the slot at index
        newSlots[index] = { ...newSlots[index], [field]: value };
        // Update state
        setEditingFactory(prev => ({ ...prev, machineSlots: newSlots }));
    };

    // Function to remove a machine slot
    const removeMachineSlot = (index: number) => {
        // Copy existing slots
        const newSlots = [...(editingFactory.machineSlots || [])];
        // Remove slot at index
        newSlots.splice(index, 1);
        // Update state
        setEditingFactory(prev => ({ ...prev, machineSlots: newSlots }));
    };

    // Catalog - Product Categories
    // Function to add a product category
    const addProductCategory = () => {
        // Get current catalog or initialize default
        const currentCatalog = editingFactory.catalog || { productCategories: [], fabricOptions: [] };
        // Update state with new category added
        setEditingFactory(prev => ({
            ...prev,
            catalog: {
                ...currentCatalog,
                productCategories: [...currentCatalog.productCategories, { name: '', description: '', imageUrl: '' }]
            }
        }));
    };

    // Function to update a product category
    const updateProductCategory = (index: number, field: 'name' | 'description' | 'imageUrl', value: string) => {
        // Get current catalog
        const currentCatalog = editingFactory.catalog || { productCategories: [], fabricOptions: [] };
        // Copy categories
        const newCategories = [...currentCatalog.productCategories];
        // Update specific category
        newCategories[index] = { ...newCategories[index], [field]: value };
        // Update state
        setEditingFactory(prev => ({
            ...prev,
            catalog: { ...currentCatalog, productCategories: newCategories }
        }));
    };

    // Function to remove a product category
    const removeProductCategory = (index: number) => {
        // Get current catalog
        const currentCatalog = editingFactory.catalog || { productCategories: [], fabricOptions: [] };
        // Copy categories
        const newCategories = [...currentCatalog.productCategories];
        // Remove category at index
        newCategories.splice(index, 1);
        // Update state
        setEditingFactory(prev => ({ ...prev, catalog: { ...currentCatalog, productCategories: newCategories } }));
    };

    // Catalog - Fabric Options
    // Function to add a fabric option
    const addFabricOption = () => {
        // Get current catalog
        const currentCatalog = editingFactory.catalog || { productCategories: [], fabricOptions: [] };
        // Update state with new fabric option
        setEditingFactory(prev => ({
            ...prev,
            catalog: {
                ...currentCatalog,
                fabricOptions: [...currentCatalog.fabricOptions, { name: '', composition: '', useCases: '' }]
            }
        }));
    };

    // Function to update a fabric option
    const updateFabricOption = (index: number, field: 'name' | 'composition' | 'useCases', value: string) => {
        // Get current catalog
        const currentCatalog = editingFactory.catalog || { productCategories: [], fabricOptions: [] };
        // Copy options
        const newOptions = [...currentCatalog.fabricOptions];
        // Update specific option
        newOptions[index] = { ...newOptions[index], [field]: value };
        // Update state
        setEditingFactory(prev => ({
            ...prev,
            catalog: { ...currentCatalog, fabricOptions: newOptions }
        }));
    };

    // Function to remove a fabric option
    const removeFabricOption = (index: number) => {
        // Get current catalog
        const currentCatalog = editingFactory.catalog || { productCategories: [], fabricOptions: [] };
        // Copy options
        const newOptions = [...currentCatalog.fabricOptions];
        // Remove option at index
        newOptions.splice(index, 1);
        // Update state
        setEditingFactory(prev => ({ ...prev, catalog: { ...currentCatalog, fabricOptions: newOptions } }));
    };

    // Function to toggle accordion sections in the form
    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        // Render the MainLayout with props
        <MainLayout {...props}>
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Factory CMS</h1>
                    <p className="text-gray-500">Manage factory profiles, media, and capabilities.</p>
                </div>
                {/* Add Factory Button */}
                <button onClick={() => { setEditingFactory({ name: '', location: '', description: '', minimumOrderQuantity: 0, rating: 0, imageUrl: '', turnaround: '', offer: '', specialties: [], tags: [], certifications: [], gallery: [], machineSlots: [], catalog: { productCategories: [], fabricOptions: [] } }); setOriginalFactory(null); setIsModalOpen(true); setIsPreviewMode(false); }} className="bg-[#c20c0b] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#a50a09]">
                    <Plus size={18} /> Add Factory
                </button>
            </div>

            {/* Factories Table */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-80 animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedFactories.map((f: any) => (
                        <div key={f.id} className="bg-white dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col transition-all hover:shadow-xl group hover:-translate-y-1 duration-300">
                            <div className="relative h-48">
                                {f.imageUrl ? (
                                    <img 
                                        src={f.imageUrl} 
                                        alt={f.name} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).onerror = null;
                                            (e.target as HTMLImageElement).src = `https://placehold.co/600x400/e9d5ff/4c1d95?text=${encodeURIComponent(f.name || 'Factory')}`;
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => { setEditingFactory(f); setOriginalFactory(JSON.stringify(f)); setIsModalOpen(true); setIsPreviewMode(false); }} 
                                        className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
                                        title="Edit Factory"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(f.id)} 
                                        className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-700 text-red-600 dark:text-red-400 transition-colors"
                                        title="Delete Factory"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded flex items-center">
                                    <Star size={12} className="text-yellow-400 fill-current mr-1" />
                                    {f.rating}
                                </div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{f.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-200 flex items-center mb-4">
                                    <MapPin size={14} className="mr-1" /> {f.location}
                                </p>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {f.specialties?.slice(0, 3).map((spec: string, i: number) => (
                                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                                            {spec}
                                        </span>
                                    ))}
                                    {(f.specialties?.length || 0) > 3 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 px-1 py-1">+{f.specialties!.length - 3} more</span>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10 flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 dark:text-gray-200 uppercase font-semibold">MOQ</span>
                                        <span className="font-medium text-gray-700 dark:text-white">{f.minimumOrderQuantity}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-xs text-gray-400 dark:text-gray-200 uppercase font-semibold">Turnaround</span>
                                        <span className="font-medium text-gray-700 dark:text-white">{f.turnaround}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
                <div className="flex justify-center items-center mt-8 gap-4">
                    <button
                        onClick={() => setCurrentPageIndex(p => Math.max(1, p - 1))}
                        disabled={currentPageIndex === 1}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-200" />
                    </button>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                        Page {currentPageIndex} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPageIndex(p => Math.min(totalPages, p + 1))}
                        disabled={currentPageIndex === totalPages}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronRight size={20} className="text-gray-600 dark:text-gray-200" />
                    </button>
                </div>
            )}

            {/* Modal for Add/Edit Factory */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-8 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{isPreviewMode ? 'Preview Factory Card' : (editingFactory.id ? 'Edit Factory' : 'Add New Factory')}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                        </div>
                        
                        {isPreviewMode ? (
                            <div className="flex flex-col items-center space-y-6">
                                <div className="w-full max-w-sm">
                                    <FactoryCard factory={editingFactory as Factory} onSelect={() => {}} style={{}} />
                                </div>
                                <div className="flex justify-end gap-4 w-full pt-4 border-t border-gray-200 dark:border-white/10">
                                    <button type="button" onClick={() => setIsPreviewMode(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg">Back to Edit</button>
                                    <button onClick={(e) => handleSave(e as any)} className="px-4 py-2 bg-[#c20c0b] text-white rounded-lg">Save Factory</button>
                                </div>
                            </div>
                        ) : (
                        <form onSubmit={handleSave} className="space-y-4">
                            
                            {/* Basic Info Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('basic')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Basic Information</h3>
                                    {expandedSection === 'basic' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${expandedSection === 'basic' ? '' : 'hidden'}`}>
                                    <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Factory Name <span className="text-red-500">*</span></label> <input type="text" required value={editingFactory.name} onChange={e => setEditingFactory({...editingFactory, name: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" /> </div>
                                    
                                    <div> 
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">City <span className="text-red-500">*</span></label> 
                                        <input type="text" required value={(editingFactory.location?.split(',') || [])[0]?.trim() || ''} onChange={e => { const country = (editingFactory.location?.split(',') || []).slice(1).join(',').trim() || ''; setEditingFactory({...editingFactory, location: `${e.target.value}, ${country}`}); }} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" placeholder="e.g. Dhaka" /> 
                                    </div>
                                    <div> 
                                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Country <span className="text-red-500">*</span></label> 
                                        <input type="text" required value={(editingFactory.location?.split(',') || []).slice(1).join(',').trim() || ''} onChange={e => { const city = (editingFactory.location?.split(',') || [])[0]?.trim() || ''; setEditingFactory({...editingFactory, location: `${city}, ${e.target.value}`}); }} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" placeholder="e.g. Bangladesh" /> 
                                    </div>

                                    <div> <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">MOQ <span className="text-red-500">*</span></label> <input type="number" min="0" value={editingFactory.minimumOrderQuantity} onChange={e => setEditingFactory({...editingFactory, minimumOrderQuantity: Math.max(0, parseInt(e.target.value))})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" /> </div>
                                    <div> <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Turnaround Time</label> <input type="text" value={editingFactory.turnaround} onChange={e => setEditingFactory({...editingFactory, turnaround: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" placeholder="e.g. 4-6 weeks" /> </div>
                                    
                                    <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Promo Offer Banner (Optional)</label> <input type="text" value={editingFactory.offer || ''} onChange={e => setEditingFactory({...editingFactory, offer: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" placeholder="e.g. 5% off first order" /> </div>
                                    
                                    <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Description <span className="text-red-500">*</span></label> <textarea value={editingFactory.description} onChange={e => setEditingFactory({...editingFactory, description: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" rows={3} /> </div>
                                </div>
                            </div>

                            {/* Marketing & Compliance Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('marketing')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Marketing & Compliance</h3>
                                    {expandedSection === 'marketing' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                <div className={`space-y-4 ${expandedSection === 'marketing' ? '' : 'hidden'}`}>
                                    <ChipInput 
                                        label="Tags" 
                                        values={editingFactory.tags || []} 
                                        placeholder="e.g. Prime, Sustainable" 
                                        onAdd={(val) => setEditingFactory(prev => ({ ...prev, tags: [...(prev.tags || []), val] }))}
                                        onRemove={(idx) => setEditingFactory(prev => ({ ...prev, tags: (prev.tags || []).filter((_, i) => i !== idx) }))}
                                        enableColor={true}
                                    />
                                    <ChipInput 
                                        label="Specialties" 
                                        values={editingFactory.specialties || []} 
                                        placeholder="Add custom specialty..." 
                                        onAdd={(val) => setEditingFactory(prev => ({ ...prev, specialties: [...(prev.specialties || []), val] }))}
                                        onRemove={(idx) => setEditingFactory(prev => ({ ...prev, specialties: (prev.specialties || []).filter((_, i) => i !== idx) }))}
                                        suggestions={['T-shirt', 'Polo Shirt', 'Shirts', 'Casual Shirts', 'Trousers', 'Jeans', 'Hoodies', 'Jackets']}
                                    />
                                    <ChipInput 
                                        label="Certifications" 
                                        values={editingFactory.certifications || []} 
                                        placeholder="e.g. ISO 9001, SA8000" 
                                        onAdd={(val) => setEditingFactory(prev => ({ ...prev, certifications: [...(prev.certifications || []), val] }))}
                                        onRemove={(idx) => setEditingFactory(prev => ({ ...prev, certifications: (prev.certifications || []).filter((_, i) => i !== idx) }))}
                                    />
                                    <div> <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Rating</label> <input type="number" step="0.1" max="5" min="0" required value={editingFactory.rating} onChange={e => setEditingFactory({...editingFactory, rating: parseFloat(e.target.value)})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:outline-none" /> </div>
                                </div>
                            </div>

                            {/* Machine Slots Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('machines')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Machine Slots</h3>
                                    {expandedSection === 'machines' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                <div className={`space-y-3 ${expandedSection === 'machines' ? '' : 'hidden'}`}>
                                    {editingFactory.machineSlots?.map((slot, idx) => (
                                        <div key={idx} className="flex flex-wrap gap-2 items-end bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                                            <div className="flex-grow"> <label className="text-xs text-gray-500 dark:text-gray-200">Type</label> <input type="text" value={slot.machineType} onChange={e => updateMachineSlot(idx, 'machineType', e.target.value)} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" /> </div>
                                            <div className="w-20"> <label className="text-xs text-gray-500 dark:text-gray-200">Total</label> <input type="number" value={slot.totalSlots} onChange={e => updateMachineSlot(idx, 'totalSlots', parseInt(e.target.value))} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" /> </div>
                                            <div className="w-20"> <label className="text-xs text-gray-500 dark:text-gray-200">Avail</label> <input type="number" value={slot.availableSlots} onChange={e => updateMachineSlot(idx, 'availableSlots', parseInt(e.target.value))} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" /> </div>
                                            <div className="w-32"> <label className="text-xs text-gray-500 dark:text-gray-200">Next Date</label> <input type="date" value={slot.nextAvailable} onChange={e => updateMachineSlot(idx, 'nextAvailable', e.target.value)} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" /> </div>
                                            <button type="button" onClick={() => removeMachineSlot(idx)} className="text-red-500 p-1"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addMachineSlot} className="text-sm text-[#c20c0b] font-semibold flex items-center gap-1"><Plus size={16}/> Add Machine Slot</button>
                                </div>
                            </div>

                            {/* Catalog Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('catalog')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Catalog</h3>
                                    {expandedSection === 'catalog' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                <div className={`space-y-6 ${expandedSection === 'catalog' ? '' : 'hidden'}`}>
                                    {/* Product Categories */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-white mb-2">Product Categories</h4>
                                        <div className="space-y-3">
                                            {editingFactory.catalog?.productCategories.map((cat, idx) => (
                                                <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600 space-y-2">
                                                    <div className="flex gap-2 items-center">
                                                        <div className="w-12 h-12 flex-shrink-0">
                                                            {cat.imageUrl ? 
                                                                <img src={cat.imageUrl} alt="Cat" className="w-full h-full object-cover rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer" onClick={() => updateProductCategory(idx, 'imageUrl', '')} title="Click to remove" /> : 
                                                                <FileDropZone onDrop={(files) => handleImageUpload(files, 'catalog', idx)} label="" compact={true} />
                                                            }
                                                        </div>
                                                        <input type="text" placeholder="Category Name" value={cat.name} onChange={e => updateProductCategory(idx, 'name', e.target.value)} className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" />
                                                        <button type="button" onClick={() => removeProductCategory(idx)} className="text-red-500"><Trash2 size={16} /></button>
                                                    </div>
                                                    <input type="text" placeholder="Description" value={cat.description} onChange={e => updateProductCategory(idx, 'description', e.target.value)} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" />
                                                </div>
                                            ))}
                                            <button type="button" onClick={addProductCategory} className="text-sm text-[#c20c0b] font-semibold flex items-center gap-1"><Plus size={16}/> Add Category</button>
                                        </div>
                                    </div>
                                    {/* Fabric Options */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-white mb-2">Fabric Options</h4>
                                        <div className="space-y-3">
                                            {editingFactory.catalog?.fabricOptions.map((opt, idx) => (
                                                <div key={idx} className="flex flex-wrap gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                                                    <input type="text" placeholder="Fabric Name" value={opt.name} onChange={e => updateFabricOption(idx, 'name', e.target.value)} className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" />
                                                    <input type="text" placeholder="Composition" value={opt.composition} onChange={e => updateFabricOption(idx, 'composition', e.target.value)} className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" />
                                                    <input type="text" placeholder="Use Cases" value={opt.useCases} onChange={e => updateFabricOption(idx, 'useCases', e.target.value)} className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#c20c0b] focus:outline-none" />
                                                    <button type="button" onClick={() => removeFabricOption(idx)} className="text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={addFabricOption} className="text-sm text-[#c20c0b] font-semibold flex items-center gap-1"><Plus size={16}/> Add Fabric</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Gallery Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('gallery')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Gallery</h3>
                                    {expandedSection === 'gallery' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                <div className={`grid grid-cols-3 sm:grid-cols-4 gap-3 ${expandedSection === 'gallery' ? '' : 'hidden'}`}>
                                    {editingFactory.gallery?.map((url: string, index: number) => (
                                        <div 
                                            key={index} 
                                            className="relative group aspect-video bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden border border-gray-200 dark:border-gray-600 cursor-move"
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <GripVertical className="text-white drop-shadow-md" />
                                            </div>
                                            <button type="button" onClick={() => removeGalleryImage(index)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                            {index === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded">Thumbnail</span>}
                                        </div>
                                    ))}
                                    <FileDropZone onDrop={(files) => handleImageUpload(files, 'gallery')} label="Upload Photos" />
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-4 mt-4 pt-4 border-t">
                                <button type="button" onClick={() => setIsPreviewMode(true)} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors mr-auto">Preview</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg">Cancel</button>
                                <button type="submit" disabled={!isDirty} className={`px-4 py-2 text-white rounded-lg transition-colors ${!isDirty ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#c20c0b] hover:bg-[#a50a09]'}`}>Save Factory</button>
                            </div>
                        </form>
                        )}
                    </div>
                </div>
            )}
        </MainLayout>
    );
};