import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from './Toast';
import { ToastState } from './types';

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Toast {...toast} />
        </ToastContext.Provider>
    );
};