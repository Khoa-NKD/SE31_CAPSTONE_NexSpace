import React from 'react';
import {
  Bot,
  Building2,
  Landmark,
  Layers,
  Network,
  Shield,
  ShoppingBag,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { PARTNER_LOGOS } from '../api/data';

const ICONS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Network,
  Sparkles,
  Shield,
  Layers,
  Hub: Building2,
  BarChart3,
  ShoppingBag,
  Bot,
  Landmark
};

import { useLanguage } from '../context/language-context';

export function PartnerLogos() {
  const { t } = useLanguage();
  // Duplicate logos for seamless infinite marquee loop
  const marqueeItems = [...PARTNER_LOGOS, ...PARTNER_LOGOS];

  return (
    <div className='border-border/60 mx-auto mt-14 max-w-6xl border-t pt-8'>
      <div className='mb-6 flex flex-col items-center justify-center gap-1.5 text-center'>
        <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
          {t('hero.trustedBy')}
        </p>
      </div>

      {/* Marquee Container with fade edge masks */}
      <div className='relative overflow-hidden py-3 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]'>
        <div className='animate-marquee flex items-center gap-8 lg:gap-12'>
          {marqueeItems.map((partner, index) => {
            const Icon = ICONS_MAP[partner.icon] || Building2;
            return (
              <div
                key={`${partner.name}-${index}`}
                className='border-border/50 bg-card/60 hover:border-indigo-300 dark:hover:border-indigo-800 flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:scale-[1.02]'
              >
                <div className='bg-indigo-50 text-[#4b41e1] dark:bg-indigo-950/60 dark:text-indigo-400 flex h-7 w-7 items-center justify-center rounded-lg'>
                  <Icon className='h-4 w-4' />
                </div>
                <div className='flex flex-col text-left'>
                  <span className='text-foreground text-xs font-bold tracking-tight'>
                    {partner.name}
                  </span>
                  <span className='text-muted-foreground/75 text-[10px] font-medium'>
                    {partner.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
