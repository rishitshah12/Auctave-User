import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import {
  Building2, MapPin, Factory, ClipboardList, Megaphone,
  ChevronRight, ChevronLeft, Check, X, Loader2, Sparkles,
  PackageCheck, Clock, Tag, Award, Wrench, BarChart3
} from 'lucide-react';

interface FactoryFormData {
  factory_name: string;
  country: string;
  state: string;
  city: string;
  turn_around_time: string;
  moq: string;
  promotional_offer: string;
  tags: string[];
  description: string;
  factory_type: string;
  production_capacity: string;
  certifications: string[];
  machinery_details: string;
  specialities: string[];
}

const INITIAL_DATA: FactoryFormData = {
  factory_name: '',
  country: '',
  state: '',
  city: '',
  turn_around_time: '',
  moq: '',
  promotional_offer: '',
  tags: [],
  description: '',
  factory_type: '',
  production_capacity: '',
  certifications: [],
  machinery_details: '',
  specialities: [],
};

const STEPS = [
  { label: 'Basic Info', icon: Building2, description: 'Name & location' },
  { label: 'Production', icon: ClipboardList, description: 'Capacity & details' },
  { label: 'Marketing', icon: Megaphone, description: 'Tags & compliance' },
];

const SPECIALTY_SUGGESTIONS = [
  'T-Shirts', 'Polo Shirts', 'Hoodies', 'Jackets', 'Jeans',
  'Trousers', 'Dresses', 'Activewear', 'Denim', 'Knitwear',
];

const CERT_SUGGESTIONS = [
  'ISO 9001', 'SA8000', 'GOTS', 'OEKO-TEX', 'BSCI', 'WRAP', 'Sedex',
];

const FACTORY_TYPES = [
  'CMT (Cut, Make, Trim)',
  'Full Package',
  'OEM',
  'ODM',
  'Vertical Mill',
];

// --- Chip Input Component ---
function ChipInput({
  label,
  values,
  placeholder,
  onAdd,
  onRemove,
  suggestions,
  icon: Icon,
  required,
}: {
  label: string;
  values: string[];
  placeholder: string;
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  suggestions?: string[];
  icon?: React.FC<{ size?: number; className?: string }>;
  required?: boolean;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.trim();
      if (val && !values.includes(val)) {
        onAdd(val);
        setInput('');
      }
    }
  };

  const filteredSuggestions = suggestions?.filter(
    (s) => !values.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
        {Icon && <Icon size={14} className="text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {values.map((v, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-[#c20c0b] dark:text-red-300 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-lg text-sm font-medium"
            >
              {v}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="hover:text-red-700 dark:hover:text-red-200 transition-colors ml-0.5"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
      />

      {filteredSuggestions && filteredSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filteredSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAdd(s)}
              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors font-medium"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Input Field Component ---
function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  icon: Icon,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  icon?: React.FC<{ size?: number; className?: string }>;
  hint?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
        {Icon && <Icon size={14} className="text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
      />
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

// --- Main Form ---
export default function AddFactoryForm() {
  const [formData, setFormData] = useState<FactoryFormData>(INITIAL_DATA);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!formData.factory_name.trim()) return 'Factory Name is required.';
      if (!formData.country.trim()) return 'Country is required.';
    }
    if (step === 1) {
      if (!formData.moq.trim()) return 'MOQ is required.';
    }
    if (step === 2) {
      if (formData.tags.length === 0) return 'At least one tag is required.';
      if (formData.specialities.length === 0) return 'At least one specialty is required.';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = {
        ...formData,
        certifications: formData.certifications,
        tags: formData.tags.join(', '),
        specialities: formData.specialities.join(', '),
        status: 'published',
        created_by: session?.user?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { error: supabaseError } = await supabase
        .from('factories')
        .insert([payload]);

      if (supabaseError) throw supabaseError;

      setSuccess(true);
      setFormData(INITIAL_DATA);
      setCurrentStep(0);
    } catch (err: any) {
      console.error('Error saving factory:', err);
      setError(err.message || 'Failed to save factory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c20c0b] to-[#e74c3c] text-white mb-4 shadow-lg">
          <Factory size={28} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Add New Factory
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Complete each step to publish a new factory profile.
        </p>
      </div>

      {/* Stepper */}
      <div className="relative mb-10">
        <div className="flex items-center justify-between relative">
          {/* Track */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-[#c20c0b] transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            const StepIcon = step.icon;

            return (
              <div
                key={idx}
                className="flex flex-col items-center z-10 cursor-pointer group"
                onClick={() => {
                  if (idx < currentStep) {
                    setError(null);
                    setCurrentStep(idx);
                  }
                }}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 shadow-sm ${
                    isActive
                      ? 'bg-[#c20c0b] border-[#c20c0b] text-white scale-110 shadow-lg shadow-red-200 dark:shadow-red-900/30'
                      : isCompleted
                      ? 'bg-[#c20c0b] border-[#c20c0b] text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 group-hover:border-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <StepIcon size={16} />
                  )}
                </div>
                <span
                  className={`text-xs font-bold mt-2 uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'text-[#c20c0b]'
                      : isCompleted
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">
                  {step.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl mb-6 animate-[shake_0.3s_ease-in-out]">
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-800/30 rounded-lg flex items-center justify-center">
            <X size={16} />
          </div>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex flex-col items-center py-16 text-center animate-[fadeIn_0.5s_ease-out]">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <Check size={40} className="text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Factory Published!
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            The factory is now live on the sourcing page and visible to all clients.
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-8 px-6 py-2.5 bg-[#c20c0b] text-white rounded-xl font-semibold hover:bg-[#a50a09] transition-colors"
          >
            Add Another Factory
          </button>
        </div>
      )}

      {/* Form Steps */}
      {!success && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 md:p-8 min-h-[360px]">
            {/* Step 1: Basic Info */}
            {currentStep === 0 && (
              <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={18} className="text-[#c20c0b]" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Basic Information
                  </h3>
                </div>
                <p className="text-sm text-gray-400 -mt-3 mb-2">
                  Tell us about the factory and where it's located.
                </p>

                <InputField
                  label="Factory Name"
                  name="factory_name"
                  value={formData.factory_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Garments Ltd."
                  required
                  icon={Building2}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InputField
                    label="Country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="e.g. Bangladesh"
                    required
                    icon={MapPin}
                  />
                  <InputField
                    label="State / Province"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g. Dhaka Division"
                  />
                  <InputField
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Dhaka"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent outline-none transition-all placeholder:text-gray-400 resize-none"
                    placeholder="Brief description of the factory's history and values..."
                  />
                </div>
              </div>
            )}

            {/* Step 2: Production Details */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList size={18} className="text-[#c20c0b]" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Production Details
                  </h3>
                </div>
                <p className="text-sm text-gray-400 -mt-3 mb-2">
                  Capacity, machinery, and lead times.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="MOQ (Minimum Order Quantity)"
                    name="moq"
                    value={formData.moq}
                    onChange={handleChange}
                    placeholder="e.g. 500 pcs"
                    required
                    icon={PackageCheck}
                  />
                  <InputField
                    label="Production Capacity"
                    name="production_capacity"
                    value={formData.production_capacity}
                    onChange={handleChange}
                    placeholder="e.g. 50,000 pcs/month"
                    icon={BarChart3}
                  />
                  <InputField
                    label="Turnaround Time"
                    name="turn_around_time"
                    value={formData.turn_around_time}
                    onChange={handleChange}
                    placeholder="e.g. 4-6 weeks"
                    icon={Clock}
                  />
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      <Factory size={14} className="text-gray-400" />
                      Factory Type
                    </label>
                    <select
                      name="factory_type"
                      value={formData.factory_type}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select type...</option>
                      {FACTORY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <Wrench size={14} className="text-gray-400" />
                    Machinery Details
                  </label>
                  <textarea
                    name="machinery_details"
                    value={formData.machinery_details}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c20c0b] focus:border-transparent outline-none transition-all placeholder:text-gray-400 resize-none"
                    placeholder="e.g. 200 single-needle lockstitch, 50 overlock, 20 flatlock..."
                  />
                </div>
              </div>
            )}

            {/* Step 3: Marketing & Compliance */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone size={18} className="text-[#c20c0b]" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Marketing & Compliance
                  </h3>
                </div>
                <p className="text-sm text-gray-400 -mt-3 mb-2">
                  Tags, specialties, and certifications help clients discover your factory.
                </p>

                <ChipInput
                  label="Tags"
                  values={formData.tags}
                  placeholder="Type and press Enter..."
                  onAdd={(v) =>
                    setFormData((prev) => ({ ...prev, tags: [...prev.tags, v] }))
                  }
                  onRemove={(i) =>
                    setFormData((prev) => ({
                      ...prev,
                      tags: prev.tags.filter((_, idx) => idx !== i),
                    }))
                  }
                  icon={Tag}
                  required
                />

                <ChipInput
                  label="Specialties"
                  values={formData.specialities}
                  placeholder="Type and press Enter..."
                  onAdd={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      specialities: [...prev.specialities, v],
                    }))
                  }
                  onRemove={(i) =>
                    setFormData((prev) => ({
                      ...prev,
                      specialities: prev.specialities.filter((_, idx) => idx !== i),
                    }))
                  }
                  suggestions={SPECIALTY_SUGGESTIONS}
                  icon={Sparkles}
                  required
                />

                <ChipInput
                  label="Certifications"
                  values={formData.certifications}
                  placeholder="Type and press Enter..."
                  onAdd={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      certifications: [...prev.certifications, v],
                    }))
                  }
                  onRemove={(i) =>
                    setFormData((prev) => ({
                      ...prev,
                      certifications: prev.certifications.filter(
                        (_, idx) => idx !== i
                      ),
                    }))
                  }
                  suggestions={CERT_SUGGESTIONS}
                  icon={Award}
                />

                <InputField
                  label="Promotional Offer"
                  name="promotional_offer"
                  value={formData.promotional_offer}
                  onChange={handleChange}
                  placeholder="e.g. 5% discount on first order"
                  hint="Optional banner shown on the factory card."
                />
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                currentStep === 0
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <ChevronLeft size={18} />
              Back
            </button>

            <div className="flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-6 bg-[#c20c0b]'
                      : idx < currentStep
                      ? 'w-1.5 bg-[#c20c0b]/40'
                      : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {isLastStep ? (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#c20c0b] text-white rounded-xl font-semibold hover:bg-[#a50a09] transition-all shadow-lg shadow-red-200 dark:shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    Publish Factory
                    <Check size={18} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#c20c0b] text-white rounded-xl font-semibold hover:bg-[#a50a09] transition-all shadow-lg shadow-red-200 dark:shadow-red-900/20"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
