import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Package, FileText, DollarSign, ArrowRight } from 'lucide-react';
import { useWalkthrough } from '../WalkthroughContext';

interface WelcomeModalProps {
  userName?: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ userName }) => {
  const { state, dismissWelcomeModal, startTour } = useWalkthrough();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!state.showWelcomeModal) return null;

  const bg = isDark ? '#0a0512' : '#ffffff';
  const text = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const pillBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';

  const handleStartTour = () => {
    setLeaving(true);
    setTimeout(() => {
      dismissWelcomeModal();
      startTour('platform-overview');
    }, 280);
  };

  const handleExplore = () => {
    setLeaving(true);
    setTimeout(dismissWelcomeModal, 280);
  };

  const firstName = userName?.split(' ')[0] || 'there';

  const features = [
    { icon: <Package size={14} />, label: 'Factory Sourcing' },
    { icon: <FileText size={14} />, label: 'RFQ Management' },
    { icon: <Globe size={14} />, label: 'Production Tracking' },
    { icon: <DollarSign size={14} />, label: 'Trade Finance' },
  ];

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '20px 16px',
        paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom) + 20px))',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.28s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: bg,
          borderRadius: 24,
          border: `1px solid ${border}`,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          transform: leaving ? 'scale(0.95) translateY(16px)' : 'scale(1)',
          transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Gradient header */}
        <div style={{
          background: 'linear-gradient(135deg, #c20c0b 0%, #350e4a 100%)',
          padding: '36px 32px 30px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute',
            top: -40, right: -40, width: 140, height: 140,
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -24, left: -24, width: 90, height: 90,
            borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
          }} />

          {/* Globe icon */}
          <div style={{
            width: 56, height: 56,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#fff',
            backdropFilter: 'blur(8px)',
          }}>
            <Globe size={28} />
          </div>

          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            Welcome to ZUSHI,<br />{firstName}
          </h1>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 32px 28px' }}>
          <p style={{
            margin: '0 0 20px',
            fontSize: 15,
            lineHeight: 1.65,
            color: sub,
            textAlign: 'center',
          }}>
            You're now connected to a global supply chain of <strong style={{ color: text }}>500+ verified factories</strong> across 32 countries — covering sourcing, manufacturing, trade finance, and shipment tracking.
          </p>

          {/* Feature pills */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 24,
          }}>
            {features.map(f => (
              <span key={f.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px',
                borderRadius: 99,
                background: pillBg,
                border: `1px solid ${border}`,
                fontSize: 12.5,
                fontWeight: 600,
                color: text,
              }}>
                {f.icon}
                {f.label}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleStartTour}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                background: 'linear-gradient(135deg, #c20c0b, #350e4a)',
                boxShadow: '0 6px 20px rgba(194,12,11,0.4)',
              }}
            >
              Take the 3-minute tour <ArrowRight size={16} />
            </button>
            <button
              onClick={handleExplore}
              style={{
                padding: '13px 20px',
                borderRadius: 12,
                border: `1px solid ${border}`,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: sub,
                background: 'none',
              }}
            >
              I'll explore on my own
            </button>
          </div>

          <p style={{ margin: '16px 0 0', fontSize: 12, color: sub, textAlign: 'center' }}>
            Find all guided tours anytime in Settings → Help Center
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
