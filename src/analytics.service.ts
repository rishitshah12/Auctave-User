import { supabase } from './supabaseClient';

export type AnalyticsEventType =
  | 'page_view'
  | 'page_exit'
  | 'search'
  | 'factory_view'
  | 'factory_hover'
  | 'category_select'
  | 'filter_apply'
  | 'rfq_submit'
  | 'quote_view';

export interface AnalyticsEventData {
  page?: string;
  query?: string;
  result_count?: number;
  factory_id?: string;
  factory_name?: string;
  factory_location?: string;
  factory_trust_tier?: string;
  filters?: Record<string, any>;
  category?: string;
  quote_id?: string;
  [key: string]: any;
}

class AnalyticsService {
  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    let id = sessionStorage.getItem('_as_sid');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('_as_sid', id);
    }
    return id;
  }

  track(eventType: AnalyticsEventType, eventData: AnalyticsEventData = {}): void {
    // Fire and forget — never blocks the UI.
    // getSession() reads from localStorage (no network call), unlike getUser() which hits the server.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      Promise.resolve(
        supabase
          .from('user_events')
          .insert({
            user_id: session.user.id,
            event_type: eventType,
            event_data: eventData,
            session_id: this.sessionId,
          })
      ).then(() => {}).catch(() => {});
    }).catch(() => {});
  }
}

export const analyticsService = new AnalyticsService();
