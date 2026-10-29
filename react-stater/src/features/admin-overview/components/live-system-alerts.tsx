import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { LiveSystemAlert } from '../data/mock-overview';

interface LiveSystemAlertsProps {
  initialAlerts: LiveSystemAlert[];
}

export function LiveSystemAlerts({ initialAlerts }: LiveSystemAlertsProps) {
  const [alerts, setAlerts] = useState<LiveSystemAlert[]>(initialAlerts);

  const toggleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: !alert.acknowledged } : alert
      )
    );
  };

  const activeCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <Card className='rounded-xl border border-border/80 p-6 shadow-xs flex flex-col justify-between bg-card'>
      <div>
        <div className='flex items-center justify-between pb-3 border-b border-border/70 mb-4'>
          <div className='flex items-center gap-2'>
            <span className='relative flex h-2.5 w-2.5'>
              {activeCount > 0 && (
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75'></span>
              )}
              <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500'></span>
            </span>
            <h3 className='text-base font-semibold text-foreground'>
              Live System Alerts
            </h3>
          </div>
          <Badge
            variant='outline'
            className='px-2 py-0.5 text-[11px] font-bold bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'
          >
            {activeCount} active
          </Badge>
        </div>

        <ul className='space-y-3 list-none p-0 m-0' aria-label='System alerts list'>
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <li
                key={alert.id}
                className={`p-3.5 rounded-lg border transition-all text-xs flex flex-col justify-between gap-2 ${
                  alert.acknowledged
                    ? 'bg-muted/40 border-border/60'
                    : isCritical
                    ? 'bg-red-50/40 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                    : isWarning
                    ? 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                    : 'bg-muted/30 border-border/80'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex items-start gap-2'>
                    {alert.acknowledged ? (
                      <CheckCircle className='size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
                    ) : (
                      <AlertCircle
                        className={`size-4 shrink-0 mt-0.5 ${
                          isCritical
                            ? 'text-red-600 dark:text-red-400'
                            : isWarning
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      />
                    )}
                    <div>
                      <h4 className='font-semibold text-foreground text-xs leading-tight'>
                        {alert.title}
                      </h4>
                      <p className='text-slate-700 dark:text-slate-200 text-[11px] mt-0.5 leading-relaxed'>
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-1 text-[10px] text-slate-700 dark:text-slate-200 shrink-0'>
                    <Clock className='size-3 text-slate-600 dark:text-slate-300' aria-hidden='true' />
                    <span>{alert.timestamp}</span>
                  </div>
                </div>

                <div className='flex items-center justify-between pt-1 border-t border-border/40'>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isCritical
                        ? 'text-red-700 dark:text-red-400'
                        : isWarning
                        ? 'text-amber-800 dark:text-amber-300'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => toggleAcknowledge(alert.id)}
                    className='h-6 px-2 text-[11px] font-medium text-foreground hover:bg-muted'
                  >
                    {alert.acknowledged ? 'Mark Unacknowledged' : 'Acknowledge'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className='mt-4 pt-3 border-t border-border/70 text-right'>
        <span className='text-[11px] text-slate-600 dark:text-slate-300'>
          Real-time webhook sync • Heartbeat OK
        </span>
      </div>
    </Card>
  );
}
