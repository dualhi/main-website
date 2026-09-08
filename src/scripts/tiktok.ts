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

  // Keep the official embeds showing their cover instead of TikTok's
  // end-of-video "related videos" panel.
  initEmbedRefresh(section, viewport);

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


/* ------------------------------------------------------------------ */
/*  Embed refresh                                                     */
/* ------------------------------------------------------------------ */

/**
 * TikTok's official embed is a cross-origin iframe: we can't read its state or
 * control playback, and after a clip ends (or after the embed has been sitting
 * around for a while) it swaps in a "related videos" panel plus TikTok's own
 * promos — unrelated content we don't want on the page.
 *
 * The only lever we have is reloading the iframe, which brings it back to the
 * video's cover. So each card is reset:
 *   - as soon as it scrolls out of the carousel viewport (invisible, no flash);
 *   - or, if it has stayed in view untouched for a while, on a timer.
 *
 * A card the visitor has actually interacted with is left alone — nobody gets
 * their video yanked away mid-watch — until the pointer has been away from it
 * for a while. Resets pause entirely while the tab is in the background.
 */
const OFFSCREEN_MIN_MS = 15_000; // don't reset the same card more often
const ONSCREEN_MAX_MS = 30_000; // stayed in view untouched this long → reset
const ENGAGED_COOLDOWN_MS = 45_000; // after interaction, leave it be this long
const TICK_MS = 5_000;

interface CardState {
  lastReset: number;
  visible: boolean;
  hovered: boolean;
  engagedUntil: number;
}

function initEmbedRefresh(section: HTMLElement, viewport: HTMLElement): void {
  const state = new WeakMap<HTMLElement, CardState>();
  const now = () => Date.now();

  const cards = () => Array.from(section.querySelectorAll<HTMLElement>('.tiktok-card'));

  const stateOf = (card: HTMLElement): CardState => {
    let s = state.get(card);
    if (!s) {
      s = { lastReset: now(), visible: true, hovered: false, engagedUntil: 0 };
      state.set(card, s);
    }
    return s;
  };

  const reset = (card: HTMLElement): void => {
    const iframe = card.querySelector<HTMLIFrameElement>('iframe');
    if (!iframe || !iframe.src) return;
    const s = stateOf(card);
    if (now() < s.engagedUntil) return;
    if (now() - s.lastReset < OFFSCREEN_MIN_MS) return;
    s.lastReset = now();
    // Swapping in a fresh clone of the iframe is the one reliable way to force
    // the embed back to its cover frame: re-assigning the same `src` is not
    // guaranteed to re-navigate, and the iframe is cross-origin so we can't
    // reload it from the inside.
    const fresh = iframe.cloneNode(false) as HTMLIFrameElement;
    iframe.replaceWith(fresh);
  };

  // Mark a card as "in use" when the visitor points at or clicks into it.
  // Clicks land inside the cross-origin iframe, so we catch them via the focus
  // shift that a click on an iframe produces.
  const markEngaged = (card: HTMLElement): void => {
    stateOf(card).engagedUntil = now() + ENGAGED_COOLDOWN_MS;
  };

  section.addEventListener('pointerdown', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.tiktok-card');
    if (card) markEngaged(card);
  });

  window.addEventListener('blur', () => {
    const active = document.activeElement;
    if (!(active instanceof HTMLIFrameElement)) return;
    const card = active.closest<HTMLElement>('.tiktok-card');
    if (card) markEngaged(card);
  });

  section.addEventListener('pointerover', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.tiktok-card');
    if (card) stateOf(card).hovered = true;
  });
  section.addEventListener('pointerout', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.tiktok-card');
    if (card) stateOf(card).hovered = false;
  });

  // Out of the carousel viewport → reset now, while nobody can see the reload.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        const s = stateOf(card);
        s.visible = entry.isIntersecting;
        if (!entry.isIntersecting) reset(card);
      }
    },
    { root: viewport, threshold: 0 },
  );

  const observe = () => cards().forEach((card) => io.observe(card));
  observe();

  // embed.js swaps each blockquote for an iframe asynchronously; re-observe as
  // the carousel's DOM settles.
  new MutationObserver(observe).observe(section, { childList: true, subtree: true });

  window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    for (const card of cards()) {
      const s = stateOf(card);
      if (!s.visible || s.hovered) continue;
      if (now() - s.lastReset < ONSCREEN_MAX_MS) continue;
      reset(card);
    }
  }, TICK_MS);
}
