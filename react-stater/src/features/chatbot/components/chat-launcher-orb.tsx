import { lazy } from 'react';
import { DeferredEffect } from '@/components/react-bits/effect-boundary';
const Orb = lazy(() => import('@/components/react-bits/Orb'));

export function ChatLauncherOrb() {
  return (
    <DeferredEffect className='pointer-events-none absolute -inset-3 overflow-hidden rounded-full'>
      <Orb
        colors={['#818cf8', '#38bdf8', '#c4b5fd']}
        speed={0.35}
        glow={0.5}
        wobble={0.3}
        hoverIntensity={0.2}
        rotateOnHover={false}
        clickPulse={false}
        intro={false}
      />
    </DeferredEffect>
  );
}
