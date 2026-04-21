import React, { useRef, useState, useMemo, useEffect } from 'react';

export const PhotoRepositionModal = ({ src, onConfirm, onCancel }: {
    src: string;
    onConfirm: (dataUrl: string) => void;
    onCancel: () => void;
}) => {
    const CIRCLE_D = 260;
    const CIRCLE_R = CIRCLE_D / 2;
    const CANVAS_OUT = 240;

    const imgRef = useRef<HTMLImageElement>(null);
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const dragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const minScale = useMemo(() => {
        if (!naturalSize.w || !naturalSize.h) return 1;
        return Math.max(CIRCLE_D / naturalSize.w, CIRCLE_D / naturalSize.h);
    }, [naturalSize]);

    const sliderMin = useMemo(() => {
        if (!naturalSize.w || !naturalSize.h) return 0.1;
        return Math.min(CIRCLE_D / naturalSize.w, CIRCLE_D / naturalSize.h);
    }, [naturalSize]);

    const sliderMax = useMemo(() => minScale * 5, [minScale]);

    useEffect(() => {
        if (naturalSize.w > 0) {
            setScale(minScale);
            setOffset({ x: 0, y: 0 });
        }
    }, [minScale]);

    const clampOffset = (ox: number, oy: number, sc: number) => {
        if (!naturalSize.w) return { x: 0, y: 0 };
        const maxX = naturalSize.w * sc / 2 + CIRCLE_R - 20;
        const maxY = naturalSize.h * sc / 2 + CIRCLE_R - 20;
        return {
            x: Math.max(-maxX, Math.min(maxX, ox)),
            y: Math.max(-maxY, Math.min(maxY, oy)),
        };
    };

    const onPointerDown = (e: React.PointerEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'BUTTON') return;
        dragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setOffset(prev => clampOffset(prev.x + dx, prev.y + dy, scale));
    };
    const onPointerUp = () => { dragging.current = false; };

    const handleScaleChange = (s: number) => {
        setScale(s);
        setOffset(prev => clampOffset(prev.x, prev.y, s));
    };

    const handleConfirm = () => {
        if (!imgRef.current || !naturalSize.w) return;
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_OUT;
        canvas.height = CANVAS_OUT;
        const ctx = canvas.getContext('2d')!;
        ctx.beginPath();
        ctx.arc(CANVAS_OUT / 2, CANVAS_OUT / 2, CANVAS_OUT / 2, 0, Math.PI * 2);
        ctx.clip();
        const sc = scale;
        const iw = naturalSize.w * sc;
        const ih = naturalSize.h * sc;
        const imgLeftRelCircle = CIRCLE_R + offset.x - iw / 2;
        const imgTopRelCircle = CIRCLE_R + offset.y - ih / 2;
        const f = CANVAS_OUT / CIRCLE_D;
        ctx.drawImage(imgRef.current, imgLeftRelCircle * f, imgTopRelCircle * f, iw * f, ih * f);
        onConfirm(canvas.toDataURL('image/jpeg', 0.92));
    };

    const zoomDisplay = minScale > 0 ? (scale / minScale).toFixed(1) : '1.0';

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: '#111',
                userSelect: 'none', touchAction: 'none',
                cursor: 'grab',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <img
                ref={imgRef}
                src={src}
                onLoad={e => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                alt=""
                draggable={false}
                style={{
                    position: 'absolute',
                    left: '50%', top: '42%',
                    width: naturalSize.w ? naturalSize.w * scale : undefined,
                    height: 'auto',
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    pointerEvents: 'none',
                    opacity: naturalSize.w ? 1 : 0,
                    zIndex: 1,
                }}
            />
            <div style={{
                position: 'absolute', inset: 0, zIndex: 2,
                background: 'rgba(0,0,0,0.65)',
                WebkitMaskImage: `radial-gradient(circle ${CIRCLE_R}px at 50% 42%, transparent ${CIRCLE_R - 1}px, black ${CIRCLE_R}px)`,
                maskImage: `radial-gradient(circle ${CIRCLE_R}px at 50% 42%, transparent ${CIRCLE_R - 1}px, black ${CIRCLE_R}px)`,
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', zIndex: 3,
                left: '50%', top: '42%',
                transform: 'translate(-50%, -50%)',
                width: CIRCLE_D, height: CIRCLE_D,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.35)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: 28, left: 0, right: 0, zIndex: 4,
                textAlign: 'center', color: '#fff',
                fontSize: 15, fontWeight: 600, letterSpacing: '0.01em',
                pointerEvents: 'none',
            }}>
                Drag to reposition
            </div>
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '0 0 40px', gap: 16,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, letterSpacing: '0.04em' }}>
                        {zoomDisplay}×
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span
                            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: '4px 8px' }}
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => handleScaleChange(Math.max(sliderMin, scale - sliderMin * 0.2))}
                        >−</span>
                        <input
                            type="range"
                            min={sliderMin} max={sliderMax} step={0.0001} value={scale}
                            onPointerDown={e => e.stopPropagation()}
                            onChange={e => handleScaleChange(parseFloat(e.target.value))}
                            style={{ width: 200, accentColor: '#c20c0b', cursor: 'pointer' }}
                        />
                        <span
                            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: '4px 8px' }}
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => handleScaleChange(Math.min(sliderMax, scale + sliderMin * 0.2))}
                        >+</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={onCancel}
                        style={{
                            padding: '11px 32px', borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.18)',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        }}
                    >Cancel</button>
                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={handleConfirm}
                        style={{
                            padding: '11px 36px', borderRadius: 12,
                            border: 'none',
                            background: 'linear-gradient(135deg,#c20c0b,#9a0909)',
                            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(194,12,11,0.45)',
                        }}
                    >Done</button>
                </div>
            </div>
        </div>
    );
};
