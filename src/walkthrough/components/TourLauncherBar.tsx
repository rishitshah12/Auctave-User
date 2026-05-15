import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, CheckCircle2, RotateCcw, Map, Building, FileText, MessageSquare, Truck, Play } from 'lucide-react';
import { useWalkthrough } from '../WalkthroughContext';
import { ALL_TOURS } from '../tours';

const TOUR_ICONS: Record<string, React.ReactNode> = {
  'platform-overview': <Map size={16} />,
  'find-factory':      <Building size={16} />,
  'submit-rfq':        <FileText size={16} />,
  'review-quotes':     <MessageSquare size={16} />,
  'track-production':  <Truck size={16} />,
};

export const TourLauncherBar: React.FC = () => {
  const {
    state, startTour, isTourComplete, resetTours, resetOneTour,
    dismissTourBar, activeTour,
  } = useWalkthrough();

  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Close panel when a tour starts
  useEffect(() => {
    if (activeTour) setOpen(false);
  }, [activeTour]);

  if (state.tourBarDismissed) return null;

  const completedCount = state.completedTours.length;
  const total = ALL_TOURS.length;
  const pct = Math.round((completedCount / total) * 100);
  const allDone = completedCount === total;

  const bg     = isDark ? 'rgba(14,7,22,0.95)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const text   = isDark ? '#f0e8f4' : '#0f0a1a';
  const sub    = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const rowHov = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const divider= isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const handleStart = (tourId: string, done: boolean) => {
    if (done) resetOneTour(tourId);
    setTimeout(() => startTour(tourId), done ? 50 : 0);
    setOpen(false);
  };

  return (
    <div
      style={{
        marginBottom: 20,
        borderRadius: 14,
        overflow: 'hidden',
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.4)'
          : '0 2px 16px rgba(0,0,0,0.07)',
        animation: 'tour-fade-in 0.3s ease',
      }}
    >
      {/* ── Bar row ─────────────────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Left accent strip */}
        <div style={{
          width: 4, height: 36, borderRadius: 99, flexShrink: 0,
          background: allDone
            ? 'linear-gradient(180deg,#059669,#047857)'
            : 'linear-gradient(180deg,#c20c0b,#7c3aed)',
        }} />

        {/* Progress ring */}
        <svg width={36} height={36} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
          <circle cx={18} cy={18} r={14} fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} strokeWidth={3} />
          <circle cx={18} cy={18} r={14} fill="none"
            stroke="url(#barGrad)" strokeWidth={3} strokeLinecap="round"
            strokeDasharray={`${87.96 * pct / 100} 87.96`}
            transform="rotate(-90 18 18)"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
          <defs>
            <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c20c0b" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <text x={18} y={22} textAnchor="middle" fontSize={10} fontWeight={800}
            fill={isDark ? '#f0e8f4' : '#0f0a1a'}>
            {pct}%
          </text>
        </svg>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: text, lineHeight: 1.25 }}>
            {allDone ? 'All tours complete!' : 'Platform Guided Tour'}
          </div>
          <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>
            {allDone
              ? 'You\'ve explored everything — click to replay any tour'
              : `${completedCount} of ${total} tours completed · click to explore`}
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ color: sub }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          <button
            onClick={e => { e.stopPropagation(); dismissTourBar(); }}
            style={{
              width: 26, height: 26, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
              border: 'none', cursor: 'pointer', color: sub,
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Expandable panel ────────────────────────────────────────────── */}
      {open && (
        <div style={{ borderTop: `1px solid ${divider}` }}>
          {ALL_TOURS.map((tour, idx) => {
            const done = isTourComplete(tour.id);
            return (
              <div
                key={tour.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px',
                  borderBottom: idx < ALL_TOURS.length - 1 ? `1px solid ${divider}` : 'none',
                  background: 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = rowHov)}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done
                    ? isDark ? 'rgba(5,150,105,0.15)' : 'rgba(5,150,105,0.1)'
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: done ? '#059669' : sub,
                }}>
                  {TOUR_ICONS[tour.id] ?? <Play size={14} />}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13.5, fontWeight: 700, lineHeight: 1.25,
                    color: done ? (isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.32)') : text,
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {tour.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: sub, marginTop: 2 }}>
                    {done ? 'Completed' : tour.duration}
                  </div>
                </div>

                {/* Action button */}
                {done ? (
                  <button
                    onClick={() => handleStart(tour.id, true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 11px', borderRadius: 8,
                      border: `1px solid ${divider}`,
                      background: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, color: sub,
                      flexShrink: 0,
                    }}
                  >
                    <RotateCcw size={11} /> Redo
                  </button>
                ) : (
                  <button
                    onClick={() => handleStart(tour.id, false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 13px', borderRadius: 8,
                      border: 'none', cursor: 'pointer',
                      fontSize: 12.5, fontWeight: 700, color: '#fff',
                      background: 'linear-gradient(135deg,#c20c0b,#7c3aed)',
                      boxShadow: '0 2px 10px rgba(194,12,11,0.3)',
                      flexShrink: 0,
                    }}
                  >
                    <Play size={11} style={{ marginLeft: 1 }} /> Start
                  </button>
                )}
              </div>
            );
          })}

          {/* Reset footer */}
          <div style={{
            padding: '10px 14px',
            borderTop: `1px solid ${divider}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: sub }}>
              {completedCount > 0 ? `${completedCount} of ${total} tours done` : 'Start your first tour above'}
            </span>
            {completedCount > 0 && (
              <button
                onClick={() => { resetTours(); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600,
                  color: isDark ? 'rgba(255,100,100,0.7)' : '#b91c1c',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <RotateCcw size={11} /> Reset all progress
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
