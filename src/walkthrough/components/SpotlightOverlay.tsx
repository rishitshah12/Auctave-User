import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Rect { x: number; y: number; width: number; height: number; }

interface SpotlightOverlayProps {
  targetId?: string;
  padding?: number;
  allowInteraction?: boolean;
  onClickOutside?: () => void;
  children?: React.ReactNode;
}

// Find the first element with this tour-id that is NOT hidden by CSS.
// Intentionally does NOT reject elements below the fold — we'll scroll to those.
// Only rejects elements that are horizontally off-screen (e.g. sidebar translateX(-80px) on mobile).
function findVisibleElement(tourId: string): Element | null {
  const els = Array.from(document.querySelectorAll(`[data-tour-id="${tourId}"]`));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Skip elements off-screen HORIZONTALLY (sidebar on mobile)
    if (r.right < 0 || r.left > window.innerWidth) continue;
    // Skip CSS-hidden elements
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
    return el;
  }
  return null;
}

function rectFromElement(el: Element, padding: number): Rect {
  const r = el.getBoundingClientRect();
  return {
    x: Math.max(0, r.left - padding),
    y: Math.max(0, r.top - padding),
    width:  Math.min(r.width  + padding * 2, window.innerWidth),
    height: Math.min(r.height + padding * 2, window.innerHeight),
  };
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
  targetId, padding = 8, allowInteraction = false, onClickOutside, children,
}) => {
  const [rect, setRect] = useState<Rect | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const frameRef  = useRef<number | undefined>(undefined);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768);

      if (!targetId) { setRect(null); return; }

      const el = findVisibleElement(targetId);
      if (!el) { setRect(null); return; }

      const r = el.getBoundingClientRect();
      const inViewport = r.top < window.innerHeight && r.bottom > 0;

      if (inViewport) {
        // Element is (at least partially) visible — measure immediately
        setRect(rectFromElement(el, padding));
      } else {
        // Element is below (or above) the fold — scroll first, then re-measure
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        timerRef.current = setTimeout(() => {
          setRect(rectFromElement(el, padding));
        }, 480); // Wait for smooth scroll to settle
      }
    };

    update();

    const ro = new ResizeObserver(() => { frameRef.current = requestAnimationFrame(update); });
    ro.observe(document.body);
    const target = targetId ? document.querySelector(`[data-tour-id="${targetId}"]`) : null;
    if (target) ro.observe(target);

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      if (frameRef.current)  cancelAnimationFrame(frameRef.current);
      if (timerRef.current)  clearTimeout(timerRef.current);
    };
  }, [targetId, padding]);

  const overlayBottom = isMobile ? 'calc(env(safe-area-inset-bottom) + 74px)' : 0;

  const overlay = (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        bottom: overlayBottom,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      {rect ? (
        <>
          {/* Top */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height: rect.y, background:'rgba(0,0,0,0.75)', pointerEvents: allowInteraction?'none':'all' }} onClick={onClickOutside} />
          {/* Bottom */}
          <div style={{ position:'absolute', top: rect.y+rect.height, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', pointerEvents: allowInteraction?'none':'all' }} onClick={onClickOutside} />
          {/* Left */}
          <div style={{ position:'absolute', top: rect.y, left:0, width: rect.x, height: rect.height, background:'rgba(0,0,0,0.75)', pointerEvents: allowInteraction?'none':'all' }} onClick={onClickOutside} />
          {/* Right */}
          <div style={{ position:'absolute', top: rect.y, left: rect.x+rect.width, right:0, height: rect.height, background:'rgba(0,0,0,0.75)', pointerEvents: allowInteraction?'none':'all' }} onClick={onClickOutside} />

          {/* Apple halo ring */}
          <div
            style={{
              position: 'absolute',
              top: rect.y, left: rect.x,
              width: rect.width, height: rect.height,
              borderRadius: 12, pointerEvents: 'none',
              boxShadow: allowInteraction
                ? '0 0 0 2.5px rgba(255,255,255,1), 0 0 0 7px rgba(255,255,255,0.35), 0 0 32px 12px rgba(255,255,255,0.15)'
                : '0 0 0 2.5px rgba(255,255,255,0.95), 0 0 0 6px rgba(255,255,255,0.3), 0 0 24px 8px rgba(255,255,255,0.1)',
              transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              animation: allowInteraction ? 'tour-halo-pulse 2.2s ease-in-out infinite' : undefined,
            }}
          />
        </>
      ) : (
        /* No visible target — full dark backdrop (center steps or inaccessible elements) */
        <div
          style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', pointerEvents:'all' }}
          onClick={onClickOutside}
        />
      )}

      <div style={{ pointerEvents: 'all' }}>{children}</div>
    </div>
  );

  return createPortal(overlay, document.body);
};
