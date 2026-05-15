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
    body: 'Browse verified factories by category, MOQ, lead time, and certifications. Use filters to narrow down or search by product type.',
    tourId: 'find-factory',
    tourLabel: 'Tour this page',
  },
  myQuotes: {
    icon: <MessageSquare size={18} />,
    title: 'My Quotes — All your RFQs in one place',
    body: 'Every quote request you submit appears here. Track status, review factory responses, negotiate pricing, and accept quotes to create production orders.',
    tourId: 'review-quotes',
    tourLabel: 'Tour this page',
  },
  crm: {
    icon: <BarChart2 size={18} />,
    title: 'CRM Portal — Real-time production visibility',
    body: 'Monitor every active order through the full production lifecycle. The TNA view shows milestones, risk flags, and responsible parties at a glance.',
    tourId: 'track-production',
    tourLabel: 'Show me around',
  },
  tracking: {
    icon: <Truck size={18} />,
    title: 'Tracking — Live shipment status',
    body: 'Once your goods are dispatched, track them here by container number or shipment ID. See vessel name, port updates, and estimated arrival.',
  },
  orderForm: {
    icon: <ClipboardList size={18} />,
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
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  const bg = isDark ? 'rgba(14,7,22,0.94)' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(194,12,11,0.12)';
  const text = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.52)';
  const iconBg = isDark ? 'rgba(194,12,11,0.15)' : 'rgba(194,12,11,0.08)';

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
        gap: 13,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.45)'
          : '0 2px 16px rgba(0,0,0,0.07)',
        animation: 'tour-fade-in 0.3s ease',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 36, height: 36, flexShrink: 0, borderRadius: 9,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#c20c0b',
        marginTop: 1,
      }}>
        {config.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 5, lineHeight: 1.3 }}>
          {config.title}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: sub }}>
          {config.body}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 1 }}>
        {config.tourId && (
          <button
            onClick={handleTour}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg, #c20c0b, #350e4a)',
              whiteSpace: 'nowrap',
            }}
          >
            <Play size={11} style={{ marginLeft: 1 }} />
            {config.tourLabel || 'Tour'}
          </button>
        )}
        <button
          onClick={dismiss}
          style={{
            width: 26, height: 26, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            border: 'none', cursor: 'pointer',
            color: sub,
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
