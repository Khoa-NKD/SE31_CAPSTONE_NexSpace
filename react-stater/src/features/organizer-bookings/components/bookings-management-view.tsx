import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import {
  BookingItem,
  BookingStatus,
  BookingResourceType,
  BookingsKpiSummary
} from '../types';
import {
  MOCK_BOOKINGS_LEDGER,
  MOCK_BOOKINGS_KPI
} from '../data/mock-bookings';
import { BookingsHeaderBar } from './bookings-header-bar';
import { BookingsKpiRibbon } from './bookings-kpi-ribbon';
import { BookingsFilterBar } from './bookings-filter-bar';
import { BookingsTable } from './bookings-table';
import { BookingsPagination } from './bookings-pagination';
import { BookingDetailDialog } from './booking-detail-dialog';
import { ManualReservationDialog } from './manual-reservation-dialog';

function exportBookingsToCsv(bookings: BookingItem[]) {
  const headers = [
    'Booking Code',
    'Customer Name',
    'Customer Email',
    'Phone',
    'Resource',
    'Category',
    'Zone',
    'Date',
    'Window',
    'Duration (hrs)',
    'Amount ($)',
    'Gateway',
    'Status',
    'Check-In State',
    'Created At'
  ];

  const rows = bookings.map((b) => [
    b.bookingCode,
    `"${b.customerName}"`,
    b.customerEmail,
    b.customerPhone || '',
    `"${b.resourceName}"`,
    b.resourceCategory,
    `"${b.resourceZone}"`,
    b.reservedDate,
    `"${b.reservedTimeWindow}"`,
    b.durationHours,
    b.amount,
    b.paymentGatewayLabel || b.paymentGateway,
    b.status,
    b.checkInState,
    `"${b.createdAt}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `nexspace-bookings-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleSendReminder(booking: BookingItem) {
  toast.success('Access pass sent successfully', {
    description: `Emailed digital entry pass & QR code to ${booking.customerEmail}.`
  });
}

export function BookingsManagementView() {
  const [bookings, setBookings] = useState<BookingItem[]>(MOCK_BOOKINGS_LEDGER);
  const [kpis, setKpis] = useState<BookingsKpiSummary>(MOCK_BOOKINGS_KPI);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('This Week (Jan 20 - Jan 27, 2026)');
  const [resourceType, setResourceType] = useState<'ALL' | BookingResourceType>('ALL');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | BookingStatus>('ALL');

  // Multi-selection & Pagination
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Real-time Sync
  const [activeDetailBooking, setActiveDetailBooking] = useState<BookingItem | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('10:42 AM');
  const [isSyncing, setIsSyncing] = useState(false);

  // Calculate Status counts dynamically based on current base filters
  const statusCounts = useMemo(() => {
    return {
      all: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
      pending: bookings.filter((b) => b.status === 'PENDING_PAYMENT').length,
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').length
    };
  }, [bookings]);

  // Filtered dataset
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Status Tab filter
      if (selectedStatusTab !== 'ALL' && b.status !== selectedStatusTab) {
        return false;
      }

      // Resource Type filter
      if (resourceType !== 'ALL' && b.resourceCategory !== resourceType) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          b.bookingCode.toLowerCase().includes(query) ||
          b.id.toLowerCase().includes(query) ||
          b.customerName.toLowerCase().includes(query) ||
          b.customerEmail.toLowerCase().includes(query) ||
          b.resourceName.toLowerCase().includes(query) ||
          b.resourceZone.toLowerCase().includes(query);

        if (!matchesQuery) return false;
      }

      // Date Range filter (mock evaluation)
      if (dateFilter === 'Today' && !b.reservedDate.includes('Jan 25')) {
        return false;
      }

      return true;
    });
  }, [bookings, selectedStatusTab, resourceType, searchQuery, dateFilter]);

  // Paginated dataset
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredBookings.slice(startIndex, startIndex + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  // Multi-selection handlers
  const handleToggleSelectAll = () => {
    const currentPageIds = paginatedBookings.map((b) => b.id);
    const areAllCurrentSelected = currentPageIds.every((id) => selectedIds.includes(id));

    if (areAllCurrentSelected) {
      // Unselect current page
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      // Select all in current page
      const newSelection = Array.from(new Set([...selectedIds, ...currentPageIds]));
      setSelectedIds(newSelection);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Actions
  const handleViewDetails = (booking: BookingItem) => {
    setActiveDetailBooking(booking);
  };

  const handleCancelBooking = (id: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'CANCELLED' as BookingStatus,
              statusReason: 'Organizer manual cancellation & refund',
              checkInState: 'RELEASED' as const
            }
          : b
      )
    );

    // Update KPI counters
    setKpis((prev) => ({
      ...prev,
      confirmedCount: Math.max(0, prev.confirmedCount - 1),
      cancelledCount: prev.cancelledCount + 1
    }));

    if (activeDetailBooking && activeDetailBooking.id === id) {
      setActiveDetailBooking((prev) =>
        prev
          ? {
              ...prev,
              status: 'CANCELLED',
              statusReason: 'Organizer manual cancellation & refund',
              checkInState: 'RELEASED'
            }
          : null
      );
    }

    toast.warning(`Reservation ${id} cancelled`, {
      description: 'Customer notification dispatched and PayOS refund sequence queued.'
    });
  };

  const handleCheckInToggle = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const nextState = b.checkInState === 'CHECKED_IN' ? 'CHECKED_OUT' : 'CHECKED_IN';
          const checkInTime = nextState === 'CHECKED_IN' ? 'Just now' : b.checkInTime;
          return { ...b, checkInState: nextState, checkInTime };
        }
        return b;
      })
    );

    if (activeDetailBooking && activeDetailBooking.id === id) {
      setActiveDetailBooking((prev) => {
        if (!prev) return null;
        const nextState = prev.checkInState === 'CHECKED_IN' ? 'CHECKED_OUT' : 'CHECKED_IN';
        return { ...prev, checkInState: nextState, checkInTime: 'Just now' };
      });
    }

    toast.info('Turnstile state updated', {
      description: `Access gate override applied for booking ${id}.`
    });
  };

  const handleExportCsv = () => {
    const targetBookings = selectedIds.length > 0
      ? bookings.filter((b) => selectedIds.includes(b.id))
      : filteredBookings;

    if (targetBookings.length === 0) {
      toast.error('No reservations to export');
      return;
    }

    exportBookingsToCsv(targetBookings);
    toast.success(`Exported ${targetBookings.length} reservations to CSV`, {
      description: 'Downloaded nexspace-bookings.csv with complete PayOS audit headers.'
    });
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(timeStr);
      setIsSyncing(false);
      toast.success('Live PayOS Webhook synchronized', {
        description: `All transactions and turnstile IoT nodes verified at ${timeStr}.`
      });
    }, 600);
  };

  const handleCreateManualBooking = (newBooking: BookingItem) => {
    setBookings((prev) => [newBooking, ...prev]);
    setKpis((prev) => ({
      ...prev,
      totalReservations: prev.totalReservations + 1,
      confirmedCount: prev.confirmedCount + 1,
      confirmedVolume: prev.confirmedVolume + newBooking.amount
    }));

    toast.success(`Walk-in booked: ${newBooking.bookingCode}`, {
      description: `Confirmed for ${newBooking.customerName} on ${newBooking.resourceName}.`
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatusTab('ALL');
    setResourceType('ALL');
    setDateFilter('This Week (Jan 20 - Jan 27, 2026)');
    setCurrentPage(1);
    toast.info('Filters reset', {
      description: 'Showing all active reservations.'
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Bar with Actions */}
      <BookingsHeaderBar
        lastSyncTime={lastSyncTime}
        onExportCsv={handleExportCsv}
        onManualReservation={() => setIsManualModalOpen(true)}
        onSync={handleSync}
      />

      {/* 2. KPI Metrics Ribbon */}
      <BookingsKpiRibbon kpis={kpis} />

      {/* 3. Filter Bar & Search */}
      <div className="space-y-4">
        <BookingsFilterBar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          statusFilter={selectedStatusTab}
          onStatusFilterChange={(val) => {
            setSelectedStatusTab(val);
            setCurrentPage(1);
          }}
          resourceCategoryFilter={resourceType}
          onResourceCategoryChange={(val) => {
            setResourceType(val);
            setCurrentPage(1);
          }}
          dateRangeLabel={dateFilter}
          onDateRangeChange={(val) => {
            setDateFilter(val);
            setCurrentPage(1);
          }}
          totalCount={statusCounts.all}
          confirmedCount={statusCounts.confirmed}
          pendingCount={statusCounts.pending}
          cancelledCount={statusCounts.cancelled}
          onResetFilters={handleResetFilters}
        />

        {/* 4. Main Reservations Data Table */}
        <BookingsTable
          bookings={paginatedBookings}
          selectedIds={selectedIds}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelectRow={handleToggleSelectRow}
          onViewDetails={handleViewDetails}
          onSendReminder={handleSendReminder}
          onCancelBooking={handleCancelBooking}
        />

        {/* 5. Pagination Bar */}
        <BookingsPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredBookings.length}
          selectedCount={selectedIds.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* 6. PayOS Gateway & IoT Turnstile Security Ribbon */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-muted/30 border border-border/80 rounded-xl text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            PayOS Webhook Gateway status: <strong className="text-foreground">99.98% delivery rate</strong> • Encrypted PCI-DSS Level 1 compliant
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-foreground">Turnstile IoT Nodes Active</span>
          </div>

          <div className="h-3 w-px bg-border" />

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Ping Gateway'}
          </button>
        </div>
      </footer>

      {/* 7. Dialogs */}
      <BookingDetailDialog
        booking={activeDetailBooking}
        isOpen={!!activeDetailBooking}
        onClose={() => setActiveDetailBooking(null)}
        onSendReminder={handleSendReminder}
        onCancelBooking={handleCancelBooking}
        onCheckInToggle={handleCheckInToggle}
      />

      <ManualReservationDialog
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onCreateBooking={handleCreateManualBooking}
      />
    </div>
  );
}

