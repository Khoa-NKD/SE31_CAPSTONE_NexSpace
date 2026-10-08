import React from 'react';
import { Calculator, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

function handleTalkAdvisor() {
  toast.info('Workspace Advisor Request Initiated', {
    description: 'A commercial strategist will reach out within 15 minutes.'
  });
}

function handleCalculateRoi() {
  toast.info('Interactive ROI Model', {
    description: 'Opening commercial lease efficiency calculator...'
  });
}

export function EnterpriseCta() {
  return (
    <section id='enterprise' className='scroll-mt-20 py-16'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Architectural Navy Banner */}
        <div className='custom-level-3 relative overflow-hidden rounded-2xl border border-slate-800 bg-[#131b2e] p-10 text-center text-white lg:p-14'>
          {/* Ambient radial glows */}
          <div
            className='pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#4b41e1]/30 blur-3xl'
            aria-hidden='true'
          />
          <div
            className='pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl'
            aria-hidden='true'
          />

          <div className='relative z-10 mx-auto max-w-3xl'>
            <span className='mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-indigo-200 uppercase'>
              Enterprise &amp; Hybrid Consulting
            </span>

            <h2 className='font-display text-3xl font-bold tracking-tight text-white sm:text-4xl'>
              Not sure where to start? Let’s model your workspace strategy.
            </h2>

            <p className='mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300'>
              Talk with our commercial workplace strategists to calculate savings, pilot hybrid
              credits, or customize multi-location access for your workforce.
            </p>

            <div className='mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row'>
              <Button
                onClick={handleTalkAdvisor}
                className='h-12 w-full cursor-pointer bg-white px-6 text-sm font-semibold text-[#0b1c30] shadow-lg transition-all duration-150 hover:bg-slate-100 sm:w-auto active:scale-[0.98]'
              >
                <Headphones className='mr-2 h-5 w-5 text-[#4b41e1]' />
                Talk to a Workspace Advisor
              </Button>

              <Button
                variant='outline'
                onClick={handleCalculateRoi}
                className='h-12 w-full cursor-pointer border-slate-600 bg-transparent px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:text-white sm:w-auto active:scale-[0.98]'
              >
                <Calculator className='mr-2 h-5 w-5 text-indigo-300' />
                Calculate Space ROI
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
