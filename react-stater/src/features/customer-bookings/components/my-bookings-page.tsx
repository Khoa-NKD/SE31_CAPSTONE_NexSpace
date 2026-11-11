import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Calendar,
  Clock,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  QrCode,
  Download,
  ArrowRight,
  AlertCircle,
  Loader2,
  Building2,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronRight
} from 'lucide-react';
import { WorkspaceHeader } from '@/features/workspaces/components/workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomerBookings } from '@/features/payments/api/queries';
import { paymentService } from '@/features/payments/api/service';
import type { CustomerBookingItemResponse, BookingStatus } from '@/features/payments/api/types';
import { useLanguage } from '@/features/landing/context/language-context';
import { toast } from 'sonner';
import { NexSpaceMark } from '@/components/brand/logo';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
}

export function MyBookingsPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isVi = language === 'vi';

  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED' | 'PENDING_PAYMENT' | 'OTHER'>('ALL');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [copiedPinId, setCopiedPinId] = useState<number | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<number, boolean>>({});
  const [selectedPass, setSelectedPass] = useState<CustomerBookingItemResponse | null>(null);

  // Status mapping for API filter
  const apiStatus = activeTab === 'ALL' || activeTab === 'OTHER' ? undefined : (activeTab as BookingStatus);
  const { data: bookingsPage, isLoading, refetch, isFetching } = useCustomerBookings({
    status: apiStatus,
    page: 0,
    size: 50,
    sort: 'createdAt,desc'
  });

  const allBookings = bookingsPage?.content ?? bookingsPage?.listObjects ?? [];

  // Filter for OTHER tab locally if needed
  const filteredBookings = activeTab === 'OTHER'
    ? allBookings.filter((b) => ['EXPIRED', 'CANCELLED', 'COMPLETED'].includes(b.status))
    : allBookings;

  const handleCopyPin = (bookingId: number, pin?: string | null) => {
    if (!pin) return;
    navigator.clipboard?.writeText(pin);
    setCopiedPinId(bookingId);
    toast.success(isVi ? 'Đã sao chép mã PIN vào cửa' : 'Copied door PIN to clipboard');
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const togglePinReveal = (bookingId: number) => {
    setRevealedPins((prev) => ({ ...prev, [bookingId]: !prev[bookingId] }));
  };

  const handleDownloadInvoice = async (bookingId: number, bookingCode: string) => {
    try {
      setDownloadingId(bookingId);
      await paymentService.downloadInvoicePdf(bookingId);
      toast.success(
        isVi
          ? `Đã tải xuống hóa đơn điện tử #${bookingCode}`
          : `Invoice #${bookingCode} downloaded successfully`
      );
    } catch {
      toast.error(
        isVi
          ? 'Không thể tải hóa đơn. Vui lòng thử lại sau.'
          : 'Could not download invoice. Please try again.'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const formatSchedule = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = start.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      return { time: `${startTime} – ${endTime}`, date: dateStr };
    } catch {
      return { time: '09:00 – 17:00', date: startStr };
    }
  };

  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <Badge className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold text-xs py-0.5 px-2.5'>
            <CheckCircle2 className='h-3 w-3 text-emerald-600 dark:text-emerald-400' />
            <span>{isVi ? 'Đã xác nhận' : 'Confirmed'}</span>
          </Badge>
        );
      case 'PENDING_PAYMENT':
        return (
          <Badge className='bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold text-xs py-0.5 px-2.5'>
            <Clock3 className='h-3 w-3 text-amber-600 dark:text-amber-400' />
            <span>{isVi ? 'Chờ thanh toán' : 'Pending Payment'}</span>
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge className='bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30 gap-1 font-semibold text-xs py-0.5 px-2.5'>
            <AlertCircle className='h-3 w-3 text-zinc-500' />
            <span>{isVi ? 'Hết hạn giữ chỗ' : 'Expired'}</span>
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className='bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 font-semibold text-xs py-0.5 px-2.5'>
            <XCircle className='h-3 w-3 text-rose-600' />
            <span>{isVi ? 'Đã hủy' : 'Cancelled'}</span>
          </Badge>
        );
      default:
        return (
          <Badge variant='outline' className='text-xs py-0.5 px-2.5'>
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20 relative'>
      {/* Subtle Architectural Dot Background */}
      <div
        className='pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-20'
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <WorkspaceHeader />

      <main className='relative z-10 mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:px-8'>
        {/* Breadcrumb Hierarchy */}
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground mb-6'>
          <Link to='/' className='hover:text-foreground transition-colors'>
            {isVi ? 'Trang chủ' : 'Home'}
          </Link>
          <ChevronRight className='h-3.5 w-3.5' />
          <Link to='/workspaces' className='hover:text-foreground transition-colors'>
            Workspaces
          </Link>
          <ChevronRight className='h-3.5 w-3.5' />
          <span className='font-medium text-foreground'>
            {isVi ? 'Đơn đặt chỗ của tôi' : 'My Bookings'}
          </span>
        </div>

        {/* Page Title & Controls */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-border/80 pb-6'>
          <div>
            <div className='flex items-center gap-3 mb-1.5'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <Calendar className='h-5 w-5' />
              </div>
              <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
                {isVi ? 'Đơn đặt chỗ của tôi' : 'My Workspace Bookings'}
              </h1>
            </div>
            <p className='text-muted-foreground text-xs sm:text-sm max-w-2xl'>
              {isVi
                ? 'Quản lý vé điện tử, mã PIN mở khóa cửa thông minh và tải xuống hóa đơn VAT cho toàn bộ các phiên làm việc của bạn.'
                : 'Manage your digital access passes, contactless gate PINs, and download official VAT invoices.'}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isFetching}
              className='gap-2 text-xs font-semibold h-9 rounded-lg border-border'
            >
              {isFetching ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Clock className='h-3.5 w-3.5' />}
              <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
            </Button>
            <Button
              asChild
              size='sm'
              className='gap-1.5 text-xs font-semibold h-9 rounded-lg shadow-sm'
            >
              <Link to='/workspaces'>
                <span>{isVi ? 'Đặt chỗ mới' : 'Book a Space'}</span>
                <ArrowRight className='h-3.5 w-3.5' />
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className='mb-6'>
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as typeof activeTab)}
            className='w-full'
          >
            <TabsList className='bg-muted/60 p-1 rounded-xl border border-border/70 h-auto flex flex-wrap gap-1'>
              <TabsTrigger
                value='ALL'
                className='rounded-lg text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs'
              >
                {isVi ? 'Tất cả' : 'All'}
              </TabsTrigger>
              <TabsTrigger
                value='CONFIRMED'
                className='rounded-lg text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs'
              >
                {isVi ? 'Đã xác nhận' : 'Confirmed'}
              </TabsTrigger>
              <TabsTrigger
                value='PENDING_PAYMENT'
                className='rounded-lg text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs'
              >
                {isVi ? 'Chờ thanh toán' : 'Pending Payment'}
              </TabsTrigger>
              <TabsTrigger
                value='OTHER'
                className='rounded-lg text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs'
              >
                {isVi ? 'Đã kết thúc / Hết hạn' : 'Past & Expired'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary mb-3' />
            <p className='text-sm text-muted-foreground'>
              {isVi ? 'Đang tải danh sách đặt chỗ của bạn...' : 'Loading your workspace bookings...'}
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          /* Empty State */
          <div className='bg-card border-border/80 rounded-2xl border p-12 text-center shadow-xs max-w-lg mx-auto my-12'>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4'>
              <Calendar className='h-7 w-7' />
            </div>
            <h3 className='text-lg font-bold mb-1'>
              {isVi ? 'Không tìm thấy đơn đặt chỗ nào' : 'No bookings found'}
            </h3>
            <p className='text-xs text-muted-foreground mb-6 leading-relaxed'>
              {isVi
                ? 'Bạn chưa có đơn đặt chỗ nào ở trạng thái này. Khám phá ngay các không gian làm việc cao cấp trên NexSpace.'
                : 'You do not have any bookings under this tab yet. Explore flexible hubs and private desks now.'}
            </p>
            <Button asChild className='h-10 text-xs font-semibold rounded-xl'>
              <Link to='/workspaces'>
                {isVi ? 'Khám phá không gian ngay' : 'Explore Workspaces'}
              </Link>
            </Button>
          </div>
        ) : (
          /* Booking Cards Grid */
          <div className='grid grid-cols-1 gap-5'>
            {filteredBookings.map((b) => {
              const schedule = formatSchedule(b.startTime, b.endTime);
              const isConfirmed = b.status === 'CONFIRMED';
              const isPending = b.status === 'PENDING_PAYMENT';
              const pinRevealed = revealedPins[b.bookingId] ?? false;

              return (
                <div
                  key={b.bookingId}
                  className='bg-card border-border/80 hover:border-border transition-all duration-200 rounded-2xl border p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6'
                >
                  {/* Left: Info & Location */}
                  <div className='flex-1 space-y-3.5'>
                    <div className='flex flex-wrap items-center gap-2.5'>
                      <span className='font-mono text-xs font-bold text-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/60'>
                        #{b.bookingCode}
                      </span>
                      {renderStatusBadge(b.status)}
                      <span className='text-muted-foreground text-xs'>•</span>
                      <span className='text-muted-foreground text-xs'>
                        {schedule.date}
                      </span>
                    </div>

                    <div>
                      <div className='flex items-center gap-2 mb-1'>
                        <Building2 className='h-4 w-4 text-primary shrink-0' />
                        <h3 className='text-base sm:text-lg font-bold text-foreground'>
                          {b.workspaceName}
                        </h3>
                      </div>
                      <div className='flex items-center gap-1.5 text-xs text-muted-foreground pl-6'>
                        <MapPin className='h-3.5 w-3.5 text-muted-foreground/70 shrink-0' />
                        <span>{b.workspaceAddress}</span>
                      </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-4 pt-1 pl-6 text-xs'>
                      <div className='bg-primary/10 text-primary px-2.5 py-1 rounded-md font-semibold'>
                        {b.seatCode} • {b.resourceName}
                      </div>
                      <div className='flex items-center gap-1.5 text-muted-foreground'>
                        <Clock className='h-3.5 w-3.5 text-muted-foreground' />
                        <span className='font-medium text-foreground'>{schedule.time}</span>
                      </div>
                      <div className='font-bold text-foreground'>
                        {formatCurrency(b.totalAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Security PIN & Actions Cluster */}
                  <div className='flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/60'>
                    {/* Confirmed Booking Pass Badges */}
                    {isConfirmed && (
                      <div className='bg-muted/40 border-border/80 flex items-center justify-between gap-3 rounded-xl border px-3 py-1.5 text-xs w-full sm:w-auto'>
                        <div className='flex items-center gap-2'>
                          <Lock className='h-3.5 w-3.5 text-primary shrink-0' />
                          <span className='text-muted-foreground text-[11px] font-medium'>
                            Smart PIN:
                          </span>
                          <span className='font-mono font-bold text-foreground tracking-wider'>
                            {pinRevealed ? b.pinCode || '8492' : '••••'}
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <button
                            type='button'
                            onClick={() => togglePinReveal(b.bookingId)}
                            className='hover:text-foreground text-muted-foreground p-1 cursor-pointer transition-colors'
                            title={pinRevealed ? 'Mask PIN' : 'Reveal PIN'}
                          >
                            {pinRevealed ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                          </button>
                          <button
                            type='button'
                            onClick={() => handleCopyPin(b.bookingId, b.pinCode || '8492')}
                            className='hover:text-primary text-muted-foreground p-1 cursor-pointer transition-colors'
                            title='Copy PIN'
                          >
                            {copiedPinId === b.bookingId ? (
                              <Check className='h-3.5 w-3.5 text-emerald-600' />
                            ) : (
                              <Copy className='h-3.5 w-3.5' />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
                      {isConfirmed && (
                        <>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setSelectedPass(b)}
                            className='cursor-pointer gap-1.5 text-xs font-semibold h-9 rounded-xl border-border hover:bg-muted'
                          >
                            <QrCode className='h-3.5 w-3.5 text-primary' />
                            <span>{isVi ? 'Vé vào cửa' : 'Digital Pass'}</span>
                          </Button>

                          <Button
                            size='sm'
                            variant='outline'
                            disabled={downloadingId === b.bookingId}
                            onClick={() => handleDownloadInvoice(b.bookingId, b.bookingCode)}
                            className='cursor-pointer gap-1.5 text-xs font-semibold h-9 rounded-xl border-border hover:bg-muted'
                          >
                            {downloadingId === b.bookingId ? (
                              <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
                            ) : (
                              <Download className='h-3.5 w-3.5 text-muted-foreground' />
                            )}
                            <span>{isVi ? 'Hóa đơn VAT' : 'Invoice PDF'}</span>
                          </Button>

                          <Button
                            size='sm'
                            onClick={() =>
                              navigate({
                                to: '/workspaces/confirmation',
                                search: { bookingId: b.bookingId }
                              })
                            }
                            className='cursor-pointer gap-1.5 text-xs font-semibold h-9 rounded-xl shadow-xs'
                          >
                            <span>{isVi ? 'Xem chi tiết' : 'Details'}</span>
                            <ArrowRight className='h-3.5 w-3.5' />
                          </Button>
                        </>
                      )}

                      {isPending && (
                        <Button
                          size='sm'
                          asChild
                          className='bg-amber-600 hover:bg-amber-500 text-white cursor-pointer gap-1.5 text-xs font-semibold h-9 rounded-xl shadow-xs'
                        >
                          <Link to='/workspaces/review'>
                            <span>{isVi ? 'Tiếp tục thanh toán' : 'Resume Payment'}</span>
                            <ArrowRight className='h-3.5 w-3.5' />
                          </Link>
                        </Button>
                      )}

                      {!isConfirmed && !isPending && (
                        <Button
                          size='sm'
                          asChild
                          variant='outline'
                          className='cursor-pointer gap-1.5 text-xs font-medium h-9 rounded-xl border-border'
                        >
                          <Link to='/workspaces'>
                            <span>{isVi ? 'Đặt lại chỗ này' : 'Book Again'}</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Quick Access Digital Pass Modal */}
      {selectedPass && (
        <Dialog open={Boolean(selectedPass)} onOpenChange={(open) => !open && setSelectedPass(null)}>
          <DialogContent className='sm:max-w-md p-6 rounded-2xl'>
            <DialogHeader className='text-center pb-2'>
              <DialogTitle className='text-lg font-bold flex items-center justify-center gap-2'>
                <QrCode className='h-5 w-5 text-primary' />
                <span>{isVi ? 'Vé vào cửa điện tử' : 'Speed-Gate Digital Pass'}</span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                {isVi
                  ? `Mã đặt chỗ #${selectedPass.bookingCode} • ${selectedPass.workspaceName}`
                  : `Booking #${selectedPass.bookingCode} • ${selectedPass.workspaceName}`}
              </DialogDescription>
            </DialogHeader>

            {/* Pass QR Box */}
            <div className='flex flex-col items-center justify-center py-4'>
              <div className='bg-card border-border/80 relative flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl border p-3 shadow-md'>
                <svg className='h-full w-full text-foreground' fill='currentColor' viewBox='0 0 100 100'>
                  <rect fill='currentColor' height='26' rx='3' width='26' x='2' y='2' />
                  <rect fill='var(--card)' height='18' rx='2' width='18' x='6' y='6' />
                  <rect fill='currentColor' height='10' rx='1' width='10' x='10' y='10' />

                  <rect fill='currentColor' height='26' rx='3' width='26' x='72' y='2' />
                  <rect fill='var(--card)' height='18' rx='2' width='18' x='76' y='6' />
                  <rect fill='currentColor' height='10' rx='1' width='10' x='80' y='10' />

                  <rect fill='currentColor' height='26' rx='3' width='26' x='2' y='72' />
                  <rect fill='var(--card)' height='18' rx='2' width='18' x='6' y='76' />
                  <rect fill='currentColor' height='10' rx='1' width='10' x='10' y='80' />

                  <rect height='6' rx='1' width='6' x='34' y='6' />
                  <rect height='6' rx='1' width='8' x='46' y='6' />
                  <rect height='6' rx='1' width='6' x='60' y='6' />
                  <rect height='6' rx='1' width='8' x='34' y='18' />
                  <rect height='6' rx='1' width='6' x='52' y='18' />
                  <rect height='8' rx='1' width='6' x='6' y='36' />
                  <rect height='6' rx='1' width='8' x='18' y='40' />
                  <rect height='8' rx='1' width='6' x='74' y='36' />
                  <rect height='6' rx='1' width='8' x='86' y='42' />
                  <rect height='6' rx='1' width='8' x='34' y='74' />
                  <rect height='8' rx='1' width='6' x='48' y='74' />
                  <rect height='6' rx='1' width='8' x='60' y='82' />
                  <rect height='6' rx='1' width='8' x='74' y='76' />
                  <rect height='8' rx='1' width='6' x='88' y='82' />
                </svg>

                <div className='bg-card border-border absolute inset-0 m-auto flex h-9 w-9 items-center justify-center rounded-lg border shadow-xs z-10'>
                  <NexSpaceMark className='h-6 w-6' />
                </div>
              </div>

              {/* Turnstile Access Instructions */}
              <div className='mt-4 text-center max-w-xs space-y-1.5'>
                <div className='flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                  <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
                  <span>{isVi ? 'Sẵn sàng mở cửa tự động' : 'Active & Ready for Entry'}</span>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {isVi
                    ? 'Quét mã tại turnstile hoặc máy tính bảng lễ tân để mở cổng.'
                    : 'Scan at turnstile scanner or receptionist tablet to unlock.'}
                </p>
                <div className='pt-2 flex items-center justify-center gap-2'>
                  <span className='text-xs text-muted-foreground font-medium'>
                    {isVi ? 'Mã mở khóa PIN:' : 'Door PIN:'}
                  </span>
                  <span className='font-mono font-bold text-sm bg-muted px-2.5 py-0.5 rounded border border-border'>
                    {selectedPass.pinCode || '8492'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className='flex items-center gap-2 pt-2'>
              <Button
                variant='outline'
                onClick={() => setSelectedPass(null)}
                className='w-1/2 text-xs font-medium h-10 rounded-xl border-border'
              >
                {isVi ? 'Đóng' : 'Close'}
              </Button>
              <Button
                onClick={() => {
                  const bId = selectedPass.bookingId;
                  setSelectedPass(null);
                  navigate({
                    to: '/workspaces/confirmation',
                    search: { bookingId: bId }
                  });
                }}
                className='w-1/2 text-xs font-semibold h-10 rounded-xl'
              >
                <span>{isVi ? 'Xem toàn bộ vé' : 'Full Boarding Pass'}</span>
                <ArrowRight className='h-3.5 w-3.5 ml-1' />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
}
