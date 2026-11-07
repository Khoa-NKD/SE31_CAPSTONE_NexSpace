import React from 'react';
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
  Loader2,
  Building2,
  Coffee,
  Palette,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkspaceFilterBarProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  category?: string;
  onCategoryChange?: (val: string) => void;
  totalCount?: number;
  // Geolocation & Near Me Proximity
  isNearMeActive?: boolean;
  onToggleNearMe?: () => void;
  radiusKm?: number;
  onRadiusKmChange?: (val: number) => void;
  isLocating?: boolean;
}

const CATEGORIES = [
  { id: '', label: 'Tất cả', icon: null },
  { id: 'coworking_hub', label: 'Coworking Hub', icon: Building2 },
  { id: 'business_lounge', label: 'Business Lounge', icon: Coffee },
  { id: 'creative_studio', label: 'Creative Studio', icon: Palette },
  { id: 'serviced_office', label: 'Serviced Office', icon: Briefcase }
];

export function WorkspaceFilterBar({
  search = '',
  onSearchChange,
  category = '',
  onCategoryChange,
  totalCount,
  isNearMeActive = false,
  onToggleNearMe,
  radiusKm = 10,
  onRadiusKmChange,
  isLocating = false
}: WorkspaceFilterBarProps) {
  return (
    <section className="relative z-40 w-full border-b border-border bg-card shadow-xs">
      {/* Tier 1: Primary Search, Near Me GPS & Filter Triggers */}
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-2.5 lg:px-10">
        {/* Left Side: Search & Geolocation */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[300px]">
          {/* Location / Search Field */}
          <div className="relative min-w-[220px] sm:min-w-[280px] flex-1 max-w-md">
            <div className="flex h-10 items-center rounded-lg border border-border bg-background px-3 shadow-2xs transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-border/80">
              <MapPin className="mr-2 h-4 w-4 text-primary shrink-0" />
              <input
                type="text"
                className="w-full truncate border-0 bg-transparent p-0 text-xs sm:text-sm font-medium text-foreground focus:ring-0 focus:outline-none placeholder:text-muted-foreground/70"
                placeholder="Tìm theo tên, địa chỉ, quận, tòa nhà..."
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                aria-label="Tìm kiếm không gian"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => onSearchChange?.('')}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Near Me / Geolocation Proximity Trigger */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant={isNearMeActive ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleNearMe}
              disabled={isLocating}
              className={cn(
                'h-10 px-3.5 gap-2 rounded-lg font-semibold text-xs shadow-2xs transition-all cursor-pointer',
                isNearMeActive
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_8px_rgba(75,65,225,0.25)]'
                  : 'hover:border-primary/60 hover:text-primary'
              )}
            >
              {isLocating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>Định vị GPS...</span>
                </>
              ) : isNearMeActive ? (
                <>
                  <Navigation className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span>Gần tôi ({radiusKm} km)</span>
                  <X className="h-3 w-3 ml-0.5 opacity-80 hover:opacity-100" />
                </>
              ) : (
                <>
                  <LocateFixed className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Gần tôi</span>
                </>
              )}
            </Button>

            {/* Radius Selector when Near Me is active */}
            {isNearMeActive && (
              <div className="flex items-center bg-muted/80 rounded-lg p-0.5 border border-border shadow-2xs">
                {[3, 5, 10, 20].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRadiusKmChange?.(r)}
                    className={cn(
                      'px-2 py-1 text-xs font-bold rounded-md transition-all cursor-pointer',
                      radiusKm === r
                        ? 'bg-card text-primary shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time Picker Field */}
          <div className="relative hidden md:block">
            <div className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 shadow-2xs transition-all hover:border-border/80 text-xs font-medium text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Thời gian đặt chỗ</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Right Side: Filters, Price & View Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Price Range Trigger */}
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground shadow-2xs transition-all hover:bg-muted/50 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Khoảng giá</span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </button>

          {/* More Filters Modal Trigger */}
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground shadow-2xs transition-all hover:bg-muted/50 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Bộ lọc</span>
            <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
              3
            </span>
          </button>

          {/* Split View vs Grid Only Toggle */}
          <div className="ml-1 flex items-center rounded-lg border border-border bg-muted/60 p-0.5">
            <button
              type="button"
              aria-label="Split Map View"
              title="Chia đôi bản đồ & danh sách"
              className="rounded bg-card p-1.5 text-primary shadow-2xs cursor-pointer"
            >
              <Sidebar className="block h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Grid Only View"
              title="Chỉ hiển thị danh sách"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-card/50 hover:text-foreground cursor-pointer"
            >
              <Grid className="block h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Space Type Category Filter Strip (Never clipped, horizontally scrollable) */}
      <div className="border-t border-border/50 bg-muted/20 px-6 py-2 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id || (!category && cat.id === '');
            const Icon = cat.icon;

            return (
              <button
                key={cat.id || 'all'}
                type="button"
                onClick={() => onCategoryChange?.(category === cat.id && cat.id !== '' ? '' : cat.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground border border-border/60'
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{cat.label}</span>
                {cat.id === '' && totalCount !== undefined && (
                  <span
                    className={cn(
                      'ml-1 text-[11px] font-mono px-1.5 py-0.2 rounded-full',
                      isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {totalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
