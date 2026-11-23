import { formatDateLabel } from '@/lib/format';
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, ShieldAlert } from '@/components/ui/hugeicons';
import type { AdminLiveSystemAlertDTO } from '../api/types';
import { useLanguage } from '@/features/landing/context/language-context';

interface LiveSystemAlertsProps {
  initialAlerts: AdminLiveSystemAlertDTO[];
}

export function LiveSystemAlerts({ initialAlerts }: LiveSystemAlertsProps) {
  const { language } = useLanguage();
  const [alerts, setAlerts] = useState<AdminLiveSystemAlertDTO[]>(initialAlerts || []);

  const toggleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: !alert.acknowledged } : alert
      )
    );
  };

  const activeCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <Card className='rounded-xl border border-border/70 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between bg-card'>
      <div>
        <div className='flex items-center justify-between pb-2.5 border-b border-border/60 mb-3'>
          <div className='flex items-center gap-2'>
            <span className='relative flex h-2 w-2'>
              {activeCount > 0 && (
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75'></span>
              )}
              <span className='relative inline-flex rounded-full h-2 w-2 bg-rose-500'></span>
            </span>
            <h3 className='text-xs sm:text-sm font-semibold text-foreground tracking-tight'>
              {language === 'vi' ? 'Cảnh báo hệ thống & Nhật ký kiểm toán' : 'Live Alerts & Audit Log'}
            </h3>
          </div>
          <Badge
            variant='outline'
            className='px-1.5 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          >
            {language === 'vi' ? `${activeCount} hoạt động` : `${activeCount} active`}
          </Badge>
        </div>

        {alerts.length === 0 ? (
          <div className='py-8 flex flex-col items-center justify-center text-muted-foreground text-xs'>
            <ShieldAlert className='size-6 text-muted-foreground/50 mb-1.5' />
            <span>{language === 'vi' ? 'Không có cảnh báo phát sinh.' : 'No alerts recorded.'}</span>
          </div>
        ) : (
          <ul className='space-y-2 list-none p-0 m-0 max-h-[340px] overflow-y-auto pr-1' aria-label='System alerts list'>
            {alerts.slice(0, 6).map((alert) => {
              const isCritical = alert.severity === 'critical';
              const isWarning = alert.severity === 'warning';

              return (
                <li
                  key={alert.id}
                  className={`p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-between gap-1.5 ${
                    alert.acknowledged
                      ? 'bg-muted/30 border-border/40 opacity-70'
                      : isCritical
                        ? 'bg-rose-50/30 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/60'
                        : isWarning
                          ? 'bg-amber-50/30 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/60'
                          : 'bg-muted/20 border-border/60'
                  }`}
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex items-start gap-2 min-w-0'>
                      {alert.acknowledged ? (
                        <CheckCircle className='size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
                      ) : (
                        <AlertCircle
                          className={`size-3.5 shrink-0 mt-0.5 ${
                            isCritical
                              ? 'text-rose-600 dark:text-rose-400'
                              : isWarning
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-blue-600 dark:text-blue-400'
                          }`}
                        />
                      )}
                      <div className='min-w-0'>
                        <h4 className='font-semibold text-foreground text-[11px] leading-tight truncate'>
                          {alert.title}
                        </h4>
                        <p className='text-muted-foreground text-[10px] mt-0.5 leading-normal line-clamp-2'>
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-1 text-[10px] text-muted-foreground shrink-0'>
                      <Clock className='size-2.5 text-muted-foreground/60' aria-hidden='true' />
                      <span>{formatDateLabel(alert.timestamp)}</span>
                    </div>
                  </div>

                  <div className='flex items-center justify-between pt-1 border-t border-border/30 text-[10px]'>
                    <span className='font-mono text-muted-foreground/70'>ID: #{alert.id}</span>
                    <button
                      type='button'
                      onClick={() => toggleAcknowledge(alert.id)}
                      className='text-primary hover:underline font-medium'
                    >
                      {alert.acknowledged
                        ? language === 'vi' ? 'Đã xem' : 'Acknowledged'
                        : language === 'vi' ? 'Xác nhận xử lý' : 'Acknowledge'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
