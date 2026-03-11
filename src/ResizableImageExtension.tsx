import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import React, { useRef, useState, useCallback } from 'react';
import { AlignLeft, AlignCenter, AlignRight, RectangleHorizontal, Crop, Trash2 } from 'lucide-react';

// ─── Resizable Image Component (NodeView) ───────────────────────────
const ResizableImageComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, editor, deleteNode, getPos }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [showToolbar, setShowToolbar] = useState(false);

    const { src, alt, width, height, alignment } = node.attrs;

    // ─── Resize logic using getBoundingClientRect() ─────────────
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!wrapperRef.current) return;

        setIsResizing(true);
        const rect = wrapperRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = rect.width;
        const startHeight = rect.height;
        const aspect = startWidth / startHeight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            let newWidth = startWidth;
            let newHeight = startHeight;

            // Corner handles — maintain aspect ratio
            if (handle.length === 2) {
                if (handle.includes('e')) newWidth = startWidth + dx;
                else if (handle.includes('w')) newWidth = startWidth - dx;
                if (handle.includes('s')) newHeight = startHeight + dy;
                else if (handle.includes('n')) newHeight = startHeight - dy;
                // Lock aspect ratio based on dominant movement
                if (Math.abs(dx) > Math.abs(dy)) {
                    newHeight = newWidth / aspect;
                } else {
                    newWidth = newHeight * aspect;
                }
            } else {
                // Edge handles — free resize on that axis only
                if (handle === 'e') newWidth = startWidth + dx;
                if (handle === 'w') newWidth = startWidth - dx;
                if (handle === 's') newHeight = startHeight + dy;
                if (handle === 'n') newHeight = startHeight - dy;
            }

            newWidth = Math.max(50, newWidth);
            newHeight = Math.max(50, newHeight);
            updateAttributes({ width: Math.round(newWidth), height: Math.round(newHeight) });
        };

        const onMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [updateAttributes]);

    // ─── Alignment change ───────────────────────────────────────
    const setAlignment = (align: string) => {
        updateAttributes({ alignment: align });
    };

    // ─── Quick resize presets ───────────────────────────────────
    const resizeTo = (pct: number) => {
        if (!wrapperRef.current) return;
        const editorEl = wrapperRef.current.closest('.ProseMirror');
        if (!editorEl) return;
        const editorWidth = editorEl.getBoundingClientRect().width - 64; // minus padding
        const targetWidth = editorWidth * (pct / 100);
        const rect = wrapperRef.current.getBoundingClientRect();
        const aspect = rect.width / rect.height;
        updateAttributes({ width: Math.round(targetWidth), height: Math.round(targetWidth / aspect) });
    };

    const visible = showToolbar || selected;

    return (
        <NodeViewWrapper
            className="resizable-image-wrapper"
            style={{
                display: 'flex',
                justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
            }}
        >
            <div
                ref={wrapperRef}
                className={`resizable-image-container ${visible ? 'show-handles' : ''} ${isResizing ? 'is-resizing' : ''}`}
                style={{
                    width: width ? `${width}px` : 'auto',
                    height: height ? `${height}px` : 'auto',
                    maxWidth: '100%',
                    position: 'relative',
                    display: 'inline-block',
                    lineHeight: 0,
                }}
                onMouseEnter={() => setShowToolbar(true)}
                onMouseLeave={() => { if (!isResizing) setShowToolbar(false); }}
            >
                {/* The actual image — fills wrapper 100% */}
                <img
                    src={src}
                    alt={alt || ''}
                    draggable={false}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '0.5rem',
                        display: 'block',
                        pointerEvents: 'none',
                    }}
                />

                {visible && (
                    <>
                        {/* ── Hovering toolbar above image ── */}
                        <div
                            className="image-hover-toolbar"
                            style={{
                                position: 'absolute',
                                top: -44,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 50,
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                padding: '4px 6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                whiteSpace: 'nowrap',
                            }}>
                                <ToolbarBtn
                                    title="Align Left"
                                    active={alignment === 'left'}
                                    onClick={() => setAlignment('left')}
                                >
                                    <AlignLeft size={15} />
                                </ToolbarBtn>
                                <ToolbarBtn
                                    title="Align Center"
                                    active={alignment === 'center'}
                                    onClick={() => setAlignment('center')}
                                >
                                    <AlignCenter size={15} />
                                </ToolbarBtn>
                                <ToolbarBtn
                                    title="Align Right"
                                    active={alignment === 'right'}
                                    onClick={() => setAlignment('right')}
                                >
                                    <AlignRight size={15} />
                                </ToolbarBtn>
                                <ToolbarBtn
                                    title="Full Width"
                                    active={alignment === 'full'}
                                    onClick={() => { setAlignment('center'); resizeTo(100); }}
                                >
                                    <RectangleHorizontal size={15} />
                                </ToolbarBtn>
                                <Divider />
                                <ToolbarBtn title="Crop" onClick={() => {
                                    // Dispatch custom event that BlogEditor listens to
                                    window.dispatchEvent(new CustomEvent('tiptap-crop-image', { detail: { src, getPos: typeof getPos === 'function' ? getPos() : null } }));
                                }}>
                                    <Crop size={15} />
                                </ToolbarBtn>
                                <Divider />
                                <SizeBtn label="25%" onClick={() => resizeTo(25)} />
                                <SizeBtn label="50%" onClick={() => resizeTo(50)} />
                                <SizeBtn label="75%" onClick={() => resizeTo(75)} />
                                <SizeBtn label="100%" onClick={() => resizeTo(100)} />
                                <Divider />
                                <ToolbarBtn
                                    title="Delete Image"
                                    onClick={() => { if (window.confirm('Delete this image?')) deleteNode(); }}
                                    danger
                                >
                                    <Trash2 size={14} />
                                </ToolbarBtn>
                            </div>
                        </div>

                        {/* ── Outline border — matches wrapper exactly ── */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            border: '2px solid #c20c0b',
                            borderRadius: '0.5rem',
                            pointerEvents: 'none',
                        }} />

                        {/* ── 8 Resize handles: 4 corners + 4 edges ── */}
                        {/* Corners */}
                        <Handle pos="nw" cursor="nwse-resize" style={{ top: -5, left: -5 }} onMouseDown={handleResizeMouseDown} />
                        <Handle pos="ne" cursor="nesw-resize" style={{ top: -5, right: -5 }} onMouseDown={handleResizeMouseDown} />
                        <Handle pos="sw" cursor="nesw-resize" style={{ bottom: -5, left: -5 }} onMouseDown={handleResizeMouseDown} />
                        <Handle pos="se" cursor="nwse-resize" style={{ bottom: -5, right: -5 }} onMouseDown={handleResizeMouseDown} />
                        {/* Edges */}
                        <Handle pos="n" cursor="ns-resize" style={{ top: -5, left: '50%', transform: 'translateX(-50%)' }} onMouseDown={handleResizeMouseDown} />
                        <Handle pos="s" cursor="ns-resize" style={{ bottom: -5, left: '50%', transform: 'translateX(-50%)' }} onMouseDown={handleResizeMouseDown} />
                        <Handle pos="w" cursor="ew-resize" style={{ top: '50%', left: -5, transform: 'translateY(-50%)' }} onMouseDown={handleResizeMouseDown} />
                        <Handle pos="e" cursor="ew-resize" style={{ top: '50%', right: -5, transform: 'translateY(-50%)' }} onMouseDown={handleResizeMouseDown} />
                    </>
                )}
            </div>
        </NodeViewWrapper>
    );
};

// ─── Sub-components ─────────────────────────────────────────────────

const Handle: React.FC<{
    pos: string;
    cursor: string;
    style: React.CSSProperties;
    onMouseDown: (e: React.MouseEvent, handle: string) => void;
}> = ({ pos, cursor, style, onMouseDown }) => (
    <div
        onMouseDown={(e) => onMouseDown(e, pos)}
        style={{
            position: 'absolute',
            width: 10,
            height: 10,
            background: '#c20c0b',
            border: '2px solid white',
            borderRadius: '50%',
            cursor,
            zIndex: 10,
            boxShadow: '0 0 3px rgba(0,0,0,0.3)',
            ...style,
        }}
    />
);

const ToolbarBtn: React.FC<{
    title: string;
    active?: boolean;
    danger?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ title, active, danger, onClick, children }) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: active ? '#f3f4f6' : 'transparent',
            color: danger ? '#ef4444' : active ? '#c20c0b' : '#6b7280',
            transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = danger ? '#fef2f2' : '#f3f4f6'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = active ? '#f3f4f6' : 'transparent'; }}
    >
        {children}
    </button>
);

const SizeBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        style={{
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: '#f3f4f6',
            color: '#374151',
            transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
    >
        {label}
    </button>
);

const Divider: React.FC = () => (
    <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
);

// ─── TipTap Node Extension ──────────────────────────────────────────
export const ResizableImage = Node.create({
    name: 'resizableImage',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: { default: null },
            alt: { default: null },
            width: { default: null },
            height: { default: null },
            alignment: { default: 'center' },
        };
    },

    parseHTML() {
        return [{ tag: 'img[src]' }];
    },

    renderHTML({ HTMLAttributes }) {
        const { alignment, ...rest } = HTMLAttributes;
        const style = [];
        if (rest.width) style.push(`width: ${rest.width}px`);
        if (rest.height) style.push(`height: ${rest.height}px`);
        style.push('max-width: 100%');
        style.push('border-radius: 0.5rem');
        return ['img', mergeAttributes(rest, { style: style.join('; ') })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent);
    },
});

export default ResizableImage;
