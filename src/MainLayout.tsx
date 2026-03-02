// Import React and types for building components
import React, { FC, ReactNode, useState } from 'react';
// Import icons for the menu and UI
import {
    Search, DollarSign, Plus, ChevronLeft, ChevronsLeft, ChevronsRight,
    Menu, X, List, Truck, User as UserIcon, LogOut, Settings, Flame, FileQuestion, LayoutDashboard, Users, Building, ImageIcon
} from 'lucide-react';
import { NotificationBellButton, NotificationPanel } from './NotificationPanel';
import { useNotifications } from './NotificationContext';

// Define the data (props) that the MainLayout component needs to work
interface MainLayoutProps {
    children: ReactNode; // The content of the page being displayed
    pageKey: number; // A unique key to force refresh when needed
    user: any; // The currently logged-in user
    currentPage: string; // The name of the page currently being viewed
    isMenuOpen: boolean; // Whether the mobile menu is open
    isSidebarCollapsed: boolean; // Whether the desktop sidebar is small (collapsed)
    toggleMenu: () => void; // Function to open/close mobile menu
    setIsSidebarCollapsed: (isCollapsed: boolean) => void; // Function to shrink/expand desktop sidebar
    handleSetCurrentPage: (page: string, data?: any) => void; // Function to change the page
    handleSignOut: () => void; // Function to log out
    hideSidebar?: boolean; // Optional: Hide sidebar on specific pages (like profile setup)
    isAdmin?: boolean; // Optional: Check if user is an admin
    globalLoading?: boolean; // Optional: Show global loading indicator
    userProfile?: any; // Optional: Extended profile data (name, company, etc.)
}

// Component for the Side Menu (Desktop Navigation)
const SideMenu: FC<Omit<MainLayoutProps, 'children' | 'pageKey'>> = (
    { currentPage, isMenuOpen, isSidebarCollapsed, toggleMenu, setIsSidebarCollapsed, handleSetCurrentPage, handleSignOut, isAdmin, user, userProfile }
) => {
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const { notifications } = useNotifications();
    const unreadByPage: Record<string, number> = {
        myQuotes:  notifications.filter(n => n.category === 'rfq' && !n.isRead).length,
        crm:       notifications.filter(n => n.category === 'crm' && !n.isRead).length,
        adminRFQ:  notifications.filter(n => n.category === 'rfq' && !n.isRead).length,
        adminCRM:  notifications.filter(n => n.category === 'crm' && !n.isRead).length,
    };
    const avatarUrl: string = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
    const displayName: string = userProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
    const displayEmail: string = user?.email || '';
    const companyName: string = userProfile?.companyName || '';
    const initials: string = displayName.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
    // List of menu items for regular users (Clients)
    const clientMenuItems = [
        { name: 'Sourcing', page: 'sourcing', icon: <Search className="h-5 w-5" /> },
        { name: 'My Quotes', page: 'myQuotes', icon: <FileQuestion className="h-5 w-5" /> },
        { name: 'CRM Portal', page: 'crm', icon: <List className="h-5 w-5" /> },
        { name: 'Order Tracking', page: 'tracking', icon: <Truck className="h-5 w-5" /> },
        { name: 'Billing', page: 'billing', icon: <DollarSign className="h-5 w-5" /> },
        { name: 'Place Order', page: 'orderForm', icon: <Plus className="h-5 w-5" /> },
        { name: 'Settings', page: 'settings', icon: <Settings className="h-5 w-5" /> },
        { name: "What's Trending", page: 'trending', icon: <Flame className="h-5 w-5" /> },
    ];

    // List of menu items for Admin users
    const adminMenuItems = [
        { name: 'Dashboard', page: 'adminDashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
        { name: 'User Management', page: 'adminUsers', icon: <Users className="h-5 w-5" /> },
        { name: 'Factory CMS', page: 'adminFactories', icon: <Building className="h-5 w-5" /> },
        { name: 'CRM Manager', page: 'adminCRM', icon: <List className="h-5 w-5" /> },
        { name: 'RFQ Requests', page: 'adminRFQ', icon: <FileQuestion className="h-5 w-5" /> },
        { name: 'Trending CMS', page: 'adminTrending', icon: <Flame className="h-5 w-5" /> },
        { name: 'Login Images', page: 'adminLoginSettings', icon: <ImageIcon className="h-5 w-5" /> },
        { name: 'Settings', page: 'settings', icon: <Settings className="h-5 w-5" /> },
    ];

    // Choose which menu to show based on user role
    const menuItems = isAdmin ? adminMenuItems : clientMenuItems;

    return (<>
        {/* Overlay background when mobile menu is open */}
        {isMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={toggleMenu}></div>}
        
        {/* The Sidebar Container */}
        <aside className={`fixed inset-y-0 left-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-r border-gray-200/50 dark:border-gray-700/50 text-gray-800 dark:text-white flex flex-col shadow-lg z-50 transition-all duration-300 ease-in-out ${isMenuOpen ? 'w-64' : '-translate-x-full w-64'} md:translate-x-0 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}>
            
            {/* Sidebar Header (Logo and Toggle Buttons) */}
            <div className={`flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 ${isSidebarCollapsed ? 'md:justify-center' : ''}`}>
                {!isSidebarCollapsed && <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Auctave</h1>}
                {/* Mobile Close Button */}
                <button onClick={toggleMenu} className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 md:hidden">
                    <X className="w-6 h-6"/>
                </button>
                {/* Desktop Collapse Button */}
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:block p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-200">
                    {isSidebarCollapsed ? <ChevronsRight className="w-6 h-6"/> : <ChevronsLeft className="w-6 h-6"/>}
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map(item => {
                    const badge = unreadByPage[item.page] || 0;
                    const isActive = currentPage === item.page;
                    return (
                        <button key={item.name} onClick={() => { handleSetCurrentPage(item.page); if (isMenuOpen) toggleMenu(); }} className={`w-full text-left p-3 rounded-md font-medium flex items-center transition duration-150 ease-in-out ${isSidebarCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} title={isSidebarCollapsed ? item.name : ''}>
                            <div className={`relative flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`}>
                                {item.icon}
                                {badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-[var(--color-primary)] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
                                        {badge > 9 ? '9+' : badge}
                                    </span>
                                )}
                            </div>
                            {!isSidebarCollapsed && <span className="flex-1">{item.name}</span>}
                            {!isSidebarCollapsed && badge > 0 && (
                                <span className={`ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                                    {badge > 9 ? '9+' : badge}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Notification Bell — nav-style button */}
                <NotificationBellButton
                    onClick={() => setIsNotifOpen(true)}
                    isSidebarCollapsed={isSidebarCollapsed}
                />
            </nav>

            {/* Global Notification Panel */}
            <NotificationPanel
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                onNavigate={(page, data) => { handleSetCurrentPage(page, data); if (isMenuOpen) toggleMenu(); setIsNotifOpen(false); }}
            />

            {/* ── User Profile Card ── */}
            {user && (
                <div className={`px-3 pb-2 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
                    <button
                        onClick={() => { handleSetCurrentPage('profile'); if (isMenuOpen) toggleMenu(); }}
                        className={`w-full text-left rounded-xl border border-gray-200/70 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all group ${isSidebarCollapsed ? 'w-11 h-11 flex items-center justify-center p-0' : 'p-3'}`}
                        title={isSidebarCollapsed ? displayName : ''}
                    >
                        {isSidebarCollapsed ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center border border-red-500/30 flex-shrink-0">
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-white font-bold text-xs leading-none">{initials}</span>}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center border-2 border-red-500/25">
                                        {avatarUrl
                                            ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                            : <span className="text-white font-bold text-sm leading-none">{initials}</span>}
                                    </div>
                                    {/* Edit dot */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--color-primary)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white dark:border-gray-900">
                                        <UserIcon size={7} color="white" strokeWidth={3} />
                                    </div>
                                </div>
                                {/* Text */}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-snug">{displayName}</p>
                                    {companyName
                                        ? <p className="text-[10px] font-medium text-[var(--color-primary)] truncate leading-snug">{companyName}</p>
                                        : <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-snug">{displayEmail}</p>}
                                </div>
                                {/* Arrow hint */}
                                <UserIcon size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-[var(--color-primary)] transition-colors" />
                            </div>
                        )}
                    </button>
                </div>
            )}

            {/* Logout Button at the bottom */}
            <div className={`p-3 pt-0 border-t border-gray-200/50 dark:border-gray-700/50 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
                <button onClick={() => { handleSignOut(); if (isMenuOpen) toggleMenu(); }} className={`w-full text-left p-3 rounded-md font-medium hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center transition duration-150 ease-in-out text-red-600 dark:text-red-400 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Logout' : ''}>
                    <div className={isSidebarCollapsed ? '' : 'mr-3'}><LogOut className="h-5 w-5"/></div>
                    {!isSidebarCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    </>);
};

// Component for Bottom Navigation Bar (Mobile Only)
const BottomNavBar: FC<{ currentPage: string; handleSetCurrentPage: (page: string) => void; }> = ({ currentPage, handleSetCurrentPage }) => {
    // Items to show on the bottom bar
    const navItems = [
      { name: 'Sourcing', page: 'sourcing', icon: <Search /> },
      { name: 'My Quotes', page: 'myQuotes', icon: <FileQuestion /> },
      { name: 'Orders', page: 'crm', icon: <List /> },
      { name: 'Billing', page: 'billing', icon: <DollarSign /> },
      { name: 'Trending', page: 'trending', icon: <Flame /> },
    ];
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 md:hidden z-40">
          {/* The white bar container */}
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
          {/* Floating Action Button (FAB) for new orders */}
          <button onClick={() => handleSetCurrentPage('orderForm')} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white shadow-lg transform transition-transform hover:scale-110">
              <Plus size={32}/>
          </button>
      </div>
    );
}

// The Main Layout Wrapper Component
export const MainLayout: FC<MainLayoutProps> = (props) => (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white font-inter transition-colors duration-200 relative">
        {/* Spotify-like Accent Gradient for Dark Mode */}
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-[#450a0a]/60 via-[var(--color-primary)]/10 to-transparent pointer-events-none z-0 dark:block hidden animate-gradient-slow" />

        {props.globalLoading && (
            <div className="fixed top-0 left-0 right-0 h-1 z-[100] bg-red-100 dark:bg-red-900 overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] animate-progress-indeterminate"></div>
            </div>
        )}
        {/* Show Sidebar on Desktop if user is logged in and sidebar isn't hidden */}
        {props.user && !props.hideSidebar && (
            <>
                <SideMenu {...props} />
                {/* Spacer to push main content right of the fixed sidebar */}
                <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${props.isSidebarCollapsed ? 'w-20' : 'w-64'}`} />
            </>
        )}
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
            <div key={props.pageKey} className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 animate-fade-in">
                {props.children}
            </div>
        </main>
        
        {/* Show Bottom Nav on Mobile if user is logged in and sidebar isn't hidden */}
        {props.user && !props.hideSidebar && <BottomNavBar currentPage={props.currentPage} handleSetCurrentPage={props.handleSetCurrentPage} />}
    </div>
);