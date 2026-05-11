import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Wraps the children with a fade-up animation that re-fires whenever the
 * route's pathname changes. Mounted inside the <Routes> wrapper so it
 * sees every page transition.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [stage, setStage] = useState(0); // 0 = visible, 1 = leaving

  // When the path changes, briefly remove the visible class so the animation
  // re-runs from its initial state.
  useEffect(() => {
    setStage(1);
    const t = setTimeout(() => setStage(0), 30);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div className={`page-transition ${stage === 0 ? 'is-shown' : 'is-leaving'}`} key={pathname}>
      {children}
    </div>
  );
}
