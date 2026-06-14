/**
 * Generates placeholder raster images (JPEG) so the site builds and previews
 * before real assets exist. Run with: `npm run placeholders`.
 *
 * Uses `sharp` (a transitive dependency of Astro's image pipeline) to rasterize
 * a labeled SVG into each JPEG. Real assets simply replace these files —
 * keep the same paths/filenames and nothing in the code changes.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Build a dark, labeled SVG placeholder. */
function placeholderSVG(w, h, label, sub = '') {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect width="100%" height="100%" fill="#0a0a0a"/>
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#262626" stroke-width="2"/>
      <text x="50%" y="50%" fill="#3f3f3f" font-family="Arial, sans-serif"
            font-size="${Math.round(Math.min(w, h) / 12)}" font-weight="bold"
            text-anchor="middle" dominant-baseline="middle">${label}</text>
      ${sub ? `<text x="50%" y="${h / 2 + Math.round(Math.min(w, h) / 9)}" fill="#2a2a2a"
            font-family="Arial, sans-serif" font-size="${Math.round(Math.min(w, h) / 22)}"
            text-anchor="middle" dominant-baseline="middle">${sub}</text>` : ''}
    </svg>`);
}

async function write(path, w, h, label, sub) {
  const out = resolve(root, path);
  await mkdir(dirname(out), { recursive: true });
  await sharp(placeholderSVG(w, h, label, sub)).jpeg({ quality: 82 }).toFile(out);
  console.log('  ✓', path);
}

const jobs = [
  // Hero background + bio press photo (live in src/assets so the components
  // can import them statically).
  ['src/assets/hero-bg.jpg', 1920, 1080, 'HERO BG', 'replace src/assets/hero-bg.jpg'],
  ['src/assets/bio.jpg', 960, 1200, 'BIO PHOTO', 'replace src/assets/bio.jpg'],

  // OG share image.
  ['public/og-image.jpg', 1200, 630, 'DUALHÏ', 'replace public/og-image.jpg'],

  // Release cover art (square).
  ['content/releases/01-placeholder-track/cover.jpg', 600, 600, 'COVER 01'],
  ['content/releases/02-placeholder-track/cover.jpg', 600, 600, 'COVER 02'],
  ['content/releases/03-placeholder-track/cover.jpg', 600, 600, 'COVER 03'],

  // Press gallery (varied aspect ratios for a nice masonry layout).
  ['content/press/press-01.jpg', 800, 1000, 'PRESS 01'],
  ['content/press/press-02.jpg', 800, 600, 'PRESS 02'],
  ['content/press/press-03.jpg', 800, 1100, 'PRESS 03'],
  ['content/press/press-04.jpg', 800, 800, 'PRESS 04'],
  ['content/press/press-05.jpg', 800, 600, 'PRESS 05'],
  ['content/press/press-06.jpg', 800, 1000, 'PRESS 06'],
];

console.log('Generating placeholder images…');
for (const [path, w, h, label, sub] of jobs) {
  await write(path, w, h, label, sub);
}
console.log('Done.');
