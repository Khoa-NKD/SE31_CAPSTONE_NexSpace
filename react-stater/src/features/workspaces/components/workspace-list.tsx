import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Building2 } from 'lucide-react';
import { WorkspaceCard } from './workspace-card';
import { usePublicWorkspacesQuery } from '../api/queries';
import type { PublicWorkspaceSummary } from '../api/types';
import { Button } from '@/components/ui/button';

interface WorkspaceListProps {
  search?: string;
  category?: string;
  sortBy?: 'featuredPosition' | 'pricePerHour' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
  onTotalCountChange?: (count: number) => void;
  onWorkspacesLoaded?: (workspaces: PublicWorkspaceSummary[]) => void;
}

export function WorkspaceList({
  search,
  category,
  sortBy,
  sortOrder,
  onTotalCountChange,
  onWorkspacesLoaded
}: WorkspaceListProps) {
  const [internalSortBy, setInternalSortBy] = React.useState<'featuredPosition' | 'pricePerHour' | 'rating' | 'name'>('featuredPosition');
  const [internalSortOrder, setInternalSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [page, setPage] = React.useState(1);
  const limit = 6;

  const activeSortBy = sortBy || internalSortBy;
  const activeSortOrder = sortOrder || internalSortOrder;

  // Reset pagination to page 1 whenever search, category, or sorting changes
  const [prevFilterState, setPrevFilterState] = React.useState({ search, category, activeSortBy, activeSortOrder });
  if (
    prevFilterState.search !== search ||
    prevFilterState.category !== category ||
    prevFilterState.activeSortBy !== activeSortBy ||
    prevFilterState.activeSortOrder !== activeSortOrder
  ) {
    setPrevFilterState({ search, category, activeSortBy, activeSortOrder });
    setPage(1);
  }

  const { data, isLoading, isError, error, refetch, isFetching } = usePublicWorkspacesQuery({
    search: search?.trim() || undefined,
    category: category || undefined,
    sortBy: activeSortBy,
    sortOrder: activeSortOrder,
    page,
    limit
  });

  const workspaces = data?.content || [];
  const totalElements = data?.pagination?.totalElements ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  React.useEffect(() => {
    if (data?.pagination?.totalElements !== undefined) {
      onTotalCountChange?.(data.pagination.totalElements);
    }
    if (data?.content) {
      onWorkspacesLoaded?.(data.content);
    }
  }, [data, onTotalCountChange, onWorkspacesLoaded]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'lowest') {
      setInternalSortBy('pricePerHour');
      setInternalSortOrder('asc');
    } else if (val === 'highest') {
      setInternalSortBy('rating');
      setInternalSortOrder('desc');
    } else if (val === 'name') {
      setInternalSortBy('name');
      setInternalSortOrder('asc');
    } else {
      setInternalSortBy('featuredPosition');
      setInternalSortOrder('asc');
    }
  };

  return (
    <section className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-background p-6 lg:w-1/2 lg:p-8 [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
      {/* List Meta Header with sorting */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                Loading workspaces...
              </span>
            ) : (
              `${totalElements} workspace${totalElements === 1 ? '' : 's'} available`
            )}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Flexible workspaces available for professionals &amp; teams
          </p>
        </div>

        {/* Sorting Menu */}
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">Sort by:</span>
          <div className="relative">
            <select
              aria-label="Sort workspaces by"
              onChange={handleSortChange}
              defaultValue="recommended"
              className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm font-semibold text-foreground shadow-sm transition-all cursor-pointer hover:border-border/80 focus:border-[#4b41e1] focus:ring-1 focus:ring-[#4b41e1]"
            >
              <option value="recommended">Recommended</option>
              <option value="lowest">Lowest Price</option>
              <option value="highest">Highest Rated</option>
              <option value="name">Name</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          </div>
        </div>
      </div>

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
        workspaces.map((workspace, index) => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            isActive={index === 0}
          />
        ))}

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
