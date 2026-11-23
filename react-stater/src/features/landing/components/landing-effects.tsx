import { lazy, useRef, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { NexSpaceLogo } from '@/components/brand/logo';
import { DeferredEffect } from '@/components/react-bits/effect-boundary';

const ElectricLogo = lazy(() => import('@/components/react-bits/ElectricLogo'));

export function LandingReveal({
  children,
  className,
  delay = 0
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const entered = useInView(root, { once: true, amount: 0.12 });
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={root}
      className={className}
      initial={false}
      animate={entered && !reduced ? { opacity: [0.35, 1], y: [18, 0] } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function ElectricBrand() {
  return (
    <span className='ns-electric-brand'>
      <NexSpaceLogo className='h-9 w-auto' />
      <DeferredEffect className='ns-electric-layer'>
        <ElectricLogo
          src='/logo-mark.svg'
          color='#a5b4fc'
          glowColor='#38bdf8'
          scale={0.65}
          intensity={0.6}
          glow={0.6}
          thickness={1.05}
          strands={2}
          bend={0.18}
          crackle={0.3}
          arcs={0.12}
          flicker={0.05}
          speed={0.6}
          cursorIntensity={0.3}
        />
      </DeferredEffect>
    </span>
  );
}
