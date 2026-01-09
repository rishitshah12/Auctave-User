// Import necessary React tools: FC (Functional Component type), ReactNode (for rendering children), useRef (for accessing DOM elements), and useState (for managing data).
import React, { FC, ReactNode, useRef, useState } from 'react';
// Import specific icons from the 'lucide-react' library to use in the form UI.
import {
    Shirt, Package, Award, Weight, Palette, DollarSign, Map as MapIcon, Box, Tag, ChevronLeft
} from 'lucide-react';
// Import the main layout wrapper which provides the sidebar and header structure.
import { MainLayout } from '../src/MainLayout';
// Import the TypeScript definition for the order form data structure.
import { OrderFormData } from '../src/types';

// Define the properties (props) that this component expects to receive from its parent (App.tsx).
interface OrderFormPageProps {
    // --- MainLayout Props ---
    // These props are passed down to the MainLayout component to control the overall app shell.
    pageKey: number; // Unique key to force re-rendering if needed.
    user: any; // The currently logged-in user object.
    currentPage: string; // The identifier for the page currently being viewed.
    isMenuOpen: boolean; // Boolean flag for mobile menu visibility.
    isSidebarCollapsed: boolean; // Boolean flag for desktop sidebar state.
    toggleMenu: () => void; // Function to toggle the mobile menu.
    setIsSidebarCollapsed: (isCollapsed: boolean) => void; // Function to toggle the sidebar.
    handleSetCurrentPage: (page: string, data?: any) => void; // Function to navigate between pages.
    handleSignOut: () => void; // Function to log the user out.
    
    // --- Page Specific Props ---
    // Function provided by App.tsx to handle the actual submission logic (saving to DB, etc.).
    handleSubmitOrderForm: (formData: OrderFormData, files: File[]) => void; 
}

// Define the OrderFormPage component using the props interface defined above.
export const OrderFormPage: FC<OrderFormPageProps> = (props) => {
    // Destructure (extract) specific functions we need from the props object.
    const { handleSetCurrentPage, handleSubmitOrderForm } = props;

    // --- State Management ---
    // Initialize the form state with default values so the fields aren't empty when the user arrives.
    const [formState, setFormState] = useState<OrderFormData>({
        category: 'T-shirt', // Default product category
        qty: '5000', // Default quantity
        fabricQuality: '100% Cotton', // Default fabric
        weightGSM: '180', // Default fabric weight
        targetPrice: '4.50', // Default target price
        shippingDest: 'Los Angeles, USA', // Default destination
        packagingReqs: 'Individually folded and poly-bagged, 50 units per carton.', // Default packaging instructions
        labelingReqs: 'Custom branded neck label and hang tags required.', // Default labeling instructions
        styleOption: 'Crew neck, short sleeves' // Default style description
    });

    // State to hold the list of files uploaded by the user.
    const [files, setFiles] = useState<File[]>([]);
    
    // Create a reference to the hidden file input element so we can reset it if needed.
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Event Handlers ---

    // Function to handle changes in text inputs, textareas, and select dropdowns.
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { 
        // Extract the 'name' (which field changed) and 'value' (what the user typed) from the event target.
        const { name, value } = e.target; 
        // Update the form state, keeping previous values (...prev) and overwriting the changed field.
        setFormState(prev => ({ ...prev, [name]: value })); 
    };

    // Function to handle file selection when the user uploads documents.
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Check if files were actually selected.
        if (e.target.files) {
            // Add the new files to the existing list of files.
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    // Function to remove a specific file from the list by its name.
    const removeFile = (fileName: string) => {
        // Filter out the file that matches the given name.
        setFiles(prev => prev.filter(f => f.name !== fileName));
    };

    // Function called when the user clicks the "Submit" button.
    const onFormSubmit = (e: React.FormEvent) => { 
        // Prevent the default browser behavior (which would reload the page).
        e.preventDefault(); 

        // Basic Form Validation
        const requiredFields = [
            { key: 'qty', label: 'Quantity' },
            { key: 'fabricQuality', label: 'Fabric Quality' },
            { key: 'weightGSM', label: 'Fabric Weight' },
            { key: 'targetPrice', label: 'Target Price' },
            { key: 'shippingDest', label: 'Shipping Destination' },
            { key: 'styleOption', label: 'Style Options' }
        ];

        for (const field of requiredFields) {
            const value = formState[field.key as keyof OrderFormData];
            if (!value || value.toString().trim() === '') {
                if (window.showToast) window.showToast(`${field.label} is required.`, 'error');
                return;
            }
        }

        // Call the parent function passed via props to process the data.
        handleSubmitOrderForm(formState, files); 
    };

    // --- Helper Component ---
    // A small reusable component to render a form field with a label and an icon.
    const FormField: FC<{ icon: ReactNode; label: string; children: ReactNode }> = ({ icon, label, children }) => (
        <div>
            {/* Render the label text above the input */}
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                {/* Position the icon inside the input area on the left side */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {icon}
                </div>
                {/* Render the actual input element (passed as children) */}
                {children}
            </div>
        </div>
    );

    // --- Main Render ---
    return (
        // Wrap the page content in the MainLayout to ensure consistent navigation and styling.
        <MainLayout {...props}>
            <div className="max-w-4xl mx-auto">
                {/* Main Card Container */}
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                    
                    {/* Header Section: Title and Back Button */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">Garment Sourcing Requirements</h2>
                            <p className="text-gray-500">Fill out your order details to find matching factories.</p>
                        </div>
                        {/* Button to navigate back to the main sourcing page */}
                        <button onClick={() => handleSetCurrentPage('sourcing')} className="text-sm text-purple-600 font-semibold flex items-center hover:underline whitespace-nowrap">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Sourcing
                        </button>
                    </div>

                    {/* The Form Element */}
                    <form onSubmit={onFormSubmit} className="space-y-8">
                        
                        {/* Section 1: Basic Details */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Basic Details</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product Category Dropdown */}
                                <FormField label="Product Category" icon={<Shirt className="h-5 w-5 text-gray-400" />}>
                                    <select name="category" value={formState.category} onChange={handleFormChange} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white appearance-none">
                                        <option>T-shirt</option> <option>Polo Shirt</option> <option>Hoodies</option> <option>Jeans</option> <option>Jackets</option> <option>Shirts</option> <option>Casual Shirts</option> <option>Trousers</option>
                                    </select>
                                </FormField>
                                {/* Quantity Input */}
                                <FormField label="Order Quantity (Units)" icon={<Package className="h-5 w-5 text-gray-400" />}>
                                    <input type="number" name="qty" value={formState.qty} onChange={handleFormChange} placeholder="e.g., 5000" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                            </div>
                        </fieldset>

                        {/* Section 2: Specifications */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Specifications</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Fabric Quality Input */}
                                <FormField label="Fabric Quality/Composition" icon={<Award className="h-5 w-5 text-gray-400" />}>
                                    <input type="text" name="fabricQuality" value={formState.fabricQuality} onChange={handleFormChange} placeholder="e.g., 100% Organic Cotton" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                                {/* Fabric Weight Input */}
                                <FormField label="Fabric Weight (GSM)" icon={<Weight className="h-5 w-5 text-gray-400" />}>
                                    <input type="number" name="weightGSM" value={formState.weightGSM} onChange={handleFormChange} placeholder="e.g., 180" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                                {/* Style Options Textarea (Full width) */}
                                <div className="md:col-span-2">
                                    <FormField label="Style Options / Tech Pack Details" icon={<Palette className="h-5 w-5 text-gray-400" />}>
                                        <textarea name="styleOption" value={formState.styleOption} onChange={handleFormChange} rows={3} placeholder="e.g., Crew neck, specific pantone colors, embroidery details..." className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                                    </FormField>
                                </div>
                            </div>
                        </fieldset>

                        {/* Section 3: Logistics & Commercials */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Logistics & Commercials</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Target Price Input */}
                                <FormField label="Target Price per Unit (USD)" icon={<DollarSign className="h-5 w-5 text-gray-400" />}>
                                    <input type="number" step="0.01" name="targetPrice" value={formState.targetPrice} onChange={handleFormChange} placeholder="e.g., 4.50" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                                {/* Shipping Destination Input */}
                                <FormField label="Shipping Destination" icon={<MapIcon className="h-5 w-5 text-gray-400" />}>
                                    <input type="text" name="shippingDest" value={formState.shippingDest} onChange={handleFormChange} placeholder="e.g., Los Angeles, USA" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                                {/* Packaging Requirements Textarea */}
                                <div className="md:col-span-2">
                                    <FormField label="Packaging Requirements" icon={<Box className="h-5 w-5 text-gray-400" />}>
                                        <textarea name="packagingReqs" value={formState.packagingReqs} onChange={handleFormChange} rows={4} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                                    </FormField>
                                </div>
                                {/* Labeling Requirements Textarea */}
                                <div className="md:col-span-2">
                                    <FormField label="Labeling Requirements" icon={<Tag className="h-5 w-5 text-gray-400" />}>
                                        <textarea name="labelingReqs" value={formState.labelingReqs} onChange={handleFormChange} rows={4} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                                    </FormField>
                                </div>
                            </div>
                        </fieldset>

                        {/* Section 4: File Uploads */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Upload Documents</legend>
                            {/* Drag and Drop Area */}
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                        {/* Hidden file input triggered by the label */}
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500">
                                            <span>Upload files</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} ref={fileInputRef} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PDF, AI, PSD, PNG, JPG up to 10MB</p>
                                </div>
                            </div>
                            
                            {/* List of Uploaded Files */}
                            {files.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-gray-600">Uploaded files:</h4>
                                <ul className="mt-2 space-y-2">
                                    {/* Map through the files array to display each file */}
                                    {files.map((file, index) => (
                                        <li key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                                            <span className="text-sm text-gray-800 truncate">{file.name}</span>
                                            {/* Button to remove a specific file */}
                                            <button type="button" onClick={() => removeFile(file.name)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Remove</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            )}
                        </fieldset>
                        
                        {/* Submit Button */}
                        <div className="text-right pt-6 border-t"> 
                            <button type="submit" className="w-full md:w-auto px-8 py-3 text-white rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 transition shadow-md"> 
                                Submit Quote Request 
                            </button> 
                        </div>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
};