import React, { useCallback, useRef } from 'react';

interface MagneticProps {
  children: React.ReactElement;
  /** how far cursor needs to be (px) before pulling — default 80 */
  range?: number;
  /** maximum displacement (px) — default 14 */
  strength?: number;
  className?: string;
}

/**
 * Wraps a single child element so it gently translates toward the cursor.
 * The wrapped element should accept a `style` prop merge.
 */
export default function Magnetic({ children, range = 80, strength = 14, className }: MagneticProps) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > range + Math.max(rect.width, rect.height) / 2) {
      reset();
      return;
    }
    const tx = (dx / Math.max(40, dist)) * strength;
    const ty = (dy / Math.max(40, dist)) * strength;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      inner.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
    });
  }, [range, strength]);

  const reset = useCallback(() => {
    const inner = innerRef.current;
    if (inner) inner.style.transform = 'translate(0,0)';
  }, []);

  // Listen on the document so the magnet works even before cursor enters.
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      onMove(e as unknown as React.MouseEvent);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [onMove]);

  return (
    <span ref={wrapRef} className={`magnetic-wrap ${className || ''}`}>
      <span ref={innerRef} className="magnetic-inner">{children}</span>
    </span>
  );
}
