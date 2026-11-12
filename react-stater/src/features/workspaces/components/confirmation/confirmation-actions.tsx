import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Calendar, Download, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paymentService } from '@/features/payments/api/service';
import { toast } from 'sonner';
import { useLanguage } from '@/features/landing/context/language-context';

interface ConfirmationActionsProps {
  orderRef?: string;
  bookingId?: number;
}

export function ConfirmationActions({
  orderRef = '#NX-8821',
  bookingId
}: ConfirmationActionsProps) {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadInvoice = async () => {
    if (!bookingId) {
      toast.info(isVi ? 'Không tìm thấy mã đơn đặt chỗ để tải hóa đơn' : 'No booking ID found for invoice');
      return;
    }
    try {
      setDownloading(true);
      await paymentService.downloadInvoicePdf(bookingId);
      setDownloaded(true);
      toast.success(isVi ? `Đã tải hóa đơn ${orderRef}` : `Invoice ${orderRef} downloaded`);
      setTimeout(() => setDownloaded(false), 3000);
    } catch {
      toast.error(isVi ? 'Tải hóa đơn thất bại. Vui lòng thử lại sau.' : 'Failed to download invoice.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className='mt-6 w-full max-w-[540px] space-y-3.5'>
      {/* 2-Column Action Buttons Grid */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <Button
          asChild
          className='bg-primary text-primary-foreground hover:bg-primary/90 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md active:scale-[0.98] transition-all'
        >
          <Link to='/workspaces/my-bookings'>
            <Calendar className='h-4 w-4' />
            <span>{isVi ? 'Xem đơn của tôi' : 'View My Bookings'}</span>
          </Link>
        </Button>

        <Button
          type='button'
          variant='outline'
          onClick={handleDownloadInvoice}
          disabled={downloading}
          className='bg-card hover:bg-muted/60 border-border text-foreground flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.98]'
        >
          {downloading ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>{isVi ? 'Đang tạo PDF...' : 'Generating PDF...'}</span>
            </>
          ) : downloaded ? (
            <>
              <Check className='h-4 w-4 text-emerald-600' />
              <span>{isVi ? `Đã tải ${orderRef}` : `Invoice ${orderRef} Downloaded`}</span>
            </>
          ) : (
            <>
              <Download className='text-muted-foreground h-4 w-4' />
              <span>{isVi ? 'Tải Hóa Đơn (PDF)' : 'Download Invoice PDF'}</span>
            </>
          )}
        </Button>
      </div>

      {/* Return / Book Another Workspace Link */}
      <div className='text-center pt-1'>
        <Link
          to='/workspaces'
          className='text-primary hover:text-primary/80 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold transition-colors'
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          <span>{isVi ? 'Đặt không gian khác' : 'Book Another Workspace'}</span>
        </Link>
      </div>
    </div>
  );
}
