import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
    Mail, Phone, ArrowRight, Lock, Globe, Shield, Key, RefreshCw,
    Eye, EyeOff, Package, TrendingUp, Users, CheckCircle, Zap,
    BarChart3, Clock, Star
} from 'lucide-react';

interface LoginPageProps {
    showToast: (message: string, type?: 'success' | 'error') => void;
    setAuthError: (error: string) => void;
    authError: string;
    onLoginSuccess?: (session?: any) => void | Promise<void>;
}

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

// ─── Configurable login-page content (editable via Admin › Login Settings) ────
const LOGIN_CONTENT_KEY = 'login_content_settings';

const LOGIN_ICON_NAMES = [
    'Package', 'TrendingUp', 'Users', 'CheckCircle', 'Zap',
    'BarChart3', 'Clock', 'Star', 'Shield', 'Globe', 'Key',
    'Mail', 'Lock', 'RefreshCw', 'Phone',
] as const;
type LoginIconName = typeof LOGIN_ICON_NAMES[number];

interface StatSetting  { value: string; label: string; iconName: LoginIconName; }
interface UspSetting   { title: string; desc: string; iconName: LoginIconName; iconColor: string; }
interface LoginContent {
    logoIconName: LoginIconName;
    logoImageUrl?: string;
    logoSize?: number;
    logoTitle: string;
    logoSubtitle: string;
    badgeText: string;
    headlineLine1: string;
    headlineLine2: string;
    bodyText: string;
    stats: StatSetting[];
    uspItems: UspSetting[];
}

const DEFAULT_LOGIN_CONTENT: LoginContent = {
    logoIconName:  'Package',
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

function loadLoginContent(): LoginContent {
    try {
        const raw = localStorage.getItem(LOGIN_CONTENT_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            return {
                ...DEFAULT_LOGIN_CONTENT, ...p,
                stats:    p.stats?.length    ? p.stats    : DEFAULT_LOGIN_CONTENT.stats,
                uspItems: p.uspItems?.length ? p.uspItems : DEFAULT_LOGIN_CONTENT.uspItems,
            };
        }
    } catch {}
    return DEFAULT_LOGIN_CONTENT;
}

function hexToRgba(hex: string, a: number): string {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return `rgba(${r},${g},${b},${a})`;
}

// Default login background image URLs — 3 columns, 6 images each
const DEFAULT_FASHION_COLS: string[][] = [
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

function loadLoginBgImages(): string[][] {
    try {
        const raw = localStorage.getItem('login_bg_images');
        if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_FASHION_COLS;
}

const FASHION_COLS = loadLoginBgImages();

// Icon component lookup for dynamic rendering
const LOGIN_ICON_MAP: Record<LoginIconName, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
    Package, TrendingUp, Users, CheckCircle, Zap, BarChart3, Clock, Star,
    Shield, Globe, Key, Mail, Lock, RefreshCw, Phone,
};

const GlobeViz: React.FC = () => {
    const cx = 120, cy = 120, r = 105;
    const destinations: [number, number, string][] = [
        [60,  92,  '#fbbf24'],
        [110, 80,  '#34d399'],
        [148, 86,  '#60a5fa'],
        [178, 100, '#f87171'],
        [192, 110, '#a78bfa'],
        [197, 95,  '#fb923c'],
        [200, 118, '#4ade80'],
        [72,  130, '#38bdf8'],
    ];
    const routes = [
        { d: 'M 60 92 Q 86 68 110 80',    dur: '3s',   delay: '0s'   },
        { d: 'M 110 80 Q 130 82 148 86',  dur: '2s',   delay: '0.6s' },
        { d: 'M 148 86 Q 164 92 178 100', dur: '2.5s', delay: '1.2s' },
        { d: 'M 178 100 Q 185 105 192 110',dur:'1.5s', delay: '0.3s' },
        { d: 'M 192 110 Q 195 102 197 95', dur: '1.8s',delay: '0.9s' },
        { d: 'M 197 95 Q 199 107 200 118', dur: '2.2s',delay: '1.6s' },
        { d: 'M 60 92 Q 66 111 72 130',   dur: '3.5s', delay: '1s'   },
        { d: 'M 110 80 Q 155 58 197 95',  dur: '4s',   delay: '0.2s' },
    ];
    return (
        <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
                <radialGradient id="gGrad" cx="36%" cy="32%" r="68%">
                    <stop offset="0%"   stopColor="rgba(201,165,78,0.10)" />
                    <stop offset="55%"  stopColor="rgba(100,70,10,0.06)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <radialGradient id="gRim" cx="50%" cy="50%" r="50%">
                    <stop offset="72%" stopColor="rgba(201,165,78,0)" />
                    <stop offset="100%" stopColor="rgba(201,165,78,0.22)" />
                </radialGradient>
                <radialGradient id="gSpec" cx="28%" cy="28%" r="38%">
                    <stop offset="0%"   stopColor="rgba(255,255,255,0.07)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <clipPath id="gClip">
                    <circle cx={cx} cy={cy} r={r} />
                </clipPath>
            </defs>
            <circle cx={cx} cy={cy} r={r + 12} fill="none" stroke="rgba(201,165,78,0.10)" strokeWidth="22" />
            <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="rgba(201,165,78,0.14)" strokeWidth="2" />
            <circle cx={cx} cy={cy} r={r} fill="url(#gGrad)" />
            <g clipPath="url(#gClip)" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.65">
                {[48, 68, 88, 120, 152, 172, 192].map(y => (
                    <line key={y} x1={cx - r - 4} y1={y} x2={cx + r + 4} y2={y} />
                ))}
            </g>
            <g clipPath="url(#gClip)" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.65">
                <ellipse cx={cx} cy={cy} rx={22} ry={r} />
                <ellipse cx={cx} cy={cy} rx={55} ry={r} />
                <ellipse cx={cx} cy={cy} rx={85} ry={r} />
                <ellipse cx={cx} cy={cy} rx={r}  ry={r} />
            </g>
            <g clipPath="url(#gClip)" fill="none" stroke="rgba(201,165,78,0.22)" strokeWidth="0.8">
                <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
            </g>
            {routes.map((rt, i) => (
                <path key={i} d={rt.d} fill="none" stroke="rgba(201,165,78,0.55)" strokeWidth="0.9"
                    strokeDasharray="5 4" clipPath="url(#gClip)">
                    <animate attributeName="stroke-dashoffset" from="60" to="-60"
                        dur={rt.dur} begin={rt.delay} repeatCount="indefinite" />
                </path>
            ))}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            <circle cx={cx} cy={cy} r={r} fill="url(#gRim)" />
            <circle cx={cx} cy={cy} r={r} fill="url(#gSpec)" />
            {destinations.map(([x, y, color], i) => (
                <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="none" stroke={color} strokeWidth="1" opacity="0">
                        <animate attributeName="r" values="3;14" dur={`${2.4 + i * 0.18}s`}
                            begin={`${i * 0.32}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.65;0" dur={`${2.4 + i * 0.18}s`}
                            begin={`${i * 0.32}s`} repeatCount="indefinite" />
                    </circle>
                    <circle cx={x} cy={y} r="2.8" fill={color}>
                        <animate attributeName="r" values="2.2;3.6;2.2" dur={`${2.8 + i * 0.25}s`}
                            repeatCount="indefinite" />
                    </circle>
                </g>
            ))}
        </svg>
    );
};

export const LoginPage: React.FC<LoginPageProps> = ({ showToast, setAuthError, authError, onLoginSuccess }) => {
    const [loginType, setLoginType] = useState<'user' | 'admin'>('user');
    const [adminMode, setAdminMode] = useState<'signin' | 'signup'>('signin');
    const [method, setMethod] = useState<'email' | 'phone'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isAdminOtpSent, setIsAdminOtpSent] = useState(false);
    const [adminSignInMethod, setAdminSignInMethod] = useState<'password' | 'otp'>('password');
    const [loading, setLoading] = useState(false);
    const [submittedPhone, setSubmittedPhone] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // Dynamic content loaded from admin settings
    const content = React.useMemo(loadLoginContent, []);
    const getIcon = (name: LoginIconName, size: number, style?: React.CSSProperties) => {
        const Comp = LOGIN_ICON_MAP[name] || Package;
        return <Comp size={size} style={style} />;
    };

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const countryCodes = [
        { code: '+1', label: 'US/CA' },
        { code: '+44', label: 'UK' },
        { code: '+91', label: 'IN' },
        { code: '+86', label: 'CN' },
        { code: '+880', label: 'BD' },
        { code: '+84', label: 'VN' },
        { code: '+90', label: 'TR' },
    ];

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setAuthError('');
        const safetyTimeoutId = setTimeout(() => {
            setLoading(false);
            setAuthError('Request timeout. Please try again.');
            showToast('Request timeout - please try again', 'error');
        }, 20000);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: { prompt: 'select_account' },
                },
            });
            if (error) {
                if (error.message.includes('provider is not enabled')) {
                    setAuthError('Google Sign-In is disabled. Please contact our support team.');
                } else {
                    setAuthError(error.message);
                }
                showToast(error.message, 'error');
            }
        } finally {
            clearTimeout(safetyTimeoutId);
            if (!window.location.href.includes('code=')) setLoading(false);
        }
    };

    const handleUserEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');
        const safetyTimeoutId = setTimeout(() => {
            setLoading(false);
            setAuthError('Request timeout. Please try again.');
            showToast('Request timeout - please try again', 'error');
        }, 20000);
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const { error } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: { emailRedirectTo: window.location.origin },
            });
            if (error) {
                setAuthError(error.message);
                showToast(error.message, 'error');
            } else {
                showToast('Verification link sent! Check your inbox.', 'success');
                setAuthError('');
            }
        } finally {
            clearTimeout(safetyTimeoutId);
            setLoading(false);
        }
    };

    const handleAdminSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');
        const safetyTimeoutId = setTimeout(() => {
            setLoading(false);
            setAuthError('Sign-in is taking too long. Please check your connection and try again.');
            showToast('Request timeout - please try again', 'error');
        }, 20000);
        try {
            const normalizedEmail = email.toLowerCase().trim();
            if (!normalizedEmail.endsWith('@auctaveexports.com')) {
                throw new Error('Admin access is restricted to @auctaveexports.com emails.');
            }
            if (adminSignInMethod === 'password') {
                const loginTimeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Login request timed out. Check your connection and try again.')), 15000);
                });
                const loginPromise = supabase.auth.signInWithPassword({ email: normalizedEmail, password });
                const { data, error } = await Promise.race([loginPromise, loginTimeoutPromise]) as any;
                if (error) throw error;
                showToast('Signed in successfully!', 'success');
                await new Promise(resolve => setTimeout(resolve, 500));
                if (onLoginSuccess) await onLoginSuccess(data.session);
            } else {
                const { error } = await supabase.auth.signInWithOtp({
                    email: normalizedEmail,
                    options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
                });
                if (error) throw error;
                setIsAdminOtpSent(true);
                setResendTimer(60);
                setOtp('');
                showToast('Verification link has been sent to your admin email!', 'success');
            }
        } catch (error: any) {
            setAuthError(error.message || 'An error occurred during sign-in');
            showToast(error.message || 'Sign-in failed', 'error');
        } finally {
            clearTimeout(safetyTimeoutId);
            setLoading(false);
        }
    };

    const handleResendAdminOtp = async () => {
        if (resendTimer > 0 || loading) return;
        setLoading(true);
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const options =
                adminMode === 'signin'
                    ? { shouldCreateUser: false, emailRedirectTo: window.location.origin }
                    : { shouldCreateUser: true, data: { password_set: false }, emailRedirectTo: window.location.origin };
            const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail, options });
            if (error) throw error;
            setResendTimer(60);
            showToast('Link resent successfully!', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');
        const safetyTimeoutId = setTimeout(() => {
            setLoading(false);
            setAuthError('Request timeout. Please try again.');
            showToast('Request timeout - please try again', 'error');
        }, 20000);
        try {
            const normalizedEmail = email.toLowerCase().trim();
            if (!normalizedEmail.endsWith('@auctaveexports.com')) {
                throw new Error('Admin access is restricted to @auctaveexports.com emails.');
            }
            const { error } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: { shouldCreateUser: true, data: { password_set: false }, emailRedirectTo: window.location.origin },
            });
            if (error) throw error;
            setIsAdminOtpSent(true);
            setResendTimer(60);
            setOtp('');
            showToast('Verification link sent to your email!', 'success');
            setAuthError('');
        } catch (error: any) {
            setAuthError(error.message);
            showToast(error.message, 'error');
        } finally {
            clearTimeout(safetyTimeoutId);
            setLoading(false);
        }
    };

    const handleVerifyAdminOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');
        const safetyTimeoutId = setTimeout(() => {
            setLoading(false);
            setAuthError('Verification timeout. Please try again.');
            showToast('Request timeout - please try again', 'error');
        }, 20000);
        try {
            const token = otp.trim();
            const normalizedEmail = email.toLowerCase().trim();
            let { data, error } = await supabase.auth.verifyOtp({ email: normalizedEmail, token, type: 'signup' });
            if (error) {
                const emailResult = await supabase.auth.verifyOtp({ email: normalizedEmail, token, type: 'email' });
                if (!emailResult.error) {
                    data = emailResult.data; error = null;
                } else {
                    const recoveryResult = await supabase.auth.verifyOtp({ email: normalizedEmail, token, type: 'recovery' });
                    if (!recoveryResult.error) { data = recoveryResult.data; error = null; }
                }
            }
            if (error) throw error;
            let session = data?.session;
            if (!session) {
                const { data: localData } = await supabase.auth.getSession();
                session = localData.session;
            }
            if (!session) throw new Error('Could not establish a session after OTP verification.');
            showToast('Verified successfully!', 'success');
            if (onLoginSuccess) await onLoginSuccess(session);
        } catch (error: any) {
            setAuthError(error.message);
            showToast(error.message, 'error');
        } finally {
            clearTimeout(safetyTimeoutId);
            setLoading(false);
        }
    };

    const handlePhoneSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');
        const safetyTimeoutId = setTimeout(() => {
            setLoading(false);
            setAuthError('Request timeout. Please try again.');
            showToast('Request timeout - please try again', 'error');
        }, 20000);
        try {
            const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
            const fullPhone = `${countryCode}${cleanPhone}`;
            const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
            if (error) {
                if (error.message.includes('provider is not enabled')) {
                    setAuthError('Phone Sign-In is not enabled. Please use email instead.');
                } else if (error.message.includes('Invalid From Number')) {
                    setAuthError('System configuration error. Please contact support.');
                } else {
                    setAuthError(error.message);
                }
                showToast(error.message, 'error');
            } else {
                setSubmittedPhone(fullPhone);
                setIsOtpSent(true);
                showToast('Verification code sent!', 'success');
                setAuthError('');
            }
        } finally {
            clearTimeout(safetyTimeoutId);
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');
        const safetyTimeoutId = setTimeout(() => {
            setLoading(false);
            setAuthError('Verification timeout. Please try again.');
            showToast('Request timeout - please try again', 'error');
        }, 20000);
        try {
            const { data, error } = await supabase.auth.verifyOtp({ phone: submittedPhone, token: otp, type: 'sms' });
            if (error) throw error;
            let session = data?.session;
            if (!session) {
                const { data: localData } = await supabase.auth.getSession();
                session = localData.session;
            }
            showToast('Phone verified successfully!', 'success');
            if (onLoginSuccess) onLoginSuccess(session);
        } catch (error: any) {
            setAuthError(error.message);
            showToast(error.message, 'error');
        } finally {
            clearTimeout(safetyTimeoutId);
            setLoading(false);
        }
    };

    const switchLoginType = (type: 'user' | 'admin') => {
        setLoginType(type);
        setAuthError('');
        setEmail('');
        setPassword('');
        setOtp('');
        setIsOtpSent(false);
        setIsAdminOtpSent(false);
    };

    // ── Shared style helpers ──────────────────────────────────────────────────
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: 10.5, fontWeight: 600,
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
        letterSpacing: '0.09em', marginBottom: 6,
    };

    const submitBtn = (disabled: boolean): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '12px 0', borderRadius: 12, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: 14, color: 'white',
        background: disabled
            ? 'rgba(194,12,11,0.35)'
            : 'linear-gradient(135deg, #ff3333 0%, #c20c0b 55%, #900808 100%)',
        boxShadow: disabled ? 'none' : '0 8px 28px rgba(194,12,11,0.40), inset 0 1px 0 rgba(255,255,255,0.14)',
        opacity: disabled ? 0.65 : 1,
        transition: 'all 0.2s',
    });

    const glassInputStyle: React.CSSProperties = {
        width: '100%', paddingLeft: 40, paddingRight: 14,
        paddingTop: 11, paddingBottom: 11, borderRadius: 12,
        fontSize: 13.5, boxSizing: 'border-box' as const,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.85)',
        outline: 'none',
    };

    const iconStyle: React.CSSProperties = {
        position: 'absolute', left: 13, top: '50%',
        transform: 'translateY(-50%)',
        color: 'rgba(255,255,255,0.25)', pointerEvents: 'none',
    };

    const subToggleStyle = (active: boolean): React.CSSProperties => ({
        flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600,
        borderRadius: 9, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        transition: 'all 0.2s',
        background: active ? 'rgba(255,255,255,0.11)' : 'transparent',
        color: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.32)',
        boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
    });

    return (
        <div className="min-h-screen flex">
            <style>{`
                @keyframes scrollUp {
                    0%   { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
                @keyframes globeFloat {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50%      { transform: translateY(-12px) rotate(0.5deg); }
                }
                @keyframes shimmer {
                    0%   { background-position: -300% center; }
                    100% { background-position:  300% center; }
                }
                @keyframes orbPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%      { opacity: 0.72; transform: scale(1.06); }
                }
                @keyframes dotPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(194,12,11,0.6), 0 0 5px 1px rgba(194,12,11,0.35); }
                    55%      { box-shadow: 0 0 0 7px rgba(194,12,11,0), 0 0 8px 2px rgba(194,12,11,0.15); }
                }
                @keyframes cardFloat {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-5px); }
                }
                @keyframes lineGlow {
                    0%, 100% { opacity: 0.5; }
                    50%      { opacity: 1; }
                }
                .gi:focus {
                    border-color: rgba(194,12,11,0.55) !important;
                    box-shadow: 0 0 0 3px rgba(194,12,11,0.14) !important;
                    outline: none !important;
                }
                .gi::placeholder { color: rgba(255,255,255,0.22) !important; }
                .gs { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.10); color: rgba(255,255,255,0.85); }
                .gs:focus { outline: none; border-color: rgba(194,12,11,0.5); }
                .gs option { background: #1a1a30; color: white; }
                .hero-img-col { overflow: hidden; flex: 1; position: relative; }
            `}</style>

            {/* ════════════════════════════════════════
                LEFT HERO PANEL
            ════════════════════════════════════════ */}
            <div
                className="hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col relative overflow-hidden"
                style={{ background: '#06060a' }}
            >
                {/* ── Scrolling fashion image columns ── */}
                <div className="absolute inset-0 flex gap-1 pointer-events-none">
                    {FASHION_COLS.map((col, colIdx) => (
                        <div key={colIdx} className="hero-img-col">
                            <div style={{
                                animation: `scrollUp ${26 + colIdx * 7}s linear infinite`,
                                animationDelay: `${colIdx * -5}s`,
                            }}>
                                {[...col, ...col].map((url, imgIdx) => (
                                    <img
                                        key={imgIdx}
                                        src={url}
                                        alt=""
                                        loading="lazy"
                                        style={{ width: '100%', height: 270, objectFit: 'cover', display: 'block' }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Multi-directional dark overlay ── */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(180deg, rgba(6,6,10,0.88) 0%, rgba(6,6,10,0.56) 30%, rgba(6,6,10,0.56) 70%, rgba(6,6,10,0.90) 100%)',
                }} />
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(90deg, rgba(6,6,10,0.60) 0%, rgba(6,6,10,0.10) 55%, transparent 100%)',
                }} />

                {/* ── Ambient color orbs ── */}
                <div className="absolute pointer-events-none" style={{
                    top: '-18%', left: '-10%', width: '70%', height: '70%',
                    background: 'radial-gradient(ellipse at center, rgba(194,12,11,0.24) 0%, rgba(194,12,11,0.08) 42%, transparent 70%)',
                    animation: 'orbPulse 9s ease-in-out infinite',
                }} />
                <div className="absolute pointer-events-none" style={{
                    bottom: '-18%', right: '-10%', width: '60%', height: '60%',
                    background: 'radial-gradient(ellipse at center, rgba(201,165,78,0.20) 0%, rgba(201,165,78,0.07) 45%, transparent 72%)',
                    animation: 'orbPulse 12s ease-in-out infinite 3.5s',
                }} />
                <div className="absolute pointer-events-none" style={{
                    top: '40%', left: '30%', width: '40%', height: '40%',
                    background: 'radial-gradient(ellipse at center, rgba(120,40,200,0.12) 0%, transparent 70%)',
                    filter: 'blur(30px)',
                }} />

                {/* ── Top gradient border ── */}
                <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(194,12,11,0.7) 28%, rgba(201,165,78,0.7) 72%, transparent 100%)',
                    animation: 'lineGlow 4s ease-in-out infinite',
                }} />

                {/* ── Globe — upper-right ── */}
                <div className="absolute pointer-events-none" style={{
                    top: 48, right: 48, width: 210, height: 210,
                    opacity: 0.55, animation: 'globeFloat 13s ease-in-out infinite',
                }}>
                    <GlobeViz />
                </div>

                {/* ── Logo ── */}
                <div className="relative z-10 px-12 pt-11 flex-shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div style={{ width: content.logoSize ?? 44, height: content.logoSize ?? 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {content.logoImageUrl
                                ? <img src={content.logoImageUrl} alt={content.logoTitle} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                : getIcon(content.logoIconName, Math.round((content.logoSize ?? 44) * 0.5), { color: '#c9a54e' })}
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', color: '#f5f0eb', lineHeight: 1 }}>
                                {content.logoTitle}
                            </div>
                            <div style={{
                                fontSize: 9, fontWeight: 600,
                                letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 4,
                                background: 'linear-gradient(90deg, #ff2727ff 0%, #ff6b6b 35%, #ffcccc 65%, #c20c0b 100%)',
                                backgroundSize: '300% auto',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                animation: 'shimmer 5s linear infinite',
                            }}>
                                {content.logoSubtitle}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Main hero content ── */}
                <div className="relative z-10 flex-1 flex flex-col justify-center px-12 py-6">

                    {/* Live badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '6px 16px', borderRadius: 100, marginBottom: 28,
                        width: 'fit-content',
                        background: 'rgba(194,12,11,0.10)',
                        border: '1px solid rgba(194,12,11,0.30)',
                        backdropFilter: 'blur(14px)',
                    }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ff5555, #c20c0b)',
                            display: 'inline-block', flexShrink: 0,
                            animation: 'dotPulse 2.6s ease-in-out infinite',
                        }} />
                        <span style={{
                            color: 'rgba(255,148,148,0.90)',
                            fontSize: 10.5, fontWeight: 600,
                            letterSpacing: '0.18em', textTransform: 'uppercase',
                        }}>
                            {content.badgeText}
                        </span>
                    </div>

                    {/* Giant gradient headline */}
                    <h1 style={{
                        fontWeight: 800, lineHeight: 1.06,
                        fontSize: 'clamp(2.4rem, 3.6vw, 3.8rem)',
                        letterSpacing: '-0.025em', marginBottom: 18,
                    }}>
                        <span style={{
                            display: 'block',
                            background: 'linear-gradient(115deg, #ffffff 0%, #ede4ff 38%, #ffffffff 70%, #ffffffff 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            {content.headlineLine1}
                        </span>
                        <span style={{
                            display: 'block',
                            background: 'linear-gradient(115deg, #ff0000ff 0%, #fd3b3bff 32%, #c20c0b 65%, #7a0000 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            {content.headlineLine2}
                        </span>
                    </h1>

                    <p style={{
                        color: 'rgba(255, 255, 255, 1)',
                        fontSize: 14, lineHeight: 1.78,
                        maxWidth: 380, marginBottom: 36,
                    }}>
                        {content.bodyText}
                    </p>

                    {/* 2×2 glass feature cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {content.uspItems.map((item, i) => (
                            <div key={i} style={{
                                padding: '14px 16px', borderRadius: 16,
                                background: 'rgba(255,255,255,0.034)',
                                border: '1px solid rgba(255,255,255,0.075)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.06)',
                                animation: `cardFloat ${3.8 + i * 0.55}s ease-in-out ${i * 0.28}s infinite`,
                            }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: 9,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 10,
                                    background: `linear-gradient(135deg, ${hexToRgba(item.iconColor, 0.14)}, ${hexToRgba(item.iconColor, 0.06)})`,
                                    border: `1px solid ${hexToRgba(item.iconColor, 0.24)}`,
                                }}>
                                    <span style={{ color: item.iconColor, display: 'flex' }}>{getIcon(item.iconName, 16)}</span>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#f0ece8', lineHeight: 1.35, marginBottom: 3 }}>
                                    {item.title}
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.81)', lineHeight: 1.55 }}>
                                    {item.desc}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Stats glass strip ── */}
                <div className="relative z-10 px-10 pb-10 flex-shrink-0">
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                        borderRadius: 16, overflow: 'hidden',
                        background: 'rgba(255,255,255,0.030)',
                        border: '1px solid rgba(255,255,255,0.072)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}>
                        {content.stats.map((s, i) => (
                            <div key={i} style={{
                                padding: '16px 10px', textAlign: 'center',
                                borderRight: i < content.stats.length - 1 ? '1px solid rgba(255,255,255,0.065)' : 'none',
                            }}>
                                <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: 11, marginBottom: 5, display: 'flex', justifyContent: 'center' }}>
                                    {getIcon(s.iconName, 14)}
                                </div>
                                <div style={{
                                    fontSize: 20, fontWeight: 800, lineHeight: 1, marginBottom: 4,
                                    background: 'linear-gradient(135deg, #ff8080 0%, #c20c0b 100%)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}>
                                    {s.value}
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(252, 252, 252, 1)', letterSpacing: '0.04em' }}>
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════
                RIGHT PANEL — Dark Glassmorphism
            ════════════════════════════════════════ */}
            <div
                className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
                style={{ background: '#07070f' }}
            >
                {/* Background blobs for glassmorphism depth */}
                {/* Top-right red blob */}
                <div className="absolute pointer-events-none" style={{
                    top: '-160px', right: '-160px', width: 520, height: 520,
                    background: 'radial-gradient(circle, rgba(194,12,11,0.32) 0%, rgba(194,12,11,0.10) 45%, transparent 70%)',
                    filter: 'blur(48px)',
                }} />
                {/* Bottom-left indigo blob */}
                <div className="absolute pointer-events-none" style={{
                    bottom: '-160px', left: '-160px', width: 500, height: 500,
                    background: 'radial-gradient(circle, rgba(99,60,255,0.28) 0%, rgba(99,60,255,0.09) 48%, transparent 72%)',
                    filter: 'blur(52px)',
                }} />
                {/* Center-left golden accent */}
                <div className="absolute pointer-events-none" style={{
                    top: '38%', left: '-80px', width: 320, height: 320,
                    background: 'radial-gradient(circle, rgba(201,165,78,0.18) 0%, rgba(201,165,78,0.05) 55%, transparent 72%)',
                    filter: 'blur(44px)',
                }} />
                {/* Top-left cyan whisper */}
                <div className="absolute pointer-events-none" style={{
                    top: '8%', left: '10%', width: 260, height: 260,
                    background: 'radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 68%)',
                    filter: 'blur(40px)',
                }} />
                {/* Bottom-right violet bloom */}
                <div className="absolute pointer-events-none" style={{
                    bottom: '12%', right: '-60px', width: 300, height: 300,
                    background: 'radial-gradient(circle, rgba(167,139,250,0.16) 0%, transparent 68%)',
                    filter: 'blur(46px)',
                }} />
                {/* Center subtle warm glow */}
                <div className="absolute pointer-events-none" style={{
                    top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 380, height: 380,
                    background: 'radial-gradient(circle, rgba(194,12,11,0.07) 0%, rgba(201,165,78,0.04) 50%, transparent 72%)',
                    filter: 'blur(60px)',
                }} />

                {/* Mobile logo */}
                <div className="flex lg:hidden items-center gap-3 mb-8">
                    <div style={{ width: content.logoSize ?? 40, height: content.logoSize ?? 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {content.logoImageUrl
                            ? <img src={content.logoImageUrl} alt={content.logoTitle} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            : getIcon(content.logoIconName, Math.round((content.logoSize ?? 40) * 0.5), { color: '#c9a54e' })}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1, color: 'rgba(255,255,255,0.90)' }}>{content.logoTitle}</div>
                        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>{content.logoSubtitle}</div>
                    </div>
                </div>

                {/* ── Glass card ── */}
                <div className="w-full max-w-[420px] relative z-10" style={{
                    background: 'rgba(255,255,255,0.055)',
                    backdropFilter: 'blur(36px)',
                    WebkitBackdropFilter: 'blur(36px)',
                    border: '1px solid rgba(255,255,255,0.11)',
                    borderRadius: 28,
                    padding: '36px 36px 28px',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.10)',
                }}>

                    {/* Login type toggle */}
                    <div style={{
                        display: 'flex', gap: 4, padding: 4,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16, marginBottom: 28,
                    }}>
                        {(['user', 'admin'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => switchLoginType(t)}
                                style={{
                                    flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                                    borderRadius: 12, border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    transition: 'all 0.2s',
                                    background: loginType === t ? 'rgba(255,255,255,0.12)' : 'transparent',
                                    color: loginType === t ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.30)',
                                    boxShadow: loginType === t ? '0 2px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.14)' : 'none',
                                }}
                            >
                                {t === 'user'
                                    ? <CheckCircle size={14} style={{ color: loginType === 'user' ? '#c20c0b' : 'rgba(255,255,255,0.22)' }} />
                                    : <Shield size={14} style={{ color: loginType === 'admin' ? '#c20c0b' : 'rgba(255,255,255,0.22)' }} />
                                }
                                {t === 'user' ? 'Client Login' : 'Admin'}
                            </button>
                        ))}
                    </div>

                    {/* Heading */}
                    <div style={{ marginBottom: 22 }}>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 6, letterSpacing: '-0.015em' }}>
                            {loginType === 'user' ? 'Welcome back' : 'Admin Access'}
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.56)', fontSize: 13.5, lineHeight: 1.5 }}>
                            {loginType === 'user'
                                ? 'Sign in to track your orders and collaborate with your team.'
                                : 'Restricted to admin access only'}
                        </p>
                    </div>

                    {/* Error banner */}
                    {authError && (
                        <div style={{
                            marginBottom: 20, padding: '12px 14px',
                            background: 'rgba(220,38,38,0.12)',
                            border: '1px solid rgba(220,38,38,0.24)',
                            borderRadius: 12,
                            color: 'rgba(255,160,160,0.90)',
                            fontSize: 13,
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                        }}>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'rgba(220,38,38,0.28)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, marginTop: 1,
                                fontSize: 10, fontWeight: 700, color: '#ff9999',
                            }}>!</div>
                            <div>
                                {authError}
                                {authError.includes('already exists') && (
                                    <button
                                        onClick={() => { setAdminMode('signin'); setAuthError(''); }}
                                        style={{ display: 'block', marginTop: 6, fontWeight: 600, color: '#ff9999', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                                    >
                                        Switch to Sign In →
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── USER LOGIN ─────────────────────────────────────── */}
                    {loginType === 'user' && (
                        <>
                            {/* Google button */}
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 10, padding: '11px 16px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    color: 'rgba(255,255,255,0.82)',
                                    fontSize: 14, fontWeight: 600,
                                    marginBottom: 18, transition: 'all 0.2s',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                <GoogleIcon />
                                Continue with Google
                            </button>

                            {/* Divider */}
                            <div style={{ position: 'relative', marginBottom: 18 }}>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.09)' }} />
                                </div>
                                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                    <span style={{
                                        padding: '2px 12px', fontSize: 11, fontWeight: 600,
                                        color: 'rgba(255,255,255,0.42)', letterSpacing: '0.06em', textTransform: 'uppercase',
                                        background: 'rgba(15,15,28,0.7)', backdropFilter: 'blur(8px)',
                                        borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)',
                                    }}>
                                        or sign in with
                                    </span>
                                </div>
                            </div>

                            {/* Email / Phone sub-toggle */}
                            <div style={{
                                display: 'flex', gap: 4, padding: 4,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 12, marginBottom: 18,
                            }}>
                                <button onClick={() => { setMethod('email'); setIsOtpSent(false); setAuthError(''); }} style={subToggleStyle(method === 'email')}>
                                    <Mail size={12} /> Email Link
                                </button>
                                <button onClick={() => { setMethod('phone'); setIsOtpSent(false); setAuthError(''); }} style={subToggleStyle(method === 'phone')}>
                                    <Phone size={12} /> Mobile OTP
                                </button>
                            </div>

                            {/* Email form */}
                            {method === 'email' && (
                                <form onSubmit={handleUserEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div>
                                        <label style={labelStyle}>Email Address</label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={16} style={iconStyle} />
                                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                                className="gi" style={glassInputStyle} placeholder="you@company.com" />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} style={submitBtn(loading)}>
                                        {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Send Verification Link <ArrowRight size={16} /></>}
                                    </button>
                                    <p style={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.38)', marginTop: -4 }}>
                                        We'll email you a secure, one-click sign-in link.
                                    </p>
                                </form>
                            )}

                            {/* Phone form */}
                            {method === 'phone' && (
                                <div>
                                    {!isOtpSent ? (
                                        <form onSubmit={handlePhoneSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            <div>
                                                <label style={labelStyle}>Mobile Number</label>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <div style={{ position: 'relative', width: 120 }}>
                                                        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                                                            disabled={isOtpSent} className="gs"
                                                            style={{ width: '100%', appearance: 'none', padding: '11px 28px 11px 12px', borderRadius: 12, fontSize: 13, boxSizing: 'border-box' as const }}>
                                                            {countryCodes.map((c) => <option key={c.code} value={c.code}>{c.code} {c.label}</option>)}
                                                        </select>
                                                        <Globe size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.28)', pointerEvents: 'none' }} />
                                                    </div>
                                                    <div style={{ position: 'relative', flex: 1 }}>
                                                        <Phone size={16} style={iconStyle} />
                                                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                                                            className="gi" style={glassInputStyle} placeholder="98765 43210" />
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="submit" disabled={loading} style={submitBtn(loading)}>
                                                {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Send OTP <ArrowRight size={16} /></>}
                                            </button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            <div style={{ textAlign: 'center', marginBottom: 4 }}>
                                                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(194,12,11,0.14)', border: '1px solid rgba(194,12,11,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                    <Phone size={22} style={{ color: '#ff6b6b' }} />
                                                </div>
                                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>
                                                    Code sent to <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.90)' }}>{submittedPhone}</span>
                                                </p>
                                                <button type="button" onClick={() => setIsOtpSent(false)} style={{ fontSize: 11.5, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                                                    Change number
                                                </button>
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Verification Code</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Lock size={16} style={iconStyle} />
                                                    <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                        className="gi" placeholder="000000" maxLength={6} inputMode="numeric"
                                                        style={{ ...glassInputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 18, fontFamily: 'monospace' }} />
                                                </div>
                                            </div>
                                            <button type="submit" disabled={loading || otp.length !== 6} style={submitBtn(loading || otp.length !== 6)}>
                                                {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Verify & Sign In <ArrowRight size={16} /></>}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── ADMIN LOGIN ──────────────────────────────────────── */}
                    {loginType === 'admin' && (
                        <div>
                            {/* Domain warning */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18,
                                padding: '10px 14px', borderRadius: 12,
                                background: 'rgba(251,191,36,0.08)',
                                border: '1px solid rgba(251,191,36,0.20)',
                            }}>
                                <Shield size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
                                <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.80)', fontWeight: 500 }}>
                                    Access restricted to <span style={{ fontWeight: 700, color: '#fbbf24' }}>@auctaveexports.com</span> domain
                                </p>
                            </div>

                            {/* Sign in / New account sub-toggle */}
                            <div style={{
                                display: 'flex', gap: 4, padding: 4,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 12, marginBottom: 18,
                            }}>
                                <button onClick={() => { setAdminMode('signin'); setIsAdminOtpSent(false); setAuthError(''); }} style={subToggleStyle(adminMode === 'signin')}>
                                    Sign In
                                </button>
                                <button onClick={() => { setAdminMode('signup'); setIsAdminOtpSent(false); setAuthError(''); }} style={subToggleStyle(adminMode === 'signup')}>
                                    New Account
                                </button>
                            </div>

                            {/* Admin sign-in */}
                            {adminMode === 'signin' && (
                                isAdminOtpSent ? (
                                    <form onSubmit={handleVerifyAdminOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div style={{ textAlign: 'center', marginBottom: 6 }}>
                                            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(194,12,11,0.14)', border: '1px solid rgba(194,12,11,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                <Mail size={22} style={{ color: '#ff6b6b' }} />
                                            </div>
                                            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>Check your inbox</h3>
                                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                                                Enter the code sent to <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.84)' }}>{email}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Verification Code</label>
                                            <div style={{ position: 'relative' }}>
                                                <Lock size={16} style={iconStyle} />
                                                <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                    className="gi" placeholder="000000" maxLength={6} inputMode="numeric" autoFocus
                                                    style={{ ...glassInputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 18, fontFamily: 'monospace' }} />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={loading || otp.length !== 6} style={submitBtn(loading || otp.length !== 6)}>
                                            {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Verify & Sign In <ArrowRight size={16} /></>}
                                        </button>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                                            <button type="button" onClick={() => setIsAdminOtpSent(false)}
                                                style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                ← Back
                                            </button>
                                            <button type="button" onClick={handleResendAdminOtp} disabled={resendTimer > 0 || loading}
                                                style={{ fontSize: 12, color: resendTimer > 0 ? 'rgba(255,255,255,0.25)' : '#ff6b6b', background: 'none', border: 'none', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend link'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handleAdminSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {/* Password / OTP method selector */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {(['password', 'otp'] as const).map((m) => (
                                                <label key={m} style={{
                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                    padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                                    border: adminSignInMethod === m ? '1px solid rgba(194,12,11,0.45)' : '1px solid rgba(255,255,255,0.09)',
                                                    background: adminSignInMethod === m ? 'rgba(194,12,11,0.12)' : 'rgba(255,255,255,0.04)',
                                                    color: adminSignInMethod === m ? '#ff8080' : 'rgba(255,255,255,0.35)',
                                                    transition: 'all 0.2s',
                                                }}>
                                                    <input type="radio" name="authMethod" className="sr-only"
                                                        checked={adminSignInMethod === m} onChange={() => setAdminSignInMethod(m)} />
                                                    {m === 'password' ? <Key size={13} /> : <Mail size={13} />}
                                                    {m === 'password' ? 'Password' : 'Magic Link'}
                                                </label>
                                            ))}
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Admin Email</label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail size={16} style={iconStyle} />
                                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                                    className="gi" style={glassInputStyle} placeholder="admin@auctaveexports.com" />
                                            </div>
                                        </div>

                                        {adminSignInMethod === 'password' && (
                                            <div>
                                                <label style={labelStyle}>Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Key size={16} style={iconStyle} />
                                                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                                                        className="gi" style={{ ...glassInputStyle, paddingRight: 44 }} placeholder="••••••••" />
                                                    <button type="button" onClick={() => setShowPassword((p) => !p)} tabIndex={-1}
                                                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', padding: 2 }}>
                                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" disabled={loading} style={submitBtn(loading)}>
                                            {loading ? <RefreshCw size={17} className="animate-spin" /> : adminSignInMethod === 'password' ? <>Sign In <ArrowRight size={16} /></> : <>Send Verification Link <ArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )
                            )}

                            {/* Admin sign-up */}
                            {adminMode === 'signup' && (
                                isAdminOtpSent ? (
                                    <form onSubmit={handleVerifyAdminOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div style={{ textAlign: 'center', marginBottom: 6 }}>
                                            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(194,12,11,0.14)', border: '1px solid rgba(194,12,11,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                <Mail size={22} style={{ color: '#ff6b6b' }} />
                                            </div>
                                            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>Verify your email</h3>
                                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                                                Verification link sent to <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.84)' }}>{email}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Verification Code</label>
                                            <div style={{ position: 'relative' }}>
                                                <Lock size={16} style={iconStyle} />
                                                <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                    className="gi" placeholder="000000" maxLength={6} inputMode="numeric" autoFocus
                                                    style={{ ...glassInputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 18, fontFamily: 'monospace' }} />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={loading || otp.length !== 6} style={submitBtn(loading || otp.length !== 6)}>
                                            {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Verify & Create Account <ArrowRight size={16} /></>}
                                        </button>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                                            <button type="button" onClick={() => setIsAdminOtpSent(false)}
                                                style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                ← Back
                                            </button>
                                            <button type="button" onClick={handleResendAdminOtp} disabled={resendTimer > 0 || loading}
                                                style={{ fontSize: 12, color: resendTimer > 0 ? 'rgba(255,255,255,0.25)' : '#ff6b6b', background: 'none', border: 'none', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend link'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handleAdminSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div>
                                            <label style={labelStyle}>Admin Email</label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail size={16} style={iconStyle} />
                                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                                    className="gi" style={glassInputStyle} placeholder="admin@auctaveexports.com" />
                                            </div>
                                            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.40)', marginTop: 6 }}>
                                                Must be an @auctaveexports.com address
                                            </p>
                                        </div>
                                        <button type="submit" disabled={loading} style={submitBtn(loading)}>
                                            {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Send Verification Link <ArrowRight size={16} /></>}
                                        </button>
                                    </form>
                                )
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 24 }}>
                        © {new Date().getFullYear()} Auctave Exports · Secure login powered by Supabase
                    </p>
                </div>
            </div>
        </div>
    );
};
