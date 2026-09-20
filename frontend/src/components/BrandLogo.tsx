import React from 'react';

/**
 * BrandLogo — renders the OFFICIAL ThinkTank Academia logo artwork.
 *
 * The supplied logo already contains the "ThinkTank ACADEMIA" wordmark and
 * the "Learn • Think • Understand • Unite" tagline, so no brand text is
 * rendered beside it (per brand guidelines).
 *
 * Variants:
 *   surface="light" → artwork tuned for light backgrounds  (/brand/logo-light.svg)
 *   surface="dark"  → artwork tuned for dark backgrounds   (/brand/logo-dark.svg)
 *
 * Original proportions (640 × 400) are always preserved — height scales,
 * width follows automatically.
 */
export const BRAND = {
  logoForLight: '/brand/logo-light.svg',
  logoForDark: '/brand/logo-dark.svg',
  emblem: '/brand/emblem.svg',
} as const;

export const BrandLogo: React.FC<{
  surface?: 'light' | 'dark';
  className?: string;
}> = ({ surface = 'light', className = '' }) => (
  <img
    src={surface === 'dark' ? BRAND.logoForDark : BRAND.logoForLight}
    alt="ThinkTank Academia — Learn • Think • Understand • Unite"
    className={`brand-logo-img${className ? ` ${className}` : ''}`}
    width={640}
    height={400}
    decoding="async"
    draggable={false}
  />
);

export const BrandEmblem: React.FC<{ className?: string; alt?: string }> = ({
  className = '',
  alt = '',
}) => (
  <img
    src={BRAND.emblem}
    alt={alt}
    className={className}
    width={240}
    height={210}
    decoding="async"
    draggable={false}
  />
);
