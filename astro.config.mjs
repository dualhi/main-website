// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // Public URL of the deployed site. Used for absolute SEO/OG URLs.
  // Update this to the final production domain before launch.
  site: 'https://dualhi.netlify.app',

  integrations: [
    tailwind({
      // We provide our own global stylesheet (src/styles/global.css)
      // that contains the @tailwind directives, so disable the default
      // injected base stylesheet.
      applyBaseStyles: false,
    }),
  ],

  // Astro automatically optimizes images imported from anywhere in the
  // project (including the root-level /content folder) via `astro:assets`.
  image: {
    // Allow remote images if ever needed (none used by default).
    domains: [],
  },
});
