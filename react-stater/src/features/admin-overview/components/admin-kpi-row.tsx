import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Store, Calendar, CreditCard, TrendingUp, TrendingDown, Wallet } from '@/components/ui/hugeicons';
import type { AdminOverviewKpiDTO } from '../api/types';

interface AdminKpiRowProps {
  kpis: AdminOverviewKpiDTO[];
}

function getKpiIcon(iconName?: string) {
  switch (iconName) {
    case 'users':
      return <Users className='size-3.5 text-muted-foreground' />;
    case 'building':
      return <Building2 className='size-3.5 text-muted-foreground' />;
    case 'store':
      return <Store className='size-3.5 text-muted-foreground' />;
    case 'calendar':
      return <Calendar className='size-3.5 text-muted-foreground' />;
    case 'creditCard':
    case 'wallet':
      return <Wallet className='size-3.5 text-muted-foreground' />;
    default:
      return <CreditCard className='size-3.5 text-muted-foreground' />;
  }
}

export function AdminKpiRow({ kpis }: AdminKpiRowProps) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <section className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5' aria-label='Core KPI Overview'>
      {kpis.map((kpi) => (
        <Card
          key={kpi.id}
          className='bg-card rounded-xl border border-border/70 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between hover:border-border transition-all duration-150'
        >
          <div>
            <div className='flex items-center justify-between text-muted-foreground mb-1.5'>
              <span className='text-[10px] font-semibold tracking-wider uppercase text-muted-foreground truncate'>
                {kpi.label}
              </span>
              <div className='p-1 rounded-md bg-muted/50 shrink-0 ml-1'>
                {getKpiIcon(kpi.icon)}
              </div>
            </div>

            <div className='flex items-baseline justify-between gap-1.5 flex-wrap mt-0.5'>
              <div className='text-lg sm:text-xl font-bold font-heading text-foreground tracking-tight'>
                {kpi.value}
              </div>

              {kpi.changePercent && (
                <Badge
                  variant='outline'
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0 flex items-center gap-0.5 ${
                    kpi.changeType === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : kpi.changeType === 'negative'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                        : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {kpi.changeType === 'positive' ? (
                    <TrendingUp className='size-2.5' />
                  ) : kpi.changeType === 'negative' ? (
                    <TrendingDown className='size-2.5' />
                  ) : null}
                  <span>{kpi.changePercent}</span>
                </Badge>
              )}

              {kpi.badgeText && !kpi.changePercent && (
                <Badge
                  variant='outline'
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0 ${
                    kpi.changeType === 'warning'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                  }`}
                >
                  {kpi.badgeText}
                </Badge>
              )}
            </div>
          </div>

          <div className='mt-2 text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1 border-t border-border/40 pt-1.5'>
            <span className='truncate' title={kpi.subtext}>{kpi.subtext}</span>
          </div>
        </Card>
      ))}
    </section>
  );
}
