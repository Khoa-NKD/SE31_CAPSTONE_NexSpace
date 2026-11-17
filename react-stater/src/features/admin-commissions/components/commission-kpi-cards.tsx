import React from 'react';
import { Store, Building, QrCode, ArrowRightLeft } from 'lucide-react';
import { MOCK_ACTIVE_FEE_TILES } from '../data/mock-commissions';

export function CommissionKpiCards() {
  return (
    <section
      aria-label='Active Platform Fee Structure Tiles'
      className='grid grid-cols-1 md:grid-cols-3 gap-6'
    >
      {MOCK_ACTIVE_FEE_TILES.map((tile) => {
        const isEmerald = tile.statusColor === 'emerald';
        const isIndigo = tile.statusColor === 'indigo';

        return (
          <div
            key={tile.id}
            className='bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-all group'
          >
            {/* Subtle decorative background accent */}
            <div
              className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 ${
                isEmerald
                  ? 'bg-emerald-500/5'
                  : isIndigo
                    ? 'bg-indigo-500/5'
                    : 'bg-sky-500/5'
              }`}
            />

            <div>
              {/* Header: Category + Status Badge */}
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2 text-muted-foreground'>
                  {tile.icon === 'storefront' && (
                    <Store className='size-5 text-primary' />
                  )}
                  {tile.icon === 'building' && (
                    <Building className='size-5 text-indigo-600 dark:text-indigo-400' />
                  )}
                  {tile.icon === 'qrCode' && (
                    <QrCode className='size-5 text-sky-600 dark:text-sky-400' />
                  )}
                  <span className='text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
                    {tile.category}
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
                  {tile.statusBadge}
                </span>
              </div>

              {/* Rate Value Display */}
              <div className='flex items-baseline gap-2 mb-2'>
                <span className='text-3xl font-extrabold tracking-tight text-foreground'>
                  {tile.rateDisplay}
                </span>
                <span className='text-xs text-muted-foreground font-medium'>
                  {tile.subRateLabel}
                </span>
              </div>

              {/* Description */}
              <p className='text-xs text-muted-foreground mb-4 leading-relaxed'>
                {tile.description}
              </p>
            </div>

            {/* Bottom Strip */}
            <div className='pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground bg-muted/40 -mx-5 -mb-5 px-5 py-2.5 rounded-b-xl'>
              <span className='font-semibold text-foreground'>
                {tile.retained30d}
              </span>
              <span className='text-[11px] font-sans font-medium text-muted-foreground'>
                {tile.volumeLabel}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
