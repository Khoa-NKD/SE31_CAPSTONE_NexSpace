import React from 'react';
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
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PublicWorkspaceSummary } from '../api/types';

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

import { useCurrency } from '@/features/landing/context/currency-context';

export function WorkspaceCard({ workspace, isActive }: WorkspaceCardProps) {
  const { formatPrice } = useCurrency();

  const id = workspace.id;
  const name = workspace.name;
  const rating = workspace.rating || 0;
  const reviews = 'reviewsCount' in workspace ? workspace.reviewsCount : ('reviews' in workspace ? workspace.reviews : 0);
  const pricePerHour = workspace.pricePerHour || 0;
  const pricePerDay = workspace.pricePerDay || 0;
  const availableDesks = 'capacityDesks' in workspace ? (workspace.capacityDesks ?? 0) : ('availableDesks' in workspace ? workspace.availableDesks : 0);

  const neighborhood =
    'district' in workspace && workspace.district
      ? `${workspace.district}${workspace.city ? `, ${workspace.city}` : ''}`
      : 'neighborhood' in workspace && workspace.neighborhood
      ? workspace.neighborhood
      : 'city' in workspace && workspace.city
      ? workspace.city
      : 'Location upon request';

  const address =
    'streetAddress' in workspace && workspace.streetAddress
      ? workspace.streetAddress
      : 'address' in workspace && workspace.address
      ? workspace.address
      : '';

  const distanceKmVal =
    'distanceKm' in workspace && typeof workspace.distanceKm === 'number'
      ? workspace.distanceKm
      : undefined;

  const distance =
    distanceKmVal !== undefined
      ? distanceKmVal < 1
        ? `${Math.round(distanceKmVal * 1000)} m`
        : `${distanceKmVal.toFixed(1)} km`
      : 'distance' in workspace && workspace.distance
      ? workspace.distance
      : '';

  const imageUrl =
    'coverImageUrl' in workspace && workspace.coverImageUrl
      ? workspace.coverImageUrl
      : 'imageUrl' in workspace && workspace.imageUrl
      ? workspace.imageUrl
      : 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80';

  const imageAlt = 'imageAlt' in workspace ? workspace.imageAlt : name;
  const tags = workspace.tags || [];
  const isFastFilling = 'isFastFilling' in workspace ? workspace.isFastFilling : false;

  const normalizedAmenities: { icon: string; label: string }[] = React.useMemo(() => {
    if (!workspace.amenities || !Array.isArray(workspace.amenities)) return [];
    return workspace.amenities.slice(0, 4).map((a) => {
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
      params={{ workspaceId: id }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border transition-all duration-200 shrink-0 flex flex-col sm:flex-row sm:min-h-[175px] hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
        isActive
          ? 'ring-2 ring-primary shadow-md shadow-primary/10 border-transparent bg-card'
          : 'border-border/60 hover:border-primary/40 bg-card/60 hover:bg-card shadow-xs'
      )}
    >
      {/* Photo */}
      <div className="relative shrink-0 overflow-hidden bg-muted w-full h-[160px] sm:h-auto sm:w-[230px]">
        <img
          alt={imageAlt}
          src={imageUrl}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {isFastFilling ? (
            <Badge variant="secondary" className="flex items-center gap-1 border-amber-500/20 bg-amber-500/90 text-white hover:bg-amber-500 px-2 py-0.5 h-5 text-[10px] rounded-full font-semibold shadow-xs backdrop-blur-md cursor-default">
              <Clock className="h-3 w-3" />
              Sắp kín chỗ
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 border-primary/20 bg-primary/90 text-white hover:bg-primary px-2 py-0.5 h-5 text-[10px] rounded-full font-semibold shadow-xs backdrop-blur-md cursor-default">
              <Building className="h-3 w-3" />
              Không gian xác thực
            </Badge>
          )}
          {tags.includes('Verified Host') && (
            <Badge variant="outline" className="bg-background/95 text-foreground shadow-2xs px-2 py-0.5 h-5 text-[10px] rounded-full font-semibold border-none cursor-default">
              Đối tác chiến lược
            </Badge>
          )}
        </div>

        <button
          aria-label="Lưu vào danh sách yêu thích"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-red-50 hover:text-red-500 hover:scale-110 active:scale-90 dark:hover:bg-red-500/20 cursor-pointer"
        >
          <Heart className="h-3.5 w-3.5 transition-transform duration-200 active:scale-75" />
        </button>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-4">
        {/* Header: Neighborhood, Proximity Badge & Rating */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary truncate block">
              {neighborhood}
            </span>
            {distance && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 shadow-2xs">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {distance}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {rating > 0 ? (
              <>
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="text-xs font-bold text-foreground leading-none">{rating.toFixed(1)}</span>
                <span className="text-[11px] text-muted-foreground hidden sm:inline-block leading-none">
                  ({reviews})
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                Mới
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-base font-bold leading-tight text-foreground transition-colors hover:text-primary cursor-pointer line-clamp-1 pr-4 mt-1">
          {name}
        </h2>

        {/* Location Address */}
        <div className="mt-1 flex items-center text-xs text-muted-foreground gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate">{address || neighborhood}</span>
        </div>

        {/* Amenities Chips */}
        {normalizedAmenities.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {normalizedAmenities.map((amenity, idx) => {
              const Icon = iconMap[amenity.icon] || Zap;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/40"
                >
                  <Icon className="h-3 w-3 text-muted-foreground/70" />
                  <span>{amenity.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer: Price & Availability */}
        <div className="mt-auto pt-3 flex items-end justify-between border-t border-border/40">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">
              {availableDesks > 0 ? (
                <>
                  <span className="text-foreground font-semibold">{availableDesks} chỗ</span> làm việc
                </>
              ) : (
                <span>Sức chứa linh hoạt</span>
              )}
            </span>
          </div>
          <div className="flex flex-col items-end">
            {pricePerHour > 0 ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-bold text-foreground leading-none">
                    {formatPrice(pricePerHour)}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">/giờ</span>
                </div>
                {pricePerDay > 0 && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    {formatPrice(pricePerDay)}/ngày
                  </span>
                )}
              </>
            ) : (
              <div className="flex flex-col items-end">
                <span className="text-xs sm:text-sm font-bold text-primary">Liên hệ báo giá</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">Theo nhu cầu</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

