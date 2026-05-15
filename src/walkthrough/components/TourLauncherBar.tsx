import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, RotateCcw, Map, Building, FileText, MessageSquare, Truck, Play } from 'lucide-react';
import { useWalkthrough } from '../WalkthroughContext';
import { ALL_TOURS } from '../tours';

const TOUR_ICONS: Record<string, React.ReactNode> = {
  'platform-overview': <Map size={15} />,
  'find-factory':      <Building size={15} />,
  'submit-rfq':        <FileText size={15} />,
  'review-quotes':     <MessageSquare size={15} />,
  'track-production':  <Truck size={15} />,
};

const BRAND = 'linear-gradient(135deg, #c20c0b, #350e4a)';
const BRAND_H = 'linear-gradient(180deg, #c20c0b, #350e4a)';
const BRAND_90 = 'linear-gradient(90deg, #c20c0b, #350e4a)';

export const TourLauncherBar: React.FC = () => {
  const { state, startTour, isTourComplete, resetTours, resetOneTour, dismissTourBar, activeTour } = useWalkthrough();

  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (activeTour) setOpen(false); }, [activeTour]);

  if (state.tourBarDismissed) return null;

  const completedCount = state.completedTours.length;
  const total = ALL_TOURS.length;
  const pct = Math.round((completedCount / total) * 100);
  const allDone = completedCount === total;

  const bg      = isDark ? 'rgba(14,7,22,0.96)' : '#ffffff';
  const border  = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const text    = isDark ? '#f0e8f4' : '#0f0a1a';
  const sub     = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const rowHov  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const handleStart = (tourId: string, done: boolean) => {
    if (done) resetOneTour(tourId);
    setTimeout(() => startTour(tourId), done ? 60 : 0);
    setOpen(false);
  };

  return (
    <div style={{
      marginBottom: 20, borderRadius: 14, overflow: 'hidden',
      background: bg, border: `1px solid ${border}`,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.07)',
      animation: 'tour-fade-in 0.3s ease',
    }}>

      {/* ── Bar row ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12, padding: isMobile ? '11px 12px' : '13px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        {/* Left accent */}
        <div style={{ width: 4, height: 32, borderRadius: 99, flexShrink: 0, background: allDone ? 'linear-gradient(180deg,#059669,#047857)' : BRAND_H }} />

        {/* Progress ring — hidden on mobile to save space */}
        {!isMobile && (
          <svg width={36} height={36} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
            <circle cx={18} cy={18} r={14} fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} strokeWidth={3} />
            <circle cx={18} cy={18} r={14} fill="none" stroke="url(#tlGrad)" strokeWidth={3} strokeLinecap="round"
              strokeDasharray={`${87.96 * pct / 100} 87.96`} transform="rotate(-90 18 18)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            <defs>
              <linearGradient id="tlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c20c0b" /><stop offset="100%" stopColor="#350e4a" />
              </linearGradient>
            </defs>
            <text x={18} y={22} textAnchor="middle" fontSize={10} fontWeight={800} fill={isDark ? '#f0e8f4' : '#0f0a1a'}>{pct}%</text>
          </svg>
        )}

        {/* Mobile: compact progress bar */}
        {isMobile && (
          <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10,
            background: isDark ? 'rgba(194,12,11,0.15)' : 'rgba(194,12,11,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#c20c0b' }}>
            {pct}%
          </div>
        )}

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 700, color: text, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {allDone ? 'All tours complete!' : 'Platform Guided Tour'}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: sub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isMobile
              ? `${completedCount}/${total} done • tap to explore`
              : allDone ? 'Click to replay any tour' : `${completedCount} of ${total} completed · click to explore`}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ color: sub }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          <button
            onClick={e => { e.stopPropagation(); dismissTourBar(); }}
            style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: sub }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Mobile: thin progress bar below the row */}
      {isMobile && (
        <div style={{ height: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: BRAND_90, transition: 'width 0.5s ease' }} />
        </div>
      )}

      {/* ── Expandable panel ── */}
      {open && (
        <div style={{ borderTop: `1px solid ${divider}` }}>
          {ALL_TOURS.map((tour, idx) => {
            const done = isTourComplete(tour.id);
            return (
              <div key={tour.id}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: isMobile ? '10px 12px' : '11px 16px', borderBottom: idx < ALL_TOURS.length - 1 ? `1px solid ${divider}` : 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = rowHov)}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? (isDark ? 'rgba(5,150,105,0.15)' : 'rgba(5,150,105,0.1)') : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'), color: done ? '#059669' : sub }}>
                  {TOUR_ICONS[tour.id] ?? <Play size={13} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 700, lineHeight: 1.25, color: done ? (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)') : text, textDecoration: done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tour.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: sub, marginTop: 1 }}>{done ? 'Completed' : tour.duration}</div>
                </div>

                {done ? (
                  <button onClick={() => handleStart(tour.id, true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: `1px solid ${divider}`, background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: sub, flexShrink: 0 }}>
                    <RotateCcw size={11} /> {isMobile ? '' : 'Redo'}
                  </button>
                ) : (
                  <button onClick={() => handleStart(tour.id, false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '6px 12px' : '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#fff', background: BRAND, boxShadow: '0 2px 10px rgba(194,12,11,0.3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <Play size={11} style={{ marginLeft: 1 }} /> Start
                  </button>
                )}
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ padding: isMobile ? '9px 12px' : '10px 16px', borderTop: `1px solid ${divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: sub }}>{completedCount > 0 ? `${completedCount} of ${total} done` : 'Start your first tour above'}</span>
            {completedCount > 0 && (
              <button onClick={() => { resetTours(); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(255,100,100,0.7)' : '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <RotateCcw size={11} /> Reset all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
