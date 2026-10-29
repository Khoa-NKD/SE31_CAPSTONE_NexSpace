import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Store, Calendar, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { KpiMetric } from '../data/mock-overview';

interface AdminKpiRowProps {
  kpis: KpiMetric[];
}

function getKpiIcon(iconName: string) {
  switch (iconName) {
    case 'users':
      return <Users className='size-4 text-slate-500' />;
    case 'building':
      return <Building2 className='size-4 text-slate-500' />;
    case 'store':
      return <Store className='size-4 text-slate-500' />;
    case 'calendar':
      return <Calendar className='size-4 text-slate-500' />;
    case 'creditCard':
      return <CreditCard className='size-4 text-slate-500' />;
    default:
      return <Users className='size-4 text-slate-500' />;
  }
}

export function AdminKpiRow({ kpis }: AdminKpiRowProps) {

  return (
    <section className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6' aria-label='Core KPI Overview'>
      {kpis.map((kpi) => (
        <Card
          key={kpi.id}
          className='bg-card rounded-xl border border-border/80 p-4 shadow-xs flex flex-col justify-between hover:border-border transition-all duration-150'
        >
          <div>
            <div className='flex items-center justify-between text-muted-foreground mb-2'>
              <span className='text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400'>
                {kpi.label}
              </span>
              <div className='p-1 rounded-md bg-muted/60'>
                {getKpiIcon(kpi.icon)}
              </div>
            </div>

            <div className='flex flex-col items-baseline justify-between mt-1'>
              <div className='text-2xl font-bold font-heading text-foreground tracking-tight'>
                {kpi.value}
              </div>

              {kpi.changePercent && (
                <Badge
                  variant='outline'
                  className={`px-1.5 py-0.5 text-[11px] font-medium rounded flex items-center gap-0.5 ${kpi.changeType === 'positive'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : kpi.changeType === 'negative'
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                      : 'bg-muted text-muted-foreground border-border'
                    }`}
                >
                  {kpi.changeType === 'positive' ? (
                    <TrendingUp className='size-3' />
                  ) : kpi.changeType === 'negative' ? (
                    <TrendingDown className='size-3' />
                  ) : null}
                  {kpi.changePercent}
                </Badge>
              )}

              {kpi.badgeText && !kpi.changePercent && (
                <Badge
                  variant='outline'
                  className={`px-1.5 py-0.5 text-[11px] font-medium rounded ${kpi.changeType === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                    }`}
                >
                  {kpi.badgeText}
                </Badge>
              )}
            </div>
          </div>

          <div className='mt-2.5 text-[11px] text-muted-foreground flex items-center gap-1 border-t border-border/40 pt-2'>
            <span className='truncate'>{kpi.subtext}</span>
          </div>
        </Card>
      ))}
    </section>
  );
}
