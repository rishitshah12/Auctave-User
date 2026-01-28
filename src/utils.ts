export const formatFriendlyDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (isToday) return `Today at ${timeStr}`;
    if (isYesterday) return `Yesterday at ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'Draft': return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 border-dashed';
        case 'Pending': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800';
        case 'Responded': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800';
        case 'Accepted': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
        case 'Declined': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800';
        case 'In Negotiation': return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800';
        case 'Admin Accepted': return 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-800';
        case 'Client Accepted': return 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800';
        case 'Trashed': return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
        default: return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700';
    }
};

export const getStatusGradientBorder = (status: string) => {
    switch (status) {
        case 'Draft': return 'from-gray-300 to-gray-100';
        case 'Pending': return 'from-amber-300 to-yellow-200';
        case 'Responded': return 'from-blue-400 to-cyan-300';
        case 'Accepted': return 'from-emerald-600 to-emerald-300';
        case 'Declined': return 'from-red-500 to-pink-400';
        case 'In Negotiation': return 'from-purple-500 to-indigo-300';
        case 'Admin Accepted': return 'from-teal-500 to-teal-300';
        case 'Client Accepted': return 'from-cyan-500 to-cyan-300';
        default: return 'from-gray-400 to-gray-200';
    }
};

export const getStatusHoverShadow = (status: string) => {
    switch (status) {
        case 'Draft': return 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]';
        case 'Pending': return 'hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]';
        case 'Responded': return 'hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]';
        case 'Accepted': return 'hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]';
        case 'Declined': return 'hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]';
        case 'In Negotiation': return 'hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]';
        case 'Admin Accepted': return 'hover:shadow-[0_8px_30px_rgba(20,184,166,0.15)]';
        case 'Client Accepted': return 'hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)]';
        default: return 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]';
    }
};

export const getStatusGradient = (status: string) => {
    switch (status) {
        case 'Pending': return 'from-amber-400 to-yellow-300';
        case 'Responded': return 'from-blue-500 to-cyan-400';
        case 'Accepted': return 'from-emerald-500 to-green-400';
        case 'Declined': return 'from-red-500 to-pink-500';
        case 'In Negotiation': return 'from-purple-500 to-indigo-400';
        case 'Admin Accepted': return 'from-teal-500 to-teal-400';
        case 'Client Accepted': return 'from-cyan-500 to-cyan-400';
        default: return 'from-gray-400 to-gray-300';
    }
};