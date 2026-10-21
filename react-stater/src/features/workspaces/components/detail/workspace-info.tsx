import React from 'react';
import {
  BadgeCheck,
  Building,
  Clock,
  MapPin,
  Shield,
  Star,
  Users,
  Wifi,
  Armchair,
  Coffee,
  PhoneCall,
  Printer,
  Video,
  Lock,
  CalendarCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicWorkspaceDetail, WorkspaceOperatingHour } from '../../api/types';

interface WorkspaceInfoProps {
  workspace?: PublicWorkspaceDetail;
}

const amenityIconMap: Record<string, React.ElementType> = {
  wifi: Wifi,
  internet: Wifi,
  fiber: Wifi,
  desk: Armchair,
  chair: Armchair,
  furniture: Armchair,
  seating: Armchair,
  coffee: Coffee,
  tea: Coffee,
  beverage: Coffee,
  phone: PhoneCall,
  call: PhoneCall,
  booth: PhoneCall,
  print: Printer,
  scanner: Printer,
  copy: Printer,
  video: Video,
  meeting: Video,
  screen: Video,
  locker: Lock,
  security: Lock,
  storage: Lock
};

function getAmenityIcon(name: string): React.ElementType {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(amenityIconMap)) {
    if (lower.includes(key)) return icon;
  }
  return Building;
}

function formatDayOfWeek(day: number): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days[day - 1] || `Day ${day}`;
}

export function WorkspaceInfo({ workspace }: WorkspaceInfoProps) {
  const name = workspace?.name || 'Workspace';
  const rating = typeof workspace?.rating === 'number' ? workspace.rating : 0;

  const addressParts = [
    workspace?.streetAddress,
    workspace?.buildingName,
    workspace?.district,
    workspace?.city
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address available upon booking';

  const organizerName = workspace?.organizerLegalName || 'Registered Host';
  const organizerVerified = Boolean(workspace?.organizerVerified);

  const description =
    workspace?.description ||
    workspace?.shortDescription ||
    'No description has been provided by the host for this workspace.';

  const capacityDesks = typeof workspace?.capacityDesks === 'number' ? workspace.capacityDesks : null;
  const meetingRooms = typeof workspace?.meetingRooms === 'number' ? workspace.meetingRooms : null;
  const usableArea =
    typeof workspace?.usableAreaSqm === 'number' && workspace.usableAreaSqm > 0
      ? `${workspace.usableAreaSqm} m² Usable Area`
      : 'Area not specified';

  const categoryLabel = workspace?.category
    ? workspace.category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Commercial Workspace';

  const cityBadge = workspace?.city ? `${workspace.city.toUpperCase()} WORKSPACE` : 'LISTED WORKSPACE';

  // Group operating hours if available
  const operatingHours = workspace?.operatingHours || [];

  return (
    <div className="lg:col-span-8 space-y-8">
      {/* Header Info Block */}
      <div>
        {/* Location Badge */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider mb-3">
          <BadgeCheck className="w-3.5 h-3.5" />
          {cityBadge}
        </div>
        <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight mb-2.5">
          {name}
        </h1>
        {/* Rating & Location line */}
        <div className="flex flex-wrap items-center gap-y-2 text-sm text-muted-foreground mb-4">
          {rating > 0 ? (
            <>
              <span className="flex items-center gap-1 text-foreground font-semibold">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                {rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground/50 mx-1.5">•</span>
              <a className="underline decoration-border hover:text-primary transition-colors font-medium text-xs text-muted-foreground" href="#reviews">
                Preview rating
              </a>
              <span className="text-muted-foreground/50 mx-1.5">•</span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground font-medium">New Workspace</span>
              <span className="text-muted-foreground/50 mx-1.5">•</span>
            </>
          )}
          <span className="flex items-center gap-1 text-foreground">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate max-w-md">{fullAddress}</span>
          </span>
          <a className="ml-2 text-primary font-semibold hover:underline text-[13px]" href="#map-section">View Details</a>
        </div>
        {/* Host Operator Pill */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border max-w-xl">
          <div className="w-10 h-10 rounded-full bg-primary/10 border overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-primary">
            {organizerName.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-[13px]">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              Operated by {organizerName}
              {organizerVerified && <BadgeCheck className="w-4 h-4 text-primary" />}
            </div>
            <div className="text-muted-foreground text-[12px] font-medium">
              {organizerVerified ? 'Verified Workspace Partner' : 'Registered Workspace Host'}
            </div>
          </div>
        </div>
      </div>
      <hr className="border-border" />

      {/* Overview & Description Narrative */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">About this Workspace</h2>
        <div className="space-y-3.5 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          <p>{description}</p>
        </div>
      </div>

      {/* Key Specifications Grid */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3.5">Workspace Specifications</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Specification 1: Capacity */}
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Capacity</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">
              {capacityDesks !== null
                ? `${capacityDesks} Desks${meetingRooms !== null ? ` • ${meetingRooms} Rooms` : ''}`
                : 'Not specified'}
            </div>
          </div>

          {/* Specification 2: Usable Area */}
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Floor Area</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">{usableArea}</div>
          </div>

          {/* Specification 3: Category */}
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">{categoryLabel}</div>
          </div>

          {/* Specification 4: Confirmation Mode */}
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Confirmation</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">
              {workspace?.bookingConfirmationMode === 'Instant' ? 'Instant Booking' : 'Host Review'}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Amenities Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3.5">Included Amenities</h2>
        {workspace?.amenities && workspace.amenities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {workspace.amenities.map((amenity, idx) => {
              const Icon = getAmenityIcon(amenity);
              return (
                <div key={idx} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors shadow-sm group">
                  <Icon className="text-primary w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm text-card-foreground font-semibold">{amenity}</div>
                  <p className="text-[12px] text-muted-foreground mt-1">Available on-site for registered guests.</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-xl border bg-muted/40 text-sm text-muted-foreground">
            No specific amenities listed by the host for this workspace.
          </div>
        )}
      </div>

      {/* Operating Hours & Access Block */}
      <div className="p-5 rounded-2xl bg-muted border flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-background border flex items-center justify-center text-primary shadow-sm flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Operating Hours</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {workspace?.receptionHours
                ? `Reception hours: ${workspace.receptionHours}`
                : 'Schedule governed by host reservation policy.'}
            </p>
          </div>
        </div>
        <div className="bg-card px-4 py-3 rounded-xl border text-[13px] space-y-1 min-w-[220px]">
          {operatingHours.length > 0 ? (
            operatingHours.slice(0, 3).map((h: WorkspaceOperatingHour, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-card-foreground">
                <span className="text-muted-foreground font-medium">Day {formatDayOfWeek(h.dayOfWeek)}:</span>
                <span className="font-semibold">
                  {h.isClosed ? 'Closed' : h.is24Hours ? '24 Hours' : `${h.openTime} – ${h.closeTime}`}
                </span>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-xs italic">
              Schedule details confirmed upon booking.
            </div>
          )}
        </div>
      </div>

      {/* Location Section */}
      <div id="map-section">
        <h2 className="text-lg font-semibold text-foreground mb-3.5">
          {workspace?.city ? `${workspace.city} Location Details` : 'Location Details'}
        </h2>
        <div className="p-5 rounded-2xl border bg-card shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-sm text-foreground">{fullAddress}</div>
              {workspace?.buildingName && (
                <div className="text-xs text-muted-foreground">Building: {workspace.buildingName}</div>
              )}
              {workspace?.entryInstructions && (
                <div className="text-xs text-muted-foreground mt-2 bg-muted p-2.5 rounded-lg border">
                  <span className="font-semibold text-foreground">Entry Notes: </span>
                  {workspace.entryInstructions}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ratings & Feedback Section */}
      <div className="pt-2" id="reviews">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Ratings &amp; Feedback</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-5 h-5',
                      i <= Math.round(rating || 0) && rating > 0
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-foreground">
                {rating > 0 ? `${rating.toFixed(1)} out of 5` : 'New Workspace'}
              </span>
              <span className="text-muted-foreground text-[12px] italic">
                (Preview rating · Customer reviews enabled after confirmed checkout)
              </span>
            </div>
          </div>
        </div>

        {/* Informative placeholder card */}
        <div className="p-6 rounded-xl border bg-muted/40 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            Verified customer reviews will appear here once guests complete their reservations.
          </p>
          <p className="text-xs text-muted-foreground">
            All reviews on NexSpace will be collected exclusively from verified customers after confirmed check-out.
          </p>
        </div>
      </div>
    </div>
  );
}
