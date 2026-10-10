import { useState, useMemo } from 'react';
import { WorkspaceHeader } from '../workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { SeatsHeader } from './seats-header';
import { SeatsFilterBar, type ScheduleInfo } from './seats-filter-bar';
import { SeatsList } from './seats-list';
import { SeatsFloorPlan } from './seats-floor-plan';
import { SeatsReassuranceBar } from './seats-reassurance-bar';
import { seatsData } from '../../constants/seats-data';
import type { SeatCategory } from '../../types/seat';

export function SeatsPage() {
  const [selectedCategory, setSelectedCategory] = useState<SeatCategory>('all');
  const [viewMode, setViewMode] = useState<'list' | 'floor'>('list');
  const [schedule, setSchedule] = useState<ScheduleInfo>({
    date: 'Jan 25, 2026',
    day: 25,
    startTime: '09:00 AM',
    endTime: '01:00 PM',
    durationHours: 4
  });

  // Filter items based on selected category
  const filteredSeats = useMemo(() => {
    if (selectedCategory === 'all') return seatsData;
    return seatsData.filter((seat) => seat.category === selectedCategory);
  }, [selectedCategory]);

  // Compute category count breakdown
  const counts = useMemo(() => {
    return {
      all: seatsData.length,
      hot_desk: seatsData.filter((s) => s.category === 'hot_desk').length,
      dedicated_desk: seatsData.filter((s) => s.category === 'dedicated_desk').length,
      meeting_pod: seatsData.filter((s) => s.category === 'meeting_pod').length
    };
  }, []);

  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20'>
      {/* Top Header */}
      <WorkspaceHeader />

      {/* Main Workspace Canvas (1200px strict container discipline) */}
      <main className='mx-auto w-full max-w-[1200px] flex-1 space-y-6 px-6 py-6 lg:px-8'>
        {/* Header Breadcrumbs & Live Availability Badge */}
        <SeatsHeader totalCount={filteredSeats.length} />

        {/* Filter Bar with Date Picker & Category Chips & View Switcher */}
        <SeatsFilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          viewMode={viewMode}
          onToggleView={setViewMode}
          counts={counts}
          schedule={schedule}
          onScheduleChange={setSchedule}
        />

        {/* Content View: List View vs 2D Floor Plan */}
        {viewMode === 'list' ? (
          <SeatsList seats={filteredSeats} />
        ) : (
          <SeatsFloorPlan seats={filteredSeats} />
        )}

        {/* Reassurance Bar */}
        <SeatsReassuranceBar />
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
