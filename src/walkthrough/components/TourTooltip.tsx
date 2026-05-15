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
    left: 10,
    right: 10,
    top: 'auto',
    width: 'auto',
    maxWidth: 'none',
    borderRadius: 22,
  };

  const desktopStyle: React.CSSProperties = {
    top: pos.top,
    left: pos.left,
    width: 600,          // 50% larger than previous 440px → 600px desktop
    maxWidth: 640,
    borderRadius: 24,
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
      {/* Gradient accent bar — pure red brand */}
      <div style={{ height: 5, background: 'linear-gradient(90deg, #c20c0b 0%, #350e4a 100%)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'inherit', filter: 'blur(8px)', opacity: 0.5 }} />
      </div>

      <div style={{ padding: isMobile ? '20px 20px 22px' : '30px 36px 32px' }}>

        {/* Tour label + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{
            fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #c20c0b, #350e4a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {tour.title}
          </span>
          <button
            onClick={onExit}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${cardBorder}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: body, flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 14px',
          fontSize: isMobile ? 21 : 26,
          fontWeight: 800, color: heading, lineHeight: 1.2, letterSpacing: '-0.025em',
        }}>
          {step.title}
        </h3>

        {/* Body */}
        <p style={{ margin: '0 0 20px', fontSize: isMobile ? 14.5 : 17, lineHeight: 1.7, color: body }}>
          {step.body}
        </p>

        {/* Action prompt */}
        {step.action && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: isDark ? 'rgba(194,12,11,0.08)' : 'rgba(194,12,11,0.05)',
            border: `1px solid ${isDark ? 'rgba(194,12,11,0.2)' : 'rgba(194,12,11,0.15)'}`,
            borderLeft: '3px solid #c20c0b', borderRadius: '0 12px 12px 0',
            padding: isMobile ? '10px 13px' : '12px 16px', marginBottom: 14,
          }}>
            <MousePointerClick size={15} color="#c20c0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: isMobile ? 13.5 : 14.5, color: isDark ? '#fca5a5' : '#9b1212', fontWeight: 500, lineHeight: 1.55 }}>
              {step.action.label}
            </span>
          </div>
        )}

        {/* Tip */}
        {step.tip && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: isDark ? 'rgba(53,14,74,0.25)' : 'rgba(53,14,74,0.05)',
            border: `1px solid ${isDark ? 'rgba(53,14,74,0.4)' : 'rgba(53,14,74,0.15)'}`,
            borderLeft: '3px solid #350e4a', borderRadius: '0 12px 12px 0',
            padding: isMobile ? '10px 13px' : '12px 16px', marginBottom: 14,
          }}>
            <Lightbulb size={15} color="#350e4a" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: isMobile ? 13.5 : 14.5, color: isDark ? '#d8b4fe' : '#350e4a', fontWeight: 500, lineHeight: 1.55 }}>
              {step.tip}
            </span>
          </div>
        )}

        {/* Footer: dots + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: isMobile ? 18 : 26, gap: 12 }}>

          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {tour.steps.map((_, i) => {
              const isCurrent = i === stepIndex;
              const isDone = i < stepIndex;
              return (
                <div key={i} style={{
                  height: isMobile ? 7 : 9,
                  width: isCurrent ? (isMobile ? 22 : 28) : (isMobile ? 7 : 9),
                  borderRadius: 99,
                  background: isCurrent ? 'linear-gradient(90deg,#c20c0b,#350e4a)' : isDone ? dotDone : dotFuture,
                  transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s ease',
                }} />
              );
            })}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {!isFirst && (
              <button
                onClick={onPrev}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: isMobile ? '9px 14px' : '11px 18px',
                  borderRadius: 11,
                  border: `1px solid ${cardBorder}`,
                  cursor: 'pointer',
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: 600,
                  color: body,
                  background: 'none',
                }}
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}

            <button
              onClick={isLast ? onComplete : onNext}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: isMobile ? '10px 20px' : '13px 28px',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 14.5 : 16, fontWeight: 700, color: '#fff',
                whiteSpace: 'nowrap',
                background: isLast
                  ? 'linear-gradient(135deg,#059669,#047857)'
                  : 'linear-gradient(135deg,#c20c0b,#350e4a)',
                boxShadow: isLast
                  ? '0 6px 24px rgba(5,150,105,0.45)'
                  : '0 6px 24px rgba(194,12,11,0.4)',
              }}
            >
              {isLast
                ? <><CheckCircle2 size={17} /> All done!</>
                : <>Continue <ArrowRight size={16} /></>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
