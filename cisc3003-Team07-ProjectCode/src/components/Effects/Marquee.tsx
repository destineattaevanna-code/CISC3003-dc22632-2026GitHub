import React from 'react';

interface MarqueeProps {
  /** Items rendered into the marquee. They are duplicated for seamless loop. */
  items: React.ReactNode[];
  /** Animation duration in seconds. */
  duration?: number;
  /** Reverse direction. */
  reverse?: boolean;
  className?: string;
}

/**
 * Infinite-loop horizontal marquee. The list is duplicated so the animation
 * looks seamless. Pauses on hover for legibility.
 */
export default function Marquee({ items, duration = 24, reverse = false, className = '' }: MarqueeProps) {
  const cells = [...items, ...items];
  return (
    <div className={`marquee ${className}`} aria-hidden>
      <div
        className="marquee-track"
        style={{
          animationDuration: `${duration}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {cells.map((c, i) => (
          <div className="marquee-cell" key={i}>{c}</div>
        ))}
      </div>
    </div>
  );
}
