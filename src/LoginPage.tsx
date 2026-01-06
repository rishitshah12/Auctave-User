import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Mail, Phone, Chrome, ArrowRight, Lock, Globe } from 'lucide-react';

interface LoginPageProps {
    showToast: (message: string, type?: 'success' | 'error') => void;
    setAuthError: (error: string) => void;
    authError: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ showToast, setAuthError, authError }) => {
    const [method, setMethod] = useState<'email' | 'phone'>('email');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submittedPhone, setSubmittedPhone] = useState('');

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

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
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
        const { error } = await supabase.auth.verifyOtp({
            phone: submittedPhone,
            token: otp,
            type: 'sms',
        });
        setLoading(false);
        if (error) {
            setAuthError(error.message);
            showToast(error.message, 'error');
        } else {
            showToast('Phone verified successfully!', 'success');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
                        <p className="text-gray-500 mt-2">Sign in to access your sourcing dashboard</p>
                    </div>

                    {authError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                            {authError}
                        </div>
                    )}

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
                        <form onSubmit={handleEmailSignIn} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" placeholder="you@company.com" />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">{loading ? 'Sending...' : 'Send Login Link'} <ArrowRight size={20} /></button>
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
                </div>
            </div>
        </div>
    );
};