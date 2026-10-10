import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Building2, ShieldCheck } from 'lucide-react';
import { RoleSummaryKpi } from '../data/mock-roles';

interface RoleKpiSummaryProps {
  kpis: RoleSummaryKpi[];
}

function getRoleSummaryIcon(iconName: string) {
  switch (iconName) {
    case 'users':
      return <Users className='size-4 text-slate-500' />;
    case 'userCheck':
      return <UserCheck className='size-4 text-slate-500' />;
    case 'building':
      return <Building2 className='size-4 text-slate-500' />;
    case 'shieldCheck':
      return <ShieldCheck className='size-4 text-slate-500' />;
    default:
      return <Users className='size-4 text-slate-500' />;
  }
}

export function RoleKpiSummary({ kpis }: RoleKpiSummaryProps) {
  return (
    <section className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6' aria-label='Role Accounts Summary'>
      {kpis.map((kpi) => (
        <Card
          key={kpi.id}
          className='bg-card p-4 rounded-xl border border-border/80 shadow-xs flex flex-col justify-between'
        >
          <div className='flex items-center justify-between mb-2'>
            <span className='text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
              {kpi.title}
            </span>
            <div className='w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center'>
              {getRoleSummaryIcon(kpi.icon)}
            </div>
          </div>

          <div className='flex items-baseline justify-between'>
            <div className='text-2xl font-bold font-heading text-foreground'>
              {kpi.value}
            </div>

            {kpi.badge ? (
              <Badge
                variant='outline'
                className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                  kpi.badge.includes('pending')
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : kpi.badge.includes('MFA')
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                }`}
              >
                {kpi.badge}
              </Badge>
            ) : (
              <span className='text-[11px] text-muted-foreground'>{kpi.subtext}</span>
            )}
          </div>

          {kpi.badge && (
            <div className='mt-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground'>
              {kpi.subtext}
            </div>
          )}
        </Card>
      ))}
    </section>
  );
}
