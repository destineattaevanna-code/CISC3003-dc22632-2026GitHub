import React, { useEffect, useMemo, useRef, useState } from 'react';

interface SlotNumberProps {
  value: number;
  /** Total number of digit slots (left-padded with zeros if smaller). */
  pad?: number;
  /** Animation duration. */
  duration?: number;
  /** Display prefix. */
  prefix?: string;
  /** Display suffix. */
  suffix?: string;
  className?: string;
}

const DIGITS = '0123456789';

/**
 * Slot-machine style number that rolls each digit independently.
 * Each digit is a vertical strip of 0-9 that translates up/down to land
 * on the target value.
 */
export default function SlotNumber({
  value,
  pad = 0,
  duration = 1100,
  prefix,
  suffix,
  className = '',
}: SlotNumberProps) {
  const [animated, setAnimated] = useState(value);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(value);

  useEffect(() => {
    fromRef.current = animated;
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(fromRef.current + (value - fromRef.current) * eased);
      setAnimated(cur);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Format the rolling string respecting `pad` and group separators.
  const display = useMemo(() => {
    const abs = Math.abs(animated);
    const grouped = abs.toLocaleString('en-US');
    if (pad > 0 && grouped.length < pad) return grouped.padStart(pad, '0');
    return grouped;
  }, [animated, pad]);

  return (
    <span className={`slot-number ${className}`} aria-label={`${prefix || ''}${value}${suffix || ''}`}>
      {prefix && <span className="slot-number-prefix">{prefix}</span>}
      {Array.from(display).map((ch, i) => {
        if (DIGITS.indexOf(ch) === -1) {
          return <span key={i} className="slot-sep">{ch}</span>;
        }
        const n = parseInt(ch, 10);
        return (
          <span key={i} className="slot-digit" aria-hidden>
            <span
              className="slot-digit-strip"
              style={{ transform: `translateY(-${n * 10}%)` }}
            >
              {DIGITS.split('').map((d) => (
                <span key={d} className="slot-digit-cell">{d}</span>
              ))}
            </span>
          </span>
        );
      })}
      {suffix && <span className="slot-number-suffix">{suffix}</span>}
    </span>
  );
}
