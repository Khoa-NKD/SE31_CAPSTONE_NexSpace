import { useLanguage } from '../context/language-context';
import { LandingReveal } from './landing-effects';
import { lazy, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { DeferredEffect } from '@/components/react-bits/effect-boundary';
const GridMotion = lazy(() => import('@/components/react-bits/GridMotion'));
const gallery = ['editorial', 'meeting', 'lounge', 'studio'].map((name) => ({
  src: `/images/landing/workspace-${name}.jpg`,
  alt: ''
}));
export function HowItWorksSection() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: root, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [-14, 14]);
  const { t, language } = useLanguage();
  return (
    <section ref={root} id='how-it-works' className='ns-how scroll-mt-20'>
      <div className='ns-shell ns-how-grid'>
        <LandingReveal>
          <figure className='ns-how-image'>
            <motion.div
              className='absolute inset-0'
              style={reduced ? undefined : { y, scale: 1.08 }}
            >
              <img
                src='/images/landing/workspace-meeting.jpg'
                alt={
                  language === 'vi'
                    ? 'Văn phòng với các phòng họp kính sáng thoáng'
                    : 'A bright office with glass meeting rooms'
                }
                loading='lazy'
                width={1000}
                height={700}
              />
              <DeferredEffect renderer='dom' className='ns-how-motion'>
                <GridMotion
                  items={gallery}
                  rows={3}
                  aspectRatio={1.25}
                  gap={14}
                  radius={16}
                  angle={-10}
                  tilt={3}
                  speed={7}
                  parallax={0.16}
                  spotlight={0.15}
                  dim={0.02}
                  fade={0.08}
                />
              </DeferredEffect>
            </motion.div>
            <figcaption>
              {language === 'vi'
                ? 'Một góc làm việc mới. Một ngày nhiều cảm hứng.'
                : 'A fresh space. A different kind of day.'}
            </figcaption>
          </figure>
        </LandingReveal>
        <LandingReveal className='ns-how-copy'>
          <p className='ns-eyebrow'>NEXSPACE, YOUR WAY</p>
          <h2>{t('how.title')}</h2>
          <p>{t('how.subtitle')}</p>
          {[1, 2, 3].map((step) => (
            <div className='ns-how-step' key={step}>
              <span>0{step}</span>
              <div>
                <h3>{t(`how.step${step}.title`)}</h3>
                <p>{t(`how.step${step}.desc`)}</p>
              </div>
            </div>
          ))}
        </LandingReveal>
      </div>
    </section>
  );
}
