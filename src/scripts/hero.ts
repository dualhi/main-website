/**
 * Hero scroll animation.
 *
 * Drives the "diamond opening" effect with GSAP ScrollTrigger:
 *   - The hero stage is pinned for one extra viewport of scroll.
 *   - As you scroll, the two shards slide apart (desktop) or scale + fade
 *     (mobile) while the press photo + wordmark fade in behind them.
 *
 * Robustness:
 *   - gsap.matchMedia() builds a different timeline per breakpoint and cleans
 *     up automatically on resize / breakpoint change.
 *   - prefers-reduced-motion: skip the animation, show the final state.
 *   - On window resize, ScrollTrigger.refresh() recalculates pin distances
 *     (matchMedia already wires this, but we also refresh once fonts/images
 *     settle to avoid early mis-measurement).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>('#hero');
  if (!hero) return;

  const pin = hero.querySelector<HTMLElement>('.hero-pin');
  const content = hero.querySelector<HTMLElement>('.hero-content');
  const wordmark = hero.querySelector<HTMLElement>('.hero-wordmark');
  const tagline = hero.querySelector<HTMLElement>('.hero-tagline');
  const cue = hero.querySelector<HTMLElement>('.hero-scroll-cue');
  const shard1 = hero.querySelector<HTMLElement>('.scaglia-1');
  const shard2 = hero.querySelector<HTMLElement>('.scaglia-2');

  if (!pin || !content || !wordmark || !shard1 || !shard2) return;

  // ---- Reduced motion: reveal everything, no scroll-jacking. -----------
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReduced.matches) {
    gsap.set([content, wordmark, tagline], { opacity: 1 });
    gsap.set([shard1, shard2], { opacity: 0 });
    if (cue) gsap.set(cue, { opacity: 0 });
    return;
  }

  const mm = gsap.matchMedia();

  // Shared timeline builder; `spread` controls how far shards travel.
  const build = (config: {
    distance: string;
    end: string;
    lateral: boolean;
  }) => {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: config.end,
        scrub: 0.6,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Reveal background + wordmark.
    tl.to(content, { opacity: 1, duration: 0.5 }, 0);
    tl.fromTo(
      wordmark,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5 },
      0.35, // slightly delayed vs. the shards opening
    );
    if (tagline) {
      tl.fromTo(tagline, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
    }
    if (cue) tl.to(cue, { opacity: 0, duration: 0.2 }, 0);

    // Shards.
    if (config.lateral) {
      tl.to(shard1, { x: `-${config.distance}`, scale: 1.5, duration: 0.8 }, 0);
      tl.to(shard2, { x: config.distance, scale: 1.5, duration: 0.8 }, 0);
    } else {
      tl.to([shard1, shard2], { scale: 2.2, duration: 0.8 }, 0);
    }
    // Fade shards out as they leave so the wordmark reads cleanly.
    tl.to([shard1, shard2], { opacity: 0, duration: 0.35 }, 0.5);

    return tl;
  };

  // Desktop / wide: full lateral slide off-screen.
  mm.add('(min-width: 768px)', () => {
    build({ distance: '80vw', end: '+=110%', lateral: true });
  });

  // Mobile / narrow: simplified — scale up + fade (no big lateral travel).
  mm.add('(max-width: 767px)', () => {
    build({ distance: '90vw', end: '+=80%', lateral: false });
  });

  // Re-measure once images/fonts have loaded (pin distance depends on layout).
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}
