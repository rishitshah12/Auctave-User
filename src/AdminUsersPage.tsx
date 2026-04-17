import React, { useState, useEffect, FC, useRef, useCallback, useMemo } from 'react';
import {
    Search, Filter, Users, Globe, TrendingUp, Edit2, Trash2, X, Plus,
    Mail, Phone, MapPin, Briefcase, DollarSign, Tag, ChevronDown,
    RefreshCw, User, Building2, Hash, Calendar, Check
} from 'lucide-react';
import { MainLayout } from './MainLayout';
import { userService } from './user.service';

interface AdminUsersPageProps {
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

// ─── Country flag map ─────────────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
    'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Andorra': '🇦🇩',
    'Angola': '🇦🇴', 'Argentina': '🇦🇷', 'Armenia': '🇦🇲', 'Australia': '🇦🇺',
    'Austria': '🇦🇹', 'Azerbaijan': '🇦🇿', 'Bahamas': '🇧🇸', 'Bahrain': '🇧🇭',
    'Bangladesh': '🇧🇩', 'Barbados': '🇧🇧', 'Belarus': '🇧🇾', 'Belgium': '🇧🇪',
    'Belize': '🇧🇿', 'Benin': '🇧🇯', 'Bhutan': '🇧🇹', 'Bolivia': '🇧🇴',
    'Bosnia and Herzegovina': '🇧🇦', 'Botswana': '🇧🇼', 'Brazil': '🇧🇷',
    'Brunei': '🇧🇳', 'Bulgaria': '🇧🇬', 'Burkina Faso': '🇧🇫', 'Burundi': '🇧🇮',
    'Cambodia': '🇰🇭', 'Cameroon': '🇨🇲', 'Canada': '🇨🇦', 'Chad': '🇹🇩',
    'Chile': '🇨🇱', 'China': '🇨🇳', 'Colombia': '🇨🇴', 'Congo': '🇨🇬',
    'Costa Rica': '🇨🇷', 'Croatia': '🇭🇷', 'Cuba': '🇨🇺', 'Cyprus': '🇨🇾',
    'Czech Republic': '🇨🇿', 'DR Congo': '🇨🇩', 'Denmark': '🇩🇰',
    'Dominican Republic': '🇩🇴', 'Ecuador': '🇪🇨', 'Egypt': '🇪🇬',
    'El Salvador': '🇸🇻', 'Estonia': '🇪🇪', 'Ethiopia': '🇪🇹', 'Fiji': '🇫🇯',
    'Finland': '🇫🇮', 'France': '🇫🇷', 'Georgia': '🇬🇪', 'Germany': '🇩🇪',
    'Ghana': '🇬🇭', 'Greece': '🇬🇷', 'Guatemala': '🇬🇹', 'Haiti': '🇭🇹',
    'Honduras': '🇭🇳', 'Hungary': '🇭🇺', 'Iceland': '🇮🇸', 'India': '🇮🇳',
    'Indonesia': '🇮🇩', 'Iran': '🇮🇷', 'Iraq': '🇮🇶', 'Ireland': '🇮🇪',
    'Israel': '🇮🇱', 'Italy': '🇮🇹', 'Jamaica': '🇯🇲', 'Japan': '🇯🇵',
    'Jordan': '🇯🇴', 'Kazakhstan': '🇰🇿', 'Kenya': '🇰🇪', 'Kuwait': '🇰🇼',
    'Kyrgyzstan': '🇰🇬', 'Laos': '🇱🇦', 'Latvia': '🇱🇻', 'Lebanon': '🇱🇧',
    'Libya': '🇱🇾', 'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺', 'Malaysia': '🇲🇾',
    'Maldives': '🇲🇻', 'Mali': '🇲🇱', 'Malta': '🇲🇹', 'Mauritius': '🇲🇺',
    'Mexico': '🇲🇽', 'Moldova': '🇲🇩', 'Monaco': '🇲🇨', 'Mongolia': '🇲🇳',
    'Morocco': '🇲🇦', 'Mozambique': '🇲🇿', 'Myanmar': '🇲🇲', 'Namibia': '🇳🇦',
    'Nepal': '🇳🇵', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Nicaragua': '🇳🇮',
    'Nigeria': '🇳🇬', 'North Korea': '🇰🇵', 'Norway': '🇳🇴', 'Oman': '🇴🇲',
    'Pakistan': '🇵🇰', 'Palestine': '🇵🇸', 'Panama': '🇵🇦', 'Paraguay': '🇵🇾',
    'Peru': '🇵🇪', 'Philippines': '🇵🇭', 'Poland': '🇵🇱', 'Portugal': '🇵🇹',
    'Qatar': '🇶🇦', 'Romania': '🇷🇴', 'Russia': '🇷🇺', 'Rwanda': '🇷🇼',
    'Saudi Arabia': '🇸🇦', 'Senegal': '🇸🇳', 'Serbia': '🇷🇸', 'Singapore': '🇸🇬',
    'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Somalia': '🇸🇴', 'South Africa': '🇿🇦',
    'South Korea': '🇰🇷', 'South Sudan': '🇸🇸', 'Spain': '🇪🇸', 'Sri Lanka': '🇱🇰',
    'Sudan': '🇸🇩', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Syria': '🇸🇾',
    'Taiwan': '🇹🇼', 'Tanzania': '🇹🇿', 'Thailand': '🇹🇭', 'Togo': '🇹🇬',
    'Tunisia': '🇹🇳', 'Turkey': '🇹🇷', 'Turkmenistan': '🇹🇲', 'Uganda': '🇺🇬',
    'Ukraine': '🇺🇦', 'United Arab Emirates': '🇦🇪', 'United Kingdom': '🇬🇧',
    'United States of America': '🇺🇸', 'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿',
    'Venezuela': '🇻🇪', 'Vietnam': '🇻🇳', 'Yemen': '🇾🇪', 'Zambia': '🇿🇲',
    'Zimbabwe': '🇿🇼',
};

const COUNTRIES = Object.keys(COUNTRY_FLAGS).sort();

// ─── Customer ID generation ───────────────────────────────────────────────────
// Format: CLT-YYMM-XXXX
// YYMM  = year+month the account was created (or first seen)
// XXXX  = first 4 hex chars of the user UUID (uppercase), guarantees uniqueness
function generateCustomerId(userId: string, createdAt?: string): string {
    const date = createdAt ? new Date(createdAt) : new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const hex = userId.replace(/-/g, '').slice(0, 4).toUpperCase();
    return `CLT-${yy}${mm}-${hex}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name?: string, email?: string): string {
    if (name) {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    }
    return (email || '?').slice(0, 2).toUpperCase();
}

function getAvatarColor(userId: string): string {
    const colors = [
        'from-purple-500 to-indigo-500', 'from-blue-500 to-cyan-500',
        'from-emerald-500 to-teal-500', 'from-orange-500 to-amber-500',
        'from-pink-500 to-rose-500', 'from-violet-500 to-purple-500',
    ];
    const idx = parseInt(userId.slice(-2), 16) % colors.length;
    return colors[idx];
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AdminUsersPage: FC<AdminUsersPageProps> = (props) => {
    const CACHE_KEY = 'garment_erp_admin_users';

    const [clients, setClients] = useState<any[]>(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem(CACHE_KEY));
    const [editingClient, setEditingClient] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [countryFilter, setCountryFilter] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [savingId, setSavingId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if ((window as any).showToast) (window as any).showToast(message, type);
    };

    const fetchClients = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        const hasCache = !!sessionStorage.getItem(CACHE_KEY);
        if (!hasCache) setIsLoading(true);

        let attempts = 0;
        while (attempts < 3) {
            try {
                if (signal.aborted) return;
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 15000)
                );
                const { data, error } = await Promise.race([
                    userService.getAll(),
                    timeoutPromise,
                ]) as any;
                if (error) throw error;
                if (!signal.aborted) {
                    setClients(data || []);
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
        fetchClients();
        return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, []);

    // ─── Ensure every client has a customer_id stored ──────────────────────
    useEffect(() => {
        clients.forEach(async (client) => {
            if (!client.customer_id) {
                const newId = generateCustomerId(client.id, client.created_at || client.updated_at);
                await userService.update(client.id, { customer_id: newId });
                setClients(prev =>
                    prev.map(c => c.id === client.id ? { ...c, customer_id: newId } : c)
                );
            }
        });
    }, [clients.length]);

    // ─── Derived stats ────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const countries = new Set(clients.map(c => c.country).filter(Boolean));
        const withProfile = clients.filter(c => c.name && c.company_name).length;
        return { total: clients.length, countries: countries.size, withProfile };
    }, [clients]);

    const uniqueCountries = useMemo(() => {
        return Array.from(new Set(clients.map(c => c.country).filter(Boolean))).sort();
    }, [clients]);

    // ─── Filtered list ────────────────────────────────────────────────────────
    const filteredClients = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return clients.filter(c => {
            const matchesSearch = !q || [c.name, c.email, c.company_name, c.customer_id, c.phone]
                .some(f => (f || '').toLowerCase().includes(q));
            const matchesCountry = !countryFilter || c.country === countryFilter;
            return matchesSearch && matchesCountry;
        });
    }, [clients, searchQuery, countryFilter]);

    // ─── Edit handlers ────────────────────────────────────────────────────────
    const handleEditClick = (client: any) => {
        setEditingClient({ ...client });
        setEditTags(
            (client.category_specialization || '').split(',').map((t: string) => t.trim()).filter(Boolean)
        );
        setTagInput('');
        setIsEditModalOpen(true);
    };

    const handleAddTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !editTags.includes(trimmed)) {
            const newTags = [...editTags, trimmed];
            setEditTags(newTags);
            setEditingClient((p: any) => ({ ...p, category_specialization: newTags.join(', ') }));
        }
        setTagInput('');
    };

    const handleRemoveTag = (tag: string) => {
        const newTags = editTags.filter(t => t !== tag);
        setEditTags(newTags);
        setEditingClient((p: any) => ({ ...p, category_specialization: newTags.join(', ') }));
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient) return;
        setSavingId(editingClient.id);

        const customerId = editingClient.customer_id ||
            generateCustomerId(editingClient.id, editingClient.created_at);

        const updates = {
            name: editingClient.name,
            company_name: editingClient.company_name,
            phone: editingClient.phone,
            country: editingClient.country,
            job_role: editingClient.job_role,
            category_specialization: editingClient.category_specialization,
            yearly_est_revenue: editingClient.yearly_est_revenue,
            customer_id: customerId,
            updated_at: new Date().toISOString(),
        };

        const { error } = await userService.update(editingClient.id, updates);
        setSavingId(null);

        if (error) {
            showToast('Failed to update client: ' + error.message, 'error');
        } else {
            setClients(prev =>
                prev.map(c => c.id === editingClient.id ? { ...c, ...updates } : c)
            );
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(
                clients.map(c => c.id === editingClient.id ? { ...c, ...updates } : c)
            ));
            setIsEditModalOpen(false);
            showToast('Client updated successfully');
        }
    };

    const handleDeleteClient = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;

        const { error: funcError } = await props.supabase.functions.invoke('delete-user', {
            body: { userId: id },
        });

        if (funcError) {
            console.warn('Edge function delete failed, falling back to direct DB delete.', funcError);
            const { error } = await userService.delete(id);
            if (error) {
                if (error.message?.includes('violates foreign key constraint') ||
                    error.message?.includes('Database error deleting user')) {
                    showToast('Cannot delete user: They have active orders or related data. Please delete those first.', 'error');
                } else {
                    showToast('Failed to delete client: ' + error.message, 'error');
                }
            } else {
                setClients(prev => prev.filter(c => c.id !== id));
                showToast('Client profile deleted (Auth account may remain if Edge Function failed)');
            }
        } else {
            setClients(prev => prev.filter(c => c.id !== id));
            showToast('Client deleted successfully');
        }
    };

    const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition';
    const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';

    return (
        <MainLayout {...props}>
            <div className="space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                            User Management
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Manage client accounts, profiles and permissions
                        </p>
                    </div>
                    <button
                        onClick={() => { sessionStorage.removeItem(CACHE_KEY); fetchClients(); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition self-start sm:self-auto"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[
                        { icon: Users, label: 'Total Clients', value: stats.total, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                        { icon: Globe, label: 'Countries', value: stats.countries, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { icon: TrendingUp, label: 'Complete Profiles', value: stats.withProfile, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    ].map(({ icon: Icon, label, value, color, bg }) => (
                        <div key={label} className="bg-white dark:bg-gray-900/40 backdrop-blur-sm border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`${bg} p-1.5 rounded-lg`}>
                                    <Icon size={14} className={color} />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{label}</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 sm:hidden mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Filter bar ── */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, company or ID…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-gray-900/40 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="relative sm:w-56">
                        <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={countryFilter}
                            onChange={e => setCountryFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-gray-900/40 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none shadow-sm"
                        >
                            <option value="">All Countries</option>
                            {uniqueCountries.map(c => (
                                <option key={c} value={c}>
                                    {COUNTRY_FLAGS[c] ? `${COUNTRY_FLAGS[c]} ` : ''}{c}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {(searchQuery || countryFilter) && (
                        <button
                            onClick={() => { setSearchQuery(''); setCountryFilter(''); }}
                            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-gray-900/40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                            <X size={13} /> Clear
                        </button>
                    )}
                </div>

                {/* ── Results summary ── */}
                {(searchQuery || countryFilter) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Showing {filteredClients.length} of {clients.length} clients
                        {countryFilter && ` in ${COUNTRY_FLAGS[countryFilter] || ''} ${countryFilter}`}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                )}

                {/* ── Card grid ── */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white dark:bg-gray-900/40 rounded-2xl p-5 border border-gray-100 dark:border-white/10 animate-pulse">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-white/10">
                        <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No clients found</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            {searchQuery || countryFilter ? 'Try adjusting your filters' : 'No users have registered yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredClients.map(client => {
                            const customerId = client.customer_id ||
                                generateCustomerId(client.id, client.created_at);
                            const tags = (client.category_specialization || '')
                                .split(',').map((t: string) => t.trim()).filter(Boolean);
                            const flag = COUNTRY_FLAGS[client.country] || '';

                            return (
                                <div
                                    key={client.id}
                                    className="group bg-white dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-500/30 transition-all duration-200 overflow-hidden"
                                >
                                    {/* Card header / avatar strip */}
                                    <div className="relative px-5 pt-5 pb-4">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className="relative flex-shrink-0">
                                                {client.avatar_url ? (
                                                    <img
                                                        src={client.avatar_url}
                                                        alt={client.name}
                                                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white dark:ring-gray-800 shadow"
                                                    />
                                                ) : (
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(client.id)} flex items-center justify-center text-white font-bold text-lg shadow`}>
                                                        {getInitials(client.name, client.email)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name + ID */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base leading-tight">
                                                    {client.name || <span className="text-gray-400 italic">No name</span>}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    {client.company_name || <span className="italic text-gray-300 dark:text-gray-600">No company</span>}
                                                </p>
                                                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-mono font-medium">
                                                    <Hash size={10} />
                                                    {customerId}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditClick(client)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClient(client.id)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-gray-100 dark:bg-white/5 mx-5" />

                                    {/* Details */}
                                    <div className="px-5 py-4 space-y-2.5">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <Mail size={13} className="text-gray-400 flex-shrink-0" />
                                            <span className="truncate">{client.email || '—'}</span>
                                        </div>
                                        {client.phone && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <Phone size={13} className="text-gray-400 flex-shrink-0" />
                                                <span>{client.phone}</span>
                                            </div>
                                        )}
                                        {client.country && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                                                <span>{flag} {client.country}</span>
                                            </div>
                                        )}
                                        {client.job_role && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <Briefcase size={13} className="text-gray-400 flex-shrink-0" />
                                                <span className="truncate">{client.job_role}</span>
                                            </div>
                                        )}
                                        {client.yearly_est_revenue && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <DollarSign size={13} className="text-gray-400 flex-shrink-0" />
                                                <span>{client.yearly_est_revenue}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Specialization tags */}
                                    {tags.length > 0 && (
                                        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                                            {tags.slice(0, 4).map((tag: string) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {tags.length > 4 && (
                                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                                                    +{tags.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Card footer */}
                                    <div className="px-5 py-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {client.updated_at
                                                ? `Updated ${new Date(client.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                : 'No updates yet'}
                                        </span>
                                        <button
                                            onClick={() => handleEditClick(client)}
                                            className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
                                        >
                                            Edit profile
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Edit Modal ── */}
            {isEditModalOpen && editingClient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-100 dark:border-white/10">

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <div className="flex items-center gap-3">
                                {editingClient.avatar_url ? (
                                    <img src={editingClient.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                                ) : (
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(editingClient.id)} flex items-center justify-center text-white font-semibold text-sm`}>
                                        {getInitials(editingClient.name, editingClient.email)}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit Client</h2>
                                    <span className="inline-flex items-center gap-1 text-xs font-mono text-purple-600 dark:text-purple-400">
                                        <Hash size={10} />
                                        {editingClient.customer_id || generateCustomerId(editingClient.id, editingClient.created_at)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient} className="p-6 space-y-6">

                            {/* Section: Identity */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <User size={12} /> Identity
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Full Name</label>
                                        <input
                                            type="text"
                                            value={editingClient.name || ''}
                                            onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                                            placeholder="John Smith"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Email Address</label>
                                        <input
                                            type="email"
                                            value={editingClient.email || ''}
                                            onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
                                            placeholder="john@company.com"
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Company */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Building2 size={12} /> Company
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Company Name</label>
                                        <input
                                            type="text"
                                            value={editingClient.company_name || ''}
                                            onChange={e => setEditingClient({ ...editingClient, company_name: e.target.value })}
                                            placeholder="Acme Corp"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Job Role / Title</label>
                                        <input
                                            type="text"
                                            value={editingClient.job_role || ''}
                                            onChange={e => setEditingClient({ ...editingClient, job_role: e.target.value })}
                                            placeholder="Head of Sourcing"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Yearly Est. Revenue</label>
                                        <input
                                            type="text"
                                            value={editingClient.yearly_est_revenue || ''}
                                            onChange={e => setEditingClient({ ...editingClient, yearly_est_revenue: e.target.value })}
                                            placeholder="$1M – $5M"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Phone Number</label>
                                        <input
                                            type="tel"
                                            value={editingClient.phone || ''}
                                            onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                                            placeholder="+1 555 000 0000"
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Location */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Globe size={12} /> Location
                                </h3>
                                <div>
                                    <label className={labelCls}>Country</label>
                                    <div className="relative">
                                        <select
                                            value={editingClient.country || ''}
                                            onChange={e => setEditingClient({ ...editingClient, country: e.target.value })}
                                            className={inputCls + ' pr-8 appearance-none'}
                                        >
                                            <option value="">Select country…</option>
                                            {COUNTRIES.map(c => (
                                                <option key={c} value={c}>
                                                    {COUNTRY_FLAGS[c] ? `${COUNTRY_FLAGS[c]} ` : ''}{c}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Specialization */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Tag size={12} /> Category Specialization
                                </h3>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                                        placeholder="e.g. Knitwear, Denim, Activewear…"
                                        className={inputCls + ' flex-1'}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
                                    >
                                        <Plus size={14} /> Add
                                    </button>
                                </div>
                                {editTags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {editTags.map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm rounded-full"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section: Profile picture (read-only) */}
                            {editingClient.avatar_url && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <User size={12} /> Profile Picture
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={editingClient.avatar_url}
                                            alt="Profile"
                                            className="w-20 h-20 rounded-2xl object-cover border border-gray-200 dark:border-white/10 shadow"
                                        />
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            Profile picture is managed by the client from their profile page.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Section: System info (read-only) */}
                            <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Hash size={12} /> System Info
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-xs text-gray-400 block mb-0.5">Customer ID</span>
                                        <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                                            {editingClient.customer_id || generateCustomerId(editingClient.id, editingClient.created_at)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-400 block mb-0.5">Auth UUID</span>
                                        <span className="font-mono text-gray-500 dark:text-gray-400 text-xs break-all">
                                            {editingClient.id}
                                        </span>
                                    </div>
                                    {editingClient.updated_at && (
                                        <div>
                                            <span className="text-xs text-gray-400 block mb-0.5">Last Updated</span>
                                            <span className="text-gray-600 dark:text-gray-300">
                                                {new Date(editingClient.updated_at).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingId === editingClient.id}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition shadow-sm"
                                >
                                    {savingId === editingClient.id ? (
                                        <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                                    ) : (
                                        <><Check size={14} /> Save Changes</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
