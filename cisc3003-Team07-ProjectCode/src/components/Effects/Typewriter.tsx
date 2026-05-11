import React, { useEffect, useRef, useState } from 'react';

interface TypewriterProps {
  /** Strings to cycle through. */
  words: string[];
  typeSpeed?: number;   // ms per char
  eraseSpeed?: number;  // ms per char (erase)
  pause?: number;       // ms pause when full
  loop?: boolean;
  className?: string;
}

/**
 * Looping typewriter effect.
 */
export default function Typewriter({
  words,
  typeSpeed = 75,
  eraseSpeed = 35,
  pause = 1300,
  loop = true,
  className,
}: TypewriterProps) {
  const [text, setText] = useState('');
  const [i, setI] = useState(0);
  const [erasing, setErasing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const word = words[i % words.length] || '';
    if (!erasing) {
      if (text.length < word.length) {
        timer.current = setTimeout(() => setText(word.slice(0, text.length + 1)), typeSpeed);
      } else {
        timer.current = setTimeout(() => setErasing(true), pause);
      }
    } else {
      if (text.length > 0) {
        timer.current = setTimeout(() => setText(word.slice(0, text.length - 1)), eraseSpeed);
      } else {
        setErasing(false);
        setI((v) => loop ? (v + 1) : Math.min(v + 1, words.length - 1));
      }
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [text, erasing, i, words, typeSpeed, eraseSpeed, pause, loop]);

  return (
    <span className={`typewriter ${className || ''}`}>
      {text}
      <span className="typewriter-caret" aria-hidden>|</span>
    </span>
  );
}
