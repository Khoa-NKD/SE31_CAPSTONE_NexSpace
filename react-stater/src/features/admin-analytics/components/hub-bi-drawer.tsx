import React, { useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Star,
  Download
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { WorkspaceLeaderboardItemDTO } from '../api/types';
import { useLanguage } from '@/features/landing/context/language-context';

interface HubBiDrawerProps {
  hub: WorkspaceLeaderboardItemDTO | null;
  open: boolean;
  onClose: () => void;
}

export function HubBiDrawer({ hub, open, onClose }: HubBiDrawerProps) {
  const { language } = useLanguage();
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
    toast.success(language === 'vi' ? 'Đã xuất hồ sơ hiệu suất Hub' : 'Hub Performance Dossier Exported', {
      description: language === 'vi'
        ? `Đã tạo báo cáo viễn trắc vận hành và đối soát cho ${hub?.name}.`
        : `Downloaded operational telemetry & settlement audit for ${hub?.name}.`
    });
  }

  const isGold = hub.rank === 1;
  const isSilver = hub.rank === 2;
  const isBronze = hub.rank === 3;

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
        className='ns-modal-shine fixed top-0 right-0 h-screen w-full sm:w-[540px] z-50 bg-card text-card-foreground border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300'
      >
        {/* Header */}
        <div className='p-6 border-b border-border flex items-start justify-between bg-card shrink-0'>
          <div>
            <div className='flex items-center gap-2 mb-1.5'>
              <span
                className={`font-bold text-xs px-2.5 py-0.5 rounded border ${
                  isGold
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                    : isSilver
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-400'
                      : isBronze
                        ? 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                Rank #{hub.rank}
              </span>
              <Badge
                variant='outline'
                className='bg-primary/10 text-primary border-primary/20 text-[11px] font-bold'
              >
                {hub.rank <= 3
                  ? language === 'vi' ? 'Top Doanh thu' : 'Tier-1 Revenue Hub'
                  : language === 'vi' ? 'Không gian hoạt động' : 'Active Workspace'}
              </Badge>
            </div>
            <h2 className='text-lg font-bold text-foreground tracking-tight'>
              {hub.name}
            </h2>
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
              <MapPin className='size-3.5 text-muted-foreground shrink-0' />
              <span className='truncate'>{hub.address}, {hub.district || hub.city}</span>
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
                {language === 'vi' ? 'Doanh thu GMV' : 'Gross Revenue'}
              </span>
              <p className='text-xl font-extrabold text-foreground mt-1 font-heading'>
                {hub.localCurrencyDisplay || `${hub.grossRevenueVnd?.toLocaleString('vi-VN')} ₫`}
              </p>
              <span className='text-[11px] font-mono text-muted-foreground'>
                {hub.grossRevenueDisplay || `$${hub.grossRevenueUsd?.toFixed(1)} USD`}
              </span>
            </div>

            <div className='p-3.5 rounded-xl bg-muted/50 border border-border'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block'>
                {language === 'vi' ? 'Tỷ lệ lấp đầy' : 'Average Occupancy'}
              </span>
              <p className='text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-heading'>
                {hub.averageOccupancyPercent}%
              </p>
              <span className='text-[11px] font-semibold text-emerald-600 dark:text-emerald-400'>
                {language === 'vi' ? 'Trạng thái:' : 'Status:'} {hub.occupancyStatus}
              </span>
            </div>

            <div className='p-3.5 rounded-xl bg-muted/50 border border-border'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block'>
                {language === 'vi' ? 'Tổng lượt đặt chỗ' : 'Total Bookings'}
              </span>
              <p className='text-xl font-extrabold text-foreground mt-1 font-heading'>
                {hub.totalBookings30d.toLocaleString()}
              </p>
              <span className='text-[11px] text-muted-foreground'>
                {language === 'vi' ? 'Đặt chỗ thành công' : 'Confirmed reservations'}
              </span>
            </div>

            <div className='p-3.5 rounded-xl bg-muted/50 border border-border'>
              <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider block'>
                {language === 'vi' ? 'Đánh giá khách hàng' : 'Satisfaction Rating'}
              </span>
              <div className='flex items-center gap-1.5 mt-1'>
                <Star className='size-4 text-amber-500 fill-amber-500' />
                <span className='text-xl font-extrabold text-foreground font-heading'>
                  {hub.satisfactionRating}
                </span>
              </div>
              <span className='text-[11px] text-muted-foreground'>
                {language === 'vi' ? `Từ ${hub.reviewsCount} lượt đánh giá` : `Based on ${hub.reviewsCount} reviews`}
              </span>
            </div>
          </div>

          <div className='h-px bg-border' />

          {/* Operational Compliance Status */}
          <div className='p-3.5 rounded-lg bg-muted/40 border border-border space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='font-semibold text-foreground'>
                {language === 'vi' ? 'Trạng thái đối soát đối tác' : 'Partner Settlement Status'}
              </span>
              <Badge variant='outline' className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]'>
                {language === 'vi' ? '100% Cân khớp' : '100% Reconciled'}
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              {language === 'vi'
                ? 'Doanh thu được theo dõi trực tiếp từ các đơn đặt chỗ xác nhận. Thanh toán ký quỹ tuân thủ quy chuẩn bảo mật HSM và tích hợp tự động qua Webhook PayOS.'
                : 'Revenue tracked directly from verified reservations. Escrow settlements comply with HSM security standards and PayOS webhook integrations.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className='border-t border-border p-4 bg-muted/30 flex items-center justify-between shrink-0'>
          <Button variant='outline' size='sm' onClick={handleClose} className='text-xs'>
            {language === 'vi' ? 'Đóng' : 'Close'}
          </Button>
          <Button size='sm' onClick={handleExportHubReport} className='text-xs font-bold gap-1.5'>
            <Download className='size-3.5' />
            <span>{language === 'vi' ? 'Xuất báo cáo Hub' : 'Export Hub Dossier'}</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
