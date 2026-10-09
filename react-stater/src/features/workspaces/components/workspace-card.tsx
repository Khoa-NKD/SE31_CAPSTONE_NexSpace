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
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

interface WorkspaceCardProps {
  workspace: Workspace;
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

  return (
    <Link
      to="/workspaces/$workspaceId"
      params={{ workspaceId: workspace.id }}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 shrink-0 flex flex-col sm:flex-row sm:min-h-[170px] hover:-translate-y-1 hover:shadow-lg cursor-pointer',
        isActive
          ? 'border-[#4b41e1] shadow-[0_0_15px_-3px_rgba(75,65,225,0.2)] border-2'
          : 'border-transparent bg-card/40 hover:border-border/80 hover:bg-card shadow-none'
      )}
    >
      {/* Photo */}
      <div className="relative shrink-0 overflow-hidden bg-muted w-full h-[160px] sm:h-auto sm:w-[240px]">
        <img
          alt={workspace.imageAlt}
          src={workspace.imageUrl}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {workspace.isFastFilling ? (
            <Badge variant="secondary" className="flex items-center gap-1 border-amber-500/20 bg-amber-500/90 text-white hover:bg-amber-500 px-2 py-0.5 h-5 text-[10px] rounded font-semibold shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-default">
              <Clock className="h-3 w-3" />
              Fast Filling
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 border-emerald-500/20 bg-emerald-500/90 text-white hover:bg-emerald-500 px-2 py-0.5 h-5 text-[10px] rounded font-semibold shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-default">
              <Zap className="h-3 w-3" />
              Instant Booking
            </Badge>
          )}
          {workspace.tags.includes('Verified Host') && (
            <Badge variant="outline" className="bg-background/95 text-foreground shadow-sm px-2 py-0.5 h-5 text-[10px] rounded font-semibold border-none transition-all duration-200 hover:bg-background hover:scale-105 cursor-default">
              Verified Host
            </Badge>
          )}
        </div>
        
        <button
          aria-label="Save to favorites"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/70 text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-red-50 hover:text-red-500 hover:scale-110 active:scale-90 dark:hover:bg-red-500/20"
        >
          <Heart className="h-3.5 w-3.5 transition-transform duration-200 active:scale-75" />
        </button>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-4">
        {/* Header: Neighborhood & Rating */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4b41e1] truncate block mb-1">
            {workspace.neighborhood}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span className="text-sm font-bold text-foreground leading-none">{workspace.rating}</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline-block leading-none">({workspace.reviews})</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold leading-tight text-foreground transition-colors hover:text-[#4b41e1] cursor-pointer line-clamp-2 pr-4">
          {workspace.name}
        </h2>

        {/* Location / Distance */}
        <div className="mt-1.5 flex items-center text-xs text-muted-foreground gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate">{workspace.address} <span className="hidden sm:inline-block mx-1 text-muted-foreground/40">•</span> <span className="hidden sm:inline-block text-muted-foreground/80">{workspace.distance}</span></span>
        </div>

        {/* Amenities */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {workspace.amenities.map((amenity, idx) => {
            const Icon = iconMap[amenity.icon] || Zap;
            return (
              <div key={idx} className="flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Icon className="h-3 w-3 text-muted-foreground/70" />
                <span>{amenity.label}</span>
              </div>
            );
          })}
        </div>

        {/* Footer: Price & Availability */}
        <div className="mt-auto pt-3 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">
              <span className="text-emerald-500 font-semibold">{workspace.availableDesks} desks</span> available
            </span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground leading-none">{formatPrice(workspace.pricePerHour)}</span>
              <span className="text-[11px] font-medium text-muted-foreground">/hr</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">{formatPrice(workspace.pricePerDay)}/day</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

