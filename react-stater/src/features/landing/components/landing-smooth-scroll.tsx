import { useEffect } from 'react';
import type Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/** Use the landing scroller when mounted, otherwise retain native anchor scrolling. */
export function scrollLandingTo(target: HTMLElement) {
  const event = new CustomEvent<HTMLElement>('nexspace:landing-scroll', {
    detail: target,
    cancelable: true
  });
  if (document.dispatchEvent(event)) {
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  }
}

/** Keep native touch, anchors, nested panels and modal scroll locks intact. */
export function LandingSmoothScroll() {
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let instance: Lenis | undefined;
    let generation = 0;
    const scrollToTarget = (event: Event) => {
      if (!instance || instance.isStopped) return;
      const target = (event as CustomEvent<HTMLElement>).detail;
      event.preventDefault();
      instance.scrollTo(target, { offset: -80 });
    };
    document.addEventListener('nexspace:landing-scroll', scrollToTarget);
    const isLocked = () =>
      document.body.hasAttribute('data-scroll-locked') ||
      getComputedStyle(document.body).overflow === 'hidden';
    const syncLock = () => {
      if (isLocked()) instance?.stop();
      else instance?.start();
    };
    const lockObserver = new MutationObserver(syncLock);
    lockObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'data-scroll-locked']
    });

    const sync = async () => {
      const current = ++generation;
      instance?.destroy();
      instance = undefined;
      if (!desktop.matches || reduced.matches) return;
      try {
        const { default: Lenis } = await import('lenis');
        if (current !== generation) return;
        instance = new Lenis({
          autoRaf: true,
          lerp: 0.14,
          syncTouch: false,
          anchors: false,
          allowNestedScroll: true,
          prevent: (node) =>
            node.matches(
              '[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]'
            ),
          virtualScroll: () =>
            !isLocked() && getComputedStyle(document.documentElement).overflow !== 'hidden'
        });
        syncLock();
      } catch {
        // Native scrolling remains available if the optional enhancement cannot load.
      }
    };

    void sync();
    desktop.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      generation++;
      document.removeEventListener('nexspace:landing-scroll', scrollToTarget);
      lockObserver.disconnect();
      desktop.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
      instance?.destroy();
    };
  }, []);

  return null;
}
