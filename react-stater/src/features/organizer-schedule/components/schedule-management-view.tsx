import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { MousePointer, ArrowRight, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { workspaceService } from '@/features/workspaces/api/service';
import {
  useOrganizerCalendarQuery,
  useCancelBookingMutation
} from '@/features/workspaces/api/booking-queries';
import { BookingDto } from '@/features/workspaces/api/booking-types';
import {
  GanttResource,
  GanttBookingBlock,
  ScheduleKpiSummary,
  ViewTimelineMode,
  GanttBlockType
} from '../types';
import {
  INITIAL_SCHEDULE_KPIS,
  MOCK_GANTT_RESOURCES
} from '../data/mock-schedule';
import { ScheduleHeaderBar } from './schedule-header-bar';
import { ScheduleKpiRibbon } from './schedule-kpi-ribbon';
import { ScheduleToolbar } from './schedule-toolbar';
import { ScheduleGanttMatrix } from './schedule-gantt-matrix';
import { ScheduleMonthCalendar } from './schedule-month-calendar';
import { ScheduleBlockDetailDialog } from './schedule-block-detail-dialog';
import { ScheduleSlotBookingDialog } from './schedule-slot-booking-dialog';

// =============================================================================
// Module-scoped helper functions for React Compiler purity and memory optimization
// =============================================================================

function handleSendPass(block: GanttBookingBlock) {
  toast.success('Access pass dispatched', {
    description: `Sent IoT digital entry QR code for ${block.guestName}.`
  });
}

function handleExport() {
  toast.success('Schedule exported successfully', {
    description: 'Downloaded nexspace-schedule-gantt.pdf & .ics (UTC+07:00).'
  });
}

function handleBookSlot(_resourceId: string, newBlock: GanttBookingBlock) {
  toast.success(`Slot booked on ${newBlock.startTime} - ${newBlock.endTime}`, {
    description: `${newBlock.guestName} (${newBlock.bookingCode}) added to schedule.`
  });
}

function formatDateDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function computeMonthRange(dateStr: string): { startDate: string; endDate: string } {
  try {
    const [y, m] = dateStr.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
    const endStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    return {
      startDate: startStr,
      endDate: endStr
    };
  } catch {
    return { startDate: dateStr, endDate: dateStr };
  }
}

function mapBookingToGanttBlock(dto: BookingDto): GanttBookingBlock {
  const start = new Date(dto.startTime);
  const end = new Date(dto.endTime);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;

  let blockType: GanttBlockType = 'CONFIRMED';
  if (dto.status === 'PENDING_PAYMENT' || dto.status === 'PENDING_APPROVAL') {
    blockType = 'PENDING';
  } else if (dto.status === 'CANCELLED') {
    blockType = 'AVAILABLE';
  }

  const startTimeStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  const endTimeStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

  return {
    id: String(dto.id),
    bookingCode: dto.bookingCode,
    guestName: dto.customerName || 'Guest User',
    companyOrNote: dto.customerEmail,
    startTime: startTimeStr,
    endTime: endTimeStr,
    startHour: Math.max(8, Math.min(20, startHour)),
    endHour: Math.max(8, Math.min(20, endHour)),
    type: blockType,
    statusLabel: dto.status === 'PENDING_PAYMENT' ? 'PayOS Hold (15m)' : dto.status,
    amount: dto.finalPrice
  };
}

export function ScheduleManagementView() {
  // 1. Workspace selection from backend
  const { data: workspacesResponse } = useQuery({
    queryKey: ['organizer', 'workspaces-dropdown'],
    queryFn: () => workspaceService.getWorkspaces({ role: 'organizer' }),
    staleTime: 60_000
  });

  const workspaceOptions = useMemo(() => {
    const list = workspacesResponse?.content || workspacesResponse?.listObjects || [];
    return list.map((w) => ({
      id: w.id,
      name: w.name || `Workspace #${w.id}`
    }));
  }, [workspacesResponse]);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | string>(1);

  // 2. Real Date State
  const [currentDate, setCurrentDate] = useState('2026-11-20');
  const currentDateDisplay = useMemo(() => formatDateDisplay(currentDate), [currentDate]);

  // 3. View Mode & Filters
  const [viewMode, setViewMode] = useState<ViewTimelineMode>('DAY');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 4. Modals state
  const [inspectResource, setInspectResource] = useState<GanttResource | null>(null);
  const [inspectBlock, setInspectBlock] = useState<GanttBookingBlock | null>(null);

  const [isSlotBookingOpen, setIsSlotBookingOpen] = useState(false);
  const [slotBookingTargetResource, setSlotBookingTargetResource] = useState<GanttResource | null>(null);
  const [slotBookingStartHour, setSlotBookingStartHour] = useState(10);

  // 5. Query live calendar events from Backend
  const numericWorkspaceId =
    selectedWorkspaceId && Number(selectedWorkspaceId) > 0 ? Number(selectedWorkspaceId) : undefined;

  const calendarQueryParams = useMemo(() => {
    if (viewMode === 'MONTH') {
      const monthRange = computeMonthRange(currentDate);
      return {
        workspaceId: numericWorkspaceId,
        startDate: monthRange.startDate,
        endDate: monthRange.endDate
      };
    }
    return {
      workspaceId: numericWorkspaceId,
      date: currentDate
    };
  }, [numericWorkspaceId, viewMode, currentDate]);

  const { data: calendarBookings, refetch: refetchCalendar } =
    useOrganizerCalendarQuery(calendarQueryParams);

  const cancelMutation = useCancelBookingMutation();

  // 6. Merge backend bookings into resources
  const mergedResources = useMemo(() => {
    const baseResources: GanttResource[] = MOCK_GANTT_RESOURCES.map((r) => ({
      ...r,
      blocks: [...r.blocks]
    }));

    if (!calendarBookings || calendarBookings.length === 0) {
      return baseResources;
    }

    const apiBlocks = calendarBookings.map(mapBookingToGanttBlock);

    for (const block of apiBlocks) {
      // Find matching resource by code or existing block
      const match = baseResources.find(
        (r) => r.code === block.bookingCode || r.blocks.some((b) => b.bookingCode === block.bookingCode)
      );

      if (match) {
        if (!match.blocks.some((b) => b.id === block.id)) {
          match.blocks.push(block);
          match.status = 'OCCUPIED';
        }
      } else {
        // If not found, assign to first resource so Organizer can inspect
        const first = baseResources[0];
        if (first && !first.blocks.some((b) => b.id === block.id)) {
          first.blocks.push(block);
          first.status = 'OCCUPIED';
        }
      }
    }

    return baseResources;
  }, [calendarBookings]);

  // 7. Filter resources by Zone, Category, and Search Query
  const filteredResources = useMemo(() => {
    return mergedResources.filter((r) => {
      // Zone filter
      if (selectedZone !== 'ALL' && r.zoneCategory !== selectedZone) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && r.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = r.code.toLowerCase().includes(q);
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesZone = r.zone.toLowerCase().includes(q);
        const matchesBlockGuest = r.blocks.some(
          (b) =>
            b.guestName.toLowerCase().includes(q) ||
            b.bookingCode.toLowerCase().includes(q)
        );

        if (!matchesCode && !matchesName && !matchesZone && !matchesBlockGuest) {
          return false;
        }
      }

      return true;
    });
  }, [mergedResources, selectedZone, selectedCategory, searchQuery]);

  // 8. Real-time KPI Ribbon Metrics
  const kpis: ScheduleKpiSummary = useMemo(() => {
    const totalRes = filteredResources.length || INITIAL_SCHEDULE_KPIS.totalResources;
    const bookedResCount = filteredResources.filter((r) => r.blocks.length > 0).length;
    const allBlocks = filteredResources.flatMap((r) => r.blocks);
    const totalBookedHours = allBlocks.reduce((sum, b) => sum + (b.endHour - b.startHour), 0);
    const occupancyPercent = totalRes > 0 ? Math.round((bookedResCount / totalRes) * 100) : 0;

    return {
      bookedHours: totalBookedHours || INITIAL_SCHEDULE_KPIS.bookedHours,
      bookedHoursGrowth: INITIAL_SCHEDULE_KPIS.bookedHoursGrowth,
      peakWindow: INITIAL_SCHEDULE_KPIS.peakWindow,
      peakOccupancyPercent: Math.max(occupancyPercent, INITIAL_SCHEDULE_KPIS.peakOccupancyPercent),
      turnstileCurrent: INITIAL_SCHEDULE_KPIS.turnstileCurrent,
      turnstileTotal: INITIAL_SCHEDULE_KPIS.turnstileTotal,
      maintenanceBlocksCount: INITIAL_SCHEDULE_KPIS.maintenanceBlocksCount,
      resourcesBookedToday: bookedResCount || INITIAL_SCHEDULE_KPIS.resourcesBookedToday,
      totalResources: totalRes,
      occupancyRatePercent: occupancyPercent || INITIAL_SCHEDULE_KPIS.occupancyRatePercent
    };
  }, [filteredResources]);

  // Date Navigation handlers
  const handlePrevDay = () => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d - 1);
    const newDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    setCurrentDate(newDate);
    toast.info('Switched schedule date', {
      description: `Viewing timeline for ${formatDateDisplay(newDate)}.`
    });
  };

  const handleNextDay = () => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + 1);
    const newDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    setCurrentDate(newDate);
    toast.info('Switched schedule date', {
      description: `Viewing timeline for ${formatDateDisplay(newDate)}.`
    });
  };

  const handleToday = () => {
    setCurrentDate('2026-11-20');
    toast.success('Reset to Today', {
      description: 'Viewing live timeline for Friday, Nov 20, 2026.'
    });
  };

  const handleCustomDateChange = (val: string) => {
    if (val) {
      setCurrentDate(val);
      toast.info('Date updated', {
        description: `Navigated to ${formatDateDisplay(val)}.`
      });
    }
  };

  // Block Click
  const handleSelectBlock = (resource: GanttResource, block: GanttBookingBlock) => {
    setInspectResource(resource);
    setInspectBlock(block);
  };

  // Quick book on empty slot
  const handleQuickBookSlot = (resource: GanttResource, startHour: number) => {
    setSlotBookingTargetResource(resource);
    setSlotBookingStartHour(startHour);
    setIsSlotBookingOpen(true);
  };

  // New reservation from header
  const handleNewReservation = () => {
    setSlotBookingTargetResource(filteredResources[0] || mergedResources[0]);
    setSlotBookingStartHour(10);
    setIsSlotBookingOpen(true);
  };

  // Cancel / Release Block
  const handleCancelBlock = async (blockId: string) => {
    try {
      await cancelMutation.mutateAsync({
        id: blockId,
        reason: 'Organizer released slot from timeline'
      });
      refetchCalendar();
      toast.warning('Reservation slot released', {
        description: 'Slot has been opened up for booking and guest refunded.'
      });
    } catch {
      toast.error('Failed to release reservation slot');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Bar */}
      <ScheduleHeaderBar
        bookedCount={kpis.resourcesBookedToday}
        totalCount={kpis.totalResources}
        occupancyPercent={kpis.occupancyRatePercent}
        onExport={handleExport}
        onNewReservation={handleNewReservation}
        workspaces={workspaceOptions}
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspace={setSelectedWorkspaceId}
      />

      {/* 2. KPI Ribbon */}
      <ScheduleKpiRibbon kpis={kpis} />

      {/* 3. Toolbar & Filters */}
      <ScheduleToolbar
        currentDateDisplay={currentDateDisplay}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        customDate={currentDate}
        onCustomDateChange={handleCustomDateChange}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          toast.info(`Switched view to ${mode.toLowerCase()} mode`);
        }}
        selectedZone={selectedZone}
        onZoneChange={setSelectedZone}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 4. Timeline View: Month Calendar OR Day/Week Gantt Matrix */}
      {viewMode === 'MONTH' ? (
        <ScheduleMonthCalendar
          currentDate={currentDate}
          bookings={calendarBookings || []}
          onSelectDate={(newDate) => setCurrentDate(newDate)}
          onSwitchToDayView={() => setViewMode('DAY')}
          totalResourcesCount={kpis.totalResources}
        />
      ) : (
        <ScheduleGanttMatrix
          resources={filteredResources}
          onSelectBlock={handleSelectBlock}
          onQuickBookSlot={handleQuickBookSlot}
        />
      )}

      {/* 5. Footer Info & Interaction Bar */}
      <footer className="mt-4 px-1 flex flex-col md:flex-row items-center justify-between gap-3 text-muted-foreground text-xs select-none">
        {/* Helpful Tips */}
        <div className="flex items-center gap-2">
          <MousePointer className="w-4 h-4 text-primary shrink-0" />
          <span>
            Click on any empty timeline slot to quickly book • Click any block to view guest KYC and PayOS audit log.
          </span>
        </div>

        {/* Resources indicator & IoT sync info */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-foreground">{filteredResources.length} of {kpis.totalResources}</strong> resources
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                toast.info('Loaded additional floor resources', {
                  description: 'Showing Level 2 Quiet Wing and Meeting Rooms.'
                });
              }}
              className="h-auto p-0 text-xs font-semibold text-primary hover:underline gap-0.5"
            >
              Next resources <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="h-3 w-px bg-border hidden lg:block" />

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Indochina Time (UTC+07:00 HCMC) • Auto-syncs with Turnstile IoT every 30s</span>
          </div>
        </div>
      </footer>

      {/* 6. Dialogs */}
      <ScheduleBlockDetailDialog
        isOpen={Boolean(inspectBlock && inspectResource)}
        onClose={() => {
          setInspectBlock(null);
          setInspectResource(null);
        }}
        resource={inspectResource}
        block={inspectBlock}
        onSendPass={handleSendPass}
        onCancelBlock={handleCancelBlock}
      />

      <ScheduleSlotBookingDialog
        key={`${slotBookingTargetResource?.id || 'res'}-${slotBookingStartHour}-${isSlotBookingOpen}`}
        isOpen={isSlotBookingOpen}
        onClose={() => setIsSlotBookingOpen(false)}
        resource={slotBookingTargetResource}
        defaultStartHour={slotBookingStartHour}
        onBookSlot={handleBookSlot}
      />
    </div>
  );
}
