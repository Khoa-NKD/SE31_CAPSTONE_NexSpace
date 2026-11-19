import { formatDateLabel } from '@/lib/format';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Calendar,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  QrCode,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/features/landing/context/currency-context';
import { useLanguage } from '@/features/landing/context/language-context';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useCreateBookingMutation } from '../../api/booking-queries';
import { useCurrentPendingBooking } from '@/features/payments/api';
import { toast } from 'sonner';
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
  bookingId?: number;
  bookingCode?: string;
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
  bookingId,
  bookingCode,
  monitorAddonSelected = false,
  resource,
  workspace,
  floor,
  date,
  startTime,
  endTime,
  onScheduleChange
}: SeatReservationWidgetProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const createBookingMutation = useCreateBookingMutation();
  const { data: currentPendingBooking } = useCurrentPendingBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatPrice } = useCurrency();

  const effectiveWorkspaceId =
    workspaceId ?? (workspace?.id ? Number(workspace.id) : 1);
  const effectiveFloorId = floorId ?? floor?.id ?? 1;

  const hourlyRate = resource?.pricePerHour || workspace?.pricePerHour || 35000;
  const hours = useMemo(() => computeHours(startTime, endTime, 2), [startTime, endTime]);
  const monitorHourlyRate = 25000;
  const monitorTotal = monitorAddonSelected ? monitorHourlyRate * hours : 0;
  const standardTotal = hourlyRate * hours;
  const subtotal = standardTotal + monitorTotal;
  const vatAmount = subtotal * 0.08;
  const totalDue = subtotal + vatAmount;

  const displayDate = formatDateLabel(date || '19/11/2026');
  const displayStartTime = formatDisplayTime(startTime) || '09:00';
  const displayEndTime = formatDisplayTime(endTime) || '11:00';
  const displaySeat = resource ? `${resource.name} (${resource.code})` : 'Desk A-04 (Executive Hot Desk)';
  const dayPassPrice = hourlyRate * 6;

  // Check if an existing valid hold matches this user and resource
  const existingHold = useMemo(() => {
    if (bookingId && bookingCode) {
      return { bookingId, bookingCode };
    }
    if (
      currentPendingBooking &&
      resource?.id &&
      currentPendingBooking.resourceId === resource.id &&
      (!currentPendingBooking.workspaceId || currentPendingBooking.workspaceId === effectiveWorkspaceId) &&
      (currentPendingBooking.remainingSeconds ? Number(currentPendingBooking.remainingSeconds) > 0 : true)
    ) {
      return {
        bookingId: currentPendingBooking.bookingId,
        bookingCode: currentPendingBooking.bookingCode
      };
    }
    return null;
  }, [bookingId, bookingCode, currentPendingBooking, resource?.id, effectiveWorkspaceId]);

  const handleConfirmAndProceed = async () => {
    if (!resource) {
      toast.error(isVi ? 'Không tìm thấy vị trí chỗ ngồi.' : 'Seat information not found.');
      return;
    }

    // 1. Guest defense: Redirect to login and return back cleanly
    if (!isAuthenticated) {
      toast.info(isVi ? 'Vui lòng đăng nhập để giữ chỗ và tiếp tục' : 'Please sign in to hold this seat and proceed');
      const redirectUrl = `/workspaces/seat-detail?workspaceId=${effectiveWorkspaceId}&resourceId=${resource.id}${floorId ? `&floorId=${floorId}` : ''}&date=${encodeURIComponent(displayDate)}&startTime=${encodeURIComponent(startTime || '')}&endTime=${encodeURIComponent(endTime || '')}`;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('nexspace_auth_redirect', redirectUrl);
      }
      navigate({
        to: '/auth/sign-in',
        search: { redirect: redirectUrl }
      });
      return;
    }

    // 2. Reuse existing hold if already active
    if (existingHold) {
      navigate({
        to: '/workspaces/review',
        search: {
          workspaceId: effectiveWorkspaceId,
          resourceId: resource.id,
          bookingId: existingHold.bookingId,
          bookingCode: existingHold.bookingCode,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          date: displayDate,
          priceType: 'HOURLY'
        }
      });
      return;
    }

    // 3. Otherwise hold seat via API (creating a 10-minute hold in DB)
    try {
      setIsSubmitting(true);
      const targetStartTime = startTime || new Date().toISOString();
      const targetEndTime = endTime || new Date(Date.now() + 2 * 3600 * 1000).toISOString();

      const booking = await createBookingMutation.mutateAsync({
        workspaceId: effectiveWorkspaceId,
        resourceId: resource.id,
        startTime: targetStartTime,
        endTime: targetEndTime,
        priceType: 'HOURLY',
        partySize: resource.capacity || 1
      });

      toast.success(
        isVi
          ? `Đã giữ chỗ ${resource.name || resource.code} trong 10 phút!`
          : `Held ${resource.name || resource.code} for 10 minutes!`
      );

      navigate({
        to: '/workspaces/review',
        search: {
          workspaceId: effectiveWorkspaceId,
          resourceId: resource.id,
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          startTime: targetStartTime,
          endTime: targetEndTime,
          date: displayDate,
          priceType: 'HOURLY'
        }
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.message ||
        (isVi
          ? 'Vị trí này hiện đang được giữ chỗ hoặc đã có người đặt trong khung giờ này. Vui lòng chọn vị trí khác.'
          : 'This seat is currently held or booked by someone else. Please select another seat.');
      toast.error(isVi ? 'Không thể giữ chỗ' : 'Cannot hold seat', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className='text-right'>
            <span className='rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'>
              {formatPrice(dayPassPrice)} / ngày
            </span>
            <p className='text-muted-foreground mt-0.5 text-[11px]'>Tiết kiệm 25% trọn ngày</p>
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
            <span className='text-primary font-semibold'>{formatPrice(monitorTotal)}</span>
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

          {monitorAddonSelected && (
            <div className='flex justify-between text-muted-foreground'>
              <span>Phụ phí màn hình 4K</span>
              <span className='text-foreground font-medium'>{formatPrice(monitorTotal)}</span>
            </div>
          )}

          <div className='flex justify-between text-muted-foreground'>
            <span>Phí dịch vụ &amp; Quản trị (2.5%)</span>
            <span className='text-emerald-600 dark:text-emerald-400 font-medium'>Miễn phí</span>
          </div>

          <div className='flex justify-between text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <span>Thuế GTGT / VAT (8%)</span>
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

        {/* Primary Booking Action (holds seat and navigates to /workspaces/review) */}
        <Button
          type='button'
          onClick={handleConfirmAndProceed}
          disabled={isSubmitting || createBookingMutation.isPending}
          className='group h-11 w-full cursor-pointer rounded-lg text-sm font-semibold shadow-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-2'
        >
          {isSubmitting || createBookingMutation.isPending ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>{isVi ? 'Đang giữ chỗ...' : 'Holding Seat...'}</span>
            </>
          ) : (
            <>
              <span>{isVi ? 'Xác nhận vị trí & Tiếp tục' : 'Confirm & Proceed'}</span>
              <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
            </>
          )}
        </Button>

        {/* Secondary Actions */}
        <div className='grid grid-cols-2 gap-2'>
          <Button
            asChild
            variant='outline'
            className='cursor-pointer text-xs font-medium h-9'
          >
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
          <Button
            asChild
            variant='outline'
            className='cursor-pointer text-xs font-medium h-9'
          >
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
