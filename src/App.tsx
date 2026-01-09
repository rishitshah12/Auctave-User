// Import React library and hooks for state management (useState), side effects (useEffect), references (useRef), memoization (useMemo), and types (FC, ReactNode)
import React, { useState, useEffect, useRef, useMemo, FC, ReactNode } from 'react';
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
    Tag, Weight, Palette, Box, Map as MapIcon, Download, BookOpen, Building, Trash2, Upload
} from 'lucide-react';
// Import charting components from recharts for data visualization
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, Cell, PieChart
} from 'recharts';
// Import TypeScript interfaces/types for data structures used in the app
import { UserProfile, OrderFormData, Factory, QuoteRequest, CrmOrder, ToastState, MachineSlot } from './types';
// Import custom components for specific pages and UI elements
import { Toast } from '../src/Toast';
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

// --- Type Definitions ---

// Extend the global Window interface to include a custom showToast function
declare global {
    interface Window {
        showToast: (message: string, type?: 'success' | 'error') => void;
    }
}

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
        if (window.showToast) window.showToast(successMessage);
        else alert(successMessage);
    } catch (err) {
        // Handle errors
        console.error('Failed to copy: ', err);
        if (window.showToast) window.showToast('Failed to copy text.', 'error');
        else alert('Failed to copy text.');
    }
    // Clean up by removing the textarea
    document.body.removeChild(textArea);
};

// --- Main App Component ---
// This is the root component of the application
const App: FC = () => {
    // --- State Management ---
    
    // State to track which page is currently displayed (default is 'login')
    const [currentPage, setCurrentPage] = useState<string>('login');
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
    // State to manage toast notifications (visibility, message, type)
    const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
    // State used to force re-render of components by changing the key
    const [pageKey, setPageKey] = useState<number>(0);
    // State to check if the current user is an admin
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    // --- App Logic & Data States ---
    
    // State to store data entered in the Order Form
    const [orderFormData, setOrderFormData] = useState<OrderFormData>({
        category: 'T-shirt', fabricQuality: '100% Cotton', weightGSM: '180', styleOption: 'Crew Neck, Short Sleeve', qty: '5000', targetPrice: '4.50', shippingDest: 'Los Angeles, USA', packagingReqs: 'Individually folded and poly-bagged', labelingReqs: 'Custom neck labels'
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
    const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
    // State to store the currently selected quote for viewing details
    const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);

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
    
    // Function to display a toast notification
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        // Hide toast after 3 seconds
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };
    
    // Function to handle navigation between pages
    const handleSetCurrentPage = (page: string, data: any = null) => {
        // Increment pageKey to force re-render of components if needed
        setPageKey(prevKey => prevKey + 1);
        // If navigating to specific detail pages, set the selected data
        if (page === 'quoteRequest' || page === 'factoryDetail' || page === 'factoryCatalog') {
            setSelectedFactory(data as Factory);
        }
        if (page === 'quoteDetail') {
            setSelectedQuote(data as QuoteRequest);
        }
        // Reset active CRM order if leaving CRM page
        if (page !== 'crm') {
            setActiveCrmOrderKey(null); 
        }
        // Update the current page state
        setCurrentPage(page);
    };

    // Effect to expose showToast to the global window object
    useEffect(() => { window.showToast = showToast; }, []);

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
                            // Default redirect based on role
                            setCurrentPage(isUserAdmin ? 'adminDashboard' : 'sourcing');
                        }
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
    useEffect(() => {
        if (user) {
            const mockQuotes: QuoteRequest[] = [
                { id: 'QR001', factory: { id: 'F001', name: 'AU Global Garment Solutions', location: 'Dhaka, Bangladesh', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=2864&auto=format&fit=crop' }, order: { category: 'T-shirt', qty: '5000', targetPrice: '4.50', fabricQuality: '100% Cotton', weightGSM: '180', styleOption: 'Crew Neck', shippingDest: 'LA, USA', packagingReqs: 'Polybag', labelingReqs: 'Custom' }, status: 'Responded', submittedAt: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), userId: 'previewUser' },
                { id: 'QR002', factory: { id: 'F003', name: 'AU Innovate Apparel Co.', location: 'Mumbai, India', imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=2872&auto=format&fit=crop' }, order: { category: 'Hoodies', qty: '2000', targetPrice: '12.00', fabricQuality: 'Cotton/Poly Blend', weightGSM: '320', styleOption: 'Pullover', shippingDest: 'NY, USA', packagingReqs: 'Carton', labelingReqs: 'Woven' }, status: 'Pending', submittedAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), userId: 'previewUser' },
            ];
            setQuoteRequests(mockQuotes);
        }
    }, [user]);

    // --- Authentication & Profile Functions (Mocked) ---
    
    // Function to handle user sign out
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        handleSetCurrentPage('login');
    };

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

    // --- Quote Request Functions (Mocked) ---
    
    // Function to simulate submitting a quote request
    const submitQuoteRequest = async (quoteData: Omit<QuoteRequest, 'id' | 'status' | 'submittedAt' | 'userId'>) => {
        showToast('Submitting quote request...', 'success');
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Create new quote object
        const newQuote: QuoteRequest = {
            ...quoteData,
            id: `QR${Math.floor(Math.random() * 1000)}`,
            status: 'Pending',
            submittedAt: new Date().toISOString(),
            userId: user.uid,
        };
        // Update state
        setQuoteRequests(prev => [newQuote, ...prev]);
        showToast('Quote request submitted successfully!');
        handleSetCurrentPage('myQuotes');
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
        // In a real app, you might not need to pre-filter. The SourcingPage does its own filtering.
        const matchingFactories = allFactories.filter(f => f.specialties.includes(submittedData.category)); 
        setSuggestedFactories(matchingFactories);
        handleSetCurrentPage('factorySuggestions');
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
    const generateContractBrief = async () => { setIsLoadingBrief(true); const prompt = `Generate a concise, professional contract brief for a garment manufacturing request with these specs: Category: ${orderFormData.category}, Fabric: ${orderFormData.fabricQuality}, Weight: ${orderFormData.weightGSM} GSM, Style: ${orderFormData.styleOption}, Quantity: ${orderFormData.qty} units. The brief should be suitable for an initial inquiry to ${selectedFactory?.name}.`; try { setContractBrief(await callGeminiAPI(prompt)); } catch (error) { showToast('Error generating brief: ' + (error as Error).message, 'error'); } finally { setIsLoadingBrief(false); } };
    // Function to suggest optimizations using AI
    const suggestOptimizations = async () => { setIsLoadingOptimizations(true); const prompt = `For a garment order (${orderFormData.category}, ${orderFormData.fabricQuality}, ${orderFormData.weightGSM} GSM), suggest material or process optimizations for cost-efficiency, sustainability, or quality, keeping in mind we are contacting ${selectedFactory?.name} in ${selectedFactory?.location}. Format as a bulleted list.`; try { setOptimizationSuggestions(await callGeminiAPI(prompt)); } catch (error) { showToast('Error suggesting optimizations: ' + (error as Error).message, 'error'); } finally { setIsLoadingOptimizations(false); } };
    // Function to draft an outreach email using AI
    const generateOutreachEmail = async () => { if (!contractBrief || !selectedFactory || !userProfile) { showToast('Please generate a brief first.', 'error'); return; } setIsLoadingEmail(true); const prompt = `Draft a professional outreach email from ${userProfile.name} of ${userProfile.companyName} to ${selectedFactory.name}. The email should introduce the company and the order, referencing the attached contract brief. Keep it concise and aim to start a conversation. The contract brief is as follows:\n\n---\n${contractBrief}\n---`; try { setOutreachEmail(await callGeminiAPI(prompt)); } catch (error) { showToast('Error drafting email: ' + (error as Error).message, 'error'); } finally { setIsLoadingEmail(false); } };
    // Function to fetch market trends using AI
    const getMarketTrends = async () => { setIsLoadingTrends(true); const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); const prompt = `As a fashion industry analyst, provide a brief summary of key market trends in global garment manufacturing for ${date}. Focus on sustainability, technology, and consumer behavior. Format as a bulleted list.`; try { setMarketTrends(await callGeminiAPI(prompt)); } catch (error) { setMarketTrends('Error fetching market trends: ' + (error as Error).message); showToast('Error fetching market trends.', 'error'); } finally { setIsLoadingTrends(false); } };
    // Function to get negotiation tips using AI
    const getNegotiationTips = async () => { if (!selectedFactory) return; setIsLoadingNegotiation(true); const prompt = `As a sourcing expert, provide key negotiation points and cultural tips for an upcoming discussion with ${selectedFactory.name} in ${selectedFactory.location} regarding an order of ${orderFormData.qty} ${orderFormData.category}s. Focus on pricing strategies, payment terms, and quality assurance questions. Format as a bulleted list with bold headings.`; try { setNegotiationTips(await callGeminiAPI(prompt)); } catch(error) { setNegotiationTips('Error fetching negotiation tips: ' + (error as Error).message); showToast('Error fetching negotiation tips.', 'error'); } finally { setIsLoadingNegotiation(false); } };

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
        supabase
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Lock className="w-6 h-6 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Create New Password</h2>
                    </div>
                    <p className="text-gray-600 mb-6">
                        Since this is your first time signing in (or you used a one-time code), please set a secure password for future logins.
                    </p>
                    <form onSubmit={handleSavePassword} className="space-y-4">
                        <div> <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label> <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> </div>
                        <div> <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label> <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> </div>
                        <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-70"> {loading ? 'Saving...' : 'Create Password'} </button>
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
        return ( <MainLayout {...layoutProps} hideSidebar={!userProfile}> <div className="max-w-2xl mx-auto"> <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg"> <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{userProfile ? 'Update Your Profile' : 'Complete Your Profile'}</h2> <p className="text-center text-gray-500 mb-6">Fields marked with * are required to access the platform.</p> {authError && <p className="text-red-500 mb-4">{authError}</p>} <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div> <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label> <input type="text" id="name" name="name" value={profileData.name} onChange={handleProfileChange} required className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> </div> <div> <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label> <input type="text" id="companyName" name="companyName" value={profileData.companyName} onChange={handleProfileChange} required className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> </div> <div className="md:col-span-2"> <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label> <input type="email" id="email" name="email" value={profileData.email} onChange={handleProfileChange} required className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> </div> <div> <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label> <input type="tel" id="phone" name="phone" value={profileData.phone} onChange={handleProfileChange} required className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> </div> <div> <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label> <select id="country" name="country" value={profileData.country} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"> <option value="">Select a country</option> {countries.map(country => (<option key={country} value={country}>{country}</option>))} </select> </div> <div> <label htmlFor="jobRole" className="block text-sm font-medium text-gray-700 mb-1">Job Role</label> <select id="jobRole" name="jobRole" value={profileData.jobRole} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"> <option value="">Select a role</option> {jobRoles.map(role => (<option key={role} value={role}>{role}</option>))} </select> </div> <div> <label htmlFor="categorySpecialization" className="block text-sm font-medium text-gray-700 mb-1">Category Specialization</label> <input type="text" id="categorySpecialization" name="categorySpecialization" placeholder="e.g., Activewear, Denim" value={profileData.categorySpecialization} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> </div> <div> <label htmlFor="yearlyEstRevenue" className="block text-sm font-medium text-gray-700 mb-1">Est. Yearly Revenue (USD)</label> <select id="yearlyEstRevenue" name="yearlyEstRevenue" value={profileData.yearlyEstRevenue} onChange={handleProfileChange} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"> <option value="">Select a revenue range</option> {revenueRanges.map(range => (<option key={range} value={range}>{range}</option>))} </select> </div> <div className="md:col-span-2 text-right mt-4"> <button type="submit" disabled={isProfileLoading} className="w-full md:w-auto px-6 py-3 text-white rounded-md font-semibold bg-purple-600 hover:bg-purple-700 transition shadow-md disabled:opacity-50"> {isProfileLoading ? 'Saving...' : (userProfile ? 'Save Profile' : 'Complete Profile & Continue')} </button> </div> </form> </div> </div> </MainLayout> );
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
                    <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>
                    <div className="space-y-6">
                        {settingsOptions.map((opt, index) => (
                            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">{opt.icon}</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">{opt.title}</h3>
                                        <p className="text-sm text-gray-500">{opt.description}</p>
                                    </div>
                                </div>
                                <button onClick={opt.action} className="bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition text-sm">
                                    {opt.buttonLabel}
                                </button>
                            </div>
                        ))}
                            <div className="bg-white p-6 rounded-xl shadow-sm border">
                                <div className="flex items-center gap-4">
                                    <div className="bg-purple-100 text-purple-600 p-3 rounded-lg"><MapPin size={20}/></div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Change Location</h3>
                                        <p className="text-sm text-gray-500">Update your primary business location.</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-4 items-center">
                                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                    <button onClick={handleLocationSave} className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition">Save</button>
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
                    <button onClick={() => handleSetCurrentPage('orderForm')} className="text-purple-600 font-semibold mb-4 flex items-center hover:underline">
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Back to Order Form
                    </button>
                    <h2 className="text-3xl font-bold text-gray-800">Top Factory Matches</h2>
                    <p className="text-gray-500 mt-1">Based on your request for {orderFormData.qty} {orderFormData.category}s.</p>
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
                    <div className="text-center py-10 bg-white rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-gray-700">No factories match your criteria.</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your product category in the order form.</p>
                    </div>
                )}
            </div>
        </MainLayout>
    );

   // Component to display details of a selected factory
   const FactoryDetailPage: FC = () => {
        const [currentImageIndex, setCurrentImageIndex] = useState(0);

        if (!selectedFactory) return null;

        const { gallery } = selectedFactory;

        // Navigation for image gallery
        const nextImage = () => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % gallery.length);
        };

        const prevImage = () => {
            setCurrentImageIndex((prevIndex) => (prevIndex - 1 + gallery.length) % gallery.length);
        };

        // Helper component for certification badges
        const CertificationBadge: FC<{ cert: string }> = ({ cert }) => {
            const certStyles: { [key: string]: string } = {
                'Sedex': 'bg-blue-100 text-blue-800',
                'Oeko-Tex Standard 100': 'bg-green-100 text-green-800',
                'BCI': 'bg-yellow-100 text-yellow-800',
                'WRAP': 'bg-indigo-100 text-indigo-800',
                'ISO 9001': 'bg-red-100 text-red-800'
            };
            return <span className={`text-sm font-semibold px-3 py-1 rounded-full ${certStyles[cert] || 'bg-gray-100 text-gray-800'}`}>{cert}</span>
        }
        // Helper component for machine capacity rows
        const MachineSlotRow: FC<{ slot: MachineSlot }> = ({ slot }) => {
            const usagePercentage = (slot.availableSlots / slot.totalSlots) * 100;
            return (
                <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.machineType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                            </div>
                            <span>{slot.availableSlots}/{slot.totalSlots}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{slot.nextAvailable}</td>
                </tr>
            )
        }
        return (
            <MainLayout {...layoutProps}>
                <div className="space-y-6">
                    <div>
                        <button onClick={() => handleSetCurrentPage(suggestedFactories.length > 0 ? 'factorySuggestions' : 'sourcing')} className="text-purple-600 font-semibold mb-4 flex items-center hover:underline">
                            <ChevronLeft className="h-5 w-5 mr-1" />
                            Back to Factories
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        {/* Image Gallery */}
                        <div className="relative">
                            <img className="h-64 md:h-96 w-full object-cover transition-opacity duration-300" src={gallery[currentImageIndex]} alt={`${selectedFactory.name} gallery image ${currentImageIndex + 1}`} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                            {gallery.length > 1 && (
                                <>
                                    <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white p-2 rounded-full shadow-md transition">
                                        <ChevronLeft className="h-6 w-6 text-gray-800" />
                                    </button>
                                    <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white p-2 rounded-full shadow-md transition">
                                        <ChevronRight className="h-6 w-6 text-gray-800" />
                                    </button>
                                </>
                            )}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                                {gallery.map((_, index) => (
                                    <button key={index} onClick={() => setCurrentImageIndex(index)} className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}></button>
                                ))}
                            </div>
                        </div>

                        <div className="p-8">
                            <h1 className="text-3xl font-bold text-gray-900">{selectedFactory.name}</h1>
                            <div className="flex flex-wrap gap-2 mt-2 mb-4">
                                {selectedFactory.tags?.map(tag => (
                                    <span key={tag} className={`text-sm font-semibold px-3 py-1 rounded-full ${ tag === 'Prime' ? 'bg-blue-100 text-blue-800' : tag === 'Tech Enabled' ? 'bg-purple-100 text-purple-800' : tag === 'Sustainable' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800' }`}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <p className="mt-2 text-gray-600">{selectedFactory.description}</p>
                            <button onClick={() => handleSetCurrentPage('factoryCatalog', selectedFactory)} className="mt-6 w-full md:w-auto px-6 py-3 text-white rounded-lg font-semibold bg-gray-800 hover:bg-black transition shadow-md flex items-center justify-center">
                                <BookOpen className="mr-2 h-5 w-5" /> View Product Catalog
                            </button>
                        </div>
                        
                        <div className="px-8 py-6 border-t border-gray-200">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Factory Details</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                <div> <p className="text-sm font-medium text-gray-500">Location</p> <p className="font-semibold text-gray-800 flex items-center justify-center"><MapPin size={14} className="mr-1.5"/>{selectedFactory.location}</p> </div>
                                <div> <p className="text-sm font-medium text-gray-500">Rating</p> <p className="font-semibold text-gray-800 flex items-center justify-center"><Star size={16} className="text-yellow-400 fill-current mr-1.5"/>{selectedFactory.rating}</p> </div>
                                <div> <p className="text-sm font-medium text-gray-500">MOQ</p> <p className="font-semibold text-gray-800">{selectedFactory.minimumOrderQuantity} units</p> </div>
                                <div> <p className="text-sm font-medium text-gray-500">Specialties</p> <p className="font-semibold text-gray-800">{selectedFactory.specialties.join(', ')}</p> </div>
                            </div>
                        </div>
                        <div className="px-8 py-6 border-t border-gray-200">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Certifications & Compliance</h3>
                            <div className="flex flex-wrap gap-3">
                                {selectedFactory.certifications?.map(cert => <CertificationBadge key={cert} cert={cert} />)}
                            </div>
                        </div>
                        <div className="px-8 py-6 border-t border-gray-200">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Production Capacity</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine Type</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Capacity</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Available Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedFactory.machineSlots.map(slot => (
                                            <MachineSlotRow key={slot.machineType} slot={slot} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-semibold text-gray-800">Ready to proceed?</h4>
                                <p className="text-sm text-gray-600">Request a quote or use our AI tools to prepare your inquiry.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleSetCurrentPage('factoryTools', selectedFactory)} className="w-full md:w-auto px-6 py-3 text-purple-700 bg-purple-100 rounded-lg font-semibold hover:bg-purple-200 transition">
                                    Use AI Sourcing Tools
                                </button>
                                <button onClick={() => handleSetCurrentPage('quoteRequest', selectedFactory)} className="w-full md:w-auto px-6 py-3 text-white rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 transition shadow-md">
                                    Request a Quote
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    };

    // Component to display the product catalog of a factory
    const FactoryCatalogPage: FC = () => {
        if (!selectedFactory) {
            handleSetCurrentPage('sourcing');
            return null;
        }

        const { catalog, name } = selectedFactory;

        return (
            <MainLayout {...layoutProps}>
                <div className="space-y-8">
                    <div>
                        <button onClick={() => handleSetCurrentPage('factoryDetail', selectedFactory)} className="text-purple-600 font-semibold mb-4 flex items-center hover:underline">
                            <ChevronLeft className="h-5 w-5 mr-1" />
                            Back to Factory Details
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">Product Catalog</h1>
                        <p className="text-gray-500 mt-1">Available products and materials from <span className="font-semibold">{name}</span>.</p>
                    </div>

                    {/* Product Categories Section */}
                    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Product Categories</h2>
                        {catalog.productCategories.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {catalog.productCategories.map((category, index) => (
                                    <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200 group">
                                        <img src={category.imageUrl} alt={category.name} className="h-48 w-full object-cover group-hover:opacity-90 transition-opacity" />
                                        <div className="p-4">
                                            <h3 className="font-bold text-lg text-gray-900">{category.name}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No specific product categories listed. Please inquire for details.</p>
                        )}
                    </div>

                    {/* Fabric Options Section */}
                    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Fabric Options</h2>
                        {catalog.fabricOptions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fabric Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Composition</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best For</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {catalog.fabricOptions.map((fabric, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fabric.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fabric.composition}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fabric.useCases}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">Fabric options are available upon request.</p>
                        )}
                    </div>
                </div>
            </MainLayout>
        );
    };

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
                        <button onClick={() => handleSetCurrentPage('factoryDetail', selectedFactory)} className="text-purple-600 font-semibold mb-4 flex items-center hover:underline">
                            <ChevronLeft className="h-5 w-5 mr-1" />
                            Back to Factory Details
                        </button>
                        <h2 className="text-3xl font-bold text-gray-800">AI Sourcing Tools for {selectedFactory.name}</h2>
                        <p className="text-gray-500 mt-1">Generate documents and get insights for your order.</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Your Order Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div> <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label> <p className="w-full p-2 border border-gray-200 rounded-md bg-gray-50">{orderFormData.category}</p> </div>
                            <div> <label className="block text-sm font-medium text-gray-700 mb-1">Order Quantity</label> <p className="w-full p-2 border border-gray-200 rounded-md bg-gray-50">{orderFormData.qty} units</p> </div>
                            <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 mb-1">Fabric & Style Details</label> <p className="w-full p-2 border border-gray-200 rounded-md bg-gray-50">{`${orderFormData.fabricQuality}, ${orderFormData.weightGSM}GSM, ${orderFormData.styleOption}`}</p> </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AiCard icon={<FileText className="mr-2 text-purple-500"/>} title="Generate Contract Brief">
                            <div className="flex-grow min-h-[150px] prose prose-sm max-w-none whitespace-pre-wrap">{isLoadingBrief ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div> : contractBrief ? <div dangerouslySetInnerHTML={{ __html: contractBrief.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /> : <p className="text-gray-500 not-prose">Generate a professional brief to share with the factory.</p>}</div>
                            <button onClick={generateContractBrief} disabled={isLoadingBrief} className="mt-4 w-full px-5 py-2 text-sm text-white rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50">
                                {isLoadingBrief ? 'Generating...' : 'Generate Brief'}
                            </button>
                        </AiCard>
                        <AiCard icon={<MessageSquare className="mr-2 text-purple-500"/>} title="Draft Outreach Email">
                            <div className="flex-grow min-h-[150px] prose prose-sm max-w-none whitespace-pre-wrap">{isLoadingEmail ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div> : outreachEmail ? <div dangerouslySetInnerHTML={{ __html: outreachEmail.replace(/\n/g, '<br/>') }} /> : <p className="text-gray-500 not-prose">First, generate a contract brief.</p>}</div>
                            {outreachEmail && !isLoadingEmail && <button onClick={() => copyToClipboard(outreachEmail.replace(/<br\/>/g, '\n'), 'Email content copied!')} className="mt-4 w-full px-5 py-2 text-sm text-indigo-700 rounded-lg font-semibold bg-indigo-100 hover:bg-indigo-200 transition flex items-center justify-center"><ClipboardCopy size={16} className="mr-2"/>Copy Email</button>}
                            <button onClick={generateOutreachEmail} disabled={isLoadingEmail || !contractBrief || !selectedFactory} className="mt-2 w-full px-5 py-2 text-sm text-white rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50">
                                {isLoadingEmail ? 'Drafting...' : 'Draft Email'}
                            </button>
                        </AiCard>
                        <AiCard icon={<BrainCircuit className="mr-2 text-purple-500"/>} title="Suggest Optimizations">
                            <div className="flex-grow min-h-[150px] prose prose-sm max-w-none whitespace-pre-wrap">{isLoadingOptimizations ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div> : optimizationSuggestions ? <div dangerouslySetInnerHTML={{ __html: optimizationSuggestions.replace(/\n/g, '<br/>').replace(/- \*\*(.*?)\*\*:/g, '<br/><strong>$1:</strong>') }} /> : <p className="text-gray-500 not-prose">Find ways to improve cost, quality, or sustainability.</p>}</div>
                            <button onClick={suggestOptimizations} disabled={isLoadingOptimizations} className="mt-4 w-full px-5 py-2 text-sm text-white rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50">
                                {isLoadingOptimizations ? 'Analyzing...' : 'Get Suggestions'}
                            </button>
                        </AiCard>
                        <AiCard icon={<BadgePercent className="mr-2 text-purple-500"/>} title="Negotiation Advisor">
                            <div className="flex-grow min-h-[150px] prose prose-sm max-w-none whitespace-pre-wrap">{isLoadingNegotiation ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div> : negotiationTips ? <div dangerouslySetInnerHTML={{ __html: negotiationTips.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /> : <p className="text-gray-500 not-prose">Get AI-powered negotiation points and cultural tips.</p>}</div>
                            <button onClick={getNegotiationTips} disabled={isLoadingNegotiation} className="mt-4 w-full px-5 py-2 text-sm text-white rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50">
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
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Tracking</h1>
                <p className="text-gray-500 mb-6">Follow your shipment from production to delivery.</p>
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            {Object.keys(trackingData).map(orderKey => (
                                <button key={orderKey} onClick={() => setActiveOrderKey(orderKey)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-lg transition-colors ${activeOrderKey === orderKey ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {orderKey}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 sm:p-8">
                        <div className="relative pl-8">
                            {/* Vertical line */}
                            <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                            {activeOrderTracking.map((item, index) => {
                                const isLast = index === activeOrderTracking.length - 1;
                                const isComplete = item.isComplete;
                                const isInProgress = item.isInProgress;
                                return (
                                    <div key={index} className={`relative flex items-start ${isLast ? '' : 'pb-12'}`}>
                                        {/* Dot */}
                                        <div className="absolute left-12 top-1 -ml-[9px] h-5 w-5 rounded-full bg-white border-2 border-gray-300">
                                            {isComplete && <div className="w-full h-full rounded-full bg-purple-600 border-2 border-white"></div>}
                                            {isInProgress && <div className="w-full h-full rounded-full bg-white border-2 border-purple-600 animate-pulse"></div>}
                                        </div>
                                        {/* Content */}
                                        <div className="flex items-center gap-4 ml-8">
                                            <div className={`p-3 rounded-full ${
                                                isComplete ? 'bg-purple-100 text-purple-600' :
                                                isInProgress ? 'bg-blue-100 text-blue-600' :
                                                'bg-gray-100 text-gray-400'
                                            }`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <h4 className={`font-semibold ${isComplete || isInProgress ? 'text-gray-800' : 'text-gray-500'}`}>{item.status}</h4>
                                                <p className="text-sm text-gray-500">{item.date}</p>
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
                <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-24 md:bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-transform hover:scale-110 z-50">
                    {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
                </button>
                {isOpen && (
                    <div className="fixed bottom-24 right-6 w-full max-w-sm h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 z-50 animate-fade-in sm:bottom-6 sm:max-w-md">
                        <header className="p-4 flex items-center gap-2 border-b">
                            <div className="p-1.5 bg-purple-100 rounded-md">
                                <Bot className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="font-bold text-sm text-gray-800">Auctave Brain</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 ml-auto p-1"><X size={20} /></button>
                        </header>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-xs p-3 rounded-lg prose prose-sm ${msg.sender === 'ai' ? 'bg-gray-100 text-gray-800' : 'bg-blue-500 text-white'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && <div className="flex justify-start"><div className="bg-gray-200 text-gray-800 p-3 rounded-lg animate-pulse">...</div></div>}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-2 border-t border-gray-200">
                            <div className="p-1 border rounded-lg flex items-center">
                                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask anything..." className="flex-1 p-2 text-sm border-none focus:outline-none focus:ring-0" />
                                <button onClick={handleSend} disabled={isLoading} className="bg-gray-100 text-gray-500 p-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50">
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
            return <div className="flex items-center justify-center min-h-screen bg-gray-100"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500"></div></div>;
        }

        // 1. Check Dynamic Routes from MasterController (Enables Extensibility)
        const DynamicComponent = masterController.getRouteComponent(currentPage);
        if (DynamicComponent) {
            return <DynamicComponent {...layoutProps} />;
        }

        // Switch statement to render the appropriate component
        switch (currentPage) {
            case 'login': return <LoginPage showToast={showToast} setAuthError={setAuthError} authError={authError} onLoginSuccess={async (session) => {
                const activeSession = session || (await supabase.auth.getSession()).data.session;
                
                if (activeSession?.user) {
                    setUser(activeSession.user);
                    const isUserAdmin = activeSession.user.email?.toLowerCase().endsWith('@auctaveexports.com');
                    setIsAdmin(!!isUserAdmin);

                    if (isUserAdmin) {
                        if (!activeSession.user.user_metadata?.password_set) {
                            handleSetCurrentPage('createPassword');
                        } else {
                            handleSetCurrentPage('adminDashboard');
                        }
                    } else {
                        handleSetCurrentPage('sourcing');
                    }
                }
            }} />;
            case 'profile': return <ProfilePage />;
            case 'createPassword': return <CreatePasswordPage />;
            case 'sourcing': return <SourcingPage
                {...layoutProps}
                userProfile={userProfile}
                handleSelectFactory={handleSelectFactory}
                selectedGarmentCategory={selectedGarmentCategory}
                setSelectedGarmentCategory={setSelectedGarmentCategory}
                showToast={showToast}
            />;
            case 'orderForm': return <OrderFormPage
                {...layoutProps}
                handleSubmitOrderForm={handleSubmitOrderForm}
            />;
            case 'crm': return (
                <MainLayout {...layoutProps}>
                    <CrmDashboard callGeminiAPI={callGeminiAPI} handleSetCurrentPage={handleSetCurrentPage} />
                </MainLayout>
            );
            case 'factorySuggestions': return <FactorySuggestionsPage />;
            case 'factoryDetail': return <FactoryDetailPage />;
            case 'factoryCatalog': return <FactoryCatalogPage />;
            case 'factoryTools': return <FactoryToolsPage />;
            case 'settings': return <SettingsPage />;
            case 'tracking': return <OrderTrackingPage />;
            case 'trending': return <TrendingPage />;
            case 'myQuotes': return <MyQuotesPage />;
            case 'quoteRequest': return <QuoteRequestPage />;
            case 'quoteDetail': return <QuoteDetailPage />;
            case 'billing': return <BillingPage />;
            case 'adminDashboard': return <AdminDashboardPage {...layoutProps} />;
            case 'adminUsers': return <AdminUsersPage {...layoutProps} />;
            case 'adminFactories': return <AdminFactoriesPage {...layoutProps} />;
            case 'adminCRM': return <AdminCRMPage {...layoutProps} />;
            case 'adminTrending': return <AdminTrendingPage {...layoutProps} />;
            default: return <SourcingPage
                {...layoutProps}
                userProfile={userProfile}
                handleSelectFactory={handleSelectFactory}
                selectedGarmentCategory={selectedGarmentCategory}
                setSelectedGarmentCategory={setSelectedGarmentCategory}
                showToast={showToast}
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
                <h1 className="text-3xl font-bold text-gray-800 mb-2">What's Trending</h1>
                <p className="text-gray-500 mb-8">Discover the latest in fashion, materials, and manufacturing.</p>
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
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Latest Articles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {trendBlogs.map(blog => (
                            <div key={blog.id} className="bg-white rounded-xl shadow-md overflow-hidden group cursor-pointer">
                                <div className="overflow-hidden">
                                    <img src={blog.imageUrl} alt={blog.title} className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                                <div className="p-6">
                                    <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{blog.category}</span>
                                    <h3 className="font-bold text-lg text-gray-800 mt-3 mb-2">{blog.title}</h3>
                                    <p className="text-sm text-gray-500">By {blog.author} · {blog.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                <section>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Fashion Shorts</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {fashionShorts.map(short =>(
                            <div key={short.id} className="relative rounded-xl overflow-hidden shadow-lg group cursor-pointer aspect-[9/16]" onClick={() => setFullscreenVideo(short.videoUrl)}>
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

    // Component to display user's quotes
    const MyQuotesPage: FC = () => {
        const [filterStatus, setFilterStatus] = useState('All');
    
        const getStatusColor = (status: string) => {
            switch (status) {
                case 'Pending': return 'bg-yellow-100 text-yellow-800';
                case 'Responded': return 'bg-blue-100 text-blue-800';
                case 'Accepted': return 'bg-green-100 text-green-800';
                case 'Declined': return 'bg-red-100 text-red-800';
                case 'In Negotiation': return 'bg-orange-100 text-orange-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        };
    
        const filteredQuotes = quoteRequests.filter(quote =>
            filterStatus === 'All' || quote.status === filterStatus
        );
    
        const filterOptions = ['All', 'Pending', 'Responded', 'In Negotiation', 'Accepted', 'Declined'];
    
        return (
            <MainLayout {...layoutProps}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">My Quote Requests</h1>
                        <p className="text-gray-500 mt-1">Track and manage your quotes with factories.</p>
                    </div>
                    <button onClick={() => handleSetCurrentPage('orderForm')} className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition shadow-md">
                        <Plus size={18} />
                        <span>Request New Quote</span>
                    </button>
                </div>
    
                {/* Filter Tabs */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-hide">
                        {filterOptions.map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-md transition-colors ${
                                    filterStatus === status
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
    
                {/* Quotes Grid */}
                {filteredQuotes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredQuotes.map((quote, index) => (
                            <div key={quote.id} className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col transition-transform hover:scale-[1.02] animate-card-enter" style={{ animationDelay: `${index * 50}ms` }}>
                                {/* Card Header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <img className="h-12 w-12 rounded-full object-cover" src={quote.factory.imageUrl} alt={quote.factory.name} />
                                        <div>
                                            <p className="font-bold text-gray-800">{quote.factory.name}</p>
                                            <p className="text-xs text-gray-500 flex items-center"><MapPin size={12} className="mr-1"/>{quote.factory.location}</p>
                                        </div>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full">
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>
    
                                {/* Card Body */}
                                <div className="p-4 flex-grow space-y-3">
                                    <div className="flex items-center text-sm">
                                        <Shirt size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                        <span className="font-semibold text-gray-700">{quote.order.category}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Package size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                        <span className="text-gray-600">{quote.order.qty} units</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Clock size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                                        <span className="text-gray-600">Submitted: {new Date(quote.submittedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
    
                                {/* Card Footer */}
                                <div className="p-4 bg-gray-50/70 rounded-b-xl flex items-center justify-between">
                                    <span className={`px-2.5 py-1 text-xs leading-5 font-bold rounded-full ${getStatusColor(quote.status)}`}>
                                        {quote.status}
                                    </span>
                                    <button onClick={() => handleSetCurrentPage('quoteDetail', quote)} className="text-sm font-bold text-purple-600 hover:text-purple-800 flex items-center">
                                        View Details <ChevronRight size={16} className="ml-1" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100">
                        <FileQuestion className="mx-auto h-16 w-16 text-gray-300" />
                        <h3 className="mt-4 text-lg font-semibold text-gray-800">No Quotes Found</h3>
                        <p className="mt-1 text-sm text-gray-500">No quotes match the "{filterStatus}" filter.</p>
                        <button onClick={() => setFilterStatus('All')} className="mt-4 text-sm font-bold text-purple-600 hover:underline">
                            Show All Quotes
                        </button>
                    </div>
                )}
            </MainLayout>
        );
    };

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
                files: uploadedFiles.map(f => f.name), // Storing file names for reference
            };
            submitQuoteRequest(quoteData);
        };
        return (
            <MainLayout {...layoutProps}>
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => handleSetCurrentPage('factoryDetail', selectedFactory)} className="text-purple-600 font-semibold mb-4 flex items-center hover:underline">
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Back to Factory Details
                    </button>
                    <div className="bg-white p-8 rounded-xl shadow-lg">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Request a Quote</h2>
                        <p className="text-gray-500 mb-6">Review your order details and submit your request to <span className="font-semibold">{selectedFactory.name}</span>.</p>
                        <form onSubmit={handleQuoteSubmit}>
                            <div className="space-y-6">
                                <div className="p-4 border rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Factory Information</h3>
                                    <div className="flex items-center gap-4">
                                        <img src={selectedFactory.imageUrl} alt={selectedFactory.name} className="w-16 h-16 rounded-lg object-cover" />
                                        <div>
                                            <p className="font-bold text-gray-900">{selectedFactory.name}</p>
                                            <p className="text-sm text-gray-500">{selectedFactory.location}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Your Order Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <p><strong>Product:</strong> {orderFormData.category}</p>
                                        <p><strong>Quantity:</strong> {orderFormData.qty} units</p>
                                        <p><strong>Fabric:</strong> {orderFormData.fabricQuality}</p>
                                        <p><strong>Weight:</strong> {orderFormData.weightGSM} GSM</p>
                                        <p className="md:col-span-2"><strong>Style:</strong> {orderFormData.styleOption}</p>
                                        <p className="md:col-span-2"><strong>Shipping To:</strong> {orderFormData.shippingDest}</p>
                                    </div>
                                </div>
                                {uploadedFiles.length > 0 && (
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Attached Documents</h3>
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
                                <button type="submit" className="px-8 py-3 text-white rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 transition shadow-md">
                                    Submit Quote Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </MainLayout>
        );
    };

    // Component to view details of a specific quote
    const QuoteDetailPage: FC = () => {
        const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
    
        if (!selectedQuote) {
            handleSetCurrentPage('myQuotes');
            return null;
        }
    
        const { factory, order, status, submittedAt, id } = selectedQuote;
    
        const handleAcceptQuote = () => {
            const updatedQuotes = quoteRequests.map(q =>
                q.id === id ? { ...q, status: 'Accepted' as 'Accepted' } : q
            );
            setQuoteRequests(updatedQuotes);
            setSelectedQuote(prev => prev ? { ...prev, status: 'Accepted' } : null);
    
            // Create a new order in CRM
            const newOrderId = `PO-2024-${String(Object.keys(crmData).length + 1).padStart(3, '0')}`;
            const newOrder: CrmOrder = {
                customer: userProfile?.companyName || 'N/A',
                product: `${order.qty} ${order.category}s`,
                factoryId: factory.id,
                documents: [{ name: 'Purchase Order', type: 'PO', lastUpdated: new Date().toISOString().split('T')[0] }],
                tasks: [
                    { id: Date.now(), name: 'Order Confirmation', responsible: 'Admin', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date().toISOString().split('T')[0], actualStartDate: null, actualEndDate: null, status: 'TO DO' },
                    { id: Date.now() + 1, name: 'Fabric Sourcing', responsible: 'Merch Team', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], actualStartDate: null, actualEndDate: null, status: 'TO DO' },
                ]
            };
            addNewOrderToCrm(newOrderId, newOrder);
    
            showToast('Quote Accepted! A new order has been created in the CRM portal.');
            handleSetCurrentPage('crm');
        };
    
        const handleOpenNegotiate = () => {
            setIsNegotiationModalOpen(true);
        };
    
        const handleNegotiationSubmit = (counterPrice: string, details: string) => {
            const updatedQuotes = quoteRequests.map(q =>
                q.id === id ? { ...q, status: 'In Negotiation' as 'In Negotiation' } : q
            );
            setQuoteRequests(updatedQuotes);
            setSelectedQuote(prev => prev ? { ...prev, status: 'In Negotiation' } : null);
            showToast('Negotiation submitted. The quote is now marked as "In Negotiation".');
            setIsNegotiationModalOpen(false);
        };
    
        return (
            <MainLayout {...layoutProps}>
                <button onClick={() => handleSetCurrentPage('myQuotes')} className="text-purple-600 font-semibold mb-4 flex items-center hover:underline">
                    <ChevronLeft className="h-5 w-5 mr-1" />
                    Back to My Quotes
                </button>
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">Quote Details</h2>
                            <p className="text-gray-500 mt-1">Submitted on {new Date(submittedAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                            status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            status === 'Responded' ? 'bg-blue-100 text-blue-800' :
                            status === 'In Negotiation' ? 'bg-orange-100 text-orange-800' :
                            status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {status}
                        </span>
                    </div>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Factory Info */}
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Factory</h3>
                            <div className="flex items-center gap-4">
                                <img src={factory.imageUrl} alt={factory.name} className="w-20 h-20 rounded-lg object-cover"/>
                                <div>
                                    <p className="font-bold text-lg text-gray-900">{factory.name}</p>
                                    <p className="text-sm text-gray-500">{factory.location}</p>
                                </div>
                            </div>
                        </div>
                        {/* Order Info */}
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
                            <div className="space-y-2 text-sm">
                                <p><strong>Product:</strong> {order.category}</p>
                                <p><strong>Quantity:</strong> {order.qty} units</p>
                                <p><strong>Target Price:</strong> ${order.targetPrice}/unit</p>
                            </div>
                        </div>
                    </div>
                    {/* Full Order Details */}
                    <div className="mt-8 p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Full Specifications</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><p><strong>Fabric:</strong> {order.fabricQuality}</p></div>
                            <div><p><strong>Weight:</strong> {order.weightGSM} GSM</p></div>
                            <div className="md:col-span-2"><p><strong>Style:</strong> {order.styleOption}</p></div>
                            <div className="md:col-span-2"><p><strong>Packaging:</strong> {order.packagingReqs}</p></div>
                            <div className="md:col-span-2"><p><strong>Labeling:</strong> {order.labelingReqs}</p></div>
                            <div className="md:col-span-2"><p><strong>Shipping To:</strong> {order.shippingDest}</p></div>
                        </div>
                    </div>
                    {/* Response Section */}
                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Factory Response</h3>
                        {status === 'Responded' ? (
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <p className="font-semibold text-blue-800">Quote Received: $4.25 / unit</p>
                                <p className="text-sm text-blue-700 mt-2">Lead Time: 30-40 days</p>
                                <p className="text-sm text-blue-700 mt-1">Notes: We can meet all specifications. Price is based on current material costs.</p>
                                <div className="mt-4 flex gap-2">
                                    <button onClick={handleAcceptQuote} className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">Accept Quote</button>
                                    <button onClick={handleOpenNegotiate} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold">Negotiate</button>
                                </div>
                            </div>
                        ) : status === 'In Negotiation' ? (
                             <div className="bg-orange-50 p-6 rounded-lg">
                                <p className="text-gray-600">Your counter-offer has been submitted. Awaiting factory response.</p>
                            </div>
                        ) : (
                            <p className="text-gray-500">Awaiting response from the factory.</p>
                        )}
                    </div>
                </div>
                {isNegotiationModalOpen && <NegotiationModal onSubmit={handleNegotiationSubmit} onClose={() => setIsNegotiationModalOpen(false)} />}
            </MainLayout>
        );
    };

    // Modal component for negotiating a quote
    const NegotiationModal: FC<{ onSubmit: (counterPrice: string, details: string) => void; onClose: () => void; }> = ({ onSubmit, onClose }) => {
        const [counterPrice, setCounterPrice] = useState('');
        const [details, setDetails] = useState('');
    
        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            onSubmit(counterPrice, details);
        };
    
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4">Negotiate Quote</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="counterPrice" className="block text-sm font-medium text-gray-700 mb-1">Counter Offer Price ($/unit)</label>
                            <input
                                type="number"
                                id="counterPrice"
                                value={counterPrice}
                                onChange={(e) => setCounterPrice(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">Other Relevant Details</label>
                            <textarea
                                id="details"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                rows={4}
                            />
                        </div>
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg">Submit Negotiation</button>
                        </div>
                    </form>
                </div>
            </div>
        );
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
                        <h1 className="text-3xl font-bold text-gray-800">Billing & Escrow</h1>
                        <p className="text-gray-500 mt-1">Manage and track your order payments.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-xl shadow-sm border">
                          <h3 className="text-sm font-medium text-gray-500">Total in Escrow</h3>
                          <p className="text-3xl font-bold text-gray-800 mt-2">${totalHeld.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border">
                          <h3 className="text-sm font-medium text-gray-500">Total Released</h3>
                          <p className="text-3xl font-bold text-gray-800 mt-2">${totalReleased.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border">
                          <h3 className="text-sm font-medium text-gray-500">Next Payout</h3>
                          <p className="text-3xl font-bold text-gray-800 mt-2">$10,625</p>
                          <p className="text-xs text-gray-400">on July 12, 2025 for PO-2024-001</p>
                      </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Order ID', 'Product', 'Total Value', 'Amount Released', 'Amount in Escrow', 'Status', ''].map(header => (
                                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {billingData.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600 hover:underline cursor-pointer">{item.orderId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.product}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.totalAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">${item.amountReleased.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-bold">${item.amountHeld.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-purple-600 hover:text-purple-900">View Details</button>
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
            `}</style>
            {/* Toast notification component */}
            <Toast {...toast} />
            {/* Render the current page content */}
            {renderPage()}
            {/* Render AI Chat Support for non-admin users */}
            {user && userProfile && !isAdmin && <AIChatSupport />}
        </div>
    );
};

// Export the App component as the default export
export default App;