import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import React from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Download, Plus, Radio, Calendar } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';

interface BookingsHeaderBarProps {
  onExportCsv: () => void;
  onOpenManualModal?: () => void;
  onManualReservation?: () => void;
  lastSyncTime?: string;
  onSync?: () => void;
}

export function BookingsHeaderBar({
  onExportCsv,
  onOpenManualModal,
  onManualReservation,
  lastSyncTime,
  onSync
}: BookingsHeaderBarProps) {
  const c = useOrganizerCopy();
  const handleOpenModal = onManualReservation || onOpenManualModal || (() => {});
  return (
    <div className='space-y-4'>
      {/* Top Breadcrumb Navigation */}
      <nav
        aria-label={c('Breadcrumb', 'Điều hướng')}
        className='flex items-center gap-1.5 text-xs text-muted-foreground select-none'
      >
        <Link to='/dashboard/organizer' className='hover:text-foreground transition-colors'>
          {c('Overview', 'Tổng quan')}
        </Link>
        <ChevronRight className='w-3 h-3 text-muted-foreground/60' />
        <span className='font-semibold text-foreground'>
          {c('Bookings Ledger', 'Danh sách đặt chỗ')}
        </span>
      </nav>

      <OrganizerPageHeader
        icon={<Calendar />}
        title={c('Bookings Ledger & Reservations', 'Quản lý đặt chỗ')}
        description={c(
          'Review reservations, payments and check-ins.',
          'Theo dõi đặt chỗ, thanh toán và nhận chỗ.'
        )}
      >
        <button
          type='button'
          onClick={onSync}
          className='hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer'
          title={c('Click to refresh live sync status', 'Nhấn để làm mới trạng thái đồng bộ')}
        >
          <Radio className='w-3 h-3 animate-pulse' />
          <span>
            {c('Live Sync:', 'Đồng bộ trực tiếp:')} {lastSyncTime || 'Online'}
          </span>
        </button>
        {/* Action CTAs */}
        <div className='flex items-center gap-2.5 shrink-0'>
          <Button
            asChild
            variant='outline'
            size='sm'
            className='h-9 px-3 text-xs gap-1.5 border-border hover:bg-muted/80 shadow-2xs text-muted-foreground hover:text-foreground'
          >
            <Link to='/dashboard/organizer/schedule'>
              <Calendar className='w-3.5 h-3.5 text-primary' />
              <span>{c('Calendar View', 'Xem lịch')}</span>
            </Link>
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={onExportCsv}
            className='h-9 px-3 text-xs gap-1.5 border-border hover:bg-muted/80 shadow-2xs'
          >
            <Download className='w-3.5 h-3.5' />
            <span>{c('Export CSV / Excel', 'Xuất CSV / Excel')}</span>
          </Button>

          <Button
            size='sm'
            onClick={handleOpenModal}
            className='h-9 px-3.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>{c('Manual Reservation', 'Tạo đặt chỗ thủ công')}</span>
          </Button>
        </div>
      </OrganizerPageHeader>
    </div>
  );
}
