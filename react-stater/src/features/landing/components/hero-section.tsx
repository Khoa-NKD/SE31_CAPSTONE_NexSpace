import { lazy, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, Search } from '@/components/ui/hugeicons';
import { SearchCard, type SearchCriteria } from './search-card';
import { useLanguage } from '../context/language-context';
import BlurText from '@/components/react-bits/BlurText';
import { AuroraText } from '@/components/ui/aurora-text';
import { DeferredEffect } from '@/components/react-bits/effect-boundary';
import { LandingReveal } from './landing-effects';
import { highlightSearchCard } from './search-card-highlight';
import { scrollLandingTo } from './landing-smooth-scroll';
const GridScan = lazy(() => import('@/components/react-bits/GridScan'));
interface HeroSectionProps {
  criteria?: SearchCriteria;
  onChangeCriteria?: (criteria: SearchCriteria) => void;
  onSearch?: (criteria: SearchCriteria) => void;
  onFilterChange?: (criteria: SearchCriteria) => void;
}
export function HeroSection(props: HeroSectionProps) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -28]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.35]);
  const { language, t } = useLanguage();
  const vi = language === 'vi';
  const title = t('hero.title');
  const titleBreak = title.indexOf(vi ? ' phù hợp' : ' workspace');
  const titleLines =
    titleBreak > 0 ? [title.slice(0, titleBreak), title.slice(titleBreak + 1)] : [title];
  return (
    <section ref={root} className='ns-hero' aria-labelledby='landing-title'>
      <DeferredEffect className='ns-hero-background'>
        <GridScan
          enableWebcam={false}
          enableGyro={false}
          showPreview={false}
          interactive={false}
          parallax={0}
          clickEffect='none'
          dpr={0.6}
          linesColor='#495379'
          scanColor='#aa97ff'
          glow={0.42}
          scanDuration={9}
          scanDelay={3}
          intro={false}
        />
      </DeferredEffect>
      <div className='ns-shell'>
        <div className='ns-hero-grid'>
          <motion.div className='ns-hero-copy' style={reduced ? undefined : { y, opacity }}>
            <LandingReveal>
              <p className='ns-eyebrow'>
                <span className='ns-status-dot' />
                {vi ? 'KHÔNG GIAN MỚI. CẢM HỨNG MỚI.' : 'A NEW SPACE. A FRESH PERSPECTIVE.'}
              </p>
            </LandingReveal>
            <h1 id='landing-title' className='ns-hero-title'>
              {titleLines.map((line, index) =>
                index === 1 ? (
                  <AuroraText key={`${language}-${index}`} className='ns-hero-aurora' speed={0.8}>
                    {line}
                  </AuroraText>
                ) : (
                  <BlurText
                    key={`${language}-${index}`}
                    text={line}
                    animateBy='words'
                    trigger='load'
                    delay={32}
                    stepDuration={0.2}
                    blur={4}
                    distance={12}
                    animationFrom={{ opacity: 1, filter: 'blur(2px)', y: 8 }}
                    animationTo={[{ opacity: 1, filter: 'blur(0px)', y: 0 }]}
                    className='ns-heading-reveal'
                  />
                )
              )}
            </h1>
            <LandingReveal delay={0.1}>
              <p className='ns-hero-description'>{t('hero.subtitle')}</p>
            </LandingReveal>
            <LandingReveal delay={0.16} className='ns-hero-links'>
              <a
                href='#landing-search-card'
                className='ns-primary-link'
                onClick={(event) => {
                  highlightSearchCard();
                  const target = document.getElementById('landing-search-card');
                  if (target) {
                    event.preventDefault();
                    scrollLandingTo(target);
                  }
                }}
              >
                {vi ? 'Tìm không gian của bạn' : 'Find your space'}
                <Search size={18} className='transition-transform duration-200 group-hover:scale-110' />
              </a>
              <a
                href='#how-it-works'
                className='ns-text-link'
                onClick={(event) => {
                  const target = document.getElementById('how-it-works');
                  if (target) {
                    event.preventDefault();
                    scrollLandingTo(target);
                  }
                }}
              >
                {vi ? 'Cách hoạt động' : 'How it works'}
                <ArrowDown size={16} />
              </a>
            </LandingReveal>
          </motion.div>
        </div>
        <LandingReveal delay={0.18} className='ns-search-wrap'>
          <SearchCard {...props} />
        </LandingReveal>
      </div>
    </section>
  );
}
