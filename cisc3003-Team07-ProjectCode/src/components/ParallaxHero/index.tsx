import React, { useEffect, useRef, useState } from 'react';
import './parallax-hero.css';

interface ParallaxHeroProps {
  /** Background slot (rendered behind everything). */
  background?: React.ReactNode;
  /** Children rendered at depth 0 (centred content). */
  children: React.ReactNode;
  /**
   * Floating decorative items positioned absolutely.
   * `depth` controls how strongly each item moves with the cursor (0 = static, 1 = strong).
   */
  floats?: Array<{
    key?: string | number;
    /** % from left */
    left?: string;
    /** % from top */
    top?: string;
    /** % from right (use instead of left) */
    right?: string;
    /** % from bottom (use instead of top) */
    bottom?: string;
    /** parallax strength 0..1 */
    depth?: number;
    /** how much to push it forward (px) for stronger 3D feel */
    z?: number;
    /** rotation when at rest */
    rotate?: number;
    content: React.ReactNode;
    className?: string;
  }>;
  /** maximum tilt in degrees (default 6) */
  maxTilt?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A 3D-feel hero section that reacts to mouse / touch movement.
 * - Inner container tilts subtly based on cursor.
 * - Floating items shift on each axis according to their depth.
 */
export default function ParallaxHero({
  background,
  children,
  floats = [],
  maxTilt = 6,
  className = '',
  style,
}: ParallaxHeroProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const floatRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);

  // Track an "active" state so we can pause the resting float animation when
  // the cursor is influencing the elements.
  const [active, setActive] = useState(false);

  const updateFromCoords = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    const rect = wrap.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    // Normalised coords centred at 0 (-1 .. 1).
    const nx = (px - 0.5) * 2;
    const ny = (py - 0.5) * 2;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      stage.style.transform = `perspective(1100px) rotateX(${(-ny * maxTilt).toFixed(2)}deg) rotateY(${(nx * maxTilt).toFixed(2)}deg)`;
      floatRefs.current.forEach((el, idx) => {
        if (!el) return;
        const item = floats[idx];
        if (!item) return;
        const depth = item.depth ?? 0.4;
        const z = item.z ?? 0;
        const rot = item.rotate ?? 0;
        const tx = -nx * depth * 40;
        const ty = -ny * depth * 40;
        el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, ${z}px) rotate(${(rot + nx * depth * 6).toFixed(2)}deg)`;
      });
    });
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setActive(true);
    updateFromCoords(e.clientX, e.clientY);
  };
  const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!e.touches[0]) return;
    setActive(true);
    updateFromCoords(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleLeave = () => {
    setActive(false);
    const stage = stageRef.current;
    if (stage) stage.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
    floatRefs.current.forEach((el, idx) => {
      if (!el) return;
      const item = floats[idx];
      if (!item) return;
      const z = item.z ?? 0;
      const rot = item.rotate ?? 0;
      el.style.transform = `translate3d(0px, 0px, ${z}px) rotate(${rot}deg)`;
    });
  };

  // Reset refs array length when floats list changes.
  useEffect(() => {
    floatRefs.current = floatRefs.current.slice(0, floats.length);
  }, [floats.length]);

  return (
    <div
      ref={wrapRef}
      className={`parallax-hero ${className}`}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchMove={handleTouch}
      onTouchEnd={handleLeave}
    >
      {background}
      <div ref={stageRef} className="parallax-hero-stage">
        {floats.map((f, i) => (
          <div
            key={f.key ?? i}
            ref={(el) => { floatRefs.current[i] = el; }}
            className={`parallax-float ${active ? 'is-active' : ''} ${f.className || ''}`}
            style={{
              left: f.left,
              top: f.top,
              right: f.right,
              bottom: f.bottom,
              transform: `translate3d(0,0,${f.z ?? 0}px) rotate(${f.rotate ?? 0}deg)`,
            }}
          >
            {f.content}
          </div>
        ))}
        <div className="parallax-hero-content">{children}</div>
      </div>
    </div>
  );
}
