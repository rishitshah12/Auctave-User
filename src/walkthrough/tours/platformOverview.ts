import type { Tour } from './types';

export const platformOverviewTour: Tour = {
  id: 'platform-overview',
  title: 'Platform Overview',
  description: 'Get oriented with ZUSHI\'s core navigation in 3 minutes',
  duration: '3 min',
  icon: '🌍',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to ZUSHI',
      body: 'You\'re now connected to a global supply chain of verified factories across 32 countries. This quick tour shows you the 5 key areas of the platform.',
      placement: 'center',
      tip: 'You can exit this tour anytime by pressing Escape',
    },
    {
      id: 'sidebar-nav',
      target: 'sidebar-nav',
      title: 'Your command center',
      body: 'This sidebar is your main navigation. Every workflow — from sourcing factories to tracking shipments — starts here.',
      placement: 'right',
      highlightPadding: 6,
    },
    {
      id: 'nav-sourcing',
      target: 'nav-sourcing',
      title: 'Find verified factories',
      body: 'The Sourcing page connects you to hundreds of pre-vetted manufacturers. Filter by category, MOQ, lead time, and certifications.',
      placement: 'right',
      highlightPadding: 8,
    },
    {
      id: 'nav-myquotes',
      target: 'nav-myquotes',
      title: 'Track your RFQs',
      body: 'Once you submit a quote request to a factory, it appears here. You can negotiate pricing, review samples, and approve quotes.',
      placement: 'right',
      highlightPadding: 8,
    },
    {
      id: 'nav-crm',
      target: 'nav-crm',
      title: 'Monitor your production',
      body: 'The CRM Portal gives you real-time visibility into your orders — from fabric sourcing through to shipment. No more chasing factories over email.',
      placement: 'right',
      highlightPadding: 8,
      tip: 'The TNA view shows you every production milestone with risk flagging',
    },
  ],
};
