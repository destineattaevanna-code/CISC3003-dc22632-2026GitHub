import React, { useEffect, useState } from 'react';
import { RocketOutlined } from '@ant-design/icons';

/**
 * Floating "rocket" button that appears after scrolling.
 * Click → smooth scroll to top + a quick rocket-launch animation.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const launch = () => {
    setLaunching(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setLaunching(false), 900);
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={launch}
      className={`back-to-top ${visible ? 'is-visible' : ''} ${launching ? 'is-launching' : ''}`}
    >
      <span className="back-to-top-flame" aria-hidden />
      <RocketOutlined />
    </button>
  );
}
