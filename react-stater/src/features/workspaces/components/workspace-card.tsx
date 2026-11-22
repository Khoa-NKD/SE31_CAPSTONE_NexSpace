import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Zap,
  Heart,
  Star,
  Clock,
  MapPin,
  Wifi,
  Briefcase,
  Coffee,
  Monitor,
  DoorClosed,
  Trees,
  Calendar,
  Shield,
  Printer,
  Car,
  Building,
  ArrowRight
} from '@/components/ui/hugeicons';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PublicWorkspaceSummary } from '../api/types';
import { useCurrency } from '@/features/landing/context/currency-context';

export interface Workspace {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  pricePerHour: number;
  pricePerDay: number;
  availableDesks: number;
  imageUrl: string;
  imageAlt: string;
  tags: string[];
  amenities: { icon: string; label: string }[];
  isFastFilling?: boolean;
}

export type WorkspaceItem = PublicWorkspaceSummary | Workspace;

interface WorkspaceCardProps {
  workspace: WorkspaceItem;
  isActive?: boolean;
  onHover?: (id: string | null) => void;
}

const iconMap: Record<string, React.ElementType> = {
  wifi: Wifi,
  desk: Briefcase,
  coffee: Coffee,
  clock: Clock,
  monitor: Monitor,
  door: DoorClosed,
  quiet: DoorClosed,
  park: Trees,
  calendar: Calendar,
  shield: Shield,
  print: Printer,
  car: Car
};

export function WorkspaceCard({ workspace, isActive, onHover }: WorkspaceCardProps) {
  const { formatPrice } = useCurrency();
  const [imageError, setImageError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const id = workspace.id;
  const name = workspace.name;
  const rating = workspace.rating || 0;
  const reviews =
    'reviewsCount' in workspace
      ? workspace.reviewsCount
      : 'reviews' in workspace
      ? workspace.reviews
      : 0;
  const pricePerHour = workspace.pricePerHour || 0;
  const pricePerDay = workspace.pricePerDay || 0;
  const availableDesks =
    'capacityDesks' in workspace
      ? workspace.capacityDesks ?? 0
      : 'availableDesks' in workspace
      ? workspace.availableDesks
      : 0;

  const district =
    'district' in workspace && workspace.district
      ? workspace.district
      : '';
  const city =
    'city' in workspace && workspace.city
      ? workspace.city
      : '';

  const locationSummary = district && city ? `${district}, ${city}` : district || city || 'Đà Nẵng';

  const address =
    'streetAddress' in workspace && workspace.streetAddress
      ? workspace.streetAddress
      : 'address' in workspace && workspace.address
      ? workspace.address
      : locationSummary;

  const distanceKmVal =
    'distanceKm' in workspace && typeof workspace.distanceKm === 'number'
      ? workspace.distanceKm
      : undefined;

  const distanceText =
    distanceKmVal !== undefined
      ? distanceKmVal < 1
        ? `${Math.round(distanceKmVal * 1000)}m`
        : `${distanceKmVal.toFixed(1)}km`
      : 'distance' in workspace && workspace.distance
      ? workspace.distance
      : '';

  const rawImageUrl =
    'coverImageUrl' in workspace && workspace.coverImageUrl
      ? workspace.coverImageUrl
      : 'imageUrl' in workspace && workspace.imageUrl
      ? workspace.imageUrl
      : '';

  const fallbackImage =
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';

  const imageSrc = imageError || !rawImageUrl ? fallbackImage : rawImageUrl;
  const isFastFilling = 'isFastFilling' in workspace ? workspace.isFastFilling : false;
  const categoryLabel =
    'category' in workspace && workspace.category
      ? workspace.category.replace(/_/g, ' ')
      : 'Coworking Hub';

  const normalizedAmenities: { icon: string; label: string }[] = React.useMemo(() => {
    if (!workspace.amenities || !Array.isArray(workspace.amenities)) return [];
    return workspace.amenities.slice(0, 3).map((a) => {
      if (typeof a === 'string') {
        const lower = a.toLowerCase();
        let icon = 'wifi';
        if (lower.includes('desk') || lower.includes('chair')) icon = 'desk';
        else if (lower.includes('coffee') || lower.includes('cafe')) icon = 'coffee';
        else if (lower.includes('hour') || lower.includes('24/7') || lower.includes('clock')) icon = 'clock';
        else if (lower.includes('monitor') || lower.includes('screen')) icon = 'monitor';
        else if (lower.includes('pod') || lower.includes('room') || lower.includes('door')) icon = 'door';
        else if (lower.includes('park')) icon = 'park';
        else if (lower.includes('print')) icon = 'print';
        else if (lower.includes('car')) icon = 'car';
        return { icon, label: a };
      }
      return a;
    });
  }, [workspace.amenities]);

  return (
    <Link
      to="/workspaces/$workspaceId"
      params={{ workspaceId: String(id) }}
      onMouseEnter={() => onHover?.(String(id))}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'group relative flex flex-col sm:flex-row overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer sm:h-[168px]',
        isActive
          ? 'border-primary ring-2 ring-primary/30 shadow-md bg-card'
          : 'border-border/60 bg-card hover:border-primary/40 hover:shadow-sm'
      )}
    >
      {/* Thumbnail Left (~32% on desktop) */}
      <div className="relative w-full sm:w-[200px] md:w-[215px] h-[140px] sm:h-full shrink-0 overflow-hidden bg-muted">
        <img
          alt={name}
          src={imageSrc}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Status / Feature Badges */}
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1">
          {isFastFilling ? (
            <Badge className="h-5 px-2 text-[10px] font-semibold bg-amber-500/90 hover:bg-amber-500 text-white border-none shadow-xs rounded-full">
              <Clock className="h-2.5 w-2.5 mr-1" />
              Sắp kín
            </Badge>
          ) : (
            <Badge className="h-5 px-2 text-[10px] font-semibold bg-emerald-600/90 hover:bg-emerald-600 text-white border-none shadow-xs rounded-full">
              <Building className="h-2.5 w-2.5 mr-1" />
              Xác thực
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          aria-label="Lưu vào danh sách yêu thích"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsSaved(!isSaved);
          }}
          className={cn(
            'absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-xs backdrop-blur-md transition-all duration-200 cursor-pointer',
            isSaved
              ? 'bg-red-500 text-white'
              : 'bg-background/80 text-foreground hover:bg-background hover:text-red-500 hover:scale-110 active:scale-95'
          )}
        >
          <Heart className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} />
        </button>
      </div>

      {/* Content Right */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 min-w-0">
        {/* Row 1: District/City, Distance & Rating */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary truncate">
                {locationSummary}
              </span>
              {distanceText && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <MapPin className="h-2.5 w-2.5" />
                  {distanceText}
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex shrink-0 items-center gap-1">
              {rating > 0 ? (
                <>
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span className="text-xs font-bold text-foreground leading-none">{rating.toFixed(1)}</span>
                  {reviews > 0 && (
                    <span className="text-[10px] text-muted-foreground leading-none">
                      ({reviews})
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                  Mới
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="mt-1 text-sm sm:text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-1">
            {name}
          </h3>

          {/* Address */}
          <div className="mt-0.5 flex items-center text-xs text-muted-foreground gap-1">
            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{address}</span>
          </div>
        </div>

        {/* Row 2: Specs & Amenities Chips */}
        <div className="my-1.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center text-[10.5px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
            {availableDesks > 0 ? `${availableDesks} chỗ làm việc` : categoryLabel}
          </span>
          {normalizedAmenities.map((amenity, idx) => {
            const Icon = iconMap[amenity.icon] || Zap;
            return (
              <span
                key={idx}
                className="hidden sm:inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/30"
              >
                <Icon className="h-2.5 w-2.5 text-muted-foreground/70" />
                <span className="truncate max-w-[80px]">{amenity.label}</span>
              </span>
            );
          })}
        </div>

        {/* Row 3: Price & Action */}
        <div className="pt-2 flex items-center justify-between border-t border-border/40">
          <div className="flex items-baseline gap-1">
            {pricePerHour > 0 ? (
              <>
                <span className="text-[11px] text-muted-foreground">Từ</span>
                <span className="text-sm sm:text-base font-bold text-foreground">
                  {formatPrice(pricePerHour)}
                </span>
                <span className="text-[11px] text-muted-foreground">/giờ</span>
              </>
            ) : (
              <span className="text-xs font-bold text-primary">Liên hệ báo giá</span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            <span>Chi tiết</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
