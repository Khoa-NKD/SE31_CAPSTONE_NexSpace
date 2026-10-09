import React from 'react';
import { MapPin, Calendar, X, SlidersHorizontal, Filter, Sidebar, Grid, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function WorkspaceFilterBar() {
  return (
    <section className="relative z-40 w-full border-b border-border bg-card px-6 py-3 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] lg:px-12">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        {/* Primary Input Triggers */}
        <div className="flex min-w-[520px] flex-1 items-center gap-2.5">
          {/* Location Picker Field */}
          <div className="relative min-w-[260px] flex-1">
            <div className="flex h-11 items-center rounded-lg border border-border bg-card px-3.5 shadow-sm transition-all focus-within:border-[#4b41e1] focus-within:ring-2 focus-within:ring-[#4b41e1]/20 hover:border-border/80">
              <MapPin className="mr-2 h-5 w-5 text-[#4b41e1]" />
              <div className="flex-1 overflow-hidden">
                <span className="block text-[11px] font-medium uppercase leading-none tracking-wider text-muted-foreground">
                  Location
                </span>
                <input
                  type="text"
                  className="w-full truncate border-0 bg-transparent p-0 text-sm font-semibold text-foreground focus:ring-0"
                  placeholder="Search destination..."
                  defaultValue="District 1, Ho Chi Minh City"
                />
              </div>
              <button
                aria-label="Clear location"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Date & Time Picker Field */}
          <div className="relative w-[240px]">
            <div className="flex h-11 cursor-pointer items-center rounded-lg border border-border bg-card px-3.5 shadow-sm transition-all focus-within:border-[#4b41e1] focus-within:ring-2 focus-within:ring-[#4b41e1]/20 hover:border-border/80">
              <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <span className="block text-[11px] font-medium uppercase leading-none tracking-wider text-muted-foreground">
                  Date & Time
                </span>
                <span className="block truncate text-sm font-semibold text-foreground">
                  Today, 09:00 - 18:00
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
            </div>
          </div>
        </div>

        {/* Segmented Space Type Filter Chips */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-muted p-1 xl:flex">
          <Button size="sm" className="h-8 shadow-sm transition-all active:scale-95 bg-[#4b41e1] text-white hover:bg-[#4338ca] cursor-pointer">
            All (24)
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:bg-card/60 hover:text-foreground cursor-pointer">
            Hot Desk
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:bg-card/60 hover:text-foreground cursor-pointer">
            Dedicated Desk
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:bg-card/60 hover:text-foreground cursor-pointer">
            Meeting Room
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:bg-card/60 hover:text-foreground cursor-pointer">
            Private Office
          </Button>
        </div>

        {/* Price & Secondary Modal Filter Buttons + View Toggle */}
        <div className="flex items-center gap-2">
          {/* Price Range Trigger */}
          <button className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-background hover:border-border/80 cursor-pointer">
            <SlidersHorizontal className="h-[18px] w-[18px] text-muted-foreground" />
            <span>$2 - $20/hr</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#4b41e1]" />
          </button>

          {/* More Filters Modal Trigger */}
          <button className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-background hover:border-border/80 cursor-pointer">
            <Filter className="h-[18px] w-[18px] text-muted-foreground" />
            <span>More Filters</span>
            <span className="rounded-full bg-[#4b41e1]/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#4b41e1]">
              3
            </span>
          </button>

          {/* Split View vs Grid Only Toggle */}
          <div className="ml-1 flex items-center rounded-lg border border-border bg-muted p-1">
            <button
              aria-label="Split Map View"
              title="Split Map View"
              className="rounded bg-card p-1.5 text-[#4b41e1] shadow-sm cursor-pointer"
            >
              <Sidebar className="block h-[18px] w-[18px]" />
            </button>
            <button
              aria-label="Grid Only View"
              title="Grid Only View"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-card/50 hover:text-foreground cursor-pointer"
            >
              <Grid className="block h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
