import { supabase } from './supabaseClient';

export type AnalyticsEventType =
  | 'page_view'
  | 'page_exit'
  | 'search'
  | 'catalog_search'
  | 'factory_view'
  | 'factory_hover'
  | 'category_select'
  | 'filter_apply'
  | 'rfq_submit'
  | 'quote_view'
  | 'catalog_view'
  | 'catalog_exit'
  | 'catalog_item_select'
  | 'trending_blog_view'
  | 'trending_video_play'
  | 'crm_tab_view'
  | 'crm_order_view';

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
  item_id?: string;
  item_name?: string;
  item_category?: string;
  duration_ms?: number;
  [key: string]: any;
}

interface GeoData {
  country: string;
  country_name: string;
  city: string;
  latitude: number;
  longitude: number;
}

class AnalyticsService {
  private sessionId: string;
  private deviceType: string;
  private geoData: GeoData | null = null;
  private geoReady: Promise<void>;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.deviceType = this.detectDeviceType();
    this.geoReady = this.initGeo();
  }

  private getOrCreateSessionId(): string {
    let id = sessionStorage.getItem('_as_sid');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('_as_sid', id);
    }
    return id;
  }

  private detectDeviceType(): string {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/ipad|iphone|ipod/i.test(ua)) return 'ios';
    return 'desktop';
  }

  private async initGeo(): Promise<void> {
    try {
      const cached = sessionStorage.getItem('_as_geo');
      if (cached) {
        this.geoData = JSON.parse(cached);
        return;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return;
      const data = await res.json();
      if (data.error) return;
      this.geoData = {
        country: data.country_code || '',
        country_name: data.country_name || '',
        city: data.city || '',
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
      };
      sessionStorage.setItem('_as_geo', JSON.stringify(this.geoData));
    } catch {
      // geo is optional — silently skip on network errors or rate limits
    }
  }

  track(eventType: AnalyticsEventType, eventData: AnalyticsEventData = {}): void {
    // Wait for geo lookup (resolves instantly if cached or failed), then fire-and-forget.
    this.geoReady.then(() => {
      Promise.resolve(supabase.auth.getSession()).then(({ data: { session } }) => {
        if (!session?.user) return;
        const enriched: AnalyticsEventData = {
          device_type: this.deviceType,
          user_agent: navigator.userAgent,
          ...(this.geoData
            ? {
                country: this.geoData.country,
                country_name: this.geoData.country_name,
                city: this.geoData.city,
                latitude: this.geoData.latitude,
                longitude: this.geoData.longitude,
              }
            : {}),
          ...eventData,
        };
        Promise.resolve(
          supabase
            .from('user_events')
            .insert({
              user_id: session.user.id,
              event_type: eventType,
              event_data: enriched,
              session_id: this.sessionId,
            })
        ).then(() => {}).catch(() => {});
      }).catch(() => {});
    });
  }
}

export const analyticsService = new AnalyticsService();
