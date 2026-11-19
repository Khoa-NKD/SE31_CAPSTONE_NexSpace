import { formatDateLabel } from '@/lib/format';
import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Calendar,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalculatePriceQuery } from '../../api/booking-queries';
import { formatBookingMoney } from '../../utils/booking-money';
import { DateTimePickerModal, type ScheduleSelection } from '../detail/date-time-picker-modal';
import type { MapResource, CustomerFloor } from '../detail/public-floor-map';
import type { PublicWorkspaceDetail } from '../../api/types';

function computeHours(startIso?: string, endIso?: string, fallback = 2): number {
  if (!startIso || !endIso) return fallback;
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    if (!isNaN(s) && !isNaN(e) && e > s) {
      const diffHours = (e - s) / (1000 * 60 * 60);
      return Math.round(diffHours * 10) / 10;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    const [hStr, mStr] = timePart.split(':');
    if (hStr !== undefined && mStr !== undefined) {
      return `${hStr}:${mStr}`;
    }
  }
  return timeStr;
}

export interface SeatReservationWidgetProps {
  workspaceId?: number;
  floorId?: number;
  monitorAddonSelected?: boolean;
  resource?: MapResource | null;
  workspace?: PublicWorkspaceDetail | null;
  floor?: CustomerFloor | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  onScheduleChange?: (schedule: ScheduleSelection) => void;
}

export function SeatReservationWidget({
  workspaceId,
  floorId,
  monitorAddonSelected = false,
  resource,
  workspace,
  floor,
  date,
  startTime,
  endTime,
  onScheduleChange
}: SeatReservationWidgetProps) {
  const {
    data: quote,
    isFetching: loadingQuote,
    isError: quoteError
  } = useCalculatePriceQuery(
    workspaceId && resource?.id && startTime && endTime
      ? { workspaceId, resourceId: resource.id, startTime, endTime, priceType: 'HOURLY' }
      : null
  );
  const formatPrice = (amount: number) =>
    quote ? formatBookingMoney(amount, quote.currency) : '—';

  const effectiveWorkspaceId = workspaceId ?? (workspace?.id ? Number(workspace.id) : 1);
  const effectiveFloorId = floorId ?? floor?.id ?? 1;

  const hourlyRate = quote?.unitPrice ?? 0;
  const hours = useMemo(() => computeHours(startTime, endTime, 2), [startTime, endTime]);
  const standardTotal = quote?.baseAmount ?? 0;
  const vatAmount = quote?.taxAmount ?? 0;
  const totalDue = quote?.finalPrice ?? 0;

  const displayDate = formatDateLabel(date || '19/11/2026');
  const displayStartTime = formatDisplayTime(startTime) || '09:00';
  const displayEndTime = formatDisplayTime(endTime) || '11:00';
  const displaySeat = resource
    ? `${resource.name} (${resource.code})`
    : 'Desk A-04 (Executive Hot Desk)';

  return (
    <aside className='w-full'>
      <div className='bg-card border-border shadow-md space-y-5 rounded-xl border p-6'>
        {/* Pricing Header */}
        <div className='border-border/60 flex items-baseline justify-between border-b pb-4'>
          <div>
            <span className='font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl'>
              {formatPrice(hourlyRate)}
            </span>
            <span className='text-muted-foreground text-xs font-medium'> / giờ</span>
          </div>
        </div>

        {/* Live Hold Status Indicator */}
        <div className='flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/70 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10'>
          <span className='relative flex h-2.5 w-2.5'>
            <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
            <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600' />
          </span>
          <span className='text-xs font-semibold text-emerald-900 dark:text-emerald-300'>
            Xác nhận tức thì • Miễn phí giữ chỗ 10 phút
          </span>
        </div>

        {/* Reservation Details Box with DateTimePickerModal */}
        <div className='border-border/80 bg-muted/30 rounded-xl border p-4'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
              Khung giờ đã chọn
            </span>
            <DateTimePickerModal
              workspaceId={effectiveWorkspaceId}
              workspaceName={workspace?.name}
              operatingHours={workspace?.operatingHours}
              pricePerHour={hourlyRate}
              initialDate={startTime ? startTime.split('T')[0] : date}
              initialStartTime={startTime ? startTime.split('T')[1] : undefined}
              initialEndTime={endTime ? endTime.split('T')[1] : undefined}
              onConfirm={onScheduleChange}
            >
              <button
                type='button'
                className='text-primary hover:text-primary/80 cursor-pointer text-xs font-semibold underline underline-offset-2'
              >
                Thay đổi
              </button>
            </DateTimePickerModal>
          </div>

          <div className='flex items-center gap-2.5'>
            <Calendar className='text-primary h-5 w-5 shrink-0' />
            <div className='text-xs'>
              <p className='text-foreground font-semibold'>{displayDate}</p>
              <p className='text-muted-foreground text-[11px]'>
                {displayStartTime} – {displayEndTime} ({hours} giờ sử dụng)
              </p>
            </div>
          </div>
        </div>

        {/* Selected Seat Pill */}
        <div className='border-border/70 bg-muted/40 flex items-center justify-between rounded-lg border border-dashed p-3 text-xs'>
          <div className='flex items-center gap-2'>
            <CheckCircle2 className='text-primary h-4 w-4 shrink-0' />
            <span className='text-foreground font-medium truncate max-w-[200px]'>
              {displaySeat}
            </span>
          </div>
          <span className='text-emerald-600 dark:text-emerald-400 font-bold'>Đang chọn</span>
        </div>

        {/* Monitor Add-on Item if Selected */}
        {monitorAddonSelected && (
          <div className='border-border/70 bg-primary/5 flex items-center justify-between rounded-lg border p-2.5 text-xs'>
            <span className='text-foreground font-medium'>Màn hình phụ 4K 27" ({hours}h)</span>
            <span className='text-muted-foreground'>Chưa tính dịch vụ mua thêm</span>
          </div>
        )}

        {/* Cost Breakdown List */}
        <div className='border-border/60 space-y-2 border-b pb-4 text-xs'>
          <div className='flex justify-between text-muted-foreground'>
            <span>
              Đơn giá tiêu chuẩn ({hours}h × {formatPrice(hourlyRate)})
            </span>
            <span className='text-foreground font-medium'>{formatPrice(standardTotal)}</span>
          </div>

          <div className='flex justify-between text-muted-foreground'>
            <span>Phí dịch vụ khách</span>
            <span className='text-emerald-600 dark:text-emerald-400 font-medium'>Miễn phí</span>
          </div>

          <div className='flex justify-between text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <span>Thuế GTGT / VAT theo báo giá</span>
              <Info className='h-3 w-3' />
            </span>
            <span className='text-foreground font-medium'>{formatPrice(vatAmount)}</span>
          </div>

          <div className='border-border/60 flex items-baseline justify-between border-t pt-3'>
            <span className='text-foreground text-sm font-bold'>Tổng thanh toán</span>
            <div className='text-right'>
              <span className='text-primary font-sans text-xl font-bold tracking-tight'>
                {formatPrice(totalDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Booking Action (links to /workspaces/review) */}
        {!quote && (
          <p role={quoteError ? 'alert' : 'status'} className='text-sm text-muted-foreground'>
            {loadingQuote
              ? 'Đang tải giá...'
              : quoteError
                ? 'Không tải được giá. Vui lòng thử lại.'
                : 'Chọn ghế/phòng và thời gian để xem giá.'}
          </p>
        )}
        {quote && resource && startTime && endTime ? (
          <Button
            asChild
            className='group h-11 w-full cursor-pointer rounded-lg text-sm font-semibold shadow-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-2'
          >
            <Link
              to='/workspaces/review'
              search={{
                workspaceId: effectiveWorkspaceId,
                resourceId: resource.id,
                startTime,
                endTime,
                date: displayDate,
                priceType: 'HOURLY'
              }}
            >
              <span>Xác nhận vị trí &amp; Tiếp tục</span>
              <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
            </Link>
          </Button>
        ) : (
          <Button disabled className='w-full'>
            Chưa có báo giá hợp lệ
          </Button>
        )}

        {/* Secondary Actions */}
        <div className='grid grid-cols-2 gap-2'>
          <Button asChild variant='outline' className='cursor-pointer text-xs font-medium h-9'>
            <Link
              to='/workspaces/seats'
              search={{
                workspaceId: effectiveWorkspaceId,
                floorId: effectiveFloorId,
                date: date,
                startTime: startTime,
                endTime: endTime,
                view: 'list'
              }}
            >
              Xem các vị trí khác
            </Link>
          </Button>
          <Button asChild variant='outline' className='cursor-pointer text-xs font-medium h-9'>
            <Link
              to='/workspaces/seats'
              search={{
                workspaceId: effectiveWorkspaceId,
                floorId: effectiveFloorId,
                resourceId: resource?.id,
                date: date,
                startTime: startTime,
                endTime: endTime,
                view: 'map'
              }}
            >
              Xem trên sơ đồ
            </Link>
          </Button>
        </div>

        {/* Security & Guarantee Badges */}
        <div className='border-border/60 space-y-2 border-t pt-4 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='text-primary h-4 w-4 shrink-0' />
            <span>Thanh toán bảo mật chuẩn VietQR PayOS</span>
          </div>
          <div className='flex items-center gap-2'>
            <CalendarCheck className='text-primary h-4 w-4 shrink-0' />
            <span>Miễn phí hủy trong 10 phút giữ chỗ</span>
          </div>
          <div className='flex items-center gap-2'>
            <QrCode className='text-primary h-4 w-4 shrink-0' />
            <span>Nhận mã QR Check-in tức thì</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
