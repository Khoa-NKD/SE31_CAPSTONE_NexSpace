import React from 'react';
import { CalendarCheck2, LayoutGrid, Search } from 'lucide-react';
import { useLanguage } from '../context/language-context';

export function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    {
      stepNumber: '01',
      titleKey: 'how.step1.title',
      descKey: 'how.step1.desc',
      icon: Search
    },
    {
      stepNumber: '02',
      titleKey: 'how.step2.title',
      descKey: 'how.step2.desc',
      icon: LayoutGrid
    },
    {
      stepNumber: '03',
      titleKey: 'how.step3.title',
      descKey: 'how.step3.desc',
      icon: CalendarCheck2
    }
  ];

  return (
    <section
      id='how-it-works'
      className='scroll-mt-20 border-b border-slate-200/70 py-14 sm:py-16 dark:border-slate-800/70'
    >
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-2xl text-center'>
          <h2 className='font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white'>
            {t('how.title')}
          </h2>
          <p className='mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400'>
            {t('how.subtitle')}
          </p>
        </div>

        <div className='mt-8 grid grid-cols-1 gap-5 md:grid-cols-3'>
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.stepNumber}
                className='relative flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-[#4b41e1] dark:bg-indigo-950/60 dark:text-indigo-400'>
                    <Icon className='h-5 w-5' />
                  </div>
                  <span className='font-mono text-xs font-bold text-slate-400 dark:text-slate-500'>
                    {step.stepNumber}
                  </span>
                </div>

                <h3 className='font-display mt-4 text-base font-bold text-slate-900 dark:text-white'>
                  {t(step.titleKey)}
                </h3>
                <p className='mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400'>
                  {t(step.descKey)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
