import React, { useEffect, useState } from 'react';

/**
 * Animated gradient bar at the very top of the viewport showing
 * how far the user has scrolled.
 */
export default function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const compute = () => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      setPct(Math.min(100, Math.max(0, (h.scrollTop / max) * 100)));
    };
    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, []);

  return (
    <div className="scroll-progress-track" aria-hidden>
      <div className="scroll-progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
