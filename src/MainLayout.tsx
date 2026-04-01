import React, { FC, ReactNode, useState, useEffect } from 'react';
import {
    Search, DollarSign, Plus, X,
    List, Truck, User as UserIcon, LogOut, Settings, Flame, FileQuestion,
    LayoutDashboard, Users, Building, ImageIcon, Bell
} from 'lucide-react';
import { NotificationBellButton, NotificationPanel } from './NotificationPanel';
import { useNotifications } from './NotificationContext';
import { AdminUniversalChat } from './AdminUniversalChat';

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
        {/* Icon with badge */}
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
        {/* Label */}
        <span className={`text-[10px] font-bold leading-tight text-center w-full truncate transition-colors duration-150 ${
            isActive ? 'text-white' : 'text-white/75 group-hover:text-white'
        }`}>
            {label}
        </span>
    </button>
);

// ── Side Menu ─────────────────────────────────────────────────────────────────
const SideMenu: FC<Omit<MainLayoutProps, 'children' | 'pageKey'>> = (
    { currentPage, isMenuOpen, toggleMenu, handleSetCurrentPage, handleSignOut, isAdmin, user, userProfile }
) => {
    const [isNotifOpen, setIsNotifOpen] = useState(false);
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
    const displayEmail: string = user?.email || '';
    const companyName: string = userProfile?.companyName || '';
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
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
                }}
            />

            {/* Brand Logo */}
            <div className="relative flex items-center justify-center h-[64px] flex-shrink-0">
                <div className="w-10 h-10 rounded-[14px] bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-1 ring-white/20">
                    <span className="text-white font-bold text-base tracking-tight select-none">A</span>
                </div>
                {/* Mobile close — tiny X top-right */}
                <button
                    onClick={toggleMenu}
                    className="md:hidden absolute top-2 right-1 p-1 rounded-lg bg-white/15 text-white/80 hover:bg-white/25 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* Thin divider */}
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

                {/* Notifications */}
                <NotificationBellButton
                    onClick={() => setIsNotifOpen(true)}
                    isSidebarCollapsed={false}
                />
            </nav>

            {/* Global Notification Panel */}
            <NotificationPanel
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                onNavigate={(page, data) => {
                    handleSetCurrentPage(page, data);
                    if (isMenuOpen) toggleMenu();
                    setIsNotifOpen(false);
                }}
            />

            {/* Thin divider */}
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
                            {/* Online dot */}
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
const BottomNavBar: FC<{ currentPage: string; handleSetCurrentPage: (page: string) => void; }> = ({ currentPage, handleSetCurrentPage }) => {
    const navItems = [
      { name: 'Sourcing',  page: 'sourcing',  icon: <Search /> },
      { name: 'My Quotes', page: 'myQuotes',  icon: <FileQuestion /> },
      { name: 'Orders',    page: 'crm',       icon: <List /> },
      { name: 'Billing',   page: 'billing',   icon: <DollarSign /> },
      { name: 'Trending',  page: 'trending',  icon: <Flame /> },
    ];
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 md:hidden z-40">
          <div className="absolute bottom-0 left-0 right-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.1)] h-16 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex justify-around items-center h-full">
                  {navItems.map(item => (
                      <button key={item.name} onClick={() => handleSetCurrentPage(item.page)} className={`flex flex-col items-center justify-center space-y-1 w-1/5 ${currentPage === item.page ? 'text-[var(--color-primary)]' : 'text-gray-500 dark:text-gray-200'} hover:text-[var(--color-primary)] transition-colors`}>
                          {item.icon}
                          <span className="text-xs font-medium">{item.name}</span>
                      </button>
                  ))}
              </div>
          </div>
          <button onClick={() => handleSetCurrentPage('orderForm')} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white shadow-lg transform transition-transform hover:scale-110">
              <Plus size={32}/>
          </button>
      </div>
    );
};

// ── Main Layout ───────────────────────────────────────────────────────────────
export const MainLayout: FC<MainLayoutProps> = (props) => (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white font-inter transition-colors duration-200 relative">
        {/* Accent Gradient for Dark Mode */}
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-[#450a0a]/60 via-[var(--color-primary)]/10 to-transparent pointer-events-none z-0 dark:block hidden animate-gradient-slow" />

        {props.globalLoading && (
            <div className="fixed top-0 left-0 right-0 h-1 z-[100] bg-red-100 dark:bg-red-900 overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] animate-progress-indeterminate"></div>
            </div>
        )}

        {props.user && !props.hideSidebar && (
            <>
                <SideMenu {...props} />
                {/* Spacer: 68px sidebar + 8px left gap = 76px */}
                <div className="hidden md:block flex-shrink-0 w-[76px]" />
            </>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
            <div key={props.pageKey} className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 animate-fade-in">
                {props.children}
            </div>
        </main>

        {props.user && !props.hideSidebar && (
            <BottomNavBar currentPage={props.currentPage} handleSetCurrentPage={props.handleSetCurrentPage} />
        )}

        {/* Universal RFQ chat — admin only */}
        {props.isAdmin && props.user && <AdminUniversalChat />}
    </div>
);
