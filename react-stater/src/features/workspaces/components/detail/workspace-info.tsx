import { BadgeCheck, Building, Clock, MapPin, Shield, ShieldCheck, Star, Users, Volume1, Wifi, Armchair, Coffee, PhoneCall, Printer, Video, Lock, Accessibility, HeadphonesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WorkspaceInfo() {
  return (
    <div className="lg:col-span-8 space-y-8">
      {/* Header Info Block */}
      <div>
        {/* Verified Prime Location Badge */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider mb-3">
          <BadgeCheck className="w-3.5 h-3.5" />
          VERIFIED PRIME LOCATION
        </div>
        <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight mb-2.5">
          NexSpace Central Tower — Executive Co-working Hub
        </h1>
        {/* Rating & Location line */}
        <div className="flex flex-wrap items-center gap-y-2 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1 text-foreground font-semibold">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            4.9
          </span>
          <span className="text-muted-foreground/50 mx-1.5">•</span>
          <a className="underline decoration-border hover:text-primary transition-colors font-medium" href="#reviews">128 reviews</a>
          <span className="text-muted-foreground/50 mx-1.5">•</span>
          <span className="flex items-center gap-1 text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            72 Le Thanh Ton, Ben Nghe, District 1, Ho Chi Minh City
          </span>
          <a className="ml-2 text-primary font-semibold hover:underline text-[13px]" href="#map-section">View on Map</a>
        </div>
        {/* Host Operator Pill */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border max-w-xl">
          <div className="w-10 h-10 rounded-full bg-primary/10 border overflow-hidden flex-shrink-0">
            <img alt="NexSpace Prime Partners Management" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDM8V5b7m4hkuEfxkeS3hJvtRrZ9LCzaXseRoYSgMtdLiTziLAG_tuuv0VJaASMSFhRU--dikC0BtVxHat3SAg0243iwagf7Qzz1t2ePHBWsuhB-0CapyviLekDXRpeWjz0k_M11FT3Tcu8jumGzjEn14HWI-PRr-fNWkf29ANwZVwrtQelJMRO1HYk9TDSUhxFqL1eLgtSbhW61mPHC5smrzM2V8dF5E9KW16iu3lY-300--c7SCIGig" />
          </div>
          <div className="text-[13px]">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              Operated by NexSpace Prime Partners
              <BadgeCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="text-muted-foreground text-[12px] font-medium">
              Verified Enterprise Real Estate Partner • DPI License #0312345678
            </div>
          </div>
        </div>
      </div>
      <hr className="border-border" />
      {/* Overview & Description Narrative */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">About this Workspace</h2>
        <div className="space-y-3.5 text-sm text-muted-foreground leading-relaxed">
          <p>
            Anchored on the 14th and 15th floors of the premier Central Tower in District 1, this executive coworking enclave merges Grade-A architectural construction with the agile velocity of modern business infrastructure. Crafted specifically for scale-up engineering teams, corporate satellite outposts, and discerning remote leaders, the hub balances soundproof productivity zones with panoramic natural daylight across the Saigon skyline.
          </p>
          <p>
            Each flex node provides immediate plug-and-play access to dedicated enterprise fiber networks, redundant power systems, and world-class Herman Miller ergonomic task seating. Beyond individual workstations, members enjoy unlimited artisanal espresso from our barista counter, secure biometric access, and direct elevator connectivity to prime financial institutions and Michelin-guide dining options.
          </p>
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
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">54 Flex Nodes &amp; 6 Meeting Rooms</div>
          </div>
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Volume1 className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Noise Profile</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">Quiet Focus &amp; Dynamic Cafe Zones</div>
          </div>
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Access Security</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">24/7 RFID Keycard &amp; SOC-2 Compliant</div>
          </div>
          <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Elevation</div>
            <div className="font-semibold text-[13px] text-card-foreground mt-0.5">Level 14 &amp; 15 (Panoramic Skyline)</div>
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
      {/* Verified Customer Reviews Section */}
      <div className="pt-2" id="reviews">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Customer Reviews</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-5 h-5 fill-amber-500" />)}
              </div>
              <span className="text-sm font-bold text-foreground">4.9 out of 5</span>
              <span className="text-muted-foreground/60 text-[13px]">(128 verified bookings)</span>
            </div>
          </div>
          <Button variant="outline" className="shadow-sm active:scale-[0.98] self-start sm:self-auto">
            Show all 128 reviews
          </Button>
        </div>
        {/* Rating breakdown bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-muted border mb-6 text-[12px]">
          {[
            { label: 'WiFi Speed', score: '5.0', width: '98%' },
            { label: 'Noise & Focus', score: '4.8', width: '95%' },
            { label: 'Ergonomics', score: '4.9', width: '99%' },
            { label: 'Hospitality', score: '4.9', width: '97%' }
          ].map((stat, idx) => (
            <div key={idx}>
              <div className="text-muted-foreground mb-1 font-medium">{stat.label}</div>
              <div className="flex items-center gap-2">
                <div className="w-full bg-primary/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: stat.width }}></div>
                </div>
                <span className="font-bold text-foreground">{stat.score}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Two featured reviews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border overflow-hidden">
                  <img alt="An Nguyen avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6-fkolEFGd_A8vGaFgOs9pGA3KvdszWC1nXeeMz_M2lr-7EB--3e9SMhtDMGFG5YqbsSIwW6Br89Td3i6UgUU3OGVrGaJQA7loQ0uDyM3zoIxDKktpfwo99Q4CeP1iPWazACHcDRwpa_HpACCJo1StHyVTTLJScnhrHE4YFPCavsvdiE2XEJQlWMAPvLX9ct-JGRthN3cyFOPipm19zCWvxCkkVqK3NSBdA74xZV62DeynurhG4yr8w" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-card-foreground">An Nguyen</h3>
                  <div className="text-[11px] font-semibold tracking-wide text-muted-foreground">Tech Lead at FinTech Corp • Jan 2026</div>
                </div>
              </div>
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-500" />)}
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              "Incredible workspace. Fiber internet is ultra-fast and the Herman Miller chairs made a huge difference during long sprint weeks. The phone booths are truly soundproof, which allowed our team to handle investor calls without audio bleed."
            </p>
          </div>
          <div className="p-5 rounded-xl border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border overflow-hidden">
                  <img alt="Sarah Jenkins avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNEP8QOGiZG3OV4VZnkBsFtT8pw9uPQh39vJhFTDVofss3sclKCExIqahTgjvPR6HMKnshB9hr760xQ4_DSo8X4vh8ZRnjdaAxPadEM8FWy8Z-XPPb4TMQG_B12Rt2jfJ5D0rQ7Cu7UM7i8ZfOoeXdW609eVGgn-0a_jXHgc_Yp2U4AqeI-uhxxWS5RkuwfynNXh04W4JkN7rXEpEsKm6nop8T0Hbobed6eA8oHdVVr47ZWbYTc2l3gg" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-card-foreground">Sarah Jenkins</h3>
                  <div className="text-[11px] font-semibold tracking-wide text-muted-foreground">Design Director • Jan 2026</div>
                </div>
              </div>
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-500" />)}
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              "The natural light and coffee bar are top tier. Meeting rooms have seamless AirPlay and Google Meet setup with zero lag. Our clients were thoroughly impressed with the 14th floor city vista during our strategy session."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

