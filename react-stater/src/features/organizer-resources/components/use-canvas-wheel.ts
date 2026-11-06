import { useEffect, type RefObject } from 'react';

/** Non-passive listening keeps canvas zoom from triggering the browser's page zoom. */
export function useCanvasWheel(
  ref: RefObject<SVGSVGElement | null>,
  zoom: (factor: number) => void,
  enabled: boolean
) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [ref, zoom, enabled]);
}
