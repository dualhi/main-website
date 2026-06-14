/**
 * TikTok carousel behaviour.
 *
 *  - Desktop (motion OK): a seamless infinite marquee built from a SINGLE set
 *    of cards (no duplicated iframes). Each card wraps around via transforms
 *    using GSAP's `horizontalLoop` technique, so the iframes are never reloaded
 *    or duplicated. Hovering the viewport slows the loop right down so you can
 *    press play; cards scale up on hover (CSS).
 *  - Mobile / reduced-motion: no auto-scroll — the viewport is a native
 *    swipeable strip (CSS), we just don't start the loop.
 *
 * gsap.matchMedia() builds/cleans the loop per breakpoint, so resizing between
 * mobile and desktop just works.
 */
import gsap from 'gsap';

export function initTikTok(): void {
  const section = document.querySelector<HTMLElement>('#tiktok');
  if (!section) return;

  const viewport = section.querySelector<HTMLElement>('.tiktok-viewport');
  const track = section.querySelector<HTMLElement>('.tiktok-track');
  if (!viewport || !track) return;

  const cards = gsap.utils.toArray<HTMLElement>('.tiktok-card', track);
  if (!cards.length) return;

  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-marquee');

    const loop = horizontalLoop(cards, { speed: 0.55, repeat: -1, paddingRight: 16 });

    const slow = () => gsap.to(loop, { timeScale: 0.1, duration: 0.6, overwrite: true });
    const resume = () => gsap.to(loop, { timeScale: 1, duration: 0.6, overwrite: true });

    viewport.addEventListener('mouseenter', slow);
    viewport.addEventListener('mouseleave', resume);

    return () => {
      viewport.removeEventListener('mouseenter', slow);
      viewport.removeEventListener('mouseleave', resume);
      loop.kill();
      section.classList.remove('is-marquee');
      gsap.set(cards, { clearProps: 'transform,xPercent' });
    };
  });
}

/**
 * Seamless horizontal loop of equal-flow items using transforms only (so the
 * embedded iframes are never moved in the DOM or reloaded). Adapted from the
 * well-known GSAP `horizontalLoop` helper, trimmed to a plain repeating loop.
 */
interface LoopConfig {
  speed?: number; // multiplier; ~1 = 100px/s
  repeat?: number;
  paddingRight?: number; // trailing gap so the wrap matches the visual gap
  snap?: number | false;
}

function horizontalLoop(items: HTMLElement[], config: LoopConfig = {}): gsap.core.Timeline {
  const tl = gsap.timeline({
    repeat: config.repeat ?? -1,
    defaults: { ease: 'none' },
    onReverseComplete() {
      this.totalTime(this.rawTime() + this.duration() * 100);
    },
  });

  const length = items.length;
  const startX = items[0].offsetLeft;
  const widths: number[] = [];
  const xPercents: number[] = [];
  const pixelsPerSecond = (config.speed ?? 1) * 100;
  const snap =
    config.snap === false ? (v: number) => v : gsap.utils.snap(config.snap || 1);

  // Record current widths & x positions as xPercent so resizing scales nicely.
  gsap.set(items, {
    xPercent: (i: number, el: Element) => {
      const w = (widths[i] = parseFloat(gsap.getProperty(el, 'width', 'px') as string));
      xPercents[i] = snap(
        (parseFloat(gsap.getProperty(el, 'x', 'px') as string) / w) * 100 +
          (gsap.getProperty(el, 'xPercent') as number),
      );
      return xPercents[i];
    },
  });
  gsap.set(items, { x: 0 });

  const totalWidth =
    items[length - 1].offsetLeft +
    (xPercents[length - 1] / 100) * widths[length - 1] -
    startX +
    items[length - 1].offsetWidth * (gsap.getProperty(items[length - 1], 'scaleX') as number) +
    (config.paddingRight || 0);

  for (let i = 0; i < length; i++) {
    const item = items[i];
    const curX = (xPercents[i] / 100) * widths[i];
    const distanceToStart = item.offsetLeft + curX - startX;
    const distanceToLoop =
      distanceToStart + widths[i] * (gsap.getProperty(item, 'scaleX') as number);

    tl.to(
      item,
      {
        xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
        duration: distanceToLoop / pixelsPerSecond,
      },
      0,
    ).fromTo(
      item,
      { xPercent: snap(((curX - distanceToLoop + totalWidth) / widths[i]) * 100) },
      {
        xPercent: xPercents[i],
        duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
        immediateRender: false,
      },
      distanceToLoop / pixelsPerSecond,
    );
  }

  // Pre-render once so the loop starts seamlessly.
  tl.progress(1, true).progress(0, true);
  return tl;
}
