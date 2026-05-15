export { platformOverviewTour } from './platformOverview';
export { findFactoryTour } from './findFactory';
export { submitRFQTour } from './submitRFQ';
export { reviewQuotesTour } from './reviewQuotes';
export { trackProductionTour } from './trackProduction';
export type { Tour, TourStep } from './types';

import { platformOverviewTour } from './platformOverview';
import { findFactoryTour } from './findFactory';
import { submitRFQTour } from './submitRFQ';
import { reviewQuotesTour } from './reviewQuotes';
import { trackProductionTour } from './trackProduction';

export const ALL_TOURS = [
  platformOverviewTour,
  findFactoryTour,
  submitRFQTour,
  reviewQuotesTour,
  trackProductionTour,
];
