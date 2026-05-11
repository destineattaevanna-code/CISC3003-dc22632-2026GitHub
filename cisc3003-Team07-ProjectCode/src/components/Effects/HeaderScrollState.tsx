import React, { useEffect } from 'react';

/**
 * Adds `data-scrolled` and `data-scrolldir` attributes to <html> based on
 * scroll position and direction. CSS reads these to morph the global header
 * (glassmorphism, shrink, hide on scroll-down, etc).
 */
export default function HeaderScrollState() {
  useEffect(() => {
    let lastSet = -1;
    let rafId = 0;
    const root = document.documentElement;

    const apply = () => {
      rafId = 0;
      const y = window.scrollY;
      const next = y > 24 ? 1 : 0;
      if (next !== lastSet) {
        root.setAttribute('data-scrolled', String(next));
        lastSet = next;
      }
    };
    const tick = () => {
      if (!rafId) rafId = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', tick, { passive: true });
    return () => {
      window.removeEventListener('scroll', tick);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
  return null;
}
