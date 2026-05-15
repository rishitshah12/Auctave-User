import React, { useState, useEffect } from 'react';
import { X, ChevronDown, CheckCircle2, Play, Map } from 'lucide-react';
import { useWalkthrough } from '../WalkthroughContext';
import { ALL_TOURS } from '../tours';

// Lucide icons per tour (no emoji)
const TOUR_ICONS: Record<string, React.ReactNode> = {
  'platform-overview': <Map size={16} />,
  'find-factory':      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  'submit-rfq':        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  'review-quotes':     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  'track-production':  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
};

export const ChecklistWidget: React.FC = () => {
  const { state, startTour, isTourComplete, completionPct, dismissChecklist } = useWalkthrough();
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (state.dismissedChecklist) return null;

  const bg = isDark ? 'rgba(10,5,16,0.97)' : 'rgba(255,255,255,0.98)';
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
  const text = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const rowHover = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const completedCount = state.completedTours.length;
  const total = ALL_TOURS.length;

  if (collapsed) {
    return (
      <div className="zushi-checklist-pill" style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 9990 }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: isDark
              ? 'linear-gradient(135deg, #6b0504, #350e4a)'
              : 'linear-gradient(135deg, #c20c0b, #350e4a)',
            border: 'none',
            borderRadius: 99,
            padding: '10px 18px',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            color: '#fff',
          }}
        >
          <svg width={22} height={22} viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
            <circle cx={11} cy={11} r={9} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
            <circle
              cx={11} cy={11} r={9}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeDasharray={`${56.5 * completedCount / total} 56.5`}
              strokeLinecap="round"
              transform="rotate(-90 11 11)"
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          </svg>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>
            {completedCount < total ? 'Get started' : 'All tours done'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="zushi-checklist"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 20,
        width: 328,
        zIndex: 9990,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Header gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #c20c0b 0%, #350e4a 100%)',
        padding: '16px 16px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>
              Get started with ZUSHI
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5, marginTop: 2 }}>
              {completedCount} of {total} tours complete
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setCollapsed(true)}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}
            >
              <ChevronDown size={15} />
            </button>
            <button
              onClick={dismissChecklist}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: 12,
          height: 5,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 99,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(completedCount / total) * 100}%`,
            background: '#fff',
            borderRadius: 99,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Tour list */}
      <div style={{ padding: '6px 0' }}>
        {ALL_TOURS.map((tour) => {
          const done = isTourComplete(tour.id);
          return (
            <button
              key={tour.id}
              onClick={() => !done && startTour(tour.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 16px',
                background: 'none',
                border: 'none',
                cursor: done ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { if (!done) (e.currentTarget as HTMLElement).style.background = rowHover; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done
                  ? (isDark ? 'rgba(21,128,61,0.14)' : 'rgba(21,128,61,0.08)')
                  : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                color: done ? '#15803d' : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'),
              }}>
                {TOUR_ICONS[tour.id] || <Play size={14} />}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: done ? (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)') : text,
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {tour.title}
                </div>
                <div style={{ fontSize: 12.5, color: sub, marginTop: 1 }}>
                  {done ? 'Completed' : tour.duration}
                </div>
              </div>

              {/* Status */}
              <div style={{ flexShrink: 0 }}>
                {done ? (
                  <CheckCircle2 size={18} color="#15803d" />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #c20c0b, #350e4a)',
                    color: '#fff',
                  }}>
                    <Play size={12} style={{ marginLeft: 1 }} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${border}`,
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: sub }}>Press Esc anytime to pause</span>
        <button
          onClick={dismissChecklist}
          style={{
            fontSize: 12, fontWeight: 600,
            color: sub,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0,
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
