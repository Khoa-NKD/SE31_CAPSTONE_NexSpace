import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { SearchCard } from './search-card';
import { PartnerLogos } from './partner-logos';
import { useLanguage } from '../context/language-context';
import type { WorkspaceType } from '../api/types';

interface HeroSectionProps {
  onSearch?: (criteria: { mode: WorkspaceType; location: string; capacity: string }) => void;
}

export function HeroSection({ onSearch }: HeroSectionProps) {
  const { t } = useLanguage();

  return (
    <section className='border-border/60 relative overflow-hidden border-b pt-16 pb-20'>
      {/* Subtle local ambient hero illumination */}
      <div
        className='pointer-events-none absolute -top-24 left-1/2 -z-10 h-[480px] w-[750px] -translate-x-1/2 rounded-full bg-indigo-500/8 blur-3xl dark:bg-indigo-500/15'
        aria-hidden='true'
      />

      <div className='relative mx-auto max-w-[1440px] px-6 text-center lg:px-12'>
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mx-auto max-w-4xl'
        >
          <div className='border-indigo-200 bg-indigo-50/90 text-[#4b41e1] dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide shadow-2xs'>
            <span className='bg-[#4b41e1] h-2 w-2 animate-pulse rounded-full' />
            <span>{t('hero.badge')}</span>
            <Sparkles className='h-3.5 w-3.5 text-indigo-500' />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='text-foreground font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl'
          >
            {t('hero.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='text-muted-foreground mx-auto mt-5 max-w-3xl text-lg font-normal leading-relaxed sm:text-xl'
          >
            {t('hero.subtitle')}
          </motion.p>
        </motion.div>

        {/* Elevated Search Engine Card with Motion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <SearchCard onSearch={onSearch} />
        </motion.div>

        {/* Enterprise Partner Logos Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <PartnerLogos />
        </motion.div>
      </div>
    </section>
  );
}
