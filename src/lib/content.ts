/**
 * Content loaders.
 *
 * These helpers read the editable content that lives OUTSIDE of /src, in the
 * root-level /content folder, so non-developers can add releases and press
 * photos by dropping files into folders — no code changes required.
 *
 *   content/releases/<NN-slug>/data.json   + cover.(jpg|jpeg|png|webp)
 *   content/press/<anything>.(jpg|jpeg|png|webp)
 *
 * Astro still optimizes every image (lazy loading, responsive sizes) because
 * we import them through Vite's `import.meta.glob`, which yields the same
 * `ImageMetadata` objects you'd get from a normal `import`.
 */
import type { ImageMetadata } from 'astro';

/* ------------------------------------------------------------------ */
/*  Releases                                                          */
/* ------------------------------------------------------------------ */

/** Shape of each content/releases/<folder>/data.json file. */
export interface ReleaseData {
  title: string;
  /** Full Spotify *embed* URL, e.g. https://open.spotify.com/embed/track/XXatXX */
  spotifyEmbedUrl: string;
  /** ISO date string, e.g. "2024-09-12". Used for display + sorting. */
  releaseDate: string;
  /** 1–2 sentence blurb. */
  description: string;
  /**
   * Optional streaming links shown in the release popup, e.g.
   * { "Apple Music": "https://…" }. Spotify is added automatically.
   */
  links?: Record<string, string>;
}

export interface Release extends ReleaseData {
  /** Folder name, e.g. "01-midnight-drive". */
  slug: string;
  /** Optimized cover image (may be undefined if no cover file present). */
  cover?: ImageMetadata;
}

/**
 * Normalizes whatever you paste from Spotify into a working embed URL.
 * Accepts any of these and returns a proper `/embed/...` URL:
 *   - the full <iframe …> embed snippet (src is extracted)
 *   - a normal share link, e.g. https://open.spotify.com/intl-it/track/ID?si=…
 *   - an already-correct embed URL (returned as-is)
 */
export function normalizeSpotifyEmbed(input: string): string {
  if (!input) return '';
  const value = input.trim();

  // If a full <iframe …> snippet was pasted, pull out the src URL.
  const iframeSrc = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  let url = iframeSrc ? iframeSrc[1] : value;

  // Convert a normal Spotify link (optionally with an intl-xx prefix and ?si=)
  // into the embeddable form. Already-embed URLs are left untouched.
  const parts = url.match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/i,
  );
  if (parts && !url.includes('/embed/')) {
    url = `https://open.spotify.com/embed/${parts[1]}/${parts[2]}?utm_source=generator`;
  }

  return url;
}

// Eagerly import all release data + covers at build time.
const releaseData = import.meta.glob<{ default: ReleaseData }>(
  '../../content/releases/*/data.json',
  { eager: true },
);

const releaseCovers = import.meta.glob<{ default: ImageMetadata }>(
  '../../content/releases/*/cover.{jpg,jpeg,png,webp,avif}',
  { eager: true, import: 'default' },
);

/** Extract the release folder name from a globbed file path. */
function folderOf(path: string): string {
  // ".../content/releases/01-foo/data.json" -> "01-foo"
  const match = path.match(/releases\/([^/]+)\//);
  return match ? match[1] : path;
}

/**
 * Returns all releases, sorted newest-first by releaseDate (falling back to
 * the folder name, which is why numeric prefixes like 01-, 02- are handy).
 */
export function getReleases(): Release[] {
  const covers = new Map<string, ImageMetadata>();
  for (const [path, cover] of Object.entries(releaseCovers)) {
    covers.set(folderOf(path), cover as unknown as ImageMetadata);
  }

  const releases: Release[] = Object.entries(releaseData).map(([path, mod]) => {
    const slug = folderOf(path);
    return {
      slug,
      cover: covers.get(slug),
      ...mod.default,
      // Accept any Spotify link/iframe and normalize to a working embed URL.
      spotifyEmbedUrl: normalizeSpotifyEmbed(mod.default.spotifyEmbedUrl),
    };
  });

  return releases.sort((a, b) => {
    const da = Date.parse(a.releaseDate);
    const db = Date.parse(b.releaseDate);
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return db - da;
    // Fallback: reverse folder order so higher numeric prefixes show first.
    return b.slug.localeCompare(a.slug);
  });
}

/* ------------------------------------------------------------------ */
/*  Full catalogue                                                    */
/* ------------------------------------------------------------------ */

/** One entry of content/releases.json — the complete discography. */
export interface CatalogueEntry {
  slug: string;
  title: string;
  /** Full credit line, e.g. "Dualhi & KEL". */
  artists: string;
  releaseDate: string;
  /** Remote cover art (Apple CDN), optimized by Astro at build time. */
  cover: string;
  appleUrl?: string;
  spotifyUrl?: string;
  /** Pin this release as the featured one on /music (falls back to newest). */
  featured?: boolean;
}

import catalogueJson from '../../content/releases.json';

/** Every release, newest first. */
export function getCatalogue(): CatalogueEntry[] {
  return [...(catalogueJson as CatalogueEntry[])].sort((a, b) =>
    b.releaseDate.localeCompare(a.releaseDate),
  );
}

/** Catalogue grouped by year, newest year first. */
export function getCatalogueByYear(): { year: string; items: CatalogueEntry[] }[] {
  const groups = new Map<string, CatalogueEntry[]>();
  for (const r of getCatalogue()) {
    const y = r.releaseDate.slice(0, 4);
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y)!.push(r);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, items]) => ({ year, items }));
}

/** True when the release is recent enough to badge as new. */
export function isNewRelease(iso: string, days = 60): boolean {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return false;
  return Date.now() - d < days * 24 * 60 * 60 * 1000;
}

/* ------------------------------------------------------------------ */
/*  Press gallery                                                     */
/* ------------------------------------------------------------------ */

export interface PressImage {
  src: ImageMetadata;
  /** Derived from the filename, used for alt text. */
  name: string;
}

const pressFiles = import.meta.glob<ImageMetadata>(
  '../../content/press/*.{jpg,jpeg,png,webp,avif}',
  { eager: true, import: 'default' },
);

/** Returns all press images, sorted by filename. */
export function getPressImages(): PressImage[] {
  return Object.entries(pressFiles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, src]) => {
      const file = path.split('/').pop() ?? path;
      const name = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      return { src: src as unknown as ImageMetadata, name };
    });
}

/* ------------------------------------------------------------------ */
/*  TikTok carousel                                                   */
/* ------------------------------------------------------------------ */

export interface TikTokVideo {
  /** The raw value from content/tiktok/videos.json (URL or placeholder). */
  url: string;
  /** Numeric video id, or null if it's a placeholder / unrecognized URL. */
  id: string | null;
  /** Player iframe URL, only when a valid id was found. */
  embedUrl: string | null;
  /** Local cover art: content/tiktok/covers/<id>.jpg, when present. */
  cover?: ImageMetadata;
}

// Read the editable list of TikTok video links.
const tiktokList = import.meta.glob<{ default: string[] }>(
  '../../content/tiktok/videos.json',
  { eager: true },
);

// Cover art for each video: content/tiktok/covers/<video id>.<ext>
const tiktokCovers = import.meta.glob<ImageMetadata>(
  '../../content/tiktok/covers/*.{jpg,jpeg,png,webp,avif}',
  { eager: true, import: 'default' },
);

/** Pull the numeric video id out of any TikTok video URL. */
function extractTikTokId(url: string): string | null {
  if (!url) return null;
  const m =
    url.match(/\/video\/(\d{6,})/) || // …/@user/video/123…
    url.match(/\/(?:embed\/v2|player\/v1)\/(\d{6,})/) || // an embed/player URL
    url.match(/^(\d{6,})$/); // bare id
  return m ? m[1] : null;
}

/**
 * Returns the TikTok videos for the carousel. Each entry in
 * content/tiktok/videos.json is a TikTok video URL; entries that aren't a
 * recognizable video URL render as branded placeholder cards (linking to the
 * profile) so the section still looks right before real links are added.
 */
export function getTikToks(): TikTokVideo[] {
  const list = Object.values(tiktokList)[0]?.default ?? [];
  return list.map((url) => {
    const id = extractTikTokId(url);
    // We embed via TikTok's official blockquote + embed.js (see TikTokCard /
    // TikTok.astro), which only needs the id + url. embedUrl is kept for
    // reference (the canonical embed endpoint).
    const coverEntry = id
      ? Object.entries(tiktokCovers).find(([path]) => path.includes(`/covers/${id}.`))
      : undefined;

    return {
      url,
      id,
      embedUrl: id ? `https://www.tiktok.com/embed/v2/${id}` : null,
      cover: coverEntry ? (coverEntry[1] as unknown as ImageMetadata) : undefined,
    };
  });
}
