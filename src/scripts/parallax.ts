/**
 * Press gallery parallax.
 *
 * Each photo drifts vertically as the gallery scrolls through the viewport,
 * with photos further down moving a little faster. Because a faster (lower)
 * photo rises toward the slower one above it — and later DOM elements paint on
 * top — the photos gently overlap as you scroll. Inspired by martingarrix.com,
 * kept deliberately subtle.
 *
 * Robustness:
 *   - gsap.matchMedia(): a stronger effect on desktop, a lighter one on mobile,
 *     auto-rebuilt/cleaned on breakpoint change.
 *   - prefers-reduced-motion: no movement at all.
 *   - Function-based values + invalidateOnRefresh: distances recompute on
 *     resize and after fonts/images load.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initPressParallax(): void {
  const section = document.querySelector<HTMLElement>('#press');
  if (!section) return;

  const items = gsap.utils.toArray<HTMLElement>('#press .press-item');
  if (!items.length) return;

  // Respect reduced-motion: leave everything static.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const mm = gsap.matchMedia();

  // `intensity` scales the whole effect per breakpoint.
  const build = (intensity: number) => {
    items.forEach((el, i) => {
      // Travel in px: lower-in-document photos move more (→ they "catch up"
      // and overlap the ones above). Tune base/step to taste:
      //   first number  = overall movement of every photo
      //   `i *` number   = extra speed per photo down the page (= overlap)
      const travel = (36 + i * 24) * intensity;

      gsap.fromTo(
        el,
        { y: travel },
        {
          y: -travel,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom', // begins as the section enters the viewport
            end: 'bottom top', //   ends as it leaves
            scrub: 0.6, //          smooth, slightly lagged follow
            invalidateOnRefresh: true,
          },
        },
      );
    });
  };

  // Desktop / tablet: full subtle effect.
  mm.add('(min-width: 768px)', () => build(1));
  // Mobile: lighter, so full-width photos don't overlap too heavily.
  mm.add('(max-width: 767px)', () => build(0.45));

  // Re-measure once images/fonts settle (gallery height drives the distances).
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}
