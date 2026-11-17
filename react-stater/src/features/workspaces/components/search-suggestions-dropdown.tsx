import React, { useEffect, useRef } from 'react';
import {
  Building2,
  MapPin,
  Tag,
  Star,
  Loader2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import type {
  WorkspaceSuggestionsResponse,
  WorkspaceSuggestionItem,
  LocationSuggestionItem,
  CategorySuggestionItem
} from '../api/types';
import { cn } from '@/lib/utils';

interface SearchSuggestionsDropdownProps {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  suggestions?: WorkspaceSuggestionsResponse;
  onSelectWorkspace: (item: WorkspaceSuggestionItem) => void;
  onSelectLocation: (item: LocationSuggestionItem) => void;
  onSelectCategory: (item: CategorySuggestionItem) => void;
  query: string;
}

export function SearchSuggestionsDropdown({
  open,
  onClose,
  isLoading,
  suggestions,
  onSelectWorkspace,
  onSelectLocation,
  onSelectCategory,
  query
}: SearchSuggestionsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);

  // Flatten all navigable items
  const allItems = React.useMemo(() => {
    if (!suggestions) return [];
    const items: Array<{
      kind: 'workspace' | 'location' | 'category';
      data: WorkspaceSuggestionItem | LocationSuggestionItem | CategorySuggestionItem;
    }> = [];

    suggestions.workspaces?.forEach((w) => items.push({ kind: 'workspace', data: w }));
    suggestions.locations?.forEach((l) => items.push({ kind: 'location', data: l }));
    suggestions.categories?.forEach((c) => items.push({ kind: 'category', data: c }));
    return items;
  }, [suggestions]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < allItems.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allItems.length - 1));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < allItems.length) {
          e.preventDefault();
          const selected = allItems[selectedIndex];
          if (selected.kind === 'workspace') onSelectWorkspace(selected.data as WorkspaceSuggestionItem);
          else if (selected.kind === 'location') onSelectLocation(selected.data as LocationSuggestionItem);
          else if (selected.kind === 'category') onSelectCategory(selected.data as CategorySuggestionItem);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, allItems, onClose, onSelectWorkspace, onSelectLocation, onSelectCategory]);

  if (!open) return null;

  const hasWorkspaces = (suggestions?.workspaces?.length ?? 0) > 0;
  const hasLocations = (suggestions?.locations?.length ?? 0) > 0;
  const hasCategories = (suggestions?.categories?.length ?? 0) > 0;
  const hasResults = hasWorkspaces || hasLocations || hasCategories;

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 top-full mt-2 w-full max-w-lg min-w-[320px] rounded-xl border border-border bg-popover/95 backdrop-blur-md p-2 text-popover-foreground shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Đang tìm gợi ý phù hợp...</span>
        </div>
      ) : !hasResults ? (
        <div className="py-5 text-center text-xs text-muted-foreground">
          Không tìm thấy gợi ý nào cho &ldquo;<span className="font-semibold text-foreground">{query}</span>&rdquo;
        </div>
      ) : (
        <div className="max-h-[380px] overflow-y-auto space-y-3 p-1">
          {/* Section 1: Workspaces */}
          {hasWorkspaces && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-primary" />
                <span>Không gian làm việc</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {suggestions!.workspaces.map((w) => {
                  const itemIndex = allItems.findIndex((it) => it.kind === 'workspace' && (it.data as WorkspaceSuggestionItem).id === w.id);
                  const isHighlighted = itemIndex === selectedIndex;

                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onSelectWorkspace(w)}
                      className={cn(
                        'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer',
                        isHighlighted ? 'bg-primary/10 text-primary' : 'hover:bg-muted/70 text-foreground'
                      )}
                    >
                      {/* Image Thumbnail */}
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted border border-border/50">
                        {w.coverImageUrl ? (
                          <img
                            src={w.coverImageUrl}
                            alt={w.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                            <Building2 className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">{w.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {w.district ? `${w.district}, ` : ''}{w.city || w.address}
                        </p>
                      </div>

                      {/* Price & Rating */}
                      <div className="text-right shrink-0">
                        {w.pricePerHour ? (
                          <p className="text-xs font-bold text-primary">
                            {(w.pricePerHour).toLocaleString('vi-VN')} đ<span className="text-[10px] font-normal text-muted-foreground">/h</span>
                          </p>
                        ) : null}
                        {w.rating ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {w.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Locations */}
          {hasLocations && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-t border-border/50 pt-2">
                <MapPin className="h-3 w-3 text-primary" />
                <span>Khu vực / Địa điểm</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {suggestions!.locations.map((loc, idx) => {
                  const itemIndex = allItems.findIndex((it) => it.kind === 'location' && (it.data as LocationSuggestionItem).label === loc.label);
                  const isHighlighted = itemIndex === selectedIndex;

                  return (
                    <button
                      key={`${loc.label}-${idx}`}
                      type="button"
                      onClick={() => onSelectLocation(loc)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer',
                        isHighlighted ? 'bg-primary/10 text-primary' : 'hover:bg-muted/70 text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium truncate">{loc.label}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/70 shrink-0 bg-muted px-1.5 py-0.5 rounded">
                        {loc.type === 'DISTRICT' ? 'Quận' : 'Thành phố'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Categories */}
          {hasCategories && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-t border-border/50 pt-2">
                <Tag className="h-3 w-3 text-primary" />
                <span>Loại hình không gian</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {suggestions!.categories.map((cat, idx) => {
                  const itemIndex = allItems.findIndex((it) => it.kind === 'category' && (it.data as CategorySuggestionItem).label === cat.label);
                  const isHighlighted = itemIndex === selectedIndex;

                  return (
                    <button
                      key={`${cat.label}-${idx}`}
                      type="button"
                      onClick={() => onSelectCategory(cat)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer',
                        isHighlighted ? 'bg-primary/10 text-primary' : 'hover:bg-muted/70 text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium truncate">{cat.label}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

