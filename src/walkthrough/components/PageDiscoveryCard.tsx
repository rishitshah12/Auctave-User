import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import { useWalkthrough } from '../WalkthroughContext';

interface PageConfig {
  emoji: string;
  title: string;
  body: string;
  tourId?: string;
  tourLabel?: string;
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  sourcing: {
    emoji: '🔍',
    title: 'Sourcing — Find your manufacturing partner',
    body: 'Browse 500+ verified factories by category, MOQ, lead time, and certifications. Use filters to narrow down or search by product type.',
    tourId: 'find-factory',
    tourLabel: 'Tour this page',
  },
  myQuotes: {
    emoji: '💬',
    title: 'My Quotes — All your RFQs in one place',
    body: 'Every quote request you submit appears here. Track status, review factory responses, negotiate pricing, and accept quotes to create production orders.',
    tourId: 'review-quotes',
    tourLabel: 'Tour this page',
  },
  crm: {
    emoji: '📊',
    title: 'CRM Portal — Real-time production visibility',
    body: 'Monitor every active order through the full production lifecycle. The TNA view shows milestones, risk flags, and responsible parties at a glance.',
    tourId: 'track-production',
    tourLabel: 'Show me around',
  },
  tracking: {
    emoji: '🚢',
    title: 'Tracking — Live shipment status',
    body: 'Once your goods are dispatched, track them here by container number or shipment ID. See vessel name, port updates, and estimated arrival.',
  },
  orderForm: {
    emoji: '📋',
    title: 'Place Order — Start an RFQ',
    body: 'Define your product specifications — category, fabric, quantity, and attach your tech pack. We\'ll route your RFQ to matching verified factories.',
    tourId: 'submit-rfq',
    tourLabel: 'Take the RFQ tour',
  },
};

interface PageDiscoveryCardProps {
  page: string;
}

export const PageDiscoveryCard: React.FC<PageDiscoveryCardProps> = ({ page }) => {
  const { isPageVisited, markPageVisited, startTour, state } = useWalkthrough();
  const [isDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [dismissed, setDismissed] = useState(false);

  const config = PAGE_CONFIGS[page];
  if (!config) return null;
  if (isPageVisited(page) || dismissed) return null;
  if (state.dismissedChecklist) return null;

  const dismiss = () => {
    setDismissed(true);
    markPageVisited(page);
  };

  const handleTour = () => {
    dismiss();
    if (config.tourId) startTour(config.tourId);
  };

  const bg = isDark ? 'rgba(12,6,18,0.92)' : 'rgba(255,255,255,0.95)';
  const border = isDark ? 'rgba(194,12,11,0.25)' : 'rgba(194,12,11,0.15)';
  const text = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: '3px solid #c20c0b',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 20,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.4)'
          : '0 4px 24px rgba(0,0,0,0.08)',
        animation: 'tour-fade-in 0.3s ease',
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{config.emoji}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 4 }}>
          {config.title}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: sub }}>
          {config.body}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 1 }}>
        {config.tourId && (
          <button
            onClick={handleTour}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11.5,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg, #c20c0b, #350e4a)',
              whiteSpace: 'nowrap',
            }}
          >
            <Play size={10} style={{ marginLeft: 1 }} />
            {config.tourLabel || 'Tour'}
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            width: 24, height: 24, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            border: 'none', cursor: 'pointer',
            color: sub,
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
