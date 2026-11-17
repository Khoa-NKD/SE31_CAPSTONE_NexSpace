import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, Radio, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  MOCK_BOOKING_KPIS,
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
      { title: 'A08 — Bookings Management Ledger | NexSpace Console' },
      {
        name: 'description',
        content: 'Monitor real-time reservation concurrency, check-in statuses, and PayOS smart escrow across workspaces.'
      }
    ]
  }),
  validateSearch: zodValidator(bookingsSearchSchema),
  component: BookingsManagementPage
});

function handleExportLedger() {
  toast.success('Bookings Ledger Exported (CSV)', {
    description: 'Compiled reservation and hardware allocation records.'
  });
}

function handleLiveTelemetry() {
  toast.info('NFC Access Point Telemetry (Live)', {
    description: 'All 14 metro hub RFID/NFC turnstiles operational. Concurrency nominal.'
  });
}

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
  const timeSlot = `${start.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })} • ${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

  const initials = b.customerName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'KH';

  return {
    id: b.bookingCode || `NX-${b.id}`,
    customer: {
      name: b.customerName,
      email: b.customerEmail,
      phone: b.customerPhone || '0901000001',
      membershipTier: 'Standard',
      avatarInitials: initials
    },
    workspace: {
      name: b.workspaceName,
      hubId: `HUB-${b.workspaceId || 1}`,
      address: b.workspaceAddress,
      resourceName: b.resourceName,
      zone: b.resourceZone,
      hardwareSpecs: 'Dual 4K Monitor • Gigabit LAN',
      authorizedSlot: timeSlot,
      nfcPassCode: b.pinCode || '8492'
    },
    timeSlot,
    grossAmountDisplay: formatVnd(b.amount),
    status: mappedStatus,
    relativeStatusTime: mappedStatus === 'confirmed' ? 'Upcoming' : (mappedStatus === 'checked_in' ? 'Active' : 'Settled'),
    escrow: {
      status: mappedStatus === 'cancelled' ? 'Refunded' : (mappedStatus === 'completed' ? 'Verified' : 'Pending Settlement'),
      txReference: `TX-${b.id}`,
      grossFeeUsd: Math.round(b.amount / 25450),
      grossFeeVnd: b.amount,
      platformTakeRatePercent: 10,
      platformTakeRateUsd: Math.round((b.amount * 0.1) / 25450),
      platformTakeRateVnd: Math.round(b.amount * 0.1),
      netPayoutUsd: Math.round((b.amount * 0.9) / 25450),
      netPayoutVnd: Math.round(b.amount * 0.9),
      escrowContractId: `PAYOS-${b.bookingCode}`
    },
    timeline: [
      {
        id: '1',
        title: 'Booking Created',
        timestamp: new Date(b.createdAt).toLocaleString('vi-VN'),
        description: `Booking #${b.bookingCode} reserved by ${b.customerName}.`,
        completed: true
      },
      {
        id: '2',
        title: 'VietQR Payment Verified',
        timestamp: new Date(b.createdAt).toLocaleString('vi-VN'),
        description: `PayOS received ${formatVnd(b.amount)} full payment.`,
        completed: b.status !== 'PENDING_PAYMENT'
      }
    ]
  };
}

function BookingsManagementPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const searchQuery = searchParams.search || '';
  const statusFilter = (searchParams.status as BookingStatus | 'all') || 'all';

  const apiStatus = statusFilter === 'all' ? undefined : (statusFilter === 'checked_in' ? 'CHECKED_IN' : statusFilter.toUpperCase());
  const { data: bookingsData, refetch, isFetching } = useAdminBookings({
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

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = b.id.toLowerCase().includes(query);
        const matchesCustomer = b.customer.name.toLowerCase().includes(query) || b.customer.email.toLowerCase().includes(query);
        const matchesWorkspace = b.workspace.name.toLowerCase().includes(query) || b.workspace.hubId.toLowerCase().includes(query);
        if (!matchesId && !matchesCustomer && !matchesWorkspace) return false;
      }

      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, searchQuery, statusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    if (!kpiData) return MOCK_BOOKING_KPIS;
    return {
      todayTotalBookings: kpiData.totalCount,
      todayGrowthPercentage: 8.4,
      activeConcurrencyRate: 84,
      confirmedCount: kpiData.confirmedCount,
      rfidComplianceRate: 100,
      completedCount: kpiData.completedCount,
      cancelledCount: kpiData.cancelledCount
    };
  }, [kpiData]);

  // Handlers
  const handleSearchChange = (value: string) => {
    navigate({
      search: (prev) => ({ ...prev, search: value || undefined })
    });
  };

  const handleStatusChange = (status: BookingStatus | 'all') => {
    navigate({
      search: (prev) => ({ ...prev, status })
    });
  };

  const handleResetFilters = () => {
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
    toast.success(`Reservation #${bookingToCancel.id} Force-Cancelled`, {
      description: `Full refund initiated from PayOS Escrow ${bookingToCancel.escrow.escrowContractId} to ${bookingToCancel.customer.name}.`
    });
  };

  return (
    <PageContainer>
      <div className='max-w-[1360px] mx-auto w-full'>
        {/* Page Action Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl lg:text-3xl font-bold font-heading text-foreground tracking-tight'>
              Platform Bookings Ledger
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              Monitor transactions, reservation concurrency, and check-in statuses across flexible workspaces.
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isFetching}
              className='gap-2 shadow-2xs text-xs'
            >
              <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} aria-hidden='true' />
              <span>Refresh Data</span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={handleLiveTelemetry}
              className='gap-2 shadow-2xs'
            >
              <Radio className='size-3.5 text-emerald-600 dark:text-emerald-400' aria-hidden='true' />
              <span>Live Access Telemetry</span>
            </Button>

            <Button
              size='sm'
              onClick={handleExportLedger}
              className='gap-2 bg-primary hover:bg-primary/90 text-white shadow-2xs'
            >
              <FileDown className='size-4' aria-hidden='true' />
              <span>Export Ledger (CSV)</span>
            </Button>
          </div>
        </div>

        {/* 4 Summary KPI Tiles */}
        <BookingKpiGrid kpis={kpis} />

        {/* Filter Controls */}
        <BookingsFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          kpis={kpis}
          onReset={handleResetFilters}
        />

        {/* Bookings Ledger Data Table */}
        <BookingsLedgerTable
          items={filteredBookings}
          selectedBookingId={selectedBooking?.id}
          onSelectBooking={handleSelectBooking}
        />

        {/* Booking Details Slide-over Drawer */}
        <BookingDetailsDrawer
          booking={selectedBooking}
          isOpen={isDrawerOpen}
          isNestedDialogOpen={isCancelDialogOpen}
          onClose={handleCloseDrawer}
          onForceCancel={handleOpenCancelDialog}
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
