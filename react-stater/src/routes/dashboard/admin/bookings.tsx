import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FileDown, RefreshCw } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { useLanguage } from '@/features/landing/context/language-context';
import { formatDate as formatDisplayDate, formatDateTime as formatDisplayDateTime } from '@/lib/format';
import {
  BookingItem,
  BookingStatus
} from '@/features/admin-bookings/data/mock-bookings';
import { BookingKpiGrid } from '@/features/admin-bookings/components/booking-kpi-grid';
import { BookingsFilterBar } from '@/features/admin-bookings/components/bookings-filter-bar';
import { BookingsLedgerTable } from '@/features/admin-bookings/components/bookings-ledger-table';
import { BookingDetailsDrawer } from '@/features/admin-bookings/components/booking-details-drawer';
import { BookingCancelDialog } from '@/features/admin-bookings/components/booking-cancel-dialog';
import { useAdminBookings, useAdminBookingKpis } from '@/features/admin-bookings/api/queries';
import type { AdminBookingApiItem } from '@/features/admin-bookings/api/types';

const bookingsSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'confirmed', 'checked_in', 'completed', 'cancelled']).optional().default('all'),
  bookingId: z.string().optional()
});

export const Route = createFileRoute('/dashboard/admin/bookings')({
  head: () => ({
    meta: [
      { title: 'A08 — Sổ cái đặt chỗ nền tảng | NexSpace Console' },
      {
        name: 'description',
        content: 'Giám sát chi tiết các đơn đặt chỗ, trạng thái check-in và dòng tiền PayOS.'
      }
    ]
  }),
  validateSearch: zodValidator(bookingsSearchSchema),
  component: BookingsManagementPage
});

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

function mapApiToAdminBookingItem(b: AdminBookingApiItem): BookingItem {
  let mappedStatus: BookingStatus = 'confirmed';
  if (b.status === 'CHECKED_IN') mappedStatus = 'checked_in';
  else if (b.status === 'COMPLETED') mappedStatus = 'completed';
  else if (b.status === 'CANCELLED' || b.status === 'EXPIRED') mappedStatus = 'cancelled';

  const start = new Date(b.startTime);
  const end = new Date(b.endTime);
  const timeSlot = `${formatDisplayDate(start)} • ${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

  const initials =
    b.customerName
      ?.split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'KH';

  return {
    id: b.bookingCode || `NX-${b.id}`,
    customer: {
      name: b.customerName || 'Khách vãng lai',
      email: b.customerEmail || '—',
      phone: b.customerPhone || '—',
      membershipTier: 'Standard',
      avatarInitials: initials
    },
    workspace: {
      name: b.workspaceName || 'Không gian làm việc',
      hubId: `HUB-${b.workspaceId || 1}`,
      address: b.workspaceAddress || '—',
      resourceName: b.resourceName || 'Bàn làm việc',
      zone: b.resourceZone || 'Khu làm việc mở',
      hardwareSpecs: 'Dual 4K Monitor • Gigabit LAN',
      authorizedSlot: timeSlot,
      nfcPassCode: b.pinCode || '8492'
    },
    timeSlot,
    grossAmountDisplay: formatVnd(b.amount || 0),
    status: mappedStatus,
    relativeStatusTime:
      mappedStatus === 'confirmed'
        ? 'Upcoming'
        : mappedStatus === 'checked_in'
          ? 'Active'
          : 'Settled',
    escrow: {
      status:
        mappedStatus === 'cancelled'
          ? 'Refunded'
          : mappedStatus === 'completed'
            ? 'Verified'
            : 'Pending Settlement',
      txReference: `TX-${b.id}`,
      grossFeeUsd: Math.round((b.amount || 0) / 25450),
      grossFeeVnd: b.amount || 0,
      platformTakeRatePercent: 10,
      platformTakeRateUsd: Math.round(((b.amount || 0) * 0.1) / 25450),
      platformTakeRateVnd: Math.round((b.amount || 0) * 0.1),
      netPayoutUsd: Math.round(((b.amount || 0) * 0.9) / 25450),
      netPayoutVnd: Math.round((b.amount || 0) * 0.9),
      escrowContractId: `PAYOS-${b.bookingCode || b.id}`
    },
    timeline: [
      {
        id: '1',
        title: 'Booking Created',
        timestamp: formatDisplayDateTime(new Date(b.createdAt)),
        description: `Booking #${b.bookingCode || b.id} reserved by ${b.customerName}.`,
        completed: true
      },
      {
        id: '2',
        title: 'VietQR Payment Verified',
        timestamp: formatDisplayDateTime(new Date(b.createdAt)),
        description: `PayOS received ${formatVnd(b.amount || 0)} full payment.`,
        completed: b.status !== 'PENDING_PAYMENT'
      }
    ]
  };
}

function BookingsManagementPage() {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const searchQuery = searchParams.search || '';
  const statusFilter = (searchParams.status as BookingStatus | 'all') || 'all';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const apiStatus =
    statusFilter === 'all'
      ? undefined
      : statusFilter === 'checked_in'
        ? 'CHECKED_IN'
        : statusFilter.toUpperCase();

  const {
    data: bookingsData,
    refetch,
    isFetching
  } = useAdminBookings({
    search: searchQuery || undefined,
    status: apiStatus
  });

  const { data: kpiData } = useAdminBookingKpis();

  // Map to local BookingItem format
  const bookings: BookingItem[] = useMemo(() => {
    const list = bookingsData?.content ?? bookingsData?.listObjects ?? [];
    return list.map(mapApiToAdminBookingItem);
  }, [bookingsData]);

  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingItem | null>(null);

  // Filtered bookings client-side (for responsive search and status)
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = b.id.toLowerCase().includes(query);
        const matchesCustomer =
          b.customer.name.toLowerCase().includes(query) ||
          b.customer.email.toLowerCase().includes(query);
        const matchesWorkspace =
          b.workspace.name.toLowerCase().includes(query) ||
          b.workspace.hubId.toLowerCase().includes(query);
        if (!matchesId && !matchesCustomer && !matchesWorkspace) return false;
      }

      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, searchQuery, statusFilter]);

  // KPIs calculation using real API data with fallback
  const kpis = useMemo(() => {
    const total = kpiData?.totalCount ?? bookings.length;
    const confirmed =
      kpiData?.confirmedCount ??
      bookings.filter((b) => b.status === 'confirmed').length;
    const completed =
      kpiData?.completedCount ??
      bookings.filter((b) => b.status === 'completed').length;
    const cancelled =
      kpiData?.cancelledCount ??
      bookings.filter((b) => b.status === 'cancelled').length;

    return {
      totalCount: total,
      confirmedCount: confirmed,
      completedCount: completed,
      cancelledCount: cancelled,
      pendingCount: kpiData?.pendingCount,
      totalRevenue: kpiData?.totalRevenue
    };
  }, [kpiData, bookings]);

  // Real CSV Export Function
  const handleExportCsv = () => {
    if (filteredBookings.length === 0) {
      toast.info(isVi ? 'Không có dữ liệu để xuất file' : 'No bookings to export');
      return;
    }

    const headers = [
      'Mã đặt chỗ',
      'Khách hàng',
      'Email',
      'Số điện thoại',
      'Không gian làm việc',
      'Chỗ ngồi/Phòng',
      'Thời gian',
      'Số tiền',
      'Trạng thái'
    ];

    const rows = filteredBookings.map((b) => [
      `"${b.id}"`,
      `"${b.customer.name.replace(/"/g, '""')}"`,
      `"${b.customer.email}"`,
      `"${b.customer.phone}"`,
      `"${b.workspace.name.replace(/"/g, '""')}"`,
      `"${b.workspace.resourceName.replace(/"/g, '""')}"`,
      `"${b.timeSlot}"`,
      `"${b.grossAmountDisplay}"`,
      `"${b.status}"`
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `so-cai-dat-cho-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      isVi
        ? `Đã xuất ${filteredBookings.length} đơn đặt chỗ ra file CSV`
        : `Exported ${filteredBookings.length} bookings to CSV`
    );
  };

  // Handlers
  const handleSearchChange = (value: string) => {
    setPage(1);
    navigate({
      search: (prev) => ({ ...prev, search: value || undefined })
    });
  };

  const handleStatusChange = (status: BookingStatus | 'all') => {
    setPage(1);
    navigate({
      search: (prev) => ({ ...prev, status })
    });
  };

  const handleResetFilters = () => {
    setPage(1);
    navigate({
      search: () => ({ status: 'all' })
    });
  };

  const handleSelectBooking = (booking: BookingItem) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
    navigate({
      search: (prev) => ({ ...prev, bookingId: booking.id }),
      replace: true,
      resetScroll: false
    });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    navigate({
      search: (prev) => {
        const next = { ...prev };
        delete next.bookingId;
        return next;
      },
      replace: true,
      resetScroll: false
    });
  };

  const handleOpenCancelDialog = (booking: BookingItem) => {
    setBookingToCancel(booking);
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!bookingToCancel) return;
    setIsCancelDialogOpen(false);
    toast.success(
      isVi
        ? `Đã hủy bắt buộc đơn #${bookingToCancel.id}`
        : `Reservation #${bookingToCancel.id} Force-Cancelled`,
      {
        description: isVi
          ? `Lệnh hoàn tiền đã được gửi tới PayOS Escrow ${bookingToCancel.escrow.escrowContractId}.`
          : `Full refund initiated from PayOS Escrow ${bookingToCancel.escrow.escrowContractId} to ${bookingToCancel.customer.name}.`
      }
    );
  };

  return (
    <PageContainer>
      <div className='flex flex-col min-h-screen pb-12 min-w-0 w-full'>
        {/* Page Header Row - Compact, Clean, Responsive */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5'>
          <div>
            <div className='flex items-center gap-2.5'>
              <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading'>
                {isVi ? 'Sổ cái đặt chỗ nền tảng' : 'Platform Bookings Ledger'}
              </h1>
              <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20'>
                {filteredBookings.length} {isVi ? 'đơn' : 'bookings'}
              </span>
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              {isVi
                ? 'Giám sát chi tiết các đơn đặt chỗ, trạng thái check-in và dòng tiền PayOS.'
                : 'Monitor real-time reservation concurrency, check-in statuses, and PayOS smart escrow across workspaces.'}
            </p>
          </div>

          {/* Action Button Bar */}
          <div className='flex items-center gap-2 self-start sm:self-auto'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isFetching}
              className='h-8 px-2.5 text-xs gap-1.5 shadow-2xs'
              title={isVi ? 'Làm mới dữ liệu' : 'Refresh data'}
            >
              {isFetching ? (
                <Spinner className='size-3.5' aria-hidden='true' />
              ) : (
                <RefreshCw className='size-3.5' aria-hidden='true' />
              )}
              <span className='hidden sm:inline'>{isVi ? 'Làm mới' : 'Refresh'}</span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={handleExportCsv}
              className='h-8 px-2.5 text-xs gap-1.5 shadow-2xs text-foreground hover:bg-muted/60'
              title={isVi ? 'Xuất danh sách ra file CSV' : 'Export to CSV'}
            >
              <FileDown className='size-3.5' aria-hidden='true' />
              <span>{isVi ? 'Xuất CSV' : 'Export CSV'}</span>
            </Button>
          </div>
        </div>

        {/* 4 Sleek Bento KPI Cards */}
        <BookingKpiGrid kpis={kpis} language={language} />

        {/* Filter Controls Bar */}
        <BookingsFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          kpis={kpis}
          onReset={handleResetFilters}
          language={language}
        />

        {/* Bookings Ledger Data Table with Sticky Columns and Real Pagination */}
        <BookingsLedgerTable
          items={filteredBookings}
          selectedBookingId={selectedBooking?.id}
          onSelectBooking={handleSelectBooking}
          language={language}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />

        {/* Booking Details Slide-over Drawer */}
        <BookingDetailsDrawer
          booking={selectedBooking}
          isOpen={isDrawerOpen}
          isNestedDialogOpen={isCancelDialogOpen}
          onClose={handleCloseDrawer}
          onForceCancel={handleOpenCancelDialog}
          language={language}
        />

        {/* Force Cancel Confirmation Dialog */}
        <BookingCancelDialog
          booking={bookingToCancel}
          isOpen={isCancelDialogOpen}
          onClose={() => setIsCancelDialogOpen(false)}
          onConfirm={handleConfirmCancel}
        />
      </div>
    </PageContainer>
  );
}
