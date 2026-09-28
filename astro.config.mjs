// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Public URL of the deployed site. Drives the canonical link, the absolute
  // OG/Twitter image URLs and the sitemap — so it MUST be the real domain,
  // never the Netlify preview host, or Google is told the canonical version
  // of every page lives somewhere else.
  site: 'https://wearedualhi.com',

  integrations: [
    tailwind({
      // We provide our own global stylesheet (src/styles/global.css)
      // that contains the @tailwind directives, so disable the default
      // injected base stylesheet.
      applyBaseStyles: false,
    }),
    // Emits /sitemap-index.xml + /sitemap-0.xml at build time; robots.txt
    // points search engines at it.
    sitemap(),
  ],

  // Astro automatically optimizes images imported from anywhere in the
  // project (including the root-level /content folder) via `astro:assets`.
  image: {
    // Allow remote images if ever needed (none used by default).
    domains: [],
  },
});
