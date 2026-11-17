import { useState } from 'react';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { BookingHistoryCard } from './booking-history-card';
import { useMyBookingsQuery, useCancelBookingMutation, useCancellationPreviewQuery } from '../../api/booking-queries';
import type { BookingDto } from '../../api/booking-types';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  Search,
  Ticket,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

type StatusFilterTab = 'ALL' | 'CONFIRMED' | 'PENDING_PAYMENT' | 'COMPLETED' | 'CANCELLED';

export function BookingHistoryPage() {
  const [selectedTab, setSelectedTab] = useState<StatusFilterTab>('ALL');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Booking hold to cancel confirmation modal
  const [bookingToCancel, setBookingToCancel] = useState<BookingDto | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const cancelMutation = useCancelBookingMutation();
  const { data: cancelPreview, isLoading: isPreviewLoading } = useCancellationPreviewQuery(
    bookingToCancel?.id,
    { enabled: Boolean(bookingToCancel) }
  );

  // Query bookings with active status filter
  const { data, isLoading, error, refetch } = useMyBookingsQuery({
    status: selectedTab === 'ALL' ? undefined : selectedTab,
    page,
    size: pageSize
  });

  const bookings: BookingDto[] = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Overview Query to compute global KPI metrics
  const { data: allData } = useMyBookingsQuery({ page: 1, size: 100 });
  const allBookings: BookingDto[] = allData?.content ?? [];

  const totalCount = allData?.totalElements ?? bookings.length;
  const activeCount = allBookings.filter((b: BookingDto) => b.status === 'CONFIRMED').length;
  const pendingCount = allBookings.filter((b: BookingDto) => b.status === 'PENDING_PAYMENT').length;

  const handleTabChange = (tab: StatusFilterTab) => {
    setSelectedTab(tab);
    setPage(1);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      await cancelMutation.mutateAsync({
        id: bookingToCancel.id,
        reason: cancelReason || 'Khách hàng yêu cầu hủy từ giao diện lịch sử'
      });
      setBookingToCancel(null);
      setCancelReason('');
      refetch();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    }
  };

  const tabs: { key: StatusFilterTab; label: string; count?: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: totalCount },
    { key: 'CONFIRMED', label: 'Sắp diễn ra', count: activeCount },
    { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán', count: pendingCount },
    { key: 'COMPLETED', label: 'Đã hoàn thành' },
    { key: 'CANCELLED', label: 'Đã hủy' }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 relative">
      {/* Background Grid Pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Global Navigation Header */}
      <WorkspaceHeader />

      <main className="relative z-10 mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title & Breadcrumb */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/workspaces" className="hover:text-foreground transition-colors">
              Không gian làm việc
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Lịch sử đặt chỗ</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Lịch sử đặt chỗ của bạn
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Quản lý các vé điện tử, kiểm tra thời gian giữ chỗ và xem lại toàn bộ giao dịch đặt chỗ.
              </p>
            </div>

            <Link to="/workspaces">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 cursor-pointer shadow-sm hover:border-primary hover:text-primary transition-all"
              >
                <Search className="size-4" />
                <span>Đặt thêm chỗ ngồi</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Total Bookings */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tổng số đơn đặt chỗ</p>
              <p className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {totalCount}
              </p>
            </div>
          </div>

          {/* Card 2: Upcoming / Confirmed */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Vé đang hoạt động / Sắp tới</p>
              <p className="text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-2xl">
                {activeCount}
              </p>
            </div>
          </div>

          {/* Card 3: Pending Holds */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Chờ hoàn tất thanh toán</p>
              <p className="text-xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 sm:text-2xl">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Filter Navigation */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body: Loading, Empty, or List */}
        <div className="mt-6 space-y-4">
          {isLoading && (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Đang tải danh sách lịch sử đặt chỗ...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-700 dark:text-red-300">
              <p className="font-semibold">Không thể tải danh sách đơn đặt chỗ</p>
              <p className="mt-1 text-xs">Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ kỹ thuật.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-3 cursor-pointer"
              >
                Tải lại trang
              </Button>
            </div>
          )}

          {!isLoading && !error && bookings.length === 0 && (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center bg-card/40">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Inbox className="size-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground sm:text-lg">
                Chưa có đơn đặt chỗ nào
              </h3>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {selectedTab === 'ALL'
                  ? 'Bạn chưa thực hiện đơn đặt chỗ nào trên hệ thống NexSpace. Hãy tìm và trải nghiệm không gian làm việc chất lượng cao ngay!'
                  : `Không có đơn đặt chỗ nào trong trạng thái "${tabs.find((t) => t.key === selectedTab)?.label}".`}
              </p>
              <Link to="/workspaces" className="mt-5">
                <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 cursor-pointer">
                  <span>Khám phá không gian làm việc</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && !error && bookings.length > 0 && (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <BookingHistoryCard
                  key={booking.id}
                  booking={booking}
                  onCancelHold={(b) => setBookingToCancel(b)}
                  onCancelBooking={(b) => setBookingToCancel(b)}
                  isCancelling={cancelMutation.isPending}
                />
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/80 pt-4 text-xs text-muted-foreground">
                  <div>
                    Hiển thị trang <span className="font-bold text-foreground">{page}</span> /{' '}
                    <span className="font-bold text-foreground">{totalPages}</span> ({totalElements} đơn đặt chỗ)
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Trước</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="gap-1 cursor-pointer"
                    >
                      <span>Tiếp</span>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Cancel Confirmation Dialog Modal */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {bookingToCancel.status === 'CONFIRMED' ? 'Xác nhận hủy đặt chỗ & Hoàn tiền' : 'Xác nhận hủy giữ chỗ'}
                </h3>
                <p className="text-xs text-muted-foreground">Mã đơn: {bookingToCancel.bookingCode}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Bạn có chắc chắn muốn hủy đặt chỗ cho không gian{' '}
              <strong className="text-foreground">{bookingToCancel.workspaceName}</strong> ({bookingToCancel.resourceCode}) không? Chỗ ngồi sẽ được giải phóng ngay lập tức cho khách hàng khác.
            </p>

            {/* Cancellation Policy Preview for Confirmed Bookings */}
            {bookingToCancel.status === 'CONFIRMED' && (
              <>
                {isPreviewLoading ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Đang kiểm tra chính sách hoàn tiền...</span>
                  </div>
                ) : cancelPreview ? (
                  <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Số tiền hoàn dự kiến:</span>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cancelPreview.refundAmount || 0)}
                        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                          ({cancelPreview.refundPercent}%)
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      {cancelPreview.cancellationPolicyExplanation}
                    </p>
                    {cancelPreview.rules && cancelPreview.rules.length > 0 && (
                      <div className="border-t border-border/60 pt-2 text-[10px] text-muted-foreground space-y-0.5">
                        <span className="font-semibold text-foreground">Mốc hoàn tiền quy định:</span>
                        {cancelPreview.rules.map((r, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>Trước {r.minHoursBeforeStart} giờ:</span>
                            <span className="font-medium text-foreground">Hoàn {r.refundPercent}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="cancel-reason-input" className="text-xs font-semibold text-foreground">
                Lý do hủy (không bắt buộc):
              </label>
              <textarea
                id="cancel-reason-input"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do thay đổi kế hoạch..."
                rows={2}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingToCancel(null)}
                disabled={cancelMutation.isPending}
                className="cursor-pointer"
              >
                Giữ lại
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="bg-red-600 text-white hover:bg-red-700 cursor-pointer gap-2"
              >
                {cancelMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                <span>{bookingToCancel.status === 'CONFIRMED' ? 'Xác nhận hủy đặt chỗ' : 'Xác nhận hủy chỗ'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
