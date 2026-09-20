import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** Target number to count up to */
  end: number;
  /** Starting number (default 0) */
  start?: number;
  /** Animation duration in ms (default 1800) */
  duration?: number;
  /** Text shown after the number, e.g. "+" or "%" */
  suffix?: string;
  /** Text shown before the number */
  prefix?: string;
  /** Decimal places (default 0) */
  decimals?: number;
  /** Extra class for the number element */
  className?: string;
}

const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * CountUp — animated number counter. Starts counting when the element
 * scrolls into view; renders instantly for reduced-motion users.
 */
export const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 1800,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(start);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const run = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      if (reduced || typeof requestAnimationFrame === 'undefined') {
        setValue(end);
        return;
      }

      const t0 = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - t0) / duration, 1);
        setValue(start + (end - start) * easeOutExpo(progress));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') {
      run();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, start, duration]);

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={`count-up ${className}`.trim()}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
