import React, { useEffect, useRef } from 'react';

interface Draggable3DProps {
  /** Children rendered inside the rotating stage (must use 3D-friendly transforms). */
  children: React.ReactNode;
  /** CSS perspective in px. Higher = less dramatic. */
  perspective?: number;
  /** Auto-rotation degrees per second when idle. */
  autoSpin?: number;
  /** How quickly the inertia decays (0..1, higher = decays faster). */
  decay?: number;
  /** Sensitivity (deg per pixel). */
  sensitivity?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 3D drag-to-rotate wrapper. Press and drag (or touch and drag) to spin.
 * When idle the scene gently auto-rotates and your last drag-velocity glides
 * to a stop with inertia.
 *
 * Children should typically use `position: absolute` + `translate3d(...)` so
 * they live in the same 3D space as the stage.
 */
export default function Draggable3D({
  children,
  perspective = 900,
  autoSpin = 8,
  decay = 0.94,
  sensitivity = 0.4,
  className = '',
  style,
}: Draggable3DProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    rx: -10, // rotation around X (pitch)
    ry: 0,   // rotation around Y (yaw)
    vx: 0,
    vy: autoSpin / 60,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    const apply = () => {
      const { rx, ry } = stateRef.current;
      stage.style.transform = `perspective(${perspective}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };

    const tick = () => {
      const s = stateRef.current;
      if (!s.dragging) {
        // apply velocity (with decay) and a tiny constant auto-spin around Y
        s.ry += s.vy + (autoSpin / 60);
        s.rx += s.vx;
        s.vx *= decay;
        s.vy *= decay;
        // clamp pitch so we don't flip upside down
        if (s.rx > 70)  s.rx = 70;
        if (s.rx < -70) s.rx = -70;
      }
      apply();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const start = (clientX: number, clientY: number) => {
      const s = stateRef.current;
      s.dragging = true;
      s.lastX = clientX;
      s.lastY = clientY;
      s.vx = 0;
      s.vy = 0;
      wrap.classList.add('drag-3d-active');
    };
    const move = (clientX: number, clientY: number) => {
      const s = stateRef.current;
      if (!s.dragging) return;
      const dx = clientX - s.lastX;
      const dy = clientY - s.lastY;
      s.lastX = clientX;
      s.lastY = clientY;
      s.ry += dx * sensitivity;
      s.rx -= dy * sensitivity;
      if (s.rx > 70)  s.rx = 70;
      if (s.rx < -70) s.rx = -70;
      // store velocity for inertia
      s.vy = dx * sensitivity * 0.6;
      s.vx = -dy * sensitivity * 0.6;
    };
    const end = () => {
      stateRef.current.dragging = false;
      wrap.classList.remove('drag-3d-active');
    };

    const onMouseDown = (e: MouseEvent) => { e.preventDefault(); start(e.clientX, e.clientY); };
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onMouseUp   = () => end();
    const onTouchStart= (e: TouchEvent) => { if (e.touches[0]) start(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); } };
    const onTouchEnd  = () => end();

    wrap.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    wrap.addEventListener('touchstart', onTouchStart, { passive: true });
    wrap.addEventListener('touchmove', onTouchMove, { passive: false });
    wrap.addEventListener('touchend', onTouchEnd);
    wrap.addEventListener('touchcancel', onTouchEnd);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      wrap.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      wrap.removeEventListener('touchstart', onTouchStart);
      wrap.removeEventListener('touchmove', onTouchMove);
      wrap.removeEventListener('touchend', onTouchEnd);
      wrap.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [perspective, autoSpin, decay, sensitivity]);

  return (
    <div ref={wrapRef} className={`drag-3d ${className}`} style={style}>
      <div ref={stageRef} className="drag-3d-stage">{children}</div>
    </div>
  );
}
