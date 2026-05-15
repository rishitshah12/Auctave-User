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
      // quotes-list data-tour-id is on the loading skeleton grid — always in DOM on myQuotes page
      id: 'quotes-list',
      target: 'quotes-list',
      title: 'All your quote requests in one place',
      body: 'Every RFQ you\'ve submitted appears here with its current status: Pending, Quoted, Negotiating, or Accepted. Color coding shows which ones need your attention first.',
      placement: 'right',
      highlightPadding: 8,
      navigateTo: 'myQuotes',
    },
    {
      // quote-card-first is the first rendered card — in DOM if any quotes exist
      id: 'quote-card',
      target: 'quote-card-first',
      title: 'Open a quote to review it',
      body: 'Tap any quote card to see the factory\'s full response: unit pricing, payment terms, lead time, sample cost, and notes. All history is preserved.',
      placement: 'right',
      highlightPadding: 10,
      allowInteraction: true,
      action: {
        label: 'Tap on a quote card to open it',
      },
    },
    {
      // quote-negotiation lives inside QuoteDetailPage which requires clicking into a quote first.
      // That interaction was covered in the previous step — this step explains what they'll find.
      id: 'quote-negotiation',
      title: 'Negotiate directly inside the quote',
      body: 'Inside the quote detail you\'ll see the full offer. If the price or terms aren\'t right, use the negotiation panel to counter-offer. Every message is timestamped and logged.',
      placement: 'center',
      tip: 'The AI assistant can suggest a counter-offer based on current market rates.',
    },
  ],
};
