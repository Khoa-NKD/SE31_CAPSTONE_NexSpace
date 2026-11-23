import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useInView } from 'motion/react';

class AnimationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

let webGlAvailable: boolean | undefined;
function supportsWebGl() {
  if (webGlAvailable !== undefined) return webGlAvailable;
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    webGlAvailable = Boolean(context);
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webGlAvailable = false;
  }
  return webGlAvailable;
}

/** Decorative effects never replace essential content or run in hidden/reduced-motion views. */
export function DeferredEffect({
  children,
  className,
  renderer = 'webgl'
}: {
  children: ReactNode;
  className?: string;
  renderer?: 'webgl' | 'dom';
}) {
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { margin: '60px' });
  const [active, setActive] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () =>
      setActive(!preference.matches && !document.hidden && (renderer === 'dom' || supportsWebGl()));
    update();
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [renderer]);
  return (
    <div ref={root} className={className} aria-hidden='true'>
      {active && inView && (
        <AnimationBoundary>
          <Suspense fallback={null}>{children}</Suspense>
        </AnimationBoundary>
      )}
    </div>
  );
}
