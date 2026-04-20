import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { notificationService } from './notificationService';
import type { AppNotification, NotificationCategory } from './notificationService';

// Re-export types so existing imports from this file keep working
export type { AppNotification, NotificationCategory };

// ─── Context contract ─────────────────────────────────────────────────────────

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notif: Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    requestPushPermission: () => Promise<NotificationPermission>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        // Subscribe to the service singleton — gets called whenever the cache changes
        const unsub = notificationService.subscribe(setNotifications);
        return unsub;
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const addNotification = useCallback(
        (notif: Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>) => {
            notificationService.add(notif);
        },
        [],
    );

    const markAsRead = useCallback((id: string) => {
        notificationService.markRead(id);
    }, []);

    const markAllAsRead = useCallback(() => {
        notificationService.markAllRead();
    }, []);

    const removeNotification = useCallback((id: string) => {
        notificationService.remove(id);
    }, []);

    const clearAll = useCallback(() => {
        notificationService.clearAll();
    }, []);

    const requestPushPermission = useCallback(async () => {
        const perm = await notificationService.requestPermission();
        return perm;
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            removeNotification,
            clearAll,
            requestPushPermission,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
