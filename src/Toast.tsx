import React, { FC } from 'react';
import { CheckCircle } from 'lucide-react';

export const Toast: FC<{ message: string; type: 'success' | 'error'; show: boolean }> = ({ message, type, show }) => (
    <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white transition-transform duration-300 ${show ? 'translate-x-0' : 'translate-x-[110%]'} ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} style={{ zIndex: 1000 }}>
        <div className="flex items-center"><CheckCircle className="mr-2"/> {message}</div>
    </div>
);