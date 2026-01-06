import React, { FC, ReactNode } from 'react';
import {
    Search, DollarSign, Plus, ChevronLeft, ChevronsLeft, ChevronsRight,
    Menu, X, List, Truck, User as UserIcon, LogOut, Settings, Flame, FileQuestion
} from 'lucide-react';

interface MainLayoutProps {
    children: ReactNode;
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string) => void;
    handleSignOut: () => void;
    hideSidebar?: boolean;
}

const SideMenu: FC<Omit<MainLayoutProps, 'children' | 'pageKey'>> = (
    { currentPage, isMenuOpen, isSidebarCollapsed, toggleMenu, setIsSidebarCollapsed, handleSetCurrentPage, handleSignOut }
) => {
    const menuItems = [
        { name: 'Sourcing', page: 'sourcing', icon: <Search className="h-5 w-5" /> },
        { name: 'My Quotes', page: 'myQuotes', icon: <FileQuestion className="h-5 w-5" /> },
        { name: 'CRM Portal', page: 'crm', icon: <List className="h-5 w-5" /> },
        { name: 'Order Tracking', page: 'tracking', icon: <Truck className="h-5 w-5" /> },
        { name: 'Billing', page: 'billing', icon: <DollarSign className="h-5 w-5" /> },
        { name: 'Place Order', page: 'orderForm', icon: <Plus className="h-5 w-5" /> },
        { name: 'Profile', page: 'profile', icon: <UserIcon className="h-5 w-5" /> },
        { name: 'Settings', page: 'settings', icon: <Settings className="h-5 w-5" /> },
        { name: "What's Trending", page: 'trending', icon: <Flame className="h-5 w-5" /> },
    ];
    return (<>
        {isMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={toggleMenu}></div>}
        <aside className={`fixed inset-y-0 left-0 bg-gray-900 text-white flex flex-col shadow-lg z-50 transition-all duration-300 ease-in-out md:relative ${isMenuOpen ? 'w-64' : '-translate-x-full w-64'} md:translate-x-0 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}>
            <div className={`flex items-center justify-between p-4 border-b border-gray-700 ${isSidebarCollapsed ? 'md:justify-center' : ''}`}>
                {!isSidebarCollapsed && <h1 className="text-2xl font-bold text-white">Auctave</h1>}
                <button onClick={toggleMenu} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white md:hidden">
                    <X className="w-6 h-6"/>
                </button>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:block p-2 rounded-md hover:bg-gray-700 text-white">
                    {isSidebarCollapsed ? <ChevronsRight className="w-6 h-6"/> : <ChevronsLeft className="w-6 h-6"/>}
                </button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map(item => (
                    <button key={item.name} onClick={() => { handleSetCurrentPage(item.page); if (isMenuOpen) toggleMenu(); }} className={`w-full text-left p-3 rounded-md font-medium flex items-center transition duration-150 ease-in-out ${isSidebarCollapsed ? 'justify-center' : ''} ${currentPage === item.page ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`} title={isSidebarCollapsed ? item.name : ''}>
                        <div className={isSidebarCollapsed ? '' : 'mr-3'}>{item.icon}</div>
                        {!isSidebarCollapsed && <span>{item.name}</span>}
                    </button>
                ))}
            </nav>
            <div className={`p-4 border-t border-gray-700 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
                <button onClick={() => { handleSignOut(); if (isMenuOpen) toggleMenu(); }} className={`w-full text-left p-3 rounded-md font-medium hover:bg-red-700 flex items-center transition duration-150 ease-in-out text-red-300 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Logout' : ''}>
                    <div className={isSidebarCollapsed ? '' : 'mr-3'}><LogOut className="h-5 w-5"/></div>
                    {!isSidebarCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    </>);
};

const BottomNavBar: FC<{ currentPage: string; handleSetCurrentPage: (page: string) => void; }> = ({ currentPage, handleSetCurrentPage }) => {
    const navItems = [
      { name: 'Sourcing', page: 'sourcing', icon: <Search /> },
      { name: 'My Quotes', page: 'myQuotes', icon: <FileQuestion /> },
      { name: 'Orders', page: 'crm', icon: <List /> },
      { name: 'Billing', page: 'billing', icon: <DollarSign /> },
      { name: 'Trending', page: 'trending', icon: <Flame /> },
    ];
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 md:hidden z-40">
          <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] h-16">
              <div className="flex justify-around items-center h-full">
                  {navItems.map(item => (
                      <button key={item.name} onClick={() => handleSetCurrentPage(item.page)} className={`flex flex-col items-center justify-center space-y-1 w-1/5 ${currentPage === item.page ? 'text-purple-600' : 'text-gray-500'}`}>
                          {item.icon}
                          <span className="text-xs font-medium">{item.name}</span>
                      </button>
                  ))}
              </div>
          </div>
          <button onClick={() => handleSetCurrentPage('orderForm')} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg transform transition-transform hover:scale-110">
              <Plus size={32}/>
          </button>
      </div>
    );
}

export const MainLayout: FC<MainLayoutProps> = (props) => (
    <div className="flex min-h-screen bg-white font-inter">
        {props.user && !props.hideSidebar && <div className="hidden md:flex"><SideMenu {...props} /></div>}
        <main className="flex-1 flex flex-col overflow-hidden">
            <div key={props.pageKey} className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 animate-fade-in">
                {props.children}
            </div>
        </main>
        {props.user && !props.hideSidebar && <BottomNavBar currentPage={props.currentPage} handleSetCurrentPage={props.handleSetCurrentPage} />}
    </div>
);