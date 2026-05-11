import React, { useRef } from 'react';

interface SpotlightProps {
  children: React.ReactNode;
  className?: string;
  /** colour of the spotlight glow */
  color?: string;
}

/**
 * Adds a moving radial highlight that follows the cursor inside the
 * wrapped element. Works great as a card-hover effect.
 */
export default function Spotlight({ children, className = '', color = 'rgba(146,84,222,0.25)' }: SpotlightProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--spot-x', `${x}%`);
    el.style.setProperty('--spot-y', `${y}%`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`spotlight ${className}`}
      style={{ ['--spot-color' as any]: color }}
    >
      {children}
    </div>
  );
}
