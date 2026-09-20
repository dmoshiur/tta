import React from 'react';

/**
 * Official ThinkTank Academia brand artwork.
 * ONE master file — the user's official logo (1408×768, white background):
 *   /brand/logo.png
 * It is used EXACTLY as provided site-wide. On dark surfaces the logo sits on
 * its native white background inside a small white chip (the artwork itself is
 * never altered, recolored, or cropped).
 */
export const BRAND = {
  logo: '/brand/logo.png',
  emblem: '/brand/logo.png',
  width: 1408,
  height: 768,
  name: 'ThinkTank Academia',
} as const;

export const BrandLogo: React.FC<{
  /** kept for API compatibility; artwork is identical on every surface — on dark surfaces a white chip wraps it */
  surface?: 'light' | 'dark';
  className?: string;
  alt?: string;
}> = ({ surface = 'light', className, alt = BRAND.name }) => (
  <img
    src={BRAND.logo}
    alt={alt}
    width={BRAND.width}
    height={BRAND.height}
    className={`brand-logo-img${surface === 'dark' ? ' brand-logo-on-dark' : ''}${className ? ` ${className}` : ''}`}
    draggable={false}
  />
);

/** The official logo used as a compact emblem — shown contain-style. */
export const BrandEmblem: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src={BRAND.logo}
    alt=""
    width={BRAND.width}
    height={BRAND.height}
    className={`brand-emblem-img${className ? ` ${className}` : ''}`}
    draggable={false}
  />
);
