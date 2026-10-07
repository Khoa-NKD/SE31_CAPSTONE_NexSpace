import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Play,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { PLATFORM_LAYERS } from '../api/data';

const ICONS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass,
  SlidersHorizontal,
  BarChart3
};

export function PlatformLayers() {
  const [activeTab, setActiveTab] = useState(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const activeLayer = PLATFORM_LAYERS[activeTab] || PLATFORM_LAYERS[0];
  const Icon = ICONS_MAP[activeLayer.iconName] || Compass;

  return (
    <section id='platform' className='border-border/60 bg-muted/20 scroll-mt-20 border-b py-24'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Section Header */}
        <div className='mx-auto max-w-3xl text-center'>
          <span className='border-indigo-200 bg-indigo-50 text-[#4b41e1] dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 inline-block rounded-full border px-4 py-1 text-xs font-semibold tracking-wide uppercase'>
            The Smart Office Platform
          </span>
          <h2 className='text-foreground font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl'>
            One platform. Three layers.
          </h2>
          <p className='text-muted-foreground mt-3 text-lg leading-relaxed'>
            Built to orchestrate your entire workplace strategy—from on-demand bookings to
            enterprise portfolio telemetry.
          </p>

          {/* Interactive Play Video Trigger */}
          <div className='mt-5 flex items-center justify-center gap-3'>
            <button
              type='button'
              onClick={() => setIsVideoModalOpen(true)}
              className='text-foreground hover:text-[#4b41e1] inline-flex cursor-pointer items-center gap-2 text-sm font-semibold transition-colors'
            >
              <span className='bg-indigo-100 text-[#4b41e1] dark:bg-indigo-950 dark:text-indigo-300 flex h-7 w-7 items-center justify-center rounded-full'>
                <Play className='ml-0.5 h-3.5 w-3.5 fill-current' />
              </span>
              <span>See it in action. Play product tour</span>
            </button>
          </div>
        </div>

        {/* 3-Layer Interactive Segmented Tabs */}
        <div className='mx-auto mt-12 flex max-w-2xl justify-center'>
          <div className='bg-muted/80 border-border/80 flex w-full rounded-2xl border p-1.5 shadow-xs'>
            {PLATFORM_LAYERS.map((layer, index) => {
              const TabIcon = ICONS_MAP[layer.iconName] || Compass;
              const isActive = activeTab === index;
              return (
                <button
                  key={layer.layerNumber}
                  type='button'
                  onClick={() => setActiveTab(index)}
                  className={`relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold transition-all duration-200 sm:text-sm active:scale-[0.98] ${
                    isActive
                      ? 'bg-card text-[#4b41e1] custom-level-2 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TabIcon className='h-4 w-4 shrink-0' />
                  <span className='truncate'>{layer.subtitle.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Layer Deep Dive Showcase */}
        <div className='mx-auto mt-12 max-w-6xl'>
          <AnimatePresence mode='wait'>
            <motion.div
              key={activeLayer.layerNumber}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className='glass-card custom-level-2 grid grid-cols-1 items-center gap-10 rounded-3xl p-8 lg:grid-cols-12 lg:p-12'
            >
              {/* Left Column: Content & Capabilities */}
              <div className='space-y-6 lg:col-span-6'>
                <div className='flex items-center gap-3'>
                  <div className='bg-indigo-50 border-indigo-200 text-[#4b41e1] dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-400 flex h-11 w-11 items-center justify-center rounded-xl border'>
                    <Icon className='h-5 w-5' />
                  </div>
                  <div>
                    <span className='text-muted-foreground text-xs font-bold tracking-widest uppercase'>
                      {activeLayer.layerNumber}
                    </span>
                    <h4 className='text-[#4b41e1] text-xs font-bold tracking-wider uppercase'>
                      {activeLayer.subtitle}
                    </h4>
                  </div>
                </div>

                <h3 className='text-foreground font-display text-2xl font-bold tracking-tight sm:text-3xl'>
                  {activeLayer.title}
                </h3>

                <p className='text-muted-foreground text-base leading-relaxed'>
                  {activeLayer.description}
                </p>

                {/* 4 Feature Bullet Checkmarks */}
                <div className='grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2'>
                  {activeLayer.highlights.map((highlight) => (
                    <div key={highlight} className='flex items-center gap-2 text-sm font-medium'>
                      <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-500' />
                      <span className='text-foreground'>{highlight}</span>
                    </div>
                  ))}
                </div>

                {/* Metric Badge & CTA Button */}
                <div className='border-border/60 flex flex-wrap items-center justify-between gap-4 border-t pt-6'>
                  <div>
                    <span className='text-muted-foreground block text-xs'>
                      {activeLayer.metricLabel}
                    </span>
                    <span className='font-display text-xl font-bold text-[#4b41e1]'>
                      {activeLayer.metricValue}
                    </span>
                  </div>

                  <Button
                    asChild
                    className='bg-[#4b41e1] hover:bg-[#4338CA] cursor-pointer text-white shadow-sm'
                  >
                    <a href={activeLayer.href} className='flex items-center gap-2'>
                      <span>{activeLayer.ctaText}</span>
                      <ArrowRight className='h-4 w-4' />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Right Column: High-Fidelity Simulated Dashboard Mockup */}
              <div className='lg:col-span-6'>
                {activeTab === 0 && (
                  <div className='bg-card border-border/80 custom-level-2 relative overflow-hidden rounded-2xl border p-6'>
                    <div className='border-border/60 mb-4 flex items-center justify-between border-b pb-3'>
                      <div className='flex items-center gap-2'>
                        <span className='bg-emerald-500 h-2.5 w-2.5 animate-pulse rounded-full' />
                        <span className='text-foreground text-xs font-bold'>
                          Live Space Availability Map
                        </span>
                      </div>
                      <span className='bg-indigo-50 text-[#4b41e1] dark:bg-indigo-950 dark:text-indigo-300 rounded-md px-2 py-0.5 text-xs font-semibold'>
                        GPS Auto-Routing
                      </span>
                    </div>

                    <div className='space-y-3'>
                      <div className='bg-muted/40 hover:bg-muted/70 flex items-center justify-between rounded-xl p-3.5 transition-colors'>
                        <div className='flex items-center gap-3'>
                          <div className='bg-indigo-100 text-[#4b41e1] dark:bg-indigo-900 flex h-9 w-9 items-center justify-center rounded-lg font-bold'>
                            D1
                          </div>
                          <div>
                            <p className='text-foreground text-xs font-bold'>
                              Sky Tower Flex Suite
                            </p>
                            <p className='text-muted-foreground text-[11px]'>
                              District 1, HCMC · 8 desks open
                            </p>
                          </div>
                        </div>
                        <span className='text-foreground text-xs font-bold'>$3/hr</span>
                      </div>

                      <div className='bg-muted/40 hover:bg-muted/70 flex items-center justify-between rounded-xl p-3.5 transition-colors'>
                        <div className='flex items-center gap-3'>
                          <div className='bg-indigo-100 text-[#4b41e1] dark:bg-indigo-900 flex h-9 w-9 items-center justify-center rounded-lg font-bold'>
                            TH
                          </div>
                          <div>
                            <p className='text-foreground text-xs font-bold'>
                              Westlake Loft Lounge
                            </p>
                            <p className='text-muted-foreground text-[11px]'>
                              Tay Ho, Hanoi · Acoustic booth free
                            </p>
                          </div>
                        </div>
                        <span className='text-foreground text-xs font-bold'>$3.5/hr</span>
                      </div>

                      <div className='bg-muted/40 hover:bg-muted/70 flex items-center justify-between rounded-xl p-3.5 transition-colors'>
                        <div className='flex items-center gap-3'>
                          <div className='bg-indigo-100 text-[#4b41e1] dark:bg-indigo-900 flex h-9 w-9 items-center justify-center rounded-lg font-bold'>
                            DN
                          </div>
                          <div>
                            <p className='text-foreground text-xs font-bold'>My Khe Coastal Hub</p>
                            <p className='text-muted-foreground text-[11px]'>
                              Son Tra, Da Nang · 12-person suite
                            </p>
                          </div>
                        </div>
                        <span className='text-foreground text-xs font-bold'>$2.5/hr</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 1 && (
                  <div className='bg-card border-border/80 custom-level-2 relative overflow-hidden rounded-2xl border p-6'>
                    <div className='border-border/60 mb-4 flex items-center justify-between border-b pb-3'>
                      <div className='flex items-center gap-2'>
                        <ShieldCheck className='h-4 w-4 text-[#4b41e1]' />
                        <span className='text-foreground text-xs font-bold'>
                          Corporate Policy &amp; Budget Controls
                        </span>
                      </div>
                      <span className='text-muted-foreground text-[11px] font-semibold'>
                        Monthly Quota: $24,500
                      </span>
                    </div>

                    <div className='space-y-3'>
                      <div className='border-border/60 rounded-xl border p-3.5'>
                        <div className='flex justify-between text-xs font-semibold'>
                          <span className='text-foreground'>Engineering Team (140 members)</span>
                          <span className='text-emerald-600 dark:text-emerald-400'>
                            $8,420 / $12,000
                          </span>
                        </div>
                        <div className='bg-muted mt-2 h-2 w-full overflow-hidden rounded-full'>
                          <div className='bg-[#4b41e1] h-full w-[70%]' />
                        </div>
                      </div>

                      <div className='border-border/60 rounded-xl border p-3.5'>
                        <div className='flex justify-between text-xs font-semibold'>
                          <span className='text-foreground'>Product &amp; Design (45 members)</span>
                          <span className='text-emerald-600 dark:text-emerald-400'>
                            $3,150 / $6,000
                          </span>
                        </div>
                        <div className='bg-muted mt-2 h-2 w-full overflow-hidden rounded-full'>
                          <div className='bg-emerald-500 h-full w-[52%]' />
                        </div>
                      </div>

                      <div className='bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 flex items-center justify-between rounded-xl border p-3 text-xs'>
                        <div className='flex items-center gap-2'>
                          <CreditCard className='text-[#4b41e1] h-4 w-4' />
                          <span className='text-foreground font-semibold'>
                            PayOS Instant Bank Payouts
                          </span>
                        </div>
                        <span className='text-emerald-600 dark:text-emerald-400 font-bold'>
                          Auto-Settled
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className='bg-card border-border/80 custom-level-2 relative overflow-hidden rounded-2xl border p-6'>
                    <div className='border-border/60 mb-4 flex items-center justify-between border-b pb-3'>
                      <div className='flex items-center gap-2'>
                        <TrendingDown className='h-4 w-4 text-emerald-500' />
                        <span className='text-foreground text-xs font-bold'>
                          Portfolio ROI &amp; Space Yield Modeler
                        </span>
                      </div>
                      <span className='rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'>
                        -38% Over-Leasing
                      </span>
                    </div>

                    <div className='space-y-4'>
                      <div className='bg-muted/40 grid grid-cols-3 gap-2 rounded-xl p-3 text-center'>
                        <div>
                          <span className='text-muted-foreground block text-[10px] uppercase'>
                            Traditional Lease
                          </span>
                          <span className='text-foreground text-sm font-bold line-through opacity-70'>
                            $48,000/mo
                          </span>
                        </div>
                        <div>
                          <span className='text-muted-foreground block text-[10px] uppercase'>
                            NexSpace Flex
                          </span>
                          <span className='text-sm font-bold text-[#4b41e1]'>$29,760/mo</span>
                        </div>
                        <div>
                          <span className='text-muted-foreground block text-[10px] uppercase'>
                            Annual Savings
                          </span>
                          <span className='text-sm font-extrabold text-emerald-600'>$218,880</span>
                        </div>
                      </div>

                      <div className='border-border/60 space-y-2 rounded-xl border p-3.5 text-xs'>
                        <div className='flex justify-between font-semibold'>
                          <span className='text-foreground'>Monetize Unused Floor Area</span>
                          <span className='text-indigo-600'>+$3,400/mo Earned</span>
                        </div>
                        <p className='text-muted-foreground text-[11px] leading-relaxed'>
                          Interactive 2D floor plans automatically open vacant executive suites to
                          vetted enterprise network tenants.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Video / Product Tour Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className='sm:max-w-[700px]'>
          <DialogHeader>
            <DialogTitle className='font-display text-xl font-bold'>
              NexSpace Platform Tour
            </DialogTitle>
            <DialogDescription className='text-sm text-muted-foreground'>
              See how modern enterprises unify flexible workspace, team credits, and portfolio
              strategy.
            </DialogDescription>
          </DialogHeader>

          <div className='bg-slate-950 relative aspect-video overflow-hidden rounded-xl border border-slate-800 text-white flex flex-col items-center justify-center p-6 text-center'>
            <div className='h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-[#38BDF8] border border-white/20 mb-3 animate-pulse'>
              <Sparkles className='h-8 w-8' />
            </div>
            <h4 className='text-base font-bold'>Interactive Architecture Walkthrough</h4>
            <p className='text-xs text-slate-400 max-w-md mt-1'>
              Demonstrating on-demand booking across 500+ regional hubs, dynamic budget governance,
              and 2D floorplan monetization telemetry.
            </p>
            <Button
              onClick={() => setIsVideoModalOpen(false)}
              className='mt-6 bg-[#4b41e1] hover:bg-[#4338CA] text-white text-xs cursor-pointer'
            >
              Explore Live Network Instead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
