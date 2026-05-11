import React, { useEffect, useMemo, useRef } from 'react';
import Draggable3D from './Draggable3D';

interface WordSphereProps {
  words: Array<string | { text: string; href?: string; color?: string }>;
  /** Sphere radius in pixels. */
  radius?: number;
  /** Container size in pixels (square). */
  size?: number;
  /** Auto-rotation degrees per second when idle. */
  autoSpin?: number;
}

interface SpherePoint {
  text: string;
  href?: string;
  color?: string;
  x: number;
  y: number;
  z: number;
  /** size weight in 0..1 */
  weight: number;
}

/**
 * Distribute N words evenly over a sphere using a Fibonacci spiral and
 * render them at their (x,y,z) positions. The whole stage is wrapped in a
 * Draggable3D so the user can grab and spin it.
 *
 * The trick to make words on the back appear "behind" the ones in front is
 * to fade & shrink each word according to its z position as the stage
 * rotates. We drive that using a per-frame animation that reads the
 * current rotation off the parent stage.
 */
export default function WordSphere({
  words,
  radius = 180,
  size = 460,
  autoSpin = 6,
}: WordSphereProps) {
  const items = useMemo<SpherePoint[]>(() => {
    const N = words.length;
    const phi = Math.PI * (3 - Math.sqrt(5));
    return words.map((w, i) => {
      const text = typeof w === 'string' ? w : w.text;
      const href = typeof w === 'string' ? undefined : w.href;
      const color = typeof w === 'string' ? undefined : w.color;
      const y = 1 - (i / (N - 1)) * 2;          // -1..1
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      // weight: bias text size pseudo-randomly from index
      const weight = 0.55 + ((i * 9301 + 49297) % 233280) / 233280 * 0.55;
      return { text, href, color, x, y, z, weight };
    });
  }, [words]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | HTMLDivElement | null>>([]);

  // Per-frame: read current rotation from the *Draggable3D stage* (parent of
  // our root) and update each word's opacity/scale based on its world-space z.
  useEffect(() => {
    let raf = 0;
    const wrap = stageRef.current;
    if (!wrap) return;

    const tick = () => {
      // The Draggable3D stage is `wrap.parentElement` (.drag-3d-stage).
      const dragStage = wrap.parentElement;
      let rx = 0, ry = 0;
      if (dragStage) {
        const t = dragStage.style.transform;
        const mRx = /rotateX\(([-\d.]+)deg\)/.exec(t);
        const mRy = /rotateY\(([-\d.]+)deg\)/.exec(t);
        if (mRx) rx = parseFloat(mRx[1]) * Math.PI / 180;
        if (mRy) ry = parseFloat(mRy[1]) * Math.PI / 180;
      }
      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const cosY = Math.cos(ry), sinY = Math.sin(ry);

      for (let i = 0; i < items.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const p = items[i];
        // Apply Y rotation then X rotation to the unit vector.
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        // depth normalised -1..1 (1 = facing camera)
        const depth = z2;
        // opacity 0.25..1, scale 0.7..1.15
        const op = 0.30 + (depth + 1) * 0.5 * 0.70;
        const sc = 0.65 + (depth + 1) * 0.5 * 0.55;
        el.style.opacity = op.toFixed(3);
        el.style.transform = `translate3d(${(x1 * radius).toFixed(1)}px, ${(p.y * radius).toFixed(1)}px, ${(z2 * radius).toFixed(1)}px) scale(${sc.toFixed(3)})`;
        el.style.zIndex = String(Math.round((depth + 1) * 500));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items, radius]);

  return (
    <Draggable3D
      perspective={1200}
      autoSpin={autoSpin}
      sensitivity={0.45}
      style={{ width: size, height: size }}
      className="word-sphere-wrap"
    >
      <div className="word-sphere" ref={stageRef}>
        {items.map((p, i) => {
          const isLink = !!p.href;
          const cls = `word-sphere-item ${p.color ? '' : 'word-sphere-item--default'}`;
          const style: React.CSSProperties = {
            fontSize: `${(12 + p.weight * 18).toFixed(0)}px`,
            color: p.color,
            transform: `translate3d(${(p.x * radius).toFixed(1)}px, ${(p.y * radius).toFixed(1)}px, ${(p.z * radius).toFixed(1)}px)`,
          };
          if (isLink) {
            return (
              <a
                key={i}
                ref={(el) => { itemRefs.current[i] = el; }}
                className={cls}
                style={style}
                href={p.href}
              >
                {p.text}
              </a>
            );
          }
          return (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={cls}
              style={style}
            >
              {p.text}
            </div>
          );
        })}
      </div>
    </Draggable3D>
  );
}
