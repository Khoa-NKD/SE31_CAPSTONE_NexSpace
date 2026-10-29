import React from 'react';
import {
  Building2,
  ChevronDown,
  Download,
  Plus,
  TableProperties,
  CalendarCheck
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface ScheduleHeaderBarProps {
  bookedCount: number;
  totalCount: number;
  occupancyPercent: number;
  onExport: () => void;
  onNewReservation: () => void;
}

export function ScheduleHeaderBar({
  bookedCount,
  totalCount,
  occupancyPercent,
  onExport,
  onNewReservation
}: ScheduleHeaderBarProps) {
  return (
    <div className="space-y-4 select-none">
      {/* 1. Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap overflow-x-auto">
        <Link to="/dashboard/organizer/workspaces" className="hover:text-foreground transition-colors">
          Workspaces
        </Link>
        <span className="text-border">/</span>
        <span className="hover:text-foreground transition-colors">District 1, HCMC</span>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">NexSpace Saigon Prime Hub</span>
        <span className="text-border">/</span>
        <span className="font-semibold text-primary">Resource Schedule (Gantt View)</span>
      </nav>

      {/* 2. Main Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        {/* Left: Venue Switcher & Live Gantt Feed Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-3.5 bg-card hover:bg-muted border-border font-bold text-foreground text-sm shadow-2xs gap-2"
              >
                <Building2 className="w-4 h-4 text-primary" />
                <span>NexSpace Saigon Prime Hub</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem className="text-xs font-semibold">
                NexSpace Saigon Prime Hub (Level 1-4)
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-muted-foreground">
                NexSpace Innovation Center (District 7)
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-muted-foreground">
                NexSpace Tech Garden (Thu Duc City)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Live Gantt IoT Feed Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-400 animate-in fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">Live Gantt Feed: Active</span>
          </div>
        </div>

        {/* Right: Daily Occupancy badge + Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Daily Occupancy Pill */}
          <div className="hidden xl:flex items-center gap-2.5 bg-muted/50 border border-border px-3.5 py-1.5 rounded-lg text-xs">
            <CalendarCheck className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {bookedCount}/{totalCount} Resources Booked Today
            </span>
            <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
              {occupancyPercent}%
            </Badge>
          </div>

          {/* Quick link: Switch to Table Ledger */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs gap-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border shadow-2xs"
          >
            <Link to="/dashboard/organizer/bookings">
              <TableProperties className="w-3.5 h-3.5 text-primary" />
              <span>Table Ledger</span>
            </Link>
          </Button>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-9 px-3.5 text-xs gap-1.5 bg-card hover:bg-muted text-foreground border-border shadow-2xs font-medium"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export (PDF/iCal)</span>
          </Button>

          {/* New Reservation Action */}
          <Button
            size="sm"
            onClick={onNewReservation}
            className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reservation</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

