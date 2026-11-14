import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Sparkles, MapPin, Tag, Star, DollarSign, Layers } from 'lucide-react';
import type { SavedSearchCriteria } from '../api/types';

interface SaveSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criteria: SavedSearchCriteria;
  onSave: (name: string) => Promise<boolean>;
  isAuthenticated?: boolean;
  isSaving?: boolean;
}

export function SaveSearchModal({
  open,
  onOpenChange,
  criteria,
  onSave,
  isAuthenticated = false,
  isSaving = false
}: SaveSearchModalProps) {
  const [filterName, setFilterName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Generate a smart suggested name when opening
  React.useEffect(() => {
    if (open) {
      setErrorMsg('');
      const parts: string[] = [];
      if (criteria.district) parts.push(criteria.district);
      else if (criteria.city) parts.push(criteria.city);
      if (criteria.category) {
        const catMap: Record<string, string> = {
          coworking_hub: 'Coworking',
          business_lounge: 'Lounge',
          creative_studio: 'Studio',
          serviced_office: 'Văn phòng'
        };
        parts.push(catMap[criteria.category] || criteria.category);
      }
      if (criteria.maxPrice) {
        parts.push(`< ${(criteria.maxPrice / 1000).toLocaleString('vi-VN')}k`);
      } else if (criteria.minPrice) {
        parts.push(`> ${(criteria.minPrice / 1000).toLocaleString('vi-VN')}k`);
      }
      if (criteria.search) {
        parts.push(criteria.search);
      }

      const suggested = parts.length > 0 ? parts.join(' • ') : 'Bộ lọc tìm kiếm mới';
      setFilterName(suggested);
    }
  }, [open, criteria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterName.trim()) {
      setErrorMsg('Vui lòng nhập tên cho bộ lọc');
      return;
    }
    const success = await onSave(filterName.trim());
    if (success) {
      onOpenChange(false);
    }
  };

  const hasAnyCriteria = Boolean(
    criteria.search ||
      criteria.category ||
      criteria.city ||
      criteria.district ||
      criteria.minPrice ||
      criteria.maxPrice ||
      (criteria.amenityIds && criteria.amenityIds.length > 0) ||
      (criteria.seatTypes && criteria.seatTypes.length > 0) ||
      criteria.minRating
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-2 text-primary">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Bookmark className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">Lưu bộ lọc tìm kiếm</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Lưu cấu hình tìm kiếm hiện tại để bạn có thể áp dụng lại nhanh chóng chỉ với một cú nhấp chuột.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Filter Name Field */}
            <div className="space-y-1.5">
              <label htmlFor="filter-name" className="text-xs font-semibold text-foreground">
                Tên bộ lọc <span className="text-destructive">*</span>
              </label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => {
                  setFilterName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                maxLength={100}
                placeholder="Ví dụ: Phòng họp Q1 dưới 300k..."
                className="h-9 text-xs"
                autoFocus
              />
              {errorMsg && <p className="text-[11px] font-medium text-destructive">{errorMsg}</p>}
            </div>

            {/* Criteria Summary Preview */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Tiêu chí đang áp dụng:
              </span>

              {!hasAnyCriteria ? (
                <p className="text-xs italic text-muted-foreground">
                  (Chưa chọn tiêu chí cụ thể nào, bộ lọc này sẽ hiển thị tất cả không gian)
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {criteria.search && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      "{criteria.search}"
                    </Badge>
                  )}
                  {criteria.city && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      {criteria.city}
                    </Badge>
                  )}
                  {criteria.district && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      {criteria.district}
                    </Badge>
                  )}
                  {criteria.category && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                      <Tag className="h-3 w-3 text-primary" />
                      {criteria.category}
                    </Badge>
                  )}
                  {(criteria.minPrice || criteria.maxPrice) && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                      <DollarSign className="h-3 w-3 text-primary" />
                      {criteria.minPrice && criteria.maxPrice
                        ? `${(criteria.minPrice / 1000).toLocaleString('vi-VN')}k - ${(criteria.maxPrice / 1000).toLocaleString('vi-VN')}k`
                        : criteria.minPrice
                        ? `≥ ${(criteria.minPrice / 1000).toLocaleString('vi-VN')}k`
                        : `≤ ${(criteria.maxPrice! / 1000).toLocaleString('vi-VN')}k`}
                    </Badge>
                  )}
                  {criteria.seatTypes && criteria.seatTypes.length > 0 && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                      <Layers className="h-3 w-3 text-primary" />
                      {criteria.seatTypes.length} loại chỗ ngồi
                    </Badge>
                  )}
                  {criteria.amenityIds && criteria.amenityIds.length > 0 && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1">
                      <Tag className="h-3 w-3 text-primary" />
                      {criteria.amenityIds.length} tiện ích
                    </Badge>
                  )}
                  {criteria.minRating !== undefined && (
                    <Badge variant="secondary" className="text-[11px] font-normal gap-1 text-amber-600 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      ≥ {criteria.minRating} sao
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Guest note if not logged in */}
            {!isAuthenticated && (
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                💡 <span className="font-semibold text-amber-600 dark:text-amber-400">Lưu ý khách vãng lai:</span> Bộ lọc này sẽ được lưu an toàn trong trình duyệt này. Hãy đăng nhập tài khoản NexSpace để đồng bộ đám mây trên mọi thiết bị.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs font-bold gap-1.5"
              disabled={isSaving || !filterName.trim()}
            >
              <Bookmark className="h-3.5 w-3.5" />
              {isSaving ? 'Đang lưu...' : 'Lưu bộ lọc'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

