import React from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ViewTimelineMode } from '../types';

interface ScheduleToolbarProps {
  currentDateDisplay: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  viewMode: ViewTimelineMode;
  onViewModeChange: (mode: ViewTimelineMode) => void;
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function ScheduleToolbar({
  currentDateDisplay,
  onPrevDay,
  onNextDay,
  onToday,
  viewMode,
  onViewModeChange,
  selectedZone,
  onZoneChange,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange
}: ScheduleToolbarProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-4 select-none">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Left: Date Navigator + Today + View Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Navigator */}
          <div className="flex items-center bg-muted/60 border border-border rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onPrevDay}
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 px-3 py-1 font-semibold text-xs text-foreground cursor-default select-none">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{currentDateDisplay}</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onNextDay}
              aria-label="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-9 px-3 text-xs font-semibold bg-background border-border shadow-2xs"
          >
            Today
          </Button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted/60 border border-border rounded-lg p-0.5 text-xs">
            <Button
              variant={viewMode === 'DAY' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('DAY')}
              className={`h-7 px-3 text-xs font-semibold ${viewMode === 'DAY' ? 'shadow-2xs' : 'text-muted-foreground'}`}
            >
              Day Timeline
            </Button>
            <Button
              variant={viewMode === 'WEEK' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('WEEK')}
              className={`h-7 px-3 text-xs font-semibold ${viewMode === 'WEEK' ? 'shadow-2xs' : 'text-muted-foreground'}`}
            >
              Week Matrix
            </Button>
            <Button
              variant={viewMode === 'MONTH' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('MONTH')}
              className={`h-7 px-3 text-xs font-semibold ${viewMode === 'MONTH' ? 'shadow-2xs' : 'text-muted-foreground'}`}
            >
              Monthly Overview
            </Button>
          </div>
        </div>

        {/* Right: Zone Filter, Resource Type, Node Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Zone Filter */}
          <div className="w-[160px]">
            <Select value={selectedZone} onValueChange={onZoneChange}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Zones (42)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Zones (42)</SelectItem>
                <SelectItem value="ZONE_A">Zone A - Quiet Focus</SelectItem>
                <SelectItem value="ZONE_B">Zone B - Collab Hub</SelectItem>
                <SelectItem value="ZONE_C">Zone C - Meeting Rooms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resource Type Filter */}
          <div className="w-[150px]">
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="HOT_DESK">Hot Desks</SelectItem>
                <SelectItem value="DEDICATED_DESK">Dedicated Desks</SelectItem>
                <SelectItem value="BOOTH">Meeting Pods</SelectItem>
                <SelectItem value="MEETING_ROOM">Boardrooms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Node Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter node (e.g. DESK-A01)..."
              className="h-9 pl-8 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* Status Legend Row */}
      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Status Legend:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          {/* Confirmed */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-indigo-600 dark:bg-indigo-500 shadow-2xs"></span>
            <span className="text-foreground font-medium">Confirmed / In-Use</span>
          </div>

          {/* Pending Payment */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500 shadow-2xs animate-pulse"></span>
            <span className="text-foreground font-medium">Pending PayOS (10m Hold)</span>
          </div>

          {/* Maintenance / Cleaning */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 border-dashed"></span>
            <span className="text-foreground font-medium">Sanitization / Maintenance</span>
          </div>

          {/* VIP / Corporate */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-purple-600 dark:bg-purple-500 shadow-2xs"></span>
            <span className="text-foreground font-medium">VIP / Corporate Reserved</span>
          </div>

          {/* Available Slot */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-dashed border-border bg-card"></span>
            <span className="text-muted-foreground font-medium">Available Slot</span>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Zoom Scale: <strong className="text-foreground font-semibold">1 Hour / Grid Column</strong>
        </div>
      </div>
    </div>
  );
}
