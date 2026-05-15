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

function getTargetRect(tourId: string) {
  const el = document.querySelector(`[data-tour-id="${tourId}"]`);
  return el ? el.getBoundingClientRect() : null;
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

  const rect = getTargetRect(targetId);
  if (!rect) {
    return { top: vh / 2 - tooltipH / 2, left: vw / 2 - tooltipW / 2 };
  }

  const GAP = 20;
  let top = 0;
  let left = 0;

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
    case 'top':
    default:
      top = rect.top - tooltipH - GAP;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
  }

  const M = 16;
  top = Math.max(M, Math.min(top, vh - tooltipH - M));
  left = Math.max(M, Math.min(left, vw - tooltipW - M));

  if (vw < 768) {
    return { top: vh - tooltipH - 150, left: M };
  }

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
  const pct = Math.round((stepNumber / total) * 100);

  const reposition = () => {
    if (!ref.current) return;
    const p = computePosition(step.target, step.placement, ref.current.offsetWidth, ref.current.offsetHeight);
    setPos(p);
  };

  useLayoutEffect(() => {
    reposition();
    setAnimKey(k => k + 1);
  }, [step.id]);

  useEffect(() => {
    const onResize = () => { setIsMobile(window.innerWidth < 768); reposition(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [step.id]);

  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // ── Colours ──────────────────────────────────────────────────────────────────
  const bg        = isDark ? 'rgba(11,5,20,0.98)'  : '#ffffff';
  const cardBorder= isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const heading   = isDark ? '#f5eeff'             : '#0f0a1a';
  const body      = isDark ? 'rgba(240,232,255,0.62)' : 'rgba(15,10,26,0.58)';
  const dotDone   = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
  const dotFuture = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  return (
    <div
      ref={ref}
      className="zushi-tooltip"
      key={animKey}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: isMobile ? 'calc(100vw - 24px)' : 440,
        maxWidth: 480,
        zIndex: 9999,
        background: bg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 22,
        boxShadow: isDark
          ? '0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.7), 0 8px 32px rgba(0,0,0,0.4)'
          : '0 0 0 1px rgba(0,0,0,0.04), 0 40px 100px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.09)',
        transition: 'top 0.26s cubic-bezier(0.22,1,0.36,1), left 0.26s cubic-bezier(0.22,1,0.36,1)',
        overflow: 'hidden',
        animation: 'zushi-card-in 0.32s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {/* ── Gradient accent bar ── */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #c20c0b 0%, #7c3aed 60%, #2563eb 100%)', position: 'relative' }}>
        {/* Glow behind bar */}
        <div style={{ position: 'absolute', inset: 0, background: 'inherit', filter: 'blur(6px)', opacity: 0.6 }} />
      </div>

      {/* ── Inner content ── */}
      <div style={{ padding: isMobile ? '20px 20px 22px' : '24px 28px 26px' }}>

        {/* Tour label + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #c20c0b, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {tour.title}
          </span>
          <button
            onClick={onExit}
            style={{
              width: 32, height: 32,
              borderRadius: 10,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${cardBorder}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: body,
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)')}
            onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 12px',
          fontSize: isMobile ? 20 : 22,
          fontWeight: 800,
          color: heading,
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
        }}>
          {step.title}
        </h3>

        {/* Body */}
        <p style={{
          margin: '0 0 18px',
          fontSize: 15,
          lineHeight: 1.7,
          color: body,
          fontWeight: 400,
        }}>
          {step.body}
        </p>

        {/* Action prompt */}
        {step.action && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.05)',
            border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.15)'}`,
            borderLeft: '3px solid #2563eb',
            borderRadius: '0 10px 10px 0',
            padding: '11px 14px',
            marginBottom: 14,
          }}>
            <MousePointerClick size={15} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
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
            borderLeft: '3px solid #7c3aed',
            borderRadius: '0 10px 10px 0',
            padding: '11px 14px',
            marginBottom: 14,
          }}>
            <Lightbulb size={15} color="#7c3aed" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, color: isDark ? '#c4b5fd' : '#5b21b6', fontWeight: 500, lineHeight: 1.5 }}>
              {step.tip}
            </span>
          </div>
        )}

        {/* ── Footer: step dots + nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, gap: 12 }}>

          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {tour.steps.map((_, i) => {
              const isCurrent = i === stepIndex;
              const isDone = i < stepIndex;
              return (
                <div
                  key={i}
                  style={{
                    height: 7,
                    width: isCurrent ? 22 : 7,
                    borderRadius: 99,
                    background: isCurrent
                      ? 'linear-gradient(90deg, #c20c0b, #7c3aed)'
                      : isDone ? dotDone : dotFuture,
                    transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!isFirst && (
              <button
                onClick={onPrev}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '9px 14px',
                  borderRadius: 11,
                  border: `1px solid ${cardBorder}`,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: body,
                  background: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <ChevronLeft size={15} />
                Back
              </button>
            )}

            <button
              onClick={isLast ? onComplete : onNext}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px',
                borderRadius: 11,
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                background: isLast
                  ? 'linear-gradient(135deg, #059669, #047857)'
                  : 'linear-gradient(135deg, #c20c0b 0%, #7c3aed 100%)',
                boxShadow: isLast
                  ? '0 4px 20px rgba(5,150,105,0.4), 0 1px 4px rgba(0,0,0,0.1)'
                  : '0 4px 20px rgba(194,12,11,0.35), 0 1px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = isLast
                  ? '0 8px 28px rgba(5,150,105,0.5), 0 2px 6px rgba(0,0,0,0.12)'
                  : '0 8px 28px rgba(194,12,11,0.45), 0 2px 6px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = isLast
                  ? '0 4px 20px rgba(5,150,105,0.4), 0 1px 4px rgba(0,0,0,0.1)'
                  : '0 4px 20px rgba(194,12,11,0.35), 0 1px 4px rgba(0,0,0,0.1)';
              }}
            >
              {isLast ? (
                <><CheckCircle2 size={16} /> All done!</>
              ) : (
                <>Continue <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
