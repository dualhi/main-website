/**
 * TikTok carousel behaviour.
 *
 *  - Desktop (motion OK): a seamless marquee. The strip holds the same set of
 *    cards twice; we slide it left by exactly one set plus one gap and restart,
 *    so the second copy lands precisely where the first started. No gaps at the
 *    wrap point, no card ever overlapping another.
 *    Hovering the viewport slows the strip right down so you can read a cover;
 *    cards scale up on hover (CSS).
 *  - Mobile / reduced-motion: no auto-scroll — the viewport is a native
 *    swipeable strip (CSS) and the duplicate set is hidden.
 *
 * gsap.matchMedia() builds and cleans up per breakpoint, so resizing between
 * mobile and desktop just works; within a breakpoint we re-measure on resize.
 */
import gsap from 'gsap';

/** Marquee speed, in pixels per second. */
const SPEED = 55;

export function initTikTok(): void {
  const section = document.querySelector<HTMLElement>('#tiktok');
  if (!section) return;

  const viewport = section.querySelector<HTMLElement>('.tiktok-viewport');
  const track = section.querySelector<HTMLElement>('.tiktok-track');
  const firstSet = section.querySelector<HTMLElement>('.tiktok-set');
  if (!viewport || !track || !firstSet) return;

  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-marquee');

    let tween: gsap.core.Tween | null = null;

    const build = (): void => {
      tween?.kill();
      gsap.set(track, { x: 0 });

      // One full period = the width of a single set plus the gap that follows
      // it, which is exactly the offset that puts the clone where the original
      // began.
      const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
      const period = firstSet.offsetWidth + gap;
      if (!period) return;

      tween = gsap.to(track, {
        x: -period,
        duration: period / SPEED,
        ease: 'none',
        repeat: -1,
      });
    };

    build();

    const slow = () => tween && gsap.to(tween, { timeScale: 0.1, duration: 0.6, overwrite: true });
    const resume = () => tween && gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true });

    viewport.addEventListener('mouseenter', slow);
    viewport.addEventListener('mouseleave', resume);

    // Card widths are viewport-relative, so re-measure after a resize settles.
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      viewport.removeEventListener('mouseenter', slow);
      viewport.removeEventListener('mouseleave', resume);
      tween?.kill();
      section.classList.remove('is-marquee');
      gsap.set(track, { clearProps: 'transform,x' });
    };
  });
}
