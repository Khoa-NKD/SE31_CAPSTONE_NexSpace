import React from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Building2,
  Navigation
} from 'lucide-react';
import { WorkspaceCard } from './workspace-card';
import { usePublicWorkspacesQuery, useNearbyWorkspacesQuery } from '../api/queries';
import type { PublicWorkspaceSummary } from '../api/types';
import { Button } from '@/components/ui/button';

interface WorkspaceListProps {
  search?: string;
  category?: string;
  sortBy?: 'featuredPosition' | 'pricePerHour' | 'rating' | 'name' | 'popular' | string;
  sortOrder?: 'asc' | 'desc';
  onTotalCountChange?: (count: number) => void;
  onWorkspacesLoaded?: (workspaces: PublicWorkspaceSummary[]) => void;
  // Geolocation & Near Me
  isNearMeActive?: boolean;
  nearMeCoords?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onClearNearMe?: () => void;
  onHoverWorkspace?: (id: string | null) => void;
  hoveredWorkspaceId?: string | null;
}

export function WorkspaceList({
  search,
  category,
  sortBy,
  sortOrder,
  onTotalCountChange,
  onWorkspacesLoaded,
  isNearMeActive = false,
  nearMeCoords = null,
  radiusKm = 10,
  onClearNearMe,
  onHoverWorkspace,
  hoveredWorkspaceId
}: WorkspaceListProps) {
  const [internalSortBy, setInternalSortBy] = React.useState<string>('featuredPosition');
  const [internalSortOrder, setInternalSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(1);
  const limit = 6;

  const activeSortBy = sortBy || internalSortBy;
  const activeSortOrder = sortOrder || internalSortOrder;

  const isNearbyEnabled = Boolean(isNearMeActive && nearMeCoords?.lat && nearMeCoords?.lng);

  // Reset pagination to page 1 whenever search, category, or sorting changes
  const [prevFilterState, setPrevFilterState] = React.useState({
    search,
    category,
    activeSortBy,
    activeSortOrder,
    isNearbyEnabled,
    radiusKm
  });
  if (
    prevFilterState.search !== search ||
    prevFilterState.category !== category ||
    prevFilterState.activeSortBy !== activeSortBy ||
    prevFilterState.activeSortOrder !== activeSortOrder ||
    prevFilterState.isNearbyEnabled !== isNearbyEnabled ||
    prevFilterState.radiusKm !== radiusKm
  ) {
    setPrevFilterState({ search, category, activeSortBy, activeSortOrder, isNearbyEnabled, radiusKm });
    setPage(1);
  }

  const publicQuery = usePublicWorkspacesQuery(
    {
      search: search?.trim() || undefined,
      category: category || undefined,
      sortBy: activeSortBy,
      sortOrder: activeSortOrder,
      page,
      limit
    }
  );

  const nearbyQuery = useNearbyWorkspacesQuery(
    {
      lat: nearMeCoords?.lat ?? 0,
      lng: nearMeCoords?.lng ?? 0,
      radiusKm: radiusKm ?? 10.0,
      page,
      limit
    },
    { enabled: isNearbyEnabled }
  );

  const activeQuery = isNearbyEnabled ? nearbyQuery : publicQuery;
  const { data, isLoading, isError, error, refetch, isFetching } = activeQuery;

  const workspaces = React.useMemo(() => {
    const rawDataObj = data as (Record<string, unknown> & typeof data) | undefined;
    const rawList = (rawDataObj?.listObjects as PublicWorkspaceSummary[] | undefined) ?? data?.content;
    return rawList || [];
  }, [data]);

  const rawData = data as (Record<string, unknown> & typeof data) | undefined;
  const totalElements =
    (typeof rawData?.totalElements === 'number' ? rawData.totalElements : undefined) ??
    (typeof rawData?.totalRecords === 'number' ? rawData.totalRecords : undefined) ??
    data?.pagination?.totalElements ??
    workspaces.length;
  const totalPages =
    (typeof rawData?.totalPages === 'number' ? rawData.totalPages : undefined) ??
    data?.pagination?.totalPages ??
    (Math.ceil(totalElements / limit) || 1);

  React.useEffect(() => {
    onTotalCountChange?.(totalElements);
    onWorkspacesLoaded?.(workspaces);
  }, [workspaces, totalElements, onTotalCountChange, onWorkspacesLoaded]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'lowest') {
      setInternalSortBy('pricePerHour');
      setInternalSortOrder('asc');
    } else if (val === 'highest_price') {
      setInternalSortBy('pricePerHour');
      setInternalSortOrder('desc');
    } else if (val === 'highest') {
      setInternalSortBy('rating');
      setInternalSortOrder('desc');
    } else if (val === 'popular') {
      setInternalSortBy('popular');
      setInternalSortOrder('desc');
    } else if (val === 'name') {
      setInternalSortBy('name');
      setInternalSortOrder('asc');
    } else {
      setInternalSortBy('featuredPosition');
      setInternalSortOrder('desc');
    }
  };

  return (
    <section className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-background p-6 lg:w-1/2 lg:p-8 [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
      {/* List Meta Header with sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                Đang tìm không gian...
              </span>
            ) : isNearbyEnabled ? (
              `${totalElements} không gian gần bạn (trong ${radiusKm}km)`
            ) : (
              `${totalElements} không gian làm việc sẵn sàng`
            )}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isNearbyEnabled
              ? 'Tự động tính cự ly địa lý theo bán kính từ vị trí GPS của bạn'
              : 'Không gian làm việc linh hoạt cho cá nhân và đội nhóm'}
          </p>
        </div>

        {/* Sorting Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden text-xs text-muted-foreground sm:inline whitespace-nowrap">Sắp xếp:</span>
          <div className="relative">
            <select
              aria-label="Sort workspaces by"
              onChange={handleSortChange}
              defaultValue="recommended"
              className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-xs font-semibold text-foreground shadow-sm transition-all cursor-pointer hover:border-border/80 focus:border-[#4b41e1] focus:ring-1 focus:ring-[#4b41e1]"
            >
              <option value="recommended">{isNearbyEnabled ? 'Gần nhất (Khoảng cách)' : 'Mới nhất / Được đề xuất'}</option>
              <option value="lowest">Giá: Thấp đến cao</option>
              <option value="highest_price">Giá: Cao đến thấp</option>
              <option value="highest">Đánh giá cao nhất</option>
              <option value="popular">Phổ biến nhất</option>
              <option value="name">Tên: A → Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          </div>
        </div>
      </div>

      {/* Near Me Proximity Notification Banner */}
      {isNearbyEnabled && nearMeCoords && (
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
              <Navigation className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">
                  Đang tìm kiếm trong bán kính {radiusKm} km
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.2 text-[10px] font-bold text-primary">
                  {totalElements} kết quả
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Vị trí GPS của bạn: <span className="font-mono text-foreground font-semibold">{nearMeCoords.lat.toFixed(4)}, {nearMeCoords.lng.toFixed(4)}</span> • Ưu tiên cự ly gần nhất
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearNearMe}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-background/80 cursor-pointer"
          >
            Tắt chế độ
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-xl border border-border bg-card p-4 sm:min-h-[170px] flex flex-col sm:flex-row gap-4 animate-pulse"
            >
              <div className="bg-muted rounded-lg w-full h-[140px] sm:h-auto sm:w-[240px] shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/4 mt-auto" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-center">
          <AlertTriangle className="size-8 mx-auto text-destructive mb-2" />
          <p className="font-semibold text-sm mb-1">Failed to load workspaces</p>
          <p className="text-xs text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Please check your connection or retry.'}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && workspaces.length === 0 && (
        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/40 my-4">
          <Building2 className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-base text-foreground mb-1">No workspaces found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No public workspaces match your selected criteria. Try clearing search filters or selecting another location.
          </p>
        </div>
      )}

      {/* Cards Feed */}
      {!isLoading &&
        !isError &&
        workspaces.map((workspace) => {
          const isCardActive = Boolean(
            hoveredWorkspaceId && String(workspace.id) === String(hoveredWorkspaceId)
          );
          return (
            <div
              key={workspace.id}
              onMouseEnter={() => onHoverWorkspace?.(String(workspace.id))}
              onMouseLeave={() => onHoverWorkspace?.(null)}
            >
              <WorkspaceCard
                workspace={workspace}
                isActive={isCardActive}
              />
            </div>
          );
        })}

      {/* Interactive Pagination Controls */}
      {!isLoading && !isError && workspaces.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4 pb-2 text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalElements)} of {totalElements} available workspaces
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              className="h-8 gap-1 shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </Button>
            <span className="font-mono px-2.5 py-1 rounded-md bg-muted text-foreground text-xs font-semibold">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
              className="h-8 gap-1 shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
