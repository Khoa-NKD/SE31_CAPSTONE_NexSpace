import React from 'react';
import {
  Bookmark,
  Trash2,
  Check,
  MapPin,
  Sparkles,
  Tag,
  Star,
  DollarSign,
  Plus,
  Loader2
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SavedSearchFilterItem, SavedSearchCriteria } from '../api/types';

interface SavedSearchesPopoverProps {
  savedSearches: SavedSearchFilterItem[];
  isLoading?: boolean;
  onApply: (criteria: SavedSearchCriteria) => void;
  onDelete: (id: string | number) => void;
  onOpenSaveModal: () => void;
  hasActiveFilters?: boolean;
}

export function SavedSearchesPopover({
  savedSearches,
  isLoading = false,
  onApply,
  onDelete,
  onOpenSaveModal,
  hasActiveFilters = false
}: SavedSearchesPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const count = savedSearches.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-2xs transition-all cursor-pointer',
            count > 0
              ? 'border-primary/40 bg-background text-foreground hover:bg-muted/50'
              : 'border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
          title="Xem các bộ lọc tìm kiếm đã lưu"
        >
          <Bookmark className={cn('h-3.5 w-3.5', count > 0 ? 'text-primary fill-primary/20' : 'text-muted-foreground')} />
          <span className="hidden sm:inline">Đã lưu</span>
          {count > 0 && (
            <Badge className="h-4.5 px-1 bg-primary/20 text-primary hover:bg-primary/30 font-bold text-[10px] rounded-full border border-primary/30">
              {count}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">Bộ lọc tìm kiếm đã lưu</h4>
            <span className="text-[11px] text-muted-foreground">({count})</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              onOpenSaveModal();
            }}
            className="h-7 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 px-2 cursor-pointer"
            title="Lưu các bộ lọc đang chọn"
          >
            <Plus className="h-3 w-3" />
            Lưu hiện tại
          </Button>
        </div>

        {/* Content list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40 p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Đang tải bộ lọc đã lưu...</span>
            </div>
          ) : count === 0 ? (
            <div className="py-8 px-4 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <Bookmark className="h-5 w-5 opacity-40" />
              </div>
              <p className="text-xs font-medium text-foreground">Chưa có bộ lọc đã lưu</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Tùy chỉnh từ khóa, giá, vị trí hoặc tiện ích rồi bấm nút <strong>Lưu hiện tại</strong> để lưu bộ lọc nhanh.
              </p>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onOpenSaveModal();
                  }}
                  className="mt-2 h-7 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Lưu bộ lọc đang chọn
                </Button>
              )}
            </div>
          ) : (
            savedSearches.map((item) => {
              const c = item.criteria || {};
              const badges: string[] = [];
              if (c.district) badges.push(c.district);
              else if (c.city) badges.push(c.city);
              if (c.category) badges.push(c.category);
              if (c.maxPrice) badges.push(`≤ ${(c.maxPrice / 1000).toLocaleString('vi-VN')}k`);
              if (c.minRating) badges.push(`≥ ${c.minRating}★`);
              if (c.amenityIds && c.amenityIds.length > 0) badges.push(`${c.amenityIds.length} tiện ích`);
              if (c.seatTypes && c.seatTypes.length > 0) badges.push(`${c.seatTypes.length} loại chỗ`);

              return (
                <div
                  key={item.id}
                  className="group flex items-start justify-between gap-3 p-3 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-foreground truncate block">
                        {item.name}
                      </span>
                    </div>

                    {c.search && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        Từ khóa: <span className="italic text-foreground">"{c.search}"</span>
                      </p>
                    )}

                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {badges.slice(0, 4).map((b, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-medium text-primary"
                          >
                            {b}
                          </span>
                        ))}
                        {badges.length > 4 && (
                          <span className="text-[10px] text-muted-foreground font-medium self-center">
                            +{badges.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        onApply(item.criteria);
                        setOpen(false);
                      }}
                      className="h-7 px-2.5 text-[11px] font-semibold cursor-pointer"
                      title="Áp dụng cấu hình bộ lọc này"
                    >
                      Áp dụng
                    </Button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Xóa bộ lọc này"
                      aria-label="Xóa bộ lọc"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

