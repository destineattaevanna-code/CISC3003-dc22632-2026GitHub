import { useEffect } from 'react';

/**
 * Attaches a global pointer tracker that updates CSS variables `--mx/--my`
 * on every `.isv-cursor-light` element, enabling a cursor-following light.
 * Uses rAF to coalesce events → no jank.
 */
export default function CursorLight() {
  useEffect(() => {
    const nodes: HTMLElement[] = Array.from(
      document.querySelectorAll<HTMLElement>('.isv-cursor-light')
    );
    if (nodes.length === 0) return;

    let rafId = 0;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      rafId = 0;
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        const x = ((lastX - r.left) / r.width) * 100;
        const y = ((lastY - r.top) / r.height) * 100;
        if (x >= -10 && x <= 110 && y >= -10 && y <= 110) {
          el.style.setProperty('--mx', `${x}%`);
          el.style.setProperty('--my', `${y}%`);
        }
      });
    };

    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
  return null;
}
