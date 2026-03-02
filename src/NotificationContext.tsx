import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type NotificationCategory = 'rfq' | 'crm' | 'order' | 'system';

export interface AppNotification {
    id: string;
    category: NotificationCategory;
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    /** Optional image (e.g. factory logo) shown instead of the category icon */
    imageUrl?: string;
    /** Short detail line shown as a pill, e.g. "$4.20/unit · 14d lead time" */
    meta?: string;
    action?: {
        page: string;
        data?: any;
    };
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notif: Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'garment_erp_notifications';
const MAX_NOTIFICATIONS = 50;

export const useNotifications = (): NotificationContextType => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
        } catch {}
    }, [notifications]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>) => {
        const newNotif: AppNotification = {
            ...notif,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            isRead: false,
            timestamp: new Date().toISOString(),
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};
