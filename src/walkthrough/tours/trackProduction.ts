import type { Tour } from './types';

export const trackProductionTour: Tour = {
  id: 'track-production',
  title: 'Track Your Production',
  description: 'Monitor every milestone from fabric to shipment',
  duration: '3 min',
  icon: '📦',
  steps: [
    {
      id: 'intro',
      title: 'Your order is in production',
      body: 'ZUSHI gives you real-time visibility into every stage of your order. No more uncertainty — you\'ll know exactly where your goods are at every step.',
      placement: 'center',
    },
    {
      id: 'crm-order-list',
      target: 'crm-order-list',
      title: 'All active orders at a glance',
      body: 'The CRM Portal lists every live order with its current stage, risk level, and next milestone. Red flags appear automatically when tasks fall behind schedule.',
      placement: 'right',
      highlightPadding: 8,
      navigateTo: 'crm',
    },
    {
      id: 'crm-tna-view',
      target: 'crm-tna-btn',
      title: 'Time & Action (TNA) timeline',
      body: 'The TNA view shows your complete production timeline — Fabric Sourcing, Cutting, Sewing, QC, Shipment — with planned vs actual dates and responsible parties.',
      placement: 'bottom',
      highlightPadding: 8,
      tip: 'Tasks highlighted in red are at risk of delaying your delivery date',
    },
    {
      id: 'tracking-nav',
      target: 'nav-tracking',
      title: 'Track your shipment',
      body: 'Once goods are dispatched, the Tracking page gives you live shipment status — container number, vessel name, ETA, and port updates.',
      placement: 'right',
      highlightPadding: 8,
    },
  ],
};
