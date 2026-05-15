import type { Tour } from './types';

export const submitRFQTour: Tour = {
  id: 'submit-rfq',
  title: 'Submit Your First RFQ',
  description: 'Send a detailed quote request to a factory in minutes',
  duration: '4 min',
  icon: '📋',
  steps: [
    {
      id: 'intro',
      title: 'How RFQs work on ZUSHI',
      body: 'An RFQ (Request for Quotation) is how you officially ask a factory for pricing. The more detail you provide, the more accurate the quote. Let\'s walk through it.',
      placement: 'center',
    },
    {
      id: 'order-form-categories',
      target: 'order-form-categories',
      title: 'Define your product',
      body: 'Start by selecting your product category. Then add details: fabric type, weight (GSM), quantity, and any style specifications or tech pack references.',
      placement: 'right',
      highlightPadding: 10,
      navigateTo: 'orderForm',
    },
    {
      id: 'order-form-qty',
      target: 'order-form-qty',
      title: 'Set your order quantity',
      body: 'Enter your target quantity — either as individual units or by container (20ft / 40ft). ZUSHI will automatically flag factories whose MOQ matches your order size.',
      placement: 'bottom',
      highlightPadding: 8,
    },
    {
      id: 'order-form-files',
      target: 'order-form-files',
      title: 'Attach your tech pack',
      body: 'Upload your design files, tech pack, or reference images. Factories use these to give you an accurate quote. PDF, AI, and image files are all supported.',
      placement: 'bottom',
      highlightPadding: 8,
      tip: 'No tech pack yet? Our AI assistant can help generate basic spec sheets from your description',
    },
    {
      id: 'order-submit',
      target: 'order-submit-btn',
      title: 'Send it off',
      body: 'Once submitted, the factory receives your RFQ instantly. You\'ll get a notification when they respond — typically within 24–48 hours.',
      placement: 'top',
      highlightPadding: 10,
    },
  ],
};
