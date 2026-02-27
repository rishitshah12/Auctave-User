import React, { useState, useRef, FC } from 'react';
import {
    Upload, Link, RotateCcw, Save, X, ImageOff, Maximize2, RotateCw,
    Package, TrendingUp, Users, CheckCircle, Zap, BarChart3, Clock, Star,
    Shield, Globe, Key, Mail, Lock, RefreshCw, Phone, Image, Type, Eye, EyeOff,
} from 'lucide-react';
import { MainLayout } from './MainLayout';

interface AdminLoginSettingsPageProps {
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

// ─── Image storage ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'login_bg_images';

const DEFAULT_COLS: string[][] = [
    [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1542178243-bc20fd5a9d04?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
    ],
    [
        'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1617137968427-85250d5cc462?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1523381210434-271e8be8a52b?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1474176857626-96cdcc8a9f2a?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1516762069907-f5b9dd38f73c?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
    ],
    [
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1513956589380-4a8ea3e5bd9d?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1529391409740-59f1b9e6c408?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
    ],
];

function loadSavedCols(): string[][] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_COLS.map(col => [...col]);
}

const slotKey = (c: number, i: number) => `${c}-${i}`;

// ─── Content settings ─────────────────────────────────────────────────────────
const CONTENT_KEY = 'login_content_settings';

const ICON_OPTIONS = [
    'Package', 'TrendingUp', 'Users', 'CheckCircle', 'Zap',
    'BarChart3', 'Clock', 'Star', 'Shield', 'Globe', 'Key',
    'Mail', 'Lock', 'RefreshCw', 'Phone',
] as const;
type LoginIconName = typeof ICON_OPTIONS[number];

const ICON_COMPONENTS: Record<LoginIconName, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
    Package, TrendingUp, Users, CheckCircle, Zap, BarChart3, Clock, Star,
    Shield, Globe, Key, Mail, Lock, RefreshCw, Phone,
};

interface StatSetting  { value: string; label: string; iconName: LoginIconName; }
interface UspSetting   { title: string; desc: string; iconName: LoginIconName; iconColor: string; }
interface LoginContentSettings {
    logoIconName: LoginIconName;
    logoImageUrl: string;
    logoSize: number;
    logoTitle: string;
    logoSubtitle: string;
    badgeText: string;
    headlineLine1: string;
    headlineLine2: string;
    bodyText: string;
    stats: StatSetting[];
    uspItems: UspSetting[];
}

const DEFAULT_CONTENT: LoginContentSettings = {
    logoIconName:  'Package',
    logoImageUrl:  '',
    logoSize:      44,
    logoTitle:     'Auctave Exports',
    logoSubtitle:  'AI Sourcing Platform',
    badgeText:     'Global Garment Intelligence',
    headlineLine1: 'Dress the World.',
    headlineLine2: 'Streamlined sourcing.',
    bodyText:      'Auctave is the first tech-enabled fashion platform simplifying production from design to delivery, helping brands scale effortlessly via a global factory network.',
    stats: [
        { value: '500+', label: 'Orders Managed',     iconName: 'Package'    },
        { value: '98%',  label: 'On-Time Delivery',   iconName: 'Clock'      },
        { value: '50+',  label: 'Diverse Categories', iconName: 'Star'       },
        { value: '10+',  label: 'Countries Served',   iconName: 'TrendingUp' },
    ],
    uspItems: [
        { title: 'Real-Time Order Tracking',       desc: 'Monitor every stage from sampling, production to shipment, live.',                                                              iconName: 'Package',   iconColor: '#22d3ee' },
        { title: 'Factory-to-Doorstep Visibility', desc: 'Complete transparency across your entire supply chain.',                                                                        iconName: 'BarChart3', iconColor: '#34d399' },
        { title: 'Seamless Collaboration',         desc: 'Keep buyers, factories, and QA teams perfectly in sync.',                                                                       iconName: 'Users',     iconColor: '#a78bfa' },
        { title: 'Instant Scalability',            desc: "Auctave's global network enables overnight production doubling and rapid scaling for any product, scale, or geography.",       iconName: 'Zap',       iconColor: '#fbbf24' },
    ],
};

function loadSavedContent(): LoginContentSettings {
    try {
        const raw = localStorage.getItem(CONTENT_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            return {
                ...DEFAULT_CONTENT, ...p,
                stats:    p.stats?.length    ? p.stats    : DEFAULT_CONTENT.stats,
                uspItems: p.uspItems?.length ? p.uspItems : DEFAULT_CONTENT.uspItems,
            };
        }
    } catch {}
    return {
        ...DEFAULT_CONTENT,
        stats:    DEFAULT_CONTENT.stats.map(s => ({ ...s })),
        uspItems: DEFAULT_CONTENT.uspItems.map(u => ({ ...u })),
    };
}

// ─── Hex → rgba helper ────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const inputCls ='w-full text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 outline-none focus:ring-1 focus:ring-red-500 focus:border-red-400 transition-all placeholder-gray-400';
const labelCls = 'block text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1';

// ─── Component ────────────────────────────────────────────────────────────────
export const AdminLoginSettingsPage: FC<AdminLoginSettingsPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'images' | 'content'>('images');

    // ── Images state ──────────────────────────────────────────────────────────
    const [cols, setCols] = useState<string[][]>(() => loadSavedCols());
    const [urlInputs, setUrlInputs] = useState<string[][]>(() => loadSavedCols());
    const [slotStatus, setSlotStatus] = useState<Record<string, 'loading' | 'ok' | 'error'>>({});
    const [imgSaved, setImgSaved] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileRefs = useRef<(HTMLInputElement | null)[][]>([[], [], []]);
    const logoFileRef = useRef<HTMLInputElement | null>(null);

    // ── Content state ─────────────────────────────────────────────────────────
    const [content, setContent] = useState<LoginContentSettings>(() => loadSavedContent());
    const [contentSaved, setContentSaved] = useState(false);

    // ── Preview toggles ───────────────────────────────────────────────────────
    const [showImagesPreview, setShowImagesPreview] = useState(false);
    const [showLogoPreview, setShowLogoPreview] = useState(true);
    const [showHeroPreview, setShowHeroPreview] = useState(false);
    const [showStatsPreview, setShowStatsPreview] = useState(false);
    const [showUspPreview, setShowUspPreview] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if ((window as any).showToast) (window as any).showToast(message, type);
    };

    // ── Image handlers ────────────────────────────────────────────────────────
    const setStatus = (c: number, i: number, status: 'loading' | 'ok' | 'error') =>
        setSlotStatus(prev => ({ ...prev, [slotKey(c, i)]: status }));

    const updateUrl = (c: number, i: number, url: string) => {
        const trimmed = url.trim();
        setUrlInputs(prev => { const n = prev.map(r => [...r]); n[c][i] = url; return n; });
        setCols(prev => { const n = prev.map(r => [...r]); n[c][i] = trimmed; return n; });
        setStatus(c, i, trimmed ? 'loading' : 'ok');
    };

    const handleFileChange = (c: number, i: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => updateUrl(c, i, ev.target?.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleImgSave = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
            setImgSaved(true);
            showToast('Login page images saved successfully');
            setTimeout(() => setImgSaved(false), 2500);
        } catch {
            showToast('Failed to save — images may be too large for local storage', 'error');
        }
    };

    const handleImgReset = () => {
        const defaults = DEFAULT_COLS.map(col => [...col]);
        setCols(defaults);
        setUrlInputs(defaults);
        setSlotStatus({});
        localStorage.removeItem(STORAGE_KEY);
        showToast('Reset to default images');
    };

    const clearSlot = (c: number, i: number) => updateUrl(c, i, DEFAULT_COLS[c][i]);

    const retrySlot = (c: number, i: number) => {
        const url = cols[c][i];
        setStatus(c, i, 'loading');
        setCols(prev => { const n = prev.map(r => [...r]); n[c][i] = ''; return n; });
        setTimeout(() => {
            setCols(prev => { const n = prev.map(r => [...r]); n[c][i] = url; return n; });
        }, 50);
    };

    // ── Logo image upload handler ─────────────────────────────────────────────
    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setField('logoImageUrl', ev.target?.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // ── Content handlers ──────────────────────────────────────────────────────
    const handleContentSave = () => {
        try {
            localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
            setContentSaved(true);
            showToast('Login page content saved successfully');
            setTimeout(() => setContentSaved(false), 2500);
        } catch {
            showToast('Failed to save content', 'error');
        }
    };

    const handleContentReset = () => {
        setContent({
            ...DEFAULT_CONTENT,
            stats:    DEFAULT_CONTENT.stats.map(s => ({ ...s })),
            uspItems: DEFAULT_CONTENT.uspItems.map(u => ({ ...u })),
        });
        localStorage.removeItem(CONTENT_KEY);
        showToast('Content reset to defaults');
    };

    const setField = <K extends keyof Omit<LoginContentSettings, 'stats' | 'uspItems'>>(
        key: K, val: LoginContentSettings[K]
    ) => setContent(prev => ({ ...prev, [key]: val }));

    const setStat = (idx: number, key: keyof StatSetting, val: string) =>
        setContent(prev => ({
            ...prev,
            stats: prev.stats.map((s, i) => i === idx ? { ...s, [key]: val } : s),
        }));

    const setUsp = (idx: number, key: keyof UspSetting, val: string) =>
        setContent(prev => ({
            ...prev,
            uspItems: prev.uspItems.map((u, i) => i === idx ? { ...u, [key]: val } : u),
        }));

    // ── Icon picker sub-component ─────────────────────────────────────────────
    const IconPicker = ({ value, onChange }: { value: LoginIconName; onChange: (v: LoginIconName) => void }) => {
        const Comp = ICON_COMPONENTS[value] || Package;
        return (
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0">
                    <Comp size={15} />
                </div>
                <select
                    value={value}
                    onChange={e => onChange(e.target.value as LoginIconName)}
                    className={inputCls + ' flex-1'}
                >
                    {ICON_OPTIONS.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>
        );
    };

    const colLabels = ['Column 1 — Left', 'Column 2 — Centre', 'Column 3 — Right'];

    const saved = activeTab === 'images' ? imgSaved : contentSaved;
    const handleSave = activeTab === 'images' ? handleImgSave : handleContentSave;
    const handleReset = activeTab === 'images' ? handleImgReset : handleContentReset;

    return (
        <MainLayout {...props}>
            <div className="p-6 max-w-7xl mx-auto">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login Page Settings</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Customise images, branding, headlines, stats and USP cards shown on the login page.
                        </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                        >
                            <RotateCcw size={15} />
                            Reset Defaults
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
                            style={{ background: saved ? '#16a34a' : '#c20c0b' }}
                        >
                            <Save size={15} />
                            {saved ? 'Saved!' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* ── Tab nav ── */}
                <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit mb-8">
                    {([
                        { key: 'images',  label: 'Background Images', Icon: Image },
                        { key: 'content', label: 'Page Content',       Icon: Type  },
                    ] as const).map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === key
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    IMAGES TAB
                ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'images' && (
                    <>
                        {/* ── Background preview toggle ── */}
                        <div className="flex items-center justify-between mb-5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Edit the three image columns shown on the login page background.
                            </p>
                            <button
                                onClick={() => setShowImagesPreview(p => !p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                            >
                                {showImagesPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                                {showImagesPreview ? 'Hide Preview' : 'Preview Background'}
                            </button>
                        </div>

                        {/* ── Background preview panel ── */}
                        {showImagesPreview && (
                            <div className="mb-6 rounded-2xl overflow-hidden shadow-lg" style={{ background: '#06060a', border: '1px solid rgba(255,255,255,0.08)', height: 300 }}>
                                <div className="flex gap-0.5 h-full">
                                    {cols.map((col, c) => (
                                        <div key={c} className="flex-1 overflow-hidden relative">
                                            {col.slice(0, 3).map((url, i) => (
                                                url ? (
                                                    <img
                                                        key={i} src={url} alt=""
                                                        className="w-full object-cover"
                                                        style={{ height: '33.34%', display: 'block' }}
                                                    />
                                                ) : (
                                                    <div key={i} className="w-full bg-gray-800 flex items-center justify-center" style={{ height: '33.34%' }}>
                                                        <ImageOff size={16} className="text-gray-600" />
                                                    </div>
                                                )
                                            ))}
                                            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(6,6,10,0.15) 0%, transparent 40%, rgba(6,6,10,0.5) 100%)' }} />
                                            <div className="absolute bottom-2 left-0 right-0 text-center">
                                                <span className="text-[10px] text-white/40 font-medium tracking-wider uppercase">{colLabels[c].split('—')[1]?.trim()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {cols.map((col, c) => (
                                <div key={c} className="space-y-5">
                                    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                        {colLabels[c]}
                                    </h2>

                                    {col.map((url, i) => {
                                        const key = slotKey(c, i);
                                        const status = slotStatus[key] ?? (url ? undefined : 'ok');
                                        const isError   = status === 'error';
                                        const isLoading = status === 'loading';

                                        return (
                                            <div
                                                key={i}
                                                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm"
                                            >
                                                {/* Preview */}
                                                <div className="relative w-full bg-gray-100 dark:bg-gray-900" style={{ height: 220 }}>
                                                    {!url && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                                                                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                                                            </svg>
                                                            <span className="text-xs">No image</span>
                                                        </div>
                                                    )}
                                                    {url && isError && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                                                            <ImageOff size={30} className="text-red-400" />
                                                            <div>
                                                                <p className="text-xs font-semibold text-red-500 mb-1">Could not load image</p>
                                                                <p className="text-[10px] text-gray-400 break-all leading-relaxed line-clamp-2">{url}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => retrySlot(c, i)}
                                                                className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-medium"
                                                            >
                                                                <RotateCw size={11} /> Retry
                                                            </button>
                                                        </div>
                                                    )}
                                                    {url && isLoading && (
                                                        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                                    )}
                                                    {url && (
                                                        <img
                                                            key={url}
                                                            src={url}
                                                            alt={`Col ${c + 1} image ${i + 1}`}
                                                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
                                                            style={{ opacity: isError || isLoading ? 0 : 1 }}
                                                            onLoad={() => setStatus(c, i, 'ok')}
                                                            onError={() => setStatus(c, i, 'error')}
                                                        />
                                                    )}
                                                    {url && !isError && !isLoading && (
                                                        <div className="absolute inset-0 flex items-start justify-between p-2 opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                                                            <button
                                                                onClick={() => setPreviewUrl(url)}
                                                                className="bg-black/60 hover:bg-black/80 text-white rounded-lg px-2 py-1.5 flex items-center gap-1 text-[11px] font-medium transition-colors"
                                                            >
                                                                <Maximize2 size={11} /> Preview
                                                            </button>
                                                            <button
                                                                onClick={() => clearSlot(c, i)}
                                                                className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Controls */}
                                                <div className="p-3 space-y-2.5">
                                                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-400 transition-all">
                                                        <Link size={12} className="text-gray-400 shrink-0" />
                                                        <input
                                                            type="text"
                                                            value={urlInputs[c][i]}
                                                            onChange={e => updateUrl(c, i, e.target.value)}
                                                            onPaste={e => {
                                                                setTimeout(() => {
                                                                    const el = e.target as HTMLInputElement;
                                                                    updateUrl(c, i, el.value);
                                                                }, 0);
                                                            }}
                                                            placeholder="Paste image URL…"
                                                            className="flex-1 text-xs bg-transparent text-gray-800 dark:text-gray-100 outline-none placeholder-gray-400 min-w-0"
                                                        />
                                                        {urlInputs[c][i] && (
                                                            <button
                                                                onClick={() => updateUrl(c, i, '')}
                                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                                                        <span className="text-[10px] text-gray-400 font-medium">or</span>
                                                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                                                    </div>
                                                    <input
                                                        ref={el => {
                                                            if (!fileRefs.current[c]) fileRefs.current[c] = [];
                                                            fileRefs.current[c][i] = el;
                                                        }}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={e => handleFileChange(c, i, e)}
                                                    />
                                                    <button
                                                        onClick={() => fileRefs.current[c]?.[i]?.click()}
                                                        className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-500 dark:hover:border-red-500 dark:hover:text-red-400 transition-colors font-medium"
                                                    >
                                                        <Upload size={12} />
                                                        Upload from device
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        <p className="mt-8 text-xs text-gray-400 dark:text-gray-500 text-center">
                            Images are saved in browser local storage. Large uploaded files may exceed storage limits — use URLs for best results.
                        </p>
                    </>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    CONTENT TAB
                ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'content' && (
                    <div className="space-y-8">

                        {/* ── Logo ── */}
                        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    Logo
                                </h2>
                                <button
                                    onClick={() => setShowLogoPreview(p => !p)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                    {showLogoPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                                    {showLogoPreview ? 'Hide Preview' : 'Preview'}
                                </button>
                            </div>
                            <div className="space-y-4">

                                {/* Logo type toggle */}
                                <div>
                                    <label className={labelCls}>Logo Type</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setField('logoImageUrl', '')}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                                !content.logoImageUrl
                                                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                        >
                                            <Package size={13} /> Use Icon
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => logoFileRef.current?.click()}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                                content.logoImageUrl
                                                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                        >
                                            <Image size={13} /> Use Image
                                        </button>
                                    </div>
                                </div>

                                {/* Icon picker — shown when in icon mode */}
                                {!content.logoImageUrl && (
                                    <div>
                                        <label className={labelCls}>Icon</label>
                                        <IconPicker value={content.logoIconName} onChange={v => setField('logoIconName', v)} />
                                    </div>
                                )}

                                {/* Image upload — shown when in image mode */}
                                {content.logoImageUrl && (
                                    <div className="flex items-start gap-4">
                                        {/* Preview */}
                                        <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                                            <img
                                                src={content.logoImageUrl}
                                                alt="Logo preview"
                                                className="w-full h-full object-contain p-1"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-400 transition-all">
                                                <Link size={12} className="text-gray-400 shrink-0" />
                                                <input
                                                    type="text"
                                                    value={content.logoImageUrl.startsWith('data:') ? '' : content.logoImageUrl}
                                                    onChange={e => setField('logoImageUrl', e.target.value)}
                                                    placeholder="Paste image URL…"
                                                    className="flex-1 text-xs bg-transparent text-gray-800 dark:text-gray-100 outline-none placeholder-gray-400 min-w-0"
                                                />
                                                {content.logoImageUrl && (
                                                    <button
                                                        onClick={() => setField('logoImageUrl', '')}
                                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                                                <span className="text-[10px] text-gray-400 font-medium">or</span>
                                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                                            </div>
                                            <button
                                                onClick={() => logoFileRef.current?.click()}
                                                className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-500 dark:hover:border-red-500 dark:hover:text-red-400 transition-colors font-medium"
                                            >
                                                <Upload size={12} />
                                                Replace image
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* When in icon mode, show URL-only image input for switching */}
                                {!content.logoImageUrl && (
                                    <div>
                                        <label className={labelCls}>Or paste a logo image URL</label>
                                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-400 transition-all">
                                            <Link size={12} className="text-gray-400 shrink-0" />
                                            <input
                                                type="text"
                                                value=""
                                                onChange={e => { if (e.target.value) setField('logoImageUrl', e.target.value); }}
                                                placeholder="https://…"
                                                className="flex-1 text-xs bg-transparent text-gray-800 dark:text-gray-100 outline-none placeholder-gray-400 min-w-0"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Hidden file input */}
                                <input
                                    ref={logoFileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoFileChange}
                                />

                                {/* Logo Size */}
                                <div>
                                    <label className={labelCls}>Logo Size — {content.logoSize}px</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={20}
                                            max={96}
                                            value={content.logoSize}
                                            onChange={e => setField('logoSize', Number(e.target.value))}
                                            className="flex-1 accent-red-500 cursor-pointer"
                                        />
                                        <input
                                            type="number"
                                            min={20}
                                            max={96}
                                            value={content.logoSize}
                                            onChange={e => setField('logoSize', Math.min(96, Math.max(20, Number(e.target.value))))}
                                            className={inputCls + ' w-20 text-center'}
                                        />
                                    </div>
                                </div>

                                {/* Live Preview */}
                                {showLogoPreview && (
                                    <div>
                                        <label className={labelCls}>Preview</label>
                                        <div
                                            className="rounded-xl p-4 flex items-center gap-3"
                                            style={{ background: '#06060a', border: '1px solid rgba(255,255,255,0.08)' }}
                                        >
                                            <div style={{
                                                width: content.logoSize,
                                                height: content.logoSize,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                {content.logoImageUrl ? (
                                                    <img
                                                        src={content.logoImageUrl}
                                                        alt="Preview"
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    />
                                                ) : (() => {
                                                    const Comp = ICON_COMPONENTS[content.logoIconName] || Package;
                                                    return <Comp size={Math.round(content.logoSize * 0.5)} style={{ color: '#c9a54e' }} />;
                                                })()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: Math.max(14, content.logoSize * 0.5), fontWeight: 700, color: '#f5f0eb', lineHeight: 1 }}>
                                                    {content.logoTitle || 'Company Name'}
                                                </div>
                                                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#c9a54e', marginTop: 4 }}>
                                                    {content.logoSubtitle || 'Subtitle'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Company name + subtitle */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div>
                                        <label className={labelCls}>Company Name</label>
                                        <input
                                            type="text"
                                            value={content.logoTitle}
                                            onChange={e => setField('logoTitle', e.target.value)}
                                            placeholder="Auctave Exports"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Subtitle / Tagline</label>
                                        <input
                                            type="text"
                                            value={content.logoSubtitle}
                                            onChange={e => setField('logoSubtitle', e.target.value)}
                                            placeholder="AI Sourcing Platform"
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ── Hero Panel ── */}
                        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    Hero Panel
                                </h2>
                                <button
                                    onClick={() => setShowHeroPreview(p => !p)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                    {showHeroPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                                    {showHeroPreview ? 'Hide Preview' : 'Preview'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className={labelCls}>Live Badge Text</label>
                                    <input
                                        type="text"
                                        value={content.badgeText}
                                        onChange={e => setField('badgeText', e.target.value)}
                                        placeholder="Global Garment Intelligence"
                                        className={inputCls}
                                    />
                                </div>
                                <div />
                                <div>
                                    <label className={labelCls}>Headline — Line 1 (white/purple gradient)</label>
                                    <input
                                        type="text"
                                        value={content.headlineLine1}
                                        onChange={e => setField('headlineLine1', e.target.value)}
                                        placeholder="Dress the World."
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Headline — Line 2 (red gradient)</label>
                                    <input
                                        type="text"
                                        value={content.headlineLine2}
                                        onChange={e => setField('headlineLine2', e.target.value)}
                                        placeholder="Streamlined sourcing."
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Body Paragraph</label>
                                <textarea
                                    value={content.bodyText}
                                    onChange={e => setField('bodyText', e.target.value)}
                                    rows={3}
                                    placeholder="Describe your platform…"
                                    className={inputCls + ' resize-none leading-relaxed'}
                                />
                            </div>

                            {/* Hero preview */}
                            {showHeroPreview && (
                                <div className="mt-5 rounded-xl p-6" style={{ background: '#06060a', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    {/* Badge */}
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        padding: '6px 16px', borderRadius: 100, marginBottom: 22,
                                        background: 'rgba(194,12,11,0.10)',
                                        border: '1px solid rgba(194,12,11,0.30)',
                                    }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #ff5555, #c20c0b)', display: 'inline-block', flexShrink: 0 }} />
                                        <span style={{ color: 'rgba(255,148,148,0.90)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                                            {content.badgeText || 'Badge Text'}
                                        </span>
                                    </div>
                                    {/* Headline */}
                                    <div style={{ fontWeight: 800, lineHeight: 1.06, fontSize: 'clamp(1.5rem, 2.8vw, 2.8rem)', letterSpacing: '-0.025em', marginBottom: 14 }}>
                                        <span style={{ display: 'block', background: 'linear-gradient(115deg, #ffffff 0%, #ede4ff 38%, #c8b0ff 70%, #9d78ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                            {content.headlineLine1 || 'Headline Line 1'}
                                        </span>
                                        <span style={{ display: 'block', background: 'linear-gradient(115deg, #ff0000ff 0%, #fd3b3bff 32%, #c20c0b 65%, #7a0000 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                            {content.headlineLine2 || 'Headline Line 2'}
                                        </span>
                                    </div>
                                    {/* Body */}
                                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.78, maxWidth: 480 }}>
                                        {content.bodyText || 'Body paragraph…'}
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* ── Stats Cards ── */}
                        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    Stats Cards
                                </h2>
                                <button
                                    onClick={() => setShowStatsPreview(p => !p)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                    {showStatsPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                                    {showStatsPreview ? 'Hide Preview' : 'Preview'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {content.stats.map((stat, idx) => (
                                    <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 p-4 space-y-3">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                            Card {idx + 1}
                                        </p>
                                        <div>
                                            <label className={labelCls}>Value</label>
                                            <input
                                                type="text"
                                                value={stat.value}
                                                onChange={e => setStat(idx, 'value', e.target.value)}
                                                placeholder="500+"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Label</label>
                                            <input
                                                type="text"
                                                value={stat.label}
                                                onChange={e => setStat(idx, 'label', e.target.value)}
                                                placeholder="Orders Managed"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Icon</label>
                                            <IconPicker value={stat.iconName} onChange={v => setStat(idx, 'iconName', v)} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Stats preview */}
                            {showStatsPreview && (
                                <div className="mt-5 rounded-xl p-4" style={{ background: '#06060a', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                                        borderRadius: 12, overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.030)',
                                        border: '1px solid rgba(255,255,255,0.072)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        boxShadow: '0 4px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)',
                                    }}>
                                        {content.stats.map((s, i) => {
                                            const Ic = ICON_COMPONENTS[s.iconName] || Package;
                                            return (
                                                <div key={i} style={{ padding: '14px 8px', textAlign: 'center', borderRight: i < content.stats.length - 1 ? '1px solid rgba(255,255,255,0.065)' : 'none' }}>
                                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginBottom: 5, display: 'flex', justifyContent: 'center' }}>
                                                        <Ic size={14} />
                                                    </div>
                                                    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, marginBottom: 3, background: 'linear-gradient(135deg, #ff8080 0%, #c20c0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                                        {s.value || '—'}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
                                                        {s.label || 'Label'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ── USP Cards ── */}
                        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    USP Feature Cards
                                </h2>
                                <button
                                    onClick={() => setShowUspPreview(p => !p)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                    {showUspPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                                    {showUspPreview ? 'Hide Preview' : 'Preview'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {content.uspItems.map((usp, idx) => (
                                    <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 p-4 space-y-3">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                            Card {idx + 1}
                                        </p>
                                        <div>
                                            <label className={labelCls}>Title</label>
                                            <input
                                                type="text"
                                                value={usp.title}
                                                onChange={e => setUsp(idx, 'title', e.target.value)}
                                                placeholder="Card title"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Description</label>
                                            <textarea
                                                value={usp.desc}
                                                onChange={e => setUsp(idx, 'desc', e.target.value)}
                                                rows={2}
                                                placeholder="Short description…"
                                                className={inputCls + ' resize-none'}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelCls}>Icon</label>
                                                <IconPicker value={usp.iconName} onChange={v => setUsp(idx, 'iconName', v)} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Icon Colour</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={usp.iconColor}
                                                        onChange={e => setUsp(idx, 'iconColor', e.target.value)}
                                                        className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer bg-transparent p-0.5 shrink-0"
                                                        title="Pick icon colour"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={usp.iconColor}
                                                        onChange={e => setUsp(idx, 'iconColor', e.target.value)}
                                                        placeholder="#22d3ee"
                                                        className={inputCls + ' flex-1'}
                                                        maxLength={9}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* USP preview */}
                            {showUspPreview && (
                                <div className="mt-5 rounded-xl p-4" style={{ background: '#06060a', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        {content.uspItems.map((item, i) => {
                                            const Ic = ICON_COMPONENTS[item.iconName] || Package;
                                            return (
                                                <div key={i} style={{
                                                    padding: '12px 14px', borderRadius: 14,
                                                    background: 'rgba(255,255,255,0.034)',
                                                    border: '1px solid rgba(255,255,255,0.075)',
                                                    backdropFilter: 'blur(20px)',
                                                    WebkitBackdropFilter: 'blur(20px)',
                                                    boxShadow: '0 4px 24px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.06)',
                                                }}>
                                                    <div style={{
                                                        width: 28, height: 28, borderRadius: 8,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        marginBottom: 8,
                                                        background: `linear-gradient(135deg, ${hexToRgba(item.iconColor, 0.14)}, ${hexToRgba(item.iconColor, 0.06)})`,
                                                        border: `1px solid ${hexToRgba(item.iconColor, 0.24)}`,
                                                    }}>
                                                        <Ic size={15} style={{ color: item.iconColor }} />
                                                    </div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ece8', lineHeight: 1.35, marginBottom: 3 }}>
                                                        {item.title || 'Card Title'}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>
                                                        {item.desc || 'Description…'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>

                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-2">
                            Changes take effect on the next login page load. All settings are saved to browser local storage.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Lightbox modal ── */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
                    onClick={() => setPreviewUrl(null)}
                >
                    <div
                        className="relative max-w-3xl w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <button
                            onClick={() => setPreviewUrl(null)}
                            className="absolute -top-4 -right-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <X size={16} className="text-gray-700 dark:text-gray-200" />
                        </button>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
