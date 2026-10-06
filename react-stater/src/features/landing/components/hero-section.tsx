import React from 'react';
import { SearchCard } from './search-card';
import { PartnerLogos } from './partner-logos';
import type { WorkspaceType } from '../api/types';

interface HeroSectionProps {
  onSearch?: (criteria: { mode: WorkspaceType; location: string; capacity: string }) => void;
}

export function HeroSection({ onSearch }: HeroSectionProps) {
  return (
    <section className='border-border/60 relative overflow-hidden border-b pt-16 pb-20'>
      {/* Background radial dot grid */}
      <div
        className='pointer-events-none absolute inset-0 opacity-40'
        style={{
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
        aria-hidden='true'
      />

      <div className='relative mx-auto max-w-[1440px] px-6 text-center lg:px-12'>
        {/* Headline & Subtitle */}
        <div className='mx-auto max-w-4xl'>
          <div className='border-indigo-200 bg-indigo-50/80 text-[#4b41e1] dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold tracking-wide'>
            <span className='bg-[#4b41e1] h-2 w-2 animate-pulse rounded-full' />
            NEXT-GEN WORKPLACE CLOUD &amp; SPATIAL PLATFORM
          </div>

          <h1 className='text-foreground font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>
            Beyond flexible office space.
          </h1>

          <p className='text-muted-foreground mx-auto mt-5 max-w-2xl text-lg font-normal leading-relaxed sm:text-xl'>
            Access on-demand workspace, manage hybrid teams, and continuously optimize your
            workplace strategy—all on one unified platform.
          </p>
        </div>

        {/* Elevated Search Engine Card */}
        <SearchCard onSearch={onSearch} />

        {/* Enterprise Partner Logos Bar */}
        <PartnerLogos />
      </div>
    </section>
  );
}
