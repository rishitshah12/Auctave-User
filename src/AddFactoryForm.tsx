import React, { useState } from 'react';
// Adjust the import path to your actual Supabase client location
import { supabase } from './supabaseClient';

interface FactoryFormData {
  factory_name: string;
  country: string;
  state: string;
  city: string;
  turn_around_time: string;
  moq: string;
  promotional_offer: string;
  tags: string;
  description: string;
  factory_type: string;
  production_capacity: string;
  certifications: string; // Input as comma separated string
  machinery_details: string;
  specialities: string;
}

const INITIAL_DATA: FactoryFormData = {
  factory_name: '',
  country: '',
  state: '',
  city: '',
  turn_around_time: '',
  moq: '',
  promotional_offer: '',
  tags: '',
  description: '',
  factory_type: '',
  production_capacity: '',
  certifications: '',
  machinery_details: '',
  specialities: '',
};

export default function AddFactoryForm() {
  const [formData, setFormData] = useState<FactoryFormData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.factory_name) return 'Factory Name is required.';
    if (!formData.country) return 'Country is required.';
    if (!formData.moq) return 'MOQ is required.';
    if (!formData.tags) return 'Tags are required.';
    if (!formData.specialities) return 'Specialities are required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Prepare data for Supabase
      const payload = {
        ...formData,
        // Convert comma-separated string to array for text[] column
        certifications: formData.certifications
          ? formData.certifications.split(',').map((c) => c.trim()).filter(Boolean)
          : [],
        status: 'published', // Explicitly setting status as requested
        // Allow submission even without a session (Test Admin Access)
        created_by: session?.user?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { error: supabaseError } = await supabase
        .from('factories')
        .insert([payload]);

      if (supabaseError) throw supabaseError;

      setSuccess(true);
      setFormData(INITIAL_DATA); // Reset form on success
      
      // Optional: Redirect logic here
      // window.location.href = '/sourcing'; 

    } catch (err: any) {
      console.error('Error saving factory:', err);
      setError(err.message || 'Failed to save factory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white shadow-lg rounded-xl">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-3xl font-bold text-gray-800">Add New Factory</h2>
        <p className="text-gray-500 mt-2">Enter factory details below. Fields marked with <span className="text-red-500">*</span> are required.</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 shadow-sm">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded mb-6 shadow-sm">
          <p className="font-bold">Success</p>
          <p>Factory published successfully! It is now visible on the sourcing page.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section: Basic Info */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2">1</span>
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factory Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="factory_name"
                value={formData.factory_name}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. Acme Garments Ltd."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. Vietnam"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              />
            </div>
          </div>
        </section>

        {/* Section: Production Details */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2">2</span>
            Production Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="Brief description of the factory..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOQ (Minimum Order Quantity) <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="moq"
                value={formData.moq}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. 500 pcs"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Production Capacity</label>
              <input
                type="text"
                name="production_capacity"
                value={formData.production_capacity}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. 50,000 pcs/month"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turn Around Time</label>
              <input
                type="text"
                name="turn_around_time"
                value={formData.turn_around_time}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. 4-6 weeks"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factory Type</label>
              <input
                type="text"
                name="factory_type"
                value={formData.factory_type}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. CMT, Full Package"
              />
            </div>

             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Machinery Details</label>
              <textarea
                name="machinery_details"
                value={formData.machinery_details}
                onChange={handleChange}
                rows={2}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="List key machinery..."
              />
            </div>
          </div>
        </section>

        {/* Section: Marketing & Compliance */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2">3</span>
            Marketing & Compliance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. Sustainable, Cotton, Jersey"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Comma separated keywords for search.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialities <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="specialities"
                value={formData.specialities}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. High-end embroidery, Denim wash"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Promotional Offer</label>
              <input
                type="text"
                name="promotional_offer"
                value={formData.promotional_offer}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. 5% discount on first order"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
              <input
                type="text"
                name="certifications"
                value={formData.certifications}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                placeholder="e.g. ISO 9001, SA8000, GOTS"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple certifications with commas.</p>
            </div>
          </div>
        </section>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white transition-colors duration-200 ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing Factory...
              </span>
            ) : (
              'Save & Publish Factory'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}