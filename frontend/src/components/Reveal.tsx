import React, { useEffect, useRef, useState } from 'react';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'zoom' | 'flip' | 'fade';

interface RevealProps {
  children: React.ReactNode;
  /** Animation direction / style (default: up) */
  direction?: RevealDirection;
  /** Delay in milliseconds before the entrance animation plays */
  delay?: number;
  /** Extra class merged onto the wrapper */
  className?: string;
  /** Render a semantic tag for the wrapper (default: div) */
  as?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
  id?: string;
}

/**
 * Reveal — IntersectionObserver-powered scroll entrance animation.
 * Children stay hidden until they scroll into view, then animate in once.
 * Respects `prefers-reduced-motion` (content is shown immediately).
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  className = '',
  as: Tag = 'div',
  style,
  id,
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Wrapper = Tag as React.ElementType;

  return (
    <Wrapper
      ref={ref}
      id={id}
      className={`reveal reveal-${direction} ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ ...style, transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Wrapper>
  );
};

/**
 * RevealGroup — wraps a list of children and staggers their entrance
 * animations automatically (each child delayed by `stagger` ms).
 */
export const RevealGroup: React.FC<{
  children: React.ReactNode;
  direction?: RevealDirection;
  stagger?: number;
  className?: string;
}> = ({ children, direction = 'up', stagger = 90, className = '' }) => {
  const items = React.Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <Reveal key={i} direction={direction} delay={Math.min(i * stagger, 720)} className={className}>
          {child}
        </Reveal>
      ))}
    </>
  );
};
