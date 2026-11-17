import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  BlockoutMetrics,
  BlockoutEvent,
  CalendarViewMode
} from '../types';
import {
  INITIAL_BLOCKOUT_METRICS,
  AVAILABLE_TARGET_RESOURCES,
  INITIAL_CALENDAR_EVENTS,
  UPCOMING_SCHEDULED_BLOCKS
} from '../data/mock-blockout';
import { BlockoutHeaderBar } from './blockout-header-bar';
import { BlockoutCalendarMatrix } from './blockout-calendar-matrix';
import { BlockoutCreationForm } from './blockout-creation-form';
import { BlockoutScheduledList, ScheduledBlockItem } from './blockout-scheduled-list';

function handleExportSchedule() {
  toast.success('Schedule exported successfully', {
    description: 'Downloaded weekly-blockout-schedule.ics (UTC+07:00).'
  });
}

function handleViewHistory() {
  toast.info('Viewing full blockout history', {
    description: 'Showing 28 past maintenance logs and completed enterprise holds.'
  });
}

function handleSlotClick(slot: BlockoutEvent) {
  toast(`Selected: ${slot.title}`, {
    description: `${slot.resourceName} • ${slot.startTimeDisplay} - ${slot.endTimeDisplay} (${slot.type.replace('_', ' ')})`
  });
}

export function BlockoutManagementView() {
  const [metrics, setMetrics] = useState<BlockoutMetrics>(INITIAL_BLOCKOUT_METRICS);
  const [events, setEvents] = useState<BlockoutEvent[]>(INITIAL_CALENDAR_EVENTS);
  const [scheduledBlocks, setScheduledBlocks] = useState<ScheduledBlockItem[]>(
    UPCOMING_SCHEDULED_BLOCKS.map((b) => ({
      ...b,
      reasonType: b.reasonType as 'MAINTENANCE' | 'EVENT' | 'NETWORK'
    }))
  );

  const [selectedResourceId, setSelectedResourceId] = useState<string>('res-meet-c01');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');

  // Submit new blockout from creation form
  const handleSubmitBlockout = (newEventData: Omit<BlockoutEvent, 'id'>) => {
    const newId = `evt-${Date.now()}`;
    const newEvent: BlockoutEvent = {
      ...newEventData,
      id: newId
    };

    setEvents((prev) => [...prev, newEvent]);

    const newBlockItem: ScheduledBlockItem = {
      id: `block-${Date.now()}`,
      title: `${newEvent.title} (${newEvent.resourceName})`,
      resourceName: `${newEvent.resourceName} — ${newEvent.floor}`,
      dateDisplay: newEvent.dateDisplay,
      timeRangeDisplay: `${newEvent.startTimeDisplay} - ${newEvent.endTimeDisplay} (${newEvent.durationHours}h)`,
      reasonType: newEvent.type === 'PRIVATE_EVENT' ? 'EVENT' : 'MAINTENANCE',
      iconType: newEvent.type === 'PRIVATE_EVENT' ? 'lock' : 'build'
    };

    setScheduledBlocks((prev) => [newBlockItem, ...prev]);

    setMetrics((prev) => ({
      ...prev,
      activeBlocksCount: prev.activeBlocksCount + 1,
      activeBlocksHours: prev.activeBlocksHours + newEvent.durationHours
    }));

    toast.success('Time slot blocked successfully!', {
      description: `${newEvent.resourceName} is locked from ${newEvent.startTimeDisplay} to ${newEvent.endTimeDisplay}.`
    });
  };

  // Unblock a slot
  const handleUnblock = (blockId: string) => {
    const item = scheduledBlocks.find((b) => b.id === blockId);
    setScheduledBlocks((prev) => prev.filter((b) => b.id !== blockId));

    setMetrics((prev) => ({
      ...prev,
      activeBlocksCount: Math.max(0, prev.activeBlocksCount - 1)
    }));

    toast.info(`Unblocked: ${item?.title || 'Time slot'} is now open for booking.`);
  };

  // Filter events according to selected resource dropdown
  const filteredEvents =
    selectedResourceId === 'ALL'
      ? events
      : events.filter((e) => e.resourceId === selectedResourceId);

  return (
    <div className="max-w-[1440px] w-full mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Bar with Breadcrumb and 3 KPI Indicator Cards */}
      <BlockoutHeaderBar metrics={metrics} />

      {/* 2. 2-Column Split Workspace (60% Left, 40% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: Weekly Calendar Matrix (7 Cols of 12) ================= */}
        <div className="lg:col-span-7 xl:col-span-7">
          <BlockoutCalendarMatrix
            events={filteredEvents}
            selectedResourceId={selectedResourceId}
            onSelectResource={setSelectedResourceId}
            availableResources={AVAILABLE_TARGET_RESOURCES}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExportSchedule={handleExportSchedule}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* ================= RIGHT COLUMN: Form & Scheduled Blocks (5 Cols of 12) ================= */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-6">
          {/* Card 1: Blockout Configuration Form */}
          <BlockoutCreationForm
            availableResources={AVAILABLE_TARGET_RESOURCES}
            onSubmitBlockout={handleSubmitBlockout}
          />

          {/* Card 2: Upcoming Scheduled Blocks */}
          <BlockoutScheduledList
            scheduledBlocks={scheduledBlocks}
            onUnblock={handleUnblock}
            onViewHistory={handleViewHistory}
          />
        </div>
      </div>
    </div>
  );
}
