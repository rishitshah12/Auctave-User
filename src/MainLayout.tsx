import React, { FC, ReactNode, useState, useEffect, useRef } from 'react';
import {
    Search, DollarSign, Plus, X,
    List, Truck, LogOut, Settings, Flame, FileQuestion,
    LayoutDashboard, Users, Building, ImageIcon, Bell, ChevronLeft,
    Grid3X3, User
} from 'lucide-react';
import { NotificationBellButton, NotificationPanel } from './NotificationPanel';
import { useNotifications } from './NotificationContext';

interface MainLayoutProps {
    children: ReactNode;
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    hideSidebar?: boolean;
    isAdmin?: boolean;
    globalLoading?: boolean;
    userProfile?: any;
}

const PAGE_TITLES: Record<string, string> = {
    sourcing: 'Sourcing',
    myQuotes: 'My Quotes',
    crm: 'CRM Portal',
    tracking: 'Tracking',
    billing: 'Billing',
    orderForm: 'Place Order',
    settings: 'Settings',
    trending: 'Trending',
    profile: 'Profile',
    quoteDetail: 'Quote Detail',
    factoryDetail: 'Factory',
    onboarding: 'Onboarding',
    adminDashboard: 'Dashboard',
    adminUsers: 'Users',
    adminFactories: 'Factories',
    adminCRM: 'CRM',
    adminRFQ: 'RFQ',
    adminTrending: 'Trending',
    adminLoginSettings: 'Login Settings',
};

// ── Icon Nav Item ─────────────────────────────────────────────────────────────
const NavItem: FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    badge?: number;
    onClick: () => void;
    title?: string;
}> = ({ icon, label, isActive, badge = 0, onClick, title }) => (
    <button
        onClick={onClick}
        title={title}
        className={`relative w-full flex flex-col items-center gap-[5px] py-[9px] px-1 rounded-xl transition-all duration-150 group ${
            isActive ? 'bg-white/20 shadow-inner' : 'hover:bg-white/[0.12]'
        }`}
    >
        <span className={`relative flex-shrink-0 transition-colors duration-150 ${
            isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
        }`}>
            {icon}
            {badge > 0 && (
                <span className="absolute -top-[5px] -right-[5px] h-[14px] min-w-[14px] px-0.5 bg-white text-rose-600 text-[7.5px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </span>
        <span className={`text-[10px] font-bold leading-tight text-center w-full truncate transition-colors duration-150 ${
            isActive ? 'text-white' : 'text-white/75 group-hover:text-white'
        }`}>
            {label}
        </span>
    </button>
);

// ── Mobile Header ─────────────────────────────────────────────────────────────
const MobileHeader: FC<{
    currentPage: string;
    isAdmin?: boolean;
    onOpenNotif: () => void;
    unreadCount: number;
    handleSetCurrentPage: (page: string, data?: any) => void;
}> = ({ currentPage, isAdmin, onOpenNotif, unreadCount, handleSetCurrentPage }) => {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver(() =>
            setIsDark(document.documentElement.classList.contains('dark'))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const title = PAGE_TITLES[currentPage] || 'Garment ERP';

    // Pages where we show a back arrow (detail pages)
    const isDetailPage = ['quoteDetail', 'factoryDetail', 'onboarding'].includes(currentPage);

    return (
        <header
            className="md:hidden sticky top-0 z-30 flex items-center justify-between px-3 h-14 border-b"
            style={{
                background: isDark ? 'rgba(10,10,12,0.92)' : 'rgba(255,255,255,0.92)',
                borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }}
        >
            {/* Left — back button on detail pages, logo on main pages */}
            {isDetailPage ? (
                <button
                    onClick={() => history.back()}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            ) : (
                <div className="w-10 h-10 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-[10px] flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #c20c0b, #350e4a)' }}>
                        <span className="text-white font-bold text-xs select-none">A</span>
                    </div>
                </div>
            )}

            {/* Center — page title */}
            <span className="absolute left-1/2 -translate-x-1/2 text-[15px] font-bold text-gray-900 dark:text-white tracking-tight pointer-events-none">
                {title}
            </span>

            {/* Right — notification bell */}
            <button
                onClick={onOpenNotif}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-white/10 transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-gray-950" />
                )}
            </button>
        </header>
    );
};

// ── More Panel (mobile) ───────────────────────────────────────────────────────
const MorePanel: FC<{
    isOpen: boolean;
    onClose: () => void;
    moreItems: Array<{ label: string; page: string; icon: React.ReactNode; badge?: number }>;
    currentPage: string;
    handleSetCurrentPage: (page: string) => void;
}> = ({ isOpen, onClose, moreItems, currentPage, handleSetCurrentPage }) => {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver(() =>
            setIsDark(document.documentElement.classList.contains('dark'))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[45] md:hidden"
                    style={{
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                    }}
                    onClick={onClose}
                />
            )}
            {/* Sheet */}
            <div
                className={`fixed left-0 right-0 z-[46] md:hidden transition-all duration-300 ease-out ${
                    isOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-3'
                }`}
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
            >
                <div
                    className="mx-3 mb-2 rounded-2xl p-4 shadow-2xl"
                    style={{
                        background: isDark ? 'rgba(15,15,22,0.97)' : 'rgba(255,255,255,0.97)',
                        backdropFilter: 'blur(28px)',
                        WebkitBackdropFilter: 'blur(28px)',
                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                    }}
                >
                    <div className="grid grid-cols-3 gap-2">
                        {moreItems.map(item => {
                            const isActive = currentPage === item.page;
                            return (
                                <button
                                    key={item.page}
                                    onClick={() => { handleSetCurrentPage(item.page); onClose(); }}
                                    className="flex flex-col items-center gap-2 py-3 rounded-xl active:scale-95 transition-transform"
                                >
                                    <div
                                        className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center relative"
                                        style={isActive ? {
                                            background: 'linear-gradient(135deg, #c20c0b 0%, #350e4a 100%)',
                                            boxShadow: '0 4px 16px rgba(194,12,11,0.35)',
                                        } : {
                                            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <span className={isActive ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-600'}>
                                            {item.icon}
                                        </span>
                                        {(item.badge ?? 0) > 0 && (
                                            <span className="absolute -top-1 -right-1 h-[15px] min-w-[15px] px-0.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                                                {(item.badge ?? 0) > 9 ? '9+' : item.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[11px] font-semibold leading-tight text-center ${
                                        isActive ? 'text-[#c20c0b]' : isDark ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};

// ── Side Menu ─────────────────────────────────────────────────────────────────
const SideMenu: FC<Omit<MainLayoutProps, 'children' | 'pageKey'> & { onOpenNotif: () => void }> = (
    { currentPage, isMenuOpen, toggleMenu, handleSetCurrentPage, handleSignOut, isAdmin, user, userProfile, onOpenNotif }
) => {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    const { notifications } = useNotifications();

    useEffect(() => {
        const observer = new MutationObserver(() =>
            setIsDark(document.documentElement.classList.contains('dark'))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const unreadByPage: Record<string, number> = {
        myQuotes: notifications.filter(n => n.category === 'rfq' && !n.isRead).length,
        crm:      notifications.filter(n => n.category === 'crm' && !n.isRead).length,
        adminRFQ: notifications.filter(n => n.category === 'rfq' && !n.isRead).length,
        adminCRM: notifications.filter(n => n.category === 'crm' && !n.isRead).length,
    };

    const avatarUrl: string = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
    const displayName: string = userProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
    const initials: string = displayName.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

    const clientMenuItems = [
        { label: 'Sourcing',   shortLabel: 'Sourcing',  page: 'sourcing',   icon: <Search className="h-[22px] w-[22px]" /> },
        { label: 'My Quotes',  shortLabel: 'Quotes',    page: 'myQuotes',   icon: <FileQuestion className="h-[22px] w-[22px]" /> },
        { label: 'CRM Portal', shortLabel: 'CRM',       page: 'crm',        icon: <List className="h-[22px] w-[22px]" /> },
        { label: 'Tracking',   shortLabel: 'Tracking',  page: 'tracking',   icon: <Truck className="h-[22px] w-[22px]" /> },
        { label: 'Billing',    shortLabel: 'Billing',   page: 'billing',    icon: <DollarSign className="h-[22px] w-[22px]" /> },
        { label: 'Place Order',shortLabel: 'Order',     page: 'orderForm',  icon: <Plus className="h-[22px] w-[22px]" /> },
        { label: 'Settings',   shortLabel: 'Settings',  page: 'settings',   icon: <Settings className="h-[22px] w-[22px]" /> },
        { label: 'Trending',   shortLabel: 'Trending',  page: 'trending',   icon: <Flame className="h-[22px] w-[22px]" /> },
    ];

    const adminMenuItems = [
        { label: 'Dashboard',  shortLabel: 'Dashboard', page: 'adminDashboard',     icon: <LayoutDashboard className="h-[22px] w-[22px]" /> },
        { label: 'Users',      shortLabel: 'Users',     page: 'adminUsers',         icon: <Users className="h-[22px] w-[22px]" /> },
        { label: 'Factories',  shortLabel: 'Factory',   page: 'adminFactories',     icon: <Building className="h-[22px] w-[22px]" /> },
        { label: 'CRM',        shortLabel: 'CRM',       page: 'adminCRM',           icon: <List className="h-[22px] w-[22px]" /> },
        { label: 'RFQ',        shortLabel: 'RFQ',       page: 'adminRFQ',           icon: <FileQuestion className="h-[22px] w-[22px]" /> },
        { label: 'Trending',   shortLabel: 'Trending',  page: 'adminTrending',      icon: <Flame className="h-[22px] w-[22px]" /> },
        { label: 'Login Imgs', shortLabel: 'Login Imgs',page: 'adminLoginSettings', icon: <ImageIcon className="h-[22px] w-[22px]" /> },
        { label: 'Settings',   shortLabel: 'Settings',  page: 'settings',           icon: <Settings className="h-[22px] w-[22px]" /> },
    ];

    const menuItems = isAdmin ? adminMenuItems : clientMenuItems;

    return (<>
        {/* Mobile overlay */}
        {isMenuOpen && (
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={toggleMenu}
            />
        )}

        {/* Sidebar */}
        <aside
            className={`fixed top-2 bottom-2 left-2 w-[68px] flex flex-col z-50 rounded-2xl overflow-hidden transition-transform duration-300 ease-in-out ${
                isMenuOpen ? 'translate-x-0' : '-translate-x-[80px]'
            } md:translate-x-0`}
            style={{
                background: isDark
                    ? 'linear-gradient(180deg, #6b0504 0%, #4b0404ff 40%, #1f083cff 100%)'
                    : 'linear-gradient(180deg, #c20c0b 0%, #7f1010ff 40%, #350e4aff 100%)',
                boxShadow: isDark
                    ? '0 8px 32px rgba(0,0,0,0.6)'
                    : '0 8px 32px rgba(0,0,0,0.35)',
            }}
        >
            {/* Subtle shine overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }}
            />

            {/* Brand Logo */}
            <div className="relative flex items-center justify-center h-[64px] flex-shrink-0">
                <div className="w-10 h-10 rounded-[14px] bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-1 ring-white/20">
                    <span className="text-white font-bold text-base tracking-tight select-none">A</span>
                </div>
                <button
                    onClick={toggleMenu}
                    className="md:hidden absolute top-2 right-1 p-1 rounded-lg bg-white/15 text-white/80 hover:bg-white/25 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div className="mx-3 h-px bg-white/15 flex-shrink-0" />

            {/* Nav items */}
            <nav className="relative flex-1 flex flex-col items-stretch px-2 pt-3 pb-1 gap-0.5 overflow-y-auto scrollbar-none">
                {menuItems.map(item => (
                    <NavItem
                        key={item.page}
                        icon={item.icon}
                        label={item.shortLabel}
                        isActive={currentPage === item.page}
                        badge={unreadByPage[item.page] || 0}
                        onClick={() => { handleSetCurrentPage(item.page); if (isMenuOpen) toggleMenu(); }}
                    />
                ))}

                {/* Notifications bell — desktop only (mobile uses header bell) */}
                <div className="hidden md:block">
                    <NotificationBellButton
                        onClick={onOpenNotif}
                        isSidebarCollapsed={false}
                    />
                </div>
            </nav>

            <div className="mx-3 h-px bg-white/15 flex-shrink-0" />

            {/* Profile */}
            {user && (
                <div className="relative px-2 pt-2 flex-shrink-0">
                    <button
                        onClick={() => { handleSetCurrentPage('profile'); if (isMenuOpen) toggleMenu(); }}
                        className="w-full flex flex-col items-center gap-[5px] py-[9px] px-1 rounded-xl hover:bg-white/[0.12] transition-all group"
                        title={displayName}
                    >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/25 flex-shrink-0 bg-white/20 flex items-center justify-center">
                            {avatarUrl
                                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                : <span className="text-white font-bold text-[11px] leading-none">{initials}</span>}
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full ring-[1.5px] ring-[#2d0a3e]" />
                        </div>
                        <span className="text-[9.5px] font-medium text-white/60 group-hover:text-white/90 transition-colors leading-tight">
                            Profile
                        </span>
                    </button>
                </div>
            )}

            {/* Logout */}
            <div className="relative px-2 pb-4 flex-shrink-0">
                <button
                    onClick={() => { handleSignOut(); if (isMenuOpen) toggleMenu(); }}
                    className="w-full flex flex-col items-center gap-[5px] py-[9px] px-1 rounded-xl hover:bg-white/10 transition-all group"
                    title="Logout"
                >
                    <LogOut className="h-[18px] w-[18px] text-white/50 group-hover:text-red-200 transition-colors" />
                    <span className="text-[9.5px] font-medium text-white/45 group-hover:text-red-200 transition-colors leading-tight">
                        Logout
                    </span>
                </button>
            </div>
        </aside>
    </>);
};

// ── Bottom Nav (Mobile) ───────────────────────────────────────────────────────
const BottomNavBar: FC<{
    currentPage: string;
    handleSetCurrentPage: (page: string) => void;
    isAdmin?: boolean;
    unreadByPage: Record<string, number>;
}> = ({ currentPage, handleSetCurrentPage, isAdmin, unreadByPage }) => {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    const [visible, setVisible] = useState(true);
    const [moreOpen, setMoreOpen] = useState(false);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const observer = new MutationObserver(() =>
            setIsDark(document.documentElement.classList.contains('dark'))
        );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const current = window.scrollY;
            if (current <= 10) {
                setVisible(true);
            } else if (current < lastScrollY.current) {
                setVisible(true);
            } else {
                setVisible(false);
                setMoreOpen(false);
            }
            lastScrollY.current = current;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const clientMainItems = [
        { label: 'Sourcing', page: 'sourcing',  icon: <Search className="h-[22px] w-[22px]" /> },
        { label: 'Quotes',   page: 'myQuotes',  icon: <FileQuestion className="h-[22px] w-[22px]" />, badge: unreadByPage['myQuotes'] },
        { label: 'Trending', page: 'trending',  icon: <Flame className="h-[22px] w-[22px]" /> },
    ];
    const clientMoreItems = [
        { label: 'CRM',      page: 'crm',       icon: <List className="h-[22px] w-[22px]" />,        badge: unreadByPage['crm'] },
        { label: 'Tracking', page: 'tracking',  icon: <Truck className="h-[22px] w-[22px]" /> },
        { label: 'Billing',  page: 'billing',   icon: <DollarSign className="h-[22px] w-[22px]" /> },
        { label: 'Settings', page: 'settings',  icon: <Settings className="h-[22px] w-[22px]" /> },
        { label: 'Profile',  page: 'profile',   icon: <User className="h-[22px] w-[22px]" /> },
    ];

    const adminMainItems = [
        { label: 'Dashboard', page: 'adminDashboard', icon: <LayoutDashboard className="h-[22px] w-[22px]" /> },
        { label: 'RFQ',       page: 'adminRFQ',       icon: <FileQuestion className="h-[22px] w-[22px]" />, badge: unreadByPage['adminRFQ'] },
        { label: 'Trending',  page: 'adminTrending',  icon: <Flame className="h-[22px] w-[22px]" /> },
    ];
    const adminMoreItems = [
        { label: 'Users',      page: 'adminUsers',         icon: <Users className="h-[22px] w-[22px]" /> },
        { label: 'Factories',  page: 'adminFactories',     icon: <Building className="h-[22px] w-[22px]" /> },
        { label: 'CRM',        page: 'adminCRM',           icon: <List className="h-[22px] w-[22px]" />,    badge: unreadByPage['adminCRM'] },
        { label: 'Login Imgs', page: 'adminLoginSettings', icon: <ImageIcon className="h-[22px] w-[22px]" /> },
        { label: 'Settings',   page: 'settings',           icon: <Settings className="h-[22px] w-[22px]" /> },
    ];

    const mainItems = isAdmin ? adminMainItems : clientMainItems;
    const moreItems = isAdmin ? adminMoreItems : clientMoreItems;
    const isMorePageActive = moreItems.some(i => i.page === currentPage);
    const totalMoreBadge = moreItems.reduce((sum, i) => sum + (i.badge || 0), 0);

    return (
        <>
            <MorePanel
                isOpen={moreOpen}
                onClose={() => setMoreOpen(false)}
                moreItems={moreItems}
                currentPage={currentPage}
                handleSetCurrentPage={handleSetCurrentPage}
            />

            {/* Pill nav + FABs row */}
            <div
                className={`fixed left-4 right-4 z-40 md:hidden transition-all duration-300 ease-in-out ${
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            >
                <div className="flex items-end gap-3">
                    {/* ── Pill nav ── */}
                    <div
                        className="flex-1 rounded-full overflow-hidden"
                        style={{
                            background: isDark ? 'rgba(12,12,18,0.97)' : 'rgba(255,255,255,0.97)',
                            border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.09)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
                        }}
                    >
                        <div className="flex items-center h-[58px] px-1">
                            {/* Main tab items */}
                            {mainItems.map(item => {
                                const isActive = currentPage === item.page;
                                return (
                                    <button
                                        key={item.page}
                                        onClick={() => { handleSetCurrentPage(item.page); setMoreOpen(false); }}
                                        className="relative flex flex-col items-center justify-center gap-[3px] flex-1 h-full active:opacity-60 transition-opacity"
                                    >
                                        <span className="relative">
                                            <span className={`block [&>svg]:transition-colors ${
                                                isActive ? 'text-[#c20c0b] [&>svg]:stroke-[2.5]' : isDark ? 'text-gray-400 [&>svg]:stroke-[1.8]' : 'text-gray-500 [&>svg]:stroke-[1.8]'
                                            }`}>
                                                {item.icon}
                                            </span>
                                            {(item.badge ?? 0) > 0 && (
                                                <span className="absolute -top-1 -right-1.5 h-[14px] min-w-[14px] px-0.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                                                    {(item.badge ?? 0) > 9 ? '9+' : item.badge}
                                                </span>
                                            )}
                                        </span>
                                        <span className={`text-[10px] font-semibold leading-tight ${
                                            isActive ? 'text-[#c20c0b]' : isDark ? 'text-gray-500' : 'text-gray-400'
                                        }`}>
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}

                            {/* More button */}
                            <button
                                onClick={() => setMoreOpen(prev => !prev)}
                                className="relative flex flex-col items-center justify-center gap-[3px] flex-1 h-full active:opacity-60 transition-opacity"
                            >
                                <span className="relative">
                                    <span className={`block [&>svg]:transition-colors ${
                                        moreOpen || isMorePageActive
                                            ? 'text-[#c20c0b] [&>svg]:stroke-[2.5]'
                                            : isDark ? 'text-gray-400 [&>svg]:stroke-[1.8]' : 'text-gray-500 [&>svg]:stroke-[1.8]'
                                    }`}>
                                        <Grid3X3 className="h-[22px] w-[22px]" />
                                    </span>
                                    {totalMoreBadge > 0 && !moreOpen && (
                                        <span className="absolute -top-1 -right-1.5 h-[14px] min-w-[14px] px-0.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                                            {totalMoreBadge > 9 ? '9+' : totalMoreBadge}
                                        </span>
                                    )}
                                </span>
                                <span className={`text-[10px] font-semibold leading-tight ${
                                    moreOpen || isMorePageActive ? 'text-[#c20c0b]' : isDark ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                    More
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* ── Place Order FAB (client only) ── */}
                    {!isAdmin && (
                        <button
                            onClick={() => { handleSetCurrentPage('orderForm'); setMoreOpen(false); }}
                            className="w-[58px] h-[58px] rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                            style={{
                                background: 'linear-gradient(135deg, #c20c0b 0%, #350e4a 100%)',
                                boxShadow: '0 4px 20px rgba(194,12,11,0.45)',
                            }}
                            title="Place Order"
                        >
                            <Plus className="w-6 h-6 text-white stroke-[2.5]" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

// ── Main Layout ───────────────────────────────────────────────────────────────
export const MainLayout: FC<MainLayoutProps> = (props) => {
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const { notifications } = useNotifications();

    const totalUnread = notifications.filter(n => !n.isRead).length;

    const unreadByPage: Record<string, number> = {
        myQuotes:  notifications.filter(n => n.category === 'rfq' && !n.isRead).length,
        crm:       notifications.filter(n => n.category === 'crm' && !n.isRead).length,
        adminRFQ:  notifications.filter(n => n.category === 'rfq' && !n.isRead).length,
        adminCRM:  notifications.filter(n => n.category === 'crm' && !n.isRead).length,
    };

    const showNav = !!props.user && !props.hideSidebar;

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white font-inter transition-colors duration-200 relative flex-col">
            {/* Accent Gradient (dark mode) */}
            <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-[#450a0a]/60 via-[var(--color-primary)]/10 to-transparent pointer-events-none z-0 dark:block hidden animate-gradient-slow" />

            {/* Global loading bar */}
            {props.globalLoading && (
                <div className="fixed top-0 left-0 right-0 h-1 z-[100] bg-red-100 dark:bg-red-900 overflow-hidden">
                    <div className="h-full bg-[var(--color-primary)] animate-progress-indeterminate" />
                </div>
            )}

            {/* Mobile sticky header */}
            {showNav && (
                <MobileHeader
                    currentPage={props.currentPage}
                    isAdmin={props.isAdmin}
                    onOpenNotif={() => setIsNotifOpen(true)}
                    unreadCount={totalUnread}
                    handleSetCurrentPage={props.handleSetCurrentPage}
                />
            )}

            {/* Body row: sidebar + content */}
            <div className="flex flex-1 relative z-10">
                {showNav && (
                    <>
                        <SideMenu {...props} onOpenNotif={() => setIsNotifOpen(true)} />
                        {/* Spacer: 68px sidebar + 8px left gap = 76px */}
                        <div className="hidden md:block flex-shrink-0 w-[76px]" />
                    </>
                )}

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <div
                        key={props.pageKey}
                        className="flex-1 w-full max-w-7xl mx-auto px-3 py-3 sm:p-6 lg:p-8 pb-24 md:pb-8 animate-fade-in"
                    >
                        {props.children}
                    </div>
                </main>
            </div>

            {/* Notification panel (single instance, shared) */}
            <NotificationPanel
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                onNavigate={(page, data) => {
                    props.handleSetCurrentPage(page, data);
                    if (props.isMenuOpen) props.toggleMenu();
                    setIsNotifOpen(false);
                }}
            />

            {/* Bottom nav (mobile — all users) */}
            {showNav && (
                <BottomNavBar
                    currentPage={props.currentPage}
                    handleSetCurrentPage={props.handleSetCurrentPage}
                    isAdmin={props.isAdmin}
                    unreadByPage={unreadByPage}
                />
            )}
        </div>
    );
};
