import React, { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  /** delay in ms */
  delay?: number;
  /** translation distance */
  y?: number;
  /** className passthrough */
  className?: string;
  /** as= tag, default div */
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Reveal-on-scroll wrapper. Uses IntersectionObserver to add a class
 * the first time the element enters the viewport.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  className = '',
  as = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      });
    }, { rootMargin: '-10% 0px -10% 0px', threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      className={`reveal ${shown ? 'is-shown' : ''} ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        ['--reveal-y' as any]: `${y}px`,
      }}
    >
      {children}
    </Tag>
  );
}
