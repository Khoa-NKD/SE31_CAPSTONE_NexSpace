import React, { useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Star,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { WorkspaceLeaderboardItem } from '../data/mock-analytics';

interface HubBiDrawerProps {
  hub: WorkspaceLeaderboardItem | null;
  open: boolean;
  onClose: () => void;
}

export function HubBiDrawer({ hub, open, onClose }: HubBiDrawerProps) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      if (document.activeElement instanceof HTMLElement) {
        triggerRef.current = document.activeElement;
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        if (triggerRef.current) {
          triggerRef.current.focus({ preventScroll: true });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !hub) return null;

  const handleClose = () => {
    onClose();
    if (triggerRef.current) {
      triggerRef.current.focus({ preventScroll: true });
    }
  };

  function handleExportHubReport() {
    toast.success('Hub Performance Dossier Exported', {
      description: `Downloaded operational telemetry & settlement audit for ${hub?.name}.`
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-background/80 backdrop-blur-xs z-40 transition-opacity'
        onClick={handleClose}
        aria-hidden='true'
      />

      {/* Slide-over Panel */}
      <aside
        aria-label='Hub Business Intelligence Panel'
        className='fixed top-0 right-0 h-screen w-full sm:w-[540px] z-50 bg-card text-card-foreground border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300'
      >
        {/* Header */}
        <div className='p-6 border-b border-border flex items-start justify-between bg-card shrink-0'>
          <div>
            <div className='flex items-center gap-2 mb-1.5'>
              <span className='bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold text-xs px-2.5 py-0.5 rounded border border-amber-500/30'>
                Rank #{hub.rank}
              </span>
              <Badge
                variant='outline'
                className='bg-primary/10 text-primary border-primary/20 text-[11px] font-bold'
              >
                Tier-1 Revenue Hub
              </Badge>
            </div>
            <h2 className='text-lg font-bold text-foreground tracking-tight'>
              {hub.name}
            </h2>
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
              <MapPin className='size-3.5 text-muted-foreground' />
              <span>{hub.address}</span>
            </div>
          </div>

          <button
            type='button'
            onClick={handleClose}
            aria-label='Close Panel (Esc)'
            className='p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
          >
            <X className='size-5' />
          </button>
        </div>

        {/* Body Content */}
        <div className='p-6 space-y-6 overflow-y-auto flex-1 text-xs'>
          {/* Key Metrics Grid */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='p-3.5 rounded-xl bg-muted/50 border border-border'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block'>
                Gross Revenue (30D)
              </span>
              <p className='text-xl font-extrabold text-foreground mt-1'>
                {hub.grossRevenueDisplay}
              </p>
              <span className='text-[11px] font-mono text-muted-foreground'>
                {hub.localCurrencyDisplay}
              </span>
            </div>

            <div className='p-3.5 rounded-xl bg-muted/50 border border-border'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block'>
                Average Occupancy
              </span>
              <p className='text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1'>
                {hub.averageOccupancyPercent}%
              </p>
              <span className='text-[11px] font-semibold text-emerald-600 dark:text-emerald-400'>
                Status: {hub.occupancyStatus}
              </span>
            </div>

            <div className='p-3.5 rounded-xl bg-muted/50 border border-border'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block'>
                Total Bookings
              </span>
              <p className='text-xl font-extrabold text-foreground mt-1'>
                {hub.totalBookings30d.toLocaleString()}
              </p>
              <span className='text-[11px] text-muted-foreground'>Confirmed reservations</span>
            </div>

            <div className='p-3.5 rounded-xl bg-muted/50 border border-border'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block'>
                Satisfaction Rating
              </span>
              <div className='flex items-center gap-1.5 mt-1'>
                <Star className='size-4 text-amber-500 fill-amber-500' />
                <span className='text-xl font-extrabold text-foreground'>
                  {hub.satisfactionRating}
                </span>
              </div>
              <span className='text-[11px] text-muted-foreground'>
                Based on {hub.reviewsCount} member ratings
              </span>
            </div>
          </div>

          <div className='h-px bg-border' />

          {/* Space Modality Distribution */}
          <div className='space-y-3'>
            <h3 className='text-xs font-bold text-foreground uppercase tracking-wider'>
              Space Allocation &amp; Capacity
            </h3>
            <div className='space-y-2.5'>
              <div>
                <div className='flex justify-between text-xs mb-1'>
                  <span className='text-foreground font-semibold'>Hot Desks &amp; Open Space (64 desks)</span>
                  <span className='font-mono text-muted-foreground'>94% Utilization</span>
                </div>
                <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
                  <div className='bg-primary h-2 rounded-full' style={{ width: '94%' }} />
                </div>
              </div>

              <div>
                <div className='flex justify-between text-xs mb-1'>
                  <span className='text-foreground font-semibold'>Meeting Suites &amp; Pods (12 rooms)</span>
                  <span className='font-mono text-muted-foreground'>82% Utilization</span>
                </div>
                <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
                  <div className='bg-sky-500 h-2 rounded-full' style={{ width: '82%' }} />
                </div>
              </div>

              <div>
                <div className='flex justify-between text-xs mb-1'>
                  <span className='text-foreground font-semibold'>Private Corporate Wings (4 suites)</span>
                  <span className='font-mono text-muted-foreground'>100% Leased (Annual)</span>
                </div>
                <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
                  <div className='bg-emerald-500 h-2 rounded-full' style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className='h-px bg-border' />

          {/* Operational Compliance Status */}
          <div className='p-3.5 rounded-lg bg-muted/40 border border-border space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='font-semibold text-foreground'>Partner Settlement Status</span>
              <Badge variant='outline' className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]'>
                100% Reconciled
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              All monthly disbursement batches are settled with 0 unresolved escrow claims. Tax withholding complies with Decree 123 e-invoicing standards.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className='border-t border-border p-5 bg-muted/40 flex items-center justify-between shrink-0'>
          <Button variant='outline' onClick={handleClose} className='text-xs'>
            Close
          </Button>
          <Button onClick={handleExportHubReport} className='text-xs font-bold gap-1.5'>
            <Download className='size-3.5' />
            Export Hub BI Dossier
          </Button>
        </div>
      </aside>
    </>
  );
}
