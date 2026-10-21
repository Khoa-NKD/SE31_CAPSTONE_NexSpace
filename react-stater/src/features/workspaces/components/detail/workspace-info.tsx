import { BadgeCheck, Building, Clock, MapPin, Shield, ShieldCheck, Star, Users, Volume1, Wifi, Armchair, Coffee, PhoneCall, Printer, Video, Lock, Accessibility, HeadphonesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicWorkspaceDetail } from '../../api/types';

interface WorkspaceInfoProps {
  workspace?: PublicWorkspaceDetail;
}

export function WorkspaceInfo({ workspace }: WorkspaceInfoProps) {
  const name = workspace?.name || 'NexSpace Central Tower — Executive Co-working Hub';
  const rating = workspace?.rating ?? 4.9;
  const fullAddress = workspace
    ? `${workspace.streetAddress ? `${workspace.streetAddress}, ` : ''}${workspace.district ? `${workspace.district}, ` : ''}${workspace.city || 'Ho Chi Minh City'}`
    : '72 Le Thanh Ton, Ben Nghe, District 1, Ho Chi Minh City';
  const organizerName = workspace?.organizerLegalName || 'NexSpace Prime Partners';
  const organizerVerified = workspace?.organizerVerified ?? true;
  const description =
    workspace?.description ||
    workspace?.shortDescription ||
    'Anchored in prime central real estate, this executive coworking enclave merges Grade-A construction with modern business velocity. Crafted specifically for scale-up teams, corporate satellites, and remote leaders, the space balances soundproof productivity zones with natural daylight.';
  const capacityDesks = workspace?.capacityDesks ?? 54;
  const meetingRooms = workspace?.meetingRooms ?? 6;
  const usableArea = workspace?.usableAreaSqm ? `${workspace.usableAreaSqm} m² Usable Area` : 'Level 14 & 15 (Panoramic Skyline)';

  return (
    <div className="lg:col-span-8 space-y-8">
      {/* Header Info Block */}
      <div>
        {/* Prime Location Badge */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider mb-3">
          <BadgeCheck className="w-3.5 h-3.5" />
          PRIME METRO LOCATION
        </div>
        <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight mb-2.5">
          {name}
        </h1>
        {/* Rating & Location line */}
        <div className="flex flex-wrap items-center gap-y-2 text-sm text-muted-foreground mb-4">
          {rating > 0 && (
            <>
              <span className="flex items-center gap-1 text-foreground font-semibold">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                {rating}
              </span>
              <span className="text-muted-foreground/50 mx-1.5">•</span>
              <a className="underline decoration-border hover:text-primary transition-colors font-medium text-xs text-muted-foreground" href="#reviews">
                Preview rating
              </a>
              <span className="text-muted-foreground/50 mx-1.5">•</span>
            </>
          )}
          <span className="flex items-center gap-1 text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            {fullAddress}
          </span>
          <a className="ml-2 text-primary font-semibold hover:underline text-[13px]" href="#map-section">View on Map</a>
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
              Registered Workspace Partner
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
        <h3 className="text-base font-semibold text-foreground mb-3.5">Campus Specifications</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Capacity</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">{capacityDesks} Flex Nodes &amp; {meetingRooms} Meeting Rooms</div>
          </div>
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Volume1 className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Noise Profile</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">Quiet Focus &amp; Dynamic Zones</div>
          </div>
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Access Security</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">Instant Digital Key &amp; Secure Entry</div>
          </div>
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Elevation</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">{usableArea}</div>
          </div>
        </div>
      </div>
      {/* Amenities Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3.5">Included High-Performance Amenities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {[
            { icon: Wifi, title: "Gigabit Fiber WiFi", desc: "1000 Mbps symmetrical low-latency connection with failover backup." },
            { icon: Armchair, title: "Ergonomic Task Chairs", desc: "Genuine Herman Miller Aeron & Steelcase Gesture seating at all stations." },
            { icon: Coffee, title: "Artisanal Barista Bar", desc: "Complimentary specialty single-origin espresso and organic cold teas." },
            { icon: PhoneCall, title: "Soundproof Phone Pods", desc: "Four isolated acoustic booths for confidential client & investor calls." },
            { icon: Printer, title: "Cloud Printing & Scan", desc: "Secure encrypted color laser printing via mobile tap & scan terminal." },
            { icon: Video, title: "Podcast & Media Studio", desc: "Acoustically tuned room with Shure mics and 4K streaming lighting." },
            { icon: Lock, title: "Secure Keypad Lockers", desc: "Day-use digital lockers and registered enterprise business mail handling." },
            { icon: Accessibility, title: "Wellness & Parent Room", desc: "Private nursing retreat and quiet meditation space with dimmed lighting." },
            { icon: HeadphonesIcon, title: "Dedicated Concierge", desc: "On-site Community Manager greeting guests and IT hardware support." }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors shadow-sm group">
              <item.icon className="text-primary w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm text-card-foreground font-semibold">{item.title}</div>
              <p className="text-[13px] text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Operating Hours & Access Block */}
      <div className="p-5 rounded-2xl bg-muted border flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-background border flex items-center justify-center text-primary shadow-sm flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Operating Hours &amp; Building Access</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">Flexible day-pass check-in opens promptly at 08:00 AM.</p>
            <div className="mt-2 text-[12px] font-medium text-primary flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              24/7 dedicated biometric access enabled for Monthly Dedicated Suite members.
            </div>
          </div>
        </div>
        <div className="bg-card px-4 py-3 rounded-xl border text-[13px] space-y-1 min-w-[220px]">
          <div className="flex justify-between items-center text-card-foreground">
            <span className="text-muted-foreground font-medium">Mon - Fri:</span>
            <span className="font-semibold">08:00 AM – 10:00 PM</span>
          </div>
          <div className="flex justify-between items-center text-card-foreground">
            <span className="text-muted-foreground font-medium">Sat - Sun:</span>
            <span className="font-semibold">09:00 AM – 06:00 PM</span>
          </div>
        </div>
      </div>
      {/* Location & Neighborhood highlights with mini map */}
      <div id="map-section">
        <h2 className="text-lg font-semibold text-foreground mb-3.5">Prime CBD District 1 Location</h2>
        <div className="p-4 rounded-2xl border bg-card shadow-sm space-y-4">
          <div className="relative w-full h-[220px] rounded-xl overflow-hidden border bg-slate-100 dark:bg-slate-800">
            <img alt="Map of District 1 Saigon" className="w-full h-full object-cover dark:opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9Fg7hMslq-EaQyS27sv70qkTroFu0gamcDzD2amEBsCvDisxTQ5t2KYH1LwaCa6HYK4-xlYIVJyaLzuvx2GJwUogJXdKAFGoEft6mAybnWVKm5eBLFOPjRyKPQp8oXjHr_XS_Vtt5g86SYVwhx0-zv8wkLtYKk-hcJ93XPZnn302bYqituSfdA9XzEm5umLY-OEEwne674vgWkpxxBj8UpFGKMOjClOeFYU601-gumP5xeGQF-mx6SQ" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground font-bold text-[11px] px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 ring-4 ring-primary/20">
              <Building className="w-4 h-4" />
              NexSpace Central Tower (L14)
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {['Vincom Center (2 min walk)', 'Saigon Opera House (4 min)', 'Nguyen Hue Walking St. (5 min)'].map((loc, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted border">
                <MapPin className="text-primary w-5 h-5" />
                <span className="text-[13px] font-medium text-foreground">{loc}</span>
              </div>
            ))}
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
                      i <= Math.round(rating || 4.5) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'
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

