import React, { FC } from 'react';
import { MainLayout } from './MainLayout';

interface BillingPageProps {
    layoutProps: any;
}

export const BillingPage: FC<BillingPageProps> = ({ layoutProps }) => {
    const billingData = [
        { id: 'ESC-001', orderId: 'PO-2024-001', product: '5000 Classic Tees', totalAmount: 21250, amountReleased: 10625, amountHeld: 10625, status: 'Partially Paid' },
        { id: 'ESC-002', orderId: 'PO-2024-002', product: '10000 Hoodies', totalAmount: 120000, amountReleased: 60000, amountHeld: 60000, status: 'Awaiting Milestone' },
        { id: 'ESC-003', orderId: 'PO-2024-003', product: '2500 Jackets', totalAmount: 45000, amountReleased: 0, amountHeld: 45000, status: 'Funded' },
    ];

    const totalHeld = billingData.reduce((acc, item) => acc + item.amountHeld, 0);
    const totalReleased = billingData.reduce((acc, item) => acc + item.amountReleased, 0);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Partially Paid': return 'bg-blue-100 text-blue-800';
            case 'Awaiting Milestone': return 'bg-yellow-100 text-yellow-800';
            case 'Funded': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <MainLayout {...layoutProps}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Billing & Escrow</h1>
                    <p className="text-gray-500 dark:text-gray-200 mt-1">Manage and track your order payments.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10">
                      <h3 className="text-sm font-medium text-gray-500">Total in Escrow</h3>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">${totalHeld.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10">
                      <h3 className="text-sm font-medium text-gray-500">Total Released</h3>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">${totalReleased.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md p-6 rounded-xl shadow-md border border-gray-200 dark:border-white/10">
                      <h3 className="text-sm font-medium text-gray-500">Next Payout</h3>
                      <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">$10,625</p>
                      <p className="text-xs text-gray-400">on July 12, 2025 for PO-2024-001</p>
                  </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md dark:bg-gray-900/40 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                {['Order ID', 'Product', 'Total Value', 'Amount Released', 'Amount in Escrow', 'Status', ''].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-gray-200 dark:divide-gray-700">
                            {billingData.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-primary)] hover:underline cursor-pointer">{item.orderId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">{item.product}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">${item.totalAmount.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">${item.amountReleased.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white font-bold">${item.amountHeld.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">View Details</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainLayout>
    );
};
