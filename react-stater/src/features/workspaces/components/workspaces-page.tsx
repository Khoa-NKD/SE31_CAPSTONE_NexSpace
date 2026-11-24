import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Map, List } from '@/components/ui/hugeicons';
import { WorkspaceHeader } from './workspace-header';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { WorkspaceList } from './workspace-list';
import { WorkspaceMap } from './workspace-map';
import { useCurrentLocation } from '../hooks/use-current-location';
import type { PublicWorkspaceSummary } from '../api/types';
import type { AdvancedFilterValues } from './workspace-advanced-filter-modal';
import type { ScheduleSelection } from './detail/date-time-picker-modal';
import { parseTimeToMinutes } from './detail/date-time-picker-modal';

const INITIAL_ADVANCED_FILTERS: AdvancedFilterValues = {
  city: undefined,
  district: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  amenityIds: [],
  seatTypes: [],
  minRating: undefined
};

export function WorkspacesPage() {
  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('search') || '';
  });
  const [category, setCategory] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('category') || '';
  });
  const [schedule, setSchedule] = useState<ScheduleSelection | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const date = params.get('date');
    const startTime = params.get('startTime');
    const endTime = params.get('endTime');
    const isoStartTime = params.get('isoStartTime');
    const isoEndTime = params.get('isoEndTime');
    if (date && startTime && endTime) {
      let durationHours = 1;
      try {
        const startM = parseTimeToMinutes(startTime);
        const endM = parseTimeToMinutes(endTime);
        const diffM = endM > startM ? endM - startM : endM + 1440 - startM;
        durationHours = Math.max(1, Math.round((diffM / 60) * 10) / 10);
      } catch {
        durationHours = 1;
      }
      if (!Number.isFinite(durationHours) || durationHours <= 0) {
        durationHours = 1;
      }
      return {
        date,
        day: 1,
        startTime,
        endTime,
        durationHours,
        isoDate: date,
        isoStartTime: isoStartTime || undefined,
        isoEndTime: isoEndTime || undefined
      };
    }
    return null;
  });
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [workspaces, setWorkspaces] = useState<PublicWorkspaceSummary[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>(INITIAL_ADVANCED_FILTERS);

  // Desktop View Mode ('split' = 54/46 split, 'grid' = full-width list)
  const [viewMode, setViewMode] = useState<'split' | 'grid'>('split');

  // Mobile / Tablet View Switch ('list' | 'map')
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  // URL Query Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (search.trim()) {
      url.searchParams.set('search', search.trim());
    } else {
      url.searchParams.delete('search');
    }
    if (category) {
      url.searchParams.set('category', category);
    } else {
      url.searchParams.delete('category');
    }
    if (schedule?.date) {
      url.searchParams.set('date', schedule.date);
    } else {
      url.searchParams.delete('date');
    }
    if (schedule?.startTime) {
      url.searchParams.set('startTime', schedule.startTime);
    } else {
      url.searchParams.delete('startTime');
    }
    if (schedule?.endTime) {
      url.searchParams.set('endTime', schedule.endTime);
    } else {
      url.searchParams.delete('endTime');
    }
    if (schedule?.isoStartTime) {
      url.searchParams.set('isoStartTime', schedule.isoStartTime);
    } else {
      url.searchParams.delete('isoStartTime');
    }
    if (schedule?.isoEndTime) {
      url.searchParams.set('isoEndTime', schedule.isoEndTime);
    } else {
      url.searchParams.delete('isoEndTime');
    }
    window.history.replaceState({}, '', url.toString());
  }, [search, category, schedule]);

  const handleWorkspacesLoaded = useCallback((loaded: PublicWorkspaceSummary[]) => {
    setWorkspaces((prev) => {
      if (
        prev.length === loaded.length &&
        prev.every((w, i) => w.id === loaded[i]?.id)
      ) {
        return prev;
      }
      return loaded;
    });
  }, []);

  // Map seat types ('hot_desk', 'dedicated_desk', 'meeting_room', 'private_office') to backend categories ('DESK', 'ROOM')
  const resourceCategories = useMemo(() => {
    if (!advancedFilters.seatTypes || advancedFilters.seatTypes.length === 0) {
      return undefined;
    }
    const cats = new Set<string>();
    advancedFilters.seatTypes.forEach((t) => {
      if (t === 'hot_desk' || t === 'dedicated_desk') cats.add('DESK');
      if (t === 'meeting_room' || t === 'private_office') cats.add('ROOM');
    });
    return Array.from(cats);
  }, [advancedFilters.seatTypes]);

  const handleResetAdvancedFilters = useCallback(() => {
    setAdvancedFilters(INITIAL_ADVANCED_FILTERS);
  }, []);

  // Geolocation & Proximity State
  const {
    location: userLocation,
    isLoading: isLocating,
    getCurrentLocation
  } = useCurrentLocation();

  const [isNearMeActive, setIsNearMeActive] = useState<boolean>(false);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [hoveredWorkspaceId, setHoveredWorkspaceId] = useState<string | null>(null);

  const handleToggleNearMe = useCallback(async () => {
    if (isNearMeActive) {
      setIsNearMeActive(false);
    } else {
      setIsNearMeActive(true);
      if (!userLocation) {
        await getCurrentLocation();
      }
    }
  }, [isNearMeActive, userLocation, getCurrentLocation]);

  const handleLocateMe = useCallback(async () => {
    setIsNearMeActive(true);
    await getCurrentLocation();
  }, [getCurrentLocation]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Global Header */}
      <WorkspaceHeader />

      {/* Unified Compact Search & Filter Toolbar */}
      <WorkspaceFilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        schedule={schedule}
        onScheduleChange={setSchedule}
        totalCount={totalCount}
        isNearMeActive={isNearMeActive}
        onToggleNearMe={handleToggleNearMe}
        radiusKm={radiusKm}
        onRadiusKmChange={setRadiusKm}
        isLocating={isLocating}
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
        onResetAdvancedFilters={handleResetAdvancedFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Split Explorer Canvas */}
      <main className="relative flex w-full flex-1 overflow-hidden">
        {/* Left Side: Workspace Results (~54% on desktop) */}
        <div
          className={`h-full overflow-hidden transition-all duration-300 ${
            viewMode === 'grid'
              ? 'w-full'
              : 'w-full lg:w-[54%] lg:border-r lg:border-border/60'
          } ${mobileTab === 'list' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}
        >
          <WorkspaceList
            search={search}
            category={category}
            city={advancedFilters.city}
            district={advancedFilters.district}
            minPrice={advancedFilters.minPrice}
            maxPrice={advancedFilters.maxPrice}
            amenityIds={advancedFilters.amenityIds}
            resourceCategories={resourceCategories}
            minRating={advancedFilters.minRating}
            startTime={schedule?.isoStartTime}
            endTime={schedule?.isoEndTime}
            onTotalCountChange={setTotalCount}
            onWorkspacesLoaded={handleWorkspacesLoaded}
            isNearMeActive={isNearMeActive}
            nearMeCoords={userLocation}
            radiusKm={radiusKm}
            onClearNearMe={() => setIsNearMeActive(false)}
            onHoverWorkspace={setHoveredWorkspaceId}
            hoveredWorkspaceId={hoveredWorkspaceId}
          />
        </div>

        {/* Right Side: Interactive Goong Map (~46% on desktop) */}
        {viewMode === 'split' && (
          <div
            className={`h-full relative overflow-hidden lg:w-[46%] ${
              mobileTab === 'map' ? 'block w-full' : 'hidden lg:block'
            }`}
          >
            <WorkspaceMap
              workspaces={workspaces}
              userLocation={userLocation}
              selectedWorkspaceId={hoveredWorkspaceId}
              onWorkspaceSelect={setHoveredWorkspaceId}
              onLocateMe={handleLocateMe}
              isLocating={isLocating}
            />
          </div>
        )}

        {/* Mobile / Tablet Floating List <-> Map Toggle Button */}
        {viewMode === 'split' && (
          <div
            className={`fixed left-1/2 -translate-x-1/2 z-40 lg:hidden transition-all duration-200 ${
              mobileTab === 'map' && Boolean(hoveredWorkspaceId) ? 'bottom-28' : 'bottom-6'
            }`}
          >
            <button
              type="button"
              onClick={() => setMobileTab((curr) => (curr === 'list' ? 'map' : 'list'))}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {mobileTab === 'list' ? (
                <>
                  <Map className="h-4 w-4" />
                  <span>Xem bản đồ</span>
                </>
              ) : (
                <>
                  <List className="h-4 w-4" />
                  <span>Xem danh sách</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
