import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
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
    return {
      top: vh / 2 - tooltipH / 2,
      left: vw / 2 - tooltipW / 2,
    };
  }

  const rect = getTargetRect(targetId);
  if (!rect) {
    return { top: vh / 2 - tooltipH / 2, left: vw / 2 - tooltipW / 2 };
  }

  const GAP = 16;
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

  // Clamp to viewport with margin
  const M = 12;
  top = Math.max(M, Math.min(top, vh - tooltipH - M));
  left = Math.max(M, Math.min(left, vw - tooltipW - M));

  // Mobile: always bottom sheet on small screens
  if (vw < 640) {
    return { top: vh - tooltipH - 80 - M, left: M };
  }

  return { top, left };
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  step, tour, stepIndex, onNext, onPrev, onExit, onComplete,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const [isDark] = useState(() => document.documentElement.classList.contains('dark'));
  const isLast = stepIndex === tour.steps.length - 1;
  const isFirst = stepIndex === 0;
  const isMobile = window.innerWidth < 640;

  const reposition = () => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    const p = computePosition(step.target, step.placement, w, h);
    setPos(p);
  };

  useLayoutEffect(() => {
    reposition();
  }, [step.id, step.target, step.placement]);

  useEffect(() => {
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [step.id]);

  const stepNumber = stepIndex + 1;
  const total = tour.steps.length;

  const bg = isDark ? '#12080f' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const text = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const tipBg = isDark ? 'rgba(194,12,11,0.12)' : 'rgba(194,12,11,0.07)';
  const tipText = isDark ? '#ff8a8a' : '#a00909';

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: isMobile ? `calc(100vw - 24px)` : 340,
        zIndex: 9999,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
        transition: 'top 0.22s cubic-bezier(0.22,1,0.36,1), left 0.22s cubic-bezier(0.22,1,0.36,1)',
        overflow: 'hidden',
      }}
    >
      {/* Progress bar */}
      <div style={{ height: 3, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
        <div
          style={{
            height: '100%',
            width: `${(stepNumber / total) * 100}%`,
            background: 'linear-gradient(90deg, #c20c0b, #7c3aed)',
            transition: 'width 0.35s ease',
          }}
        />
      </div>

      <div style={{ padding: '18px 20px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#c20c0b',
              background: 'rgba(194,12,11,0.1)',
              padding: '2px 8px',
              borderRadius: 99,
            }}>
              {tour.icon} {stepNumber} / {total}
            </span>
          </div>
          <button
            onClick={onExit}
            style={{
              width: 28, height: 28,
              borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: sub,
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: text, lineHeight: 1.3 }}>
          {step.title}
        </h3>

        {/* Body */}
        <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.6, color: sub }}>
          {step.body}
        </p>

        {/* Action prompt */}
        {step.action && (
          <div style={{
            background: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 12.5,
            color: isDark ? '#c4b5fd' : '#6d28d9',
            fontWeight: 500,
          }}>
            👆 {step.action.label}
          </div>
        )}

        {/* Tip */}
        {step.tip && (
          <div style={{
            background: tipBg,
            borderRadius: 8,
            padding: '7px 11px',
            marginBottom: 12,
            fontSize: 12,
            color: tipText,
            lineHeight: 1.5,
          }}>
            💡 {step.tip}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <button
            onClick={onPrev}
            disabled={isFirst}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 13, fontWeight: 600,
              color: isFirst ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : sub,
              background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer',
              padding: '6px 2px',
            }}
          >
            <ChevronLeft size={15} />
            Back
          </button>

          <button
            onClick={isLast ? onComplete : onNext}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: 700,
              color: '#fff',
              background: isLast
                ? 'linear-gradient(135deg, #15803d, #166534)'
                : 'linear-gradient(135deg, #c20c0b, #350e4a)',
              boxShadow: isLast
                ? '0 4px 16px rgba(21,128,61,0.35)'
                : '0 4px 16px rgba(194,12,11,0.35)',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            {isLast ? (
              <><CheckCircle size={15} /> Done</>
            ) : (
              <>Next <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
