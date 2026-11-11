import { useState } from 'react';
import {
  Info,
  ArrowRight,
  Wallet,
  Lock,
  FileText,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/features/landing/context/currency-context';
import { PayOSCheckoutDialog } from './payos-checkout-dialog';
import {
  useCreatePaymentCheckout,
  useExchangeRate,
  useCurrentPendingBooking,
  paymentService,
  paymentKeys
} from '@/features/payments/api';
import type { PaymentCheckoutResponse } from '@/features/payments/api/types';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function PriceBreakdownCard() {
  const queryClient = useQueryClient();
  const { data: holdData } = useCurrentPendingBooking();
  const { formatPrice, currency } = useCurrency();
  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<PaymentCheckoutResponse | null>(null);

  const { data: exchangeRateData } = useExchangeRate();
  const exchangeRate = exchangeRateData?.exchangeRate || 25450;

  const createPaymentMutation = useCreatePaymentCheckout();

  const baseRate = 0.08; // 2.000 VNĐ test transfer
  const platformFee = 0.00;
  const vat = 0.00;
  const discountAmount = discountApplied ? 0.01 : 0;
  const totalAmountUsd = Math.max(0, baseRate + platformFee + vat - discountAmount);

  // Exact rounded VND test equivalent: 2,000 VND
  const totalAmountVnd = 2000;

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'NEXFIRST') {
      setDiscountApplied(true);
      toast.success('Mã giảm giá NEXFIRST đã được áp dụng (-$1.00)');
    } else {
      toast.error('Mã giảm giá không hợp lệ');
    }
  };

  const handleProceedPayOS = async () => {
    try {
      // Invalidate queries so that previous expired status is cleared
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });

      // 1. Tự động lấy hoặc tạo phiên đặt chỗ hợp lệ thuộc quyền sở hữu của khách hàng đang đăng nhập
      const hold = await paymentService.getCurrentPendingBooking();
      const targetBookingId = hold.bookingId;

      // 2. Khởi tạo phiên thanh toán PayOS với mã đặt chỗ chính xác
      createPaymentMutation.mutate(targetBookingId, {
        onSuccess: (data: PaymentCheckoutResponse) => {
          setCheckoutData(data);
          setCheckoutOpen(true);
        },
        onError: (err: Error) => {
          toast.error('Không thể tạo phiên thanh toán PayOS', {
            description: err.message
          });
          // Fallback để khách hàng vẫn xem được giao diện In-App VietQR
          setCheckoutOpen(true);
        }
      });
    } catch (err: unknown) {
      toast.error('Lỗi phiên đặt chỗ', {
        description: err instanceof Error ? err.message : 'Vui lòng đăng nhập tài khoản khách hàng để thanh toán.'
      });
      // Fallback preview
      setCheckoutOpen(true);
    }
  };

  return (
    <>
      <div className='bg-card border-border shadow-md sticky top-24 space-y-5 rounded-2xl border p-6'>
        {/* Header */}
        <div className='border-border/60 flex items-center justify-between border-b pb-4'>
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Price Details
          </h2>
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
            <span className='h-2 w-2 rounded-full bg-emerald-500' />
            <span>Tier: Enterprise Plan</span>
          </div>
        </div>

        {/* Line Items */}
        <div className='border-border/60 space-y-3 border-b py-2 text-xs sm:text-sm'>
          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              Base Rate (Test mode • 2.000 VNĐ)
              <Info className='text-muted-foreground/60 h-3.5 w-3.5' />
            </span>
            <span className='font-medium'>{formatPrice(baseRate)}</span>
          </div>

          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              Platform Service Fee
              <Info className='text-muted-foreground/60 h-3.5 w-3.5' />
            </span>
            <span className='font-medium'>{formatPrice(platformFee)}</span>
          </div>

          <div className='flex items-center justify-between text-foreground'>
            <span className='text-muted-foreground'>Value Added Tax (VAT 0%)</span>
            <span className='text-muted-foreground font-medium'>{formatPrice(vat)}</span>
          </div>

          {discountApplied && (
            <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium'>
              <span className='flex items-center gap-1.5'>
                <Tag className='h-3.5 w-3.5' />
                Promo Discount (NEXFIRST)
              </span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}
        </div>

        {/* Corporate Promo Code Field */}
        <div className='border-border/60 space-y-2 border-b py-2'>
          <label htmlFor='promo-input' className='text-foreground block text-xs font-medium'>
            Corporate Promo Code
          </label>
          <div className='flex gap-2'>
            <input
              id='promo-input'
              type='text'
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder='Enter promo code (e.g. NEXFIRST)'
              className='bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary/20 h-10 flex-grow rounded-lg border px-3 text-xs uppercase transition-colors focus:ring-1 focus:outline-none'
            />
            <button
              type='button'
              onClick={handleApplyPromo}
              className='border-border hover:bg-muted text-foreground cursor-pointer rounded-lg border px-4 text-xs font-semibold transition-all active:scale-95'
            >
              Apply
            </button>
          </div>
          {discountApplied && (
            <p className='text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-medium'>
              <CheckCircle2 className='h-3.5 w-3.5' />
              Code NEXFIRST applied successfully (-1.00 USD)
            </p>
          )}
        </div>

        {/* Total Amount Due */}
        <div className='py-1'>
          <div className='flex items-baseline justify-between'>
            <div>
              <span className='text-foreground font-sans text-base font-bold sm:text-lg'>
                Total Amount Due
              </span>
              <p className='text-muted-foreground text-xs'>
                ≈ {totalAmountVnd.toLocaleString('vi-VN')} VND (Tỷ giá: 1$ = {exchangeRate.toLocaleString('vi-VN')}đ)
              </p>
            </div>
            <div className='text-right'>
              <span className='text-primary font-sans text-2xl font-bold tracking-tight sm:text-3xl'>
                {formatPrice(totalAmountUsd)}
              </span>
              <span className='text-muted-foreground block text-xs font-semibold'>
                {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button (Proceed to PayOS Payment) */}
        <Button
          onClick={handleProceedPayOS}
          disabled={createPaymentMutation.isPending}
          className='group h-12 w-full cursor-pointer rounded-xl text-sm font-semibold shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center gap-2'
        >
          {createPaymentMutation.isPending ? (
            <span>Đang kết nối cổng PayOS &amp; tạo VietQR...</span>
          ) : (
            <>
              <span>Thanh Toán Bằng PayOS VietQR</span>
              <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
            </>
          )}
        </Button>

        {/* Payment Security & Trust Badges */}
        <div className='border-border/60 space-y-2.5 border-t pt-4 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2.5'>
            <Wallet className='text-primary h-4 w-4 shrink-0' />
            <span>
              <strong className='text-foreground'>Cổng VietQR PayOS:</strong> Quét bằng app MB, VCB, TCB, MoMo...
            </span>
          </div>
          <div className='flex items-center gap-2.5'>
            <Lock className='text-emerald-600 dark:text-emerald-400 h-4 w-4 shrink-0' />
            <span>Mã hóa bảo mật 256-bit • Tự động nhận diện thanh toán</span>
          </div>
          <div className='flex items-center gap-2.5'>
            <FileText className='text-muted-foreground h-4 w-4 shrink-0' />
            <span>Hóa đơn điện tử PDF tự động gửi về email &amp; Cloudinary</span>
          </div>
        </div>

        {/* Reassurance pill */}
        <div className='bg-muted/70 text-muted-foreground rounded-lg p-2.5 text-center text-xs'>
          Miễn phí phí giao dịch cho đối tác &amp; khách hàng NexSpace
        </div>
      </div>

      <PayOSCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmountUsd={totalAmountUsd}
        seatCode={holdData?.seatCode || 'Desk A-12'}
        checkoutData={checkoutData}
        orderRef={checkoutData?.bookingCode || holdData?.bookingCode}
        isLoading={createPaymentMutation.isPending}
        onRetry={handleProceedPayOS}
      />
    </>
  );
}
