import React, { useCallback, useRef } from 'react';
import './tilt.css';

interface Tilt3DProps {
  /** Maximum rotation in degrees on each axis (default: 12). */
  max?: number;
  /** Z-axis lift on hover (px) (default: 0). */
  lift?: number;
  /** CSS perspective in px (default: 800). */
  perspective?: number;
  /** Optional extra class on the outer wrapper. */
  className?: string;
  /** Optional inline style on the outer wrapper. */
  style?: React.CSSProperties;
  /** Show the soft glare overlay that follows the cursor. (default: true) */
  glare?: boolean;
  /** Reset the tilt when the cursor leaves. (default: true) */
  resetOnLeave?: boolean;
  children: React.ReactNode;
}

/**
 * 3D tilt wrapper that follows the mouse.
 * Set `max={0}` to disable rotation but keep the glare.
 */
export default function Tilt3D({
  max = 12,
  lift = 0,
  perspective = 800,
  className = '',
  style,
  glare = true,
  resetOnLeave = true,
  children,
}: Tilt3DProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const wrap = wrapRef.current;
      const inner = innerRef.current;
      if (!wrap || !inner) return;
      const rect = wrap.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;     // 0..1
      const py = (e.clientY - rect.top) / rect.height;     // 0..1
      const rx = (0.5 - py) * max * 2;                     // -max..max
      const ry = (px - 0.5) * max * 2;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        inner.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${lift}px)`;
        if (glare && glareRef.current) {
          glareRef.current.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.45), transparent 50%)`;
          glareRef.current.style.opacity = '1';
        }
      });
    },
    [max, lift, perspective, glare]
  );

  const handleLeave = useCallback(() => {
    if (!resetOnLeave) return;
    const inner = innerRef.current;
    if (inner) {
      inner.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) translateZ(0)`;
    }
    if (glareRef.current) glareRef.current.style.opacity = '0';
  }, [perspective, resetOnLeave]);

  return (
    <div
      ref={wrapRef}
      className={`tilt-3d ${className}`}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div ref={innerRef} className="tilt-3d-inner">
        {children}
        {glare && <div ref={glareRef} className="tilt-3d-glare" />}
      </div>
    </div>
  );
}
