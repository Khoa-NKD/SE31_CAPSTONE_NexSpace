import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { MousePointer, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  GanttResource,
  GanttBookingBlock,
  ScheduleKpiSummary,
  ViewTimelineMode
} from '../types';
import {
  INITIAL_SCHEDULE_KPIS,
  MOCK_GANTT_RESOURCES
} from '../data/mock-schedule';
import { ScheduleHeaderBar } from './schedule-header-bar';
import { ScheduleKpiRibbon } from './schedule-kpi-ribbon';
import { ScheduleToolbar } from './schedule-toolbar';
import { ScheduleGanttMatrix } from './schedule-gantt-matrix';
import { ScheduleBlockDetailDialog } from './schedule-block-detail-dialog';
import { ScheduleSlotBookingDialog } from './schedule-slot-booking-dialog';

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

export function ScheduleManagementView() {
  const [resources, setResources] = useState<GanttResource[]>(MOCK_GANTT_RESOURCES);
  const [kpis, setKpis] = useState<ScheduleKpiSummary>(INITIAL_SCHEDULE_KPIS);

  // Date Navigation State
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const DATES = [
    'Friday, Jan 24, 2026',
    'Saturday, Jan 25, 2026',
    'Sunday, Jan 26, 2026',
    'Monday, Jan 27, 2026'
  ];
  const currentDateDisplay = DATES[currentDateIndex] || 'Friday, Jan 24, 2026';

  // Toolbar View & Filters
  const [viewMode, setViewMode] = useState<ViewTimelineMode>('DAY');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [inspectResource, setInspectResource] = useState<GanttResource | null>(null);
  const [inspectBlock, setInspectBlock] = useState<GanttBookingBlock | null>(null);

  const [isSlotBookingOpen, setIsSlotBookingOpen] = useState(false);
  const [slotBookingTargetResource, setSlotBookingTargetResource] = useState<GanttResource | null>(null);
  const [slotBookingStartHour, setSlotBookingStartHour] = useState(10);

  // Filtered resources list
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
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
  }, [resources, selectedZone, selectedCategory, searchQuery]);

  // Date handlers
  const handlePrevDay = () => {
    setCurrentDateIndex((prev) => Math.max(0, prev - 1));
    toast.info('Switched schedule date', {
      description: `Viewing timeline for ${DATES[Math.max(0, currentDateIndex - 1)]}.`
    });
  };

  const handleNextDay = () => {
    setCurrentDateIndex((prev) => Math.min(DATES.length - 1, prev + 1));
    toast.info('Switched schedule date', {
      description: `Viewing timeline for ${DATES[Math.min(DATES.length - 1, currentDateIndex + 1)]}.`
    });
  };

  const handleToday = () => {
    setCurrentDateIndex(0);
    toast.success('Reset to Today', {
      description: 'Viewing live timeline for Friday, Jan 24, 2026.'
    });
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
    setSlotBookingTargetResource(filteredResources[0] || resources[0]);
    setSlotBookingStartHour(10);
    setIsSlotBookingOpen(true);
  };

  // Submit slot booking
  const handleBookSlot = (resourceId: string, newBlock: GanttBookingBlock) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === resourceId) {
          return {
            ...r,
            status: 'OCCUPIED',
            blocks: [...r.blocks, newBlock]
          };
        }
        return r;
      })
    );

    // Update KPI
    const duration = newBlock.endHour - newBlock.startHour;
    setKpis((prev) => ({
      ...prev,
      bookedHours: Number((prev.bookedHours + duration).toFixed(1)),
      resourcesBookedToday: Math.min(prev.totalResources, prev.resourcesBookedToday + 1)
    }));

    toast.success(`Slot booked on ${newBlock.startTime} - ${newBlock.endTime}`, {
      description: `${newBlock.guestName} (${newBlock.bookingCode}) added to schedule.`
    });
  };

  // Cancel / Release Block
  const handleCancelBlock = (blockId: string) => {
    setResources((prev) =>
      prev.map((r) => ({
        ...r,
        blocks: r.blocks.filter((b) => b.id !== blockId)
      }))
    );

    toast.warning('Reservation slot released', {
      description: `Slot has been opened up for booking and guest refunded.`
    });
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
      />

      {/* 2. KPI Ribbon */}
      <ScheduleKpiRibbon kpis={kpis} />

      {/* 3. Toolbar & Filters */}
      <ScheduleToolbar
        currentDateDisplay={currentDateDisplay}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
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

      {/* 4. Gantt Timeline Matrix */}
      <ScheduleGanttMatrix
        resources={filteredResources}
        onSelectBlock={handleSelectBlock}
        onQuickBookSlot={handleQuickBookSlot}
      />

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
