import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ArrowRight, CheckCircle2, Lightbulb, MousePointerClick } from 'lucide-react';
import type { TourStep, Tour } from '../tours';

interface TourTooltipProps {
  step: TourStep;
  tour: Tour;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
  onComplete: () => void;
}

function getVisibleRect(tourId: string): DOMRect | null {
  const els = Array.from(document.querySelectorAll(`[data-tour-id="${tourId}"]`));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) continue;
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
    return r;
  }
  return null;
}

function computePosition(
  targetId: string | undefined,
  placement: TourStep['placement'],
  tooltipW: number,
  tooltipH: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!targetId || placement === 'center') {
    return { top: vh / 2 - tooltipH / 2, left: vw / 2 - tooltipW / 2 };
  }

  const rect = getVisibleRect(targetId);
  if (!rect) return { top: vh / 2 - tooltipH / 2, left: vw / 2 - tooltipW / 2 };

  const GAP = 20;
  let top = 0, left = 0;

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + GAP;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - GAP;
      break;
    case 'bottom':
      top = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    default:
      top = rect.top - tooltipH - GAP;
      left = rect.left + rect.width / 2 - tooltipW / 2;
  }

  const M = 16;
  top = Math.max(M, Math.min(top, vh - tooltipH - M));
  left = Math.max(M, Math.min(left, vw - tooltipW - M));
  return { top, left };
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  step, tour, stepIndex, onNext, onPrev, onExit, onComplete,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [animKey, setAnimKey] = useState(0);

  const isLast = stepIndex === tour.steps.length - 1;
  const isFirst = stepIndex === 0;
  const total = tour.steps.length;
  const stepNumber = stepIndex + 1;

  const reposition = () => {
    if (!ref.current || isMobile) return;
    const p = computePosition(step.target, step.placement, ref.current.offsetWidth, ref.current.offsetHeight);
    setPos(p);
  };

  useLayoutEffect(() => {
    reposition();
    setAnimKey(k => k + 1);
  }, [step.id, isMobile]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) reposition();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [step.id]);

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const bg         = isDark ? 'rgba(11,5,20,0.98)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const heading    = isDark ? '#f5eeff' : '#0f0a1a';
  const body       = isDark ? 'rgba(240,232,255,0.62)' : 'rgba(15,10,26,0.58)';
  const dotDone    = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
  const dotFuture  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  // Mobile: fixed to bottom above the bottom nav using JS (no CSS class dependency)
  const mobileStyle: React.CSSProperties = {
    bottom: 'calc(env(safe-area-inset-bottom) + 92px)',
    left: 12,
    right: 12,
    top: 'auto',
    width: 'auto',
    maxWidth: 'none',
    borderRadius: 20,
  };

  const desktopStyle: React.CSSProperties = {
    top: pos.top,
    left: pos.left,
    width: 440,
    maxWidth: 480,
    borderRadius: 22,
  };

  return (
    <div
      ref={ref}
      key={animKey}
      style={{
        position: 'fixed',
        zIndex: 9999,
        background: bg,
        border: `1px solid ${cardBorder}`,
        boxShadow: isDark
          ? '0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.7), 0 8px 32px rgba(0,0,0,0.4)'
          : '0 0 0 1px rgba(0,0,0,0.04), 0 40px 100px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.09)',
        overflow: 'hidden',
        animation: 'zushi-card-in 0.32s cubic-bezier(0.22,1,0.36,1) both',
        transition: isMobile ? 'none' : 'top 0.26s cubic-bezier(0.22,1,0.36,1), left 0.26s cubic-bezier(0.22,1,0.36,1)',
        ...(isMobile ? mobileStyle : desktopStyle),
      }}
    >
      {/* Gradient accent bar */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #c20c0b 0%, #7c3aed 60%, #2563eb 100%)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'inherit', filter: 'blur(6px)', opacity: 0.6 }} />
      </div>

      <div style={{ padding: isMobile ? '18px 18px 20px' : '24px 28px 26px' }}>

        {/* Tour label + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #c20c0b, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {tour.title}
          </span>
          <button
            onClick={onExit}
            style={{
              width: 30, height: 30, borderRadius: 9,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${cardBorder}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: body, flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 10px',
          fontSize: isMobile ? 19 : 22,
          fontWeight: 800, color: heading, lineHeight: 1.25, letterSpacing: '-0.02em',
        }}>
          {step.title}
        </h3>

        {/* Body */}
        <p style={{ margin: '0 0 16px', fontSize: isMobile ? 14 : 15, lineHeight: 1.7, color: body }}>
          {step.body}
        </p>

        {/* Action prompt */}
        {step.action && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.05)',
            border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.15)'}`,
            borderLeft: '3px solid #2563eb', borderRadius: '0 10px 10px 0',
            padding: '10px 13px', marginBottom: 12,
          }}>
            <MousePointerClick size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13.5, color: isDark ? '#93c5fd' : '#1d4ed8', fontWeight: 500, lineHeight: 1.5 }}>
              {step.action.label}
            </span>
          </div>
        )}

        {/* Tip */}
        {step.tip && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)',
            border: `1px solid ${isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)'}`,
            borderLeft: '3px solid #7c3aed', borderRadius: '0 10px 10px 0',
            padding: '10px 13px', marginBottom: 12,
          }}>
            <Lightbulb size={14} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13.5, color: isDark ? '#c4b5fd' : '#5b21b6', fontWeight: 500, lineHeight: 1.5 }}>
              {step.tip}
            </span>
          </div>
        )}

        {/* Footer: dots + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, gap: 12 }}>

          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {tour.steps.map((_, i) => {
              const isCurrent = i === stepIndex;
              const isDone = i < stepIndex;
              return (
                <div key={i} style={{
                  height: 7,
                  width: isCurrent ? 22 : 7,
                  borderRadius: 99,
                  background: isCurrent ? 'linear-gradient(90deg,#c20c0b,#7c3aed)' : isDone ? dotDone : dotFuture,
                  transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s ease',
                }} />
              );
            })}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!isFirst && (
              <button
                onClick={onPrev}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '8px 14px', borderRadius: 10,
                  border: `1px solid ${cardBorder}`,
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  color: body, background: 'none',
                }}
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}

            <button
              onClick={isLast ? onComplete : onNext}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: isMobile ? '9px 18px' : '10px 22px',
                borderRadius: 11, border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#fff',
                whiteSpace: 'nowrap',
                background: isLast
                  ? 'linear-gradient(135deg,#059669,#047857)'
                  : 'linear-gradient(135deg,#c20c0b 0%,#7c3aed 100%)',
                boxShadow: isLast
                  ? '0 4px 20px rgba(5,150,105,0.4)'
                  : '0 4px 20px rgba(194,12,11,0.35)',
              }}
            >
              {isLast
                ? <><CheckCircle2 size={16} /> All done!</>
                : <>Continue <ArrowRight size={15} /></>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
