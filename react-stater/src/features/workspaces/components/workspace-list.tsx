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
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  amenityIds?: number[];
  resourceCategories?: string[];
  minRating?: number;
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
  city,
  district,
  minPrice,
  maxPrice,
  amenityIds,
  resourceCategories,
  minRating,
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
  const limit = 8;

  const activeSortBy = sortBy || internalSortBy;
  const activeSortOrder = sortOrder || internalSortOrder;

  const isNearbyEnabled = Boolean(isNearMeActive && nearMeCoords?.lat && nearMeCoords?.lng);

  // Reset pagination to page 1 whenever any search, filter, or sorting changes
  const [prevFilterState, setPrevFilterState] = React.useState({
    search,
    category,
    city,
    district,
    minPrice,
    maxPrice,
    amenityIds,
    resourceCategories,
    minRating,
    activeSortBy,
    activeSortOrder,
    isNearbyEnabled,
    radiusKm
  });

  if (
    prevFilterState.search !== search ||
    prevFilterState.category !== category ||
    prevFilterState.city !== city ||
    prevFilterState.district !== district ||
    prevFilterState.minPrice !== minPrice ||
    prevFilterState.maxPrice !== maxPrice ||
    prevFilterState.amenityIds !== amenityIds ||
    prevFilterState.resourceCategories !== resourceCategories ||
    prevFilterState.minRating !== minRating ||
    prevFilterState.activeSortBy !== activeSortBy ||
    prevFilterState.activeSortOrder !== activeSortOrder ||
    prevFilterState.isNearbyEnabled !== isNearbyEnabled ||
    prevFilterState.radiusKm !== radiusKm
  ) {
    setPrevFilterState({
      search,
      category,
      city,
      district,
      minPrice,
      maxPrice,
      amenityIds,
      resourceCategories,
      minRating,
      activeSortBy,
      activeSortOrder,
      isNearbyEnabled,
      radiusKm
    });
    setPage(1);
  }

  const publicQuery = usePublicWorkspacesQuery({
    search: search?.trim() || undefined,
    category: category || undefined,
    city: city?.trim() || undefined,
    district: district?.trim() || undefined,
    minPrice,
    maxPrice,
    amenityIds: amenityIds && amenityIds.length > 0 ? amenityIds : undefined,
    resourceCategories:
      resourceCategories && resourceCategories.length > 0 ? resourceCategories : undefined,
    minRating,
    sortBy: activeSortBy,
    sortOrder: activeSortOrder,
    page,
    limit
  });

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
    const rawList =
      (rawDataObj?.listObjects as PublicWorkspaceSummary[] | undefined) ?? data?.content;
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
    <section className="flex h-full w-full flex-col overflow-y-auto bg-background px-4 sm:px-6 py-4 [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
      {/* Results Header: Count & Sorting */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 mb-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Đang tìm không gian...
              </span>
            ) : isNearbyEnabled ? (
              `${totalElements} không gian gần bạn (${radiusKm}km)`
            ) : (
              `${totalElements} không gian làm việc`
            )}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {isNearbyEnabled
              ? 'Tự động tính cự ly địa lý theo GPS'
              : 'Đặt bàn làm việc, phòng họp linh hoạt theo giờ'}
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap">
            Sắp xếp:
          </span>
          <div className="relative">
            <select
              aria-label="Sắp xếp kết quả"
              onChange={handleSortChange}
              defaultValue="recommended"
              className="appearance-none rounded-xl border border-border bg-card py-1.5 pl-2.5 pr-7 text-xs font-semibold text-foreground shadow-2xs transition-all cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="recommended">
                {isNearbyEnabled ? 'Gần nhất (Khoảng cách)' : 'Mới nhất / Đề xuất'}
              </option>
              <option value="lowest">Giá: Thấp đến cao</option>
              <option value="highest_price">Giá: Cao đến thấp</option>
              <option value="highest">Đánh giá cao nhất</option>
              <option value="popular">Phổ biến nhất</option>
              <option value="name">Tên: A → Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          </div>
        </div>
      </div>

      {/* Near Me Alert Banner if GPS active */}
      {isNearbyEnabled && nearMeCoords && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Navigation className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
            <span className="font-semibold text-foreground text-[11px] sm:text-xs">
              Vị trí GPS ({nearMeCoords.lat.toFixed(4)}, {nearMeCoords.lng.toFixed(4)}) • Bán kính {radiusKm}km
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearNearMe}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Tắt
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-border/60 bg-card p-3 sm:h-[168px] flex flex-col sm:flex-row gap-3 animate-pulse"
            >
              <div className="bg-muted rounded-xl w-full h-[130px] sm:h-full sm:w-[210px] shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 bg-muted rounded w-1/3" />
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-3.5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/4 mt-auto" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-8 my-auto rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="font-semibold text-sm mb-1">Không thể tải danh sách không gian</p>
          <p className="text-xs text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Vui lòng kiểm tra kết nối mạng và thử lại.'}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && workspaces.length === 0 && (
        <div className="p-10 my-auto text-center rounded-2xl border border-dashed border-border bg-card/40">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-bold text-sm sm:text-base text-foreground mb-1">
            Không tìm thấy không gian phù hợp
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Không có không gian làm việc nào khớp với tiêu chí tìm kiếm của bạn. Hãy thử thay đổi bộ lọc, xóa từ khóa hoặc chọn khu vực khác.
          </p>
        </div>
      )}

      {/* Workspace Cards List */}
      {!isLoading && !isError && workspaces.length > 0 && (
        <div className="flex flex-col gap-3">
          {workspaces.map((workspace) => {
            const isCardActive = Boolean(
              hoveredWorkspaceId && String(workspace.id) === String(hoveredWorkspaceId)
            );
            return (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                isActive={isCardActive}
                onHover={onHoverWorkspace}
              />
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && !isError && workspaces.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="text-[11px]">
            {(page - 1) * limit + 1}–{Math.min(page * limit, totalElements)} trên {totalElements} kết quả
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              className="h-7.5 px-2.5 text-xs shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              <span>Trước</span>
            </Button>
            <span className="font-mono px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-semibold">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
              className="h-7.5 px-2.5 text-xs shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              aria-label="Trang sau"
            >
              <span>Sau</span>
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
