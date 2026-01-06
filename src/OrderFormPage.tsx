import React, { FC, ReactNode, useRef, useState } from 'react';
import {
    Shirt, Package, Award, Weight, Palette, DollarSign, Map as MapIcon, Box, Tag, ChevronLeft
} from 'lucide-react';
import { MainLayout } from '../src/MainLayout';
import { OrderFormData } from '../src/types';

interface OrderFormPageProps {
    // Props for MainLayout
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    // Props for this page's functionality
    handleSubmitOrderForm: (formData: OrderFormData, files: File[]) => void;
}

export const OrderFormPage: FC<OrderFormPageProps> = (props) => {
    const { handleSetCurrentPage, handleSubmitOrderForm } = props;

    const [formState, setFormState] = useState<OrderFormData>({
        category: 'T-shirt', qty: '5000', fabricQuality: '100% Cotton', weightGSM: '180',
        targetPrice: '4.50', shippingDest: 'Los Angeles, USA',
        packagingReqs: 'Individually folded and poly-bagged, 50 units per carton.',
        labelingReqs: 'Custom branded neck label and hang tags required.', styleOption: 'Crew neck, short sleeves'
    });
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const { name, value } = e.target; setFormState(prev => ({ ...prev, [name]: value })); };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };
    const removeFile = (fileName: string) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
    };
    const onFormSubmit = (e: React.FormEvent) => { e.preventDefault(); handleSubmitOrderForm(formState, files); };

    const FormField: FC<{ icon: ReactNode; label: string; children: ReactNode }> = ({ icon, label, children }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {icon}
                </div>
                {children}
            </div>
        </div>
    );

    return (
        <MainLayout {...props}>
            <div className="max-w-4xl mx-auto">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">Garment Sourcing Requirements</h2>
                            <p className="text-gray-500">Fill out your order details to find matching factories.</p>
                        </div>
                        <button onClick={() => handleSetCurrentPage('sourcing')} className="text-sm text-purple-600 font-semibold flex items-center hover:underline whitespace-nowrap">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Sourcing
                        </button>
                    </div>
                    <form onSubmit={onFormSubmit} className="space-y-8">
                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Basic Details</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Product Category" icon={<Shirt className="h-5 w-5 text-gray-400" />}>
                                    <select name="category" value={formState.category} onChange={handleFormChange} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white appearance-none">
                                        <option>T-shirt</option> <option>Polo Shirt</option> <option>Hoodies</option> <option>Jeans</option> <option>Jackets</option> <option>Shirts</option> <option>Casual Shirts</option> <option>Trousers</option>
                                    </select>
                                </FormField>
                                <FormField label="Order Quantity (Units)" icon={<Package className="h-5 w-5 text-gray-400" />}>
                                    <input type="number" name="qty" value={formState.qty} onChange={handleFormChange} placeholder="e.g., 5000" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                            </div>
                        </fieldset>

                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Specifications</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Fabric Quality/Composition" icon={<Award className="h-5 w-5 text-gray-400" />}>
                                    <input type="text" name="fabricQuality" value={formState.fabricQuality} onChange={handleFormChange} placeholder="e.g., 100% Organic Cotton" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                                <FormField label="Fabric Weight (GSM)" icon={<Weight className="h-5 w-5 text-gray-400" />}>
                                    <input type="number" name="weightGSM" value={formState.weightGSM} onChange={handleFormChange} placeholder="e.g., 180" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                                <div className="md:col-span-2">
                                    <FormField label="Style Options / Tech Pack Details" icon={<Palette className="h-5 w-5 text-gray-400" />}>
                                        <textarea name="styleOption" value={formState.styleOption} onChange={handleFormChange} rows={3} placeholder="e.g., Crew neck, specific pantone colors, embroidery details..." className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                                    </FormField>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Logistics & Commercials</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Target Price per Unit (USD)" icon={<DollarSign className="h-5 w-5 text-gray-400" />}>
                                    <input type="number" step="0.01" name="targetPrice" value={formState.targetPrice} onChange={handleFormChange} placeholder="e.g., 4.50" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                                <FormField label="Shipping Destination" icon={<MapIcon className="h-5 w-5 text-gray-400" />}>
                                    <input type="text" name="shippingDest" value={formState.shippingDest} onChange={handleFormChange} placeholder="e.g., Los Angeles, USA" className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </FormField>
                                <div className="md:col-span-2">
                                    <FormField label="Packaging Requirements" icon={<Box className="h-5 w-5 text-gray-400" />}>
                                        <textarea name="packagingReqs" value={formState.packagingReqs} onChange={handleFormChange} rows={4} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                                    </FormField>
                                </div>
                                <div className="md:col-span-2">
                                    <FormField label="Labeling Requirements" icon={<Tag className="h-5 w-5 text-gray-400" />}>
                                        <textarea name="labelingReqs" value={formState.labelingReqs} onChange={handleFormChange} rows={4} className="w-full pl-10 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                                    </FormField>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="border-t pt-6">
                            <legend className="text-lg font-semibold text-gray-700 mb-4">Upload Documents</legend>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500">
                                            <span>Upload files</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} ref={fileInputRef} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PDF, AI, PSD, PNG, JPG up to 10MB</p>
                                </div>
                            </div>
                            {files.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-gray-600">Uploaded files:</h4>
                                <ul className="mt-2 space-y-2">
                                    {files.map((file, index) => (
                                        <li key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                                            <span className="text-sm text-gray-800 truncate">{file.name}</span>
                                            <button type="button" onClick={() => removeFile(file.name)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Remove</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            )}
                        </fieldset>
                        <div className="text-right pt-6 border-t"> <button type="submit" className="w-full md:w-auto px-8 py-3 text-white rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 transition shadow-md"> Find Matching Factories </button> </div>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
};