import React, { useState } from 'react';
import { X, ChevronUp, ChevronDown, CheckCircle2, Circle, Play } from 'lucide-react';
import { useWalkthrough } from '../WalkthroughContext';
import { ALL_TOURS } from '../tours';

export const ChecklistWidget: React.FC = () => {
  const { state, startTour, isTourComplete, completionPct, dismissChecklist } = useWalkthrough();
  const [collapsed, setCollapsed] = useState(false);
  const [isDark] = useState(() => document.documentElement.classList.contains('dark'));

  if (state.dismissedChecklist) return null;

  const bg = isDark ? 'rgba(12,6,18,0.97)' : 'rgba(255,255,255,0.97)';
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const text = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const rowHover = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const completedPct = state.completedTours.length;
  const total = ALL_TOURS.length;

  if (collapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 96,
          right: 20,
          zIndex: 9990,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: isDark
              ? 'linear-gradient(135deg, #6b0504, #350e4a)'
              : 'linear-gradient(135deg, #c20c0b, #350e4a)',
            border: 'none',
            borderRadius: 99,
            padding: '10px 16px',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            color: '#fff',
          }}
        >
          {/* Mini progress ring */}
          <svg width={22} height={22} viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
            <circle cx={11} cy={11} r={9} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
            <circle
              cx={11} cy={11} r={9}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeDasharray={`${56.5 * completionPct / total} 56.5`}
              strokeLinecap="round"
              transform="rotate(-90 11 11)"
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
            <text x={11} y={15} textAnchor="middle" fontSize={7} fontWeight={700} fill="#fff">
              {completedPct}/{total}
            </text>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Get started</span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 96,
        right: 20,
        width: 320,
        zIndex: 9990,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Header gradient bar */}
      <div style={{
        background: 'linear-gradient(135deg, #c20c0b 0%, #350e4a 100%)',
        padding: '14px 16px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em' }}>
              🚀 Get started with ZUSHI
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5, marginTop: 2 }}>
              {completedPct} of {total} tours complete
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setCollapsed(true)}
              style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}
            >
              <ChevronDown size={14} />
            </button>
            <button
              onClick={dismissChecklist}
              style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: 10,
          height: 5,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 99,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${completionPct}%`,
            background: '#fff',
            borderRadius: 99,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Tour list */}
      <div style={{ padding: '8px 0' }}>
        {ALL_TOURS.map((tour, i) => {
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
                padding: '10px 16px',
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
                fontSize: 17,
                background: done
                  ? (isDark ? 'rgba(21,128,61,0.15)' : 'rgba(21,128,61,0.08)')
                  : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
              }}>
                {tour.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: done ? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)') : text,
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {tour.title}
                </div>
                <div style={{ fontSize: 11.5, color: sub, marginTop: 1 }}>
                  {tour.duration}
                </div>
              </div>

              {/* Status icon */}
              <div style={{ flexShrink: 0 }}>
                {done ? (
                  <CheckCircle2 size={18} color="#15803d" />
                ) : (
                  <div style={{
                    width: 26, height: 26, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #c20c0b, #350e4a)',
                    color: '#fff',
                  }}>
                    <Play size={11} style={{ marginLeft: 1 }} />
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
        <span style={{ fontSize: 11.5, color: sub }}>Press Esc anytime to pause</span>
        <button
          onClick={dismissChecklist}
          style={{
            fontSize: 11.5, fontWeight: 600,
            color: sub,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0,
          }}
        >
          Skip all
        </button>
      </div>
    </div>
  );
};
