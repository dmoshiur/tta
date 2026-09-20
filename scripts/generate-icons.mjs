#!/usr/bin/env node
/**
 * ThinkTank Academia — PNG icon generator.
 * Rasterizes public/icon.svg (the brand emblem) into all PNG sizes needed
 * for favicons, PWA manifests, and apple-touch-icon.
 *
 * Usage: npm run icons   (requires the `sharp` dev dependency)
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = join(root, 'public', 'icon.svg');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const svgBuffer = readFileSync(svgPath);

/** Render the emblem at a given pixel size onto a solid background (or transparent). */
async function render(name, size, { background = null } = {}) {
  const pipeline = sharp(svgBuffer, { density: Math.max(72, Math.round((size / 512) * 300)) })
    .resize(size, size);
  if (background) {
    pipeline.flatten({ background });
  }
  await pipeline.png().toFile(join(outDir, name));
  console.log(`✓ public/icons/${name} (${size}×${size})`);
}

const jobs = [
  ['favicon-16.png', 16],
  ['favicon-32.png', 32],
  ['favicon-48.png', 48],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

for (const [name, size] of jobs) {
  await render(name, size);
}

// Maskable PWA icon: emblem on solid navy, extra safe-zone padding.
// The original emblem SVG is embedded as a nested <svg>, shrunk into the
// maskable safe zone (inner 80% of the canvas).
// For the maskable variant we drop the emblem's own rounded background rect
// so the artwork bleeds onto the flat navy canvas.
const innerSvg = readFileSync(svgPath, 'utf8')
  .replace(/<\?xml[^>]*>\s*/, '')
  .replace(/<rect[^>]*rx="118"[^>]*\/>/, '');
const maskableSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#071b33"/>
     <g transform="translate(51.2,51.2) scale(0.8)">${innerSvg}</g>
   </svg>`
);
await sharp(maskableSvg, { density: 300 }).resize(512, 512).png().toFile(join(outDir, 'icon-maskable-512.png'));
console.log('✓ public/icons/icon-maskable-512.png (512×512)');

// Update manifest icons list.
const manifestPath = join(root, 'public', 'manifest.webmanifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.icons = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
];
writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
console.log('✓ public/manifest.webmanifest updated with PNG icons');
