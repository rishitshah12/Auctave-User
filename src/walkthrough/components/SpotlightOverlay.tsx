import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightOverlayProps {
  targetId?: string;
  padding?: number;
  allowInteraction?: boolean;
  onClickOutside?: () => void;
  children?: React.ReactNode;
}

// Finds the first element with the given tour-id that is actually visible in the viewport.
// Uses querySelectorAll so both sidebar (desktop) and bottom nav (mobile) can share the same id.
function getTargetRect(tourId: string, padding: number): Rect | null {
  const els = Array.from(document.querySelectorAll(`[data-tour-id="${tourId}"]`));

  for (const el of els) {
    const r = el.getBoundingClientRect();

    // Skip zero-size elements
    if (r.width === 0 || r.height === 0) continue;

    // Skip elements fully outside the viewport
    if (r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) continue;

    // Skip elements that are invisible (opacity:0, visibility:hidden, display:none)
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

    // This element is visible — return its rect with padding
    return {
      x: Math.max(0, r.left - padding),
      y: Math.max(0, r.top - padding),
      width: Math.min(r.width + padding * 2, window.innerWidth),
      height: Math.min(r.height + padding * 2, window.innerHeight),
    };
  }

  return null;
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
        // Scroll visible element into view if partially hidden
        if (r) {
          const el = document.querySelector(`[data-tour-id="${targetId}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
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
      className="zushi-overlay-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      {rect ? (
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
            }}
            onClick={onClickOutside}
          />

          {/* Apple-style halo ring */}
          <div
            style={{
              position: 'absolute',
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height,
              borderRadius: 12,
              boxShadow: allowInteraction
                ? '0 0 0 2px rgba(255,255,255,0.95), 0 0 0 6px rgba(255,255,255,0.35), 0 0 28px 10px rgba(255,255,255,0.12)'
                : '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 5px rgba(255,255,255,0.3), 0 0 20px 8px rgba(255,255,255,0.1)',
              pointerEvents: 'none',
              transition: 'all 0.28s cubic-bezier(0.22,1,0.36,1)',
              animation: allowInteraction ? 'tour-halo-pulse 2.2s ease-in-out infinite' : undefined,
            }}
          />
        </>
      ) : (
        // No visible target — show full-screen dark overlay (centered steps, or off-screen targets)
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

      {/* Tooltip — pointer events restored */}
      <div style={{ pointerEvents: 'all' }}>
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
