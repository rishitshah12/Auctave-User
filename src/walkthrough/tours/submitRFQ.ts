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
      body: 'An RFQ (Request for Quotation) is how you officially ask a factory for pricing. The more detail you provide, the more accurate the quote. Let\'s walk through the form.',
      placement: 'center',
    },
    {
      // Target exists on form step 1 — always in DOM when orderForm page loads
      id: 'order-form-categories',
      target: 'order-form-categories',
      title: 'Choose your product category',
      body: 'Start by selecting what you\'re making — T-shirts, denim, activewear, and more. Each category unlocks relevant fabric and style options on the next steps.',
      placement: 'bottom',
      highlightPadding: 10,
      navigateTo: 'orderForm',
    },
    {
      // order-form-qty lives on step 2 of the form which isn't rendered at step 1.
      // No target — show as a centered explanatory step instead.
      id: 'order-form-qty',
      title: 'Set your order quantity',
      body: 'On the next form step you\'ll enter your target quantity — either as individual units or by container (20ft / 40ft). ZUSHI flags factories whose MOQ matches your order.',
      placement: 'center',
    },
    {
      // order-form-files lives on step 3 — not rendered at step 1.
      id: 'order-form-files',
      title: 'Attach your tech pack',
      body: 'You can upload your design files, tech pack, or reference images so the factory can quote accurately. PDF, AI, and image files are all supported.',
      placement: 'center',
      tip: 'No tech pack yet? Our AI assistant can help generate basic spec sheets from your description.',
    },
    {
      // Submit button is only rendered on form step 5 — not in DOM at step 1.
      id: 'order-submit',
      title: 'Send it off',
      body: 'Once you\'ve filled in all the details, hit Submit. The factory receives your RFQ instantly and you\'ll get a notification with their quote — typically within 24–48 hours.',
      placement: 'center',
    },
  ],
};
