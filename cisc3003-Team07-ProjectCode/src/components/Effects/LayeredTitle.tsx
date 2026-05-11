import React from 'react';

interface LayeredTitleProps {
  /** Each word becomes one 3D layer. */
  words: string[];
  /** CSS font-size for each word, in px. */
  fontSize?: number;
  /** Maximum z-translate per word (px). */
  maxZ?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a title where every word floats at its own Z depth so the line
 * gains palpable depth when wrapped in a Draggable3D / Tilt3D / ParallaxHero.
 *
 * Each word also gets its own subtle hover lift.
 */
export default function LayeredTitle({ words, fontSize = 60, maxZ = 80, className = '', style }: LayeredTitleProps) {
  const N = words.length;
  return (
    <h1
      className={`layered-title ${className}`}
      style={{ fontSize, ...style }}
    >
      {words.map((w, i) => {
        // alternate words forward/backward by a sin wave so the depth varies
        const z = Math.sin((i / Math.max(1, N - 1)) * Math.PI) * maxZ;
        return (
          <span
            key={i}
            className="layered-title-word"
            style={{
              transform: `translateZ(${z.toFixed(1)}px)`,
              animationDelay: `${i * 80}ms`,
            }}
          >
            {w}
          </span>
        );
      })}
    </h1>
  );
}
