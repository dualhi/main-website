/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}'],
  theme: {
    extend: {
      colors: {
        // Strict black & white palette. "ink" / "paper" semantic aliases
        // make it easy to invert sections later if needed.
        ink: '#000000',
        paper: '#ffffff',
      },
      fontFamily: {
        // Heavy display face for big bold titles (hero, section headings).
        display: ['"Archivo Black"', 'Impact', 'system-ui', 'sans-serif'],
        // Clean grotesk for body copy, labels, links.
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
      maxWidth: {
        content: '1280px',
      },
      transitionTimingFunction: {
        // Matches the easing used in the GSAP hero for visual consistency.
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
