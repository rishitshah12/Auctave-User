export interface TourStep {
  id: string;
  target?: string;           // [data-tour-id] value; undefined = centered modal
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  allowInteraction?: boolean; // lets user click highlighted element
  highlightPadding?: number;
  action?: {
    label: string;            // "Your turn: click the Search button"
    waitForTarget?: string;   // advance when this target appears in DOM
    waitForNavigation?: string; // route path to wait for
  };
  tip?: string;               // small contextual tip shown below body
  navigateTo?: string;        // navigate to this path before showing step
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: string;              // emoji
  steps: TourStep[];
}
