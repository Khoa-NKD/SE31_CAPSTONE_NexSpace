import React from 'react';
import { Store, Building, QrCode, ArrowRightLeft } from '@/components/ui/hugeicons';
import { MOCK_ACTIVE_FEE_TILES } from '../data/mock-commissions';
import { useLanguage } from '@/features/landing/context/language-context';

export function CommissionKpiCards() {
  const { language } = useLanguage();

  return (
    <section
      aria-label='Active Platform Fee Structure Tiles'
      className='grid grid-cols-1 md:grid-cols-3 gap-5'
    >
      {MOCK_ACTIVE_FEE_TILES.map((tile) => {
        const isEmerald = tile.statusColor === 'emerald';
        const isIndigo = tile.statusColor === 'indigo';

        const category = language === 'vi' ? tile.categoryVi : tile.category;
        const subRate = language === 'vi' ? tile.subRateLabelVi : tile.subRateLabel;
        const description = language === 'vi' ? tile.descriptionVi : tile.description;
        const retained = language === 'vi' ? tile.retained30dVnd : tile.retained30d;
        const volumeLabel = language === 'vi' ? tile.volumeLabelVi : tile.volumeLabel;
        const statusBadge = language === 'vi' ? tile.statusBadgeVi : tile.statusBadge;

        return (
          <div
            key={tile.id}
            className='bg-card text-card-foreground rounded-xl border border-border/70 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between hover:border-primary/40 hover:shadow-xs transition-all group'
          >
            {/* Subtle decorative background accent */}
            <div
              className={`absolute top-0 right-0 w-28 h-28 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 opacity-70 ${
                isEmerald
                  ? 'bg-emerald-500/10'
                  : isIndigo
                    ? 'bg-indigo-500/10'
                    : 'bg-sky-500/10'
              }`}
            />

            <div>
              {/* Header: Category + Status Badge */}
              <div className='flex items-center justify-between mb-3.5'>
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center border shrink-0 ${
                      isEmerald
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : isIndigo
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                          : 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400'
                    }`}
                  >
                    {tile.icon === 'storefront' && <Store className='size-4' />}
                    {tile.icon === 'building' && <Building className='size-4' />}
                    {tile.icon === 'qrCode' && <QrCode className='size-4' />}
                  </div>
                  <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono'>
                    {category}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isEmerald
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : isIndigo
                        ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
                        : 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20'
                  }`}
                >
                  {tile.statusBadge === 'Pass-through' ? (
                    <ArrowRightLeft className='size-3 text-sky-600 dark:text-sky-400' />
                  ) : (
                    <span
                      className={`size-1.5 rounded-full ${
                        isEmerald ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                    />
                  )}
                  {statusBadge}
                </span>
              </div>

              {/* Rate Value Display */}
              <div className='flex items-baseline gap-2 mb-2'>
                <span className='text-3xl font-extrabold tracking-tight text-foreground font-heading'>
                  {tile.rateDisplay}
                </span>
                <span className='text-xs text-muted-foreground font-medium'>
                  {subRate}
                </span>
              </div>

              {/* Description */}
              <p className='text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-2'>
                {description}
              </p>
            </div>

            {/* Bottom Strip */}
            <div className='pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground bg-muted/30 -mx-5 -mb-5 px-5 py-2.5 rounded-b-xl'>
              <span className='font-bold text-foreground font-mono'>
                {retained}
              </span>
              <span className='text-[11px] font-medium text-muted-foreground'>
                {volumeLabel}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
