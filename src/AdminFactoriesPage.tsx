// Import necessary React hooks and types
import React, { useState, useEffect, FC, useRef, useCallback } from 'react';
// Import icons from lucide-react
import { Plus, X, Trash2, Upload, Image as ImageIcon, ChevronDown, ChevronUp, Edit, MapPin, Star, ChevronLeft, ChevronRight } from 'lucide-react';
// Import the main layout component
import { MainLayout } from './MainLayout';
// Import the factory service for API calls
import { factoryService } from './factory.service';
// Import types for Factory and MachineSlot
import { Factory, MachineSlot } from './types';

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
    const abortControllerRef = useRef<AbortController | null>(null);

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
        
        // The FactoryService now handles mapping between camelCase (App) and snake_case (DB).
        // We can pass the editingFactory object directly.
        // Create a copy of the editingFactory state
        const payload = { ...editingFactory };

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

    // Function to handle input for array fields (comma separated strings)
    const handleArrayInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
        // Split the input string by comma and trim whitespace, then update state
        setEditingFactory({ ...editingFactory, [field]: e.target.value.split(',').map(s => s.trim()) });
    };

    // Gallery Helpers
    // Function to handle image upload for the gallery
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Check if files are selected
        if (!e.target.files || e.target.files.length === 0) return;
        // Get the first file
        const file = e.target.files[0];
        
        try {
            // Upload image using Supabase Storage directly
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

            // If upload successful, add URL to gallery
            if (publicUrl) {
                setEditingFactory((prev: any) => ({
                    ...prev,
                    gallery: [...(prev.gallery || []), publicUrl]
                }));
                showToast('Image uploaded successfully');
            }
        } catch (error: any) {
            // Log and show error if upload fails
            console.error('Upload failed:', error);
            showToast('Upload failed: ' + error.message, 'error');
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
    const updateProductCategory = (index: number, field: string, value: string) => {
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
    const updateFabricOption = (index: number, field: string, value: string) => {
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
                <button onClick={() => { setEditingFactory({ name: '', location: '', description: '', minimumOrderQuantity: 0, rating: 0, imageUrl: '', turnaround: '', offer: '', specialties: [], tags: [], certifications: [], gallery: [], machineSlots: [], catalog: { productCategories: [], fabricOptions: [] } }); setIsModalOpen(true); }} className="bg-[#c20c0b] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#a50a09]">
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
                                    <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => { setEditingFactory(f); setIsModalOpen(true); }} 
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
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-4">
                                    <MapPin size={14} className="mr-1" /> {f.location}
                                </p>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {f.specialties?.slice(0, 3).map((spec: string, i: number) => (
                                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                                            {spec}
                                        </span>
                                    ))}
                                    {(f.specialties?.length || 0) > 3 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 px-1 py-1">+{f.specialties!.length - 3} more</span>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10 flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold">MOQ</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{f.minimumOrderQuantity}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold">Turnaround</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{f.turnaround}</span>
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
                        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Page {currentPageIndex} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPageIndex(p => Math.min(totalPages, p + 1))}
                        disabled={currentPageIndex === totalPages}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            )}

            {/* Modal for Add/Edit Factory */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900/95 dark:backdrop-blur-xl p-8 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingFactory.id ? 'Edit Factory' : 'Add New Factory'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            
                            {/* Basic Info Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('basic')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Basic Information</h3>
                                    {expandedSection === 'basic' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                {expandedSection === 'basic' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Factory Name</label> <input type="text" required value={editingFactory.name} onChange={e => setEditingFactory({...editingFactory, name: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                        <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label> <input type="text" required value={editingFactory.location} onChange={e => setEditingFactory({...editingFactory, location: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                        <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rating</label> <input type="number" step="0.1" max="5" required value={editingFactory.rating} onChange={e => setEditingFactory({...editingFactory, rating: parseFloat(e.target.value)})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                        <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">MOQ</label> <input type="number" value={editingFactory.minimumOrderQuantity} onChange={e => setEditingFactory({...editingFactory, minimumOrderQuantity: parseInt(e.target.value)})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                        <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turnaround Time</label> <input type="text" value={editingFactory.turnaround} onChange={e => setEditingFactory({...editingFactory, turnaround: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                        <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label> <textarea value={editingFactory.description} onChange={e => setEditingFactory({...editingFactory, description: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} /> </div>
                                        <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Image URL</label> <input type="text" value={editingFactory.imageUrl} onChange={e => setEditingFactory({...editingFactory, imageUrl: e.target.value})} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                    </div>
                                )}
                            </div>

                            {/* Machine Slots Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('machines')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Machine Slots</h3>
                                    {expandedSection === 'machines' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                {expandedSection === 'machines' && (
                                    <div className="space-y-3">
                                        {editingFactory.machineSlots?.map((slot, idx) => (
                                            <div key={idx} className="flex flex-wrap gap-2 items-end bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                                                <div className="flex-grow"> <label className="text-xs text-gray-500 dark:text-gray-400">Type</label> <input type="text" value={slot.machineType} onChange={e => updateMachineSlot(idx, 'machineType', e.target.value)} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                                <div className="w-20"> <label className="text-xs text-gray-500 dark:text-gray-400">Total</label> <input type="number" value={slot.totalSlots} onChange={e => updateMachineSlot(idx, 'totalSlots', parseInt(e.target.value))} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                                <div className="w-20"> <label className="text-xs text-gray-500 dark:text-gray-400">Avail</label> <input type="number" value={slot.availableSlots} onChange={e => updateMachineSlot(idx, 'availableSlots', parseInt(e.target.value))} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                                <div className="w-32"> <label className="text-xs text-gray-500 dark:text-gray-400">Next Date</label> <input type="date" value={slot.nextAvailable} onChange={e => updateMachineSlot(idx, 'nextAvailable', e.target.value)} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div>
                                                <button type="button" onClick={() => removeMachineSlot(idx)} className="text-red-500 p-1"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addMachineSlot} className="text-sm text-[#c20c0b] font-semibold flex items-center gap-1"><Plus size={16}/> Add Machine Slot</button>
                                    </div>
                                )}
                            </div>

                            {/* Catalog Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('catalog')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Catalog</h3>
                                    {expandedSection === 'catalog' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                {expandedSection === 'catalog' && (
                                    <div className="space-y-6">
                                        {/* Product Categories */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Product Categories</h4>
                                            <div className="space-y-3">
                                                {editingFactory.catalog?.productCategories.map((cat, idx) => (
                                                    <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600 space-y-2">
                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="Category Name" value={cat.name} onChange={e => updateProductCategory(idx, 'name', e.target.value)} className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                            <button type="button" onClick={() => removeProductCategory(idx)} className="text-red-500"><Trash2 size={16} /></button>
                                                        </div>
                                                        <input type="text" placeholder="Description" value={cat.description} onChange={e => updateProductCategory(idx, 'description', e.target.value)} className="w-full p-1 border rounded text-sm" />
                                                        <input type="text" placeholder="Description" value={cat.description} onChange={e => updateProductCategory(idx, 'description', e.target.value)} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                        <input type="text" placeholder="Image URL" value={cat.imageUrl} onChange={e => updateProductCategory(idx, 'imageUrl', e.target.value)} className="w-full p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                    </div>
                                                ))}
                                                <button type="button" onClick={addProductCategory} className="text-sm text-[#c20c0b] font-semibold flex items-center gap-1"><Plus size={16}/> Add Category</button>
                                            </div>
                                        </div>
                                        {/* Fabric Options */}
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Fabric Options</h4>
                                            <div className="space-y-3">
                                                {editingFactory.catalog?.fabricOptions.map((opt, idx) => (
                                                    <div key={idx} className="flex flex-wrap gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                                                        <input type="text" placeholder="Fabric Name" value={opt.name} onChange={e => updateFabricOption(idx, 'name', e.target.value)} className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                        <input type="text" placeholder="Composition" value={opt.composition} onChange={e => updateFabricOption(idx, 'composition', e.target.value)} className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                        <input type="text" placeholder="Use Cases" value={opt.useCases} onChange={e => updateFabricOption(idx, 'useCases', e.target.value)} className="flex-grow p-1 border dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                                        <button type="button" onClick={() => removeFabricOption(idx)} className="text-red-500"><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={addFabricOption} className="text-sm text-[#c20c0b] font-semibold flex items-center gap-1"><Plus size={16}/> Add Fabric</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Gallery Section */}
                            <div className="border dark:border-white/10 rounded-lg p-4">
                                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection('gallery')}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Gallery</h3>
                                    {expandedSection === 'gallery' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                </div>
                                {expandedSection === 'gallery' && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {editingFactory.gallery?.map((url: string, index: number) => (
                                            <div key={index} className="relative group aspect-video bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden border border-gray-200 dark:border-gray-600">
                                                <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeGalleryImage(index)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                            </div>
                                        ))}
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 aspect-video transition-colors">
                                            <Upload size={20} className="text-gray-400" />
                                            <span className="text-xs text-gray-500 mt-1">Upload</span>
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-4 mt-4 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[#c20c0b] text-white rounded-lg">Save Factory</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};