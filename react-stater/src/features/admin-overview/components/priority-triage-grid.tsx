import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { AlertTriangle, ArrowRight, ShieldCheck, Store, Gavel, Clock } from 'lucide-react';
import { TriageItem } from '../data/mock-overview';

interface PriorityTriageGridProps {
  items: TriageItem[];
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'action':
      return <ShieldCheck className='size-5 text-amber-700 dark:text-amber-300' />;
    case 'verification':
      return <Store className='size-5 text-amber-700 dark:text-amber-300' />;
    case 'dispute':
      return <Gavel className='size-5 text-red-700 dark:text-red-300' />;
    default:
      return <AlertTriangle className='size-5 text-amber-700' />;
  }
}

export function PriorityTriageGrid({ items }: PriorityTriageGridProps) {
  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null);

  return (
    <section className='mb-6' aria-label='Operational Workload & Priority Triage'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <AlertTriangle className='size-5 text-amber-500' />
          <h2 className='text-base font-semibold text-foreground tracking-tight'>
            Operational Workload &amp; Priority Triage
          </h2>
        </div>
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <Clock className='size-3.5' />
          <span>SLA Target: Under 24h review window</span>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
        {items.map((item) => {
          const isDispute = item.category === 'dispute';
          return (
            <Card
              key={item.id}
              className={`rounded-xl p-5 border-l-4 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-150 ${
                isDispute
                  ? 'border-red-200 bg-red-50/30 dark:bg-red-950/20 border-l-red-500 dark:border-red-800'
                  : 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 border-l-amber-500 dark:border-amber-800'
              }`}
            >
              <div>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex items-center gap-3'>
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                        isDispute
                          ? 'bg-red-100 border-red-200 dark:bg-red-900/40 dark:border-red-800'
                          : 'bg-amber-100 border-amber-200 dark:bg-amber-900/40 dark:border-amber-800'
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h3 className='text-sm font-semibold text-foreground leading-tight'>
                        {item.title}
                      </h3>
                      <span
                        className={`text-xs font-medium block mt-0.5 ${
                          isDispute
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-amber-800 dark:text-amber-400'
                        }`}
                      >
                        {item.waitingNotice}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant='outline'
                    className={`text-[11px] font-bold shrink-0 ${
                      isDispute
                        ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/60 dark:text-red-200 animate-pulse'
                        : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200'
                    }`}
                  >
                    {item.statusBadge}
                  </Badge>
                </div>

                <div className='my-4'>
                  <div
                    className={`text-3xl font-bold tracking-tight ${
                      isDispute ? 'text-red-700 dark:text-red-400' : 'text-foreground'
                    }`}
                  >
                    {item.countLabel}
                  </div>
                  <div className='flex flex-wrap gap-1.5 mt-2'>
                    {item.breakdown.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded border ${
                          isDispute
                            ? 'bg-card text-red-900 dark:text-red-300 border-red-200/80 dark:border-red-800'
                            : 'bg-card text-slate-700 dark:text-slate-300 border-amber-200/80 dark:border-amber-800'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                variant='outline'
                onClick={() => setSelectedItem(item)}
                className={`w-full flex items-center justify-between text-xs font-semibold py-2 px-3.5 transition-all shadow-xs ${
                  isDispute
                    ? 'bg-red-600 hover:bg-red-700 text-white border-transparent'
                    : 'bg-card hover:bg-amber-500 hover:text-white text-foreground border-amber-300 dark:border-amber-700'
                }`}
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className='size-3.5' />
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Simulated Action / Future Batch Informational Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='size-5 text-amber-500' />
              <span>Simulated Action: {selectedItem?.title}</span>
            </DialogTitle>
            <DialogDescription className='pt-2 text-sm text-muted-foreground'>
              This triage button is designated to route to screen{' '}
              <strong className='text-foreground font-semibold'>
                {selectedItem?.targetScreenCode} — {selectedItem?.targetScreenTitle}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className='p-3 bg-muted/60 rounded-lg text-xs space-y-2 border border-border'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Current Pending Items:</span>
              <span className='font-semibold text-foreground'>{selectedItem?.countLabel}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Waiting Window:</span>
              <span className='font-medium text-foreground'>{selectedItem?.waitingNotice}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Target Screen Code:</span>
              <Badge variant='outline'>{selectedItem?.targetScreenCode}</Badge>
            </div>
            <p className='text-muted-foreground pt-1 border-t border-border/60 text-[11px]'>
              Screen {selectedItem?.targetScreenCode} is scheduled for implementation in subsequent batches.
              In accordance with project scope rules, broken navigation links are disabled.
            </p>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setSelectedItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
