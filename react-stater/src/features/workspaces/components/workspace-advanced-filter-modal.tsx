import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  DollarSign,
  Sparkles,
  Star,
  Layers,
  RotateCcw,
  Check,
  Building,
  Wifi,
  Coffee,
  Car,
  Printer,
  Tv,
  PhoneCall,
  Clock
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { amenityQueries } from '@/features/amenities/api/queries';

export interface AdvancedFilterValues {
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  amenityIds: number[];
  seatTypes: string[]; // 'hot_desk' | 'dedicated_desk' | 'meeting_room' | 'private_office'
  minRating?: number;
}

interface WorkspaceAdvancedFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AdvancedFilterValues;
  onApply: (newFilters: AdvancedFilterValues) => void;
  onReset: () => void;
}

const VIETNAM_CITIES = [
  'Tất cả',
  'Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng'
];

const SEAT_TYPE_OPTIONS = [
  { id: 'hot_desk', label: 'Hot Desk (Chỗ linh hoạt)', category: 'DESK', desc: 'Ngồi tự do trong không gian chung' },
  { id: 'dedicated_desk', label: 'Dedicated Desk (Chỗ cố định)', category: 'DESK', desc: 'Bàn cá nhân dài hạn' },
  { id: 'meeting_room', label: 'Phòng họp (Meeting Room)', category: 'ROOM', desc: 'Có máy chiếu & bảng viết' },
  { id: 'private_office', label: 'Văn phòng riêng (Private Office)', category: 'ROOM', desc: 'Không gian riêng tư cho nhóm' }
];

const PRICE_PRESETS = [
  { label: 'Dưới 30k/h', min: undefined, max: 30000 },
  { label: '30k - 60k/h', min: 30000, max: 60000 },
  { label: '60k - 100k/h', min: 60000, max: 100000 },
  { label: 'Trên 100k/h', min: 100000, max: undefined }
];

const RATING_OPTIONS = [
  { value: undefined, label: 'Tất cả rating' },
  { value: 3.5, label: 'Từ 3.5 ★ (Tốt)' },
  { value: 4.0, label: 'Từ 4.0 ★ (Rất tốt)' },
  { value: 4.5, label: 'Từ 4.5 ★ (Xuất sắc)' }
];

const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi,
  coffee: Coffee,
  parking: Car,
  car: Car,
  printer: Printer,
  projector: Tv,
  tv: Tv,
  phone: PhoneCall,
  clock: Clock
};

export function WorkspaceAdvancedFilterModal({
  open,
  onOpenChange,
  filters,
  onApply,
  onReset
}: WorkspaceAdvancedFilterModalProps) {
  const [draft, setDraft] = useState<AdvancedFilterValues>(filters);

  // Sync draft when opened
  useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [open, filters]);

  // Load amenities from API
  const { data: amenitiesList } = useQuery(amenityQueries.available());

  const handleCityChange = (city: string) => {
    setDraft((prev) => ({
      ...prev,
      city: city === 'Tất cả' ? undefined : city
    }));
  };

  const handleDistrictChange = (val: string) => {
    setDraft((prev) => ({
      ...prev,
      district: val.trim() ? val : undefined
    }));
  };

  const handlePricePreset = (min?: number, max?: number) => {
    setDraft((prev) => ({
      ...prev,
      minPrice: min,
      maxPrice: max
    }));
  };

  const toggleSeatType = (id: string) => {
    setDraft((prev) => {
      const exists = prev.seatTypes.includes(id);
      return {
        ...prev,
        seatTypes: exists
          ? prev.seatTypes.filter((t) => t !== id)
          : [...prev.seatTypes, id]
      };
    });
  };

  const toggleAmenity = (id: number) => {
    setDraft((prev) => {
      const exists = prev.amenityIds.includes(id);
      return {
        ...prev,
        amenityIds: exists
          ? prev.amenityIds.filter((item) => item !== id)
          : [...prev.amenityIds, id]
      };
    });
  };

  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const handleResetDraft = () => {
    const emptyState: AdvancedFilterValues = {
      city: undefined,
      district: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      amenityIds: [],
      seatTypes: [],
      minRating: undefined
    };
    setDraft(emptyState);
    onReset();
    onOpenChange(false);
  };

  // Active filter count inside draft
  const activeCount = [
    Boolean(draft.city),
    Boolean(draft.district),
    draft.minPrice !== undefined || draft.maxPrice !== undefined,
    draft.seatTypes.length > 0,
    draft.amenityIds.length > 0,
    draft.minRating !== undefined
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        <DialogHeader className="p-6 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Bộ lọc nâng cao</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Tùy chỉnh tiêu chí để tìm không gian làm việc lý tưởng nhất
                </p>
              </div>
            </div>
            {activeCount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs">
                {activeCount} tiêu chí đang chọn
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Section 1: Vị trí (Thành phố & Quận) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Vị trí địa lý</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {VIETNAM_CITIES.map((c) => {
                const isSelected = (!draft.city && c === 'Tất cả') || draft.city === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCityChange(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="pt-1">
              <Input
                placeholder="Nhập quận, huyện hoặc khu vực (VD: Hải Châu, Cầu Giấy, Quận 1...)"
                value={draft.district || ''}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="text-xs sm:text-sm h-9"
              />
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Section 2: Khoảng giá theo giờ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                <span>Khoảng giá khởi điểm (VNĐ / giờ)</span>
              </div>
              {(draft.minPrice !== undefined || draft.maxPrice !== undefined) && (
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, minPrice: undefined, maxPrice: undefined }))}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Xóa giá
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              {PRICE_PRESETS.map((preset) => {
                const isSelected =
                  draft.minPrice === preset.min && draft.maxPrice === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePricePreset(preset.min, preset.max)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Min / Max Input */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Giá tối thiểu (VNĐ)
                </label>
                <Input
                  type="number"
                  placeholder="Từ 0 đ"
                  value={draft.minPrice ?? ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      minPrice: e.target.value ? Number(e.target.value) : undefined
                    }))
                  }
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Giá tối đa (VNĐ)
                </label>
                <Input
                  type="number"
                  placeholder="Đến ... đ"
                  value={draft.maxPrice ?? ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      maxPrice: e.target.value ? Number(e.target.value) : undefined
                    }))
                  }
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Section 3: Loại chỗ ngồi / Hình thức làm việc */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Loại chỗ ngồi & Không gian</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SEAT_TYPE_OPTIONS.map((seat) => {
                const isSelected = draft.seatTypes.includes(seat.id);
                return (
                  <div
                    key={seat.id}
                    onClick={() => toggleSeatType(seat.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary/60 bg-primary/5 shadow-2xs'
                        : 'border-border/60 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSeatType(seat.id)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {seat.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {seat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Section 4: Tiện ích không gian */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Tiện ích đi kèm</span>
              </div>
              {draft.amenityIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, amenityIds: [] }))}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Bỏ chọn ({draft.amenityIds.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenitiesList && amenitiesList.length > 0 ? (
                amenitiesList.map((amenity) => {
                  const isSelected = draft.amenityIds.includes(amenity.id);
                  const Icon =
                    AMENITY_ICONS[amenity.icon?.toLowerCase() || ''] || Building;

                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border/60 hover:border-border hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span className="text-xs truncate">{amenity.name}</span>
                      {isSelected && <Check className="h-3 w-3 ml-auto text-primary shrink-0" />}
                    </button>
                  );
                })
              ) : (
                // Default fallback amenities if query hasn't finished
                [
                  { id: 1, name: 'Wi-Fi tốc độ cao', icon: Wifi },
                  { id: 2, name: 'Bãi đỗ xe máy/ô tô', icon: Car },
                  { id: 3, name: 'Cà phê & Trà free', icon: Coffee },
                  { id: 4, name: 'Máy in, Scan', icon: Printer },
                  { id: 5, name: 'Máy chiếu / TV', icon: Tv },
                  { id: 6, name: 'Phone booth cách âm', icon: PhoneCall }
                ].map((a) => {
                  const isSelected = draft.amenityIds.includes(a.id);
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAmenity(a.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border/60 hover:border-border hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span className="text-xs truncate">{a.name}</span>
                      {isSelected && <Check className="h-3 w-3 ml-auto text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Section 5: Đánh giá tối thiểu (Rating) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>Điểm đánh giá từ khách hàng</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map((opt) => {
                const isSelected = draft.minRating === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, minRating: opt.value }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                    }`}
                  >
                    {opt.value && <Star className="h-3 w-3 fill-current" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDraft}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Đặt lại bộ lọc</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApply}
              className="text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Áp dụng bộ lọc {activeCount > 0 && `(${activeCount})`}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

