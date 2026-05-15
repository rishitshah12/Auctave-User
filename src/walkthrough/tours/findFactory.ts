import type { Tour } from './types';

export const findFactoryTour: Tour = {
  id: 'find-factory',
  title: 'Find a Factory',
  description: 'Search and evaluate verified manufacturers for your product',
  duration: '4 min',
  icon: '🏭',
  steps: [
    {
      id: 'intro',
      title: 'Let\'s find your perfect factory',
      body: 'ZUSHI\'s sourcing engine lets you search 500+ verified manufacturers. We\'ll show you how to find, evaluate, and contact the right factory for your product.',
      placement: 'center',
    },
    {
      id: 'sourcing-search',
      target: 'sourcing-search',
      title: 'Search by product or factory',
      body: 'Type a product category (e.g. "polo shirts"), fabric type, or factory name. Results update instantly with matching manufacturers.',
      placement: 'bottom',
      highlightPadding: 10,
      navigateTo: 'sourcing',
      tip: 'Try searching "activewear" or "denim" to see category-specific factories',
    },
    {
      id: 'sourcing-filters',
      target: 'sourcing-filters',
      title: 'Narrow down with smart filters',
      body: 'Filter factories by product category, country, minimum order quantity, lead time, and certifications like GOTS or BSCI.',
      placement: 'bottom',
      highlightPadding: 8,
    },
    {
      id: 'factory-card',
      target: 'factory-card-first',
      title: 'Evaluate at a glance',
      body: 'Each factory card shows you verified capacity, average lead time, MOQ, certifications, and ratings from other buyers.',
      placement: 'right',
      highlightPadding: 10,
    },
    {
      id: 'factory-card-action',
      target: 'factory-card-first',
      title: 'Open the factory profile',
      body: 'Click on a factory to see their full profile — product catalog, machinery, compliance documents, sample photos, and verified buyer reviews.',
      placement: 'right',
      highlightPadding: 10,
      allowInteraction: true,
      action: {
        label: 'Click on a factory card to view its profile',
      },
    },
    {
      id: 'rfq-button',
      target: 'factory-rfq-btn',
      title: 'Request a Quote',
      body: 'Found the right factory? Hit "Request Quote" to send them your product specifications. They\'ll respond within 24–48 hours with pricing and lead time.',
      placement: 'bottom',
      highlightPadding: 10,
      tip: 'You can request quotes from multiple factories simultaneously to compare pricing',
    },
  ],
};
