import React, { useEffect, useRef } from 'react';

interface ParticlesBackgroundProps {
  density?: number;            // particles per 100k px²
  color?: string;
  lineColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; r: number;
}

/**
 * Lightweight canvas particle network — the "constellations" effect.
 * Particles drift, attract slightly toward the cursor, and draw lines
 * between neighbours within range.
 */
export default function ParticlesBackground({
  density = 0.06,
  color = 'rgba(146, 84, 222, 0.65)',
  lineColor = 'rgba(146, 84, 222, 0.18)',
  className,
  style,
}: ParticlesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    const mouse = { x: -9999, y: -9999, active: false };
    let raf = 0;
    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round((w * h) / 100000 * density * 100);
      const count = Math.max(20, Math.min(160, target));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1 + Math.random() * 1.6,
      }));
    };
    resize();

    const onResize = () => resize();
    const onMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = mouse.x >= 0 && mouse.x <= rect.width && mouse.y >= 0 && mouse.y <= rect.height;
    };
    const onLeave = () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; };

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', onLeave);

    const tick = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        // gentle attraction to mouse
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 160 * 160) {
            const f = 0.08 / (Math.sqrt(d2) + 1);
            p.vx += dx * f * 0.01;
            p.vy += dy * f * 0.01;
          }
        }
        p.x += p.vx;
        p.y += p.vy;
        // soft friction
        p.vx *= 0.985;
        p.vy *= 0.985;
        // wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      // connect close neighbours
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 110) {
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1 - d / 110;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      wrap.removeEventListener('mouseleave', onLeave);
    };
  }, [density, color, lineColor]);

  return (
    <div ref={wrapRef} className={`particles-bg ${className || ''}`} style={style}>
      <canvas ref={canvasRef} aria-hidden />
    </div>
  );
}
