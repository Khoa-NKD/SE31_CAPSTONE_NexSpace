import { BookingAddonSelector } from './booking-addon-selector';
import { Spinner as Loader2 } from '@/components/ui/spinner';
import { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  Lock,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Ban
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { formatBookingMoney, snapshotCurrency } from '../../utils/booking-money';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  useCalculatePriceQuery,
  useCreateBookingMutation,
  useCancelBookingMutation
} from '../../api/booking-queries';
import type { BookingDto } from '../../api/booking-types';
import { PayOSCheckoutDialog } from './payos-checkout-dialog';
import {
  useCreatePaymentCheckout,
  useExchangeRate,
  useCurrentPendingBooking,
  paymentKeys
} from '@/features/payments/api';
import type { PaymentCheckoutResponse } from '@/features/payments/api/types';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link, useNavigate } from '@tanstack/react-router';

interface PriceBreakdownCardProps {
  workspaceId?: number;
  resourceId?: number;
  startTime?: string;
  endTime?: string;
  date?: string;
  priceType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
  customerNotes?: string;
  seatCode?: string;
  workspaceName?: string;
  activeBooking?: BookingDto | null;
  onBookingCreated?: (booking: BookingDto | null) => void;
  autoOpen?: boolean;
  secondsRemaining?: number;
  onExpired?: () => void;
}

export function PriceBreakdownCard({
  workspaceId,
  resourceId,
  startTime,
  endTime,
  priceType = 'HOURLY',
  customerNotes,
  seatCode = 'Desk A-01',
  activeBooking,
  onBookingCreated,
  autoOpen,
  secondsRemaining,
  onExpired
}: PriceBreakdownCardProps) {
  const queryClient = useQueryClient();
  const { data: holdData } = useCurrentPendingBooking();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [addonBusy, setAddonBusy] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<BookingDto | null>(activeBooking || null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<PaymentCheckoutResponse | null>(null);
  const autoOpenedRef = useRef(false);

  const remainingAttempts = holdData?.remainingHoldAttempts ?? 3;
  const maxAttempts = holdData?.maxHoldAttempts ?? 3;
  const penaltyMinutes = holdData?.penaltyBlockMinutes ?? 20;

  const effectiveBooking = createdBooking || activeBooking || null;

  const { data: exchangeRateData } = useExchangeRate();
  const exchangeRate = exchangeRateData?.exchangeRate;

  // Price calculation query from backend
  const {
    data: priceData,
    isLoading: isCalculating,
    isError: priceError
  } = useCalculatePriceQuery(
    workspaceId && resourceId && startTime && endTime
      ? {
          workspaceId,
          resourceId,
          startTime,
          endTime,
          priceType
        }
      : null
  );

  const createBookingMutation = useCreateBookingMutation();
  const cancelBookingMutation = useCancelBookingMutation();
  const createPaymentMutation = useCreatePaymentCheckout();

  // Existing bookings retain their immutable totals; a later quote must not reprice a held order.
  const priceSource = effectiveBooking ?? priceData;
  const sourceCurrency = effectiveBooking
    ? snapshotCurrency(effectiveBooking.pricingSnapshot)
    : priceData?.currency;
  const formatPrice = (amount: number) =>
    priceSource && sourceCurrency ? formatBookingMoney(amount, sourceCurrency) : '—';
  const durationHours = priceSource?.durationHours ?? 0;
  const unitPrice = priceSource?.unitPrice ?? 0;
  const baseRate = priceSource?.baseAmount ?? 0;
  const dailyRate = priceSource?.priceType === 'DAILY';
  const billingUnits =
    dailyRate && unitPrice > 0 ? Math.round(baseRate / unitPrice) : durationHours;
  const vat = priceSource?.taxAmount ?? 0;
  const legacyCustomerFee = priceSource?.serviceFeeAmount ?? 0;
  const addonAmount = Number(priceSource?.addonAmount ?? 0);
  const surcharge = priceSource?.surchargeAmount ?? 0;
  const discount = priceSource?.discountAmount ?? 0;
  const subtotal = baseRate + surcharge + addonAmount + legacyCustomerFee - discount;
  type AddonLine = { amenityId: number; name: string; hourlyRate: number; amount: number };
  let addonLines: AddonLine[] = effectiveBooking ? [] : (priceData?.addons ?? []);
  let vatPercent: number | undefined = effectiveBooking ? undefined : priceData?.vatPercent;
  if (effectiveBooking?.pricingSnapshot) {
    try {
      const snapshot = JSON.parse(effectiveBooking.pricingSnapshot);
      addonLines = Array.isArray(snapshot.addons)
        ? snapshot.addons.filter(
            (item: AddonLine) =>
              item &&
              typeof item.name === 'string' &&
              Number.isFinite(item.hourlyRate) &&
              Number.isFinite(item.amount)
          )
        : [];
      vatPercent =
        typeof snapshot.vatPercent === 'number' && Number.isFinite(snapshot.vatPercent)
          ? snapshot.vatPercent
          : undefined;
    } catch {
      /* Historical snapshots still display the authoritative aggregate amounts. */
    }
  }
  const formatQuantity = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const totalAmount = priceSource?.finalPrice ?? 0;
  const totalAmountVnd =
    sourceCurrency === 'VND'
      ? Math.round(totalAmount)
      : sourceCurrency === 'USD' && exchangeRate
        ? Math.round((totalAmount * exchangeRate) / 1000) * 1000
        : null;

  const handleConfirmBooking = async () => {
    if (addonBusy) return;
    setBookingError(null);
    if (!priceSource || !sourceCurrency) {
      setBookingError('Chưa tải được giá hợp lệ. Vui lòng thử lại trước khi thanh toán.');
      return;
    }

    if (effectiveBooking) {
      // Booking is already held from the seats page, open payment modal
      createPaymentMutation.mutate(effectiveBooking.id, {
        onSuccess: (data: PaymentCheckoutResponse) => {
          setCheckoutData(data);
          setCheckoutOpen(true);
        },
        onError: () => {
          setCheckoutOpen(true);
        }
      });
      return;
    }

    if (!isAuthenticated) {
      setBookingError('Vui lòng đăng nhập hoặc đăng ký tài khoản trước khi xác nhận đặt chỗ.');
      return;
    }

    if (!workspaceId || !resourceId || !startTime || !endTime) {
      setBookingError('Thiếu thông tin đặt chỗ. Vui lòng chọn không gian và vị trí ghế.');
      return;
    }

    try {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });

      const booking = await createBookingMutation.mutateAsync({
        workspaceId,
        resourceId,
        startTime,
        endTime,
        priceType,
        notes: customerNotes
      });

      setCreatedBooking(booking);
      onBookingCreated?.(booking);

      createPaymentMutation.mutate(booking.id, {
        onSuccess: (data: PaymentCheckoutResponse) => {
          setCheckoutData(data);
          setCheckoutOpen(true);
        },
        onError: () => {
          setCheckoutOpen(true);
        }
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.message ||
        'Vị trí này hiện đang được giữ chỗ hoặc đã có người đặt trong khung giờ này. Vui lòng chọn vị trí khác.';
      setBookingError(msg);
      toast.error('Không thể đặt chỗ', { description: msg });
    }
  };

  // Automatically open VietQR PayOS modal if resumed from my-bookings with autoOpen
  useEffect(() => {
    if (autoOpen && effectiveBooking && !checkoutOpen && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      createPaymentMutation.mutate(effectiveBooking.id, {
        onSuccess: (data: PaymentCheckoutResponse) => {
          setCheckoutData(data);
          setCheckoutOpen(true);
        },
        onError: () => {
          setCheckoutOpen(true);
        }
      });
    }
  }, [autoOpen, effectiveBooking, checkoutOpen, createPaymentMutation]);

  const handleCancelHold = async () => {
    const target = effectiveBooking;
    if (!target) return;
    try {
      await cancelBookingMutation.mutateAsync({
        id: target.id,
        reason: 'Customer cancelled during hold session'
      });
      setIsCancelDialogOpen(false);
      setCreatedBooking(null);
      setCheckoutData(null);
      onBookingCreated?.(null);
      queryClient.invalidateQueries({ queryKey: paymentKeys.pendingHold() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      const nextRemaining = Math.max(0, remainingAttempts - 1);
      if (nextRemaining === 0) {
        toast.error(
          `Bạn đã dùng hết ${maxAttempts} lần giữ chỗ mà không thanh toán. Tài khoản tạm thời bị khóa quyền giữ chỗ và đặt phòng/ghế trong vòng ${penaltyMinutes} phút do vi phạm quy tắc.`,
          { duration: 8000 }
        );
      } else {
        toast.warning(
          `Đã hủy giữ chỗ thành công. Bạn còn ${nextRemaining} lần hủy/giữ. Nếu quá ${maxAttempts} lần mà không thanh toán, tài khoản sẽ bị tạm khóa đặt chỗ trong vòng ${penaltyMinutes} phút.`
        );
      }
      setTimeout(() => {
        if (workspaceId) {
          navigate({
            to: '/workspaces/$workspaceId',
            params: { workspaceId: String(workspaceId) }
          });
        } else {
          navigate({ to: '/workspaces' });
        }
      }, 700);
    } catch (err: unknown) {
      setIsCancelDialogOpen(false);
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      setBookingError(
        errorObj?.response?.data?.message || errorObj?.message || 'Failed to cancel hold.'
      );
    }
  };

  return (
    <>
      <div className='bg-card border-border shadow-md sticky top-24 space-y-5 rounded-2xl border p-6'>
        {/* Header */}
        <div className='border-border/60 flex items-center justify-between border-b pb-4'>
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Chi tiết thanh toán
          </h2>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
            <span className='h-2 w-2 rounded-full bg-emerald-500' />
            <span>Giá từ hệ thống</span>
          </div>
        </div>

        {effectiveBooking && (
          <BookingAddonSelector
            key={effectiveBooking.id}
            booking={effectiveBooking}
            locked={!!checkoutData || createPaymentMutation.isPending}
            onBusy={setAddonBusy}
            onUpdated={(booking) => {
              setCreatedBooking(booking);
              onBookingCreated?.(booking);
              void queryClient.invalidateQueries({ queryKey: paymentKeys.all });
            }}
          />
        )}
        {/* Error Notification */}
        {bookingError && (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2.5'>
            <AlertCircle className='size-4 shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='font-semibold'>{bookingError}</p>
              {!isAuthenticated && (
                <div className='mt-2'>
                  <Button size='sm' asChild className='h-7 text-xs'>
                    <Link to='/auth/sign-in'>Đăng nhập vào tài khoản</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {!effectiveBooking && priceError && (
          <p role='alert' className='text-sm text-destructive'>
            Không tải được giá. Vui lòng kiểm tra thời gian hoặc thử lại.
          </p>
        )}
        {/* Frozen booking amounts are itemized without repricing the held order. */}
        <div className='space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4 text-sm'>
          <div className='flex items-start justify-between gap-4'>
            <div className='space-y-1'>
              <p className='font-medium text-foreground'>Tiền thuê không gian</p>
              <p className='text-xs text-muted-foreground'>
                {formatQuantity(billingUnits)} {dailyRate ? 'ngày' : 'giờ'} ×{' '}
                {formatPrice(unitPrice)}/{dailyRate ? 'ngày' : 'giờ'}
              </p>
            </div>
            <span className='shrink-0 font-semibold tabular-nums'>
              {!effectiveBooking && isCalculating ? (
                <Loader2 className='size-3.5' />
              ) : (
                formatPrice(baseRate)
              )}
            </span>
          </div>
          {addonAmount > 0 && (
            <div className='space-y-3 border-t border-border/50 pt-4'>
              <p className='text-xs font-medium text-muted-foreground'>
                Tiện ích bổ sung{addonLines.length > 0 ? ' (' + addonLines.length + ')' : ''}
              </p>
              {addonLines.length > 0 ? (
                addonLines.map((item) => (
                  <div key={item.amenityId} className='flex items-start justify-between gap-4'>
                    <div className='min-w-0 space-y-1'>
                      <p className='break-words font-medium'>{item.name}</p>
                      <p className='text-xs text-muted-foreground'>
                        {formatQuantity(durationHours)} giờ × {formatPrice(item.hourlyRate)}/giờ
                      </p>
                    </div>
                    <span className='shrink-0 font-semibold tabular-nums'>
                      {formatPrice(item.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className='flex justify-between gap-4'>
                  <span>Tiện ích đã chọn</span>
                  <span className='font-semibold tabular-nums'>{formatPrice(addonAmount)}</span>
                </div>
              )}
            </div>
          )}
          {surcharge > 0 && (
            <div className='flex justify-between gap-4'>
              <span className='text-muted-foreground'>Phụ thu</span>
              <span className='font-medium tabular-nums'>{formatPrice(surcharge)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className='flex justify-between gap-4'>
              <span className='text-muted-foreground'>Giảm giá</span>
              <span className='font-medium tabular-nums text-emerald-500'>
                −{formatPrice(discount)}
              </span>
            </div>
          )}
          {legacyCustomerFee > 0 && (
            <div className='flex justify-between gap-4'>
              <span className='text-muted-foreground'>Phí khách đã chốt trên đơn cũ</span>
              <span className='font-medium tabular-nums'>{formatPrice(legacyCustomerFee)}</span>
            </div>
          )}
          <div className='space-y-3 border-t border-border/60 pt-4'>
            <div className='flex justify-between gap-4'>
              <span className='font-medium'>Tạm tính trước VAT</span>
              <span className='font-semibold tabular-nums'>{formatPrice(subtotal)}</span>
            </div>
            <div className='flex justify-between gap-4 text-muted-foreground'>
              <span>VAT{vatPercent != null ? ' (' + formatQuantity(vatPercent) + '%)' : ''}</span>
              <span className='font-medium tabular-nums'>{formatPrice(vat)}</span>
            </div>
          </div>
        </div>

        {/* Total Amount Due */}
        <div className='py-1'>
          <div className='flex items-baseline justify-between'>
            <div>
              <span className='text-foreground font-sans text-base font-bold sm:text-lg'>
                Khách cần thanh toán
              </span>
              <p className='text-muted-foreground text-xs'>
                {totalAmountVnd == null
                  ? 'Số tiền chính thức được xác nhận khi tạo thanh toán PayOS.'
                  : `${sourceCurrency === 'USD' ? 'Quy đổi thanh toán: ' : ''}${formatBookingMoney(totalAmountVnd, 'VND')}`}
              </p>
            </div>
            <div className='text-right'>
              <span className='text-primary font-sans text-2xl font-bold tracking-tight sm:text-3xl font-mono'>
                {isCalculating ? (
                  <Loader2 className='size-6 inline text-primary' />
                ) : (
                  formatPrice(totalAmount)
                )}
              </span>
              <span className='text-muted-foreground block text-xs font-semibold'>
                {sourceCurrency ?? ''}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        {/* Primary Action Button */}
        {(() => {
          const isBookingExpired =
            effectiveBooking?.status === 'EXPIRED' ||
            (secondsRemaining !== undefined && secondsRemaining <= 0);

          if (isBookingExpired) {
            return (
              <div className='space-y-2'>
                <Button
                  type='button'
                  onClick={() => {
                    if (onExpired) {
                      onExpired();
                    } else if (workspaceId) {
                      navigate({
                        to: '/workspaces/$workspaceId',
                        params: { workspaceId: String(workspaceId) }
                      });
                    } else {
                      navigate({ to: '/workspaces' });
                    }
                  }}
                  className='h-12 w-full cursor-pointer rounded-xl text-sm font-semibold shadow-md bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center gap-2'
                >
                  <Ban className='size-4' />
                  <span>Phiên giữ chỗ đã hết hạn - Quay lại chọn chỗ</span>
                </Button>
              </div>
            );
          }

          return (
            <div className='space-y-2'>
              <Button
                onClick={handleConfirmBooking}
                disabled={
                  addonBusy ||
                  createBookingMutation.isPending ||
                  createPaymentMutation.isPending ||
                  (!effectiveBooking && isCalculating) ||
                  !priceSource ||
                  !sourceCurrency
                }
                className='h-12 w-full cursor-pointer rounded-xl text-sm font-semibold shadow-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2'
              >
                {createBookingMutation.isPending || createPaymentMutation.isPending ? (
                  <>
                    <Loader2 className='size-4 animate-spin' />
                    <span>Đang xử lý xác nhận...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='size-4' />
                    <span>
                      {effectiveBooking ? `Xác nhận (${effectiveBooking.bookingCode})` : 'Xác nhận'}
                    </span>
                  </>
                )}
              </Button>

              {effectiveBooking && (
                <Button
                  onClick={() =>
                    navigate({
                      to: '/workspaces/confirmation',
                      search: {
                        bookingCode: effectiveBooking.bookingCode,
                        bookingId: effectiveBooking.id
                      }
                    })
                  }
                  variant='secondary'
                  className='h-10 w-full text-xs font-semibold'
                >
                  <CheckCircle2 className='size-3.5 mr-1.5' />
                  <span>Xem vé điện tử ({effectiveBooking.bookingCode})</span>
                </Button>
              )}

              {effectiveBooking && (
                <Button
                  variant='outline'
                  onClick={() => setIsCancelDialogOpen(true)}
                  disabled={cancelBookingMutation.isPending}
                  className='h-9 w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/80 cursor-pointer'
                >
                  {cancelBookingMutation.isPending ? (
                    <>
                      <Loader2 className='size-3.5 animate-spin mr-1.5' />
                      <span>Đang hủy giữ chỗ...</span>
                    </>
                  ) : (
                    <span>Hủy giữ chỗ &amp; chọn vị trí khác</span>
                  )}
                </Button>
              )}
            </div>
          );
        })()}

        {/* Payment Security & Trust Badges */}
        <div className='border-border/60 space-y-2.5 border-t pt-4 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2.5'>
            <Wallet className='text-primary h-4 w-4 shrink-0' />
            <span>
              <strong className='text-foreground'>Cổng VietQR PayOS:</strong> Quét bằng app MB, VCB,
              TCB, MoMo...
            </span>
          </div>
          <div className='flex items-center gap-2.5'>
            <Lock className='text-emerald-600 dark:text-emerald-400 h-4 w-4 shrink-0' />
            <span>Khóa giữ chỗ bi quan (Pessimistic) • Chống đặt trùng tuyệt đối</span>
          </div>
          <div className='flex items-center gap-2.5'>
            <FileText className='text-muted-foreground h-4 w-4 shrink-0' />
            <span>Hóa đơn điện tử PDF tự động gửi về email &amp; Cloudinary</span>
          </div>
        </div>

        {/* Reassurance pill */}
        <div className='bg-muted/70 text-muted-foreground rounded-lg p-2.5 text-center text-xs'>
          Miễn phí hủy trong thời gian giữ chỗ tạm thời
        </div>
      </div>

      <PayOSCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        seatCode={seatCode || holdData?.seatCode || 'Desk A-12'}
        checkoutData={checkoutData}
        serverTime={effectiveBooking?.serverTime || holdData?.serverTime}
        holdExpiresAt={effectiveBooking?.holdExpiresAt || holdData?.holdExpiresAt}
        secondsRemaining={secondsRemaining}
        orderRef={
          effectiveBooking?.bookingCode
            ? `#${effectiveBooking.bookingCode}`
            : (holdData?.bookingCode ?? undefined)
        }
        isLoading={createPaymentMutation.isPending}
        onRetry={handleConfirmBooking}
        onCancelCheckoutSuccess={() => {
          setCreatedBooking(null);
          setCheckoutData(null);
          onBookingCreated?.(null);
          if (workspaceId) {
            navigate({
              to: '/workspaces/$workspaceId',
              params: { workspaceId: String(workspaceId) }
            });
          } else {
            navigate({ to: '/workspaces' });
          }
        }}
      />

      {/* Pop-up Xác nhận khi bấm Hủy giữ chỗ ở card dưới */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-destructive dark:text-rose-400'>
              <AlertTriangle className='h-5 w-5 text-destructive dark:text-rose-400' />
              <span>Xác nhận hủy phiên giữ chỗ</span>
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-2 text-sm text-foreground/90 leading-relaxed pt-2'>
              <div className='rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200'>
                <p className='font-medium'>
                  Bạn hiện còn{' '}
                  <span className='font-bold text-amber-900 underline dark:text-amber-100'>
                    {remainingAttempts} lần
                  </span>{' '}
                  hủy giữ chỗ.
                </p>
                {remainingAttempts <= 1 ? (
                  <div className='mt-2 rounded-md bg-destructive/15 border border-destructive/30 p-2 text-xs font-semibold text-destructive'>
                    ⚠️ CẢNH BÁO: Đây là lần hủy cuối cùng của bạn! Nếu bấm hủy, bạn sẽ dùng hết{' '}
                    {maxAttempts} lần và tài khoản sẽ lập tức bị tạm khóa quyền đặt chỗ trong vòng{' '}
                    {penaltyMinutes} phút.
                  </div>
                ) : (
                  <p className='mt-1 text-xs text-amber-800 dark:text-amber-300'>
                    Nếu xác nhận hủy phiên này, bạn sẽ chỉ còn{' '}
                    <span className='font-bold text-amber-950 underline dark:text-amber-100'>
                      {Math.max(0, remainingAttempts - 1)} lần
                    </span>
                    .
                  </p>
                )}
              </div>
              <p className='text-xs text-muted-foreground pt-1'>
                <span className='font-semibold text-destructive'>Lưu ý:</span> Nếu bạn hủy hoặc để
                phiên giữ chỗ hết hạn quá <span className='font-semibold'>{maxAttempts} lần</span>{' '}
                mà không hoàn tất thanh toán, tài khoản sẽ bị{' '}
                <span className='font-bold text-destructive'>
                  TẠM KHÓA đặt chỗ trong vòng {penaltyMinutes} phút
                </span>{' '}
                (tức là không thể đặt bất kỳ chỗ nào trong {penaltyMinutes} phút tới).
              </p>
              <p className='font-medium text-foreground pt-1'>
                Bạn có chắc chắn muốn hủy phiên giữ chỗ này không?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-0 pt-2'>
            <AlertDialogCancel
              disabled={cancelBookingMutation.isPending}
              className='cursor-pointer'
            >
              Không, tiếp tục giữ chỗ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelHold}
              disabled={cancelBookingMutation.isPending}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer'
            >
              {cancelBookingMutation.isPending ? 'Đang hủy...' : 'Đồng ý hủy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
