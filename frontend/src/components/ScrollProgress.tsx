import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.tsx';

/**
 * ScrollProgress — a gradient progress bar pinned to the top of the
 * viewport that fills as the user scrolls, plus a floating
 * back-to-top button that appears after scrolling down.
 */
export const ScrollProgress: React.FC = () => {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY || doc.scrollTop;
      setProgress(max > 0 ? Math.min((y / max) * 100, 100) : 0);
      setShowTop(y > 560);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <>
      <div className="scroll-progress-track" aria-hidden="true">
        <div className="scroll-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <button
        className={`back-to-top ${showTop ? 'show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label={t('a11y.backToTop')}
      >
        ↑
      </button>
    </>
  );
};
