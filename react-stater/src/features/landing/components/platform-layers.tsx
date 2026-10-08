import React from 'react';
import { ArrowRight, BarChart3, Compass, SlidersHorizontal } from 'lucide-react';
import { PLATFORM_LAYERS } from '../api/data';

const ICONS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass,
  SlidersHorizontal,
  BarChart3
};

export function PlatformLayers() {
  return (
    <section className='bg-card/50 border-border/60 border-b py-20'>
      <div className='mx-auto max-w-[1440px] px-6 lg:px-12'>
        {/* Section Header */}
        <div className='mx-auto max-w-2xl text-center'>
          <span className='border-indigo-200 bg-indigo-50 text-[#4b41e1] dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 inline-block rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase'>
            Ecosystem Architecture
          </span>
          <h2 className='text-foreground font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl'>
            The Smart Office Platform
          </h2>
          <p className='text-muted-foreground mt-3 text-lg leading-relaxed'>
            One platform. Three layers—built to orchestrate your entire workplace strategy.
          </p>
        </div>

        {/* 3-Column Architectural Cards */}
        <div className='mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3'>
          {PLATFORM_LAYERS.map((layer) => {
            const Icon = ICONS_MAP[layer.iconName] || Compass;
            return (
              <div
                key={layer.layerNumber}
                className='custom-level-1 hover:custom-level-2 bg-card border-border/80 group flex flex-col justify-between rounded-xl border p-8 transition-all duration-200'
              >
                <div>
                  <div className='mb-6 flex items-center justify-between'>
                    <div className='bg-indigo-50 border-indigo-200 text-[#4b41e1] dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300 flex h-12 w-12 items-center justify-center rounded-xl border'>
                      <Icon className='h-6 w-6' />
                    </div>
                    <span className='bg-muted text-muted-foreground border-border/60 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wider uppercase'>
                      {layer.layerNumber}
                    </span>
                  </div>

                  <h3 className='text-foreground group-hover:text-[#4b41e1] text-lg font-semibold tracking-tight transition-colors duration-150'>
                    {layer.title}
                  </h3>
                  <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
                    {layer.description}
                  </p>
                </div>

                <div className='border-border/60 mt-6 border-t pt-6'>
                  <a
                    href={layer.href}
                    className='text-[#4b41e1] inline-flex items-center gap-1.5 text-sm font-semibold transition-transform duration-150 group-hover:translate-x-1.5'
                  >
                    <span>{layer.ctaText}</span>
                    <ArrowRight className='h-4 w-4' />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
