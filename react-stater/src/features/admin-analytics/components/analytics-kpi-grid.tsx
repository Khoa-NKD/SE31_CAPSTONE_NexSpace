import React from 'react';
import { DoorOpen, Users, Store, ArrowUp } from 'lucide-react';

export function AnalyticsKpiGrid() {
  return (
    <section
      aria-label='Operational Utilization & Growth KPI Cards'
      className='grid grid-cols-1 md:grid-cols-3 gap-5'
    >
      {/* Card 1: Average Occupancy */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm hover:border-primary/40 transition-all'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <span className='text-xs font-semibold text-muted-foreground'>
              Platform-wide Average Occupancy
            </span>
            <div className='flex items-baseline gap-2.5 mt-1'>
              <span className='text-3xl font-extrabold tracking-tight text-foreground'>
                78.4%
              </span>
              <span className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'>
                <ArrowUp className='size-3 text-emerald-600 dark:text-emerald-400' />
                +4.2% MoM
              </span>
            </div>
          </div>
          <div className='size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary'>
            <DoorOpen className='size-5' />
          </div>
        </div>

        {/* Sparkline Visualization */}
        <div className='mt-4 pt-3 border-t border-border flex items-center justify-between'>
          <div className='w-40 h-8'>
            <svg
              className='w-full h-full overflow-visible'
              viewBox='0 0 160 36'
              aria-label='Occupancy trend sparkline'
            >
              <defs>
                <linearGradient id='grad-spark-1' x1='0%' y1='0%' x2='0%' y2='100%'>
                  <stop offset='0%' stopColor='#4F46E5' stopOpacity='0.25' />
                  <stop offset='100%' stopColor='#4F46E5' stopOpacity='0.0' />
                </linearGradient>
              </defs>
              <path
                d='M 0,28 Q 20,24 40,26 T 80,18 T 120,12 T 160,8 L 160,36 L 0,36 Z'
                fill='url(#grad-spark-1)'
              />
              <path
                d='M 0,28 Q 20,24 40,26 T 80,18 T 120,12 T 160,8'
                fill='none'
                stroke='#4F46E5'
                strokeLinecap='round'
                strokeWidth='2'
              />
              <circle cx='160' cy='8' fill='#4F46E5' r='3' />
            </svg>
          </div>
          <p className='text-[11px] text-muted-foreground text-right max-w-[170px] leading-tight'>
            Peak desk utilization reached{' '}
            <strong className='text-foreground font-bold'>92.1%</strong> at 14:00 ICT
          </p>
        </div>
      </div>

      {/* Card 2: User Cohort Retention */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm hover:border-primary/40 transition-all'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <span className='text-xs font-semibold text-muted-foreground'>
              User Cohort Retention (30D)
            </span>
            <div className='flex items-baseline gap-2.5 mt-1'>
              <span className='text-3xl font-extrabold tracking-tight text-foreground'>
                64.2%
              </span>
              <span className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'>
                <ArrowUp className='size-3 text-emerald-600 dark:text-emerald-400' />
                +3.1% vs Q4
              </span>
            </div>
          </div>
          <div className='size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400'>
            <Users className='size-5' />
          </div>
        </div>

        {/* Sparkline */}
        <div className='mt-4 pt-3 border-t border-border flex items-center justify-between'>
          <div className='w-40 h-8'>
            <svg
              className='w-full h-full overflow-visible'
              viewBox='0 0 160 36'
              aria-label='Retention trend sparkline'
            >
              <defs>
                <linearGradient id='grad-spark-2' x1='0%' y1='0%' x2='0%' y2='100%'>
                  <stop offset='0%' stopColor='#10B981' stopOpacity='0.25' />
                  <stop offset='100%' stopColor='#10B981' stopOpacity='0.0' />
                </linearGradient>
              </defs>
              <path
                d='M 0,26 Q 25,29 50,22 T 100,16 T 135,14 T 160,6 L 160,36 L 0,36 Z'
                fill='url(#grad-spark-2)'
              />
              <path
                d='M 0,26 Q 25,29 50,22 T 100,16 T 135,14 T 160,6'
                fill='none'
                stroke='#10B981'
                strokeLinecap='round'
                strokeWidth='2'
              />
              <circle cx='160' cy='6' fill='#10B981' r='3' />
            </svg>
          </div>
          <p className='text-[11px] text-muted-foreground text-right max-w-[170px] leading-tight'>
            <strong className='text-foreground font-bold'>4,820</strong> active corporate &amp; nomad accounts
          </p>
        </div>
      </div>

      {/* Card 3: Organizer Hub Growth */}
      <div className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm hover:border-primary/40 transition-all'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <span className='text-xs font-semibold text-muted-foreground'>
              Organizer Growth Rate
            </span>
            <div className='flex items-baseline gap-2.5 mt-1'>
              <span className='text-3xl font-extrabold tracking-tight text-foreground'>
                +14 Hubs
              </span>
              <span className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'>
                <ArrowUp className='size-3 text-emerald-600 dark:text-emerald-400' />
                +18.5% QoQ
              </span>
            </div>
          </div>
          <div className='size-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400'>
            <Store className='size-5' />
          </div>
        </div>

        {/* Sparkline */}
        <div className='mt-4 pt-3 border-t border-border flex items-center justify-between'>
          <div className='w-40 h-8'>
            <svg
              className='w-full h-full overflow-visible'
              viewBox='0 0 160 36'
              aria-label='Organizer growth sparkline'
            >
              <defs>
                <linearGradient id='grad-spark-3' x1='0%' y1='0%' x2='0%' y2='100%'>
                  <stop offset='0%' stopColor='#F59E0B' stopOpacity='0.25' />
                  <stop offset='100%' stopColor='#F59E0B' stopOpacity='0.0' />
                </linearGradient>
              </defs>
              <path
                d='M 0,30 Q 30,28 65,22 T 115,16 T 145,10 T 160,4 L 160,36 L 0,36 Z'
                fill='url(#grad-spark-3)'
              />
              <path
                d='M 0,30 Q 30,28 65,22 T 115,16 T 145,10 T 160,4'
                fill='none'
                stroke='#F59E0B'
                strokeLinecap='round'
                strokeWidth='2'
              />
              <circle cx='160' cy='4' fill='#F59E0B' r='3' />
            </svg>
          </div>
          <p className='text-[11px] text-muted-foreground text-right max-w-[170px] leading-tight'>
            Total <strong className='text-foreground font-bold'>86</strong> verified workspace partners across VN &amp; SG
          </p>
        </div>
      </div>
    </section>
  );
}
