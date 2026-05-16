import React, { useState, useCallback, type FC } from 'react';
import {
    Moon, MapPin, Shield, Lock, Eye, EyeOff, Smartphone, Check, CheckCircle,
    RefreshCw, AlertTriangle, LogOut, X, BookOpen, Activity, Building, FileText,
    MessageSquare, Map as MapIcon, Truck, ChevronDown, Edit, LayoutDashboard,
    Users, Sparkles, History, LifeBuoy,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { useWalkthrough } from './walkthrough/WalkthroughContext';
import { ALL_TOURS } from './walkthrough/tours';
import { MainLayout } from './MainLayout';

interface SettingsPageProps {
    layoutProps: any;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    setDarkMode: (mode: boolean) => void;
}

export const SettingsPage: FC<SettingsPageProps> = ({ layoutProps, showToast, setDarkMode }) => {
    const { user, userProfile, darkMode, isAdmin, handleSetCurrentPage, handleSignOut } = layoutProps;

    const { resetTours, state: walkthroughState, startTour, isTourComplete } = useWalkthrough();
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

    React.useEffect(() => {
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

                    {/* Help Center */}
                    {!isAdmin && (
                    <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden transition-colors">
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2.5 rounded-lg shrink-0">
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white leading-snug">Help Center</h3>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            {walkthroughState.completedTours.length} of {ALL_TOURS.length} tours completed
                                        </p>
                                    </div>
                                </div>
                                {walkthroughState.completedTours.length > 0 && (
                                    <button
                                        onClick={resetTours}
                                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-[#c20c0b] dark:hover:text-red-400 transition-colors shrink-0"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>

                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-5 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${(walkthroughState.completedTours.length / ALL_TOURS.length) * 100}%`,
                                        background: 'linear-gradient(90deg, #c20c0b, #350e4a)',
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                {ALL_TOURS.map((tour) => {
                                    const done = isTourComplete(tour.id);
                                    const TOUR_ICONS_MAP: Record<string, React.ReactNode> = {
                                        'platform-overview': <MapIcon size={16} />,
                                        'find-factory':      <Building size={16} />,
                                        'submit-rfq':        <FileText size={16} />,
                                        'review-quotes':     <MessageSquare size={16} />,
                                        'track-production':  <Truck size={16} />,
                                    };
                                    return (
                                        <div
                                            key={tour.id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                done
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                            }`}>
                                                {TOUR_ICONS_MAP[tour.id]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold leading-tight ${
                                                    done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-white'
                                                }`}>
                                                    {tour.title}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{done ? 'Completed' : tour.duration}</p>
                                            </div>
                                            {done ? (
                                                <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                                            ) : (
                                                <button
                                                    onClick={() => { startTour(tour.id); handleSetCurrentPage('sourcing'); }}
                                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#c20c0b] to-[#350e4a] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                                                >
                                                    <Activity size={12} />
                                                    Start
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    )}

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
    );
};
