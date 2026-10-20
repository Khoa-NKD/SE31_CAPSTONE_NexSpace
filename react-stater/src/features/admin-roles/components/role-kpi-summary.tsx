import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Building2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import type { RoleSummaryKpi } from '../api';

interface RoleKpiSummaryProps {
  kpis?: RoleSummaryKpi[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
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

export function RoleKpiSummary({
  kpis,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry
}: RoleKpiSummaryProps) {
  // Loading skeleton state: 4 matching placeholder cards
  if (isLoading) {
    return (
      <section className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6' aria-label='Role Accounts Summary Loading'>
        {[1, 2, 3, 4].map((idx) => (
          <Card
            key={idx}
            className='bg-card p-4 rounded-xl border border-border/80 shadow-xs flex flex-col justify-between h-[106px] animate-pulse'
          >
            <div className='flex items-center justify-between mb-2'>
              <div className='h-3 w-24 bg-muted rounded'></div>
              <div className='w-7 h-7 rounded-lg bg-muted'></div>
            </div>
            <div className='flex items-baseline justify-between'>
              <div className='h-7 w-20 bg-muted rounded'></div>
              <div className='h-4 w-16 bg-muted rounded-full'></div>
            </div>
          </Card>
        ))}
      </section>
    );
  }

  // Error state: actionable message with retry button, no stale hardcoded values
  if (isError) {
    return (
      <section className='mb-6' aria-label='Role Accounts Summary Error'>
        <Card className='bg-destructive/5 border-destructive/20 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs'>
          <div className='flex items-center gap-2.5 text-destructive'>
            <AlertCircle className='size-4 shrink-0' />
            <span>
              <strong>Failed to load role account statistics:</strong>{' '}
              {errorMessage || 'Mock REST API is unreachable.'}
            </span>
          </div>
          {onRetry && (
            <Button
              variant='outline'
              size='sm'
              onClick={onRetry}
              className='h-7 px-3 text-xs shrink-0 inline-flex items-center gap-1.5'
            >
              <RefreshCw className='size-3' />
              <span>Retry Statistics</span>
            </Button>
          )}
        </Card>
      </section>
    );
  }

  // Empty state: no metrics returned
  if (!kpis || kpis.length === 0) {
    return (
      <section className='mb-6' aria-label='Role Accounts Summary Empty'>
        <Card className='p-4 rounded-xl text-center text-xs text-muted-foreground border-dashed'>
          No role account statistics available.
        </Card>
      </section>
    );
  }

  // Loaded state: render live API metrics
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
