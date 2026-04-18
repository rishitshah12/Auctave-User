import React, { useState, useEffect, FC, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Search, Filter, Users, Globe, TrendingUp, Edit2, Trash2, X, Plus,
    Mail, Phone, MapPin, Briefcase, DollarSign, Tag, ChevronDown,
    RefreshCw, User, Building2, Hash, Calendar, Check, SlidersHorizontal,
    CircleCheck, CircleX, ChevronUp, Lock, KeyRound, ShieldCheck, ShieldOff,
    AlertTriangle, Send, ImageOff, Eye, Ban, ShieldAlert, UserCheck,
    FileText, Package, Receipt, FolderOpen, ExternalLink, Clock,
    ChevronRight, LayoutDashboard, ArrowLeft
} from 'lucide-react';
import { MainLayout } from './MainLayout';
import { userService } from './user.service';
import { quoteService } from './quote.service';
import { crmService } from './crm.service';

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

// ─── Small helpers ────────────────────────────────────────────────────────────
const QUOTE_STATUS_COLORS: Record<string, string> = {
    'Pending':        'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'Responded':      'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'Accepted':       'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    'Admin Accepted': 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    'Client Accepted':'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    'In Negotiation': 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    'Declined':       'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    'Trashed':        'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    'Draft':          'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};
const QuoteStatusBadge: FC<{ status: string }> = ({ status }) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${QUOTE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
        {status}
    </span>
);

const ORDER_STATUS_COLORS: Record<string, string> = {
    'Pending':        'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'In Production':  'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'Quality Check':  'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    'Shipped':        'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    'Completed':      'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
};
const OrderStatusBadge: FC<{ status?: string }> = ({ status }) => (
    status ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${ORDER_STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span> : null
);

const DrawerLoader: FC<{ rows?: number }> = ({ rows = 3 }) => (
    <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-20" />
        ))}
    </div>
);

const DrawerEmpty: FC<{ icon: FC<any>; label: string }> = ({ icon: Icon, label }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icon size={36} className="text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-400 dark:text-gray-500">{label}</p>
    </div>
);

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
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [jobRoleFilter, setJobRoleFilter] = useState('');
    const [revenueFilter, setRevenueFilter] = useState('');
    const [profileFilter, setProfileFilter] = useState<'' | 'complete' | 'incomplete'>('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [savingId, setSavingId] = useState<string | null>(null);
    // Security / access state
    const [showChangeEmail, setShowChangeEmail] = useState(false);
    const [newEmailValue, setNewEmailValue] = useState('');
    const [isEmailChanging, setIsEmailChanging] = useState(false);
    const [isPasswordResetting, setIsPasswordResetting] = useState(false);
    // Confirmation dialog for destructive actions
    const [confirmDialog, setConfirmDialog] = useState<{
        type: 'delete' | 'suspend' | 'unsuspend';
        client: any;
    } | null>(null);
    const [isConfirmLoading, setIsConfirmLoading] = useState(false);
    // Profile drawer
    const [drawerClient, setDrawerClient] = useState<any>(null);
    const [drawerTab, setDrawerTab] = useState<'overview' | 'quotes' | 'orders' | 'documents'>('overview');
    const [drawerQuotes, setDrawerQuotes] = useState<any[]>([]);
    const [drawerOrders, setDrawerOrders] = useState<any[]>([]);
    const [drawerLoadingQuotes, setDrawerLoadingQuotes] = useState(false);
    const [drawerLoadingOrders, setDrawerLoadingOrders] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const savedScrollY = useRef(0);

    // Lock body scroll whenever any modal/drawer is open, restore position on close
    useEffect(() => {
        const anyOpen = isEditModalOpen || !!confirmDialog || !!drawerClient;
        if (anyOpen) {
            savedScrollY.current = window.scrollY;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            // Restore scroll position in case browser reset it
            if (savedScrollY.current > 0) {
                requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));
            }
        }
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        };
    }, [isEditModalOpen, confirmDialog, drawerClient]);

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

    const uniqueCountries = useMemo(() =>
        Array.from(new Set(clients.map(c => c.country).filter(Boolean))).sort()
    , [clients]);

    const uniqueJobRoles = useMemo(() =>
        Array.from(new Set(clients.map(c => c.job_role).filter(Boolean))).sort()
    , [clients]);

    const uniqueRevenues = useMemo(() =>
        Array.from(new Set(clients.map(c => c.yearly_est_revenue).filter(Boolean))).sort()
    , [clients]);

    // All unique specialization tags across all clients
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        clients.forEach(c => {
            (c.category_specialization || '').split(',')
                .map((t: string) => t.trim()).filter(Boolean)
                .forEach((t: string) => tagSet.add(t));
        });
        return Array.from(tagSet).sort();
    }, [clients]);

    const hasActiveFilters = countryFilter || selectedTags.length > 0 || jobRoleFilter || revenueFilter || profileFilter;

    // ─── Filtered list ─────────────────────────────────────────────────────────
    const filteredClients = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return clients.filter(c => {
            // Search: all text fields including tags and customer_id
            if (q) {
                const clientTags = (c.category_specialization || '')
                    .split(',').map((t: string) => t.trim()).join(' ');
                const haystack = [
                    c.name, c.email, c.company_name, c.customer_id,
                    c.phone, c.job_role, c.country, c.yearly_est_revenue, clientTags,
                ].map(f => (f || '').toLowerCase()).join(' ');
                if (!haystack.includes(q)) return false;
            }
            // Country filter
            if (countryFilter && c.country !== countryFilter) return false;
            // Tag filter — client must have ALL selected tags
            if (selectedTags.length > 0) {
                const clientTags = (c.category_specialization || '')
                    .split(',').map((t: string) => t.trim().toLowerCase());
                if (!selectedTags.every(st => clientTags.includes(st.toLowerCase()))) return false;
            }
            // Job role filter
            if (jobRoleFilter && c.job_role !== jobRoleFilter) return false;
            // Revenue filter
            if (revenueFilter && c.yearly_est_revenue !== revenueFilter) return false;
            // Profile completeness
            if (profileFilter === 'complete' && !(c.name && c.company_name && c.country)) return false;
            if (profileFilter === 'incomplete' && (c.name && c.company_name && c.country)) return false;
            return true;
        });
    }, [clients, searchQuery, countryFilter, selectedTags, jobRoleFilter, revenueFilter, profileFilter]);

    const clearAllFilters = () => {
        setSearchQuery('');
        setCountryFilter('');
        setSelectedTags([]);
        setJobRoleFilter('');
        setRevenueFilter('');
        setProfileFilter('');
    };

    // ─── Profile drawer ───────────────────────────────────────────────────────
    const openDrawer = async (client: any) => {
        setDrawerClient(client);
        setDrawerTab('overview');
        setDrawerQuotes([]);
        setDrawerOrders([]);
        // Prefetch quotes and orders in parallel
        setDrawerLoadingQuotes(true);
        setDrawerLoadingOrders(true);
        const [quotesRes, ordersRes] = await Promise.all([
            quoteService.getQuotesByUser(client.id),
            crmService.getOrdersByClient(client.id),
        ]);
        setDrawerQuotes(quotesRes.data || []);
        setDrawerOrders(ordersRes.data || []);
        setDrawerLoadingQuotes(false);
        setDrawerLoadingOrders(false);
    };

    const closeDrawer = () => {
        setDrawerClient(null);
        setDrawerQuotes([]);
        setDrawerOrders([]);
    };

    // Flatten all documents from crm orders
    const drawerDocuments = useMemo(() => {
        return drawerOrders.flatMap((order: any) => {
            const docs: any[] = Array.isArray(order.documents) ? order.documents : [];
            const taskDocs = (order.tasks || [])
                .filter((t: any) => t.documentUrl)
                .map((t: any) => ({
                    name: t.documentFileName || t.name + ' document',
                    path: t.documentUrl,
                    type: 'Task document',
                    lastUpdated: t.documentUploadedAt || order.updated_at,
                    orderId: order.id,
                    orderProduct: order.product_name || order.product,
                }));
            return [...docs.map((d: any) => ({ ...d, orderId: order.id, orderProduct: order.product_name || order.product })), ...taskDocs];
        });
    }, [drawerOrders]);

    // ─── Edit handlers ────────────────────────────────────────────────────────
    const handleEditClick = (client: any) => {
        setEditingClient({ ...client });
        setEditTags(
            (client.category_specialization || '').split(',').map((t: string) => t.trim()).filter(Boolean)
        );
        setTagInput('');
        setShowChangeEmail(false);
        setNewEmailValue('');
        setIsEditModalOpen(true);
    };

    // ─── Force password reset ──────────────────────────────────────────────────
    const handleForcePasswordReset = async () => {
        if (!editingClient?.email) return;
        if (!window.confirm(`Send a password reset email to ${editingClient.email}? The user will receive a link to set a new password.`)) return;
        setIsPasswordResetting(true);
        try {
            const { error } = await props.supabase.auth.resetPasswordForEmail(
                editingClient.email,
                { redirectTo: `${window.location.origin}/reset-password` }
            );
            if (error) throw error;
            showToast(`Password reset email sent to ${editingClient.email}`);
        } catch (err: any) {
            showToast('Failed to send reset email: ' + err.message, 'error');
        } finally {
            setIsPasswordResetting(false);
        }
    };

    // ─── Change email (admin-initiated, requires user confirmation) ────────────
    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newEmailValue.trim().toLowerCase();
        if (!trimmed || !editingClient) return;
        if (trimmed === (editingClient.email || '').toLowerCase()) {
            showToast('New email is the same as the current one.', 'error');
            return;
        }
        setIsEmailChanging(true);
        try {
            // Try via Edge Function first (requires service-role key)
            const { error: fnError } = await props.supabase.functions.invoke('update-user-email', {
                body: { userId: editingClient.id, newEmail: trimmed },
            });
            if (fnError) {
                // Fallback: admin updateUserById if available
                const { error: adminError } = await props.supabase.auth.admin.updateUserById(
                    editingClient.id, { email: trimmed }
                );
                if (adminError) throw adminError;
            }
            // Update local state
            setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, email: trimmed } : c));
            setEditingClient((p: any) => ({ ...p, email: trimmed }));
            setShowChangeEmail(false);
            setNewEmailValue('');
            showToast(`Email updated to ${trimmed}. A confirmation was sent to the user.`);
        } catch (err: any) {
            showToast('Failed to change email: ' + err.message, 'error');
        } finally {
            setIsEmailChanging(false);
        }
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

    // ─── Confirm dialog executor ───────────────────────────────────────────────
    const handleConfirmAction = async () => {
        if (!confirmDialog) return;
        const { type, client } = confirmDialog;
        setIsConfirmLoading(true);

        try {
            if (type === 'delete') {
                const { error: funcError } = await props.supabase.functions.invoke('delete-user', {
                    body: { userId: client.id },
                });
                if (funcError) {
                    // Edge Function failed — attempt direct DB delete (profile only)
                    console.warn('delete-user Edge Function failed:', funcError.message);
                    const { error: dbError } = await userService.delete(client.id);
                    if (dbError) {
                        if (dbError.message?.includes('violates foreign key constraint')) {
                            showToast('Cannot delete: user has active orders. Remove those first.', 'error');
                        } else {
                            showToast('Failed to delete: ' + dbError.message, 'error');
                        }
                        return;
                    }
                    showToast('Profile deleted. Auth account removal requires the delete-user Edge Function to be deployed.', 'error');
                } else {
                    showToast(`${client.name || client.email} deleted permanently.`);
                }
                setClients(prev => prev.filter(c => c.id !== client.id));
                if (isEditModalOpen && editingClient?.id === client.id) setIsEditModalOpen(false);

            } else if (type === 'suspend' || type === 'unsuspend') {
                const action = type === 'suspend' ? 'suspend' : 'unsuspend';
                const { error: funcError } = await props.supabase.functions.invoke('manage-user', {
                    body: { userId: client.id, action },
                });
                if (funcError) {
                    // Fallback: update status in DB only (won't block auth login, but reflects in UI)
                    console.warn('manage-user Edge Function failed, updating DB status only:', funcError.message);
                    const { error: dbError } = await userService.update(client.id, {
                        status: action === 'suspend' ? 'suspended' : 'active',
                    });
                    if (dbError) {
                        showToast('Failed to update account status: ' + dbError.message, 'error');
                        return;
                    }
                    showToast(
                        action === 'suspend'
                            ? 'Account marked suspended in DB. Full auth block requires the manage-user Edge Function.'
                            : 'Account reactivated in DB.',
                        action === 'suspend' ? 'error' : 'success'
                    );
                } else {
                    showToast(
                        action === 'suspend'
                            ? `${client.name || client.email} has been suspended. They cannot log in until reinstated.`
                            : `${client.name || client.email} has been reactivated. They can now log in again.`
                    );
                }
                const newStatus = action === 'suspend' ? 'suspended' : 'active';
                setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: newStatus } : c));
                if (editingClient?.id === client.id) setEditingClient((p: any) => ({ ...p, status: newStatus }));
            }
        } finally {
            setIsConfirmLoading(false);
            setConfirmDialog(null);
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

                {/* ── Search + filter bar ── */}
                <div className="bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                    {/* Primary row */}
                    <div className="flex flex-col sm:flex-row gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/10">
                        {/* Search input */}
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search name, email, company, ID, tags, country…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        {/* Country dropdown */}
                        <div className="relative sm:w-52">
                            <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={countryFilter}
                                onChange={e => setCountryFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-3 text-sm bg-transparent text-gray-900 dark:text-white appearance-none focus:outline-none cursor-pointer"
                            >
                                <option value="">All Countries</option>
                                {uniqueCountries.map(c => (
                                    <option key={c} value={c}>
                                        {COUNTRY_FLAGS[c] ? `${COUNTRY_FLAGS[c]} ` : ''}{c}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {/* Advanced toggle */}
                        <button
                            onClick={() => setShowAdvanced(v => !v)}
                            className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${showAdvanced || hasActiveFilters ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <SlidersHorizontal size={14} />
                            <span className="hidden sm:inline">Filters</span>
                            {hasActiveFilters && (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                                    {[countryFilter, jobRoleFilter, revenueFilter, profileFilter].filter(Boolean).length + selectedTags.length}
                                </span>
                            )}
                            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                    </div>

                    {/* Advanced filters panel */}
                    {showAdvanced && (
                        <div className="border-t border-gray-100 dark:border-white/10 p-4 space-y-4">
                            {/* Row 1: Job role, Revenue, Profile status */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Job role */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Job Role</label>
                                    <div className="relative">
                                        <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <select
                                            value={jobRoleFilter}
                                            onChange={e => setJobRoleFilter(e.target.value)}
                                            className="w-full pl-8 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">All Roles</option>
                                            {uniqueJobRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                {/* Revenue */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Revenue Range</label>
                                    <div className="relative">
                                        <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <select
                                            value={revenueFilter}
                                            onChange={e => setRevenueFilter(e.target.value)}
                                            className="w-full pl-8 pr-7 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">All Revenues</option>
                                            {uniqueRevenues.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                {/* Profile completeness */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Profile Status</label>
                                    <div className="flex gap-2">
                                        {(['', 'complete', 'incomplete'] as const).map(v => (
                                            <button
                                                key={v}
                                                onClick={() => setProfileFilter(v)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border transition ${
                                                    profileFilter === v
                                                        ? v === 'complete'
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                                                            : v === 'incomplete'
                                                                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                                                                : 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                                                        : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {v === '' ? 'All' : v === 'complete' ? <><CircleCheck size={11} /> Done</> : <><CircleX size={11} /> Partial</>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tag filters */}
                            {allTags.length > 0 && (
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Specialization Tags {selectedTags.length > 0 && <span className="normal-case text-purple-500">({selectedTags.length} selected — must match all)</span>}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {allTags.map(tag => {
                                            const active = selectedTags.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    onClick={() => setSelectedTags(prev =>
                                                        active ? prev.filter(t => t !== tag) : [...prev, tag]
                                                    )}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                                                        active
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                                    }`}
                                                >
                                                    {active && <Check size={10} />}
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Clear all */}
                            {hasActiveFilters && (
                                <div className="flex justify-end pt-1">
                                    <button
                                        onClick={clearAllFilters}
                                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition"
                                    >
                                        <X size={12} /> Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Active filter chips + results count ── */}
                {(searchQuery || hasActiveFilters) && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {filteredClients.length} of {clients.length} clients
                        </span>
                        {searchQuery && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs">
                                <Search size={10} /> "{searchQuery}"
                                <button onClick={() => setSearchQuery('')} className="ml-0.5 text-gray-400 hover:text-gray-600"><X size={10} /></button>
                            </span>
                        )}
                        {countryFilter && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                                {COUNTRY_FLAGS[countryFilter]} {countryFilter}
                                <button onClick={() => setCountryFilter('')} className="ml-0.5 text-blue-400 hover:text-blue-600"><X size={10} /></button>
                            </span>
                        )}
                        {jobRoleFilter && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs">
                                <Briefcase size={10} /> {jobRoleFilter}
                                <button onClick={() => setJobRoleFilter('')} className="ml-0.5 text-orange-400 hover:text-orange-600"><X size={10} /></button>
                            </span>
                        )}
                        {revenueFilter && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs">
                                <DollarSign size={10} /> {revenueFilter}
                                <button onClick={() => setRevenueFilter('')} className="ml-0.5 text-emerald-400 hover:text-emerald-600"><X size={10} /></button>
                            </span>
                        )}
                        {profileFilter && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs">
                                {profileFilter === 'complete' ? <CircleCheck size={10} /> : <CircleX size={10} />}
                                {profileFilter === 'complete' ? 'Complete profiles' : 'Partial profiles'}
                                <button onClick={() => setProfileFilter('')} className="ml-0.5 text-purple-400 hover:text-purple-600"><X size={10} /></button>
                            </span>
                        )}
                        {selectedTags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs">
                                <Tag size={10} /> {tag}
                                <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} className="ml-0.5 text-indigo-400 hover:text-indigo-600"><X size={10} /></button>
                            </span>
                        ))}
                    </div>
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
                                    className="group bg-white dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-500/30 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
                                    onClick={() => openDrawer(client)}
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
                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-mono font-medium">
                                                        <Hash size={10} />
                                                        {customerId}
                                                    </span>
                                                    {client.status === 'suspended' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                                                            <Ban size={9} /> Suspended
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleEditClick(client)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDialog({
                                                        type: client.status === 'suspended' ? 'unsuspend' : 'suspend',
                                                        client,
                                                    })}
                                                    className={`p-1.5 rounded-lg transition ${
                                                        client.status === 'suspended'
                                                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                            : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                    }`}
                                                    title={client.status === 'suspended' ? 'Lift suspension' : 'Suspend account'}
                                                >
                                                    {client.status === 'suspended' ? <UserCheck size={14} /> : <Ban size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDialog({ type: 'delete', client })}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                                    title="Delete permanently"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-gray-100 dark:bg-white/5 mx-5" />

                                    {/* Details */}
                                    <div className="px-5 py-4 space-y-2.5 flex-1">
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
                                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                            View profile <ChevronRight size={11} />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Edit Modal ── */}
            {isEditModalOpen && editingClient && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] px-4 py-6 md:py-8">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border border-gray-100 dark:border-white/10" style={{ maxHeight: 'min(680px, calc(100dvh - 4rem))' }}>

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
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

                        <form onSubmit={handleSaveClient} className="p-6 space-y-6 overflow-y-auto overscroll-contain flex-1 min-h-0">

                            {/* Section: Identity */}
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <User size={12} /> Identity
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className={labelCls}>Full Name</label>
                                        <input
                                            type="text"
                                            value={editingClient.name || ''}
                                            onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                                            placeholder="John Smith"
                                            className={inputCls}
                                        />
                                    </div>
                                    {/* Email — read-only with change flow */}
                                    <div className="sm:col-span-2">
                                        <label className={labelCls + ' flex items-center justify-between'}>
                                            <span className="flex items-center gap-1.5">
                                                Email Address
                                                <span className="normal-case font-normal text-amber-500 dark:text-amber-400 flex items-center gap-1">
                                                    <Lock size={9} /> Auth-linked · read-only
                                                </span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => { setShowChangeEmail(v => !v); setNewEmailValue(''); }}
                                                className="normal-case font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 text-xs flex items-center gap-1 transition"
                                            >
                                                <Mail size={10} />
                                                {showChangeEmail ? 'Cancel' : 'Change Email'}
                                            </button>
                                        </label>
                                        {/* Read-only display */}
                                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 select-none">
                                            <Mail size={13} className="text-gray-400 flex-shrink-0" />
                                            <span className="flex-1 truncate">{editingClient.email || '—'}</span>
                                            <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-medium">locked</span>
                                        </div>

                                        {/* Change email inline form */}
                                        {showChangeEmail && (
                                            <form
                                                onSubmit={handleChangeEmail}
                                                className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl space-y-3"
                                            >
                                                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                                                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                                                    <p>Changing the email updates the auth account. A confirmation will be sent to the new address. The user must re-verify before the change takes effect.</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="email"
                                                        required
                                                        value={newEmailValue}
                                                        onChange={e => setNewEmailValue(e.target.value)}
                                                        placeholder="new@email.com"
                                                        className={inputCls + ' flex-1 bg-white dark:bg-gray-800'}
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={isEmailChanging || !newEmailValue.trim()}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
                                                    >
                                                        {isEmailChanging
                                                            ? <><RefreshCw size={13} className="animate-spin" /> Updating…</>
                                                            : <><Send size={13} /> Update</>
                                                        }
                                                    </button>
                                                </div>
                                            </form>
                                        )}
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

                            {/* Section: Security & Access (read-only controls) */}
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10">
                                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Lock size={11} /> Security &amp; Access
                                        <span className="normal-case font-normal text-gray-400 dark:text-gray-500">— user-owned, admin view only</span>
                                    </h3>
                                </div>

                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {/* Password row */}
                                    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                                                <KeyRound size={14} className="text-orange-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-white">Password</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Admin cannot view or set passwords. User controls their own.</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleForcePasswordReset}
                                            disabled={isPasswordResetting}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-700/40 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition disabled:opacity-60 flex-shrink-0 whitespace-nowrap"
                                        >
                                            {isPasswordResetting
                                                ? <><RefreshCw size={11} className="animate-spin" /> Sending…</>
                                                : <><Send size={11} /> Force Reset Email</>
                                            }
                                        </button>
                                    </div>

                                    {/* Profile picture row */}
                                    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                                <Eye size={14} className="text-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-white">Profile Picture</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Uploaded and managed by the user from their profile page.</p>
                                            </div>
                                        </div>
                                        {editingClient.avatar_url ? (
                                            <img
                                                src={editingClient.avatar_url}
                                                alt="Avatar"
                                                className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-white/10 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-400">
                                                <ImageOff size={11} /> No photo
                                            </div>
                                        )}
                                    </div>

                                    {/* 2FA row */}
                                    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                editingClient.user_metadata?.factors?.length > 0 ||
                                                editingClient.factors?.length > 0
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                                    : 'bg-gray-100 dark:bg-gray-800'
                                            }`}>
                                                {editingClient.user_metadata?.factors?.length > 0 ||
                                                 editingClient.factors?.length > 0
                                                    ? <ShieldCheck size={14} className="text-emerald-500" />
                                                    : <ShieldOff size={14} className="text-gray-400" />
                                                }
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-white">Two-Factor Authentication</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    User-controlled. Admin cannot enable or disable 2FA.
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                            editingClient.user_metadata?.factors?.length > 0 ||
                                            editingClient.factors?.length > 0
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}>
                                            {editingClient.user_metadata?.factors?.length > 0 ||
                                             editingClient.factors?.length > 0
                                                ? 'Enabled'
                                                : 'Not set up'
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

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
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                {/* Destructive actions left-aligned */}
                                <div className="flex gap-2 sm:mr-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setConfirmDialog({
                                                type: editingClient.status === 'suspended' ? 'unsuspend' : 'suspend',
                                                client: editingClient,
                                            });
                                        }}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border transition ${
                                            editingClient.status === 'suspended'
                                                ? 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                : 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                        }`}
                                    >
                                        {editingClient.status === 'suspended'
                                            ? <><UserCheck size={14} /> Lift Suspension</>
                                            : <><Ban size={14} /> Suspend</>
                                        }
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setConfirmDialog({ type: 'delete', client: editingClient });
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/40 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
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
            , document.body)}
            {/* ── Profile Drawer ── */}
            {drawerClient && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[210]"
                        onClick={closeDrawer}
                    />
                    {/* Panel */}
                    <div className="fixed inset-y-0 right-0 w-full max-w-2xl z-[211] flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-100 dark:border-white/10">

                        {/* ── Drawer header ── */}
                        <div className="flex-shrink-0 border-b border-gray-100 dark:border-white/10">
                            {/* Profile strip */}
                            <div className="px-6 pt-5 pb-4 flex items-center gap-4">
                                <button onClick={closeDrawer} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0">
                                    <ArrowLeft size={16} />
                                </button>
                                {drawerClient.avatar_url ? (
                                    <img src={drawerClient.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 shadow" />
                                ) : (
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarColor(drawerClient.id)} flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow`}>
                                        {getInitials(drawerClient.name, drawerClient.email)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                            {drawerClient.name || <span className="italic text-gray-400">No name</span>}
                                        </h2>
                                        {drawerClient.status === 'suspended' && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full font-medium">
                                                <Ban size={9} /> Suspended
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{drawerClient.company_name || '—'} · {drawerClient.email}</p>
                                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-mono text-purple-600 dark:text-purple-400">
                                        <Hash size={9} />
                                        {drawerClient.customer_id || generateCustomerId(drawerClient.id, drawerClient.created_at)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => { closeDrawer(); handleEditClick(drawerClient); }}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/40 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition flex-shrink-0"
                                >
                                    <Edit2 size={12} /> Edit
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex px-6 gap-1">
                                {([
                                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                                    { id: 'quotes', label: `Quotes${drawerQuotes.length ? ` (${drawerQuotes.length})` : ''}`, icon: Receipt },
                                    { id: 'orders', label: `CRM Orders${drawerOrders.length ? ` (${drawerOrders.length})` : ''}`, icon: Package },
                                    { id: 'documents', label: `Documents${drawerDocuments.length ? ` (${drawerDocuments.length})` : ''}`, icon: FolderOpen },
                                ] as const).map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setDrawerTab(id)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                                            drawerTab === id
                                                ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                    >
                                        <Icon size={12} /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Drawer body (scrollable) ── */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">

                            {/* OVERVIEW TAB */}
                            {drawerTab === 'overview' && (
                                <div className="p-6 space-y-5">
                                    {/* Quick stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Quotes', value: drawerLoadingQuotes ? '…' : drawerQuotes.length, icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                            { label: 'CRM Orders', value: drawerLoadingOrders ? '…' : drawerOrders.length, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                            { label: 'Documents', value: drawerLoadingOrders ? '…' : drawerDocuments.length, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                                        ].map(({ label, value, icon: Icon, color, bg }) => (
                                            <div key={label} className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-3 border border-gray-100 dark:border-white/5 text-center">
                                                <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}><Icon size={14} className={color} /></div>
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Profile details */}
                                    <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
                                        {[
                                            { icon: Mail, label: 'Email', value: drawerClient.email },
                                            { icon: Phone, label: 'Phone', value: drawerClient.phone },
                                            { icon: MapPin, label: 'Country', value: drawerClient.country ? `${COUNTRY_FLAGS[drawerClient.country] || ''} ${drawerClient.country}` : null },
                                            { icon: Briefcase, label: 'Role', value: drawerClient.job_role },
                                            { icon: DollarSign, label: 'Revenue', value: drawerClient.yearly_est_revenue },
                                        ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
                                            <div key={label} className="flex items-center gap-3 px-4 py-3">
                                                <Icon size={13} className="text-gray-400 flex-shrink-0" />
                                                <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label}</span>
                                                <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Specialization tags */}
                                    {drawerClient.category_specialization && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Specializations</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {drawerClient.category_specialization.split(',').map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                                                    <span key={tag} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent quotes preview */}
                                    {!drawerLoadingQuotes && drawerQuotes.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Recent Quotes</p>
                                                <button onClick={() => setDrawerTab('quotes')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">View all</button>
                                            </div>
                                            <div className="space-y-2">
                                                {drawerQuotes.slice(0, 3).map((q: any) => (
                                                    <div key={q.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/5">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{q.factory_data?.name || 'Unknown Factory'}</p>
                                                            <p className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <QuoteStatusBadge status={q.status} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* QUOTES TAB */}
                            {drawerTab === 'quotes' && (
                                <div className="p-6">
                                    {drawerLoadingQuotes ? (
                                        <DrawerLoader rows={4} />
                                    ) : drawerQuotes.length === 0 ? (
                                        <DrawerEmpty icon={Receipt} label="No quotes submitted yet" />
                                    ) : (
                                        <div className="space-y-3">
                                            {drawerQuotes.map((q: any) => {
                                                const items: any[] = q.order_details?.lineItems || [];
                                                return (
                                                    <div key={q.id} className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
                                                        <div className="flex items-start gap-3 p-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{q.factory_data?.name || 'Unknown Factory'}</span>
                                                                    <QuoteStatusBadge status={q.status} />
                                                                </div>
                                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <Hash size={9} /> {q.id.slice(0, 8).toUpperCase()}
                                                                    <span className="mx-1">·</span>
                                                                    <Clock size={9} /> {new Date(q.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </p>
                                                                {items.length > 0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                                        {items.slice(0, 3).map((item: any, i: number) => (
                                                                            <span key={i} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                                                                                {item.category} {item.qty ? `× ${item.qty}` : ''}
                                                                            </span>
                                                                        ))}
                                                                        {items.length > 3 && <span className="text-xs text-gray-400">+{items.length - 3} more</span>}
                                                                    </div>
                                                                )}
                                                                {q.response_details?.price && (
                                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">
                                                                        <DollarSign size={10} /> Quoted: {q.response_details.price}
                                                                        {q.response_details.leadTime && <span className="text-gray-400 font-normal ml-1">· Lead time: {q.response_details.leadTime}</span>}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                                {q.files?.length > 0 && (
                                                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                        <FileText size={11} /> {q.files.length}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={() => { closeDrawer(); props.handleSetCurrentPage('adminRFQ', { quoteId: q.id }); }}
                                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/40 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                                                                    title="Open in RFQ manager"
                                                                >
                                                                    <ExternalLink size={11} /> Open
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CRM ORDERS TAB */}
                            {drawerTab === 'orders' && (
                                <div className="p-6">
                                    {drawerLoadingOrders ? (
                                        <DrawerLoader rows={3} />
                                    ) : drawerOrders.length === 0 ? (
                                        <DrawerEmpty icon={Package} label="No CRM orders found" />
                                    ) : (
                                        <div className="space-y-3">
                                            {drawerOrders.map((order: any) => {
                                                const tasks: any[] = order.tasks || [];
                                                const done = tasks.filter((t: any) => t.status === 'COMPLETE').length;
                                                const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                                                return (
                                                    <div key={order.id} className="bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/5 p-4">
                                                        <div className="flex items-start gap-3 mb-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                                        {order.product_name || order.product || 'Order'}
                                                                    </span>
                                                                    <OrderStatusBadge status={order.status} />
                                                                </div>
                                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <Hash size={9} /> {(order.id || '').slice(0, 8).toUpperCase()}
                                                                    {order.factories?.name && <><span className="mx-1">·</span><Building2 size={9} /> {order.factories.name}</>}
                                                                    <span className="mx-1">·</span>
                                                                    <Clock size={9} /> {new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => { closeDrawer(); props.handleSetCurrentPage('adminCRM', { orderId: order.id }); }}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/40 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition flex-shrink-0"
                                                                title="Open in CRM"
                                                            >
                                                                <ExternalLink size={11} /> Open
                                                            </button>
                                                        </div>
                                                        {tasks.length > 0 && (
                                                            <div>
                                                                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                                                    <span>TNA Progress</span>
                                                                    <span>{done}/{tasks.length} tasks · {pct}%</span>
                                                                </div>
                                                                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(order.documents || []).length > 0 && (
                                                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                                                <FileText size={10} /> {order.documents.length} document{order.documents.length !== 1 ? 's' : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DOCUMENTS TAB */}
                            {drawerTab === 'documents' && (
                                <div className="p-6">
                                    {drawerLoadingOrders ? (
                                        <DrawerLoader rows={4} />
                                    ) : drawerDocuments.length === 0 ? (
                                        <DrawerEmpty icon={FolderOpen} label="No documents found" />
                                    ) : (
                                        <div className="space-y-2">
                                            {drawerDocuments.map((doc: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/5">
                                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-white/10 flex-shrink-0">
                                                        <FileText size={14} className="text-indigo-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{doc.name}</p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {doc.type || 'Document'}
                                                            {doc.orderProduct && <> · {doc.orderProduct}</>}
                                                            {doc.lastUpdated && <> · {new Date(doc.lastUpdated).toLocaleDateString()}</>}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {doc.path && (
                                                            <a
                                                                href={doc.path}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={e => e.stopPropagation()}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition"
                                                                title="Download document"
                                                            >
                                                                <ExternalLink size={13} />
                                                            </a>
                                                        )}
                                                        {doc.orderId && (
                                                            <button
                                                                onClick={() => { closeDrawer(); props.handleSetCurrentPage('adminCRM', { orderId: doc.orderId }); }}
                                                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/40 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                                                                title="Open order in CRM"
                                                            >
                                                                <Package size={10} /> CRM
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            , document.body)}

            {/* ── Confirmation Dialog ── */}
            {confirmDialog && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[220] px-4 py-6 md:py-8">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-white/10 overflow-hidden">

                        {/* Icon + header */}
                        <div className={`px-6 pt-6 pb-4 flex items-start gap-4`}>
                            <div className={`p-3 rounded-xl flex-shrink-0 ${
                                confirmDialog.type === 'delete'
                                    ? 'bg-red-100 dark:bg-red-900/30'
                                    : confirmDialog.type === 'suspend'
                                        ? 'bg-amber-100 dark:bg-amber-900/30'
                                        : 'bg-emerald-100 dark:bg-emerald-900/30'
                            }`}>
                                {confirmDialog.type === 'delete'
                                    ? <Trash2 size={22} className="text-red-600 dark:text-red-400" />
                                    : confirmDialog.type === 'suspend'
                                        ? <ShieldAlert size={22} className="text-amber-600 dark:text-amber-400" />
                                        : <UserCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
                                }
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                    {confirmDialog.type === 'delete' && 'Delete Account Permanently'}
                                    {confirmDialog.type === 'suspend' && 'Suspend Account'}
                                    {confirmDialog.type === 'unsuspend' && 'Lift Suspension'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {confirmDialog.type === 'delete' && (
                                        <>You are about to permanently delete <strong className="text-gray-900 dark:text-white">{confirmDialog.client.name || confirmDialog.client.email}</strong>. This removes their auth account and all profile data. This <span className="text-red-600 font-medium">cannot be undone</span>.</>
                                    )}
                                    {confirmDialog.type === 'suspend' && (
                                        <><strong className="text-gray-900 dark:text-white">{confirmDialog.client.name || confirmDialog.client.email}</strong> will be immediately signed out and blocked from logging in until you lift the suspension. Their data is preserved.</>
                                    )}
                                    {confirmDialog.type === 'unsuspend' && (
                                        <>This will restore full access for <strong className="text-gray-900 dark:text-white">{confirmDialog.client.name || confirmDialog.client.email}</strong>. They will be able to log in again immediately.</>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* User info pill */}
                        <div className="mx-6 mb-4 flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.04] rounded-xl border border-gray-100 dark:border-white/5">
                            {confirmDialog.client.avatar_url ? (
                                <img src={confirmDialog.client.avatar_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarColor(confirmDialog.client.id)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                                    {getInitials(confirmDialog.client.name, confirmDialog.client.email)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{confirmDialog.client.name || '—'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{confirmDialog.client.email}</p>
                            </div>
                            <span className="ml-auto text-xs font-mono text-purple-500 dark:text-purple-400 flex-shrink-0">
                                {confirmDialog.client.customer_id || generateCustomerId(confirmDialog.client.id)}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDialog(null)}
                                disabled={isConfirmLoading}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAction}
                                disabled={isConfirmLoading}
                                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm ${
                                    confirmDialog.type === 'delete'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : confirmDialog.type === 'suspend'
                                            ? 'bg-amber-600 hover:bg-amber-700'
                                            : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {isConfirmLoading ? (
                                    <><RefreshCw size={14} className="animate-spin" /> Processing…</>
                                ) : confirmDialog.type === 'delete' ? (
                                    <><Trash2 size={14} /> Delete Permanently</>
                                ) : confirmDialog.type === 'suspend' ? (
                                    <><Ban size={14} /> Suspend Account</>
                                ) : (
                                    <><UserCheck size={14} /> Lift Suspension</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </MainLayout>
    );
};
