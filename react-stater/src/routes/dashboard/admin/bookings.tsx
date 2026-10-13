import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { FileDown, Radio } from 'lucide-react';
import { toast } from 'sonner';
import {
  INITIAL_BOOKINGS_DATA,
  MOCK_BOOKING_KPIS,
  BookingItem,
  BookingStatus
} from '@/features/admin-bookings/data/mock-bookings';
import { BookingKpiGrid } from '@/features/admin-bookings/components/booking-kpi-grid';
import { BookingsFilterBar } from '@/features/admin-bookings/components/bookings-filter-bar';
import { BookingsLedgerTable } from '@/features/admin-bookings/components/bookings-ledger-table';
import { BookingDetailsDrawer } from '@/features/admin-bookings/components/booking-details-drawer';
import { BookingCancelDialog } from '@/features/admin-bookings/components/booking-cancel-dialog';

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
    description: 'Compiled 1,420 reservation and hardware allocation records.'
  });
}

function handleLiveTelemetry() {
  toast.info('NFC Access Point Telemetry (Live)', {
    description: 'All 14 metro hub RFID/NFC turnstiles operational. Concurrency nominal.'
  });
}

function BookingsManagementPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS_DATA);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(() => {
    if (searchParams.bookingId) {
      return INITIAL_BOOKINGS_DATA.find((b) => b.id === searchParams.bookingId) || null;
    }
    return null;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => Boolean(searchParams.bookingId));
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingItem | null>(null);

  const searchQuery = searchParams.search || '';
  const statusFilter = (searchParams.status as BookingStatus | 'all') || 'all';

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
      search: (prev) => ({ ...prev, bookingId: booking.id })
    });
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    navigate({
      search: (prev) => {
        const next = { ...prev };
        delete next.bookingId;
        return next;
      }
    });
  };

  const handleOpenCancelDialog = (booking: BookingItem) => {
    setBookingToCancel(booking);
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!bookingToCancel) return;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingToCancel.id
          ? {
              ...b,
              status: 'cancelled' as BookingStatus,
              relativeStatusTime: 'Cancelled just now',
              escrow: { ...b.escrow, status: 'Refunded' }
            }
          : b
      )
    );
    setSelectedBooking((prev) =>
      prev?.id === bookingToCancel.id
        ? {
            ...prev,
            status: 'cancelled',
            relativeStatusTime: 'Cancelled just now',
            escrow: { ...prev.escrow, status: 'Refunded' }
          }
        : prev
    );
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
        <BookingKpiGrid kpis={MOCK_BOOKING_KPIS} />

        {/* Filter Controls */}
        <BookingsFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          kpis={MOCK_BOOKING_KPIS}
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
