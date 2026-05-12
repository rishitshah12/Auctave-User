// Import React library and hooks for state management (useState), side effects (useEffect), references (useRef), memoization (useMemo), and types (FC, ReactNode)
import React, { useState, useEffect, useRef, useMemo, FC, ReactNode, useCallback, Suspense, lazy } from 'react';
import { useNavigate, Navigate, Routes, Route } from 'react-router-dom';
import { ROUTE_MAP, PageName } from './routes/config';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { createPortal } from 'react-dom';
import { KnittingPreloader } from './KnittingPreloader';
// Import the configured Supabase client for backend database and auth interactions
import { supabase } from './supabaseClient';
// Import UI icons from lucide-react library
import {
    Star, Clock, MapPin, Package, Truck, List, Plus, ChevronLeft,
    ChevronRight, ChevronDown, X, Bot, Send, CheckCircle, Shirt,
    BadgePercent, BrainCircuit, MessageSquare, ClipboardCopy, FileText, DollarSign,
    GanttChartSquare, LayoutDashboard, MoreHorizontal, Info, Settings, LifeBuoy,
    History, Edit, Anchor, Ship, Warehouse, PackageCheck, Award, Users, Activity, Shield,
    BarChart as BarChartIcon, FileQuestion, ClipboardCheck, Lock,
    Tag, Weight, Palette, Box, Map as MapIcon, Download, BookOpen, Building, Trash2, Upload, Globe, Moon, Sparkles,
    Camera, Edit3, ArrowLeft, Search, RefreshCw, ExternalLink, GripVertical, Paperclip, Eye, EyeOff, Check, CheckCheck, LogOut, AlertTriangle, Smartphone,
    Building2, UserPlus, XCircle,
} from 'lucide-react';
// Import TypeScript interfaces/types for data structures used in the app
import { UserProfile, OrderFormData, Factory, QuoteRequest, CrmOrder, CrmProduct, CrmTask, ToastState, NegotiationHistoryItem, LineItem } from './types';
// Import custom components for specific pages and UI elements
import { MainLayout } from '../src/MainLayout';
import { LoginPage } from '../src/LoginPage';
import { FactoryCard } from '../src/FactoryCard';
import { AiCard } from '../src/AiCard';
import { masterController } from './masterController';
import './index'; // Register Factory Module
import { quoteService } from './quote.service';
import { crmService } from './crm.service';
import { analyticsService } from './analytics.service';

import { PhotoRepositionModal } from './PhotoRepositionModal';
// Lazy-loaded page components — only downloaded when the user navigates to them
import type { HelloSplashData } from './OnboardingPage';
const OnboardingPage = lazy(() => import('./OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const SourcingPage = lazy(() => import('../src/SourcingPage').then(m => ({ default: m.SourcingPage })));
const OrderFormPage = lazy(() => import('./OrderFormPage').then(m => ({ default: m.OrderFormPage })));
const CrmDashboard = lazy(() => import('./CrmDashboard'));
const AdminDashboardPage = lazy(() => import('./AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('./AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminFactoriesPage = lazy(() => import('./AdminFactoriesPage').then(m => ({ default: m.AdminFactoriesPage })));
const AdminCRMPage = lazy(() => import('./AdminCRMPage').then(m => ({ default: m.AdminCRMPage })));
const AdminTrendingPage = lazy(() => import('./AdminTrendingPage').then(m => ({ default: m.AdminTrendingPage })));
const TrendingPageComponent = lazy(() => import('./TrendingPage').then(m => ({ default: m.TrendingPage })));
const AdminRFQPage = lazy(() => import('./AdminRFQPage').then(m => ({ default: m.AdminRFQPage })));
const AdminLoginSettingsPage = lazy(() => import('./AdminLoginSettingsPage').then(m => ({ default: m.AdminLoginSettingsPage })));
const AdminUserAnalyticsPage = lazy(() => import('./AdminUserAnalyticsPage').then(m => ({ default: m.AdminUserAnalyticsPage })));
const AdminUniversalChat = lazy(() => import('./AdminUniversalChat').then(m => ({ default: m.AdminUniversalChat })));
const MyQuotesPage = lazy(() => import('./MyQuotesPage').then(m => ({ default: m.MyQuotesPage })));
const QuoteDetailPage = lazy(() => import('./QuoteDetailPage').then(m => ({ default: m.QuoteDetailPage })));
const FactoryDetailPage = lazy(() => import('./FactoryDetailPage').then(m => ({ default: m.FactoryDetailPage })));
import { theme } from './theme';
import { ToastProvider, useToast } from './ToastContext';
import { NotificationProvider, useNotifications } from './NotificationContext';
import { OrgProvider, useOrg, useOrgPermissions } from './OrgContext';
import { TeamSettingsPage } from './TeamSettingsPage';
import { notificationService } from './notificationService';
import { getCache, setCache, getCacheStale, TTL_FACTORIES, TTL_FACTORY_DETAIL } from './sessionCache';
import { transformRawQuote } from './services/quoteMapper';

// ─── Image resize helper ──────────────────────────────────────────────────────
function resizeImage(file: File, maxPx = 240): Promise<string> {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * ratio);
                canvas.height = Math.round(img.height * ratio);
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.src = e.target!.result as string;
        };
        reader.readAsDataURL(file);
    });
}

// Extended chat message type for the AI assistant
interface AIChatMessage {
    text: string;
    sender: 'ai' | 'user';
    suggestedFactories?: Factory[];
    relatedOrders?: QuoteRequest[];
    startOrderData?: { category?: string; qty?: string; fabric?: string };
}

// --- Hello Splash Overlay ---
const HelloSplashOverlay: FC<{ data: import('./OnboardingPage').HelloSplashData }> = ({ data }) => {
    const isMobile = window.innerWidth < 640;
    const isDark = data.theme === 'dark';
    const bg = isDark ? '#080810' : '#f8f6f2';
    const bgGradient = isDark
        ? 'linear-gradient(160deg, rgba(194,12,11,0.06) 0%, transparent 40%, rgba(120,40,0,0.05) 75%, rgba(194,12,11,0.04) 100%)'
        : 'linear-gradient(160deg, rgba(194,12,11,0.05) 0%, transparent 40%, rgba(255,140,0,0.06) 75%, rgba(194,12,11,0.04) 100%)';
    const subColor = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.38)';
    const showRomanized = data.romanized && data.romanized !== data.word;

    return (
        <>
            <style>{`
                @keyframes helloWord { 0%{opacity:0;transform:translateY(18px)} 22%{opacity:1;transform:translateY(0)} 70%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-10px)} }
                @keyframes helloSub { 0%,18%{opacity:0;transform:translateY(10px)} 36%{opacity:1;transform:translateY(0)} 70%{opacity:1} 100%{opacity:0} }
                @keyframes helloScreen { 0%{opacity:0} 5%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
                @keyframes helloPulse { 0%,100%{opacity:0.35} 50%{opacity:0.7} }
                @keyframes helloOrb { 0%,100%{transform:translateX(-50%) scale(1)} 50%{transform:translateX(-50%) scale(1.08)} }
                @keyframes helloShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
            `}</style>
            <div style={{
                position: 'fixed', inset: 0, background: bg,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                zIndex: 99999, animation: 'helloScreen 3s cubic-bezier(0.4,0,0.2,1) forwards', overflow: 'hidden',
                pointerEvents: 'none',
            }}>
                {/* Layered background */}
                <div style={{ position: 'absolute', inset: 0, background: bgGradient }} />
                {/* Noise texture overlay for depth */}
                <div style={{ position: 'absolute', inset: 0, opacity: isDark ? 0.04 : 0.03, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundSize: '180px' }} />
                {/* Soft top glow orb */}
                <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: isMobile ? 360 : 600, height: isMobile ? 360 : 600, borderRadius: '50%', background: isDark ? 'radial-gradient(ellipse,rgba(194,12,11,0.14) 0%,transparent 68%)' : 'radial-gradient(ellipse,rgba(194,12,11,0.10) 0%,transparent 68%)', animation: 'helloOrb 4s ease-in-out infinite' }} />
                {/* Bottom-right accent */}
                <div style={{ position: 'absolute', bottom: '-12%', right: '-8%', width: isMobile ? 260 : 420, height: isMobile ? 260 : 420, borderRadius: '50%', background: isDark ? 'radial-gradient(ellipse,rgba(180,60,0,0.09) 0%,transparent 68%)' : 'radial-gradient(ellipse,rgba(255,110,0,0.08) 0%,transparent 68%)', animation: 'helloPulse 3.5s ease-in-out infinite 0.6s' }} />
                {/* Bottom-left accent */}
                <div style={{ position: 'absolute', bottom: '-8%', left: '-6%', width: isMobile ? 200 : 340, height: isMobile ? 200 : 340, borderRadius: '50%', background: isDark ? 'radial-gradient(ellipse,rgba(201,165,78,0.07) 0%,transparent 68%)' : 'radial-gradient(ellipse,rgba(201,165,78,0.07) 0%,transparent 68%)', animation: 'helloPulse 4s ease-in-out infinite 1.4s' }} />

                {/* Hello word */}
                <div style={{
                    fontSize: isMobile ? 76 : 116, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1,
                    background: 'linear-gradient(125deg, #ff7043 0%, #e53000 30%, #c20c0b 58%, #ff5722 85%, #ff8a50 100%)',
                    backgroundSize: '300% auto',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    animation: 'helloWord 3s cubic-bezier(0.4,0,0.2,1) forwards',
                    filter: isDark ? 'drop-shadow(0 2px 40px rgba(194,12,11,0.35))' : 'drop-shadow(0 2px 32px rgba(194,12,11,0.22))',
                    textAlign: 'center', padding: '0 24px', position: 'relative',
                }}>
                    {data.word}
                </div>
                {showRomanized && (
                    <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 500, color: subColor, marginTop: isMobile ? 12 : 16, letterSpacing: '0.06em', animation: 'helloSub 3s cubic-bezier(0.4,0,0.2,1) forwards', textAlign: 'center', position: 'relative' }}>
                        {data.romanized}
                    </div>
                )}
            </div>
        </>
    );
};

// Relays org.ownerId into AppContent state — needed because AppContent wraps OrgProvider
// and cannot call useOrg() itself.
const OrgBridge: FC<{ onOrgOwnerChange: (ownerId: string) => void }> = ({ onOrgOwnerChange }) => {
    const { org } = useOrg();
    useEffect(() => {
        if (org?.ownerId) onOrgOwnerChange(org.ownerId);
    }, [org?.ownerId]);
    return null;
};

// ── URL ↔ Page mapping ────────────────────────────────────────────────────────
const PAGE_TO_PATH: Record<string, string> = {
    login: '/login',
    onboarding: '/onboarding',
    createPassword: '/create-password',
    sourcing: '/sourcing',
    myQuotes: '/my-quotes',
    crm: '/crm',
    orderForm: '/order',
    factoryDetail: '/factory',
    factoryCatalog: '/factory/catalog',
    factoryTools: '/factory/tools',
    factorySuggestions: '/factories',
    quoteRequest: '/quote/new',
    trending: '/trending',
    settings: '/settings',
    tracking: '/tracking',
    billing: '/billing',
    profile: '/profile',
    teamSettings: '/team',
    adminDashboard: '/admin',
    adminUsers: '/admin/users',
    adminFactories: '/admin/factories',
    adminCRM: '/admin/crm',
    adminRFQ: '/admin/rfq',
    adminTrending: '/admin/trending',
    adminLoginSettings: '/admin/login-settings',
    adminUserAnalytics: '/admin/analytics',
};

const PATH_TO_PAGE: Record<string, string> = Object.fromEntries(
    Object.entries(PAGE_TO_PATH).map(([page, path]) => [path, page])
);

const PAGE_SEO: Record<string, { title: string; description?: string }> = {
    login: { title: 'Login | Garment ERP', description: 'Sign in to your Garment ERP account' },
    onboarding: { title: 'Get Started | Garment ERP' },
    sourcing: { title: 'Sourcing | Garment ERP', description: 'Browse and source garment factories' },
    myQuotes: { title: 'My Quotes | Garment ERP', description: 'View and manage your quote requests' },
    crm: { title: 'CRM Portal | Garment ERP', description: 'Track your orders and production status' },
    orderForm: { title: 'Place Order | Garment ERP' },
    factoryDetail: { title: 'Factory | Garment ERP' },
    factoryCatalog: { title: 'Factory Catalog | Garment ERP' },
    trending: { title: 'Trending | Garment ERP', description: 'Explore trending garment styles and materials' },
    settings: { title: 'Settings | Garment ERP' },
    tracking: { title: 'Order Tracking | Garment ERP' },
    billing: { title: 'Billing | Garment ERP' },
    profile: { title: 'Profile | Garment ERP' },
    teamSettings: { title: 'Team | Garment ERP' },
    adminDashboard: { title: 'Dashboard | Admin — Garment ERP' },
    adminUsers: { title: 'Users | Admin — Garment ERP' },
    adminFactories: { title: 'Factories | Admin — Garment ERP' },
    adminCRM: { title: 'CRM | Admin — Garment ERP' },
    adminRFQ: { title: 'RFQ | Admin — Garment ERP' },
    adminTrending: { title: 'Trending | Admin — Garment ERP' },
    adminLoginSettings: { title: 'Login Settings | Admin — Garment ERP' },
    adminUserAnalytics: { title: 'Analytics | Admin — Garment ERP' },
};

// --- Main App Component ---
// This is the root component of the application
const AppContent: FC = () => {
    // Access showToast from context
    const { showToast } = useToast();
    // Access addNotification from context
    const { addNotification } = useNotifications();
    // React Router — replaces manual window.history.pushState calls
    const navigate = useNavigate();

    // --- State Management ---

    // State to track which page is currently displayed. Prefer URL path over localStorage.
    const [currentPage, setCurrentPage] = useState<string>(() => {
        const pageFromUrl = PATH_TO_PAGE[window.location.pathname];
        if (pageFromUrl) return pageFromUrl;
        return 'login'; // Auth callback handles redirect; avoids cross-tab localStorage bleed
    });
    const pageEnterTimeRef = useRef<number>(Date.now());
    const trackedPageRef = useRef<string>('');
    // State to store the authenticated user object from Supabase
    const [user, setUser] = useState<any>(null);
    // State to store the user's extended profile data (name, company, etc.)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    // State to indicate if the authentication check has completed.
    // Initialized synchronously from localStorage: if no valid session is stored,
    // we skip the loading spinner entirely and show the login form immediately.
    const [isAuthReady, setIsAuthReady] = useState<boolean>(() => {
        try {
            const raw = localStorage.getItem('sb-nhvbnfpzykdokqcnljth-auth-token');
            if (!raw) return true; // No session → show login immediately
            const session = JSON.parse(raw);
            const expiresAt = session?.expires_at ?? 0;
            if (expiresAt < Math.floor(Date.now() / 1000)) return true; // Expired → show login
            return false; // Valid session → wait for Supabase to confirm
        } catch {
            return true; // Parse error → show login immediately
        }
    });
    // State to show loading indicator when saving profile
    const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
    // Active org owner's user ID — set by OrgBridge when the active org changes.
    // When a team member is viewing an org they don't own, data must be fetched
    // using the owner's ID (quotes/crm_orders are keyed on the owner's user_id/client_id).
    const [activeOrgOwnerId, setActiveOrgOwnerId] = useState<string | null>(null);

    // State to track if the current user is a new signup (needs onboarding)
    const [isNewUserSignup, setIsNewUserSignup] = useState<boolean>(false);
    // State to store authentication error messages
    const [authError, setAuthError] = useState<string>('');
    // True while a login form submission is in-flight. Shows the preloader instead
    // of the login page so the user sees progress rather than a frozen form.
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    // State to manage the visibility of the mobile menu
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    // State to manage if the sidebar is collapsed or expanded
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
    // State used to force re-render of components by changing the key
    const [pageKey, setPageKey] = useState<number>(0);
    // State to check if the current user is an admin
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    // State to track global loading requests (counter handles concurrent fetches)
    const [loadingCount, setLoadingCount] = useState<number>(0);
    const quotesAbortController = useRef<AbortController | null>(null);
    // True once the onAuthStateChange callback fires at least once.
    // Guards against the safety-timer race: the 5s timer can set isAuthReady=true
    // before Supabase confirms the session, leaving user=null for a signed-in user.
    // Must be STATE (not a ref) so that flipping it triggers a re-render — otherwise
    // the render gate never re-evaluates when there is no stored session and no other
    // state changes when the INITIAL_SESSION event fires.
    const [authCallbackFired, setAuthCallbackFired] = useState(false);
    const [myQuotesFilter, setMyQuotesFilter] = useState<string>('All');
    // AI chat state persisted at AppContent level so it survives remounts caused by parent re-renders
    const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
        { text: "Hello! I'm Auctave Brain. How can I help you today?\n\nI can help you find factories, check your order status, answer platform questions, or start a new order.", sender: 'ai' }
    ]);
    const [aiChatOpen, setAiChatOpen] = useState(false);
    const [aiActiveTab, setAiActiveTab] = useState<'ai' | 'quotes'>('ai');
    // Tracks last-known status per quote id for visibilitychange change detection
    const prevQuoteStatusesRef = useRef<Map<string, string>>(new Map());
    // Timestamp of when the tab was hidden (for the 30s poll gate)
    const tabHiddenAtRef = useRef<number>(0);
    // Tracks the created_at of the newest RFQ seen by the admin (for polling dedup)
    const lastAdminRFQAtRef = useRef<string>('');
    // Quote ID to auto-open when navigating to adminRFQ
    const [adminRFQInitialId, setAdminRFQInitialId] = useState<string | null>(null);
    // Order ID to auto-open when navigating to adminCRM
    const [adminCRMInitialId, setAdminCRMInitialId] = useState<string | null>(null);

    // Hello splash overlay shown after onboarding completes
    const [helloSplash, setHelloSplash] = useState<HelloSplashData | null>(null);

    // Pending invitation awaiting user accept/decline
    const [pendingInvitation, setPendingInvitation] = useState<{
        id: string;
        orgId: string;
        orgName: string;
        inviterName: string;
        role: string;
        permissions: any;
        invitedBy: string | null;
        token: string;
    } | null>(null);
    const [acceptingInvite, setAcceptingInvite] = useState(false);

    // State for dark mode
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('garment_erp_dark_mode');
        return saved ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('garment_erp_dark_mode', String(darkMode));
    }, [darkMode]);

    // Sync URL and document title when currentPage changes
    useEffect(() => {
        const path = PAGE_TO_PATH[currentPage];
        // Never overwrite OAuth callback params — Supabase needs ?code= or #access_token= to exchange for a session
        const hasAuthParams = window.location.search.includes('code=') || window.location.hash.includes('access_token=');
        // Only sync URL when the current pathname is a known static path.
        // Dynamic routes like /quote/:id are not in PATH_TO_PAGE — skipping prevents
        // this effect from clobbering them when currentPage resolves to a stale value.
        const currentPathIsStatic = !!PATH_TO_PAGE[window.location.pathname];
        if (path && window.location.pathname !== path && !hasAuthParams && currentPathIsStatic) {
            navigate(path);
        }
        const seo = PAGE_SEO[currentPage];
        if (seo) document.title = seo.title;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    // Sync currentPage when the user navigates with browser back/forward buttons.
    // Using popstate instead of useLocation() so AppContent does NOT re-render on
    // every programmatic navigate() call — that was causing all inner page components
    // (closures with new references each render) to remount and flicker.
    useEffect(() => {
        const handlePopState = () => {
            const pageFromPath = PATH_TO_PAGE[window.location.pathname];
            if (pageFromPath) setCurrentPage(pageFromPath);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Init / teardown the notification service whenever the auth state changes.
    // This drives cross-device real-time sync and browser push notifications.
    useEffect(() => {
        if (user?.id) {
            notificationService.init(user.id);
            // Register the service worker and request push permission after a short delay
            // to avoid interrupting the login flow.
            const t = setTimeout(async () => {
                if ('serviceWorker' in navigator) {
                    try {
                        await navigator.serviceWorker.register('/sw.js');
                    } catch {}
                }
            }, 3000);
            return () => clearTimeout(t);
        } else {
            notificationService.teardown();
        }
    }, [user?.id]);

    // --- Helper Functions ---

    // Function to copy text to the system clipboard
    const copyToClipboard = (text: string, successMessage: string = 'Copied to clipboard!') => {
        // Create a temporary textarea element to hold the text
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Hide the textarea from view
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            // Execute the copy command
            document.execCommand('copy');
            // Show success message
            showToast(successMessage);
        } catch (err) {
            // Handle errors
            console.error('Failed to copy: ', err);
            showToast('Failed to copy text.', 'error');
        }
        // Clean up by removing the textarea
        document.body.removeChild(textArea);
    };

    // --- App Logic & Data States ---
    
    // State to store data entered in the Order Form
    const [orderFormData, setOrderFormData] = useState<OrderFormData>({
        lineItems: [{
            id: Date.now(),
            category: 'T-shirt',
            fabricQuality: '100% Cotton',
            weightGSM: '180',
            styleOption: 'Crew Neck, Short Sleeve',
            qty: 5000,
            containerType: '',
            targetPrice: '4.50',
            packagingReqs: 'Individually folded and poly-bagged',
            labelingReqs: 'Custom neck labels',
            sizeRange: [],
            customSize: '',
            sizeRatio: {},
            sleeveOption: '',
            printOption: '',
            trimsAndAccessories: '',
            specialInstructions: '',
            quantityType: 'units'
        }],
        shippingCountry: '',
        shippingPort: ''
    });
    // State to store files uploaded during order creation
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    // State to store factories that match the user's order criteria
    const [suggestedFactories, setSuggestedFactories] = useState<Factory[]>([]);
    // State to store the currently selected factory for viewing details
    const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
    // State to filter factories by garment category
    const [selectedGarmentCategory, setSelectedGarmentCategory] = useState<string>('All');
    // State to store the list of quote requests made by the user
    const QUOTES_CACHE_KEY = 'garment_erp_my_quotes';
    const PROFILE_CACHE_KEY = 'garment_erp_profile_v1';
    const PROFILE_CACHE_TTL = 60 * 60 * 1000; // 1 hour — like any ecommerce platform
    const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>(() => {
        const cached = sessionStorage.getItem(QUOTES_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    // State to store the currently selected quote for viewing details
    // State for pre-populating OrderFormPage when navigating from a factory catalog
    const [orderFormInitialLineItems, setOrderFormInitialLineItems] = useState<LineItem[] | undefined>(undefined);
    const [orderFormPreFactory, setOrderFormPreFactory] = useState<{ id: string; name: string; imageUrl: string; location: string } | null>(null);
    // State to manage loading of quotes
    const [isQuotesLoading, setIsQuotesLoading] = useState<boolean>(() => !sessionStorage.getItem(QUOTES_CACHE_KEY));

    // --- Gemini (AI) Feature States ---
    
    // State to store the AI-generated contract brief
    const [contractBrief, setContractBrief] = useState<string>('');
    // State to store AI-generated optimization suggestions
    const [optimizationSuggestions, setOptimizationSuggestions] = useState<string>('');
    // State to store the AI-drafted outreach email
    const [outreachEmail, setOutreachEmail] = useState<string>('');
    // State to store AI-generated market trends
    const [marketTrends, setMarketTrends] = useState<string>('');
    // State to store AI-generated negotiation tips
    const [negotiationTips, setNegotiationTips] = useState<string>('');
    // Loading states for each AI feature
    const [isLoadingBrief, setIsLoadingBrief] = useState<boolean>(false);
    const [isLoadingOptimizations, setIsLoadingOptimizations] = useState<boolean>(false);
    const [isLoadingEmail, setIsLoadingEmail] = useState<boolean>(false);
    const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(false);
    const [isLoadingNegotiation, setIsLoadingNegotiation] = useState<boolean>(false);

    // --- CRM State ---
    
    // State to store CRM order data, keyed by Order ID
    const [crmData, setCrmData] = useState<{ [key: string]: CrmOrder }>({
        // Mock data for demonstration purposes
        "PO-2024-001": { customer: 'Acme Corp', product: '5000 Classic Tees', factoryId: 'F001', documents: [ { name: 'Purchase Order', type: 'PO', lastUpdated: '2025-10-25' }, { name: 'Shipping Bill', type: 'Logistics', lastUpdated: '2025-11-29' }, { name: 'Insurance Policy', type: 'Finance', lastUpdated: '2025-10-30' }, ], tasks: [ { id: 1, name: 'Sample Approval', responsible: 'Jane D.', plannedStartDate: '2025-11-01', plannedEndDate: '2025-11-05', actualStartDate: '2025-11-01', actualEndDate: '2025-11-04', status: 'COMPLETE', color: 'bg-purple-500', quantity: 10 }, { id: 2, name: 'Fabric Sourcing', responsible: 'Merch Team', plannedStartDate: '2025-11-03', plannedEndDate: '2025-11-10', actualStartDate: '2025-11-04', actualEndDate: '2025-11-09', status: 'COMPLETE', color: 'bg-blue-500', quantity: 5000 }, { id: 3, name: 'Cutting', responsible: 'Prod. Team', plannedStartDate: '2025-11-11', plannedEndDate: '2025-11-15', actualStartDate: '2025-11-11', actualEndDate: null, status: 'IN PROGRESS', color: 'bg-pink-500', quantity: 5000 }, { id: 4, name: 'Stitching', responsible: 'Prod. Team', plannedStartDate: '2025-11-16', plannedEndDate: '2025-11-25', actualStartDate: '2025-11-18', actualEndDate: null, status: 'IN PROGRESS', color: 'bg-orange-500', quantity: 2500 }, { id: 5, name: 'Quality Check', responsible: 'QA Team', plannedStartDate: '2025-11-26', plannedEndDate: '2025-11-28', actualStartDate: null, actualEndDate: null, status: 'TO DO', color: 'bg-green-500', quantity: 0 }, { id: 6, name: 'Packing & Shipping', responsible: 'Logistics', plannedStartDate: '2025-11-29', plannedEndDate: '2025-12-02', actualStartDate: null, actualEndDate: null, status: 'TO DO', color: 'bg-yellow-500', quantity: 0 }, ] },
        "PO-2024-002": { customer: 'Stark Industries', product: '10000 Hoodies', factoryId: 'F003', documents: [ { name: 'Purchase Order', type: 'PO', lastUpdated: '2025-11-15' } ], tasks: [ { id: 7, name: 'Fabric Sourcing', responsible: 'Merch Team', plannedStartDate: '2025-12-01', plannedEndDate: '2025-12-10', actualStartDate: '2025-12-02', actualEndDate: '2025-12-10', status: 'COMPLETE', color: 'bg-blue-500', quantity: 10000 }, { id: 8, name: 'Lab Dips', responsible: 'Jane D.', plannedStartDate: '2025-12-05', plannedEndDate: '2025-12-12', actualStartDate: '2025-12-06', actualEndDate: null, status: 'IN PROGRESS', color: 'bg-pink-500', quantity: 20 }, { id: 9, name: 'Production', responsible: 'Prod. Team', plannedStartDate: '2025-12-13', plannedEndDate: '2026-01-05', actualStartDate: null, actualEndDate: null, status: 'TO DO', color: 'bg-green-500', quantity: 0 }, ] },
        "PO-2024-003": { customer: 'Wayne Enterprises', product: '2500 Jackets', factoryId: 'F004', documents: [ { name: 'Purchase Order', type: 'PO', lastUpdated: '2025-07-20' }, { name: 'Insurance Policy', type: 'Finance', lastUpdated: '2025-07-25' } ], tasks: [ { id: 10, name: 'Order Confirmation', responsible: 'Admin', plannedStartDate: '2025-08-01', plannedEndDate: '2025-08-01', actualStartDate: '2025-08-01', actualEndDate: '2025-08-01', status: 'COMPLETE' }, { id: 11, name: 'Fit Sample', responsible: 'Tech Team', plannedStartDate: '2025-08-05', plannedEndDate: '2025-08-10', actualStartDate: '2025-08-06', actualEndDate: '2025-08-11', status: 'COMPLETE' }, { id: 12, name: 'Fabric Approval', responsible: 'Merch Team', plannedStartDate: '2025-08-12', plannedEndDate: '2025-08-15', actualStartDate: '2025-08-12', actualEndDate: null, status: 'IN PROGRESS' }, { id: 13, name: 'Bulk Production', responsible: 'Prod. Team', plannedStartDate: '2025-08-16', plannedEndDate: '2025-09-10', actualStartDate: null, actualEndDate: null, status: 'TO DO' }, { id: 14, name: 'Midline Inspection', responsible: 'QA Team', plannedStartDate: '2025-08-30', plannedEndDate: '2025-08-31', actualStartDate: null, actualEndDate: null, status: 'TO DO' }, { id: 15, name: 'Final Inspection', responsible: 'QA Team', plannedStartDate: '2025-09-11', plannedEndDate: '2025-09-12', actualStartDate: null, actualEndDate: null, status: 'TO DO' }, { id: 16, name: 'Shipment', responsible: 'Logistics', plannedStartDate: '2025-09-15', plannedEndDate: '2025-09-15', actualStartDate: null, actualEndDate: null, status: 'TO DO' }, ] }
    });
    // State to track which order is currently active in the CRM view
    const [activeCrmOrderKey, setActiveCrmOrderKey] = useState<string | null>(null);
    // Map of quote ID -> CRM order ID for accepted quotes that have been converted
    const [crmOrdersByQuoteId, setCrmOrdersByQuoteId] = useState<Record<string, string>>({});

    // Function to add a new order to the CRM state
    const addNewOrderToCrm = (orderId: string, orderData: CrmOrder) => {
        setCrmData(prev => ({
            ...prev,
            [orderId]: orderData
        }));
        setActiveCrmOrderKey(orderId);
    };

    // --- Global Functions ---
    
    // Function to toggle the sidebar menu visibility
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    
    // Function to set global loading state
    const setGlobalLoading = useCallback((isLoading: boolean) => {
        setLoadingCount(prev => isLoading ? prev + 1 : Math.max(0, prev - 1));
    }, []);

    // Function to handle navigation between pages
    const handleSetCurrentPage = (page: string, data: any = null) => {
        // Track page navigation for analytics (client-side only)
        if (!isAdmin) {
            const duration_ms = Date.now() - pageEnterTimeRef.current;
            // Log time spent on the page being left (only if it was a real page visit)
            if (trackedPageRef.current && duration_ms > 1000) {
                analyticsService.track('page_exit', { page: trackedPageRef.current, duration_ms });
            }
            analyticsService.track('page_view', { page });
            pageEnterTimeRef.current = Date.now();
            trackedPageRef.current = page;
        }
        // Increment pageKey to force re-render of components if needed
        setPageKey(prevKey => prevKey + 1);
        // If navigating to specific detail pages, set the selected data
        if (page === 'quoteRequest' || page === 'factoryDetail' || page === 'factoryCatalog') {
            setSelectedFactory(data as Factory);
        }

        if (page === 'adminRFQ' && (data?.quoteId || data?.rfqId)) {
            setAdminRFQInitialId(data.quoteId ?? data.rfqId);
        } else if (page === 'adminRFQ' && !data?.quoteId && !data?.rfqId) {
            setAdminRFQInitialId(null);
        }
        if (page === 'adminCRM' && data?.orderId) {
            setAdminCRMInitialId(data.orderId);
        } else if (page === 'adminCRM' && !data?.orderId) {
            setAdminCRMInitialId(null);
        }
        // CRM: open specific order if orderId provided, otherwise reset
        if (page === 'crm' && data?.orderId) {
            setActiveCrmOrderKey(data.orderId);
        } else if (page !== 'crm') {
            setActiveCrmOrderKey(null);
        }

        if (page === 'myQuotes') {
            if (typeof data === 'string') {
                setMyQuotesFilter(data);
            } else {
                setMyQuotesFilter('All');
            }
        }

        if (page === 'orderForm') {
            if (data?.lineItems !== undefined) {
                setOrderFormInitialLineItems(data.lineItems.length > 0 ? data.lineItems : undefined);
                if (data.factory) {
                    setSelectedFactory(data.factory as Factory);
                    setOrderFormPreFactory({
                        id: data.factory.id,
                        name: data.factory.name,
                        imageUrl: data.factory.imageUrl,
                        location: data.factory.location,
                    });
                } else {
                    setOrderFormPreFactory(null);
                }
            } else {
                setOrderFormInitialLineItems(undefined);
                setOrderFormPreFactory(null);
                setSelectedFactory(null);
            }
        }

        // Update the current page state
        setCurrentPage(page);
        if (page !== 'login') {
            localStorage.setItem('garment_erp_last_page', page);
        }

        // Immediately push the URL so route-based pages (settings, billing, tracking,
        // profile) render via their <Route> element rather than the switch default case.
        const targetPath = PAGE_TO_PATH[page];
        if (targetPath && window.location.pathname !== targetPath) {
            navigate(targetPath);
        }
    };

    // --- Supabase Auth Listener ---
    useEffect(() => {
        // Boot CMS modules (e.g., register factories)
        masterController.boot().catch(err => {
            console.error("CMS Boot Failed:", err);
            showToast(`CMS Startup Error: ${err.message}`, 'error');
        });

        // Capture invite_token from URL on app load — use localStorage so it survives
        // Supabase auth redirects that clear sessionStorage.
        const urlParams = new URLSearchParams(window.location.search);
        const rawInviteToken = urlParams.get('invite_token');
        if (rawInviteToken) {
            localStorage.setItem('garment_invite_token', rawInviteToken);
        }

        // Pre-warm the Supabase connection immediately on app load.
        // This fires a lightweight 1-row query so the database wakes up in the
        // background while the user is on the login screen — not while they wait
        // for data after logging in. Result is discarded; errors are silently ignored.
        supabase.from('factories').select('id').limit(1).then(() => {});
    }, []);

    // Effect to handle authentication state changes
    useEffect(() => {
        // Safety timeout to prevent infinite loading if auth callback hangs.
        // Must set authCallbackFired (state) too — the render gate requires both; if
        // onAuthStateChange never fires (network issue / StrictMode double-mount),
        // the spinner would otherwise hang forever.
        const safetyTimer = setTimeout(() => {
            setAuthCallbackFired(true);
            setIsAuthReady(true);
        }, 5000);

        // Tracks whether a navigation decision has already been made in this effect
        // mount. In React StrictMode the effect runs twice; without this guard both
        // the SIGNED_IN callback (first mount) and the INITIAL_SESSION callback
        // (second mount) call setCurrentPage, causing back-to-back navigations.
        let navigationHandled = false;

        // Subscribe to Supabase auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setAuthCallbackFired(true);
            if (session?.user) setIsAuthenticating(false); // clear login-in-progress overlay
            try {
                // Update user state
                setUser(session?.user ?? null);
                
                // Sync dark mode preference from user metadata if available
                if (session?.user?.user_metadata?.darkMode !== undefined) {
                    setDarkMode(session.user.user_metadata.darkMode);
                }

                // Check if the user is an admin based on email domain
                const isUserAdmin = session?.user?.email?.toLowerCase().endsWith('@auctaveexports.com') ?? false;
                setIsAdmin(isUserAdmin);

                if (session?.user) {
                    // TOKEN_REFRESHED just rotates the JWT — profile and page state are already set,
                    // so skip the expensive re-fetch and redirect logic entirely.
                    if (event === 'TOKEN_REFRESHED') {
                        clearTimeout(safetyTimer);
                        setIsAuthReady(true);
                        return;
                    }

                    let currentProfile: UserProfile | null = null;
                    let profileFetchFailed = false; // Track if fetch failed due to network/timeout

                    // Use cached profile (localStorage, 1h TTL) — avoids DB round-trip on every auth event
                    try {
                        const cachedProfileRaw = localStorage.getItem(PROFILE_CACHE_KEY);
                        if (cachedProfileRaw) {
                            const cached = JSON.parse(cachedProfileRaw);
                            if (cached._userId === session.user.id && Date.now() - (cached._ts || 0) < PROFILE_CACHE_TTL) {
                                const { _userId, _ts, ...profile } = cached;
                                currentProfile = profile as UserProfile;
                                setUserProfile(currentProfile);
                                console.log('Profile loaded from cache (skip DB fetch)');
                            }
                        }
                    } catch { /* corrupt cache — will re-fetch below */ }

                    if (!currentProfile) try {
                        // Fetch profile from Supabase (admins or clients table) with timeout
                        const tableName = isUserAdmin ? 'admins' : 'clients';

                        let data, error;
                        // Retry mechanism for profile fetch
                        for (let attempt = 0; attempt < 3; attempt++) {
                            try {
                                const profileFetchPromise = supabase
                                    .from(tableName)
                                    .select('*')
                                    .eq('id', session.user.id)
                                    .single();

                                const timeoutDuration = attempt === 0 ? 8000 : 5000; // 8s for 1st attempt, 5s for retries

                                const profileTimeoutPromise = new Promise((_, reject) => {
                                    setTimeout(() => reject(new Error(`Profile fetch timeout (attempt ${attempt + 1})`)), timeoutDuration);
                                });

                                const result = await Promise.race([profileFetchPromise, profileTimeoutPromise]) as any;
                                data = result.data;
                                error = result.error;
                                break; // If we get here, we got a response (success or API error)
                            } catch (err) {
                                const error = err instanceof Error ? err : new Error(String(err));
                                console.warn(`${error.message}. Retrying...`);
                                if (attempt === 2) throw error; // Throw on last attempt
                                await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Backoff
                            }
                        }

                        if (data) {
                            // Block suspended accounts immediately after login
                            if (data.status === 'suspended' && !isUserAdmin) {
                                console.warn('Suspended account attempted login:', session.user.email);
                                await supabase.auth.signOut();
                                setUser(null);
                                setUserProfile(null);
                                setCurrentPage('login');
                                setIsAuthReady(true);
                                // Show error via a small delay so the login page has rendered
                                setTimeout(() => {
                                    showToast('Your account has been suspended. Please contact support.', 'error');
                                }, 300);
                                return;
                            }

                            // If the clients table has no avatar but Google/OAuth provided one, sync it now
                            const oauthPicture = session.user.user_metadata?.picture
                                || session.user.user_metadata?.avatar_url;
                            if (!data.avatar_url && oauthPicture && !isUserAdmin) {
                                supabase
                                    .from('clients')
                                    .update({ avatar_url: oauthPicture })
                                    .eq('id', session.user.id)
                                    .then(({ error: syncErr }) => {
                                        if (syncErr) console.warn('Avatar sync failed:', syncErr.message);
                                    });
                                data.avatar_url = oauthPicture; // reflect immediately in profile state
                            }

                            // Map database fields to UserProfile interface
                            // Ensure customer_id is stored — generate + save if missing
                            let customerId: string = data.customer_id || '';
                            if (!customerId) {
                                const date = new Date(session.user.created_at);
                                const yy = String(date.getFullYear()).slice(-2);
                                const mm = String(date.getMonth() + 1).padStart(2, '0');
                                const hex = session.user.id.replace(/-/g, '').slice(0, 4).toUpperCase();
                                customerId = `CLT-${yy}${mm}-${hex}`;
                                supabase.from('clients').update({ customer_id: customerId }).eq('id', session.user.id).then(() => {});
                            }
                            currentProfile = {
                                name: data.name,
                                companyName: data.company_name,
                                phone: data.phone,
                                email: data.email,
                                country: data.country,
                                jobRole: data.job_role,
                                categorySpecialization: data.category_specialization,
                                yearlyEstRevenue: data.yearly_est_revenue,
                                avatarUrl: data.avatar_url || '',
                                customerId,
                                website: data.website || '',
                                vatNumber: data.vat_number || '',
                                businessRegNumber: data.business_reg_number || '',
                                businessType: data.business_type || '',
                                billingAddress: data.billing_address || '',
                                companyAddress: data.company_address || '',
                                ...(() => {
                                    const ba = (() => { try { return JSON.parse(data.billing_address || '{}'); } catch { return {}; } })();
                                    const ca = (() => { try { return JSON.parse(data.company_address || '{}'); } catch { return {}; } })();
                                    return {
                                        billingStreet: ba.street ?? (typeof ba === 'string' ? ba : ''),
                                        billingCity: ba.city ?? '',
                                        billingState: ba.state ?? '',
                                        billingPostal: ba.postal ?? '',
                                        billingCountry: ba.country ?? '',
                                        companyStreet: ca.street ?? (typeof ca === 'string' ? ca : ''),
                                        companyCity: ca.city ?? '',
                                        companyState: ca.state ?? '',
                                        companyPostal: ca.postal ?? '',
                                        companyCountry: ca.country ?? '',
                                    };
                                })(),
                            };
                            setUserProfile(currentProfile);
                            try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ ...currentProfile, _userId: session.user.id, _ts: Date.now() })); } catch {}
                            console.log('Profile loaded from DB and cached');
                        } else if (error) {
                            // Check if profile truly doesn't exist (PGRST116) vs other errors
                            if (error.code === 'PGRST116') {
                                console.log('No profile found in database - checking if new user');
                                setUserProfile(null);
                                // Only trigger onboarding for brand-new users, not existing users without a profile.
                                // A user is considered new if their account was created within 24 hours OR
                                // the new-signup flag is still set in localStorage (handles tab-close/reopen).
                                const newSignupKey = `garment_new_signup_${session.user.id}`;
                                const accountAgeMs = Date.now() - new Date(session.user.created_at).getTime();
                                const isNewAccount = accountAgeMs < 24 * 60 * 60 * 1000;
                                if (isNewAccount || localStorage.getItem(newSignupKey) === 'true') {
                                    localStorage.setItem(newSignupKey, 'true');
                                    setIsNewUserSignup(true);
                                    console.log('New user signup detected - will show onboarding');
                                } else {
                                    setIsNewUserSignup(false);
                                    console.log('Existing user without profile - skipping onboarding');
                                }
                            } else {
                                // Network/timeout/other error - don't treat as missing profile
                                console.error('Error fetching profile:', error.message, error.code);
                                profileFetchFailed = true;
                                // Keep existing profile in state if available, or set to null
                                setUserProfile(null);
                            }
                        }
                    } catch (profileError: any) {
                        console.error('Profile fetch failed:', profileError?.message || profileError);
                        profileFetchFailed = true;
                        // Don't set profile to null on network errors - keep existing state
                    }

                    // ── Invite token processing ──────────────────────────────────────────
                    // INITIAL_SESSION: already-logged-in user visiting invite link — read from URL only.
                    // SIGNED_IN: fresh login after auth redirect — read from URL or localStorage.
                    // Never read localStorage on INITIAL_SESSION: would steal a token stored by
                    // a different tab (multi-tab safe).
                    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !isUserAdmin) {
                        const urlParams = new URLSearchParams(window.location.search);
                        const tokenFromUrl = urlParams.get('invite_token');
                        const inviteToken = tokenFromUrl ?? (
                            event === 'SIGNED_IN' ? localStorage.getItem('garment_invite_token') : null
                        );
                        if (inviteToken) {
                            localStorage.removeItem('garment_invite_token');
                            window.history.replaceState({}, '', window.location.pathname);
                            try {
                                const { data: invitation } = await supabase
                                    .from('invitations')
                                    .select('*, organizations(id, name, owner_id, max_members)')
                                    .eq('token', inviteToken)
                                    .eq('status', 'pending')
                                    .single();

                                if (invitation && new Date(invitation.expires_at) > new Date()) {
                                    if (invitation.email.toLowerCase() === session.user.email?.toLowerCase()) {
                                        // Fetch inviter's name from clients table
                                        let inviterName = 'Your admin';
                                        if (invitation.invited_by) {
                                            const { data: inviterRow } = await supabase
                                                .from('clients')
                                                .select('name')
                                                .eq('user_id', invitation.invited_by)
                                                .single();
                                            if (inviterRow?.name) inviterName = inviterRow.name;
                                        }
                                        // Show accept/decline dialog instead of auto-accepting
                                        setPendingInvitation({
                                            id: invitation.id,
                                            orgId: invitation.org_id,
                                            orgName: (invitation.organizations as any)?.name ?? 'the organization',
                                            inviterName,
                                            role: invitation.role,
                                            permissions: invitation.permissions,
                                            invitedBy: invitation.invited_by,
                                            token: inviteToken,
                                        });
                                    } else {
                                        setTimeout(() => showToast('This invitation was sent to a different email address.', 'error'), 500);
                                    }
                                } else if (invitation && new Date(invitation.expires_at) <= new Date()) {
                                    setTimeout(() => showToast('This invitation has expired. Please ask for a new one.', 'error'), 500);
                                } else if (!invitation) {
                                    setTimeout(() => showToast('Invitation not found or already used.', 'error'), 500);
                                }
                            } catch (inviteErr) {
                                console.warn('Invite token processing failed:', inviteErr);
                            }
                        }
                    }
                    // ── End invite token processing ──────────────────────────────────────

                    // Enforce Onboarding Flow via MasterController - ONLY if profile fetch succeeded
                    // Skip onboarding redirect if fetch failed due to network/timeout issues
                    if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && !profileFetchFailed) {
                        const redirectRoute = masterController.getOnboardingRedirect(session.user, currentProfile);
                        console.log('Onboarding redirect:', {
                            event,
                            redirectRoute,
                            hasProfile: !!currentProfile,
                            passwordSet: session.user.user_metadata?.password_set,
                            isAdmin: isUserAdmin,
                            email: session.user.email
                        });

                        if (redirectRoute) {
                            if (!navigationHandled) {
                                navigationHandled = true;
                                console.log(`Redirecting to ${redirectRoute} for onboarding`);
                                setCurrentPage(redirectRoute);
                                localStorage.setItem('garment_erp_last_page', redirectRoute);
                            }
                        } else if (!navigationHandled) {
                            navigationHandled = true;
                            if (event === 'INITIAL_SESSION') {
                                const pageFromUrl = PATH_TO_PAGE[window.location.pathname];
                                const targetPage = (pageFromUrl && pageFromUrl !== 'login')
                                    ? pageFromUrl
                                    : (isUserAdmin ? 'adminDashboard' : 'sourcing');
                                console.log(`INITIAL_SESSION: navigating to ${targetPage}`);
                                setCurrentPage(targetPage);
                            } else if (event === 'SIGNED_IN') {
                                const lastPage = localStorage.getItem('garment_erp_last_page');
                                const targetPage = (lastPage && lastPage !== 'login')
                                    ? lastPage
                                    : (isUserAdmin ? 'adminDashboard' : 'sourcing');
                                console.log(`SIGNED_IN: navigating to ${targetPage}`);
                                setCurrentPage(targetPage);
                            }
                        }
                    } else if (profileFetchFailed && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !navigationHandled) {
                        navigationHandled = true;
                        if (event === 'INITIAL_SESSION') {
                            const pageFromUrl = PATH_TO_PAGE[window.location.pathname];
                            const targetPage = (pageFromUrl && pageFromUrl !== 'login')
                                ? pageFromUrl
                                : (isUserAdmin ? 'adminDashboard' : 'sourcing');
                            setCurrentPage(targetPage);
                        } else {
                            const lastPage = localStorage.getItem('garment_erp_last_page');
                            const targetPage = (lastPage && lastPage !== 'login')
                                ? lastPage
                                : (isUserAdmin ? 'adminDashboard' : 'sourcing');
                            setCurrentPage(targetPage);
                        }
                        console.log('Profile fetch failed, keeping user logged in');
                    }

                    // Force redirect away from login if still on login page after 2 seconds.
                    // Only for initial auth events, not TOKEN_REFRESHED which fires on session refresh.
                    // IMPORTANT: re-verify the live session inside the timeout — do NOT use the stale
                    // closure `session` variable, which remains truthy even after the user has signed out,
                    // and would otherwise silently redirect a logged-out user back into the admin panel.
                    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                        setTimeout(async () => {
                            const { data: { session: liveSession } } = await supabase.auth.getSession();
                            if (!liveSession?.user) return; // User has since signed out — abort redirect
                            const currentUrlPage = PATH_TO_PAGE[window.location.pathname];
                            // Dynamic routes like /quote/:id are not in PATH_TO_PAGE — don't
                            // treat them as "stuck on login".
                            const isKnownNonLoginPage = currentUrlPage && currentUrlPage !== 'login';
                            const isDynamicRoute = !currentUrlPage && window.location.pathname !== '/' && window.location.pathname !== '/login';
                            if (!isKnownNonLoginPage && !isDynamicRoute) {
                                console.warn('Still on login page after auth - forcing redirect');
                                const liveIsAdmin = liveSession.user.email?.toLowerCase().endsWith('@auctaveexports.com') ?? false;
                                const forcedPage = liveIsAdmin ? 'adminDashboard' : 'sourcing';
                                setCurrentPage(forcedPage);
                            }
                        }, 2000);
                    }
                } else if (event === 'SIGNED_OUT') {
                    // Explicitly handle sign out event
                    setUser(null);
                    setUserProfile(null);
                    setIsAdmin(false);
                    localStorage.removeItem('garment_erp_last_page');
                    localStorage.removeItem(PROFILE_CACHE_KEY);
                    sessionStorage.removeItem(QUOTES_CACHE_KEY);
                    setCurrentPage('login');
                } else {
                    // If no session, go to login
                    setCurrentPage('login');
                }
            } catch (error) {
                console.error("Auth state change error:", error);
                // Even if there's an error, try to recover by redirecting appropriately
                if (session?.user) {
                    const isUserAdmin = session.user.email?.toLowerCase().endsWith('@auctaveexports.com') ?? false;
                    setCurrentPage(isUserAdmin ? 'adminDashboard' : 'sourcing');
                } else {
                    setCurrentPage('login');
                }
            } finally {
                // Clear timeout and set auth ready
                clearTimeout(safetyTimer);
                setIsAuthReady(true);
            }
        });
        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, []);


    // --- Mock Data Fetching ---
    // Effect to load mock quotes when user is logged in
    const fetchUserQuotes = useCallback(async () => {
        if (user && !isAdmin) {
            if (quotesAbortController.current) quotesAbortController.current.abort();
            quotesAbortController.current = new AbortController();
            const signal = quotesAbortController.current.signal;

            const hasCache = !!sessionStorage.getItem(QUOTES_CACHE_KEY);
            if (!hasCache) {
                setGlobalLoading(true);
                setIsQuotesLoading(true);
            }

            try {
                if (signal.aborted) { setIsQuotesLoading(false); setGlobalLoading(false); return; }
                const fetchId = activeOrgOwnerId ?? user.id;
                const { data, error } = await quoteService.getQuotesByUser(fetchId);

                if (error) throw error;

                if (data && !signal.aborted) {
                    console.log('[App.tsx] Raw quotes from DB:', data.map((q: any) => ({ id: q.id, files: q.files })));
                    const transformedQuotes: QuoteRequest[] = data.map(transformRawQuote);
                    console.log('[App.tsx] Transformed quotes files:', transformedQuotes.map(q => ({ id: q.id, files: q.files })));
                    setQuoteRequests(transformedQuotes);
                    sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(transformedQuotes));

                    // Fetch CRM order mapping for accepted quotes
                    if (!signal.aborted) {
                        const { data: crmMappingData } = await supabase
                            .from('crm_orders')
                            .select('id, source_quote_id')
                            .eq('client_id', fetchId)
                            .not('source_quote_id', 'is', null);
                        if (!signal.aborted && crmMappingData) {
                            const map: Record<string, string> = {};
                            (crmMappingData as any[]).forEach(o => { if (o.source_quote_id) map[o.source_quote_id] = o.id; });
                            setCrmOrdersByQuoteId(map);
                        }
                    }
                }
            } catch (error: any) {
                // Always clear loading so the spinner doesn't get stuck — even on abort.
                setIsQuotesLoading(false);
                setGlobalLoading(false);
                if (error.name === 'AbortError' || signal.aborted) return;
                console.error("Error fetching quotes:", error);
                // Background fetches never surface raw errors as toasts — JWT expiry,
                // network hiccups, and RLS denials are all expected and handled silently.
                // Only user-initiated actions (submit, save, delete) show error toasts.
                return;
            }

            setIsQuotesLoading(false);
            setGlobalLoading(false);
        }
    }, [user, isAdmin, activeOrgOwnerId, showToast, setGlobalLoading]);

    // Keep prevQuoteStatusesRef in sync so the visibilitychange handler can diff changes
    useEffect(() => {
        const map = new Map<string, string>();
        quoteRequests.forEach(q => map.set(q.id, q.status));
        prevQuoteStatusesRef.current = map;
    }, [quoteRequests]);

    // Helper: transform a raw DB row into a QuoteRequest object
    // transformRawQuote is now imported from ./services/quoteMapper

    // Helper: build a short meta string for the quoted price
    const buildQuoteMeta = (responseDetails: any): string | undefined => {
        if (!responseDetails?.price) return undefined;
        const parts: string[] = [`$${responseDetails.price}/unit`];
        if (responseDetails.leadTime) parts.push(`${responseDetails.leadTime} lead`);
        return parts.join(' · ');
    };

    useEffect(() => {
        if (user && !isAdmin) {
            // Don't clear the cache — serve it immediately, fetch in background to update
            fetchUserQuotes();
        }
        return () => {
            if (quotesAbortController.current) quotesAbortController.current.abort();
        };
    }, [user, isAdmin, activeOrgOwnerId]);

    useEffect(() => {
        // Only refetch on page visit if we have no data — cache serves subsequent visits instantly
        if (user && !isAdmin && currentPage === 'myQuotes' && quoteRequests.length === 0) {
            fetchUserQuotes();
        }
    }, [currentPage]);

    // Flush page duration on tab hide / browser close
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && trackedPageRef.current && !isAdmin) {
                const duration_ms = Date.now() - pageEnterTimeRef.current;
                if (duration_ms > 1000) {
                    analyticsService.track('page_exit', { page: trackedPageRef.current, duration_ms });
                    // Reset so we don't double-count if the tab becomes visible again
                    pageEnterTimeRef.current = Date.now();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isAdmin]);

    // Prefetch all factory data during onboarding so both SourcingPage and FactoryDetailPage
    // render instantly on first sign-up. Uses a ref so the fetch fires exactly once and is
    // never cancelled — isNewUserSignup going false (on form complete) must NOT abort it.
    const FACTORY_CACHE_KEY = 'garment_erp_factories_v2';
    const onboardingPrefetchFired = useRef(false);
    useEffect(() => {
        if (!isNewUserSignup) return;
        if (onboardingPrefetchFired.current) return;

        onboardingPrefetchFired.current = true;

        // Fire-and-forget: no cleanup/cancellation — must complete even after nav to sourcing
        (async () => {
            try {
                const { data, error } = await supabase.from('factories').select(
                    'id,name,location,description,rating,turnaround,minimum_order_quantity,offer,cover_image_url,tags,certifications,specialties,trust_tier,completed_orders_count,on_time_delivery_rate,quality_rejection_rate'
                );
                if (error || !data) return;
                const factories: Factory[] = data.map((f: any) => ({
                    id: f.id, name: f.name, location: f.location, description: f.description,
                    rating: f.rating, turnaround: f.turnaround,
                    minimumOrderQuantity: f.minimum_order_quantity, offer: f.offer,
                    imageUrl: f.cover_image_url, gallery: [], tags: f.tags || [],
                    certifications: f.certifications || [], specialties: f.specialties || [],
                    productionLines: [], catalog: { products: [], fabricOptions: [] },
                    trustTier: (f.trust_tier as Factory['trustTier']) || 'unverified',
                    completedOrdersCount: f.completed_orders_count ?? 0,
                    onTimeDeliveryRate: f.on_time_delivery_rate ?? undefined,
                    qualityRejectionRate: f.quality_rejection_rate ?? undefined,
                }));
                // Cache the slim list for SourcingPage
                setCache(FACTORY_CACHE_KEY, factories);
            } catch {
                // Prefetch failure is non-critical — pages will fetch on mount as fallback
            }
        })();
    }, [isNewUserSignup]);


    // Effect to listen for real-time updates on quotes for the current user.
    // Notifications for admin→client events are created server-side by the
    // trg_notify_quote_update DB trigger and delivered via the notifications
    // realtime channel, so we only update local React state here.
    useEffect(() => {
        if (!user || isAdmin) return;

        const ownerId = activeOrgOwnerId ?? user.id;
        const channel = supabase.channel(`quotes-rt-${ownerId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'quotes',
            }, (payload) => {
                const raw = payload.new as any;
                if (raw.user_id !== ownerId) return;

                const tq = transformRawQuote(raw);

                // Capture previous status before updating state
                let prevStatus: string | undefined;
                setQuoteRequests(prev => {
                    prevStatus = prev.find(q => q.id === tq.id)?.status;
                    const next = prev.map(q => q.id === tq.id ? tq : q);
                    sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(next));
                    return next;
                });

                // Client-side notification fallback (guards against server trigger not running)
                // Only fire when status changes to an actionable state
                if (prevStatus !== undefined && prevStatus !== tq.status) {
                    const notifMap: Record<string, { title: string; message: string } | undefined> = {
                        'Responded':      { title: 'New Quote Received',             message: `${tq.factory?.name || 'A factory'} responded with pricing on your request.` },
                        'In Negotiation': { title: 'Counter-Offer Received',         message: `${tq.factory?.name || 'A factory'} sent a counter-offer. Review and respond.` },
                        'Admin Accepted': { title: 'Quote Accepted — Action Required', message: `${tq.factory?.name || 'A factory'}'s quote has been accepted. Please review and confirm.` },
                        'Declined':       { title: 'Quote Declined',                 message: `${tq.factory?.name || 'A factory'} declined your quote request.` },
                    };
                    const copy = notifMap[tq.status];
                    if (copy) {
                        const notifKey = `${tq.id}_${tq.status}`;
                        if (!clientFiredRFQNotifRef.current.has(notifKey)) {
                            // Dedup: skip if the DB trigger already delivered a notification for this quote+status
                            const alreadyInCache = notificationService.getCache().some(n =>
                                n.category === 'rfq' &&
                                n.action?.data?.id === tq.id &&
                                Date.now() - new Date(n.timestamp).getTime() < 15_000
                            );
                            if (!alreadyInCache) {
                                clientFiredRFQNotifRef.current.add(notifKey);
                                addNotification({
                                    category: 'rfq',
                                    title: copy.title,
                                    message: copy.message,
                                    imageUrl: tq.factory?.imageUrl,
                                    action: { page: 'quoteDetail', data: { id: tq.id } },
                                });
                            }
                        }
                    }
                }
            })
            .subscribe((status, err) => {
                if (err) console.error('[Realtime] quotes channel error:', err);
                else console.log('[Realtime] quotes channel status:', status);
            });

        return () => { supabase.removeChannel(channel); };
    }, [user, isAdmin, activeOrgOwnerId]);

    // Visibility-change fallback: re-fetch quotes when the tab becomes visible again
    // after being hidden for ≥30 s to keep local state current.
    // Missed notifications are already persisted by the DB trigger and will be
    // delivered by notificationService when the realtime channel reconnects.
    useEffect(() => {
        if (!user || isAdmin) return;

        const onHide = () => { tabHiddenAtRef.current = Date.now(); };
        const onShow = async () => {
            if (Date.now() - tabHiddenAtRef.current < 30_000) return;
            const { data } = await quoteService.getQuotesByUser(activeOrgOwnerId ?? user.id);
            if (!data) return;
            const transformed = data.map(transformRawQuote);
            setQuoteRequests(prev => {
                const prevById = new Map(prev.map(q => [q.id, q]));
                const next = transformed.map(fresh => {
                    const local = prevById.get(fresh.id);
                    if (!local) return fresh;
                    const localMs = local.modified_at ? new Date(local.modified_at).getTime() : 0;
                    const freshMs = fresh.modified_at ? new Date(fresh.modified_at).getTime() : 0;
                    return localMs > freshMs ? local : fresh;
                });
                sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(next));
                return next;
            });
        };

        const handleVisibility = () =>
            document.visibilityState === 'hidden' ? onHide() : onShow();

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [user, isAdmin, activeOrgOwnerId]);

    // Effect to listen for real-time CRM order updates for the current client.
    // Server-side filter removed (same REPLICA IDENTITY FULL requirement as quotes).
    // We use a local ref to diff old vs new since payload.old is unreliable without it.
    const prevCrmRef = useRef<Map<string, { status: string; tasksJson: string; riskScore?: string }>>(new Map());
    // Admin-side tracking refs (separate from client refs)
    const prevAdminQuoteMap = useRef<Map<string, { status: string; historyLen: number }>>(new Map());
    const prevAdminCrmRef = useRef<Map<string, { tasksJson: string; riskScore?: string }>>(new Map());
    const prevQuoteHistoryRef = useRef<Map<string, number>>(new Map()); // for client chat detection
    const clientFiredRFQNotifRef = useRef<Set<string>>(new Set()); // tracks "quoteId_status" to avoid duplicate client notifications
    const notifiedOverdueRef = useRef<Set<string>>(new Set()); // tracks which task IDs already got overdue notif

    useEffect(() => {
        if (!user || isAdmin) return;

        const ownerId = activeOrgOwnerId ?? user.id;
        const channel = supabase.channel(`crm-rt-${ownerId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'crm_orders',
            }, (payload) => {
                const updated = payload.new as any;
                if (updated.client_id !== ownerId) return;

                const prev = prevCrmRef.current.get(updated.id);
                const newTasksJson = JSON.stringify(updated.tasks || []);
                const orderLabel = updated.order_name || updated.product_name || 'your order';

                // Order status, task, and risk notifications are handled server-side
                // by trg_notify_crm_order_update. Only track state for milestone
                // confirmation/dispute feedback below.
                const statusChanged = !prev || updated.status !== prev.status;
                const newRiskScore = updated.risk_score;

                // Buyer confirmed / disputed (client confirming their own action — informational)
                if (prev?.tasksJson && newTasksJson !== prev.tasksJson) {
                    const oldTasks = JSON.parse(prev.tasksJson) as any[];
                    const newTasks = (updated.tasks || []) as any[];
                    const confirmedTask = newTasks.find((t: any) => {
                        const old = oldTasks.find((o: any) => o.id === t.id);
                        return old && !old.buyerConfirmedAt && t.buyerConfirmedAt;
                    });
                    const disputedTask = newTasks.find((t: any) => {
                        const old = oldTasks.find((o: any) => o.id === t.id);
                        return old && !old.buyerDisputed && t.buyerDisputed;
                    });
                    if (confirmedTask) {
                        addNotification({
                            category: 'approval',
                            title: 'Milestone Confirmed',
                            message: `You confirmed "${confirmedTask.name}" on "${orderLabel}".`,
                            action: { page: 'crm' },
                        });
                    }
                    if (disputedTask) {
                        addNotification({
                            category: 'task',
                            title: 'Milestone Dispute Raised',
                            message: `You raised a dispute on "${disputedTask.name}": ${disputedTask.disputeReason || 'No reason given'}.`,
                            action: { page: 'crm' },
                        });
                    }
                }

                prevCrmRef.current.set(updated.id, {
                    status: updated.status,
                    tasksJson: newTasksJson,
                    riskScore: newRiskScore,
                });
            })
            .subscribe((status, err) => {
                if (err) console.error('[Realtime] crm channel error:', err);
            });

        return () => { supabase.removeChannel(channel); };
    }, [user, isAdmin, activeOrgOwnerId, addNotification]);

    // Pre-seed admin diff maps so change-detection works from the very first realtime event
    useEffect(() => {
        if (!user || !isAdmin) return;

        supabase.from('quotes').select('id, status, negotiation_details').then(({ data }) => {
            if (!data) return;
            data.forEach((q: any) => {
                const history = q.negotiation_details?.history || [];
                prevAdminQuoteMap.current.set(q.id, { status: q.status, historyLen: history.length });
            });
        });

        supabase.from('crm_orders').select('id, tasks, risk_score').then(({ data }) => {
            if (!data) return;
            data.forEach((o: any) => {
                prevAdminCrmRef.current.set(o.id, {
                    tasksJson: JSON.stringify(o.tasks || []),
                    riskScore: o.risk_score,
                });
            });
        });
    }, [user, isAdmin]);

    // Effect to listen for new RFQ submissions (admin only)
    // Notification is delivered server-side by trg_notify_admin_on_quote_insert;
    // this subscription just fires the in-app toast for immediate feedback.
    useEffect(() => {
        if (!user || !isAdmin) return;

        const channel = supabase.channel('admin-new-rfq')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'quotes',
            }, (payload) => {
                const newQuote = payload.new as any;
                if (newQuote.created_at > lastAdminRFQAtRef.current) {
                    lastAdminRFQAtRef.current = newQuote.created_at;
                }
                showToast('New RFQ request received!');
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, isAdmin]);

    // ── Admin: quote UPDATE subscription — keep diff map in sync ──────────────
    // Persistent notifications are delivered server-side by trg_notify_admin_on_quote_update.
    // This subscription only keeps prevAdminQuoteMap current so the AdminRFQPage
    // unread-detection logic can diff correctly.
    useEffect(() => {
        if (!user || !isAdmin) return;

        const channel = supabase.channel('admin-quote-updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'quotes',
            }, (payload) => {
                const raw = payload.new as any;
                const history: any[] = raw.negotiation_details?.history || [];
                prevAdminQuoteMap.current.set(raw.id, { status: raw.status, historyLen: history.length });
            })
            .subscribe((status, err) => {
                if (err) console.error('[Realtime] admin-quote channel error:', err);
            });

        return () => { supabase.removeChannel(channel); };
    }, [user, isAdmin]);

    // ── Admin: CRM order UPDATE subscription — risk alerts only ─────────────
    // Buyer confirmed/disputed notifications are handled by the DB trigger
    // (trg_notify_admin_on_crm_action). This subscription only handles risk
    // score escalation (no DB trigger for that) and keeps prevAdminCrmRef in sync.
    useEffect(() => {
        if (!user || !isAdmin) return;

        const channel = supabase.channel('admin-crm-updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'crm_orders',
            }, (payload) => {
                const updated = payload.new as any;
                const prev = prevAdminCrmRef.current.get(updated.id);
                const newTasksJson = JSON.stringify(updated.tasks || []);
                const orderLabel = updated.order_name || updated.product_name || 'an order';

                // Risk score escalation — not in DB trigger, keep here
                const newRiskScore = updated.risk_score;
                if (newRiskScore && newRiskScore !== prev?.riskScore) {
                    if (newRiskScore === 'red') {
                        addNotification({
                            category: 'crm',
                            title: 'Critical Risk Alert',
                            message: `"${orderLabel}" is critically at risk. Review and act immediately.`,
                            action: { page: 'adminCRM', data: { orderId: updated.id } },
                        });
                    } else if (newRiskScore === 'amber') {
                        addNotification({
                            category: 'crm',
                            title: 'Risk Alert: Timeline Slipping',
                            message: `"${orderLabel}" has a schedule risk. Review milestones.`,
                            action: { page: 'adminCRM', data: { orderId: updated.id } },
                        });
                    }
                }

                prevAdminCrmRef.current.set(updated.id, { tasksJson: newTasksJson, riskScore: newRiskScore });
            })
            .subscribe((status, err) => {
                if (err) console.error('[Realtime] admin-crm channel error:', err);
            });

        return () => { supabase.removeChannel(channel); };
    }, [user, isAdmin, addNotification]);

    // ── Admin: periodic overdue task scan (every 5 min) ───────────────────────
    useEffect(() => {
        if (!user || !isAdmin) return;

        const checkOverdueTasks = async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from('crm_orders')
                .select('id, order_name, product_name, tasks')
                .in('status', ['Pending', 'In Production', 'Quality Check']);
            if (!data) return;

            data.forEach((order: any) => {
                const orderLabel = order.order_name || order.product_name || 'an order';
                (order.tasks || []).forEach((task: any) => {
                    if (
                        task.status !== 'COMPLETE' &&
                        task.plannedEndDate &&
                        task.plannedEndDate < today &&
                        !notifiedOverdueRef.current.has(String(task.id))
                    ) {
                        notifiedOverdueRef.current.add(String(task.id));
                        addNotification({
                            category: 'task',
                            title: 'Task Overdue',
                            message: `"${task.name}" on "${orderLabel}" was due ${task.plannedEndDate} and is still ${task.status}.`,
                            action: { page: 'adminCRM', data: { orderId: order.id } },
                        });
                    }
                });
            });
        };

        checkOverdueTasks();
        const id = setInterval(checkOverdueTasks, 5 * 60_000);
        return () => clearInterval(id);
    }, [user, isAdmin, addNotification]);

    // ── Polling fallback: quote state sync (client, every 45 s) ─────────────
    // Route guard: redirect non-admin users away from admin pages.
    // Runs as a side-effect so it never calls setState during render.
    useEffect(() => {
        if (!isAuthReady || !user) return;
        const adminRoutes = ['adminDashboard', 'adminUsers', 'adminFactories', 'adminRFQ',
            'adminCRM', 'adminTrending', 'adminLoginSettings', 'adminUserAnalytics'];
        if (!isAdmin && adminRoutes.includes(currentPage)) {
            handleSetCurrentPage('sourcing');
        }
    }, [isAuthReady, user, isAdmin, currentPage]);

    // Keeps local quote state fresh when realtime misses events.
    // Notifications are now handled server-side by trg_notify_quote_update.
    useEffect(() => {
        if (!user || isAdmin) return;
        const poll = async () => {
            const { data } = await quoteService.getQuotesByUser(activeOrgOwnerId ?? user.id);
            if (!data) return;
            const transformed = data.map(transformRawQuote);
            setQuoteRequests(prev => {
                const prevById = new Map(prev.map(q => [q.id, q]));
                const next = transformed.map(fresh => {
                    const local = prevById.get(fresh.id);
                    if (!local) return fresh;
                    const localMs = local.modified_at ? new Date(local.modified_at).getTime() : 0;
                    const freshMs = fresh.modified_at ? new Date(fresh.modified_at).getTime() : 0;
                    return localMs > freshMs ? local : fresh;
                });
                sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(next));
                return next;
            });
        };
        const id = setInterval(poll, 45_000);
        return () => clearInterval(id);
    }, [user, isAdmin, activeOrgOwnerId]);

    // ── Polling fallback: CRM order state sync (client, every 45 s) ──────────
    // Keeps prevCrmRef fresh for milestone-confirmation diffing.
    // Notifications are now handled server-side by trg_notify_crm_order_update.
    useEffect(() => {
        if (!user || isAdmin) return;
        const poll = async () => {
            const { data } = await crmService.getOrdersByClient(user.id);
            if (!data) return;
            data.forEach((order: any) => {
                const newTasksJson = JSON.stringify(order.tasks || []);
                prevCrmRef.current.set(order.id, { status: order.status, tasksJson: newTasksJson });
            });
        };
        const id = setInterval(poll, 45_000);
        return () => clearInterval(id);
    }, [user, isAdmin]);

    // ── Polling fallback: new RFQ submissions (admin, every 45 s) ────────────
    // Note: admin new-RFQ notifications are handled by the realtime subscription above (admin-new-rfq channel).
    // Polling was removed — it fetched ALL quotes every 45 s, which is wasteful and redundant.

    // --- Authentication & Profile Functions ---

    // Helper function to validate session with timeout to prevent hanging
    const validateSessionWithTimeout = useCallback(async (timeoutMs: number = 5000): Promise<{ valid: boolean; session: any }> => {
        try {
            const timeoutPromise = new Promise<{ valid: false; session: null }>((resolve) => {
                setTimeout(() => resolve({ valid: false, session: null }), timeoutMs);
            });

            const sessionPromise = (async () => {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session) {
                    return { valid: false, session: null };
                }
                return { valid: true, session };
            })();

            return await Promise.race([sessionPromise, timeoutPromise]);
        } catch (err) {
            console.error('Session validation error:', err);
            return { valid: false, session: null };
        }
    }, []);

    // Proactive session refresh to keep token fresh during active sessions
    useEffect(() => {
        if (!user) return;

        const REFRESH_INTERVAL = 10 * 60 * 1000; // Refresh every 10 minutes during active use

        const refreshSession = async () => {
            try {
                const { data, error } = await supabase.auth.refreshSession();
                if (error) {
                    console.warn('Session refresh failed:', error.message);
                    // Don't force logout here - let the next action trigger proper session check
                }
            } catch (err) {
                console.error('Session refresh error:', err);
            }
        };

        const intervalId = setInterval(refreshSession, REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [user]);

    // Function to handle user sign out
    const handleAcceptInvite = useCallback(async () => {
        if (!pendingInvitation || !user) return;
        setAcceptingInvite(true);
        try {
            const { error: memberErr } = await supabase
                .from('organization_members')
                .upsert({
                    org_id: pendingInvitation.orgId,
                    user_id: user.id,
                    role: pendingInvitation.role,
                    permissions: pendingInvitation.permissions,
                    status: 'active',
                    invited_by: pendingInvitation.invitedBy,
                }, { onConflict: 'org_id,user_id' });

            if (memberErr) {
                showToast('Failed to join organization: ' + memberErr.message, 'error');
                return;
            }

            await supabase.from('invitations').update({ status: 'accepted' }).eq('id', pendingInvitation.id);
            localStorage.setItem('garment_erp_active_org', pendingInvitation.orgId);
            setPendingInvitation(null);
            showToast(`You've joined ${pendingInvitation.orgName} successfully!`);
            setTimeout(() => window.location.reload(), 800);
        } finally {
            setAcceptingInvite(false);
        }
    }, [pendingInvitation, user]);

    const handleDeclineInvite = useCallback(async () => {
        if (!pendingInvitation) return;
        await supabase.from('invitations').update({ status: 'revoked' }).eq('id', pendingInvitation.id);
        setPendingInvitation(null);
        showToast('Invitation declined.');
    }, [pendingInvitation]);

    const handleSignOut = useCallback(async (skipConfirmation = false) => {
        if (!skipConfirmation && !window.confirm("Are you sure you want to log out?")) return;
        try {
            // Sign out from Supabase to terminate the session with a timeout to prevent hanging
            const signOutPromise = supabase.auth.signOut({ scope: 'global' });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timed out')), 2000));
            await Promise.race([signOutPromise, timeoutPromise]);
        } catch (error) {
            console.error("Sign out error:", error);
        } finally {
            // Clear all user-related state
            setUser(null);
            setUserProfile(null);
            setIsAdmin(false);

            // Clear session-related localStorage items (preserve user preferences like dark mode)
            localStorage.removeItem('garment_erp_last_page');
            localStorage.removeItem('garment_erp_last_activity');

            // Clear all session storage to prevent data leaks between users
            sessionStorage.clear();

            // Clear AI chat state
            setAiMessages([{ text: "Hello! I'm Auctave Brain. How can I help you today?\n\nI can help you find factories, check your order status, answer platform questions, or start a new order.", sender: 'ai' }]);
            setAiChatOpen(false);
            setAiActiveTab('ai');

            // Navigate to login page
            setCurrentPage('login');

            // Show success notification
            showToast('You have been logged out successfully.', 'success');
        }
    }, [showToast]);

    // Session Timeout Logic - Only expires after 15 minutes of complete inactivity
    useEffect(() => {
        if (!user) return;

        const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes of inactivity
        const LAST_ACTIVITY_KEY = 'garment_erp_last_activity';
        const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh Supabase session every 5 minutes

        const handleInactivity = () => {
            showToast('Session timed out due to inactivity.', 'error');
            handleSignOut(true);
            localStorage.removeItem(LAST_ACTIVITY_KEY);
        };

        const checkActivity = () => {
            const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now().toString(), 10);
            if (Date.now() - lastActivity > TIMEOUT_DURATION) {
                handleInactivity();
            }
        };

        const updateActivity = async () => {
            const now = Date.now();
            const lastSaved = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);

            // Update activity timestamp (throttled to once per 5 seconds)
            if (now - lastSaved > 5000) {
                localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());

                // Refresh Supabase session token periodically to keep it alive
                if (now - lastSaved > SESSION_REFRESH_INTERVAL) {
                    try {
                        await supabase.auth.refreshSession();
                    } catch (err) {
                        console.error('Failed to refresh session:', err);
                    }
                }
            }
        };

        // Initialize if missing
        if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
            localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        }

        const intervalId = setInterval(checkActivity, 10000); // Check every 10 seconds

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, updateActivity));

        return () => {
            clearInterval(intervalId);
            events.forEach(event => window.removeEventListener(event, updateActivity));
        };
    }, [user, handleSignOut, showToast]);

    // Session validation on page visibility change - only validate if user has been inactive
    useEffect(() => {
        const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes
        const LAST_ACTIVITY_KEY = 'garment_erp_last_activity';

        const validateSessionIfInactive = async () => {
            // Check if user has been inactive for more than the timeout duration
            const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now().toString(), 10);
            const inactiveTime = Date.now() - lastActivity;

            // Only validate Supabase session if user has been inactive for a while
            // This prevents abrupt logouts when switching tabs during active use
            if (inactiveTime > TIMEOUT_DURATION) {
                const { valid } = await validateSessionWithTimeout(5000);
                if (!valid && user) {
                    showToast('Your session has expired. Please log in again.', 'error');
                    handleSignOut(true);
                }
            } else {
                // User is still active, just refresh the session to keep it alive
                try {
                    await supabase.auth.refreshSession();
                } catch (err) {
                    console.error('Failed to refresh session on focus:', err);
                }
            }
        };

        // Validate session when tab becomes visible (only if inactive)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                validateSessionIfInactive();
            }
        };

        // Validate session on page focus (only if inactive)
        const handleFocus = () => {
            if (user) {
                validateSessionIfInactive();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, handleSignOut, showToast, validateSessionWithTimeout]);

    // Function to save or update user profile in Supabase
    const saveUserProfile = async (profileData: Partial<UserProfile>) => {
        if (!user) return;

        // Optimistic update: transition to the platform immediately so it renders
        // during the hello splash animation (no wait time after the splash).
        setUserProfile(prev => ({ ...prev, ...profileData } as UserProfile));
        setIsNewUserSignup(false);
        if (user) localStorage.removeItem(`garment_new_signup_${user.id}`);
        handleSetCurrentPage(isAdmin ? 'adminDashboard' : 'sourcing');

        // Persist to DB in the background while the platform is already loading
        // Include avatar_url: use explicitly set value, or fall back to Google/OAuth picture
        const avatarToSave = profileData.avatarUrl
            || user.user_metadata?.avatar_url
            || user.user_metadata?.picture
            || undefined;

        const updates: Record<string, any> = {
            id: user.id,
            name: profileData.name,
            company_name: profileData.companyName,
            phone: profileData.phone,
            email: profileData.email,
            country: profileData.country,
            job_role: profileData.jobRole,
            category_specialization: profileData.categorySpecialization,
            yearly_est_revenue: profileData.yearlyEstRevenue,
            website: profileData.website || null,
            vat_number: profileData.vatNumber || null,
            business_reg_number: profileData.businessRegNumber || null,
            business_type: profileData.businessType || null,
            billing_address: (profileData.billingStreet || profileData.billingCity || profileData.billingPostal)
                ? JSON.stringify({ street: profileData.billingStreet || '', city: profileData.billingCity || '', state: profileData.billingState || '', postal: profileData.billingPostal || '', country: profileData.billingCountry || '' })
                : (profileData.billingAddress || null),
            company_address: (profileData.companyStreet || profileData.companyCity || profileData.companyPostal)
                ? JSON.stringify({ street: profileData.companyStreet || '', city: profileData.companyCity || '', state: profileData.companyState || '', postal: profileData.companyPostal || '', country: profileData.companyCountry || '' })
                : (profileData.companyAddress || null),
            updated_at: new Date().toISOString(),
        };
        if (avatarToSave) updates.avatar_url = avatarToSave;

        const tableName = isAdmin ? 'admins' : 'clients';
        const { error } = await supabase.from(tableName).upsert(updates);

        if (error) {
            console.error("Profile save error:", error);
            const msg = (error.message.includes("Could not find the table") || error.code === '42P01')
                ? `Setup Error: '${tableName}' table missing. Run the SQL script in Supabase.`
                : error.message;
            showToast(msg, 'error');
        }
    };

    // --- Quote Request Functions ---
    
    // Function to submit a quote request to Supabase
    // Returns true on success, false on failure
    const submitQuoteRequest = async (quoteData: { factory?: { id: string; name: string; location: string; imageUrl: string }, order: OrderFormData, filesPerProduct?: File[][] }): Promise<boolean> => {
        showToast('Submitting quote request...', 'success');
        try {
            // Check if session is valid before submitting (with timeout to prevent hanging)
            const { valid, session } = await validateSessionWithTimeout(5000);
            if (!valid || !session) {
                showToast('Your session has expired. Please log in again.', 'error');
                handleSignOut(true);
                return false;
            }

            const uploadedFilePaths: string[] = [];

            // 1. Upload Files to Supabase Storage (per product subfolder for grouping)
            if (quoteData.filesPerProduct && quoteData.filesPerProduct.length > 0) {
                for (let productIndex = 0; productIndex < quoteData.filesPerProduct.length; productIndex++) {
                    const productFiles = quoteData.filesPerProduct[productIndex] || [];
                    for (const file of productFiles) {
                        try {
                            // Path: userId/product_{index}/timestamp_filename
                            const filePath = `${user.id}/product_${productIndex}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

                            const { data, error } = await supabase.storage
                                .from('quote-attachments')
                                .upload(filePath, file);

                            if (error) throw error;
                            if (data) uploadedFilePaths.push(data.path);
                        } catch (error: any) {
                            console.error('File upload error:', error);
                            showToast(`Failed to upload ${file.name}: ${error.message}`, 'error');
                        }
                    }
                }
            }

            const payload = {
                user_id: user.id,
                factory_id: quoteData.factory?.id || null,
                factory_data: quoteData.factory || null,
                order_details: quoteData.order,
                status: 'Pending',
                files: uploadedFilePaths
            };

            // Create the quote record
            const { data: createdQuote, error } = await quoteService.create(payload);

            if (error) throw error;
            if (!createdQuote) throw new Error('No data returned from create');

            // Immediately add the new quote to state so it shows up right away
            const newQuote: QuoteRequest = transformRawQuote(createdQuote);

            // Add to existing quotes and update state immediately
            setQuoteRequests(prevQuotes => {
                const updatedQuotes = [newQuote, ...prevQuotes];
                sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(updatedQuotes));
                return updatedQuotes;
            });

            showToast('Quote request submitted successfully!');
            addNotification({
                category: 'order',
                title: 'Quote Request Submitted',
                message: `Your quote request has been sent. You'll be notified when factories respond.`,
                action: { page: 'myQuotes' },
            });
            // Navigation is handled by OrderFormPage after showing success animation
            return true;
        } catch (error: any) {
            console.error('Submit quote error:', error);
            showToast('Failed to submit quote: ' + (error.message || 'Unknown error'), 'error');
            return false;
        }
    };

    // Returns true on success, false on failure
    const addToQuoteRequest = async (quoteId: string, newOrderDetails: OrderFormData, filesPerProduct: File[][]): Promise<boolean> => {
        showToast('Adding to quote request...', 'success');
        try {
            // Check if session is valid before submitting (with timeout to prevent hanging)
            const { valid, session } = await validateSessionWithTimeout(5000);
            if (!valid || !session) {
                showToast('Your session has expired. Please log in again.', 'error');
                handleSignOut(true);
                return false;
            }

            setGlobalLoading(true);
            const { data: existingQuote, error: fetchError } = await quoteService.getQuoteById(quoteId);
            if (fetchError) throw fetchError;
            if (!existingQuote) throw new Error("Quote not found");

            const uploadedFilePaths: string[] = [];
            if (filesPerProduct && filesPerProduct.length > 0) {
                for (let productIndex = 0; productIndex < filesPerProduct.length; productIndex++) {
                    const productFiles = filesPerProduct[productIndex] || [];
                    for (const file of productFiles) {
                        const filePath = `${user.id}/product_${productIndex}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                        const { data, error } = await supabase.storage
                            .from('quote-attachments')
                            .upload(filePath, file);
                        if (error) throw error;
                        if (data) uploadedFilePaths.push(data.path);
                    }
                }
            }

            // The form now contains the complete set of line items (existing modified + new),
            // so we use them directly instead of appending.
            const updatedOrderDetails = {
                ...existingQuote.order_details,
                lineItems: newOrderDetails.lineItems,
            };

            const existingFiles = existingQuote.files || [];
            const combinedFiles = [...existingFiles, ...uploadedFilePaths];

            const newStatus = ['Accepted', 'Declined'].includes(existingQuote.status) ? 'In Negotiation' : existingQuote.status;

            const { error: updateError } = await quoteService.update(quoteId, {
                order_details: updatedOrderDetails,
                files: combinedFiles,
                status: newStatus,
                modification_count: (existingQuote.modification_count || 0) + 1,
                modified_at: new Date().toISOString(),
            });

            if (updateError) throw updateError;

            showToast('Successfully added to quote request!');
            await fetchUserQuotes();
            // Navigation is handled by OrderFormPage after showing success animation
            return true;
        } catch (error: any) {
            console.error('Add to quote error:', error);
            showToast('Failed to add to quote: ' + (error.message || 'Unknown error'), 'error');
            return false;
        } finally {
            setGlobalLoading(false);
        }
    };

    // --- Gemini API Call (Live) ---
    
    // Function to call the Gemini AI API via Supabase Edge Function or Direct API
    const callGeminiAPI = async (prompt: string): Promise<string> => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        // 1. Try Direct Client-Side Call if API Key is present (Fastest for prototyping)
        if (apiKey) {
            try {
                console.log("Calling Gemini API (gemini-2.5-flash)...");
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (typeof text === 'string') {
                    return text;
                } else {
                    throw new Error('Invalid response format from Gemini API');
                }
            } catch (error: any) {
                console.error("Direct Gemini API call failed:", error);
                showToast(`AI Error: ${error.message}`, 'error');
                return `Error generating summary: ${error.message}`;
            }
        }

        // 2. Fallback to Supabase Edge Function (Secure production method)
        try {
            // Securely call the Gemini API via a Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('gemini-api', {
                body: { prompt },
            });

            if (error) {
                throw new Error(error.message);
            }

            if (data.error) {
                throw new Error(data.error);
            }
            
            if (typeof data.text === 'string') {
                return data.text;
            } else {
                throw new Error('Received invalid response from AI function.');
            }

        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred.';
            console.error("Error calling Gemini API function:", errorMessage);
            
            if (errorMessage.includes("Failed to send a request")) {
                showToast("Edge Function not deployed. Add VITE_GEMINI_API_KEY to .env.local to run locally.", "error");
                return "Configuration Error: Please add VITE_GEMINI_API_KEY to your .env.local file or deploy the 'gemini-api' Edge Function.";
            }

            showToast(`Error: ${errorMessage}`, 'error');
            return `Error calling AI function: ${errorMessage}`;
        }
    };

    // --- App Feature Functions ---
    // This is now fetched from Supabase in SourcingPage.tsx
    // We keep it here for other pages that haven't been refactored yet.
    const [allFactories, setAllFactories] = useState<Factory[]>([]);

    // Function to handle order form submission
    // Returns true on success, false on failure
    const handleSubmitOrderForm = async (submittedData: OrderFormData, filesPerProduct: File[][]): Promise<boolean> => {
        setOrderFormData(submittedData);
        setUploadedFiles(filesPerProduct.flat());

        return await submitQuoteRequest({
            factory: selectedFactory ? {
                id: selectedFactory.id,
                name: selectedFactory.name,
                location: selectedFactory.location,
                imageUrl: selectedFactory.imageUrl,
            } : undefined,
            order: submittedData,
            filesPerProduct
        });
    };

    // Function to handle factory selection
    const handleSelectFactory = (factory: Factory) => {
        setSelectedFactory(factory);
        analyticsService.track('factory_view', {
            factory_id: factory.id,
            factory_name: factory.name,
            factory_location: factory.location,
            factory_trust_tier: factory.trustTier,
        });
        // Reset AI states for new factory
        setContractBrief(''); setOutreachEmail(''); setOptimizationSuggestions(''); setNegotiationTips('');
        handleSetCurrentPage('factoryDetail', factory);
    };

    // --- Gemini Feature Functions ---
    
    // Function to generate a contract brief using AI
    const generateContractBrief = async () => { setIsLoadingBrief(true); const prompt = `Generate a concise, professional contract brief for a garment manufacturing request with these specs: ${orderFormData.lineItems.map(item => `Category: ${item.category}, Fabric: ${item.fabricQuality}, Weight: ${item.weightGSM} GSM, Style: ${item.styleOption}, Quantity: ${item.qty} units`).join('; ')}. The brief should be suitable for an initial inquiry to ${selectedFactory?.name}.`; try { setContractBrief(await callGeminiAPI(prompt)); } catch (error) { showToast('Error generating brief: ' + (error as Error).message, 'error'); } finally { setIsLoadingBrief(false); } };
    // Function to suggest optimizations using AI
    const suggestOptimizations = async () => { setIsLoadingOptimizations(true); const prompt = `For a garment order with items: ${orderFormData.lineItems.map(item => `(${item.category}, ${item.fabricQuality}, ${item.weightGSM} GSM)`).join(', ')}, suggest material or process optimizations for cost-efficiency, sustainability, or quality, keeping in mind we are contacting ${selectedFactory?.name} in ${selectedFactory?.location}. Format as a bulleted list.`; try { setOptimizationSuggestions(await callGeminiAPI(prompt)); } catch (error) { showToast('Error suggesting optimizations: ' + (error as Error).message, 'error'); } finally { setIsLoadingOptimizations(false); } };
    // Function to draft an outreach email using AI
    const generateOutreachEmail = async () => { if (!contractBrief || !selectedFactory || !userProfile) { showToast('Please generate a brief first.', 'error'); return; } setIsLoadingEmail(true); const prompt = `Draft a professional outreach email from ${userProfile.name} of ${userProfile.companyName} to ${selectedFactory.name}. The email should introduce the company and the order, referencing the attached contract brief. Keep it concise and aim to start a conversation. The contract brief is as follows:\n\n---\n${contractBrief}\n---`; try { setOutreachEmail(await callGeminiAPI(prompt)); } catch (error) { showToast('Error drafting email: ' + (error as Error).message, 'error'); } finally { setIsLoadingEmail(false); } };
    // Function to fetch market trends using AI
    const getMarketTrends = async () => { setIsLoadingTrends(true); const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); const prompt = `As a fashion industry analyst, provide a brief summary of key market trends in global garment manufacturing for ${date}. Focus on sustainability, technology, and consumer behavior. Format as a bulleted list.`; try { setMarketTrends(await callGeminiAPI(prompt)); } catch (error) { setMarketTrends('Error fetching market trends: ' + (error as Error).message); showToast('Error fetching market trends.', 'error'); } finally { setIsLoadingTrends(false); } };
    // Function to get negotiation tips using AI
    const getNegotiationTips = async () => { if (!selectedFactory) return; setIsLoadingNegotiation(true); const prompt = `As a sourcing expert, provide key negotiation points and cultural tips for an upcoming discussion with ${selectedFactory.name} in ${selectedFactory.location} regarding an order of ${orderFormData.lineItems.length} line items (Total Qty: ${orderFormData.lineItems.reduce((acc, item) => acc + (item.qty || 0), 0)}). Focus on pricing strategies, payment terms, and quality assurance questions. Format as a bulleted list with bold headings.`; try { setNegotiationTips(await callGeminiAPI(prompt)); } catch(error) { setNegotiationTips('Error fetching negotiation tips: ' + (error as Error).message); showToast('Error fetching negotiation tips.', 'error'); } finally { setIsLoadingNegotiation(false); } };

    // Props to be passed to the MainLayout component
    const layoutProps = {
        pageKey,
        user,
        userProfile,
        currentPage,
        isMenuOpen,
        isSidebarCollapsed,
        toggleMenu,
        setIsSidebarCollapsed,
        handleSetCurrentPage,
        handleSignOut,
        isAdmin,
    quoteRequests,
        supabase,
        darkMode,
        globalLoading: loadingCount > 0,
        setGlobalLoading
    };

    // --- Sub-Components ---

    // Component for creating a password (for new admins)
    const CreatePasswordPage: FC = () => {
        const [newPassword, setNewPassword] = useState('');
        const [confirmPassword, setConfirmPassword] = useState('');
        const [loading, setLoading] = useState(false);

        const handleSavePassword = async (e: React.FormEvent) => {
            e.preventDefault();
            if (newPassword !== confirmPassword) {
                showToast("Passwords do not match.", "error");
                return;
            }
            if (newPassword.length < 6) {
                showToast("Password must be at least 6 characters.", "error");
                return;
            }
            setLoading(true);
            // Update user password in Supabase
            const { error } = await supabase.auth.updateUser({ 
                password: newPassword,
                data: { password_set: true }
            });
            setLoading(false);
            if (error) {
                showToast(error.message, "error");
            } else {
                showToast("Password set successfully! You can now login with password.", "success");
                handleSetCurrentPage('adminDashboard');
            }
        };

        return (
            <div className="min-h-screen bg-gray-25 dark:bg-black flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-8 w-full max-w-md">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Lock className="w-6 h-6 text-[var(--color-primary)]" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Create New Password</h2>
                    </div>
                    <p className="text-gray-600 mb-6">
                        Since this is your first time signing in (or you used a one-time code), please set a secure password for future logins.
                    </p>
                    <form onSubmit={handleSavePassword} className="space-y-4">
                        <div> <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label> <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" /> </div>
                        <div> <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label> <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" /> </div>
                        <button type="submit" disabled={loading} className="w-full bg-[var(--color-primary)] text-white font-bold py-3 px-4 rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-70"> {loading ? 'Saving...' : 'Create Password'} </button>
                    </form>
                </div>
            </div>
        );
    };

    // Component for editing user profile (dashboard view — existing users only)
    const ProfilePage: FC = () => {
        const fileRef = useRef<HTMLInputElement>(null);
        const [profileData, setProfileData] = useState<Partial<UserProfile>>({
            name: userProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
            companyName: userProfile?.companyName || '',
            phone: userProfile?.phone || '',
            email: user?.email || '',
            country: userProfile?.country || '',
            jobRole: userProfile?.jobRole || '',
            categorySpecialization: userProfile?.categorySpecialization || '',
            yearlyEstRevenue: userProfile?.yearlyEstRevenue || '',
            website: userProfile?.website || '',
            vatNumber: userProfile?.vatNumber || '',
            businessRegNumber: userProfile?.businessRegNumber || '',
            businessType: userProfile?.businessType || '',
            billingAddress: userProfile?.billingAddress || '',
            companyAddress: userProfile?.companyAddress || '',
            billingStreet: userProfile?.billingStreet || '',
            billingCity: userProfile?.billingCity || '',
            billingState: userProfile?.billingState || '',
            billingPostal: userProfile?.billingPostal || '',
            billingCountry: userProfile?.billingCountry || '',
            companyStreet: userProfile?.companyStreet || '',
            companyCity: userProfile?.companyCity || '',
            companyState: userProfile?.companyState || '',
            companyPostal: userProfile?.companyPostal || '',
            companyCountry: userProfile?.companyCountry || '',
        });
        const [avatarUrl, setAvatarUrl] = useState<string>(
            // DB value is authoritative; fall back to auth metadata if not yet synced
            userProfile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
        );
        const [avatarUploading, setAvatarUploading] = useState(false);
        const [repoSrc, setRepoSrc] = useState<string | null>(null);
        const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

        // Sync avatar from clients table on mount — user_metadata can lag behind
        useEffect(() => {
            if (!user || isAdmin) return;
            supabase
                .from('clients')
                .select('avatar_url')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data?.avatar_url) setAvatarUrl(data.avatar_url);
                });
        }, []);
        const [tags, setTags] = useState<string[]>(
            (userProfile?.categorySpecialization || '')
                .split(',').map((t: string) => t.trim()).filter(Boolean)
        );
        const [tagInput, setTagInput] = useState('');

        const PREDEFINED_CATEGORIES = [
            'Activewear & Sportswear', 'Denim & Bottoms', 'Tops & Shirts',
            'Outerwear & Jackets', 'Swimwear & Beachwear', 'Intimates & Loungewear',
            'Formal & Suiting', 'Kidswear & Babywear', 'Knitwear & Sweaters',
            'Athleisure', 'Accessories', 'Footwear', 'Workwear',
            'Sustainable Fashion', 'Luxury & Couture', 'Casual & Streetwear',
        ];

        const countries = [
            'Afghanistan', 'Australia', 'Bangladesh', 'Belgium', 'Brazil', 'Cambodia',
            'Canada', 'China', 'Colombia', 'Denmark', 'Egypt', 'France', 'Germany',
            'Ghana', 'Hong Kong', 'India', 'Indonesia', 'Italy', 'Japan', 'Malaysia',
            'Mexico', 'Morocco', 'Myanmar', 'Netherlands', 'Pakistan', 'Philippines',
            'Portugal', 'Saudi Arabia', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden',
            'Taiwan', 'Thailand', 'Turkey', 'United Arab Emirates', 'United Kingdom',
            'United States of America', 'Vietnam', 'Other',
        ];
        const jobRoles = ['Owner / Founder', 'CEO / President', 'Sourcing Manager', 'Product Manager', 'Designer / Creative Director', 'Supply Chain Manager', 'Brand Manager', 'Buyer', 'Other'];

        const initials = (profileData.name || user?.email || '?')
            .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

        const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setProfileData(p => ({ ...p, [field]: e.target.value }));

        const formatClientId = (uuid: string, createdAt?: string): string => {
            const date = createdAt ? new Date(createdAt) : new Date();
            const yy = String(date.getFullYear()).slice(-2);
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const hex = uuid.replace(/-/g, '').slice(0, 4).toUpperCase();
            return `CLT-${yy}${mm}-${hex}`;
        };

        const [postalLoading, setPostalLoading] = useState<{ billing: boolean; company: boolean }>({ billing: false, company: false });
        const billingPostalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
        const companyPostalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

        const lookupPostal = async (postal: string, type: 'billing' | 'company') => {
            if (postal.length < 3) return;
            setPostalLoading(p => ({ ...p, [type]: true }));
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postal)}&format=json&addressdetails=1&limit=1`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                if (!data.length) { setPostalLoading(p => ({ ...p, [type]: false })); return; }
                const addr = data[0].address;
                const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
                const state = addr.state || addr.region || addr.county || '';
                const country = addr.country || '';
                if (type === 'billing') {
                    setProfileData(p => ({ ...p, billingCity: city || p.billingCity, billingState: state || p.billingState, billingCountry: country || p.billingCountry }));
                } else {
                    setProfileData(p => ({ ...p, companyCity: city || p.companyCity, companyState: state || p.companyState, companyCountry: country || p.companyCountry }));
                }
            } catch { /* silent */ }
            setPostalLoading(p => ({ ...p, [type]: false }));
        };

        const handlePostalChange = (value: string, type: 'billing' | 'company') => {
            const field = type === 'billing' ? 'billingPostal' : 'companyPostal';
            setProfileData(p => ({ ...p, [field]: value }));
            const timerRef = type === 'billing' ? billingPostalTimer : companyPostalTimer;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => lookupPostal(value, type), 700);
        };

        const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Load at larger resolution so reposition modal has room to pan/zoom
            const large = await resizeImage(file, 1200);
            setRepoSrc(large);
            e.target.value = '';
        };

        const handleAvatarConfirm = async (croppedUrl: string) => {
            setRepoSrc(null);
            setAvatarMenuOpen(false);
            setAvatarUrl(croppedUrl);
            setAvatarUploading(true);
            try {
                const { error: metaError } = await supabase.auth.updateUser({ data: { avatar_url: croppedUrl } });
                if (metaError) console.error('Avatar metadata save failed:', metaError.message);
                if (user && !isAdmin) {
                    const { error: dbError } = await supabase
                        .from('clients')
                        .update({ avatar_url: croppedUrl })
                        .eq('id', user.id);
                    if (dbError) {
                        showToast('Picture saved locally but DB sync failed: ' + dbError.message, 'error');
                        return;
                    }
                }
                showToast('Profile picture updated!');
            } catch (err: any) {
                showToast('Failed to update picture: ' + (err?.message || 'Unknown error'), 'error');
            } finally {
                setAvatarUploading(false);
            }
        };

        const addTag = (tag: string) => {
            const trimmed = tag.trim();
            if (trimmed && !tags.includes(trimmed)) {
                const newTags = [...tags, trimmed];
                setTags(newTags);
                setProfileData(p => ({ ...p, categorySpecialization: newTags.join(', ') }));
            }
            setTagInput('');
        };

        const removeTag = (tag: string) => {
            const newTags = tags.filter(t => t !== tag);
            setTags(newTags);
            setProfileData(p => ({ ...p, categorySpecialization: newTags.join(', ') }));
        };

        const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!profileData.name || !profileData.companyName || !profileData.phone || !profileData.email) {
                showToast('Please fill all required fields.', 'error');
                return;
            }
            await saveUserProfile(profileData);
        };

        const fieldCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500';
        const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5';

        return (
            <MainLayout {...layoutProps}>
                <div className="max-w-2xl mx-auto py-2">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">My Profile</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your personal and business details below.</p>
                    </div>

                    {/* Photo reposition modal */}
                    {repoSrc && (
                        <PhotoRepositionModal
                            src={repoSrc}
                            onConfirm={handleAvatarConfirm}
                            onCancel={() => setRepoSrc(null)}
                        />
                    )}
                    {/* Dismiss avatar menu on outside click */}
                    {avatarMenuOpen && (
                        <div className="fixed inset-0 z-[99]" onClick={() => setAvatarMenuOpen(false)} />
                    )}

                    <form onSubmit={handleSave}>
                        {/* Personal Information card */}
                        <div className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm mb-4">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/8">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Personal Information</h2>
                            </div>

                            {/* Profile picture row */}
                            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-white/8">
                                <div className="relative flex-shrink-0">
                                    {/* Avatar circle */}
                                    <div
                                        className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center border-2 border-red-500/30 relative group cursor-pointer"
                                        onClick={() => avatarUrl ? setAvatarMenuOpen(v => !v) : fileRef.current?.click()}
                                    >
                                        {avatarUrl
                                            ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                            : <span className="text-white font-bold text-lg leading-none">{initials}</span>
                                        }
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {avatarUploading
                                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                : <Camera size={18} className="text-white" />
                                            }
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center border-2 border-white dark:border-gray-900 pointer-events-none">
                                        <Edit3 size={9} className="text-white" />
                                    </div>
                                    {/* Options popup */}
                                    {avatarMenuOpen && (
                                        <div
                                            onClick={e => e.stopPropagation()}
                                            className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[100] bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[180px]"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => { setAvatarMenuOpen(false); setRepoSrc(avatarUrl); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors border-b border-gray-100 dark:border-white/8"
                                            >
                                                <Edit3 size={13} className="text-[var(--color-primary)]" /> Adjust photo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setAvatarMenuOpen(false); fileRef.current?.click(); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <Camera size={13} className="text-[var(--color-primary)]" /> Upload new photo
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Profile Photo</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {avatarUrl ? 'Click to adjust or replace' : 'Click to upload a photo'}
                                    </p>
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                            </div>

                            {/* Account ID row */}
                            <div className="px-6 py-3 border-b border-gray-100 dark:border-white/8 flex items-center gap-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 w-24 flex-shrink-0">Client ID</span>
                                <span className="font-mono text-sm font-bold text-gray-700 dark:text-gray-200 select-all tracking-widest">
                                    {userProfile?.customerId || (user?.id ? formatClientId(user.id, user.created_at) : '—')}
                                </span>
                                <button
                                    type="button"
                                    title="Copy Client ID"
                                    onClick={() => { navigator.clipboard.writeText(userProfile?.customerId || ''); }}
                                    className="p-1 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelCls}>Full Name <span className="text-[var(--color-primary)]">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profileData.name || ''}
                                        onChange={set('name')}
                                        placeholder="Jane Smith"
                                        required
                                        className={fieldCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Email Address <span className="text-[var(--color-primary)]">*</span></label>
                                    <input
                                        type="email"
                                        value={profileData.email || ''}
                                        readOnly
                                        className={`${fieldCls} opacity-60 cursor-default`}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Phone Number <span className="text-[var(--color-primary)]">*</span></label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={profileData.phone || ''}
                                        onChange={set('phone')}
                                        placeholder="+1 555 000 0000"
                                        required
                                        className={fieldCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Country / Region</label>
                                    <select
                                        name="country"
                                        value={profileData.country || ''}
                                        onChange={set('country')}
                                        className={fieldCls}
                                    >
                                        <option value="">Select a country</option>
                                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Business Information card */}
                        <div className="bg-white dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm mb-4">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/8">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Business Information</h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelCls}>Company Name <span className="text-[var(--color-primary)]">*</span></label>
                                    <input type="text" name="companyName" value={profileData.companyName || ''} onChange={set('companyName')} placeholder="Acme Fashion Co." required className={fieldCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Your Role</label>
                                    <select name="jobRole" value={profileData.jobRole || ''} onChange={set('jobRole')} className={fieldCls}>
                                        <option value="">Select a role</option>
                                        {jobRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Website URL</label>
                                    <input type="url" name="website" value={profileData.website || ''} onChange={set('website')} placeholder="https://www.yourcompany.com" className={fieldCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Business Type / Legal Entity</label>
                                    <select name="businessType" value={profileData.businessType || ''} onChange={set('businessType')} className={fieldCls}>
                                        <option value="">Select type</option>
                                        {['Sole Proprietorship', 'Partnership', 'Private Limited (Ltd / LLC)', 'Public Company (PLC / Inc.)', 'Non-Profit / NGO', 'Joint Venture', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>VAT / Tax ID Number</label>
                                    <input type="text" name="vatNumber" value={profileData.vatNumber || ''} onChange={set('vatNumber')} placeholder="e.g. GB123456789" className={fieldCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Business Registration Number</label>
                                    <input type="text" name="businessRegNumber" value={profileData.businessRegNumber || ''} onChange={set('businessRegNumber')} placeholder="e.g. 12345678" className={fieldCls} />
                                </div>
                                {/* Billing Address — structured */}
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Billing Address</label>
                                    <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/8">
                                        {/* Street */}
                                        <input
                                            type="text"
                                            value={profileData.billingStreet || ''}
                                            onChange={set('billingStreet')}
                                            placeholder="Street address / building"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/8">
                                            {/* Postal Code */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={profileData.billingPostal || ''}
                                                    onChange={e => handlePostalChange(e.target.value, 'billing')}
                                                    placeholder="Postal / ZIP code"
                                                    className="w-full px-3 py-2.5 pr-8 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                                />
                                                {postalLoading.billing && (
                                                    <RefreshCw size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                                                )}
                                            </div>
                                            {/* City */}
                                            <input
                                                type="text"
                                                value={profileData.billingCity || ''}
                                                onChange={set('billingCity')}
                                                placeholder="City"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/8">
                                            {/* State / Province */}
                                            <input
                                                type="text"
                                                value={profileData.billingState || ''}
                                                onChange={set('billingState')}
                                                placeholder="State / Province"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                            />
                                            {/* Country */}
                                            <input
                                                type="text"
                                                value={profileData.billingCountry || ''}
                                                onChange={set('billingCountry')}
                                                placeholder="Country"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Enter postal code to auto-fill city &amp; country</p>
                                </div>

                                {/* Company / Registered Address — structured */}
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Registered / Company Address <span className="normal-case font-normal text-gray-400">(if different from billing)</span></label>
                                    <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/8">
                                        <input
                                            type="text"
                                            value={profileData.companyStreet || ''}
                                            onChange={set('companyStreet')}
                                            placeholder="Street address / building"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/8">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={profileData.companyPostal || ''}
                                                    onChange={e => handlePostalChange(e.target.value, 'company')}
                                                    placeholder="Postal / ZIP code"
                                                    className="w-full px-3 py-2.5 pr-8 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                                />
                                                {postalLoading.company && (
                                                    <RefreshCw size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={profileData.companyCity || ''}
                                                onChange={set('companyCity')}
                                                placeholder="City"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/8">
                                            <input
                                                type="text"
                                                value={profileData.companyState || ''}
                                                onChange={set('companyState')}
                                                placeholder="State / Province"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                            />
                                            <input
                                                type="text"
                                                value={profileData.companyCountry || ''}
                                                onChange={set('companyCountry')}
                                                placeholder="Country"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Enter postal code to auto-fill city &amp; country</p>
                                </div>
                                {/* Category Specialization — tag input */}
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Category Specialization</label>
                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {tags.map(tag => (
                                                <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                                                    {tag}
                                                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors leading-none"><X size={11} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                                            placeholder="Type a category and press Enter…"
                                            className={fieldCls}
                                        />
                                        <button type="button" onClick={() => addTag(tagInput)} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold transition-colors flex-shrink-0">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PREDEFINED_CATEGORIES.filter(c => !tags.includes(c)).map(cat => (
                                            <button type="button" key={cat} onClick={() => addTag(cat)} className="text-xs px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">+ {cat}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save button */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isProfileLoading}
                                className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProfileLoading ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </MainLayout>
        );
    };

    // Component for user settings
    const SettingsPage: FC = () => {
        const [location, setLocation] = useState(userProfile?.country || 'Your Location');
        const handleLocationSave = () => {
            showToast(`Location updated to ${location}`);
        };

        // Login & Security state
        const [securityExpanded, setSecurityExpanded] = useState(false);
        const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
        const [showNewPw, setShowNewPw] = useState(false);
        const [showConfirmPw, setShowConfirmPw] = useState(false);
        const [pwLoading, setPwLoading] = useState(false);
        const [resetSent, setResetSent] = useState(false);

        const signInProvider = user?.app_metadata?.provider ?? 'email';
        const isEmailUser = signInProvider === 'email';

        const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
            if (pw.length === 0) return { label: '', color: '', width: '0%' };
            let score = 0;
            if (pw.length >= 8) score++;
            if (pw.length >= 12) score++;
            if (/[A-Z]/.test(pw)) score++;
            if (/[0-9]/.test(pw)) score++;
            if (/[^A-Za-z0-9]/.test(pw)) score++;
            if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
            if (score <= 2) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' };
            if (score <= 3) return { label: 'Good', color: 'bg-blue-500', width: '75%' };
            return { label: 'Strong', color: 'bg-green-500', width: '100%' };
        };

        const handlePasswordChange = async () => {
            if (pwForm.newPassword.length < 8) {
                showToast('Password must be at least 8 characters', 'error'); return;
            }
            if (pwForm.newPassword !== pwForm.confirmPassword) {
                showToast('Passwords do not match', 'error'); return;
            }
            setPwLoading(true);
            const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
            setPwLoading(false);
            if (error) { showToast(error.message, 'error'); }
            else { showToast('Password updated successfully'); setPwForm({ newPassword: '', confirmPassword: '' }); }
        };

        const handlePasswordReset = async () => {
            if (!user?.email) return;
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: window.location.origin,
            });
            if (error) { showToast(error.message, 'error'); }
            else { setResetSent(true); showToast('Password reset email sent'); }
        };

        const handleSignOutAllDevices = async () => {
            const { error } = await supabase.auth.signOut({ scope: 'global' });
            if (error) { showToast(error.message, 'error'); }
            else { showToast('Signed out from all devices'); }
        };

        // Device management state
        const [devicesExpanded, setDevicesExpanded] = useState(false);
        const [deviceList, setDeviceList] = useState<Array<{
            id: string; browser: string; os: string; deviceType: string;
            lastSeen: string; createdAt: string; name: string;
        }>>([]);
        const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);

        const parseCurrentUA = () => {
            const ua = navigator.userAgent;
            let browser = 'Unknown Browser';
            let os = 'Unknown OS';
            let deviceType = 'Desktop';
            if (/Edg\//.test(ua)) browser = 'Edge';
            else if (/OPR\/|Opera\//.test(ua)) browser = 'Opera';
            else if (/Chrome\//.test(ua)) browser = 'Chrome';
            else if (/Firefox\//.test(ua)) browser = 'Firefox';
            else if (/Safari\//.test(ua)) browser = 'Safari';
            if (/iPhone/.test(ua)) { os = 'iOS'; deviceType = 'Mobile'; }
            else if (/iPad/.test(ua)) { os = 'iPadOS'; deviceType = 'Tablet'; }
            else if (/Android/.test(ua)) { os = 'Android'; deviceType = /Mobile/.test(ua) ? 'Mobile' : 'Tablet'; }
            else if (/Windows NT/.test(ua)) os = 'Windows';
            else if (/Mac OS X/.test(ua)) os = 'macOS';
            else if (/Linux/.test(ua)) os = 'Linux';
            return { browser, os, deviceType };
        };

        const DEVICE_ID_KEY = 'garment_erp_device_id';
        const getCurrentDeviceId = () => {
            let id = localStorage.getItem(DEVICE_ID_KEY);
            if (!id) { id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; localStorage.setItem(DEVICE_ID_KEY, id); }
            return id;
        };

        const getDeviceIcon = (deviceType: string, os: string) => {
            if (deviceType === 'Mobile' || deviceType === 'Tablet') return <Smartphone size={16} />;
            if (os === 'macOS') return <span className="text-base">💻</span>;
            return <span className="text-base">🖥️</span>;
        };

        const timeAgoDevice = (iso: string) => {
            const diff = Date.now() - new Date(iso).getTime();
            const m = Math.floor(diff / 60000);
            if (m < 1) return 'Just now';
            if (m < 60) return `${m}m ago`;
            const h = Math.floor(m / 60);
            if (h < 24) return `${h}h ago`;
            const d = Math.floor(h / 24);
            if (d < 7) return `${d}d ago`;
            return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        };

        // Register / refresh current device in user_metadata on expand
        const registerCurrentDevice = useCallback(async () => {
            if (!user) return;
            const deviceId = getCurrentDeviceId();
            const { browser, os, deviceType } = parseCurrentUA();
            const now = new Date().toISOString();
            const existing: typeof deviceList = user.user_metadata?.devices ?? [];
            const idx = existing.findIndex((d: any) => d.id === deviceId);
            let updated;
            if (idx >= 0) {
                updated = existing.map((d: any) => d.id === deviceId ? { ...d, lastSeen: now, browser, os, deviceType, name: `${browser} on ${os}` } : d);
            } else {
                updated = [...existing, { id: deviceId, browser, os, deviceType, name: `${browser} on ${os}`, lastSeen: now, createdAt: now }];
            }
            setDeviceList(updated);
            await supabase.auth.updateUser({ data: { devices: updated } });
        }, [user]);

        useEffect(() => {
            if (devicesExpanded && user) {
                const stored: typeof deviceList = user.user_metadata?.devices ?? [];
                setDeviceList(stored);
                registerCurrentDevice();
            }
        }, [devicesExpanded, user]);

        const handleRemoveDevice = async (deviceId: string) => {
            setRemovingDeviceId(deviceId);
            const updated = deviceList.filter(d => d.id !== deviceId);
            const { error } = await supabase.auth.updateUser({ data: { devices: updated } });
            setRemovingDeviceId(null);
            if (error) { showToast(error.message, 'error'); }
            else { setDeviceList(updated); showToast('Device removed'); }
        };

        const handleSignOutAllDevicesFromManager = async () => {
            const currentId = getCurrentDeviceId();
            const updated = deviceList.filter(d => d.id === currentId).map(d => ({ ...d, lastSeen: new Date().toISOString() }));
            await supabase.auth.updateUser({ data: { devices: updated } });
            const { error } = await supabase.auth.signOut({ scope: 'global' });
            if (error) { showToast(error.message, 'error'); }
            else { showToast('Signed out from all devices'); }
        };

        const pwStrength = getPasswordStrength(pwForm.newPassword);
        const settingsOptions = isAdmin ? [
            { title: "My Profile", description: "Update your admin account information", icon: <Edit size={20} />, action: () => handleSetCurrentPage('profile'), buttonLabel: "Edit Profile" },
            { title: "Admin Dashboard", description: "View platform overview and key metrics", icon: <LayoutDashboard size={20} />, action: () => handleSetCurrentPage('adminDashboard'), buttonLabel: "Go to Dashboard" },
            { title: "Manage Users", description: "View and manage all client accounts", icon: <Users size={20} />, action: () => handleSetCurrentPage('adminUsers'), buttonLabel: "Manage Users" },
            { title: "Login Page Settings", description: "Customise the login page content and images", icon: <Sparkles size={20} />, action: () => handleSetCurrentPage('adminLoginSettings'), buttonLabel: "Edit Login Page" },
            { title: "Order Management", description: "View and manage all client orders and RFQs", icon: <History size={20} />, action: () => handleSetCurrentPage('adminCRM'), buttonLabel: "View Orders" },
        ] : [
            { title: "My Profile", description: "Update your personal and company information", icon: <Edit size={20} />, action: () => handleSetCurrentPage('profile'), buttonLabel: "Edit Profile" },
            { title: "Team Members", description: "Invite colleagues and manage their access", icon: <Users size={20} />, action: () => handleSetCurrentPage('teamSettings'), buttonLabel: "Manage Team" },
            { title: "Contact Customer Care", description: "Get help with your account or any issue", icon: <LifeBuoy size={20} />, action: () => { window.location.href = 'mailto:support@auctave.com'; }, buttonLabel: "Email Support" },
            { title: "Order Details", description: "View and track all your past and current orders", icon: <History size={20} />, action: () => handleSetCurrentPage('crm'), buttonLabel: "View Orders" },
        ];
        return (
            <MainLayout {...layoutProps}>
                <div className="max-w-4xl mx-auto px-1 sm:px-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-5 sm:mb-8">Settings</h1>
                    <div className="space-y-4 sm:space-y-6">
                        {/* Dark Mode Toggle */}
                        <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 mr-4">
                                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2.5 sm:p-3 rounded-lg shrink-0">
                                    <Moon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white leading-snug">Dark Mode</h3>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">Adjust the appearance of the application</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const newMode = !darkMode;
                                    setDarkMode(newMode);
                                    // Persist to Supabase (fire and forget)
                                    if (user) {
                                        supabase.auth.updateUser({ data: { darkMode: newMode } });
                                    }
                                }}
                                className={`relative inline-flex h-6 w-10 sm:h-7 sm:w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shrink-0 ${darkMode ? 'bg-purple-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {settingsOptions.map((opt, index) => (
                            <div key={index} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 transition-colors">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className="bg-red-100 dark:bg-red-900/30 text-[var(--color-primary)] dark:text-red-400 p-2.5 sm:p-3 rounded-lg shrink-0">{opt.icon}</div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white leading-snug">{opt.title}</h3>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{opt.description}</p>
                                    </div>
                                </div>
                                <button onClick={opt.action} className="shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-xs sm:text-sm whitespace-nowrap">
                                    {opt.buttonLabel}
                                </button>
                            </div>
                        ))}
                            <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10 transition-colors">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="bg-red-100 dark:bg-red-900/30 text-[var(--color-primary)] dark:text-red-400 p-2.5 sm:p-3 rounded-lg shrink-0"><MapPin size={18}/></div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white leading-snug">Change Location</h3>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">Update your primary business location.</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
                                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="flex-grow p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    <button onClick={handleLocationSave} className="w-full sm:w-auto bg-[var(--color-primary)] text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-[var(--color-primary-hover)] transition text-sm">Save</button>
                                </div>
                            </div>

                        {/* Login & Security */}
                        <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden transition-colors">
                            <button
                                onClick={() => setSecurityExpanded(p => !p)}
                                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2.5 sm:p-3 rounded-lg shrink-0">
                                        <Shield size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white leading-snug">Login &amp; Security</h3>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">Manage password, sign-in method, and account security</p>
                                    </div>
                                </div>
                                <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform duration-200 ${securityExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {securityExpanded && (
                                <div className="border-t border-gray-100 dark:border-white/10 px-4 sm:px-6 pb-6 space-y-6 pt-5">

                                    {/* Sign-in method */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                            <Smartphone size={14} className="text-gray-400" /> Sign-in Method
                                        </h4>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                            {signInProvider === 'google' ? (
                                                <>
                                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                                        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800 dark:text-white">Google Account</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                                                    </div>
                                                    <span className="ml-auto text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Active</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                        <Lock size={14} className="text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800 dark:text-white">Email &amp; Password</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                                                    </div>
                                                    <span className="ml-auto text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Active</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Change Password — only for email users */}
                                    {isEmailUser && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                <Lock size={14} className="text-gray-400" /> Change Password
                                            </h4>
                                            <div className="space-y-3">
                                                {/* New password */}
                                                <div>
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">New Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showNewPw ? 'text' : 'password'}
                                                            value={pwForm.newPassword}
                                                            onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                                                            placeholder="Enter new password"
                                                            className="w-full pr-10 p-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                                            {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                                        </button>
                                                    </div>
                                                    {pwForm.newPassword && (
                                                        <div className="mt-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs text-gray-400">Password strength</span>
                                                                <span className={`text-xs font-medium ${pwStrength.label === 'Strong' ? 'text-green-500' : pwStrength.label === 'Good' ? 'text-blue-500' : pwStrength.label === 'Fair' ? 'text-yellow-500' : 'text-red-500'}`}>{pwStrength.label}</span>
                                                            </div>
                                                            <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all ${pwStrength.color}`} style={{ width: pwStrength.width }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Confirm password */}
                                                <div>
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Confirm New Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showConfirmPw ? 'text' : 'password'}
                                                            value={pwForm.confirmPassword}
                                                            onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                                            placeholder="Confirm new password"
                                                            className="w-full pr-10 p-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <button type="button" onClick={() => setShowConfirmPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                                            {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                                        </button>
                                                    </div>
                                                    {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> Passwords do not match</p>
                                                    )}
                                                    {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && (
                                                        <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><CheckCircle size={11} /> Passwords match</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={handlePasswordChange}
                                                    disabled={pwLoading || !pwForm.newPassword || !pwForm.confirmPassword}
                                                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    {pwLoading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                                                    {pwLoading ? 'Updating...' : 'Update Password'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Reset Password via Email */}
                                    {isEmailUser && (
                                        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                                            <div className="flex items-start gap-3">
                                                <RefreshCw size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Forgot your password?</p>
                                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">We'll send a secure reset link to <span className="font-medium">{user?.email}</span></p>
                                                </div>
                                                {resetSent ? (
                                                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 shrink-0"><CheckCircle size={13} /> Sent</span>
                                                ) : (
                                                    <button
                                                        onClick={handlePasswordReset}
                                                        className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                                                    >
                                                        Send Link
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Google user — password managed by Google */}
                                    {!isEmailUser && (
                                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30">
                                            <div className="flex items-start gap-3">
                                                <Shield size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Password managed by Google</p>
                                                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">Your account is secured via Google Sign-In. To change your password, visit your Google Account settings.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Security tips */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                            <CheckCircle size={14} className="text-gray-400" /> Security Recommendations
                                        </h4>
                                        <ul className="space-y-2">
                                            {[
                                                { tip: 'Use a unique password not used on other sites', done: isEmailUser ? pwForm.newPassword.length >= 12 : true },
                                                { tip: 'Keep your email address up to date', done: !!user?.email },
                                                { tip: 'Never share your login credentials', done: true },
                                                { tip: 'Sign out from shared or public devices', done: false },
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                                        {item.done ? <Check size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                                                    </span>
                                                    {item.tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>


                                </div>
                            )}
                        </div>

                        {/* Manage Devices */}
                        <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden transition-colors">
                            <button
                                onClick={() => setDevicesExpanded(p => !p)}
                                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2.5 sm:p-3 rounded-lg shrink-0">
                                        <Smartphone size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white leading-snug">Manage Devices</h3>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">View and remove devices signed in to your account</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {deviceList.length > 0 && (
                                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">{deviceList.length}</span>
                                    )}
                                    <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${devicesExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {devicesExpanded && (
                                <div className="border-t border-gray-100 dark:border-white/10 px-4 sm:px-6 pb-6 pt-5 space-y-4">
                                    {(() => {
                                        const currentId = localStorage.getItem('garment_erp_device_id');
                                        const sorted = [...deviceList].sort((a, b) => {
                                            if (a.id === currentId) return -1;
                                            if (b.id === currentId) return 1;
                                            return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
                                        });
                                        return sorted.length === 0 ? (
                                            <div className="flex flex-col items-center py-6 text-center">
                                                <Smartphone size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
                                                <p className="text-sm text-gray-400 dark:text-gray-500">No devices registered yet.</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This device will appear here after a moment.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {sorted.map(device => {
                                                    const isCurrent = device.id === currentId;
                                                    return (
                                                        <div key={device.id} className={`flex items-center gap-3 p-3.5 rounded-lg border transition-colors ${isCurrent ? 'bg-indigo-50 dark:bg-indigo-900/15 border-indigo-200 dark:border-indigo-700/40' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                                                {getDeviceIcon(device.deviceType, device.os)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{device.name}</p>
                                                                    {isCurrent && <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-medium shrink-0">This device</span>}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500">{device.os} · {device.deviceType}</span>
                                                                    <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500">Last seen {timeAgoDevice(device.lastSeen)}</span>
                                                                </div>
                                                            </div>
                                                            {!isCurrent && (
                                                                <button
                                                                    onClick={() => handleRemoveDevice(device.id)}
                                                                    disabled={removingDeviceId === device.id}
                                                                    className="shrink-0 text-xs font-semibold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 border border-red-200 dark:border-red-800/40 rounded-lg px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                                >
                                                                    {removingDeviceId === device.id ? <RefreshCw size={11} className="animate-spin" /> : <X size={11} />}
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}

                                    {/* Sign out all devices */}
                                    <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sign out all devices</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">End all active sessions — you'll need to log in again everywhere</p>
                                            </div>
                                            <button
                                                onClick={handleSignOutAllDevicesFromManager}
                                                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <LogOut size={13} /> Sign Out All
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Logout — mobile only */}
                        <div className="sm:hidden">
                            <button
                                onClick={() => handleSignOut()}
                                className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-lg shrink-0">
                                    <LogOut size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-base font-semibold leading-snug">Log Out</p>
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 leading-tight">Sign out of your account</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </MainLayout>
        )
    }

    // Component to display suggested factories based on order
    const FactorySuggestionsPage: FC = () => (
        <MainLayout {...layoutProps}>
            <div className="space-y-6">
                <div>
                    <button onClick={() => handleSetCurrentPage('orderForm')} className="text-[var(--color-primary)] font-semibold mb-4 flex items-center hover:underline">
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Back to Order Form
                    </button>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Top Factory Matches</h2>
                    <p className="text-gray-500 mt-1">Based on your request for {orderFormData.lineItems.length} items.</p>
                </div>
                {suggestedFactories.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {suggestedFactories.map((factory, index) => (
                            <FactoryCard
                                key={factory.id}
                                factory={factory}
                                onSelect={() => handleSelectFactory(factory)}
                                style={{animationDelay: `${index * 60}ms`}}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-lg shadow-md border border-gray-200 dark:border-white/10">
                        <h3 className="text-xl font-semibold text-gray-700">No factories match your criteria.</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your product category in the order form.</p>
                    </div>
                )}
            </div>
        </MainLayout>
    );

    // Component for AI tools related to a factory
    const FactoryToolsPage: FC = () => {
        if (!selectedFactory) {
            handleSetCurrentPage('sourcing');
            return null;
        }
        return (
            <MainLayout {...layoutProps}>
                <div className="space-y-8">
                    <div>
                        <button onClick={() => handleSetCurrentPage('factoryDetail', selectedFactory)} className="text-[var(--color-primary)] font-semibold mb-4 flex items-center hover:underline">
                            <ChevronLeft className="h-5 w-5 mr-1" />
                            Back to Factory Details
                        </button>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">AI Sourcing Tools for {selectedFactory.name}</h2>
                        <p className="text-gray-500 mt-1">Generate documents and get insights for your order.</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-200 dark:border-white/10">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Your Order Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {orderFormData.lineItems.map((item, idx) => (
                                <div key={idx} className="md:col-span-2 border-b dark:border-white/10 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Item {idx + 1}: {item.category}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-200">Quantity: {item.qty}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-200">Details: {item.fabricQuality}, {item.weightGSM}GSM, {item.styleOption}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AiCard icon={<FileText className="mr-2 text-[var(--color-primary)]"/>} title="Generate Contract Brief">
                            <div className="flex-grow min-h-[150px] prose prose-sm max-w-none whitespace-pre-wrap">{isLoadingBrief ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div> : contractBrief ? <div dangerouslySetInnerHTML={{ __html: contractBrief.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /> : <p className="text-gray-500 not-prose">Generate a professional brief to share with the factory.</p>}</div>
                            <button onClick={generateContractBrief} disabled={isLoadingBrief} className="mt-4 w-full px-5 py-2 text-sm text-white rounded-lg font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50">
                                {isLoadingBrief ? 'Generating...' : 'Generate Brief'}
                            </button>
                        </AiCard>
                        <AiCard icon={<MessageSquare className="mr-2 text-[var(--color-primary)]"/>} title="Draft Outreach Email">
                            <div className="flex-grow min-h-[150px] prose prose-sm max-w-none whitespace-pre-wrap">{isLoadingEmail ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div> : outreachEmail ? <div dangerouslySetInnerHTML={{ __html: outreachEmail.replace(/\n/g, '<br/>') }} /> : <p className="text-gray-500 not-prose">First, generate a contract brief.</p>}</div>
                            {outreachEmail && !isLoadingEmail && <button onClick={() => copyToClipboard(outreachEmail.replace(/<br\/>/g, '\n'), 'Email content copied!')} className="mt-4 w-full px-5 py-2 text-sm text-indigo-700 rounded-lg font-semibold bg-indigo-100 hover:bg-indigo-200 transition flex items-center justify-center"><ClipboardCopy size={16} className="mr-2"/>Copy Email</button>}
                            <button onClick={generateOutreachEmail} disabled={isLoadingEmail || !contractBrief || !selectedFactory} className="mt-2 w-full px-5 py-2 text-sm text-white rounded-lg font-semibold bg-[#c20c0b] hover:bg-[#a50a09] transition disabled:opacity-50">
                                {isLoadingEmail ? 'Drafting...' : 'Draft Email'}
                            </button>
                        </AiCard>
                        <AiCard icon={<BrainCircuit className="mr-2 text-[var(--color-primary)]"/>} title="Suggest Optimizations">
                            <div className="flex-grow min-h-[150px] prose prose-sm max-w-none whitespace-pre-wrap">{isLoadingOptimizations ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div> : optimizationSuggestions ? <div dangerouslySetInnerHTML={{ __html: optimizationSuggestions.replace(/\n/g, '<br/>').replace(/- \*\*(.*?)\*\*:/g, '<br/><strong>$1:</strong>') }} /> : <p className="text-gray-500 not-prose">Find ways to improve cost, quality, or sustainability.</p>}</div>
                            <button onClick={suggestOptimizations} disabled={isLoadingOptimizations} className="mt-4 w-full px-5 py-2 text-sm text-white rounded-lg font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50">
                                {isLoadingOptimizations ? 'Analyzing...' : 'Get Suggestions'}
                            </button>
                        </AiCard>
                        <AiCard icon={<BadgePercent className="mr-2 text-[var(--color-primary)]"/>} title="Negotiation Advisor">
                            <div className="flex-grow min-h-[150px] prose prose-sm max-w-none whitespace-pre-wrap">{isLoadingNegotiation ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div> : negotiationTips ? <div dangerouslySetInnerHTML={{ __html: negotiationTips.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /> : <p className="text-gray-500 not-prose">Get AI-powered negotiation points and cultural tips.</p>}</div>
                            <button onClick={getNegotiationTips} disabled={isLoadingNegotiation} className="mt-4 w-full px-5 py-2 text-sm text-white rounded-lg font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50">
                                {isLoadingNegotiation ? 'Advising...' : 'Get Negotiation Tips'}
                            </button>
                        </AiCard>
                    </div>
                </div>
            </MainLayout>
        );
    };

    // Component for tracking order status
    const OrderTrackingPage: FC = () => {
        // Mock tracking data
        const trackingData: { [key: string]: any[] } = {
            "PO-2024-001": [ { status: 'In Production', date: 'June 15, 2025', isComplete: true, icon: <PackageCheck/> }, { status: 'Quality Checked', date: 'June 20, 2025', isComplete: true, icon: <CheckCircle/> }, { status: 'Transport to Origin Port', date: 'June 22, 2025', isComplete: true, icon: <Truck/> }, { status: 'In Transit', date: 'June 25, 2025', isComplete: false, isInProgress: true, icon: <Ship/> }, { status: 'Reached Destination Port', date: 'Est. July 10, 2025', isComplete: false, icon: <Anchor/> }, { status: 'Delivered', date: 'Est. July 12, 2025', isComplete: false, icon: <Warehouse/> }, ],
            "PO-2024-002": [ { status: 'In Production', date: 'June 18, 2025', isComplete: true, icon: <PackageCheck/> }, { status: 'Quality Checked', date: 'June 24, 2025', isComplete: false, isInProgress: true, icon: <CheckCircle/> }, { status: 'Transport to Origin Port', date: 'Est. June 26, 2025', isComplete: false, icon: <Truck/> }, { status: 'In Transit', date: 'Est. June 28, 2025', isComplete: false, icon: <Ship/> }, { status: 'Reached Destination Port', date: 'Est. July 15, 2025', isComplete: false, icon: <Anchor/> }, { status: 'Delivered', date: 'Est. July 17, 2025', isComplete: false, icon: <Warehouse/> }, ]
        };
        const [activeOrderKey, setActiveOrderKey] = useState(Object.keys(trackingData)[0]);
        const activeOrderTracking = trackingData[activeOrderKey];
        return (
            <MainLayout {...layoutProps}>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Order Tracking</h1>
                <p className="text-gray-500 dark:text-gray-200 mb-6">Follow your shipment from production to delivery.</p>
                <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10">
                    <div className="p-4 border-b border-gray-200 dark:border-white/10">
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            {Object.keys(trackingData).map(orderKey => (
                                <button key={orderKey} onClick={() => setActiveOrderKey(orderKey)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-lg transition-colors ${activeOrderKey === orderKey ? 'bg-red-100 text-[var(--color-primary)]' : 'text-gray-500 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                    {orderKey}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 sm:p-8">
                        <div className="relative pl-8">
                            {/* Vertical line */}
                            <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-white/10"></div>
                            {activeOrderTracking.map((item, index) => {
                                const isLast = index === activeOrderTracking.length - 1;
                                const isComplete = item.isComplete;
                                const isInProgress = item.isInProgress;
                                return (
                                    <div key={index} className={`relative flex items-start ${isLast ? '' : 'pb-12'}`}>
                                        {/* Dot */}
                                        <div className="absolute left-12 top-1 -ml-[9px] h-5 w-5 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                                            {isComplete && <div className="w-full h-full rounded-full bg-purple-600 border-2 border-white dark:border-gray-800"></div>}
                                            {isInProgress && <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 border-2 border-purple-600 animate-pulse"></div>}
                                        </div>
                                        {/* Content */}
                                        <div className="flex items-center gap-4 ml-8">
                                            <div className={`p-3 rounded-full ${
                                                isComplete ? 'bg-red-100 text-[var(--color-primary)]' :
                                                isInProgress ? 'bg-blue-100 text-blue-600' :
                                                'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                            }`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <h4 className={`font-semibold ${isComplete || isInProgress ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-500'}`}>{item.status}</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-200">{item.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    };

    // Component for the AI Chatbot + My Quotes chat
    const AIChatSupport: FC = () => {
        // isOpen and activeTab lifted to AppContent so remounts don't reset them
        const isOpen = aiChatOpen;
        const setIsOpen = setAiChatOpen;
        const activeTab = aiActiveTab;
        const setActiveTab = setAiActiveTab;

        const { can } = useOrgPermissions();
        const canSend = can('sourcing', 'edit');

        // ── AI Chat State ─────────────────────────────────────────────────────
        const messages = aiMessages;
        const setMessages = setAiMessages;
        const [input, setInput] = useState(''); // local — ephemeral, no need to persist
        const [isLoading, setIsLoading] = useState(false);

        // ── Factory data for AI context ───────────────────────────────────────
        const factoriesRef = useRef<Factory[]>([]);
        useEffect(() => {
            const FACTORIES_KEY = 'garment_erp_factories_v2';
            const cached = getCache<Factory[]>(FACTORIES_KEY, TTL_FACTORIES);
            if (cached) {
                factoriesRef.current = cached;
                return;
            }
            supabase.from('factories').select('id,name,location,specialties,tags,rating,turnaround,minimum_order_quantity,certifications,trust_tier,description').then(({ data }) => {
                if (data) {
                    factoriesRef.current = data.map((f: any) => ({
                        id: f.id, name: f.name, location: f.location,
                        specialties: f.specialties || [], tags: f.tags || [],
                        rating: f.rating || 0, turnaround: f.turnaround || '',
                        minimumOrderQuantity: f.minimum_order_quantity || 0,
                        certifications: f.certifications || [],
                        trustTier: f.trust_tier || 'unverified',
                        description: f.description || '',
                    } as Factory));
                }
            });
        }, []);
        const chatEndRef = useRef<HTMLDivElement>(null);

        // ── My Quotes State ───────────────────────────────────────────────────
        const [quotesView, setQuotesView] = useState<'rfqs' | 'chat'>('rfqs');
        const [quotesSearch, setQuotesSearch] = useState('');
        const [selectedRFQ, setSelectedRFQ] = useState<QuoteRequest | null>(null);
        const [activeLineItemId, setActiveLineItemId] = useState<number | null>(null);
        const [quotesMessage, setQuotesMessage] = useState('');
        const [quotesSending, setQuotesSending] = useState(false);
        const [attachFiles, setAttachFiles] = useState<File[]>([]);
        const [attachPreviews, setAttachPreviews] = useState<string[]>([]);
        const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false);
        const [panelSize, setPanelSize] = useState({ w: 390, h: 620 });

        const messagesEndRef = useRef<HTMLDivElement>(null);
        const quotesInputRef = useRef<HTMLTextAreaElement>(null);
        const fileInputRef = useRef<HTMLInputElement>(null);
        const dragging = useRef(false);
        const dragStart = useRef({ x: 0, y: 0, w: 390, h: 620 });

        // ── Resize ────────────────────────────────────────────────────────────
        const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
            e.preventDefault();
            dragging.current = true;
            dragStart.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h };
            const onMove = (ev: MouseEvent) => {
                if (!dragging.current) return;
                setPanelSize({
                    w: Math.min(760, Math.max(340, dragStart.current.w + (dragStart.current.x - ev.clientX))),
                    h: Math.min(900, Math.max(440, dragStart.current.h + (dragStart.current.y - ev.clientY))),
                });
            };
            const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        }, [panelSize.w, panelSize.h]);

        // ── AI scroll ────────────────────────────────────────────────────────
        useEffect(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [messages.length, isOpen, activeTab]);

        // ── Quotes scroll ─────────────────────────────────────────────────────
        useEffect(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [selectedRFQ?.negotiation_details?.history?.length, activeLineItemId]);

        // ── Focus quotes input ────────────────────────────────────────────────
        useEffect(() => {
            if (activeTab === 'quotes' && quotesView === 'chat') {
                setTimeout(() => quotesInputRef.current?.focus(), 60);
            }
        }, [activeTab, quotesView, activeLineItemId]);

        // ── Helpers ───────────────────────────────────────────────────────────
        const getLatestMessageTime = (rfq: QuoteRequest): string => {
            const history = rfq.negotiation_details?.history || [];
            if (!history.length) return rfq.submittedAt;
            return history.reduce((latest, h) => (h.timestamp > latest ? h.timestamp : latest), history[0].timestamp);
        };
        const getClientUnread = (rfq: QuoteRequest): number => {
            const lastRead = rfq.negotiation_details?.clientLastRead || '';
            return (rfq.negotiation_details?.history || []).filter(h => h.sender === 'factory' && h.timestamp > lastRead).length;
        };
        const timeAgoFn = (iso: string): string => {
            const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
            if (s < 60) return 'just now';
            const m = Math.floor(s / 60);
            if (m < 60) return `${m}m`;
            const h = Math.floor(m / 60);
            if (h < 24) return `${h}h`;
            return `${Math.floor(h / 24)}d`;
        };
        const statusBadgeClass = (status: string): string => {
            if (status === 'Pending') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            if (status === 'Responded') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            if (['Accepted', 'Admin Accepted', 'Client Accepted'].includes(status)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            if (status === 'Declined') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            if (status === 'In Negotiation') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
        };


        // ── Mark client read ──────────────────────────────────────────────────
        const markClientRead = useCallback((rfq: QuoteRequest): QuoteRequest => {
            const now = new Date().toISOString();
            const updatedNeg = { ...(rfq.negotiation_details || {}), clientLastRead: now };
            const updated = { ...rfq, negotiation_details: updatedNeg };
            setQuoteRequests(prev => {
                const next = prev.map(q => q.id === rfq.id ? updated : q);
                sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(next));
                return next;
            });
            quoteService.update(rfq.id, { negotiation_details: updatedNeg });
            return updated;
        }, []);

        // ── File attach ───────────────────────────────────────────────────────
        const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
            const incoming = Array.from(e.target.files || []);
            if (!incoming.length) return;
            setAttachFiles(prev => [...prev, ...incoming]);
            setAttachPreviews(prev => [...prev, ...incoming.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : '')]);
            e.target.value = '';
        };
        const removeAttachment = (idx: number) => {
            if (attachPreviews[idx]) URL.revokeObjectURL(attachPreviews[idx]);
            setAttachFiles(prev => prev.filter((_, i) => i !== idx));
            setAttachPreviews(prev => prev.filter((_, i) => i !== idx));
        };
        const clearAttachments = () => {
            attachPreviews.forEach(u => { if (u) URL.revokeObjectURL(u); });
            setAttachFiles([]); setAttachPreviews([]);
        };

        // ── Send quote message ────────────────────────────────────────────────
        const handleQuotesSend = async () => {
            if (!selectedRFQ || (!quotesMessage.trim() && !attachFiles.length)) return;
            setQuotesSending(true);
            const msgText = quotesMessage.trim();
            const filesToUpload = attachFiles;
            setQuotesMessage('');
            clearAttachments();

            const uploadedPaths: string[] = [];
            const uploadedNames: string[] = [];
            for (const file of filesToUpload) {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const storageName = `${selectedRFQ.userId}/${selectedRFQ.id}/chat/${Date.now()}_${safeName}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('quote-attachments').upload(storageName, file);
                if (!uploadError) {
                    uploadedPaths.push(uploadData?.path || storageName);
                    uploadedNames.push(file.name);
                }
            }

            const newMsg: NegotiationHistoryItem = {
                id: Date.now().toString(),
                sender: 'client',
                message: msgText,
                timestamp: new Date().toISOString(),
                action: 'info',
                relatedLineItemId: activeLineItemId ?? undefined,
                attachments: uploadedPaths,
                attachmentNames: uploadedNames,
            };

            const updatedHistory = [...(selectedRFQ.negotiation_details?.history || []), newMsg];
            const updatedNeg = { ...selectedRFQ.negotiation_details, history: updatedHistory };
            const updatedFiles = uploadedPaths.length ? [...(selectedRFQ.files || []), ...uploadedPaths] : selectedRFQ.files || [];
            const optimistic: QuoteRequest = { ...selectedRFQ, files: updatedFiles, negotiation_details: updatedNeg };
            setSelectedRFQ(optimistic);
            setQuoteRequests(prev => {
                const next = prev.map(q => q.id === selectedRFQ.id ? optimistic : q);
                sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(next));
                return next;
            });

            const updatePayload: any = { negotiation_details: updatedNeg };
            if (uploadedPaths.length) updatePayload.files = updatedFiles;
            const { error } = await quoteService.update(selectedRFQ.id, updatePayload);
            if (error) {
                setSelectedRFQ(selectedRFQ);
                setQuoteRequests(prev => {
                    const next = prev.map(q => q.id === selectedRFQ.id ? selectedRFQ : q);
                    sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(next));
                    return next;
                });
            }
            setQuotesSending(false);
        };

        // ── Quotes navigation ─────────────────────────────────────────────────
        const openRFQ = (rfq: QuoteRequest) => {
            const updated = markClientRead(rfq);
            setSelectedRFQ(updated);
            setActiveLineItemId(rfq.order?.lineItems?.[0]?.id ?? null);
            setQuotesView('chat');
            setOrderDetailsExpanded(false);
        };
        const goBackQuotes = () => {
            setQuotesView('rfqs');
            setSelectedRFQ(null);
            setQuotesMessage('');
            clearAttachments();
        };

        // ── AI send ───────────────────────────────────────────────────────────
        const buildPrompt = (userMsg: string): string => {
            const factories = factoriesRef.current;
            const orders = quoteRequests;
            const factoriesCtx = factories.length > 0
                ? `FACTORIES ON PLATFORM (use IDs exactly as shown):\n${factories.slice(0, 30).map(f =>
                    `ID:${f.id} | ${f.name} | ${f.location} | Rating:${f.rating}/5 | Specialties:${(f.specialties||[]).join(', ')} | MOQ:${f.minimumOrderQuantity} units | Lead time:${f.turnaround}`
                ).join('\n')}`
                : 'No factory data loaded.';
            const ordersCtx = orders.length > 0
                ? `USER ORDERS:\n${orders.map(q =>
                    `ID:${q.id} | Status:${q.status} | Factory:${q.factory?.name||'N/A'} | Items:${(q.order?.lineItems||[]).map((li: any) => li.category).join(', ')} | Submitted:${q.submittedAt?.slice(0,10)}`
                ).join('\n')}`
                : 'User has no current orders.';
            return `You are Auctave Brain, the AI assistant for Auctave — a B2B garment sourcing platform connecting buyers with verified factories.

${factoriesCtx}

${ordersCtx}

PLATFORM FAQs:
- To place an order: Browse factories in Sourcing, select one, click "Request Quote" and fill in product specs
- Payment terms: Negotiated per factory, typically 30-50% deposit before production
- Lead times: Usually 6-14 weeks depending on factory and quantity
- Minimum orders (MOQ): Each factory sets its own MOQ, typically 100-500 units
- Trust tiers: Gold > Silver > Bronze > Unverified (based on completed orders, on-time delivery, quality)
- Certifications available: GOTS, ISO 9001, OEKO-TEX, BSCI, SA8000
- Files/samples: Upload tech packs, reference images when submitting a quote request
- Negotiation: After a factory responds, you can negotiate pricing directly in My Quotes

RESPONSE RULES:
1. Keep replies concise (3-5 sentences max). Be warm, professional, and specific.
2. When suggesting factories, append [FACTORIES:id1,id2,id3] at the very end of your response — use the exact IDs from the list above. Pick 2-3 factories whose specialties best match the user's request. Only include this tag if you are recommending specific factories.
3. When showing order status, append [ORDERS:${orders.slice(0,5).map(q=>q.id).join(',')||'none'}] at the very end — only include order IDs relevant to what the user asked. Only include this tag if they asked about orders.
4. When the user wants to start a new order and has given enough details (at minimum a product category), append [START_ORDER:category=VALUE,qty=VALUE,fabric=VALUE] at the very end — fill in what they told you, leave others as "unspecified".
5. Never fabricate factory IDs — only use IDs from the list above.

User message: "${userMsg}"`;
        };

        const parseAIResponse = (raw: string): AIChatMessage => {
            let text = raw;
            let suggestedFactories: Factory[] | undefined;
            let relatedOrders: QuoteRequest[] | undefined;
            let startOrderData: AIChatMessage['startOrderData'] | undefined;

            const factoryMatch = text.match(/\[FACTORIES:([^\]]+)\]/);
            if (factoryMatch) {
                const ids = factoryMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                const found = ids.map(id => factoriesRef.current.find(f => f.id === id)).filter(Boolean) as Factory[];
                if (found.length > 0) suggestedFactories = found;
                text = text.replace(factoryMatch[0], '').trim();
            }

            const ordersMatch = text.match(/\[ORDERS:([^\]]+)\]/);
            if (ordersMatch) {
                const ids = ordersMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                const found = ids.map(id => quoteRequests.find((q: QuoteRequest) => q.id === id)).filter(Boolean) as QuoteRequest[];
                if (found.length > 0) relatedOrders = found;
                text = text.replace(ordersMatch[0], '').trim();
            }

            const orderMatch = text.match(/\[START_ORDER:([^\]]+)\]/);
            if (orderMatch) {
                const params: Record<string, string> = {};
                orderMatch[1].split(',').forEach(pair => {
                    const eqIdx = pair.indexOf('=');
                    if (eqIdx > 0) params[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
                });
                startOrderData = { category: params.category, qty: params.qty, fabric: params.fabric };
                text = text.replace(orderMatch[0], '').trim();
            }

            return { text, sender: 'ai', suggestedFactories, relatedOrders, startOrderData };
        };

        const handleSend = async (overrideText?: string) => {
            const msgText = overrideText ?? input;
            if (!msgText.trim() || isLoading) return;
            setMessages(prev => [...prev, { text: msgText, sender: 'user' }]);
            if (!overrideText) setInput('');
            setIsLoading(true);
            try {
                const prompt = buildPrompt(msgText);
                const aiResponse = await callGeminiAPI(prompt);
                setMessages(prev => [...prev, parseAIResponse(aiResponse)]);
            } catch {
                setMessages(prev => [...prev, { text: "Sorry, I couldn't fetch that. Please try again.", sender: 'ai' }]);
            } finally {
                setIsLoading(false);
            }
        };

        // ── Derived ───────────────────────────────────────────────────────────
        const sortedQuoteRequests = useMemo(
            () => [...quoteRequests].sort((a, b) => getLatestMessageTime(b).localeCompare(getLatestMessageTime(a))),
            [quoteRequests]
        );
        const totalQuoteUnread = sortedQuoteRequests.reduce((s, q) => s + getClientUnread(q), 0);
        const filteredQuotes = sortedQuoteRequests.filter(rfq => {
            if (!quotesSearch.trim()) return true;
            const s = quotesSearch.toLowerCase();
            return rfq.id.toLowerCase().includes(s) || rfq.status.toLowerCase().includes(s)
                || rfq.order?.lineItems?.some((li: any) => li.category?.toLowerCase().includes(s));
        });
        const lineItems: any[] = selectedRFQ?.order?.lineItems || [];
        const chatHistory: NegotiationHistoryItem[] = selectedRFQ
            ? (selectedRFQ.negotiation_details?.history || [])
                .filter(h => {
                    if (lineItems.length <= 1) return true;
                    return h.relatedLineItemId === activeLineItemId || (h as any).lineItemPrices?.some((p: any) => p.lineItemId === activeLineItemId);
                })
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            : [];

        // ── Inline attachment preview ──────────────────────────────────────────
        const ClientAttachmentPreview: React.FC<{ path: string; isClient?: boolean; displayName?: string }> = ({ path, isClient = false, displayName }) => {
            const [url, setUrl] = useState('');
            const [lightbox, setLightbox] = useState(false);
            const name = displayName || (path.split('/').pop() || path).replace(/^\d+_/, '');
            const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
            const imgExt = IMAGE_EXTS.includes(path.split('.').pop()?.toLowerCase() || '');
            useEffect(() => {
                supabase.storage.from('quote-attachments').createSignedUrl(path, 3600)
                    .then(({ data }) => setUrl(data?.signedUrl || ''));
            }, [path]);
            if (!url) return <div className={`w-full h-12 rounded-xl animate-pulse ${isClient ? 'bg-white/15' : 'bg-gray-200 dark:bg-gray-700'}`} />;
            const boxCls = isClient
                ? 'bg-white/15 hover:bg-white/25 border-white/25 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200';
            const iconCls = isClient ? 'text-white/70' : 'text-gray-400';
            if (imgExt) return (
                <>
                    <div className={`rounded-xl border overflow-hidden ${boxCls}`}>
                        <div className="relative group cursor-pointer" onClick={() => setLightbox(true)}>
                            <img src={url} alt={name} className="w-full max-h-40 object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3">
                                <Eye size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                <a href={url} download={name} onClick={e => e.stopPropagation()} className="text-white opacity-0 group-hover:opacity-100 transition-opacity"><Download size={18} /></a>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1.5">
                            <FileText size={12} className={`flex-shrink-0 ${iconCls}`} />
                            <span className="text-[11px] truncate flex-1">{name}</span>
                        </div>
                    </div>
                    {lightbox && createPortal(
                        <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
                            <img src={url} alt={name} className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
                            <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors" onClick={() => setLightbox(false)}><X size={20} /></button>
                            <a href={url} download={name} className="absolute top-4 right-16 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors" onClick={e => e.stopPropagation()}><Download size={20} /></a>
                        </div>,
                        document.body
                    )}
                </>
            );
            return (
                <a href={url} target="_blank" rel="noopener noreferrer" download={name} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${boxCls}`}>
                    <FileText size={14} className={`flex-shrink-0 ${iconCls}`} />
                    <span className="text-xs truncate flex-1">{name}</span>
                    <Download size={12} className={`flex-shrink-0 ${iconCls}`} />
                </a>
            );
        };

        return (
            <>
                {/* Floating button */}
                <div className="fixed bottom-[90px] md:bottom-6 right-4 md:right-6 z-50">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="relative bg-gradient-to-br from-red-500 to-red-700 text-white p-4 rounded-full shadow-[0_4px_16px_rgba(185,28,28,0.3)] hover:shadow-[0_6px_20px_rgba(185,28,28,0.45)] transition-all duration-300 hover:scale-110 group"
                    >
                        {isOpen ? <X className="h-8 w-8" /> : <Sparkles className="h-8 w-8 group-hover:rotate-12 transition-transform duration-300" />}
                        <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                        {!isOpen && totalQuoteUnread > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-white text-[#c20c0b] text-[10px] font-bold rounded-full flex items-center justify-center shadow-md border border-red-100">
                                {totalQuoteUnread > 99 ? '99+' : totalQuoteUnread}
                            </span>
                        )}
                    </button>
                </div>

                {isOpen && createPortal(
                    <div
                        className="fixed bottom-[90px] md:bottom-6 right-3 md:right-6 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-white/10 overflow-hidden select-none"
                        style={{
                            width: `min(${panelSize.w}px, calc(100vw - 24px))`,
                            height: `min(${panelSize.h}px, calc(100svh - 160px))`,
                        }}
                    >
                        {/* Resize handle */}
                        <div
                            onMouseDown={onResizeMouseDown}
                            className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                            title="Drag to resize"
                        >
                            <GripVertical size={13} className="text-gray-400 rotate-45" />
                        </div>

                        {/* ── Header ── */}
                        <div className="bg-red-700 text-white flex-shrink-0">
                            <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                                {activeTab === 'quotes' && quotesView === 'chat' ? (
                                    <button onClick={goBackQuotes} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
                                        <ArrowLeft size={17} />
                                    </button>
                                ) : (
                                    <div className="p-1.5 flex-shrink-0">
                                        {activeTab === 'ai' ? <Sparkles size={17} className="text-white" /> : <MessageSquare size={17} className="text-white" />}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-white truncate leading-tight">
                                        {activeTab === 'ai' ? 'Auctave Brain' : quotesView === 'chat' ? `RFQ #${selectedRFQ?.id.slice(0, 8).toUpperCase()}` : 'My Quotes'}
                                    </p>
                                    <p className="text-[11px] text-red-100 truncate leading-tight">
                                        {activeTab === 'ai' ? 'AI sourcing assistant' : quotesView === 'chat' ? (selectedRFQ?.factory?.name || '') : `${quoteRequests.length} quote${quoteRequests.length !== 1 ? 's' : ''}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {activeTab === 'quotes' && quotesView === 'chat' && selectedRFQ && (
                                        <button
                                            onClick={() => { navigate('/quote/' + selectedRFQ.id); setIsOpen(false); }}
                                            className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-semibold text-white transition-colors"
                                            title="Open quote detail page"
                                        >
                                            <ExternalLink size={12} /> Open
                                        </button>
                                    )}
                                    {activeTab === 'quotes' && quotesView === 'rfqs' && (
                                        <button onClick={fetchUserQuotes} disabled={isQuotesLoading} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white" title="Refresh">
                                            <RefreshCw size={14} className={isQuotesLoading ? 'animate-spin' : ''} />
                                        </button>
                                    )}
                                    <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"><X size={17} /></button>
                                </div>
                            </div>
                            {/* Tab bar */}
                            <div className="flex px-3 gap-2 pb-0">
                                {(['ai', 'quotes'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); }}
                                        className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition-all duration-200 relative tracking-wide ${
                                            activeTab === tab
                                                ? 'bg-white text-red-700 shadow-sm'
                                                : 'bg-red-800/60 text-white/70 hover:bg-red-800 hover:text-white'
                                        }`}
                                    >
                                        {tab === 'ai' ? 'AI Assistant' : 'My Quotes'}
                                        {tab === 'quotes' && totalQuoteUnread > 0 && (
                                            <span className="absolute -top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                                {totalQuoteUnread > 9 ? '9+' : totalQuoteUnread}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ═══ AI TAB ═══ */}
                        {activeTab === 'ai' && (
                            <>
                                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                                    {messages.map((msg, index) => (
                                        <div key={index} className={`flex flex-col ${msg.sender === 'ai' ? 'items-start' : 'items-end'}`}>
                                            {/* Bubble */}
                                            <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                                msg.sender === 'ai'
                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                                                    : 'bg-red-600 text-white rounded-tr-sm'
                                            }`}>
                                                {msg.text}
                                            </div>

                                            {/* Factory suggestion cards */}
                                            {msg.suggestedFactories && msg.suggestedFactories.length > 0 && (
                                                <div className="mt-2 w-full space-y-2">
                                                    {msg.suggestedFactories.map(factory => (
                                                        <div key={factory.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-sm">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{factory.name}</p>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                                                                        <span className="text-xs text-gray-500 truncate">{factory.location}</span>
                                                                        <span className="text-gray-300">·</span>
                                                                        <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                                                                        <span className="text-xs text-gray-500">{factory.rating}/5</span>
                                                                    </div>
                                                                    {factory.specialties && factory.specialties.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                                            {factory.specialties.slice(0, 3).map(s => (
                                                                                <span key={s} className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">{s}</span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <p className="text-[11px] text-gray-400 mt-1">MOQ: {factory.minimumOrderQuantity?.toLocaleString()} units · {factory.turnaround}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => { handleSetCurrentPage('factoryDetail', factory); setIsOpen(false); }}
                                                                    className="flex-shrink-0 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                                                                >
                                                                    View
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Order status cards */}
                                            {msg.relatedOrders && msg.relatedOrders.length > 0 && (
                                                <div className="mt-2 w-full space-y-2">
                                                    {msg.relatedOrders.map(order => {
                                                        const statusColors: Record<string, string> = {
                                                            'Pending': 'bg-amber-100 text-amber-700',
                                                            'Responded': 'bg-blue-100 text-blue-700',
                                                            'In Negotiation': 'bg-purple-100 text-purple-700',
                                                            'Accepted': 'bg-green-100 text-green-700',
                                                            'Admin Accepted': 'bg-green-100 text-green-700',
                                                            'Client Accepted': 'bg-green-100 text-green-700',
                                                            'Declined': 'bg-red-100 text-red-700',
                                                        };
                                                        const items = order.order?.lineItems || [];
                                                        return (
                                                            <div key={order.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-sm">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                                                                            <span className="text-[11px] text-gray-500">{order.factory?.name || 'No factory'}</span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 truncate">{items.map((li: any) => li.category).join(', ') || 'No items'}</p>
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">#{order.id.slice(0, 8).toUpperCase()} · {order.submittedAt?.slice(0, 10)}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => { navigate('/quote/' + order.id); setIsOpen(false); }}
                                                                        className="flex-shrink-0 text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                                                                    >
                                                                        Open
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Start order prompt */}
                                            {msg.startOrderData && (
                                                <div className="mt-2 w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-xl p-3">
                                                    <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Ready to start your order?</p>
                                                    {msg.startOrderData.category && msg.startOrderData.category !== 'unspecified' && (
                                                        <p className="text-[11px] text-gray-600 dark:text-gray-400">Product: {msg.startOrderData.category}{msg.startOrderData.qty && msg.startOrderData.qty !== 'unspecified' ? ` · Qty: ${msg.startOrderData.qty}` : ''}{msg.startOrderData.fabric && msg.startOrderData.fabric !== 'unspecified' ? ` · Fabric: ${msg.startOrderData.fabric}` : ''}</p>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            const qty = parseInt(msg.startOrderData!.qty || '0') || 1000;
                                                            setOrderFormData({
                                                                lineItems: [{
                                                                    id: Date.now(),
                                                                    category: msg.startOrderData!.category && msg.startOrderData!.category !== 'unspecified' ? msg.startOrderData!.category : '',
                                                                    fabricQuality: msg.startOrderData!.fabric && msg.startOrderData!.fabric !== 'unspecified' ? msg.startOrderData!.fabric : '',
                                                                    weightGSM: '', styleOption: '', qty, containerType: '',
                                                                    targetPrice: '', packagingReqs: '', labelingReqs: '',
                                                                    sizeRange: [], customSize: '', sizeRatio: {},
                                                                    sleeveOption: '', printOption: '', trimsAndAccessories: '',
                                                                    specialInstructions: '', quantityType: 'units',
                                                                }],
                                                                shippingCountry: '', shippingPort: '',
                                                            });
                                                            handleSetCurrentPage('orderForm');
                                                            setIsOpen(false);
                                                        }}
                                                        className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <ExternalLink size={12} /> Open Order Form
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Quick action chips (shown only with the greeting) */}
                                    {messages.length === 1 && !isLoading && (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {[
                                                'Find factories for T-shirts',
                                                'Check my order status',
                                                'Help me place an order',
                                                'What are the lead times?',
                                                'What certifications are available?',
                                            ].map(chip => (
                                                <button
                                                    key={chip}
                                                    onClick={() => handleSend(chip)}
                                                    className="text-[11px] bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 transition-colors"
                                                >
                                                    {chip}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                                    <div className="p-1 border dark:border-gray-600 rounded-xl flex items-center bg-white dark:bg-gray-700">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                                            placeholder="Ask about factories, orders, or get help…"
                                            className="flex-1 px-2 py-1.5 text-sm border-none focus:outline-none focus:ring-0 bg-transparent text-gray-800 dark:text-white placeholder-gray-400"
                                        />
                                        <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="bg-red-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 text-white disabled:text-gray-400 p-2 rounded-lg hover:bg-red-700 transition disabled:opacity-60">
                                            <Send size={15} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ═══ MY QUOTES TAB ═══ */}
                        {activeTab === 'quotes' && (
                            <>
                                {/* Search bar (list view only) */}
                                {quotesView === 'rfqs' && (
                                    <div className="px-3 py-2 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                                            <Search size={13} className="text-gray-400 flex-shrink-0" />
                                            <input value={quotesSearch} onChange={e => setQuotesSearch(e.target.value)}
                                                placeholder="Search RFQs, products…"
                                                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                                            />
                                            {quotesSearch && <button onClick={() => setQuotesSearch('')}><X size={12} className="text-gray-400 hover:text-gray-600" /></button>}
                                        </div>
                                    </div>
                                )}

                                {/* ── RFQ LIST ── */}
                                {quotesView === 'rfqs' && (
                                    <div className="flex-1 overflow-y-auto">
                                        {isQuotesLoading ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                                                <RefreshCw size={20} className="animate-spin" /><span className="text-sm">Loading…</span>
                                            </div>
                                        ) : filteredQuotes.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                                <Package size={32} className="opacity-30" />
                                                <span className="text-sm">{quotesSearch ? 'No RFQs match' : 'No quotes yet'}</span>
                                            </div>
                                        ) : filteredQuotes.map(rfq => {
                                            const unread = getClientUnread(rfq);
                                            const items: any[] = rfq.order?.lineItems || [];
                                            const history = rfq.negotiation_details?.history || [];
                                            const lastMsg = history.length ? history[history.length - 1] : null;
                                            const categories = items.map((li: any) => li.category).filter(Boolean).slice(0, 3);
                                            return (
                                                <button key={rfq.id} onClick={() => openRFQ(rfq)}
                                                    className="w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 font-mono">#{rfq.id.slice(0, 8).toUpperCase()}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadgeClass(rfq.status)}`}>{rfq.status}</span>
                                                        {unread > 0 && (
                                                            <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-[#c20c0b] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                                                {unread > 9 ? '9+' : unread}
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] text-gray-400 tabular-nums ${unread > 0 ? '' : 'ml-auto'}`}>{timeAgoFn(getLatestMessageTime(rfq))}</span>
                                                    </div>
                                                    {categories.length > 0 && (
                                                        <p className="flex flex-wrap gap-1 mb-1">
                                                            {categories.map((cat, i) => (
                                                                <span key={i} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] text-gray-500 dark:text-gray-400">{cat}</span>
                                                            ))}
                                                            {items.length > 3 && <span className="text-gray-400 text-[10px]">+{items.length - 3} more</span>}
                                                        </p>
                                                    )}
                                                    <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                                        {lastMsg ? `${lastMsg.sender === 'factory' ? 'Factory: ' : 'You: '}${lastMsg.message || '📎 Attachment'}` : <span className="italic">No messages yet</span>}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* ── CHAT VIEW ── */}
                                {quotesView === 'chat' && selectedRFQ && (
                                    <div className="flex flex-col flex-1 min-h-0">
                                        {/* Order details strip */}
                                        <div className="border-b border-gray-100 dark:border-white/10 flex-shrink-0">
                                            <button
                                                onClick={() => setOrderDetailsExpanded(v => !v)}
                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left"
                                            >
                                                <Package size={13} className="text-gray-400 flex-shrink-0" />
                                                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex-1">
                                                    Order Details
                                                    <span className="ml-1.5 font-normal text-gray-400">
                                                        · {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
                                                        {selectedRFQ.order?.shippingCountry ? ` · ${selectedRFQ.order.shippingCountry}` : ''}
                                                    </span>
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClass(selectedRFQ.status)}`}>{selectedRFQ.status}</span>
                                                <ChevronRight size={13} className={`text-gray-400 flex-shrink-0 transition-transform ${orderDetailsExpanded ? 'rotate-90' : ''}`} />
                                            </button>
                                            {orderDetailsExpanded && (
                                                <div className="px-3 pb-2.5 space-y-1.5 max-h-44 overflow-y-auto bg-gray-50/60 dark:bg-gray-800/20">
                                                    {lineItems.map((li: any, i: number) => (
                                                        <div key={li.id ?? i} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-white/5">
                                                            <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{li.category}</p>
                                                                <p className="text-[10px] text-gray-400 truncate">
                                                                    {[li.fabricQuality, li.weightGSM && `${li.weightGSM} GSM`, (li.qty && `${li.qty} units`) || li.containerType].filter(Boolean).join(' · ')}
                                                                </p>
                                                            </div>
                                                            {li.targetPrice && <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 flex-shrink-0">${li.targetPrice}</span>}
                                                        </div>
                                                    ))}
                                                    {(selectedRFQ.order?.shippingCountry || selectedRFQ.order?.shippingPort) && (
                                                        <p className="text-[10px] text-gray-400 px-1">
                                                            {[selectedRFQ.order.shippingCountry && `📍 ${selectedRFQ.order.shippingCountry}`, selectedRFQ.order.shippingPort && `🚢 ${selectedRFQ.order.shippingPort}`].filter(Boolean).join('  ·  ')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Product tabs */}
                                        {lineItems.length > 1 && (
                                            <div className="flex overflow-x-auto px-3 pt-2 pb-1.5 gap-1.5 border-b border-gray-100 dark:border-white/10 flex-shrink-0 scrollbar-none">
                                                {lineItems.map((li: any) => (
                                                    <button key={li.id} onClick={() => setActiveLineItemId(li.id)}
                                                        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                                                            activeLineItemId === li.id
                                                                ? 'bg-[#c20c0b] text-white shadow-sm'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                        }`}
                                                    >{li.category}</button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                                            {chatHistory.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                                                    <MessageSquare size={26} className="opacity-30" />
                                                    <span className="text-sm text-center">No messages yet.<br /><span className="text-xs opacity-70">Send the first message below.</span></span>
                                                </div>
                                            ) : (() => {
                                                const adminLastRead = selectedRFQ.negotiation_details?.adminLastRead || '';
                                                return chatHistory.map((h, i) => {
                                                    const isClient = h.sender === 'client';
                                                    const isRead = isClient && adminLastRead !== '' && h.timestamp <= adminLastRead;
                                                    return (
                                                        <div key={h.id || i} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                                                            {!isClient && (
                                                                <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-600 dark:text-gray-300 flex-shrink-0 mr-1.5 mt-auto mb-0.5">
                                                                    {selectedRFQ.factory?.imageUrl
                                                                        ? <img src={selectedRFQ.factory.imageUrl} alt={selectedRFQ.factory?.name || 'F'} className="w-full h-full object-cover" />
                                                                        : (selectedRFQ.factory?.name || 'F')[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className={`max-w-[80%] flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                                                                <div className={`rounded-2xl px-3 py-2 shadow-sm text-sm ${isClient ? 'bg-[#c20c0b] text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-none'}`}>
                                                                    {(h as any).price && <p className="font-bold text-base mb-0.5">${(h as any).price}</p>}
                                                                    {h.message && <p className="whitespace-pre-wrap leading-relaxed">{h.message}</p>}
                                                                    {h.attachments && h.attachments.map((path, ai) => (
                                                                        <div key={ai} className="mt-2 w-full">
                                                                            <ClientAttachmentPreview path={path} isClient={isClient} displayName={h.attachmentNames?.[ai]} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1">
                                                                    {isClient ? 'You' : (selectedRFQ.factory?.name || 'Factory')} · {timeAgoFn(h.timestamp)}
                                                                    {isClient && (
                                                                        isRead
                                                                            ? <CheckCheck size={12} className="text-blue-400" />
                                                                            : <Check size={12} className="text-gray-400" />
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {/* Attachment previews */}
                                        {attachFiles.length > 0 && (
                                            <div className="px-3 pb-1 flex-shrink-0 flex flex-wrap gap-2">
                                                {attachFiles.map((f, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl pl-2 pr-1.5 py-1.5 border border-gray-200 dark:border-white/10 max-w-[180px]">
                                                        {attachPreviews[idx]
                                                            ? <img src={attachPreviews[idx]} alt="preview" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                                            : <FileText size={16} className="text-gray-500 flex-shrink-0" />
                                                        }
                                                        <span className="flex-1 text-xs text-gray-700 dark:text-gray-200 truncate">{f.name}</span>
                                                        <button onClick={() => removeAttachment(idx)} className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"><X size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Input */}
                                        <div className="border-t border-gray-100 dark:border-white/10 px-3 py-2.5 flex-shrink-0 flex items-end gap-2 bg-white dark:bg-gray-900">
                                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} disabled={!canSend} />
                                            <button onClick={() => fileInputRef.current?.click()}
                                                disabled={!canSend}
                                                className="p-2 text-gray-400 hover:text-[#c20c0b] transition-colors flex-shrink-0 relative disabled:opacity-40 disabled:cursor-not-allowed" title={!canSend ? 'View-only access' : 'Attach files'}>
                                                <Paperclip size={18} />
                                                {attachFiles.length > 0 && (
                                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-[#c20c0b] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                                        {attachFiles.length}
                                                    </span>
                                                )}
                                            </button>
                                            <textarea
                                                ref={quotesInputRef}
                                                value={quotesMessage}
                                                onChange={e => setQuotesMessage(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuotesSend(); } }}
                                                placeholder={canSend ? "Type a message… (Enter to send)" : "View-only access"}
                                                rows={1}
                                                disabled={!canSend}
                                                className="flex-1 bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-white rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#c20c0b]/30 max-h-28 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ fieldSizing: 'content' } as any}
                                            />
                                            <button
                                                onClick={handleQuotesSend}
                                                disabled={!canSend || (!quotesMessage.trim() && !attachFiles.length) || quotesSending}
                                                title={!canSend ? 'View-only access' : undefined}
                                                className="p-2.5 bg-[#c20c0b] text-white rounded-xl hover:bg-[#a50a09] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                                            >
                                                {quotesSending ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>,
                    document.body
                )}
            </>
        );
    };

    // --- Page Renderer ---
    // Function to determine which page component to render based on state
    const renderPage = () => {
        // isAuthReady initialises to true when there is no stored session (login page
        // must appear instantly) and to false when a stored session exists (wait for
        // Supabase to confirm it). isAuthenticating covers the in-flight period after
        // the user submits credentials. authCallbackFired is intentionally excluded
        // here — it is only needed by ProtectedRoute where it prevents premature
        // redirects; adding it to this gate caused an unnecessary preloader flash for
        // users who have no stored session.
        if (!isAuthReady || isAuthenticating) {
            return <KnittingPreloader fullScreen />;
        }

        // Route guards: prevent protected pages from flashing for unauthenticated deep links.
        // ROUTE_MAP misses unknown page names — those fall through to the switch default safely.
        const routeMeta = ROUTE_MAP.get(currentPage as PageName);
        if (routeMeta?.protected && !user) {
            return <Navigate to="/login" replace />;
        }
        if (routeMeta?.adminOnly && !isAdmin) {
            return <Navigate to="/sourcing" replace />;
        }

        // Hard gate: if user is authenticated, has no profile, and is a new signup, show onboarding.
        // Existing users without a profile record are NOT gated — they go straight to the app.
        if (user && userProfile === null && isNewUserSignup && currentPage !== 'login' && currentPage !== 'createPassword') {
            return <OnboardingPage user={user} onComplete={saveUserProfile} isLoading={isProfileLoading} onThemeChange={setDarkMode} onBeforeComplete={(data) => { setHelloSplash(data); setTimeout(() => setHelloSplash(null), 3000); }} />;
        }

        // 1. Check Dynamic Routes from MasterController (Enables Extensibility)
        const DynamicComponent = masterController.getRouteComponent(currentPage);
        if (DynamicComponent) {
            return <DynamicComponent {...layoutProps} />;
        }

        // Switch statement to compute the appropriate page component
        let pageContent: React.ReactNode;
        switch (currentPage) {
            case 'login': pageContent = <LoginPage showToast={showToast} setAuthError={setAuthError} authError={authError} onAuthStart={() => setIsAuthenticating(true)} onAuthError={() => setIsAuthenticating(false)} />; break;
            // 'profile' is now handled by <Route path="/profile"> — see render below
            case 'createPassword': pageContent = <CreatePasswordPage />; break;
            case 'sourcing': pageContent = <SourcingPage
                {...layoutProps}
                userProfile={userProfile}
                handleSelectFactory={handleSelectFactory}
                selectedGarmentCategory={selectedGarmentCategory}
                setSelectedGarmentCategory={setSelectedGarmentCategory}
                showToast={showToast}
                quoteRequests={quoteRequests}
            />; break;
            case 'orderForm': pageContent = <OrderFormPage
                {...layoutProps}
                handleSubmitOrderForm={handleSubmitOrderForm}
                handleAddToQuoteRequest={addToQuoteRequest}
                quoteRequests={quoteRequests}
                initialLineItems={orderFormInitialLineItems}
                preSelectedFactory={orderFormPreFactory}
            />; break;
            case 'crm': pageContent = (
                <MainLayout {...layoutProps}>
                    <CrmDashboard callGeminiAPI={callGeminiAPI} handleSetCurrentPage={handleSetCurrentPage} user={user} darkMode={darkMode} activeCrmOrderKey={activeCrmOrderKey} />
                </MainLayout>
            ); break;
            case 'factorySuggestions': pageContent = <FactorySuggestionsPage />; break;
            case 'factoryDetail': pageContent = selectedFactory
                ? <FactoryDetailPage {...layoutProps} selectedFactory={selectedFactory} suggestedFactories={suggestedFactories} initialTab="overview" onSubmitRFQ={submitQuoteRequest} />
                : <Navigate to="/sourcing" replace />;
                break;
            case 'factoryCatalog': pageContent = selectedFactory
                ? <FactoryDetailPage {...layoutProps} selectedFactory={selectedFactory} suggestedFactories={suggestedFactories} initialTab="catalog" onSubmitRFQ={submitQuoteRequest} />
                : <Navigate to="/sourcing" replace />;
                break;
            case 'factoryTools': pageContent = <FactoryToolsPage />; break;
            // 'settings' is now handled by <Route path="/settings"> — see render below
            case 'teamSettings': pageContent = (
                <MainLayout {...layoutProps}>
                    <TeamSettingsPage user={user} showToast={showToast} darkMode={darkMode} />
                </MainLayout>
            ); break;
            // 'tracking' is now handled by <Route path="/tracking"> — see render below
            case 'trending': pageContent = <TrendingPageComponent {...layoutProps} />; break;
            case 'myQuotes': pageContent = <MyQuotesPage quoteRequests={quoteRequests} handleSetCurrentPage={handleSetCurrentPage} layoutProps={layoutProps} isLoading={isQuotesLoading} onRefresh={fetchUserQuotes} initialFilterStatus={myQuotesFilter} crmOrdersByQuoteId={crmOrdersByQuoteId} />; break;
            case 'quoteRequest': pageContent = <QuoteRequestPage />; break;
            // 'quoteDetail' is now handled by <Route path="/quote/:id"> — see render below
            // 'billing' is now handled by <Route path="/billing"> — see render below
            case 'adminDashboard': pageContent = <AdminDashboardPage {...layoutProps} />; break;
            case 'adminUsers': pageContent = <AdminUsersPage {...layoutProps} />; break;
            case 'adminFactories': pageContent = <AdminFactoriesPage {...layoutProps} />; break;
            case 'adminCRM': pageContent = <AdminCRMPage {...layoutProps} initialOrderId={adminCRMInitialId} />; break;
            case 'adminTrending': pageContent = <AdminTrendingPage {...layoutProps} />; break;
            case 'adminRFQ': pageContent = <AdminRFQPage {...layoutProps} initialQuoteId={adminRFQInitialId} />; break;
            case 'adminLoginSettings': pageContent = <AdminLoginSettingsPage {...layoutProps} />; break;
            case 'adminUserAnalytics': pageContent = <AdminUserAnalyticsPage {...layoutProps} handleSetCurrentPage={handleSetCurrentPage} />; break;
            default: pageContent = <SourcingPage
                {...layoutProps}
                userProfile={userProfile}
                handleSelectFactory={handleSelectFactory}
                selectedGarmentCategory={selectedGarmentCategory}
                setSelectedGarmentCategory={setSelectedGarmentCategory}
                showToast={showToast}
                quoteRequests={quoteRequests}
            />;
        }
        return <>{pageContent}</>;
    };

    // Component to create a new quote request
    const QuoteRequestPage: FC = () => {
        if (!selectedFactory) {
            return <Navigate to="/sourcing" replace />;
        }
        const handleQuoteSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            const quoteData = {
                factory: {
                    id: selectedFactory.id,
                    name: selectedFactory.name,
                    location: selectedFactory.location,
                    imageUrl: selectedFactory.imageUrl,
                },
                order: orderFormData,
                filesPerProduct: [uploadedFiles], // Wrap in per-product array (legacy path: single product)
            };
            submitQuoteRequest(quoteData);
        };
        return (
            <MainLayout {...layoutProps}>
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => handleSetCurrentPage('factoryDetail', selectedFactory)} className="text-[var(--color-primary)] font-semibold mb-4 flex items-center hover:underline">
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Back to Factory Details
                    </button>
                    <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-8 rounded-xl shadow-lg border border-gray-200 dark:border-white/10">
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Request a Quote</h2>
                        <p className="text-gray-500 dark:text-gray-200 mb-6">Review your order details and submit your request to <span className="font-semibold">{selectedFactory.name}</span>.</p>
                        <form onSubmit={handleQuoteSubmit}>
                            <div className="space-y-6">
                                <div className="p-4 border dark:border-white/10 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Factory Information</h3>
                                    <div className="flex items-center gap-4">
                                        <img src={selectedFactory.imageUrl} alt={selectedFactory.name} className="w-16 h-16 rounded-lg object-cover" />
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{selectedFactory.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-200">{selectedFactory.location}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border dark:border-white/10 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Your Order Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        {orderFormData.lineItems.map((item, idx) => (
                                            <div key={idx} className="md:col-span-2 mb-2">
                                                <p className="font-semibold">Item {idx + 1}: {item.category}</p>
                                                <p>Qty: {item.quantityType === 'container' ? item.containerType : item.qty}, Fabric: {item.fabricQuality}, {item.weightGSM} GSM</p>
                                                <p>Style: {item.styleOption}</p>
                                            </div>
                                        ))}
                                        <p className="md:col-span-2 mt-2 border-t dark:border-white/10 pt-2"><strong>Shipping To:</strong> {orderFormData.shippingCountry}, {orderFormData.shippingPort}</p>
                                    </div>
                                </div>
                                {uploadedFiles.length > 0 && (
                                    <div className="p-4 border dark:border-white/10 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Attached Documents</h3>
                                        <ul className="space-y-1">
                                            {uploadedFiles.map((file, index) => (
                                                <li key={index} className="text-sm text-gray-600 flex items-center">
                                                    <FileText size={16} className="mr-2 text-gray-400" />
                                                    {file.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="mt-8 text-right">
                                <button type="submit" className="px-8 py-3 text-white rounded-lg font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition shadow-md">
                                    Submit Quote Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </MainLayout>
        );
    };

    const updateQuoteStatus = (id: string, status: string, additionalData?: Partial<QuoteRequest>) => {
        const now = new Date().toISOString();
        setQuoteRequests(prev => {
            const next = prev.map(q =>
                q.id === id ? { ...q, status: status as any, modified_at: now, ...additionalData } : q
            );
            sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const createCrmOrder = async (quote: QuoteRequest) => {
        const { factory, order } = quote;
        const lineItems = order.lineItems || [];
        const products: CrmProduct[] = lineItems.map((item) => ({
            id: String(item.id),
            name: `${item.qty} ${item.category}${item.styleOption ? ' - ' + item.styleOption : ''}${item.fabricQuality ? ' (' + item.fabricQuality + ')' : ''}`,
            status: 'Pending' as const,
            quantity: item.qty,
        }));
        const productName = products.length === 1 ? products[0].name : `${products.length} Items Order`;
        const firstProductId = products.length > 0 ? products[0].id : 'default';

        const documents = (quote.files || []).map(filePath => ({
            name: filePath.split('/').pop()?.replace(/^\d+_/, '') || 'Attachment',
            type: 'Quote Attachment',
            lastUpdated: new Date().toISOString().split('T')[0],
            path: filePath
        }));
        if (documents.length === 0) {
            documents.push({ name: 'Purchase Order', type: 'PO', lastUpdated: new Date().toISOString().split('T')[0], path: '' });
        }

        const payload = {
            client_id: quote.userId,
            product_name: productName,
            factory_id: factory?.id || null,
            status: 'Pending',
            source_quote_id: quote.id,
            products,
            tasks: [
                { id: Date.now(), name: 'Order Confirmation', status: 'COMPLETE', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date().toISOString().split('T')[0], responsible: 'Admin', actualStartDate: new Date().toISOString().split('T')[0], actualEndDate: new Date().toISOString().split('T')[0], productId: firstProductId },
                { id: Date.now() + 1, name: 'Fabric Sourcing', status: 'TO DO', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], responsible: 'Merch Team', productId: firstProductId }
            ],
            documents
        };

        const { data: createdOrder, error } = await crmService.create(payload);
        if (error) {
            console.error('Failed to create CRM order:', error);
        } else if (createdOrder?.id) {
            setCrmOrdersByQuoteId(prev => ({ ...prev, [quote.id]: createdOrder.id }));
        }

        // Also update local state for immediate UI feedback
        const newOrderId = `PO-2024-${String(Object.keys(crmData).length + 1).padStart(3, '0')}`;
        const newOrder: CrmOrder = {
            customer: userProfile?.companyName || 'N/A',
            product: productName,
            factoryId: factory?.id,
            products,
            documents: documents.map(d => ({ name: d.name, type: d.type, lastUpdated: d.lastUpdated, path: d.path })),
            tasks: payload.tasks.map(t => ({ ...t, status: t.status as CrmTask['status'], actualStartDate: t.status === 'COMPLETE' ? t.plannedStartDate : null, actualEndDate: t.status === 'COMPLETE' ? t.plannedEndDate : null }))
        };
        addNewOrderToCrm(newOrderId, newOrder);
    };

    // Component for billing and escrow management
    const BillingPage: FC = () => {
        const billingData = [
            { id: 'ESC-001', orderId: 'PO-2024-001', product: '5000 Classic Tees', totalAmount: 21250, amountReleased: 10625, amountHeld: 10625, status: 'Partially Paid' },
            { id: 'ESC-002', orderId: 'PO-2024-002', product: '10000 Hoodies', totalAmount: 120000, amountReleased: 60000, amountHeld: 60000, status: 'Awaiting Milestone' },
            { id: 'ESC-003', orderId: 'PO-2024-003', product: '2500 Jackets', totalAmount: 45000, amountReleased: 0, amountHeld: 45000, status: 'Funded' },
        ];

        const totalHeld = billingData.reduce((acc, item) => acc + item.amountHeld, 0);
        const totalReleased = billingData.reduce((acc, item) => acc + item.amountReleased, 0);

        const getStatusColor = (status: string) => {
            switch (status) {
                case 'Partially Paid': return 'bg-blue-100 text-blue-800';
                case 'Awaiting Milestone': return 'bg-yellow-100 text-yellow-800';
                case 'Funded': return 'bg-green-100 text-green-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        };

        return (
            <MainLayout {...layoutProps}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Billing & Escrow</h1>
                        <p className="text-gray-500 dark:text-gray-200 mt-1">Manage and track your order payments.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10">
                          <h3 className="text-sm font-medium text-gray-500">Total in Escrow</h3>
                          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">${totalHeld.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10">
                          <h3 className="text-sm font-medium text-gray-500">Total Released</h3>
                          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">${totalReleased.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10">
                          <h3 className="text-sm font-medium text-gray-500">Next Payout</h3>
                          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">$10,625</p>
                          <p className="text-xs text-gray-400">on July 12, 2025 for PO-2024-001</p>
                      </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    {['Order ID', 'Product', 'Total Value', 'Amount Released', 'Amount in Escrow', 'Status', ''].map(header => (
                                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-200 dark:divide-gray-700">
                                {billingData.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-primary)] hover:underline cursor-pointer">{item.orderId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">{item.product}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">${item.totalAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">${item.amountReleased.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-bold">${item.amountHeld.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">View Details</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </MainLayout>
        );
    };

    // Render the main application structure
    return (
        <OrgProvider user={user}>
        <OrgBridge onOrgOwnerChange={setActiveOrgOwnerId} />
        <div className="antialiased">
            {/* Global styles for fonts and animations */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                :root {
                    --color-primary: ${theme.colors.primary};
                    --color-primary-hover: ${theme.colors.primaryHover};
                }
                body {
                    font-family: 'Inter', sans-serif;
                }
                .font-inter { font-family: 'Inter', sans-serif; }
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                @keyframes card-enter { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-card-enter { opacity: 0; animation: card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

                /* Custom Scrollbar */
                ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 3px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }

                /* Dark Mode Scrollbar */
                .dark ::-webkit-scrollbar-track {
                    background: #111827; 
                }
                .dark ::-webkit-scrollbar-thumb {
                    background: #4b5563;
                }
                .dark ::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                }
            `}</style>
            {/* Render the current page content */}
            <Suspense fallback={<KnittingPreloader fullScreen />}>
                <Routes>
                    {/* ── Migrated pages: proper <Route> with ProtectedRoute guard ── */}
                    <Route path="/settings" element={
                        <ProtectedRoute isAuthReady={isAuthReady && authCallbackFired} user={user}>
                            <SettingsPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/billing" element={
                        <ProtectedRoute isAuthReady={isAuthReady && authCallbackFired} user={user}>
                            <BillingPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/tracking" element={
                        <ProtectedRoute isAuthReady={isAuthReady && authCallbackFired} user={user}>
                            <OrderTrackingPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/profile" element={
                        <ProtectedRoute isAuthReady={isAuthReady && authCallbackFired} user={user}>
                            {(userProfile || !isNewUserSignup)
                                ? <ProfilePage />
                                : <OnboardingPage user={user} onComplete={saveUserProfile} isLoading={isProfileLoading} onThemeChange={setDarkMode} onBeforeComplete={(data) => { setHelloSplash(data); setTimeout(() => setHelloSplash(null), 3000); }} />
                            }
                        </ProtectedRoute>
                    } />

                    {/* ── /quote/new must be declared before /quote/:id so the static
                         segment wins. Without this, React Router matches /quote/new
                         as { id: 'new' } and QuoteDetailPage fires getQuoteById('new'). ── */}
                    <Route path="/quote/new" element={<>{renderPage()}</>} />

                    {/* ── Direct URL access: /quote/:id ── */}
                    <Route path="/quote/:id" element={
                        <ProtectedRoute isAuthReady={isAuthReady && authCallbackFired} user={user}>
                            <QuoteDetailPage
                                selectedQuote={null}
                                handleSetCurrentPage={handleSetCurrentPage}
                                updateQuoteStatus={updateQuoteStatus}
                                createCrmOrder={createCrmOrder}
                                layoutProps={layoutProps}
                            />
                        </ProtectedRoute>
                    } />

                    {/* ── Legacy catch-all: all other pages still use renderPage() switch ── */}
                    <Route path="*" element={<>{renderPage()}</>} />
                </Routes>
            </Suspense>
            {/* Render AI Chat Support for non-admin users */}
            {user && userProfile && !isAdmin && <AIChatSupport />}
            {/* Universal RFQ chat panel — admin only */}
            <Suspense fallback={null}>
                {user && isAdmin && <AdminUniversalChat onNavigate={handleSetCurrentPage} />}
            </Suspense>
            {/* Invite accept/decline dialog */}
            {pendingInvitation && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-white/10 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[var(--color-primary)] to-purple-600 p-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                    <Building2 size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-white/90 text-sm font-semibold">
                                        {pendingInvitation.inviterName} has invited you to join
                                    </p>
                                    <h2 className="text-white text-xl font-bold leading-tight">{pendingInvitation.orgName}</h2>
                                </div>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                                <UserPlus size={18} className="text-[var(--color-primary)] shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Your role</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{pendingInvitation.role}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Accepting will add this workspace to your account. You can switch between your organizations at any time from Settings → Team.
                            </p>
                        </div>
                        {/* Actions */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={handleDeclineInvite}
                                disabled={acceptingInvite}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
                            >
                                <XCircle size={16} /> Decline
                            </button>
                            <button
                                onClick={handleAcceptInvite}
                                disabled={acceptingInvite}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50"
                            >
                                {acceptingInvite
                                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : <CheckCircle size={16} />
                                }
                                {acceptingInvite ? 'Joining...' : 'Accept Invitation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Hello splash overlay — shown after onboarding, sits above everything */}
            {helloSplash && <HelloSplashOverlay data={helloSplash} />}
        </div>
        </OrgProvider>
    );
};

const App: FC = () => {
    return (
        <NotificationProvider>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </NotificationProvider>
    );
};

// OrgProvider is rendered inside AppContent so it has access to the `user` state.
// See the OrgProviderWrapper component injected into AppContent's render tree.

// Export the App component as the default export
export default App;