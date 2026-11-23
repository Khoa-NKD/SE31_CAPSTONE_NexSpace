import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { AlertTriangle, ArrowRight, ShieldCheck, Store, Gavel, Clock } from '@/components/ui/hugeicons';
import type { AdminTriageItemDTO } from '../api/types';
import { useLanguage } from '@/features/landing/context/language-context';

interface PriorityTriageGridProps {
  items: AdminTriageItemDTO[];
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'action':
      return <ShieldCheck className='size-4 text-amber-600 dark:text-amber-400' />;
    case 'verification':
      return <Store className='size-4 text-blue-600 dark:text-blue-400' />;
    case 'dispute':
      return <Gavel className='size-4 text-rose-600 dark:text-rose-400' />;
    default:
      return <AlertTriangle className='size-4 text-amber-600' />;
  }
}

function getRouteForTriage(item: AdminTriageItemDTO): string {
  if (item.id === 'triage-organizers' || item.targetScreenCode === 'A02') {
    return '/dashboard/admin/organizers/queue';
  }
  if (item.id === 'triage-workspaces' || item.targetScreenCode === 'A03') {
    return '/dashboard/admin/workspaces';
  }
  if (item.id === 'triage-reconciliation' || item.targetScreenCode === 'A09') {
    return '/dashboard/admin/reconciliation';
  }
  return '/dashboard/overview';
}

export function PriorityTriageGrid({ items }: PriorityTriageGridProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<AdminTriageItemDTO | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className='mb-6' aria-label='Operational Workload & Priority Triage'>
      <div className='flex items-center justify-between mb-2.5'>
        <div className='flex items-center gap-1.5'>
          <AlertTriangle className='size-4 text-amber-500' />
          <h2 className='text-sm font-semibold text-foreground tracking-tight'>
            {language === 'vi' ? 'Khối lượng công việc & Phân loại ưu tiên' : 'Workload & Priority Triage'}
          </h2>
        </div>
        <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
          <Clock className='size-3 text-muted-foreground/70' />
          <span>{language === 'vi' ? 'Mục tiêu SLA: Xử lý < 24h' : 'SLA Target: < 24h review'}</span>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-3.5'>
        {items.map((item) => {
          const isDispute = item.category === 'dispute';
          const hasCount = item.count > 0;

          return (
            <Card
              key={item.id}
              className={`rounded-xl p-3.5 border shadow-2xs flex flex-col justify-between transition-all duration-150 hover:shadow-xs ${
                isDispute && hasCount
                  ? 'border-rose-300/80 bg-rose-50/20 dark:bg-rose-950/15 dark:border-rose-900/60'
                  : hasCount
                    ? 'border-amber-300/80 bg-amber-50/20 dark:bg-amber-950/15 dark:border-amber-900/60'
                    : 'border-border/70 bg-card hover:border-border'
              }`}
            >
              <div>
                {/* Header row */}
                <div className='flex items-center justify-between gap-2 mb-2'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <div
                      className={`size-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        isDispute
                          ? 'bg-rose-100/70 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800'
                          : 'bg-muted/70 border-border/60'
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className='min-w-0'>
                      <h3 className='text-xs font-semibold text-foreground truncate leading-tight'>
                        {item.title}
                      </h3>
                      <span className='text-[10px] text-muted-foreground block truncate'>
                        {item.waitingNotice}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant='outline'
                    className={`text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded ${
                      isDispute && hasCount
                        ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                        : hasCount
                          ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {item.statusBadge}
                  </Badge>
                </div>

                {/* Number & breakdown count */}
                <div className='my-2 flex items-baseline gap-2'>
                  <span
                    className={`text-2xl font-bold font-heading tracking-tight ${
                      isDispute && hasCount
                        ? 'text-rose-600 dark:text-rose-400'
                        : hasCount
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {item.count}
                  </span>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {item.countLabel} {language === 'vi' ? 'đang chờ' : 'pending'}
                  </span>
                </div>

                {/* Compact tags */}
                <div className='flex flex-wrap gap-1 mb-3'>
                  {item.breakdown.map((tag) => (
                    <span
                      key={tag}
                      className='px-1.5 py-0.5 text-[10px] rounded bg-muted/60 text-muted-foreground border border-border/50 truncate max-w-full'
                      title={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className='flex items-center gap-2 pt-2 border-t border-border/40'>
                <Button
                  size='sm'
                  variant={isDispute && hasCount ? 'default' : 'outline'}
                  onClick={() => navigate({ to: getRouteForTriage(item) })}
                  className={`w-full h-7 text-xs font-medium justify-between px-2.5 transition-all ${
                    isDispute && hasCount
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'hover:bg-accent'
                  }`}
                >
                  <span className='truncate'>{item.actionLabel}</span>
                  <ArrowRight className='size-3 shrink-0 ml-1' />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
            <DialogDescription>
              {selectedItem?.targetScreenTitle} ({selectedItem?.targetScreenCode})
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2 text-sm'>
            <div className='flex items-center justify-between p-2.5 bg-muted rounded-md'>
              <span className='text-xs text-muted-foreground'>Trạng thái:</span>
              <Badge variant='outline'>{selectedItem?.statusBadge}</Badge>
            </div>
            <div className='space-y-1.5'>
              <span className='text-xs font-medium'>Chi tiết phân loại:</span>
              <ul className='list-disc pl-5 space-y-1 text-xs text-muted-foreground'>
                {selectedItem?.breakdown.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setSelectedItem(null)}>
              {language === 'vi' ? 'Đóng' : 'Close'}
            </Button>
            <Button
              size='sm'
              onClick={() => {
                if (selectedItem) {
                  const target = getRouteForTriage(selectedItem);
                  setSelectedItem(null);
                  navigate({ to: target });
                }
              }}
            >
              {selectedItem?.actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
