import React, { FC, ReactNode } from 'react';

export const AiCard: FC<{ icon: ReactNode; title: string; children: ReactNode }> = React.memo(({ icon, title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full flex flex-col">
        <div className="flex items-center text-xl font-bold text-gray-800 mb-4">{icon}{title}</div>
        {children}
    </div>
));