import React, { useState, useCallback } from 'react';
import { WorkspaceHeader } from './workspace-header';
import { WorkspaceFilterBar } from './workspace-filter-bar';
import { WorkspaceList } from './workspace-list';
import { WorkspaceMap } from './workspace-map';
import { useCurrentLocation } from '../hooks/use-current-location';
import type { PublicWorkspaceSummary } from '../api/types';

export function WorkspacesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [workspaces, setWorkspaces] = useState<PublicWorkspaceSummary[]>([]);

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
      <WorkspaceHeader />
      <WorkspaceFilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        totalCount={totalCount}
        isNearMeActive={isNearMeActive}
        onToggleNearMe={handleToggleNearMe}
        radiusKm={radiusKm}
        onRadiusKmChange={setRadiusKm}
        isLocating={isLocating}
      />

      {/* Main Body: 50/50 Split View */}
      <main className="flex w-full flex-1 overflow-hidden">
        <WorkspaceList
          search={search}
          category={category}
          onTotalCountChange={setTotalCount}
          onWorkspacesLoaded={handleWorkspacesLoaded}
          isNearMeActive={isNearMeActive}
          nearMeCoords={userLocation}
          radiusKm={radiusKm}
          onClearNearMe={() => setIsNearMeActive(false)}
          onHoverWorkspace={setHoveredWorkspaceId}
          hoveredWorkspaceId={hoveredWorkspaceId}
        />
        <WorkspaceMap
          workspaces={workspaces}
          userLocation={userLocation}
          selectedWorkspaceId={hoveredWorkspaceId}
          onWorkspaceSelect={setHoveredWorkspaceId}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
        />
      </main>
    </div>
  );
}
