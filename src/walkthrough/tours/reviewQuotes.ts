import type { Tour } from './types';

export const reviewQuotesTour: Tour = {
  id: 'review-quotes',
  title: 'Review & Accept a Quote',
  description: 'Evaluate factory responses, negotiate, and place your order',
  duration: '3 min',
  icon: '💬',
  steps: [
    {
      id: 'intro',
      title: 'Your quote is in',
      body: 'When a factory responds to your RFQ, you\'ll get a notification. This tour shows you how to evaluate the quote, negotiate if needed, and accept to create a production order.',
      placement: 'center',
    },
    {
      id: 'quotes-list',
      target: 'quotes-list',
      title: 'All your quote requests in one place',
      body: 'This page shows every RFQ you\'ve submitted with their current status: Pending, Quoted, Negotiating, or Accepted. Color coding shows urgency.',
      placement: 'right',
      highlightPadding: 8,
      navigateTo: 'myQuotes',
    },
    {
      id: 'quote-card',
      target: 'quote-card-first',
      title: 'Open a quote to review it',
      body: 'Click any quote to see the factory\'s full response: unit pricing, payment terms, lead time, sample cost, and any notes from the factory.',
      placement: 'right',
      highlightPadding: 10,
      allowInteraction: true,
      action: {
        label: 'Click on a quote to open it',
      },
    },
    {
      id: 'quote-negotiation',
      target: 'quote-negotiation',
      title: 'Negotiate directly',
      body: 'Not happy with the pricing or terms? Use the negotiation panel to counter-offer. All back-and-forth is logged with timestamps so nothing gets lost.',
      placement: 'left',
      highlightPadding: 8,
      tip: 'ZUSHI\'s AI assistant can suggest a counter-offer based on market rates',
    },
  ],
};
