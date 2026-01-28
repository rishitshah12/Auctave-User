// Import React library and hooks for state management (useState), side effects (useEffect), references (useRef), memoization (useMemo), and types (FC, ReactNode)
import React, { useState, useEffect, useRef, useMemo, FC, ReactNode, useCallback } from 'react';
// Import the configured Supabase client for backend database and auth interactions
import { supabase } from './supabaseClient';
// Import UI icons from lucide-react library
import {
    Star, Clock, MapPin, Package, Truck, List, Plus, ChevronLeft,
    ChevronRight, ChevronDown, X, Bot, Send, CheckCircle, Shirt,
    BadgePercent, BrainCircuit, MessageSquare, ClipboardCopy, FileText, DollarSign,
    GanttChartSquare, LayoutDashboard, MoreHorizontal, Info, Settings, LifeBuoy,
    History, Edit, Anchor, Ship, Warehouse, PackageCheck, Award, Users, Activity, Shield,
    PlayCircle, BarChart as BarChartIcon, FileQuestion, ClipboardCheck, Lock,
    Tag, Weight, Palette, Box, Map as MapIcon, Download, BookOpen, Building, Trash2, Upload, Globe, Moon
} from 'lucide-react';
// Import charting components from recharts for data visualization
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, Cell, PieChart
} from 'recharts';
// Import TypeScript interfaces/types for data structures used in the app
import { UserProfile, OrderFormData, Factory, QuoteRequest, CrmOrder, ToastState, MachineSlot } from './types';
// Import custom components for specific pages and UI elements
import { MainLayout } from '../src/MainLayout';
import { LoginPage } from '../src/LoginPage';
import { SourcingPage } from '../src/SourcingPage';
import { FactoryCard } from '../src/FactoryCard';
import { OrderFormPage } from './OrderFormPage';
import { CRMPage } from './CRMPage';
import CrmDashboard from './CrmDashboard';
import { AiCard } from '../src/AiCard';
import { masterController } from './masterController';
import './index'; // Register Factory Module
import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminFactoriesPage } from './AdminFactoriesPage';
import { AdminCRMPage } from './AdminCRMPage';
import { AdminTrendingPage } from './AdminTrendingPage';
import { AdminRFQPage } from './AdminRFQPage';
import { quoteService } from './quote.service';
import { MyQuotesPage } from './MyQuotesPage';
import { QuoteDetailPage } from './QuoteDetailPage';
import { FactoryDetailPage } from './FactoryDetailPage';
import { theme } from './theme';
import { ToastProvider, useToast } from './ToastContext';

// --- Main App Component ---
// This is the root component of the application
const AppContent: FC = () => {
    // Access showToast from context
    const { showToast } = useToast();

    // --- State Management ---
    
    // State to track which page is currently displayed (default is 'login')
    const [currentPage, setCurrentPage] = useState<string>(() => localStorage.getItem('garment_erp_last_page') || 'login');
    // State to store the authenticated user object from Supabase
    const [user, setUser] = useState<any>(null);
    // State to store the user's extended profile data (name, company, etc.)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    // State to indicate if the authentication check has completed
    const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
    // State to show loading indicator when saving profile
    const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
    // State to store authentication error messages
    const [authError, setAuthError] = useState<string>('');
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
    const [myQuotesFilter, setMyQuotesFilter] = useState<string>('All');

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
    const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>(() => {
        const cached = sessionStorage.getItem(QUOTES_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    });
    // State to store the currently selected quote for viewing details
    const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
    // State to manage loading of quotes
    const [isQuotesLoading, setIsQuotesLoading] = useState<boolean>(() => !sessionStorage.getItem(QUOTES_CACHE_KEY));

    // Calculate notification count (quotes with updates)
    const notificationCount = useMemo(() => {
        return quoteRequests.filter(q => q.status === 'Responded' || q.status === 'In Negotiation').length;
    }, [quoteRequests]);

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
        // Increment pageKey to force re-render of components if needed
        setPageKey(prevKey => prevKey + 1);
        // If navigating to specific detail pages, set the selected data
        if (page === 'quoteRequest' || page === 'factoryDetail' || page === 'factoryCatalog') {
            setSelectedFactory(data as Factory);
        }
        if (page === 'quoteDetail') {
            console.log('[App.tsx] Setting selectedQuote, files:', (data as QuoteRequest)?.files);
            setSelectedQuote(data as QuoteRequest);
        }
        // Reset active CRM order if leaving CRM page
        if (page !== 'crm') {
            setActiveCrmOrderKey(null); 
        }

        if (page === 'myQuotes') {
            if (typeof data === 'string') {
                setMyQuotesFilter(data);
            } else {
                setMyQuotesFilter('All');
            }
        }

        // Update the current page state
        setCurrentPage(page);
        if (page !== 'login') {
            localStorage.setItem('garment_erp_last_page', page);
        }
    };

    // --- Supabase Auth Listener ---
    useEffect(() => {
        // Boot CMS modules (e.g., register factories)
        masterController.boot().catch(err => {
            console.error("CMS Boot Failed:", err);
            showToast(`CMS Startup Error: ${err.message}`, 'error');
        });
    }, []);

    // Effect to handle authentication state changes
    useEffect(() => {
        // Safety timeout to prevent infinite loading if auth callback hangs
        const safetyTimer = setTimeout(() => setIsAuthReady(true), 5000);

        // Subscribe to Supabase auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
                    // Fetch profile from Supabase (admins or clients table)
                    const tableName = isUserAdmin ? 'admins' : 'clients';
                    const { data, error } = await supabase
                        .from(tableName)
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    let currentProfile: UserProfile | null = null;

                    if (data) {
                        // Map database fields to UserProfile interface
                        currentProfile = {
                            name: data.name,
                            companyName: data.company_name,
                            phone: data.phone,
                            email: data.email,
                            country: data.country,
                            jobRole: data.job_role,
                            categorySpecialization: data.category_specialization,
                            yearlyEstRevenue: data.yearly_est_revenue
                        };
                        setUserProfile(currentProfile);
                    } else {
                        if (error && error.code !== 'PGRST116') {
                            console.error('Error fetching profile:', error.message);
                        }
                    }

                    // Enforce Onboarding Flow via MasterController
                    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                        const redirectRoute = masterController.getOnboardingRedirect(session.user, currentProfile);
                        if (redirectRoute) {
                            setCurrentPage(redirectRoute);
                        } else {
                            // If it's INITIAL_SESSION or SIGNED_IN (refresh), try to keep current page if valid
                            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                                const lastPage = localStorage.getItem('garment_erp_last_page');
                                if (lastPage && lastPage !== 'login') {
                                    setCurrentPage(lastPage);
                                } else {
                                    setCurrentPage(isUserAdmin ? 'adminDashboard' : 'sourcing');
                                }
                            }
                        }
                    } else if (event === 'SIGNED_OUT') {
                        // Explicitly handle sign out event
                        setUser(null);
                        setUserProfile(null);
                        setIsAdmin(false);
                        localStorage.removeItem('garment_erp_last_page');
                        setCurrentPage('login');
                    }
                } else {
                    // If no session, go to login
                    setCurrentPage('login');
                }
            } catch (error) {
                console.error("Auth state change error:", error);
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

    // --- Connection Test ---
    // Effect to test Supabase connection on mount
    useEffect(() => {
        const testConnection = async () => {
            // Test connection by checking if we can reach the Supabase instance
            const { error } = await supabase.from('clients').select('count', { count: 'exact', head: true });
            if (error) {
                // It might fail if table doesn't exist yet, which is expected on fresh start
                console.log('Supabase connection check:', error.message);
            } else {
                console.log('✅ Supabase connection successful!');
            }
        };
        testConnection();
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
                if (signal.aborted) return;
                const { data, error } = await quoteService.getQuotesByUser(user.id);

                if (error) throw error;

                if (data && !signal.aborted) {
                    console.log('[App.tsx] Raw quotes from DB:', data.map((q: any) => ({ id: q.id, files: q.files })));
                    const transformedQuotes: QuoteRequest[] = data.map((q: any) => ({
                        id: q.id,
                        factory: q.factory_data,
                        order: q.order_details,
                        status: q.status,
                        submittedAt: q.created_at,
                        acceptedAt: q.accepted_at || q.response_details?.acceptedAt,
                        userId: q.user_id,
                        files: q.files || [],
                        response_details: q.response_details,
                        negotiation_details: q.negotiation_details
                    }));
                    console.log('[App.tsx] Transformed quotes files:', transformedQuotes.map(q => ({ id: q.id, files: q.files })));
                    setQuoteRequests(transformedQuotes);
                    sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(transformedQuotes));
                }
            } catch (error: any) {
                if (error.name === 'AbortError' || signal.aborted) return;
                console.error("Error fetching quotes:", error);
                showToast("Failed to load quotes: " + error.message, "error");
            }
            
            if (!signal.aborted) setIsQuotesLoading(false);
            if (!signal.aborted) setGlobalLoading(false);
        }
    }, [user, isAdmin, showToast, setGlobalLoading]);

    useEffect(() => {
        if (user && !isAdmin && (currentPage === 'myQuotes' || quoteRequests.length === 0)) {
            fetchUserQuotes();
        }
        return () => {
            if (quotesAbortController.current) quotesAbortController.current.abort();
        };
    }, [user, isAdmin, currentPage, fetchUserQuotes, quoteRequests.length]);

    // Effect to listen for real-time updates on quotes for the current user
    useEffect(() => {
        // Only run this for logged-in, non-admin users
        if (!user || isAdmin) return;

        const channel = supabase.channel(`quotes-user-${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'quotes',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                const updatedQuote = payload.new;

                // Transform the updated data to match the application's QuoteRequest type
                const transformedQuote: QuoteRequest = {
                    id: updatedQuote.id,
                    factory: updatedQuote.factory_data,
                    order: updatedQuote.order_details,
                    status: updatedQuote.status,
                    submittedAt: updatedQuote.created_at,
                    acceptedAt: updatedQuote.accepted_at || updatedQuote.response_details?.acceptedAt,
                    userId: updatedQuote.user_id,
                    files: updatedQuote.files || [],
                    response_details: updatedQuote.response_details,
                    negotiation_details: updatedQuote.negotiation_details
                };

                // Update the quotes list with the new data
                setQuoteRequests(prevQuotes => {
                    const updatedQuotes = prevQuotes.map(q => q.id === transformedQuote.id ? transformedQuote : q);
                    // Update sessionStorage cache to keep it in sync
                    sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(updatedQuotes));
                    return updatedQuotes;
                });
                // If the user is viewing the detail page of the updated quote, refresh it too
                setSelectedQuote(prevSelected => (prevSelected && prevSelected.id === transformedQuote.id) ? transformedQuote : prevSelected);

                showToast(`A quote has been updated to: ${updatedQuote.status}`);
            })
            .subscribe();

        // Cleanup subscription on component unmount or user change
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isAdmin]);

    // --- Authentication & Profile Functions (Mocked) ---
    
    // Function to handle user sign out
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

            // Navigate to login page
            setCurrentPage('login');

            // Show success notification
            showToast('You have been logged out successfully.', 'success');
        }
    }, [showToast]);

    // Session Timeout Logic
    useEffect(() => {
        if (!user) return;

        const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
        const LAST_ACTIVITY_KEY = 'garment_erp_last_activity';

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

        const updateActivity = () => {
            const now = Date.now();
            const lastSaved = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
            // Throttle updates to max once per 5 seconds to reduce storage writes
            if (now - lastSaved > 5000) {
                localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
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

    // Session validation on page visibility change (handles refresh and returning to tab)
    useEffect(() => {
        const validateSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session) {
                    // Session is invalid or expired
                    if (user) {
                        showToast('Your session has expired. Please log in again.', 'error');
                        handleSignOut(true);
                    }
                }
            } catch (err) {
                console.error('Session validation error:', err);
            }
        };

        // Validate session when tab becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                validateSession();
            }
        };

        // Validate session on page focus
        const handleFocus = () => {
            if (user) {
                validateSession();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, handleSignOut, showToast]);

    // Function to save or update user profile in Supabase
    const saveUserProfile = async (profileData: Partial<UserProfile>) => {
        if (!user) return;
        setIsProfileLoading(true);
        
        // Prepare data for database update
        const updates = {
            id: user.id,
            name: profileData.name,
            company_name: profileData.companyName,
            phone: profileData.phone,
            email: profileData.email,
            country: profileData.country,
            job_role: profileData.jobRole,
            category_specialization: profileData.categorySpecialization,
            yearly_est_revenue: profileData.yearlyEstRevenue,
            updated_at: new Date().toISOString(),
        };

        const tableName = isAdmin ? 'admins' : 'clients';
        // Perform upsert (insert or update)
        const { error } = await supabase.from(tableName).upsert(updates);

        if (error) {
            console.error("Profile save error:", error);
            if (error.message.includes("Could not find the table") || error.code === '42P01') {
                showToast(`Setup Error: '${tableName}' table missing. Run the SQL script in Supabase.`, 'error');
            } else {
                showToast(error.message, 'error');
            }
        } else {
            // Update local state on success
            setUserProfile(prev => ({ ...prev, ...profileData } as UserProfile));
            showToast('Profile saved successfully!');
            handleSetCurrentPage(isAdmin ? 'adminDashboard' : 'sourcing');
        }
        setIsProfileLoading(false);
    };

    // --- Quote Request Functions ---
    
    // Function to submit a quote request to Supabase
    const submitQuoteRequest = async (quoteData: { factory?: { id: string; name: string; location: string; imageUrl: string }, order: OrderFormData, files?: File[] }) => {
        showToast('Submitting quote request...', 'success');
        try {
            const uploadedFilePaths: string[] = [];

            // 1. Upload Files to Supabase Storage
            if (quoteData.files && quoteData.files.length > 0) {
                for (const file of quoteData.files) {
                    try {
                        // Create a unique file path: userId/timestamp_filename
                        const filePath = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                        
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
            const newQuote: QuoteRequest = {
                id: createdQuote.id,
                factory: createdQuote.factory_data,
                order: createdQuote.order_details,
                status: createdQuote.status,
                submittedAt: createdQuote.created_at,
                userId: createdQuote.user_id,
                files: createdQuote.files || [],
                response_details: createdQuote.response_details,
                negotiation_details: createdQuote.negotiation_details
            };

            // Add to existing quotes and update state immediately
            setQuoteRequests(prevQuotes => {
                const updatedQuotes = [newQuote, ...prevQuotes];
                sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(updatedQuotes));
                return updatedQuotes;
            });

            showToast('Quote request submitted successfully!');
            handleSetCurrentPage('myQuotes');
        } catch (error: any) {
            console.error('Submit quote error:', error);
            showToast('Failed to submit quote: ' + (error.message || 'Unknown error'), 'error');
        }
    };

    const addToQuoteRequest = async (quoteId: string, newOrderDetails: OrderFormData, files: File[]) => {
        showToast('Adding to quote request...', 'success');
        try {
            setGlobalLoading(true);
            const { data: existingQuote, error: fetchError } = await quoteService.getQuoteById(quoteId);
            if (fetchError) throw fetchError;
            if (!existingQuote) throw new Error("Quote not found");

            const uploadedFilePaths: string[] = [];
            if (files && files.length > 0) {
                for (const file of files) {
                    const filePath = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const { data, error } = await supabase.storage
                        .from('quote-attachments')
                        .upload(filePath, file);
                    if (error) throw error;
                    if (data) uploadedFilePaths.push(data.path);
                }
            }

            const existingLineItems = existingQuote.order_details.lineItems || [];
            const newLineItems = newOrderDetails.lineItems.map(item => ({
                ...item,
                id: Date.now() + Math.random() * 1000 // ensure unique id
            }));
            const combinedLineItems = [...existingLineItems, ...newLineItems];

            const updatedOrderDetails = {
                ...existingQuote.order_details,
                lineItems: combinedLineItems,
            };

            const existingFiles = existingQuote.files || [];
            const combinedFiles = [...existingFiles, ...uploadedFilePaths];

            const newStatus = ['Accepted', 'Declined'].includes(existingQuote.status) ? 'In Negotiation' : existingQuote.status;

            const { error: updateError } = await quoteService.update(quoteId, {
                order_details: updatedOrderDetails,
                files: combinedFiles,
                status: newStatus,
            });

            if (updateError) throw updateError;

            showToast('Successfully added to quote request!');
            await fetchUserQuotes();
            
            const transformedQuote: QuoteRequest = {
                id: existingQuote.id,
                factory: existingQuote.factory_data,
                order: updatedOrderDetails,
                status: newStatus as any,
                submittedAt: existingQuote.created_at,
                acceptedAt: existingQuote.accepted_at || existingQuote.response_details?.acceptedAt,
                userId: existingQuote.user_id,
                files: combinedFiles,
                response_details: existingQuote.response_details,
                negotiation_details: existingQuote.negotiation_details
            };
            handleSetCurrentPage('quoteDetail', transformedQuote);
        } catch (error: any) {
            console.error('Add to quote error:', error);
            showToast('Failed to add to quote: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            setGlobalLoading(false);
        }
    };

    // --- Gemini API Call (Live) ---
    
    // Function to call the Gemini AI API via Supabase Edge Function
    const callGeminiAPI = async (prompt: string): Promise<string> => {
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
            showToast(`Error: ${errorMessage}`, 'error');
            return `Error calling AI function: ${errorMessage}`;
        }
    };

    // --- App Feature Functions ---
    // This is now fetched from Supabase in SourcingPage.tsx
    // We keep it here for other pages that haven't been refactored yet.
    const [allFactories, setAllFactories] = useState<Factory[]>([]);

    // Function to handle order form submission
    const handleSubmitOrderForm = (submittedData: OrderFormData, files: File[]) => {
        setOrderFormData(submittedData);
        setUploadedFiles(files);
        
        submitQuoteRequest({
            order: submittedData,
            files: files // Pass actual File objects, not just names
        });
    };

    // Function to handle factory selection
    const handleSelectFactory = (factory: Factory) => {
        setSelectedFactory(factory);
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

    // Component for editing user profile
    const ProfilePage: FC = () => {
        // Initialize profile data from state or defaults
        const [profileData, setProfileData] = useState<Partial<UserProfile>>({
            name: userProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.displayName || '',
            companyName: userProfile?.companyName || '',
            phone: userProfile?.phone || '',
            email: user?.email || '',
            country: userProfile?.country || '',
            jobRole: userProfile?.jobRole || '',
            categorySpecialization: userProfile?.categorySpecialization || '',
            yearlyEstRevenue: userProfile?.yearlyEstRevenue || ''
        });
        // Dropdown options
        const countries = ["Afghanistan","India","United States of America","China","Bangladesh", "Vietnam", "Turkey", "Portugal"];
        const jobRoles = ["Owner/Founder", "CEO/President", "Sourcing Manager", "Designer"];
        const revenueRanges = ["<$1M", "$1M - $5M", "$5M - $10M", "$10M+"];
        
        // Handle input changes
        const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setProfileData(prevData => ({ ...prevData, [name]: value }));
        };
        
        // Handle form submission
        const handleSaveProfile = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!profileData.name || !profileData.companyName || !profileData.phone || !profileData.email) {
                showToast("Please fill all required fields.", "error");
                return;
            }
            await saveUserProfile(profileData);
        };
        return ( <MainLayout {...layoutProps} hideSidebar={!userProfile}> <div className="max-w-2xl mx-auto"> <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-white/10"> <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">{userProfile ? 'Update Your Profile' : 'Complete Your Profile'}</h2> <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Fields marked with * are required to access the platform.</p> {authError && <p className="text-red-500 mb-4">{authError}</p>} <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div> <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label> <input type="text" id="name" name="name" value={profileData.name} onChange={handleProfileChange} required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div> <div> <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name <span className="text-red-500">*</span></label> <input type="text" id="companyName" name="companyName" value={profileData.companyName} onChange={handleProfileChange} required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div> <div className="md:col-span-2"> <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label> <input type="email" id="email" name="email" value={profileData.email} onChange={handleProfileChange} required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div> <div> <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone <span className="text-red-500">*</span></label> <input type="tel" id="phone" name="phone" value={profileData.phone} onChange={handleProfileChange} required className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div> <div> <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label> <select id="country" name="country" value={profileData.country} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"> <option value="">Select a country</option> {countries.map(country => (<option key={country} value={country}>{country}</option>))} </select> </div> <div> <label htmlFor="jobRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Role</label> <select id="jobRole" name="jobRole" value={profileData.jobRole} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"> <option value="">Select a role</option> {jobRoles.map(role => (<option key={role} value={role}>{role}</option>))} </select> </div> <div> <label htmlFor="categorySpecialization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category Specialization</label> <input type="text" id="categorySpecialization" name="categorySpecialization" placeholder="e.g., Activewear, Denim" value={profileData.categorySpecialization} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /> </div> <div> <label htmlFor="yearlyEstRevenue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Est. Yearly Revenue (USD)</label> <select id="yearlyEstRevenue" name="yearlyEstRevenue" value={profileData.yearlyEstRevenue} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"> <option value="">Select a revenue range</option> {revenueRanges.map(range => (<option key={range} value={range}>{range}</option>))} </select> </div> <div className="md:col-span-2 text-right mt-4"> <button type="submit" disabled={isProfileLoading} className="w-full md:w-auto px-6 py-3 text-white rounded-md font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition shadow-md disabled:opacity-50"> {isProfileLoading ? 'Saving...' : (userProfile ? 'Save Profile' : 'Complete Profile & Continue')} </button> </div> </form> </div> </div> </MainLayout> );
    };

    // Component for user settings
    const SettingsPage: FC = () => {
        const [location, setLocation] = useState(userProfile?.country || 'Your Location');
        const handleLocationSave = () => {
            showToast(`Location updated to ${location}`);
        };
        const settingsOptions = [
            { title: "My Profile", description: "Update your personal and company information", icon: <Edit size={20} />, action: () => handleSetCurrentPage('profile'), buttonLabel: "Edit Profile" },
            { title: "Contact Customer Care", description: "Get help with your account or any issue", icon: <LifeBuoy size={20} />, action: () => { window.location.href = 'mailto:support@auctave.com'; }, buttonLabel: "Email Support" },
            { title: "Order Details", description: "View and track all your past and current orders", icon: <History size={20} />, action: () => handleSetCurrentPage('crm'), buttonLabel: "View Orders" },
        ];
        return (
            <MainLayout {...layoutProps}>
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Settings</h1>
                    <div className="space-y-6">
                        {/* Dark Mode Toggle */}
                        <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-3 rounded-lg">
                                    <Moon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Dark Mode</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-200">Adjust the appearance of the application</p>
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
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${darkMode ? 'bg-purple-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {settingsOptions.map((opt, index) => (
                            <div key={index} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-between transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-100 dark:bg-red-900/30 text-[var(--color-primary)] dark:text-red-400 p-3 rounded-lg">{opt.icon}</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{opt.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-200">{opt.description}</p>
                                    </div>
                                </div>
                                <button onClick={opt.action} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm">
                                    {opt.buttonLabel}
                                </button>
                            </div>
                        ))}
                            <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-100 dark:bg-red-900/30 text-[var(--color-primary)] dark:text-red-400 p-3 rounded-lg"><MapPin size={20}/></div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Change Location</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-200">Update your primary business location.</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-4 items-center">
                                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                    <button onClick={handleLocationSave} className="bg-[var(--color-primary)] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[var(--color-primary-hover)] transition">Save</button>
                                </div>
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

    // Component for the AI Chatbot
    const AIChatSupport: FC = () => {
        const [isOpen, setIsOpen] = useState(false);
        const [messages, setMessages] = useState<{ text: string; sender: 'ai' | 'user' }[]>([]);
        const [input, setInput] = useState('');
        const [isLoading, setIsLoading] = useState(false);
        const chatEndRef = useRef<HTMLDivElement>(null);

        // Scroll to bottom on new message
        useEffect(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            if (isOpen && messages.length === 0) {
                setMessages([{ text: "Hello! I'm Auctave Brain. How can I help you with your sourcing today?", sender: 'ai' }])
            }
        }, [isOpen, messages.length]);

        // Handle sending a message
        const handleSend = async () => {
            if (!input.trim() || isLoading) return;
            const userMessage = { text: input, sender: 'user' as 'user' };
            setMessages(prev => [...prev, userMessage]);
            const currentInput = input;
            setInput('');
            setIsLoading(true);

            try {
                const prompt = `You are Auctave Brain, a helpful AI assistant for a garment sourcing platform. Please answer the following user query concisely and professionally: "${currentInput}"`;
                const aiResponse = await callGeminiAPI(prompt);
                setMessages(prev => [...prev, { text: aiResponse, sender: 'ai' }]);
            } catch (error) {
                setMessages(prev => [...prev, { text: "Sorry, I couldn't fetch that information. Please try again.", sender: 'ai' }]);
            } finally {
                setIsLoading(false);
            }
        };

        return (
            <>
                <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-24 md:bottom-6 right-6 bg-[var(--color-primary)] text-white p-4 rounded-full shadow-lg hover:bg-[var(--color-primary-hover)] transition-transform hover:scale-110 z-50">
                    {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
                </button>
                {isOpen && (
                    <div className="fixed bottom-24 right-6 w-full max-w-sm h-[70vh] bg-white/90 backdrop-blur-xl dark:bg-gray-900/95 dark:backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col transition-all duration-300 z-50 animate-fade-in sm:bottom-6 sm:max-w-md border border-gray-200 dark:border-white/10">
                        <header className="p-4 flex items-center gap-2 border-b dark:border-gray-700">
                            <div className="p-1.5 bg-red-100 rounded-md">
                                <Bot className="w-5 h-5 text-[var(--color-primary)]" />
                            </div>
                            <h3 className="font-bold text-sm text-gray-800 dark:text-white">Auctave Brain</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 ml-auto p-1"><X size={20} /></button>
                        </header>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-xs p-3 rounded-lg prose prose-sm ${msg.sender === 'ai' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'bg-blue-500 text-white'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && <div className="flex justify-start"><div className="bg-gray-200 text-gray-800 p-3 rounded-lg animate-pulse">...</div></div>}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="p-1 border dark:border-gray-600 rounded-lg flex items-center bg-white dark:bg-gray-700">
                                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask anything..." className="flex-1 p-2 text-sm border-none focus:outline-none focus:ring-0 bg-transparent text-gray-800 dark:text-white placeholder-gray-400" />
                                <button onClick={handleSend} disabled={isLoading} className="bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-white p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition disabled:opacity-50">
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    };

    // --- Page Renderer ---
    // Function to determine which page component to render based on state
    const renderPage = () => {
        // Show loading spinner if auth is not ready
        if (!isAuthReady) {
            return <div className="flex items-center justify-center min-h-screen bg-gray-100"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[var(--color-primary)]"></div></div>;
        }

        // 1. Check Dynamic Routes from MasterController (Enables Extensibility)
        const DynamicComponent = masterController.getRouteComponent(currentPage);
        if (DynamicComponent) {
            return <DynamicComponent {...layoutProps} />;
        }

        // Switch statement to render the appropriate component
        switch (currentPage) {
            case 'login': return <LoginPage showToast={showToast} setAuthError={setAuthError} authError={authError} />;
            case 'profile': return <ProfilePage />;
            case 'createPassword': return <CreatePasswordPage />;
            case 'sourcing': return <SourcingPage
                {...layoutProps}
                userProfile={userProfile}
                handleSelectFactory={handleSelectFactory}
                selectedGarmentCategory={selectedGarmentCategory}
                setSelectedGarmentCategory={setSelectedGarmentCategory}
                showToast={showToast}
                notificationCount={notificationCount}
                quoteRequests={quoteRequests}
            />;
            case 'orderForm': return <OrderFormPage
                {...layoutProps}
                handleSubmitOrderForm={handleSubmitOrderForm}
                handleAddToQuoteRequest={addToQuoteRequest}
                quoteRequests={quoteRequests}
            />;
            case 'crm': return (
                <MainLayout {...layoutProps}>
                    <CrmDashboard callGeminiAPI={callGeminiAPI} handleSetCurrentPage={handleSetCurrentPage} user={user} darkMode={darkMode} />
                </MainLayout>
            );
            case 'factorySuggestions': return <FactorySuggestionsPage />;
            case 'factoryDetail': return <FactoryDetailPage {...layoutProps} selectedFactory={selectedFactory!} suggestedFactories={suggestedFactories} initialTab="overview" />;
            case 'factoryCatalog': return <FactoryDetailPage {...layoutProps} selectedFactory={selectedFactory!} suggestedFactories={suggestedFactories} initialTab="catalog" />;
            case 'factoryTools': return <FactoryToolsPage />;
            case 'settings': return <SettingsPage />;
            case 'tracking': return <OrderTrackingPage />;
            case 'trending': return <TrendingPage />;
            case 'myQuotes': return <MyQuotesPage quoteRequests={quoteRequests} handleSetCurrentPage={handleSetCurrentPage} layoutProps={layoutProps} isLoading={isQuotesLoading} onRefresh={fetchUserQuotes} initialFilterStatus={myQuotesFilter} />;
            case 'quoteRequest': return <QuoteRequestPage />;
            case 'quoteDetail': return <QuoteDetailPage 
                selectedQuote={selectedQuote} 
                handleSetCurrentPage={handleSetCurrentPage} 
                updateQuoteStatus={updateQuoteStatus}
                createCrmOrder={createCrmOrder}
                layoutProps={layoutProps} 
            />;
            case 'billing': return <BillingPage />;
            case 'adminDashboard': return <AdminDashboardPage {...layoutProps} />;
            case 'adminUsers': return <AdminUsersPage {...layoutProps} />;
            case 'adminFactories': return <AdminFactoriesPage {...layoutProps} />;
            case 'adminCRM': return <AdminCRMPage {...layoutProps} />;
            case 'adminTrending': return <AdminTrendingPage {...layoutProps} />;
            case 'adminRFQ': return <AdminRFQPage {...layoutProps} />;
            default: return <SourcingPage
                {...layoutProps}
                userProfile={userProfile}
                handleSelectFactory={handleSelectFactory}
                selectedGarmentCategory={selectedGarmentCategory}
                setSelectedGarmentCategory={setSelectedGarmentCategory}
                showToast={showToast}
                notificationCount={notificationCount}
                quoteRequests={quoteRequests}
            />;
        }
    };

    // Component for the Trending/News page
    const TrendingPage: FC = () => {
        const trendBlogs = [
            { id: 1, title: 'The Rise of Sustainable Denim', category: 'Materials', author: 'Vogue Business', date: 'June 24, 2025', imageUrl: 'https://ninelondon.co.uk/cdn/shop/articles/Guide_on_Sustainable_Jeans-_The_Future_of_Ethical_Fashion.jpg?v=1742809387' },
            { id: 2, title: 'Utility Wear: Function Meets Fashion', category: 'Styles', author: 'Hypebeast', date: 'June 23, 2025', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT45WPOXDJhJUrtWtQCIhBDEBzdxfZG8wJmig&s' },
            { id: 3, title: 'Tech-Infused Fabrics are the Future', category: 'Innovation', author: 'WGSN', date: 'June 22, 2025', imageUrl: 'https://www.digitaltrends.com/wp-content/uploads/2019/02/190207142242_1_900x600.jpg?fit=720%2C480&p=1' },
        ];
        const fashionShorts = [
            { id: 1, creator: '@fashionista.diaries', views: '1.2M', videoUrl: 'https://youtube.com/shorts/kO-0HbPq1ec?si=k3xoYY4Fgtd2Ed9L', thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=300&h=500&auto=format&fit=crop' },
            { id: 2, creator: '@stylebyraul', views: '890K', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', thumbnail: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=300&h=500&auto=format&fit=crop' },
            { id: 3, creator: '@denimqueen', views: '2.5M', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', thumbnail: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmDXe8m1LiarHW_nFhOakVDDuaRichGrky-Q&s' },
            { id: 4, creator: '@modern.man', views: '750K', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&h=500&auto=format&fit=crop' },
        ];
        const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);

        const FullscreenVideoPlayer: FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
            if (!src) return null;
            return (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]" onClick={onClose}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-[101]">
                        <X size={32} />
                    </button>
                    <div className="relative w-auto h-[90vh] aspect-[9/16]" onClick={e => e.stopPropagation()}>
                        <video src={src} autoPlay controls loop className="w-full h-full rounded-lg" />
                    </div>
                </div>
            )
        }

        return (
            <MainLayout {...layoutProps}>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">What's Trending</h1>
                <p className="text-gray-500 dark:text-gray-200 mb-8">Discover the latest in fashion, materials, and manufacturing.</p>
                {/* Banners */}
                <section className="mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative rounded-xl overflow-hidden h-64 group cursor-pointer col-span-1 md:col-span-2">
                            <img src="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=1200&h=400&auto=format&fit=crop" alt="Summer Collection" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-6 text-white">
                                <h2 className="text-3xl font-bold">Summer 2025 Collections</h2>
                                <p className="mt-1">Explore the vibrant colors and lightweight fabrics defining the season.</p>
                                <button className="mt-4 bg-white text-black font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition">Explore Now</button>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Latest Articles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {trendBlogs.map(blog => (
                            <div key={blog.id} className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden group cursor-pointer">
                                <div className="overflow-hidden">
                                    <img src={blog.imageUrl} alt={blog.title} className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                                <div className="p-6">
                                    <span className="text-xs font-semibold bg-red-100 text-[var(--color-primary)] px-2 py-1 rounded-full">{blog.category}</span>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mt-3 mb-2">{blog.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-200">By {blog.author} · {blog.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                <section>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Fashion Shorts</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {fashionShorts.map(short =>(
                            <div key={short.id} className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/10 group cursor-pointer aspect-[9/16]" onClick={() => setFullscreenVideo(short.videoUrl)}>
                                <img src={short.thumbnail} alt={short.creator} className="absolute inset-0 w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300">
                                    <PlayCircle size={48} className="text-white/80" />
                                </div>
                                <div className="absolute bottom-0 left-0 p-4 text-white">
                                    <p className="font-semibold text-sm">{short.creator}</p>
                                    <p className="text-xs">{short.views} views</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                {fullscreenVideo && <FullscreenVideoPlayer src={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />}
            </MainLayout>
        )
    }

    // Component to create a new quote request
    const QuoteRequestPage: FC = () => {
        if (!selectedFactory) {
            handleSetCurrentPage('sourcing');
            return null;
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
                files: uploadedFiles, // Pass actual File objects
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
        const updatedQuotes = quoteRequests.map(q =>
            q.id === id ? { ...q, status: status as any, ...additionalData } : q
        );
        setQuoteRequests(updatedQuotes);
        // Update sessionStorage cache to keep it in sync
        sessionStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(updatedQuotes));
        if (selectedQuote && selectedQuote.id === id) {
            setSelectedQuote(prev => prev ? { ...prev, status: status as any, ...additionalData } : null);
        }
    };

    const createCrmOrder = (quote: QuoteRequest) => {
        const { factory, order } = quote;
        const newOrderId = `PO-2024-${String(Object.keys(crmData).length + 1).padStart(3, '0')}`;
        const newOrder: CrmOrder = {
            customer: userProfile?.companyName || 'N/A',
            product: `${order.lineItems.length} Items Order`,
            factoryId: factory.id,
            documents: [{ name: 'Purchase Order', type: 'PO', lastUpdated: new Date().toISOString().split('T')[0] }],
            tasks: [
                { id: Date.now(), name: 'Order Confirmation', responsible: 'Admin', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date().toISOString().split('T')[0], actualStartDate: null, actualEndDate: null, status: 'TO DO' },
                { id: Date.now() + 1, name: 'Fabric Sourcing', responsible: 'Merch Team', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], actualStartDate: null, actualEndDate: null, status: 'TO DO' },
            ]
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
            {renderPage()}
            {/* Render AI Chat Support for non-admin users */}
            {user && userProfile && !isAdmin && <AIChatSupport />}
        </div>
    );
};

const App: FC = () => {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
};

// Export the App component as the default export
export default App;