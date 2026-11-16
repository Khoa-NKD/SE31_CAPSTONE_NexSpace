import React from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../context/language-context';

export function PartnerCtaSection() {
  const { t } = useLanguage();

  return (
    <section id='list-space' className='scroll-mt-20 py-14 sm:py-16'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-start justify-between gap-6 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50/80 p-6 sm:p-8 shadow-xs md:flex-row md:items-center dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900'>
          <div className='flex items-start gap-4'>
            <div className='hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#4b41e1]/10 text-[#4b41e1] dark:bg-indigo-500/20 dark:text-indigo-400'>
              <Building2 className='h-6 w-6' />
            </div>
            <div>
              <h2 className='font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white'>
                {t('partner.title')}
              </h2>
              <p className='mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
                {t('partner.subtitle')}
              </p>
            </div>
          </div>

          <Button
            asChild
            className='w-full sm:w-auto shrink-0 rounded-xl bg-[#4b41e1] hover:bg-[#4338CA] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 active:scale-[0.98]'
          >
            <Link to='/organizer/apply' className='inline-flex items-center justify-center gap-2'>
              <span>{t('partner.cta')}</span>
              <ArrowRight className='h-4 w-4' />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
