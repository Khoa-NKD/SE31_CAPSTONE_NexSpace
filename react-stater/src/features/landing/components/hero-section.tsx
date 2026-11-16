import React from 'react';
import { SearchCard, type SearchCriteria } from './search-card';
import { useLanguage } from '../context/language-context';

interface HeroSectionProps {
  criteria?: SearchCriteria;
  onChangeCriteria?: (criteria: SearchCriteria) => void;
  onSearch?: (criteria: SearchCriteria) => void;
  onFilterChange?: (criteria: SearchCriteria) => void;
}

export function HeroSection({
  criteria,
  onChangeCriteria,
  onSearch,
  onFilterChange
}: HeroSectionProps) {
  const { t } = useLanguage();

  return (
    <section className='relative overflow-hidden border-b border-slate-200/70 pt-10 pb-12 sm:pt-14 sm:pb-16 dark:border-slate-800/70'>
      {/* Subtle NexSpace purple/blue ambient accent */}
      <div
        className='pointer-events-none absolute -top-24 left-1/2 -z-10 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-indigo-500/8 blur-3xl dark:bg-indigo-500/15'
        aria-hidden='true'
      />

      <div className='relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-3xl'>
          <h1 className='font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white'>
            {t('hero.title')}
          </h1>

          <p className='mx-auto mt-3.5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300'>
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Primary Search Interface immediately below headline */}
        <SearchCard
          criteria={criteria}
          onChangeCriteria={onChangeCriteria}
          onSearch={onSearch}
          onFilterChange={onFilterChange}
        />
      </div>
    </section>
  );
}
