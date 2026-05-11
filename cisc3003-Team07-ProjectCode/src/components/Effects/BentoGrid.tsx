import React from 'react';
import Tilt3D from '../Tilt3D';
import Spotlight from './Spotlight';

interface BentoCardSpec {
  key: string;
  title: string;
  description: string;
  emoji: string;
  gradient: string;
  /** spans (1 = small, 2 = wide, 3 = full row). default 1 */
  span?: 1 | 2 | 3;
  /** optional content rendered beside the title (image, big number, etc.) */
  decoration?: React.ReactNode;
}

interface BentoGridProps {
  cards: BentoCardSpec[];
  className?: string;
}

/**
 * Modern "bento" feature grid — a mix of asymmetric cards with hover
 * spotlight + 3D tilt. Replaces the boring tabbed feature section.
 */
export default function BentoGrid({ cards, className = '' }: BentoGridProps) {
  return (
    <div className={`bento-grid ${className}`}>
      {cards.map((c) => (
        <Tilt3D
          key={c.key}
          max={6}
          perspective={1200}
          className={`bento-tile-wrap span-${c.span ?? 1}`}
        >
          <Spotlight color="rgba(255,255,255,0.18)" className="bento-tile-spot">
            <div className="bento-tile" style={{ background: c.gradient }}>
              <div className="bento-tile-overlay" />
              <div className="bento-tile-emoji" aria-hidden>{c.emoji}</div>
              <div className="bento-tile-content">
                <h3 className="bento-tile-title">{c.title}</h3>
                <p className="bento-tile-desc">{c.description}</p>
                {c.decoration && <div className="bento-tile-decor">{c.decoration}</div>}
              </div>
            </div>
          </Spotlight>
        </Tilt3D>
      ))}
    </div>
  );
}
