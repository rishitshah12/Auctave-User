import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
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

  const GAP = 18;
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

  const M = 12;
  top = Math.max(M, Math.min(top, vh - tooltipH - M));
  left = Math.max(M, Math.min(left, vw - tooltipW - M));

  // On mobile the CSS class .zushi-tooltip overrides position — return a sensible fallback
  if (vw < 640) {
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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const isLast = stepIndex === tour.steps.length - 1;
  const isFirst = stepIndex === 0;

  const reposition = () => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    const p = computePosition(step.target, step.placement, w, h);
    setPos(p);
  };

  useLayoutEffect(() => {
    reposition();
  }, [step.id, step.target, step.placement]);

  // Re-position on resize / orientation change
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 640);
      reposition();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [step.id, step.target, step.placement]);

  // Track dark mode changes reactively
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const stepNumber = stepIndex + 1;
  const total = tour.steps.length;

  const bg = isDark ? '#12080f' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const text = isDark ? '#f0e8f4' : '#1a0a1e';
  const sub = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const tipBg = isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)';
  const tipText = isDark ? '#c4b5fd' : '#5b21b6';
  const actionBg = isDark ? 'rgba(37,99,235,0.1)' : 'rgba(37,99,235,0.06)';
  const actionText = isDark ? '#93c5fd' : '#1d4ed8';

  return (
    <div
      ref={ref}
      className="zushi-tooltip"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: isMobile ? `calc(100vw - 24px)` : 360,
        zIndex: 9999,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 18,
        boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 4px 20px rgba(0,0,0,0.2)',
        transition: 'top 0.22s cubic-bezier(0.22,1,0.36,1), left 0.22s cubic-bezier(0.22,1,0.36,1)',
        overflow: 'hidden',
      }}
    >
      {/* Progress bar */}
      <div style={{ height: 3, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}>
        <div
          style={{
            height: '100%',
            width: `${(stepNumber / total) * 100}%`,
            background: 'linear-gradient(90deg, #c20c0b, #7c3aed)',
            transition: 'width 0.35s ease',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>

      <div style={{ padding: '20px 22px 22px' }}>
        {/* Header: step count + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: '#c20c0b',
            background: 'rgba(194,12,11,0.08)',
            padding: '3px 10px',
            borderRadius: 99,
          }}>
            Step {stepNumber} of {total}
          </span>
          <button
            onClick={onExit}
            style={{
              width: 30, height: 30,
              borderRadius: 9,
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
            <X size={15} />
          </button>
        </div>

        {/* Title */}
        <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: text, lineHeight: 1.3 }}>
          {step.title}
        </h3>

        {/* Body */}
        <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.65, color: sub }}>
          {step.body}
        </p>

        {/* Action prompt */}
        {step.action && (
          <div style={{
            background: actionBg,
            border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.12)'}`,
            borderRadius: 10,
            padding: '9px 13px',
            marginBottom: 14,
            fontSize: 13.5,
            color: actionText,
            fontWeight: 500,
          }}>
            Your turn — {step.action.label}
          </div>
        )}

        {/* Tip */}
        {step.tip && (
          <div style={{
            background: tipBg,
            border: `1px solid ${isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)'}`,
            borderRadius: 10,
            padding: '8px 13px',
            marginBottom: 14,
            fontSize: 13,
            color: tipText,
            lineHeight: 1.55,
          }}>
            Tip — {step.tip}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <button
            onClick={onPrev}
            disabled={isFirst}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 14, fontWeight: 600,
              color: isFirst ? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)') : sub,
              background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer',
              padding: '7px 4px',
            }}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <button
            onClick={isLast ? onComplete : onNext}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 20px',
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14.5,
              fontWeight: 700,
              color: '#fff',
              background: isLast
                ? 'linear-gradient(135deg, #15803d, #166534)'
                : 'linear-gradient(135deg, #c20c0b, #350e4a)',
              boxShadow: isLast
                ? '0 4px 16px rgba(21,128,61,0.35)'
                : '0 4px 16px rgba(194,12,11,0.3)',
            }}
          >
            {isLast ? (
              <><CheckCircle size={16} /> Finish</>
            ) : (
              <>Next <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
