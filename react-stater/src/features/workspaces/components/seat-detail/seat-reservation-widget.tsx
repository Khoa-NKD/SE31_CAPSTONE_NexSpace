import { Spinner as Loader2 } from '@/components/ui/spinner';
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
  ShieldAlert,
  Monitor
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { useCalculatePriceQuery, useCreateBookingMutation } from '../../api/booking-queries';
import { formatBookingMoney } from '../../utils/booking-money';
import { useLanguage } from '@/features/landing/context/language-context';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useCurrentPendingBooking } from '@/features/payments/api';
import { toast } from 'sonner';
import { DateTimePickerModal, type ScheduleSelection } from '../detail/date-time-picker-modal';
import type { MapResource, CustomerFloor } from '../detail/public-floor-map';
import type { PublicWorkspaceDetail } from '../../api/types';

function getTodayIso() {
  return new Date().toISOString().split('T')[0];
}

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
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const createBookingMutation = useCreateBookingMutation();
  const { data: currentPendingBooking } = useCurrentPendingBooking();
  const maxHoldAttempts = currentPendingBooking?.maxHoldAttempts ?? 3;
  const penaltyBlockMinutes = currentPendingBooking?.penaltyBlockMinutes ?? 20;
  const isHoldBlocked = Boolean(
    currentPendingBooking?.isBookingSuspended ||
      (currentPendingBooking?.remainingHoldAttempts !== undefined && currentPendingBooking.remainingHoldAttempts <= 0)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveWorkspaceId = workspaceId ?? (workspace?.id ? Number(workspace.id) : 1);
  const effectiveFloorId = floorId ?? floor?.id ?? 1;

  const hourlyRate = quote?.unitPrice ?? 0;
  const hours = useMemo(() => computeHours(startTime, endTime, 2), [startTime, endTime]);
  const standardTotal = quote?.baseAmount ?? 0;
  const vatAmount = quote?.taxAmount ?? 0;

  // Addon calculations
  const isVnd = quote?.currency === 'VND' || (!quote?.currency && hourlyRate > 1000);
  const addonRatePerHour = isVnd ? 35000 : 1.5;
  const addonTotal = monitorAddonSelected ? addonRatePerHour * hours : 0;
  const totalDue = (quote?.finalPrice ?? 0) + addonTotal;
  const addonName = isVi ? 'Màn hình phụ Dell 27" 4K' : 'Dell 27" 4K Monitor Add-on';

  const [todayIso] = useState(getTodayIso);
  const displayDate = formatDateLabel(date || todayIso);
  const displayStartTime = formatDisplayTime(startTime) || '09:00';
  const displayEndTime = formatDisplayTime(endTime) || '11:00';
  const displaySeat = resource
    ? (resource.name ? `${resource.name} (${resource.code})` : resource.code)
    : 'Vị trí làm việc';

  // Check if an existing valid hold matches this user and resource
  const existingHold = useMemo(() => {
    if (bookingId && bookingCode) {
      return { bookingId, bookingCode };
    }
    if (
      currentPendingBooking &&
      currentPendingBooking.bookingId &&
      currentPendingBooking.bookingCode &&
      resource?.id &&
      currentPendingBooking.resourceId === resource.id &&
      (!currentPendingBooking.workspaceId ||
        currentPendingBooking.workspaceId === effectiveWorkspaceId) &&
      (currentPendingBooking.remainingSeconds
        ? Number(currentPendingBooking.remainingSeconds) > 0
        : true)
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

    if (isHoldBlocked) {
      toast.error(
        isVi
          ? `Tài khoản của bạn đã dùng hết số lần giữ chỗ cho phép (${maxHoldAttempts} lần) hoặc đang bị tạm khóa. Vui lòng hoàn tất thanh toán đơn hiện tại hoặc chờ hết thời gian khóa.`
          : 'Your booking privileges are temporarily suspended or you have reached the maximum hold attempts.',
        {
          description: currentPendingBooking?.bookingSuspendedUntil
            ? `Tạm khóa đến ${new Date(currentPendingBooking.bookingSuspendedUntil).toLocaleTimeString('vi-VN')} (trong vòng ${penaltyBlockMinutes} phút).`
            : undefined
        }
      );
      return;
    }

    // 1. Guest defense: Redirect to login and return back cleanly
    if (!isAuthenticated) {
      toast.info(
        isVi
          ? 'Vui lòng đăng nhập để giữ chỗ và tiếp tục'
          : 'Please sign in to hold this seat and proceed'
      );
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
          priceType: 'HOURLY',
          addonAmount: monitorAddonSelected ? addonTotal : undefined,
          addonName: monitorAddonSelected ? addonName : undefined
        }
      });
      return;
    }

    if (!quote || quoteError || !startTime || !endTime) {
      toast.error(
        isVi
          ? 'Chọn thời gian và đợi báo giá hợp lệ trước khi giữ chỗ.'
          : 'Select a time and wait for a valid quote before holding this seat.'
      );
      return;
    }

    // 3. Otherwise hold seat via API (creating a 10-minute hold in DB)
    try {
      setIsSubmitting(true);
      const targetStartTime = startTime;
      const targetEndTime = endTime;

      const booking = await createBookingMutation.mutateAsync({
        workspaceId: effectiveWorkspaceId,
        resourceId: resource.id,
        startTime: targetStartTime,
        endTime: targetEndTime,
        priceType: 'HOURLY',
        partySize: resource.capacity || 1,
        addonAmount: monitorAddonSelected ? addonTotal : undefined,
        notes: monitorAddonSelected ? `Kèm tiện ích: ${addonName}` : undefined
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
          priceType: 'HOURLY',
          addonAmount: monitorAddonSelected ? addonTotal : undefined,
          addonName: monitorAddonSelected ? addonName : undefined
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
          <div className='border-primary/40 bg-primary/5 flex items-center justify-between rounded-lg border p-2.5 text-xs animate-in fade-in'>
            <div className='flex items-center gap-2'>
              <Monitor className='text-primary h-4 w-4 shrink-0' />
              <span className='text-foreground font-semibold'>
                {addonName} ({hours}h)
              </span>
            </div>
            <span className='text-primary font-bold'>+{formatPrice(addonTotal)}</span>
          </div>
        )}

        {/* Cost Breakdown List */}
        <div className='border-border/60 space-y-2 border-b pb-4 text-xs'>
          <div className='flex justify-between text-muted-foreground'>
            <span>
              {isVi ? 'Đơn giá tiêu chuẩn' : 'Standard Rate'} ({hours}h × {formatPrice(hourlyRate)})
            </span>
            <span className='text-foreground font-medium'>{formatPrice(standardTotal)}</span>
          </div>

          {monitorAddonSelected && (
            <div className='flex justify-between text-muted-foreground animate-in fade-in'>
              <span className='flex items-center gap-1.5'>
                <span>{isVi ? 'Tiện ích bổ sung' : 'Add-on service'} ({hours}h × {formatPrice(addonRatePerHour)})</span>
                <Info className='h-3 w-3' />
              </span>
              <span className='text-primary font-bold'>+{formatPrice(addonTotal)}</span>
            </div>
          )}

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
        {/* Banner Cảnh báo khi người dùng bị khóa đặt chỗ do quá số lần hold cho phép không thanh toán hoặc còn 0 lượt */}
        {isHoldBlocked && (
          <div className='rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2.5 shadow-2xs animate-in fade-in'>
            <ShieldAlert className='size-4 shrink-0 text-destructive' />
            <div className='flex-1'>
              <p className='font-semibold'>
                {isVi ? 'Tài khoản đang bị tạm khóa giữ chỗ / đặt chỗ' : 'Booking privileges suspended'}
              </p>
              <p className='text-[11px] text-destructive/90 mt-0.5'>
                {isVi
                  ? `Bạn đã dùng hết ${maxHoldAttempts} lần giữ chỗ mà không hoàn tất thanh toán. Vui lòng hoàn tất thanh toán đơn hiện tại hoặc thử lại sau${currentPendingBooking?.bookingSuspendedUntil ? ` (${new Date(currentPendingBooking.bookingSuspendedUntil).toLocaleTimeString('vi-VN')})` : ''}.`
                  : `You have reached the maximum ${maxHoldAttempts} hold attempts. Please complete payment or try again later.`}
              </p>
            </div>
          </div>
        )}

        {/* Primary Booking Action (holds seat and navigates to /workspaces/review) */}
        <Button
          type='button'
          onClick={handleConfirmAndProceed}
          disabled={
            isSubmitting ||
            createBookingMutation.isPending ||
            isHoldBlocked ||
            (!existingHold && (!quote || quoteError || !startTime || !endTime))
          }
          className={`group h-11 w-full cursor-pointer rounded-lg text-sm font-semibold shadow-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
            isHoldBlocked ? 'opacity-60 bg-muted-foreground/30 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting || createBookingMutation.isPending ? (
            <>
              <Loader2 className='h-4 w-4' />
              <span>{isVi ? 'Đang giữ chỗ...' : 'Holding Seat...'}</span>
            </>
          ) : isHoldBlocked ? (
            <>
              <ShieldAlert className='h-4 w-4 text-destructive' />
              <span>
                {currentPendingBooking?.isBookingSuspended
                  ? isVi ? 'Đang bị khóa đặt chỗ (20p)' : 'Privileges Suspended'
                  : isVi ? 'Hết lượt giữ chỗ (0 lượt)' : 'Hold Limit Exceeded'}
              </span>
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
