import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Mail, Phone, Chrome, ArrowRight, Lock, Globe, Shield, User, Key, RefreshCw } from 'lucide-react';

interface LoginPageProps {
    showToast: (message: string, type?: 'success' | 'error') => void;
    setAuthError: (error: string) => void;
    authError: string;
    onLoginSuccess?: (session?: any) => void | Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ showToast, setAuthError, authError, onLoginSuccess }) => {
    const [loginType, setLoginType] = useState<'user' | 'admin'>('user');
    const [adminMode, setAdminMode] = useState<'signin' | 'signup'>('signin');
    const [method, setMethod] = useState<'email' | 'phone'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isAdminOtpSent, setIsAdminOtpSent] = useState(false);
    const [adminSignInMethod, setAdminSignInMethod] = useState<'password' | 'otp'>('password');
    const [loading, setLoading] = useState(false);
    const [submittedPhone, setSubmittedPhone] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
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
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    prompt: 'select_account',
                }
            }
        });
        if (error) {
            if (error.message.includes("provider is not enabled")) {
                setAuthError("Google Sign-In is disabled. Enable it in Supabase > Authentication > Providers.");
            } else {
                setAuthError(error.message);
            }
            showToast(error.message, 'error');
            setLoading(false);
        }
    };

    const handleUserEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const normalizedEmail = email.toLowerCase().trim();
        // User Magic Link Login
        const { error } = await supabase.auth.signInWithOtp({
            email: normalizedEmail,
            options: {
                emailRedirectTo: window.location.origin,
            }
        });
        setLoading(false);
        if (error) {
            setAuthError(error.message);
            showToast(error.message, 'error');
        } else {
            showToast('Magic link sent to your email!', 'success');
            setAuthError('');
        }
    };

    const handleAdminSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        try {
            const normalizedEmail = email.toLowerCase().trim();

            if (!normalizedEmail.endsWith('@auctaveexports.com')) {
                throw new Error('Admin access is restricted to @auctaveexports.com emails.');
            }

            if (adminSignInMethod === 'password') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password,
                });
                if (error) throw error;
                showToast('Signed in successfully!', 'success');
                if (onLoginSuccess) await onLoginSuccess(data.session);
            } else {
                const { error } = await supabase.auth.signInWithOtp({
                    email: normalizedEmail,
                    options: {
                        shouldCreateUser: false,
                        emailRedirectTo: window.location.origin,
                    }
                });
                if (error) throw error;
                setIsAdminOtpSent(true);
                setResendTimer(60);
                setOtp('');
                showToast('Magic link sent to your email!', 'success');
            }
        } catch (error: any) {
            setAuthError(error.message);
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendAdminOtp = async () => {
        if (resendTimer > 0 || loading) return;
        setLoading(true);
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const options = adminMode === 'signin' 
                ? { shouldCreateUser: false, emailRedirectTo: window.location.origin }
                : { shouldCreateUser: true, data: { password_set: false }, emailRedirectTo: window.location.origin };

            const { error } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options
            });
            
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

        try {
            const normalizedEmail = email.toLowerCase().trim();
            if (!normalizedEmail.endsWith('@auctaveexports.com')) {
                throw new Error('Admin access is restricted to @auctaveexports.com emails.');
            }

            // Check if account exists by attempting sign-in with user creation disabled
            const checkResult = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: { shouldCreateUser: false }
            });

            if (!checkResult.error) {
                throw new Error('Account already exists. Please sign in.');
            }

            const { error } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                    shouldCreateUser: true,
                    data: { password_set: false },
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) throw error;

            setIsAdminOtpSent(true);
            setResendTimer(60);
            setOtp('');
            showToast('Email verification link sent to your email!', 'success');
            setAuthError('');
        } catch (error: any) {
            setAuthError(error.message);
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAdminOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        try {
            const token = otp.trim();
            const normalizedEmail = email.toLowerCase().trim();
            let { data, error } = await supabase.auth.verifyOtp({
                email: normalizedEmail,
                token,
                type: 'signup',
            });

            // If 'signup' fails, it might be because the user already exists.
            // Supabase might send a 'recovery' OTP in that case. Let's try that as a fallback.
            if (error) {
                // Try 'email' type (Magic Link OTP) - likely if user exists
                const emailResult = await supabase.auth.verifyOtp({
                    email: normalizedEmail,
                    token,
                    type: 'email',
                });

                if (!emailResult.error) {
                    data = emailResult.data;
                    error = null;
                } else {
                    const recoveryResult = await supabase.auth.verifyOtp({
                        email: normalizedEmail,
                        token,
                        type: 'recovery',
                    });
                    if (!recoveryResult.error) {
                        data = recoveryResult.data;
                        error = null;
                    }
                }
            }

            if (error) throw error;

            let session = data?.session;
            if (!session) {
                const { data: localData } = await supabase.auth.getSession();
                session = localData.session;
            }

            if (!session) {
                throw new Error("Could not establish a session after OTP verification.");
            }

            showToast('Verified successfully!', 'success');
            if (onLoginSuccess) await onLoginSuccess(session);
        } catch (error: any) {
            setLoading(false);
            setAuthError(error.message);
            showToast(error.message, 'error');
        }
    };

    const handlePhoneSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
        const fullPhone = `${countryCode}${cleanPhone}`;
        const { error } = await supabase.auth.signInWithOtp({
            phone: fullPhone,
        });
        setLoading(false);
        if (error) {
            if (error.message.includes("provider is not enabled")) {
                setAuthError("Phone Sign-In is disabled. Enable it in Supabase > Authentication > Providers.");
            } else if (error.message.includes("Invalid From Number")) {
                setAuthError("System Configuration Error: The Twilio 'From' number in Supabase is invalid.");
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
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: submittedPhone,
                token: otp,
                type: 'sms',
            });
            if (error) throw error;

            let session = data?.session;
            if (!session) {
                const { data: localData } = await supabase.auth.getSession();
                session = localData.session;
            }

            showToast('Phone verified successfully!', 'success');
            setLoading(false);
            if (onLoginSuccess) onLoginSuccess(session);
        } catch (error: any) {
            setLoading(false);
            setAuthError(error.message);
            showToast(error.message, 'error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative">
            <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-[#c20c0b]/15 to-transparent pointer-events-none blur-3xl"></div>
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative z-10">
                <div className="p-8">
                    {/* Login Type Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
                        <button onClick={() => { setLoginType('user'); setAuthError(''); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${loginType === 'user' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                            <User size={16} />
                            User
                        </button>
                        <button onClick={() => { setLoginType('admin'); setAuthError(''); setAdminMode('signin'); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${loginType === 'admin' ? 'bg-white shadow-sm text-[#c20c0b]' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Shield size={16} />
                            Admin
                        </button>
                    </div>

                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
                        <p className="text-gray-500 mt-2">Sign in to access your sourcing dashboard</p>
                    </div>

                    {authError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                            {authError}
                            {authError.includes('already exists') && (
                                <button onClick={() => { setAdminMode('signin'); setAuthError(''); }} className="block mt-2 font-bold underline hover:text-red-800">
                                    Go to Sign In
                                </button>
                            )}
                        </div>
                    )}

                    {loginType === 'user' && (
                        <>
                            <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors mb-6">
                                <Chrome size={20} className="text-blue-500" /> Sign in with Google
                            </button>

                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
                            </div>

                            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                                <button onClick={() => { setMethod('email'); setIsOtpSent(false); setAuthError(''); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${method === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Email</button>
                                <button onClick={() => { setMethod('phone'); setIsOtpSent(false); setAuthError(''); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${method === 'phone' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Mobile</button>
                            </div>

                            {method === 'email' ? (
                                <form onSubmit={handleUserEmailSignIn} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c20c0b] transition-all" placeholder="you@company.com" />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full bg-[#c20c0b] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#a50a09] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                                        {loading ? 'Processing...' : 'Send Login Link'} <ArrowRight size={20} />
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    {!isOtpSent ? (
                                        <form onSubmit={handlePhoneSignIn} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                                <div className="flex gap-2">
                                                    <div className="relative w-1/3">
                                                        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} disabled={isOtpSent} className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-3 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100">
                                                            {countryCodes.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.label})</option>))}
                                                        </select>
                                                        <Globe className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                                    </div>
                                                    <div className="relative flex-1">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isOtpSent} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:bg-gray-100" placeholder="Mobile Number" />
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">{loading ? 'Sending...' : 'Get Verification Code'} <ArrowRight size={20} /></button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                                            <div className="text-center mb-4">
                                                <p className="text-sm text-gray-600">Enter the code sent to {submittedPhone}</p>
                                                <button type="button" onClick={() => setIsOtpSent(false)} className="text-xs text-purple-600 hover:underline mt-1">Change Number</button>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                    <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all tracking-widest text-lg" placeholder="Enter code" maxLength={6} />
                                                </div>
                                            </div>
                                            <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">{loading ? 'Verifying...' : 'Verify & Sign In'} <ArrowRight size={20} /></button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {loginType === 'admin' && (
                        <div>
                            <div className="flex border-b border-gray-200 mb-6">
                                <button 
                                    className={`flex-1 pb-2 text-sm font-medium ${adminMode === 'signin' ? 'border-b-2 border-[#c20c0b] text-[#c20c0b]' : 'text-gray-500'}`}
                                    onClick={() => { setAdminMode('signin'); setIsAdminOtpSent(false); setAuthError(''); }}
                                >
                                    Sign In
                                </button>
                                <button 
                                    className={`flex-1 pb-2 text-sm font-medium ${adminMode === 'signup' ? 'border-b-2 border-[#c20c0b] text-[#c20c0b]' : 'text-gray-500'}`}
                                    onClick={() => { setAdminMode('signup'); setIsAdminOtpSent(false); setAuthError(''); }}
                                >
                                    Sign Up
                                </button>
                            </div>

                            {adminMode === 'signin' ? (
                                isAdminOtpSent ? (
                                    <form onSubmit={handleVerifyAdminOtp} className="space-y-4">
                                        <div className="text-center mb-6">
                                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                                <Mail className="w-8 h-8 text-[#c20c0b]" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Verify your email</h3>
                                            <p className="text-gray-600">
                                                Enter the 6-digit code sent to <br/>
                                                <span className="font-semibold text-gray-900">{email}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c20c0b] transition-all tracking-widest text-lg text-center" placeholder="000000" maxLength={6} />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-[#c20c0b] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#a50a09] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                                            {loading ? 'Verifying...' : 'Verify & Sign In'} <ArrowRight size={20} />
                                        </button>
                                        <button type="button" onClick={() => setIsAdminOtpSent(false)} className="w-full text-[#c20c0b] font-semibold hover:text-[#a50a09] text-sm flex items-center justify-center gap-1 mt-4">
                                            <ArrowRight className="rotate-180" size={16} /> Back to Sign In
                                        </button>
                                        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                                            <p className="text-sm text-gray-500 mb-3">Didn't receive the email?</p>
                                            <button 
                                                type="button"
                                                onClick={handleResendAdminOtp}
                                                disabled={resendTimer > 0 || loading}
                                                className="text-gray-600 hover:text-[#c20c0b] text-sm font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Magic Link'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                    <form onSubmit={handleAdminSignIn} className="space-y-4">
                                        <div className="flex gap-4 mb-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="authMethod" checked={adminSignInMethod === 'password'} onChange={() => setAdminSignInMethod('password')} className="text-[#c20c0b] focus:ring-[#c20c0b]" />
                                                <span className="text-sm font-medium text-gray-700">Password</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="authMethod" checked={adminSignInMethod === 'otp'} onChange={() => setAdminSignInMethod('otp')} className="text-[#c20c0b] focus:ring-[#c20c0b]" />
                                                <span className="text-sm font-medium text-gray-700">One-Time Password</span>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c20c0b] transition-all" placeholder="admin@auctaveexports.com" />
                                            </div>
                                        </div>
                                        {adminSignInMethod === 'password' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                                <div className="relative">
                                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c20c0b] transition-all" placeholder="Enter your password" />
                                                </div>
                                            </div>
                                        )}
                                        <button type="submit" disabled={loading} className="w-full bg-[#c20c0b] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#a50a09] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                                            {loading ? (adminSignInMethod === 'password' ? 'Signing In...' : 'Sending Link...') : (adminSignInMethod === 'password' ? 'Sign In' : 'Send Magic Link')} <ArrowRight size={20} />
                                        </button>
                                    </form>
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (onLoginSuccess) {
                                                    onLoginSuccess({
                                                        user: {
                                                            id: 'dev-admin',
                                                            email: 'admin@auctaveexports.com',
                                                            user_metadata: { password_set: true }
                                                        }
                                                    });
                                                }
                                            }}
                                            className="w-full bg-gray-800 text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Shield size={20} /> Test Admin Access (Bypass)
                                        </button>
                                    </div>
                                    </>
                                )
                            ) : (
                                isAdminOtpSent ? (
                                    <form onSubmit={handleVerifyAdminOtp} className="space-y-4">
                                        <div className="text-center mb-6">
                                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                                <Mail className="w-8 h-8 text-[#c20c0b]" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Verify your email</h3>
                                            <p className="text-gray-600">
                                                Enter the 6-digit code sent to <br/>
                                                <span className="font-semibold text-gray-900">{email}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c20c0b] transition-all tracking-widest text-lg text-center" placeholder="000000" maxLength={6} />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-[#c20c0b] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#a50a09] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                                            {loading ? 'Verifying...' : 'Verify & Sign Up'} <ArrowRight size={20} />
                                        </button>
                                        <button type="button" onClick={() => setIsAdminOtpSent(false)} className="w-full text-[#c20c0b] font-semibold hover:text-[#a50a09] text-sm flex items-center justify-center gap-1 mt-4">
                                            <ArrowRight className="rotate-180" size={16} /> Back to Sign Up
                                        </button>
                                        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                                            <p className="text-sm text-gray-500 mb-3">Didn't receive the email?</p>
                                            <button 
                                                type="button"
                                                onClick={handleResendAdminOtp}
                                                disabled={resendTimer > 0 || loading}
                                                className="text-gray-600 hover:text-[#c20c0b] text-sm font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Verification Link'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handleAdminSignUp} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c20c0b] transition-all" placeholder="admin@auctaveexports.com" />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={loading} className="w-full bg-[#c20c0b] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#a50a09] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                                            {loading ? 'Sending Link...' : 'Send Verification Link'} <ArrowRight size={20} />
                                        </button>
                                    </form>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};