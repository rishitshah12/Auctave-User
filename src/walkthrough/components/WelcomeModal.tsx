import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWalkthrough } from '../WalkthroughContext';

interface WelcomeModalProps {
  userName?: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ userName }) => {
  const { state, dismissWelcomeModal, startTour } = useWalkthrough();
  const [isDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [leaving, setLeaving] = useState(false);

  if (!state.showWelcomeModal) return null;

  const bg = isDark ? '#0a0512' : '#ffffff';
  const text = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

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

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 20,
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
          padding: '32px 32px 28px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative orbs */}
          <div style={{
            position: 'absolute',
            top: -30, right: -30, width: 120, height: 120,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -20, left: -20, width: 80, height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }} />

          <div style={{
            fontSize: 44,
            marginBottom: 12,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
          }}>
            🌍
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
            fontSize: 14.5,
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
            {['🏭 Factory Sourcing', '📋 RFQ Management', '📦 Production Tracking', '💰 Trade Finance'].map(f => (
              <span key={f} style={{
                padding: '5px 12px',
                borderRadius: 99,
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${border}`,
                fontSize: 12,
                fontWeight: 600,
                color: text,
              }}>
                {f}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleStartTour}
              style={{
                padding: '13px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14.5,
                fontWeight: 700,
                color: '#fff',
                background: 'linear-gradient(135deg, #c20c0b, #350e4a)',
                boxShadow: '0 6px 20px rgba(194,12,11,0.4)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(194,12,11,0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(194,12,11,0.4)';
              }}
            >
              🚀 Take the 3-minute tour
            </button>
            <button
              onClick={handleExplore}
              style={{
                padding: '12px 20px',
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

          <p style={{ margin: '16px 0 0', fontSize: 11.5, color: sub, textAlign: 'center' }}>
            Your guided checklist is always available in the bottom-right corner
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
