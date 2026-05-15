import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightOverlayProps {
  targetId?: string;        // data-tour-id value; undefined = no spotlight (centered step)
  padding?: number;
  allowInteraction?: boolean;
  onClickOutside?: () => void;
  children?: React.ReactNode; // tooltip rendered alongside
}

function getTargetRect(tourId: string, padding: number): Rect | null {
  const el = document.querySelector(`[data-tour-id="${tourId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: r.left - padding,
    y: r.top - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
  };
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
  targetId,
  padding = 8,
  allowInteraction = false,
  onClickOutside,
  children,
}) => {
  const [rect, setRect] = useState<Rect | null>(null);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      if (targetId) {
        const r = getTargetRect(targetId, padding);
        setRect(r);
        // scroll into view if needed
        const el = document.querySelector(`[data-tour-id="${targetId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      } else {
        setRect(null);
      }
    };

    update();

    const ro = new ResizeObserver(() => {
      frameRef.current = requestAnimationFrame(update);
    });
    const target = targetId ? document.querySelector(`[data-tour-id="${targetId}"]`) : null;
    if (target) ro.observe(target);
    ro.observe(document.body);

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetId, padding]);

  const overlay = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      {/* Dark quadrant overlays — 4-quadrant approach so target stays interactive */}
      {rect && (
        <>
          {/* Top */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: rect.y,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(1px)',
              pointerEvents: allowInteraction ? 'none' : 'all',
              transition: 'height 0.25s ease',
            }}
            onClick={onClickOutside}
          />
          {/* Bottom */}
          <div
            style={{
              position: 'absolute',
              top: rect.y + rect.height,
              left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(1px)',
              pointerEvents: allowInteraction ? 'none' : 'all',
              transition: 'top 0.25s ease',
            }}
            onClick={onClickOutside}
          />
          {/* Left */}
          <div
            style={{
              position: 'absolute',
              top: rect.y,
              left: 0,
              width: rect.x,
              height: rect.height,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(1px)',
              pointerEvents: allowInteraction ? 'none' : 'all',
              transition: 'all 0.25s ease',
            }}
            onClick={onClickOutside}
          />
          {/* Right */}
          <div
            style={{
              position: 'absolute',
              top: rect.y,
              left: rect.x + rect.width,
              right: 0,
              height: rect.height,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(1px)',
              pointerEvents: allowInteraction ? 'none' : 'all',
              transition: 'all 0.25s ease',
            }}
            onClick={onClickOutside}
          />

          {/* Highlight ring around target */}
          <div
            style={{
              position: 'absolute',
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height,
              borderRadius: 10,
              boxShadow: '0 0 0 2px rgba(194,12,11,0.8), 0 0 0 4px rgba(194,12,11,0.25)',
              pointerEvents: 'none',
              transition: 'all 0.25s ease',
            }}
          />

          {/* Pulsing ring for interaction steps */}
          {allowInteraction && (
            <div
              style={{
                position: 'absolute',
                top: rect.y,
                left: rect.x,
                width: rect.width,
                height: rect.height,
                borderRadius: 10,
                pointerEvents: 'none',
                animation: 'tour-pulse 1.8s ease-in-out infinite',
              }}
            />
          )}
        </>
      )}

      {/* No target: full dark overlay for centered steps */}
      {!rect && targetId === undefined && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'all',
          }}
          onClick={onClickOutside}
        />
      )}

      {/* Tooltip rendered here (pointer-events reset inside) */}
      <div style={{ pointerEvents: 'all' }}>
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
