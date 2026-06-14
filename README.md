# Dualhï — Press Kit Site

One-page showcase / press kit for **Dualhï** (dance-pop / melodic EDM duo — Kevin
Romero & Cristiano Gautier). Built with **Astro + Tailwind CSS + GSAP
ScrollTrigger**, optimized for static deploy on **Netlify**.

The site is intentionally content-driven: you can update releases, press photos,
the bio, links and SEO **without touching layout or animation code**.

---

## Quick start

```bash
npm install            # install dependencies
npm run placeholders   # generate placeholder images (only needed before real assets exist)
npm run dev            # local dev server at http://localhost:4321
npm run build          # production build -> dist/
npm run preview        # preview the production build locally
```

> Node 18+ required (Netlify is pinned to Node 22 in `netlify.toml`).

---

## Project structure

```
content/                     ← EDITABLE CONTENT (no code here)
  releases/                  ← one folder per release
    01-placeholder-track/
      cover.jpg              ← cover art
      data.json              ← title, spotify embed, date, description
  press/                     ← gallery photos (any filenames)
    press-01.jpg …

src/
  assets/
    logo/                    ← scaglia-1.svg, scaglia-2.svg, wordmark.svg
    hero-bg.jpg              ← hero background photo
    bio.jpg                  ← bio section photo
  components/                ← Hero, Releases, Bio, PressGallery, Links, Footer
  layouts/BaseLayout.astro   ← <head>, SEO/OG meta, fonts
  lib/
    site.ts                  ← site name, SEO defaults, contact, social links, stat
    content.ts               ← loads releases + press images from /content
  pages/index.astro          ← composes the sections
  scripts/hero.ts            ← GSAP ScrollTrigger hero animation
  styles/global.css          ← Tailwind + base styles

public/
  og-image.jpg               ← social share image

scripts/gen-placeholders.mjs ← regenerates placeholder images
```

---

## How to… (content updates)

### Add a new release

1. Create a folder under `content/releases/`. **Prefix with a number** to keep
   ordering predictable, e.g. `content/releases/04-new-single/`.
2. Add a square **`cover.jpg`** (`.png` / `.webp` also work).
3. Add a **`data.json`**:

   ```json
   {
     "title": "New Single",
     "spotifyEmbedUrl": "https://open.spotify.com/embed/track/XXXXXX?utm_source=generator",
     "releaseDate": "2025-03-14",
     "description": "One or two sentences about the track."
   }
   ```

   **`spotifyEmbedUrl` accepts any Spotify link for the track** — it is
   normalized automatically. You can paste:
   - the normal share link (Spotify → ⋯ → **Share → Copy Song Link**), e.g.
     `https://open.spotify.com/intl-it/track/ID?si=…`
   - the embed `src` URL (Share → **Embed track**), e.g.
     `https://open.spotify.com/embed/track/ID?utm_source=generator`
   - or even the whole `<iframe …>` snippet (the `src` is extracted).

   All three are converted to the correct `/embed/…` URL at build time.

That's it — the card appears automatically. Releases are sorted **newest first**
by `releaseDate`.

### Add photos to the press gallery

Drop image files into `content/press/` (e.g. `press-07.jpg`). They are picked up
automatically, sorted by filename, and optimized at build time. Mixed aspect
ratios look good in the masonry grid.

### Add / change TikTok videos

Edit the array in **`content/tiktok/videos.json`** — one TikTok **video URL**
per line:

```json
[
  "https://www.tiktok.com/@wearedualhi/video/7300000000000000000",
  "https://www.tiktok.com/@wearedualhi/video/7300000000000000001"
]
```

Get the URL from the TikTok app/site: open the video → **Share → Copy link**
(works with the full `…/video/<id>` link). Add as many as you like — 10+ makes
the auto-scrolling carousel look best. Any line that isn't a valid video URL
(like the `PASTE_VIDEO_ID_HERE` placeholders) shows a branded card linking to
the profile, so the section never looks broken.

Each card embeds TikTok's clean player directly (real preview, paused — press
play to watch; no caption). The carousel auto-scrolls on desktop (slows on
hover), and becomes a swipeable strip on mobile. Speed/feel knobs are in
`src/scripts/tiktok.ts`: `speed` (in the `horizontalLoop` call) = scroll speed,
and the `timeScale` values = how much it slows on hover.

### Change the hero / bio photos

Replace `src/assets/hero-bg.jpg` and `src/assets/bio.jpg` with your own files
(keep the same names). They are imported by the components and optimized
automatically.

### Edit the bio text & stat

- Text: edit the three paragraphs in `src/components/Bio.astro`.
- The highlight stat ("3M+ Spotify streams"): edit `SITE.stat` in `src/lib/site.ts`.

### Edit contact email, social links, SEO

All in **`src/lib/site.ts`**:

- `SITE` — name, `<title>`, meta description, tagline, OG image, stat.
- `CONTACT` — booking/management email + label.
- `SOCIALS` — platform links (`primary: true` also shows in the footer).

### Replace the logo

Drop the real SVGs into `src/assets/logo/`, keeping the filenames
`scaglia-1.svg`, `scaglia-2.svg`, `wordmark.svg`. Keep `fill="currentColor"` so
colour stays CSS-controlled. The hero colour treatment (shard 1 solid, shard 2
outline) lives in `src/components/Hero.astro` under the `<style>` block —
adjust `.scaglia--outline` there if the real art needs a different treatment.

---

## The hero animation

Defined in `src/scripts/hero.ts`. On scroll, the two shards slide apart while the
press photo + wordmark fade in (wordmark slightly delayed). It is:

- **Responsive** — `gsap.matchMedia()` builds a full lateral slide on desktop
  (≥768px) and a simplified scale-and-fade on mobile (<768px).
- **Resize-safe** — timelines rebuild on breakpoint change; `ScrollTrigger`
  re-measures after fonts/images load.
- **Accessible** — respects `prefers-reduced-motion` (reveals the final state
  with no scroll-jacking).

Tuning knobs are at the bottom of the file (travel `distance`, pin length `end`,
`scrub`).

---

## Deploy to Netlify

`netlify.toml` is already configured (`npm run build` → publish `dist/`).

**Option A — Git:** push the repo to GitHub/GitLab and "Import from Git" on
Netlify. Builds run automatically on every push.

**Option B — CLI:**

```bash
npm i -g netlify-cli
netlify deploy --build           # draft preview
netlify deploy --build --prod    # production
```

After choosing the final domain, update `site:` in `astro.config.mjs` so OG /
canonical URLs are correct.
