import React, { useState, useEffect } from 'react';
import { X, Play, Search, MessageSquare, BarChart2, Truck, ClipboardList } from 'lucide-react';
import { useWalkthrough } from '../WalkthroughContext';

interface PageConfig {
  icon: React.ReactNode;
  title: string;
  body: string;
  tourId?: string;
  tourLabel?: string;
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  sourcing: {
    icon: <Search size={18} />,
    title: 'Sourcing — Find your manufacturing partner',
    body: 'Browse verified factories by category, MOQ, lead time, and certifications.',
    tourId: 'find-factory',
    tourLabel: 'Tour this page',
  },
  myQuotes: {
    icon: <MessageSquare size={18} />,
    title: 'My Quotes — All your RFQs in one place',
    body: 'Track status, review factory responses, negotiate pricing, and accept quotes.',
    tourId: 'review-quotes',
    tourLabel: 'Tour this page',
  },
  crm: {
    icon: <BarChart2 size={18} />,
    title: 'CRM Portal — Real-time production visibility',
    body: 'Monitor every active order. The TNA view shows milestones and risk flags.',
    tourId: 'track-production',
    tourLabel: 'Show me around',
  },
  tracking: {
    icon: <Truck size={18} />,
    title: 'Tracking — Live shipment status',
    body: 'Track shipments by container number. See vessel name, port updates, and ETA.',
  },
  orderForm: {
    icon: <ClipboardList size={18} />,
    title: 'Place Order — Start an RFQ',
    body: 'Define product specs, quantity, and attach your tech pack to request quotes.',
    tourId: 'submit-rfq',
    tourLabel: 'Take the RFQ tour',
  },
};

export const PageDiscoveryCard: React.FC<{ page: string }> = ({ page }) => {
  const { isPageVisited, markPageVisited, startTour } = useWalkthrough();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const config = PAGE_CONFIGS[page];
  if (!config || isPageVisited(page) || dismissed) return null;

  const dismiss = () => { setDismissed(true); markPageVisited(page); };
  const handleTour = () => { dismiss(); if (config.tourId) startTour(config.tourId); };

  const bg      = isDark ? 'rgba(14,7,22,0.95)' : '#ffffff';
  const border  = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(194,12,11,0.12)';
  const text    = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub     = isDark ? 'rgba(255,255,255,0.58)' : 'rgba(0,0,0,0.5)';
  const iconBg  = isDark ? 'rgba(194,12,11,0.15)' : 'rgba(194,12,11,0.08)';

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: '3px solid #c20c0b',
        borderRadius: 14,
        padding: isMobile ? '14px 14px 16px' : '14px 16px',
        marginBottom: 20,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.45)' : '0 2px 16px rgba(0,0,0,0.07)',
        animation: 'tour-fade-in 0.3s ease',
      }}
    >
      {/* Top row: icon + title + X */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0, borderRadius: 9,
          background: iconBg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#c20c0b',
        }}>
          {config.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: text, lineHeight: 1.35 }}>
            {config.title}
          </div>
        </div>

        <button
          onClick={dismiss}
          style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            border: 'none', cursor: 'pointer', color: sub,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body text */}
      <div style={{ fontSize: 13, lineHeight: 1.6, color: sub, paddingLeft: 48, marginBottom: config.tourId ? 12 : 0 }}>
        {config.body}
      </div>

      {/* Tour button — full-width on mobile, inline on desktop */}
      {config.tourId && (
        <div style={{ paddingLeft: 48 }}>
          <button
            onClick={handleTour}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: isMobile ? '9px 16px' : '7px 14px',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'center' : 'flex-start',
              borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg, #c20c0b, #350e4a)',
              boxShadow: '0 3px 12px rgba(194,12,11,0.3)',
            }}
          >
            <Play size={12} style={{ marginLeft: 1 }} />
            {config.tourLabel || 'Tour this page'}
          </button>
        </div>
      )}
    </div>
  );
};
