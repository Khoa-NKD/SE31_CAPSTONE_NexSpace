import { Spinner as Loader2 } from '@/components/ui/spinner';
import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Calendar,
  X,
  SlidersHorizontal,
  Filter,
  Sidebar,
  Grid,
  ChevronDown,
  LocateFixed,
  Navigation,
  Building2,
  Coffee,
  Palette,
  Briefcase,
  Check,
  Bookmark
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  WorkspaceAdvancedFilterModal,
  type AdvancedFilterValues
} from './workspace-advanced-filter-modal';
import { SearchSuggestionsDropdown } from './search-suggestions-dropdown';
import { SavedSearchesPopover } from './saved-searches-popover';
import { SaveSearchModal } from './save-search-modal';
import { useWorkspaceSuggestionsQuery } from '../api/queries';
import { useSavedSearches } from '../hooks/use-saved-searches';
import type { SavedSearchCriteria } from '../api/types';
import {
  DateTimePickerModal,
  type ScheduleSelection
} from './detail/date-time-picker-modal';

interface WorkspaceFilterBarProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  category?: string;
  onCategoryChange?: (val: string) => void;
  schedule?: ScheduleSelection | null;
  onScheduleChange?: (schedule: ScheduleSelection) => void;
  totalCount?: number;
  // Geolocation & Near Me Proximity
  isNearMeActive?: boolean;
  onToggleNearMe?: () => void;
  radiusKm?: number;
  onRadiusKmChange?: (val: number) => void;
  isLocating?: boolean;
  // Advanced filters
  advancedFilters: AdvancedFilterValues;
  onAdvancedFiltersChange: (newFilters: AdvancedFilterValues) => void;
  onResetAdvancedFilters: () => void;
  onApplySavedCriteria?: (criteria: SavedSearchCriteria) => void;
  // View mode
  viewMode?: 'split' | 'grid';
  onViewModeChange?: (mode: 'split' | 'grid') => void;
}

const CATEGORIES = [
  { id: '', label: 'Tất cả loại hình', icon: Building2 },
  { id: 'coworking_hub', label: 'Coworking Hub', icon: Building2 },
  { id: 'business_lounge', label: 'Business Lounge', icon: Coffee },
  { id: 'creative_studio', label: 'Creative Studio', icon: Palette },
  { id: 'serviced_office', label: 'Serviced Office', icon: Briefcase }
];

const PRICE_QUICK_PRESETS = [
  { label: '< 30k', min: undefined, max: 30000 },
  { label: '30k - 60k', min: 30000, max: 60000 },
  { label: '60k - 100k', min: 60000, max: 100000 },
  { label: '> 100k', min: 100000, max: undefined }
];

export function WorkspaceFilterBar({
  search = '',
  onSearchChange,
  category = '',
  onCategoryChange,
  schedule,
  onScheduleChange,
  totalCount,
  isNearMeActive = false,
  onToggleNearMe,
  radiusKm = 10,
  onRadiusKmChange,
  isLocating = false,
  advancedFilters,
  onAdvancedFiltersChange,
  onResetAdvancedFilters,
  onApplySavedCriteria,
  viewMode = 'split',
  onViewModeChange
}: WorkspaceFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isPricePopoverOpen, setIsPricePopoverOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const {
    savedSearches,
    isLoading: isLoadingSavedSearches,
    saveFilter,
    deleteFilter,
    isAuthenticated,
    isSaving
  } = useSavedSearches();

  const { data: suggestionsData, isLoading: isLoadingSuggestions } =
    useWorkspaceSuggestionsQuery(localSearch);

  // Local draft inside Price Popover
  const [priceMinDraft, setPriceMinDraft] = useState<number | undefined>(advancedFilters.minPrice);
  const [priceMaxDraft, setPriceMaxDraft] = useState<number | undefined>(advancedFilters.maxPrice);

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange?.(localSearch);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const handleOpenPricePopover = (open: boolean) => {
    if (open) {
      setPriceMinDraft(advancedFilters.minPrice);
      setPriceMaxDraft(advancedFilters.maxPrice);
    }
    setIsPricePopoverOpen(open);
  };

  const handleClear = () => {
    setLocalSearch('');
    onSearchChange?.('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchChange?.(localSearch);
    }
  };

  const handleApplyPricePopover = () => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      minPrice: priceMinDraft,
      maxPrice: priceMaxDraft
    });
    setIsPricePopoverOpen(false);
  };

  const handleClearPricePopover = () => {
    setPriceMinDraft(undefined);
    setPriceMaxDraft(undefined);
    onAdvancedFiltersChange({
      ...advancedFilters,
      minPrice: undefined,
      maxPrice: undefined
    });
    setIsPricePopoverOpen(false);
  };

  // Calculate active filter count
  const activeCount = [
    Boolean(advancedFilters.city),
    Boolean(advancedFilters.district),
    advancedFilters.minPrice !== undefined || advancedFilters.maxPrice !== undefined,
    advancedFilters.seatTypes.length > 0,
    advancedFilters.amenityIds.length > 0,
    advancedFilters.minRating !== undefined
  ].filter(Boolean).length;

  const isPriceActive =
    advancedFilters.minPrice !== undefined || advancedFilters.maxPrice !== undefined;

  const priceLabel = useMemo(() => {
    if (advancedFilters.minPrice && advancedFilters.maxPrice) {
      return `${advancedFilters.minPrice / 1000}k - ${advancedFilters.maxPrice / 1000}k/h`;
    }
    if (advancedFilters.minPrice) {
      return `≥ ${advancedFilters.minPrice / 1000}k/h`;
    }
    if (advancedFilters.maxPrice) {
      return `≤ ${advancedFilters.maxPrice / 1000}k/h`;
    }
    return 'Khoảng giá';
  }, [advancedFilters.minPrice, advancedFilters.maxPrice]);

  const selectedCategoryObj = useMemo(() => {
    return CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  }, [category]);

  const currentCriteria: SavedSearchCriteria = useMemo(
    () => ({
      search: localSearch.trim() || undefined,
      category: category || undefined,
      city: advancedFilters.city || undefined,
      district: advancedFilters.district || undefined,
      minPrice: advancedFilters.minPrice,
      maxPrice: advancedFilters.maxPrice,
      amenityIds: advancedFilters.amenityIds.length > 0 ? advancedFilters.amenityIds : undefined,
      seatTypes: advancedFilters.seatTypes.length > 0 ? advancedFilters.seatTypes : undefined,
      minRating: advancedFilters.minRating
    }),
    [localSearch, category, advancedFilters]
  );

  const hasAnyFilterOrSearch = Boolean(
    localSearch.trim() ||
      category ||
      activeCount > 0
  );

  const handleApplySavedCriteria = (criteria: SavedSearchCriteria) => {
    if (criteria.search !== undefined) {
      setLocalSearch(criteria.search || '');
      onSearchChange?.(criteria.search || '');
    }
    if (criteria.category !== undefined) {
      onCategoryChange?.(criteria.category || '');
    }
    onAdvancedFiltersChange({
      city: criteria.city,
      district: criteria.district,
      minPrice: criteria.minPrice,
      maxPrice: criteria.maxPrice,
      amenityIds: criteria.amenityIds || [],
      seatTypes: criteria.seatTypes || [],
      minRating: criteria.minRating
    });
    onApplySavedCriteria?.(criteria);
  };

  const handleSaveModalConfirm = async (name: string): Promise<boolean> => {
    const res = await saveFilter(name, currentCriteria);
    return Boolean(res);
  };

  return (
    <section className="relative z-40 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-xs">
      {/* Primary Unified Toolbar (56–64px height) */}
      <div className="mx-auto flex h-14 sm:h-16 max-w-[1440px] items-center justify-between gap-2.5 px-4 sm:px-6 lg:px-8">
        {/* Left: Location Search & Near Me Proximity */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {/* Location Autocomplete Input */}
          <div className="relative flex-1 max-w-sm sm:max-w-md">
            <div className="flex h-9 sm:h-10 items-center rounded-xl border border-border bg-background px-3 shadow-2xs transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-border/80">
              <MapPin className="mr-2 h-4 w-4 text-primary shrink-0" />
              <input
                type="text"
                className="w-full truncate border-0 bg-transparent p-0 text-xs sm:text-sm font-medium text-foreground focus:ring-0 focus:outline-none placeholder:text-muted-foreground/70"
                placeholder="Địa điểm, quận hoặc tên không gian..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => {
                  if (localSearch.trim().length >= 2) setIsDropdownOpen(true);
                }}
                onKeyDown={handleKeyDown}
                aria-label="Tìm kiếm không gian"
              />
              {localSearch && (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={handleClear}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Fast Autocomplete Suggestions Dropdown */}
            <SearchSuggestionsDropdown
              open={isDropdownOpen && localSearch.trim().length >= 2}
              onClose={() => setIsDropdownOpen(false)}
              isLoading={isLoadingSuggestions}
              suggestions={suggestionsData}
              query={localSearch}
              onSelectWorkspace={(w) => {
                setLocalSearch(w.name);
                onSearchChange?.(w.name);
                setIsDropdownOpen(false);
              }}
              onSelectLocation={(loc) => {
                if (loc.type === 'DISTRICT') {
                  onAdvancedFiltersChange({
                    ...advancedFilters,
                    city: loc.city || undefined,
                    district: loc.district || undefined
                  });
                } else {
                  onAdvancedFiltersChange({
                    ...advancedFilters,
                    city: loc.city || undefined,
                    district: undefined
                  });
                }
                setLocalSearch(loc.label);
                onSearchChange?.(loc.label);
                setIsDropdownOpen(false);
              }}
              onSelectCategory={(cat) => {
                onCategoryChange?.(cat.category.toLowerCase());
                setIsDropdownOpen(false);
              }}
            />
          </div>

          {/* Near Me GPS Trigger */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant={isNearMeActive ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleNearMe}
              disabled={isLocating}
              className={cn(
                'h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl font-semibold text-xs shadow-2xs transition-all cursor-pointer',
                isNearMeActive
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:border-primary/60 hover:text-primary'
              )}
            >
              {isLocating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">GPS...</span>
                </>
              ) : isNearMeActive ? (
                <>
                  <Navigation className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span className="hidden sm:inline">Gần tôi ({radiusKm}km)</span>
                  <X className="h-3 w-3 ml-0.5 opacity-80 hover:opacity-100" />
                </>
              ) : (
                <>
                  <LocateFixed className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="hidden sm:inline">Gần tôi</span>
                </>
              )}
            </Button>

            {/* Radius selector pill when Near Me is active */}
            {isNearMeActive && (
              <div className="hidden md:flex items-center bg-muted/80 rounded-lg p-0.5 border border-border shadow-2xs">
                {[3, 5, 10, 20].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRadiusKmChange?.(r)}
                    className={cn(
                      'px-1.5 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer',
                      radiusKm === r
                        ? 'bg-card text-primary shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {r}k
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center / Right: Space Type, Date, Price, Filter, Saved, View */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Workspace Type Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'hidden md:flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-2xs transition-all cursor-pointer',
                  category
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                )}
              >
                <Building2 className={cn('h-3.5 w-3.5', category ? 'text-primary' : 'text-muted-foreground')} />
                <span className="max-w-[120px] truncate">{selectedCategoryObj.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-lg">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id || (!category && cat.id === '');
                const Icon = cat.icon;
                return (
                  <DropdownMenuItem
                    key={cat.id || 'all'}
                    onSelect={() => onCategoryChange?.(cat.id)}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer',
                      isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{cat.label}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date & Time Trigger */}
          <DateTimePickerModal
            initialDate={schedule?.date}
            initialStartTime={schedule?.startTime}
            initialEndTime={schedule?.endTime}
            onConfirm={(newSched) => {
              onScheduleChange?.(newSched);
            }}
          >
            <button
              type="button"
              className={cn(
                "hidden lg:flex h-9 sm:h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-2xs transition-all cursor-pointer",
                schedule
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-muted/50"
              )}
            >
              <Calendar className={cn("h-3.5 w-3.5 shrink-0", schedule ? "text-primary" : "text-muted-foreground")} />
              <span>
                {schedule
                  ? `${schedule.date}, ${schedule.startTime} - ${schedule.endTime}`
                  : "Hôm nay, Giờ linh hoạt"}
              </span>
            </button>
          </DateTimePickerModal>

          {/* Price Range Popover */}
          <Popover open={isPricePopoverOpen} onOpenChange={handleOpenPricePopover}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-semibold shadow-2xs transition-all cursor-pointer',
                  isPriceActive
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                )}
              >
                <SlidersHorizontal className={cn('h-3.5 w-3.5', isPriceActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="hidden sm:inline">{priceLabel}</span>
                {isPriceActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Khoảng giá (VNĐ/giờ)</span>
                {isPriceActive && (
                  <button
                    type="button"
                    onClick={handleClearPricePopover}
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-2 gap-1.5">
                {PRICE_QUICK_PRESETS.map((p) => {
                  const isSelected =
                    priceMinDraft === p.min && priceMaxDraft === p.max;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setPriceMinDraft(p.min);
                        setPriceMaxDraft(p.max);
                      }}
                      className={cn(
                        'px-2 py-1.5 rounded text-xs transition-all cursor-pointer border text-center',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground font-semibold'
                          : 'border-border/60 hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Tối thiểu</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={priceMinDraft ?? ''}
                    onChange={(e) => setPriceMinDraft(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Tối đa</span>
                  <Input
                    type="number"
                    placeholder="Không giới hạn"
                    value={priceMaxDraft ?? ''}
                    onChange={(e) => setPriceMaxDraft(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPricePopoverOpen(false)}
                  className="h-7 text-xs px-2.5"
                >
                  Đóng
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyPricePopover}
                  className="h-7 text-xs px-2.5 font-bold"
                >
                  Áp dụng
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* More Filters Trigger */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={cn(
              'flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-semibold shadow-2xs transition-all cursor-pointer',
              activeCount > 0
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-border bg-background text-foreground hover:bg-muted/50'
            )}
          >
            <Filter className={cn('h-3.5 w-3.5', activeCount > 0 ? 'text-primary' : 'text-muted-foreground')} />
            <span>Bộ lọc</span>
            {activeCount > 0 && (
              <Badge className="h-4.5 px-1.5 bg-primary text-primary-foreground font-bold text-[10px] rounded-full">
                {activeCount}
              </Badge>
            )}
          </button>

          {/* Saved Search Filters Popover */}
          <SavedSearchesPopover
            savedSearches={savedSearches}
            isLoading={isLoadingSavedSearches}
            onApply={handleApplySavedCriteria}
            onDelete={deleteFilter}
            onOpenSaveModal={() => setIsSaveModalOpen(true)}
            hasActiveFilters={hasAnyFilterOrSearch}
          />

          {/* View Mode Toggle (Desktop only) */}
          <div className="hidden lg:flex items-center rounded-xl border border-border bg-muted/60 p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange?.('split')}
              aria-label="Split Map View"
              title="Chia đôi bản đồ & danh sách"
              className={cn(
                'rounded-lg p-1.5 transition-all cursor-pointer',
                viewMode === 'split'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sidebar className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange?.('grid')}
              aria-label="Grid Only View"
              title="Chỉ hiển thị danh sách"
              className={cn(
                'rounded-lg p-1.5 transition-all cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slim Active Filter Chips Strip (Only when filters are active) */}
      {(activeCount > 0 || Boolean(category)) && (
        <div className="border-t border-border/40 bg-muted/15 px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">Đang lọc:</span>

          {category && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {selectedCategoryObj.label}
              <button
                type="button"
                onClick={() => onCategoryChange?.('')}
                className="hover:text-primary/70 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {advancedFilters.city && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
              TP: {advancedFilters.city}
              <button
                type="button"
                onClick={() => onAdvancedFiltersChange({ ...advancedFilters, city: undefined })}
                className="hover:text-primary/70 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {advancedFilters.district && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
              Quận: {advancedFilters.district}
              <button
                type="button"
                onClick={() => onAdvancedFiltersChange({ ...advancedFilters, district: undefined })}
                className="hover:text-primary/70 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {isPriceActive && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
              Giá: {priceLabel}
              <button
                type="button"
                onClick={() => onAdvancedFiltersChange({ ...advancedFilters, minPrice: undefined, maxPrice: undefined })}
                className="hover:text-primary/70 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {advancedFilters.seatTypes.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary"
            >
              {st === 'hot_desk' ? 'Hot Desk' : st === 'dedicated_desk' ? 'Dedicated Desk' : st === 'meeting_room' ? 'Meeting Room' : 'Private Office'}
              <button
                type="button"
                onClick={() =>
                  onAdvancedFiltersChange({
                    ...advancedFilters,
                    seatTypes: advancedFilters.seatTypes.filter((t) => t !== st)
                  })
                }
                className="hover:text-primary/70 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {advancedFilters.minRating !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              ≥ {advancedFilters.minRating} ★
              <button
                type="button"
                onClick={() => onAdvancedFiltersChange({ ...advancedFilters, minRating: undefined })}
                className="hover:opacity-70 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {advancedFilters.amenityIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
              {advancedFilters.amenityIds.length} Tiện ích
              <button
                type="button"
                onClick={() => onAdvancedFiltersChange({ ...advancedFilters, amenityIds: [] })}
                className="hover:text-primary/70 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              title="Lưu các bộ lọc này để tìm nhanh lần sau"
            >
              <Bookmark className="h-3 w-3" />
              Lưu bộ lọc
            </button>
            <span className="text-muted-foreground/40 text-[10px]">|</span>
            <button
              type="button"
              onClick={() => {
                onCategoryChange?.('');
                onResetAdvancedFilters();
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Xóa tất cả
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filter Modal */}
      <WorkspaceAdvancedFilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        filters={advancedFilters}
        onApply={onAdvancedFiltersChange}
        onReset={onResetAdvancedFilters}
      />

      {/* Save Search Criteria Modal */}
      <SaveSearchModal
        open={isSaveModalOpen}
        onOpenChange={setIsSaveModalOpen}
        criteria={currentCriteria}
        onSave={handleSaveModalConfirm}
        isAuthenticated={isAuthenticated}
        isSaving={isSaving}
      />
    </section>
  );
}
