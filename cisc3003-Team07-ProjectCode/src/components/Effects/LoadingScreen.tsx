import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'isv_intro_seen_v2';

interface LoadingScreenProps {
  /** Force the loader to show even if previously seen. */
  force?: boolean;
  /** Skip on subsequent visits in same session. */
  oncePerSession?: boolean;
}

/**
 * Brief brand intro shown on first load. Auto-fades out after a short
 * progress animation. Respects sessionStorage so we don't replay it on
 * every route change / refresh during a session.
 */
export default function LoadingScreen({ force = false, oncePerSession = true }: LoadingScreenProps) {
  const [show, setShow] = useState<boolean>(() => {
    if (force) return true;
    if (typeof window === 'undefined') return false;
    if (!oncePerSession) return true;
    return sessionStorage.getItem(STORAGE_KEY) !== '1';
  });
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    let raf = 0;
    const start = performance.now();
    const total = 1500; // ms
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      setProgress(Math.round(t * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setLeaving(true);
        setTimeout(() => {
          setShow(false);
          if (oncePerSession) sessionStorage.setItem(STORAGE_KEY, '1');
        }, 550);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, oncePerSession]);

  if (!show) return null;

  return (
    <div className={`isv-loader ${leaving ? 'is-leaving' : ''}`} role="status" aria-label="Loading iSuperviz">
      <div className="isv-loader-inner">
        <div className="isv-loader-glow" />
        <svg viewBox="0 0 200 200" width="120" height="120" className="isv-loader-mark">
          <defs>
            <linearGradient id="iLoaderG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#722ed1" />
              <stop offset="50%" stopColor="#eb2f96" />
              <stop offset="100%" stopColor="#fa8c16" />
            </linearGradient>
          </defs>
          {/* outer ring */}
          <circle cx="100" cy="100" r="86" fill="none" stroke="url(#iLoaderG)" strokeWidth="3"
                  strokeDasharray="540" strokeDashoffset="540" className="isv-loader-ring" />
          {/* inner orbit */}
          <circle cx="100" cy="100" r="60" fill="none" stroke="url(#iLoaderG)" strokeWidth="2"
                  strokeDasharray="377" strokeDashoffset="377" className="isv-loader-ring isv-loader-ring--2" />
          {/* core */}
          <circle cx="100" cy="100" r="30" fill="url(#iLoaderG)" className="isv-loader-core" />
          {/* sparkles */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <circle
              key={i}
              cx={100 + 75 * Math.cos((deg - 90) * Math.PI / 180)}
              cy={100 + 75 * Math.sin((deg - 90) * Math.PI / 180)}
              r="3"
              fill="#fff"
              className="isv-loader-spark"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </svg>
        <div className="isv-loader-name">
          <span>i</span><span>S</span><span>u</span><span>p</span><span>e</span><span>r</span><span>v</span><span>i</span><span>z</span>
        </div>
        <div className="isv-loader-tag">CISC3003 · Team 07</div>
        <div className="isv-loader-progress">
          <div className="isv-loader-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="isv-loader-pct">{progress}%</div>
      </div>
    </div>
  );
}
