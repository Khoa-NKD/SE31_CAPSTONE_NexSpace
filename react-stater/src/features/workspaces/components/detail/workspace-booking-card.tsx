import { formatDateLabel } from '@/lib/format';
import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Calendar,
  ArrowRight,
  Clock,
  ShieldCheck,
  Zap,
  CheckCircle2,
  X,
  Users,
  Sparkles
} from '@/components/ui/hugeicons';
import type { PublicWorkspaceDetail } from '../../api/types';
import { useLanguage } from '@/features/landing/context/language-context';
import { useCurrency } from '@/features/landing/context/currency-context';
import {
  DateTimePickerModal,
  parseTimeToMinutes,
  type ScheduleSelection
} from './date-time-picker-modal';
import type { CustomerFloor, MapResource } from './public-floor-map';
import type { ResourceAvailabilityItem } from '@/features/workspaces/api/booking-types';
import { useCurrentPendingBooking } from '@/features/payments/api';
import { cn } from '@/lib/utils';
import { customerResourceStatus } from '../../utils/customer-resource-status';

interface WorkspaceBookingCardProps {
  workspace?: PublicWorkspaceDetail;
  floors?: CustomerFloor[];
  selectedResource?: MapResource | null;
  onClearSelectedResource?: () => void;
  activeFloorId?: number;
  schedule: ScheduleSelection | null;
  onScheduleChange: (schedule: ScheduleSelection) => void;
  availabilityMap?: Map<number, ResourceAvailabilityItem>;
  isDatePickerOpen?: boolean;
  onDatePickerOpenChange?: (open: boolean) => void;
}

export function WorkspaceBookingCard({
  workspace,
  floors = [],
  selectedResource,
  onClearSelectedResource,
  activeFloorId,
  schedule,
  onScheduleChange,
  availabilityMap,
  isDatePickerOpen,
  onDatePickerOpenChange
}: WorkspaceBookingCardProps) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();

  const { data: holdData } = useCurrentPendingBooking();

  const isSelectedHeldByMe = Boolean(
    selectedResource &&
    (availabilityMap?.get(selectedResource.id)?.isOccupiedByMe ||
      (holdData?.resourceId && Number(holdData.resourceId) === Number(selectedResource.id)))
  );

  const selectedStatus = selectedResource
    ? customerResourceStatus(
        selectedResource,
        availabilityMap?.get(selectedResource.id),
        isSelectedHeldByMe
      )
    : undefined;
  const isSelectedResourceAvailable = selectedStatus?.available ?? true;
  const unavailableLabel = selectedStatus?.maintenance
    ? language === 'vi'
      ? 'Đang bảo trì'
      : 'Under maintenance'
    : selectedStatus?.disabled
      ? language === 'vi'
        ? 'Ngừng nhận đặt'
        : 'Not accepting bookings'
      : selectedStatus?.locked
        ? language === 'vi'
          ? 'Đang được giữ chỗ'
          : 'Held by another customer'
        : selectedStatus?.booked
          ? language === 'vi'
            ? 'Đã có người đặt'
            : 'Already booked'
          : language === 'vi'
            ? 'Chưa thể đặt'
            : 'Unavailable';
  const unavailableMessage =
    unavailableLabel + (language === 'vi' ? ' trong khung giờ đã chọn' : ' for the selected time');

  // Compute lowest starting hourly price from floor resources if workspace.pricePerHour is not present
  const floorStartingHourlyPrice = useMemo(() => {
    let minPrice = 0;
    for (const floor of floors) {
      for (const res of floor.resources || []) {
        if (res.category !== 'DESK' && res.category !== 'ROOM') continue;
        const p = res.pricePerHour || 0;
        if (p > 0 && (minPrice === 0 || p < minPrice)) {
          minPrice = p;
        }
      }
    }
    return minPrice;
  }, [floors]);

  const effectiveHourlyRate =
    selectedResource?.pricePerHour || workspace?.pricePerHour || floorStartingHourlyPrice || 0;

  const isStartingRate = !selectedResource && effectiveHourlyRate > 0;
  const durationHours = useMemo(() => {
    if (!schedule) return 3;
    if (Number.isFinite(schedule.durationHours) && schedule.durationHours > 0) {
      return schedule.durationHours;
    }
    if (schedule.startTime && schedule.endTime) {
      const startM = parseTimeToMinutes(schedule.startTime);
      const endM = parseTimeToMinutes(schedule.endTime);
      const diffM = endM > startM ? endM - startM : endM + 1440 - startM;
      return Math.max(1, Math.round((diffM / 60) * 10) / 10);
    }
    return 3;
  }, [schedule]);
  const subtotal = effectiveHourlyRate * durationHours;

  const isInstantConfirmation =
    String(workspace?.bookingConfirmationMode || '').toUpperCase() === 'INSTANT';

  const bookingSearchParams = {
    workspaceId: workspace?.id ? Number(workspace.id) : undefined,
    priceType: schedule?.priceType ?? 'HOURLY',
    date: schedule?.date,
    startTime: schedule?.isoStartTime || schedule?.startTime,
    endTime: schedule?.isoEndTime || schedule?.endTime,
    floorId: activeFloorId,
    resourceId: selectedResource?.id
  };

  return (
    <>
      {/* =====================================================================
          DESKTOP STICKY BOOKING CARD (Right Column ~32%)
      ===================================================================== */}
      <div className='hidden lg:block lg:col-span-4 relative self-stretch'>
        <div className='sticky top-[136px] z-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 xl:p-6 shadow-lg shadow-slate-900/5 space-y-4 max-h-[calc(100vh-150px)] overflow-y-auto no-scrollbar'>
          {/* 1. Pricing Header & Confirmation Mode */}
          <div className='flex items-start justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800'>
            <div>
              {effectiveHourlyRate > 0 ? (
                <>
                  <div className='text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500'>
                    {selectedResource
                      ? language === 'vi'
                        ? 'Giá vị trí đã chọn'
                        : 'Selected space rate'
                      : language === 'vi'
                        ? 'Giá thuê chỉ từ'
                        : 'Starting from'}
                  </div>
                  <div className='flex items-baseline gap-1 mt-0.5'>
                    <span className='text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight'>
                      {formatPrice(effectiveHourlyRate)}
                    </span>
                    <span className='text-xs font-medium text-slate-500 dark:text-slate-400'>
                      /{language === 'vi' ? 'giờ' : 'hr'}
                    </span>
                  </div>
                </>
              ) : (
                <div>
                  <div className='text-[11px] font-semibold uppercase tracking-wider text-slate-400'>
                    {language === 'vi' ? 'Bảng giá linh hoạt' : 'Flexible Pricing'}
                  </div>
                  <div className='text-base font-bold text-slate-900 dark:text-white mt-0.5'>
                    {language === 'vi' ? 'Chọn vị trí trên sơ đồ' : 'Select a space on map'}
                  </div>
                </div>
              )}

              {workspace?.pricePerDay ? (
                <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
                  {language === 'vi' ? 'Hoặc' : 'Or'}{' '}
                  <strong className='text-slate-700 dark:text-slate-200'>
                    {formatPrice(workspace.pricePerDay)}
                  </strong>{' '}
                  {language === 'vi' ? 'trọn gói cả ngày' : 'full-day pass'}
                </p>
              ) : null}
            </div>

            <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'>
              <Zap className='size-3 fill-current' />
              {language === 'vi' ? 'Xác nhận ngay' : 'Instant Book'}
            </span>
          </div>

          {/* 2. Selected Resource Summary (if chosen from Floor Map or Available Spaces) */}
          {selectedResource ? (
            <div
              className={cn(
                'p-3 rounded-xl border flex items-start justify-between gap-2',
                isSelectedResourceAvailable
                  ? 'bg-primary/5 dark:bg-primary/10 border-primary/25'
                  : 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30'
              )}
            >
              <div className='min-w-0'>
                <div className='flex items-center gap-1.5'>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white',
                      isSelectedResourceAvailable ? 'bg-primary' : 'bg-rose-600'
                    )}
                  >
                    {selectedResource.code}
                  </span>
                  <span className='text-xs font-bold text-slate-900 dark:text-white truncate'>
                    {selectedResource.name}
                  </span>
                </div>
                {!isSelectedResourceAvailable ? (
                  <p className='text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1'>
                    {unavailableMessage}
                  </p>
                ) : (
                  <div className='mt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400'>
                    {selectedResource.typeName && <span>{selectedResource.typeName}</span>}
                    {selectedResource.capacity ? (
                      <span className='inline-flex items-center gap-0.5'>
                        • <Users className='size-3' />{' '}
                        {availabilityMap?.get(selectedResource.id)?.capacity ??
                          selectedResource.capacity}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              {onClearSelectedResource && (
                <button
                  type='button'
                  onClick={onClearSelectedResource}
                  aria-label={language === 'vi' ? 'Bỏ chọn vị trí' : 'Clear selected space'}
                  className='p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer'
                >
                  <X className='size-3.5' />
                </button>
              )}
            </div>
          ) : (
            <button
              type='button'
              onClick={() => {
                const el = document.getElementById('spaces-floor-map');
                if (el) {
                  const top = el.getBoundingClientRect().top + window.scrollY - 128;
                  window.scrollTo({ top, behavior: 'smooth' });
                }
              }}
              className='w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-primary/50 text-left transition-colors cursor-pointer'
            >
              <div className='flex items-center gap-2 min-w-0'>
                <Sparkles className='size-4 text-primary shrink-0' />
                <span className='text-xs font-medium text-slate-600 dark:text-slate-300 truncate'>
                  {language === 'vi'
                    ? 'Mẹo: Chọn trước bàn/phòng trên sơ đồ'
                    : 'Tip: Pre-select a seat or room on the map'}
                </span>
              </div>
              <span className='text-[11px] font-bold text-primary shrink-0'>
                {language === 'vi' ? 'Xem sơ đồ' : 'View map'}
              </span>
            </button>
          )}

          {/* 3. Date & Time Slot Selector */}
          <DateTimePickerModal
            workspaceId={workspace?.id}
            workspaceName={workspace?.name}
            operatingHours={workspace?.operatingHours}
            pricePerHour={effectiveHourlyRate}
            initialDate={schedule?.isoDate || schedule?.date}
            initialDay={schedule?.day}
            initialStartTime={schedule?.startTime}
            initialEndTime={schedule?.endTime}
            onConfirm={onScheduleChange}
            open={isDatePickerOpen}
            onOpenChange={onDatePickerOpenChange}
          >
            <div
              role='button'
              tabIndex={0}
              className={cn(
                'p-3.5 rounded-xl border transition-all cursor-pointer group',
                schedule
                  ? 'border-slate-200 dark:border-slate-700 hover:border-primary/60 bg-slate-50/70 dark:bg-slate-800/50'
                  : 'border-2 border-primary/60 dark:border-primary/50 bg-primary/5 dark:bg-primary/10 hover:border-primary shadow-sm shadow-primary/10 ring-2 ring-primary/20'
              )}
            >
              {!schedule && (
                <div className='flex items-center gap-1.5 mb-2'>
                  <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 animate-pulse'>
                    <Sparkles className='size-3' />
                    {language === 'vi' ? 'Bước 1: Chọn ngày & giờ' : 'Step 1: Select Time'}
                  </span>
                </div>
              )}
              <div className='flex items-center justify-between mb-1'>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider transition-colors',
                    schedule ? 'text-slate-400 group-hover:text-primary' : 'text-primary'
                  )}
                >
                  {language === 'vi' ? 'Ngày & Khung giờ' : 'Date & Time Slot'}
                </span>
                <Calendar
                  className={cn(
                    'size-4 transition-colors',
                    schedule ? 'text-slate-400 group-hover:text-primary' : 'text-primary'
                  )}
                />
              </div>

              {schedule ? (
                <div className='space-y-1'>
                  <div className='text-sm font-bold text-slate-900 dark:text-white'>
                    {formatDateLabel(schedule.date)}
                  </div>
                  <div className='flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium'>
                    <span className='flex items-center gap-1'>
                      <Clock className='size-3 text-primary' />
                      {schedule.startTime} – {schedule.endTime}
                    </span>
                    <span className='bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold text-[11px]'>
                      {durationHours}{' '}
                      {durationHours > 1
                        ? language === 'vi'
                          ? 'giờ'
                          : 'hrs'
                        : language === 'vi'
                          ? 'giờ'
                          : 'hr'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className='flex items-center justify-between py-1'>
                  <div>
                    <span className='text-xs sm:text-sm font-bold text-primary block'>
                      {language === 'vi' ? 'Chưa chọn ngày & giờ đặt chỗ' : 'Select date & time'}
                    </span>
                    <span className='text-[11px] text-slate-500 dark:text-slate-400'>
                      {language === 'vi' ? 'Bấm vào đây để chọn lịch' : 'Click to pick schedule'}
                    </span>
                  </div>
                  <span className='px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-2xs group-hover:bg-primary/90 transition-colors'>
                    {language === 'vi' ? 'Chọn ngay' : 'Choose'}
                  </span>
                </div>
              )}
            </div>
          </DateTimePickerModal>

          {/* 4. Concise Price Summary */}
          {effectiveHourlyRate > 0 && (
            <div className='rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 p-3.5 space-y-2'>
              <div className='flex justify-between items-center text-xs text-slate-600 dark:text-slate-400'>
                <span>
                  {isStartingRate
                    ? language === 'vi'
                      ? 'Tạm tính từ'
                      : 'Est. from'
                    : language === 'vi'
                      ? 'Đơn giá'
                      : 'Space rate'}{' '}
                  ({formatPrice(effectiveHourlyRate)} × {durationHours}h)
                </span>
                <span className='font-semibold text-slate-900 dark:text-white'>
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className='pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex justify-between items-baseline'>
                <span className='text-xs font-bold text-slate-900 dark:text-white'>
                  {language === 'vi' ? 'Tổng tạm tính' : 'Estimated Total'}
                </span>
                <span className='text-lg font-extrabold text-primary'>{formatPrice(subtotal)}</span>
              </div>
            </div>
          )}

          {/* 5. Primary CTA */}
          {selectedResource && !isSelectedResourceAvailable ? (
            <button
              type='button'
              disabled
              className='w-full py-3.5 px-5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-sm rounded-xl cursor-not-allowed border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 select-none'
              title={unavailableMessage}
            >
              <span>
                {selectedResource.code} · {unavailableLabel}
              </span>
            </button>
          ) : !schedule ? (
            <button
              type='button'
              onClick={() => onDatePickerOpenChange?.(true)}
              className='w-full py-3.5 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.99]'
            >
              <Calendar className='size-4' />
              <span>
                {language === 'vi'
                  ? 'Chọn ngày & giờ để tiếp tục'
                  : 'Select Date & Time to Continue'}
              </span>
              <ArrowRight className='size-4 group-hover:translate-x-0.5 transition-transform' />
            </button>
          ) : (
            <Link
              to='/workspaces/seats'
              search={bookingSearchParams}
              className='w-full py-3.5 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.99]'
            >
              <span>
                {selectedResource
                  ? isSelectedHeldByMe
                    ? language === 'vi'
                      ? `Tiếp tục thanh toán ${selectedResource.code}`
                      : `Proceed to checkout for ${selectedResource.code}`
                    : language === 'vi'
                      ? `Tiếp tục đặt ${selectedResource.code}`
                      : `Continue with ${selectedResource.code}`
                  : language === 'vi'
                    ? 'Chọn chỗ ngồi & Đặt ngay'
                    : 'Select Seats & Book'}
              </span>
              <ArrowRight className='size-4 group-hover:translate-x-0.5 transition-transform' />
            </Link>
          )}

          {/* 6. Concise Trust & Booking Assistance Info */}
          <div className='pt-2 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400'>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='size-3.5 text-emerald-500 shrink-0' />
              <span>
                {language === 'vi'
                  ? 'Chưa trừ tiền ở bước này — chọn vị trí cụ thể trước khi thanh toán.'
                  : 'You won’t be charged yet — confirm exact seat on the next step.'}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <ShieldCheck className='size-3.5 text-primary shrink-0' />
              <span>
                {language === 'vi'
                  ? 'Bảo vệ đặt chỗ & hỗ trợ check-in bởi NexSpace.'
                  : 'Protected booking & check-in support by NexSpace.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MOBILE STICKY BOTTOM BOOKING BAR
      ===================================================================== */}
      <div className='lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)]'>
        <div className='max-w-7xl mx-auto flex items-center justify-between gap-3'>
          <div className='min-w-0'>
            {effectiveHourlyRate > 0 ? (
              <div className='flex items-baseline gap-1'>
                <span className='text-lg font-extrabold text-slate-900 dark:text-white'>
                  {formatPrice(effectiveHourlyRate)}
                </span>
                <span className='text-xs text-slate-500 dark:text-slate-400'>
                  /{language === 'vi' ? 'giờ' : 'hr'}
                </span>
              </div>
            ) : (
              <div className='text-sm font-bold text-slate-900 dark:text-white truncate'>
                {workspace?.name || (language === 'vi' ? 'Đặt chỗ' : 'Book Workspace')}
              </div>
            )}

            <DateTimePickerModal
              workspaceId={workspace?.id}
              workspaceName={workspace?.name}
              operatingHours={workspace?.operatingHours}
              pricePerHour={effectiveHourlyRate}
              initialDate={schedule?.isoDate || schedule?.date}
              initialDay={schedule?.day}
              initialStartTime={schedule?.startTime}
              initialEndTime={schedule?.endTime}
              onConfirm={onScheduleChange}
              open={isDatePickerOpen}
              onOpenChange={onDatePickerOpenChange}
            >
              <button
                type='button'
                className='inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 truncate max-w-[190px] cursor-pointer'
              >
                <Calendar className='size-3 shrink-0' />
                <span className='truncate'>
                  {schedule
                    ? `${formatDateLabel(schedule.date)} · ${schedule.startTime}`
                    : language === 'vi'
                      ? 'Chọn ngày & giờ'
                      : 'Select date & time'}
                </span>
              </button>
            </DateTimePickerModal>
          </div>

          {selectedResource && !isSelectedResourceAvailable ? (
            <button
              type='button'
              disabled
              className='shrink-0 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm rounded-xl cursor-not-allowed border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 select-none'
            >
              <span>{unavailableLabel}</span>
            </button>
          ) : !schedule ? (
            <button
              type='button'
              onClick={() => onDatePickerOpenChange?.(true)}
              className='shrink-0 px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-primary/20 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer'
            >
              <Calendar className='size-3.5' />
              <span>{language === 'vi' ? 'Chọn lịch đặt' : 'Select Schedule'}</span>
            </button>
          ) : (
            <Link
              to='/workspaces/seats'
              search={bookingSearchParams}
              className='shrink-0 px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-primary/20 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer'
            >
              <span>
                {selectedResource
                  ? isSelectedHeldByMe
                    ? language === 'vi'
                      ? `Thanh toán ${selectedResource.code}`
                      : `Checkout ${selectedResource.code}`
                    : language === 'vi'
                      ? `Đặt ${selectedResource.code}`
                      : `Book ${selectedResource.code}`
                  : language === 'vi'
                    ? 'Chọn chỗ & Đặt'
                    : 'Select Space'}
              </span>
              <ArrowRight className='size-4' />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
