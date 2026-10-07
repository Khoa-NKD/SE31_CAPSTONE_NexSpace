import React, { useState } from 'react';
import { Calculator, Headphones, Sparkles, TrendingDown, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

function handleTalkAdvisor() {
  toast.success('Workspace Strategist Scheduled!', {
    description: 'A commercial real estate advisor will connect with you via email/phone.'
  });
}

export function EnterpriseCta() {
  const [isRoiModalOpen, setIsRoiModalOpen] = useState(false);
  const [teamSize, setTeamSize] = useState(100);
  const [currentLeasePerDesk, setCurrentLeasePerDesk] = useState(350);

  // ROI Calculator Calculations
  const monthlyTraditionalCost = teamSize * currentLeasePerDesk;
  const estimatedSavingsPercent = 38;
  const monthlySavings = (monthlyTraditionalCost * estimatedSavingsPercent) / 100;
  const annualSavings = monthlySavings * 12;

  return (
    <section id='enterprise' className='scroll-mt-20 py-20'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Architectural Navy Banner */}
        <div className='custom-level-3 relative overflow-hidden rounded-3xl border border-slate-800 bg-[#131b2e] p-10 text-center text-white lg:p-16'>
          {/* Ambient radial glows */}
          <div
            className='pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#4b41e1]/30 blur-3xl'
            aria-hidden='true'
          />
          <div
            className='pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl'
            aria-hidden='true'
          />

          <div className='relative z-10 mx-auto max-w-3xl'>
            <span className='mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold tracking-wider text-indigo-200 uppercase'>
              <Sparkles className='h-3.5 w-3.5' />
              <span>Enterprise &amp; Hybrid Consulting</span>
            </span>

            <h2 className='font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl'>
              Not sure where to start? Let’s talk it through.
            </h2>

            <p className='mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300'>
              We’ll review your existing office footprint, model hybrid scenarios, and outline a
              data-driven path to immediate savings and employee impact—in one 30-minute session.
            </p>

            <div className='mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row'>
              <Button
                onClick={handleTalkAdvisor}
                className='h-12 w-full cursor-pointer bg-white px-7 text-sm font-bold text-[#0b1c30] shadow-xl transition-all duration-150 hover:bg-slate-100 sm:w-auto active:scale-[0.98]'
              >
                <Headphones className='mr-2 h-5 w-5 text-[#4b41e1]' />
                Talk to a Workspace Advisor
              </Button>

              <Button
                variant='outline'
                onClick={() => setIsRoiModalOpen(true)}
                className='h-12 w-full cursor-pointer border-slate-600 bg-white/5 px-7 text-sm font-medium text-white backdrop-blur-xs transition-colors hover:bg-white/15 hover:text-white sm:w-auto active:scale-[0.98]'
              >
                <Calculator className='mr-2 h-5 w-5 text-indigo-300' />
                Calculate Space ROI
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive ROI Modeler Dialog */}
      <Dialog open={isRoiModalOpen} onOpenChange={setIsRoiModalOpen}>
        <DialogContent className='sm:max-w-[550px]'>
          <DialogHeader>
            <DialogTitle className='font-display flex items-center gap-2 text-xl font-bold'>
              <Calculator className='h-5 w-5 text-[#4b41e1]' />
              <span>Commercial Lease ROI Calculator</span>
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              Simulate enterprise savings by transitioning fixed square footage to flexible desk
              credits.
            </DialogDescription>
          </DialogHeader>

          <div className='mt-2 space-y-5'>
            {/* Input 1: Team Size */}
            <div className='space-y-1.5'>
              <div className='flex justify-between text-xs font-semibold'>
                <span className='text-foreground flex items-center gap-1'>
                  <Users className='h-3.5 w-3.5' /> Total Workforce Headcount:
                </span>
                <span className='text-[#4b41e1] font-bold'>{teamSize} Employees</span>
              </div>
              <input
                type='range'
                min={20}
                max={1000}
                step={10}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className='accent-[#4b41e1] w-full cursor-pointer'
              />
            </div>

            {/* Input 2: Current Desk Cost */}
            <div className='space-y-1.5'>
              <div className='flex justify-between text-xs font-semibold'>
                <span className='text-foreground'>Average Monthly Lease / Desk ($):</span>
                <span className='text-[#4b41e1] font-bold'>${currentLeasePerDesk} / desk / mo</span>
              </div>
              <input
                type='range'
                min={150}
                max={800}
                step={25}
                value={currentLeasePerDesk}
                onChange={(e) => setCurrentLeasePerDesk(Number(e.target.value))}
                className='accent-[#4b41e1] w-full cursor-pointer'
              />
            </div>

            {/* Simulated Live Results Card */}
            <div className='border-border/80 bg-muted/40 rounded-2xl border p-5 space-y-3'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Current Annual Lease Spend:</span>
                <span className='font-bold text-foreground'>
                  ${(monthlyTraditionalCost * 12).toLocaleString()} / year
                </span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Estimated NexSpace Flex Spend:</span>
                <span className='font-bold text-[#4b41e1]'>
                  ${((monthlyTraditionalCost - monthlySavings) * 12).toLocaleString()} / year
                </span>
              </div>
              <div className='border-border/60 flex items-center justify-between border-t pt-3'>
                <div className='flex items-center gap-1.5'>
                  <TrendingDown className='h-4 w-4 text-emerald-500' />
                  <span className='text-sm font-bold text-foreground'>
                    Projected Annual Savings:
                  </span>
                </div>
                <span className='font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400'>
                  ${annualSavings.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className='mt-4 flex gap-2 sm:justify-end'>
            <Button variant='outline' onClick={() => setIsRoiModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsRoiModalOpen(false);
                handleTalkAdvisor();
              }}
              className='bg-[#4b41e1] hover:bg-[#4338CA] text-white cursor-pointer'
            >
              Get Custom Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
