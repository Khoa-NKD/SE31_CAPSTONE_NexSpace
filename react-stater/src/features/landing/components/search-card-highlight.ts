/** Highlight the search destination without delaying navigation or changing search criteria. */
export function highlightSearchCard() {
  const frame = document.getElementById('landing-search-card');
  if (!frame?.closest('.landing-premium')) return;
  const ring = frame.querySelector<HTMLElement>('[data-search-orbit]');
  if (!ring) return;
  ring.getAnimations().forEach((animation) => animation.cancel());
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ring.animate(
    reduced
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }]
      : [
          { '--ns-search-angle': '0deg', opacity: 1 },
          { '--ns-search-angle': '720deg', opacity: 1, offset: 0.9 },
          { '--ns-search-angle': '800deg', opacity: 0 }
        ],
    { duration: reduced ? 400 : 2000, easing: 'linear' }
  );
}
