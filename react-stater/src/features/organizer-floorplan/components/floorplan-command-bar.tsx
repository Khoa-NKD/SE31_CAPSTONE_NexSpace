import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Undo2,
  Redo2,
  Eye,
  Pencil,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ViewMode } from '../types';

interface FloorplanCommandBarProps {
  currentFloor: string;
  onFloorChange: (floor: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onDiscard: () => void;
  onSavePublish: () => void;
}

const AVAILABLE_FLOORS = [
  'Floor 10 — Private Suites',
  'Floor 11 — Enterprise Teams',
  'Floor 12 — Main Coworking Floor',
  'Floor 14 — Event Terrace & Cafe'
];

export function FloorplanCommandBar({
  currentFloor,
  onFloorChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  snapToGrid,
  onToggleSnap,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewMode,
  onViewModeChange,
  onDiscard,
  onSavePublish
}: FloorplanCommandBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <header className="h-14 border-b border-border bg-card/95 backdrop-blur-sm px-4 flex items-center justify-between gap-3 sticky top-0 z-30 select-none">
        {/* Left Section: Back link, Title, Draft status */}
        <div className="flex items-center gap-3 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/dashboard/organizer/resources">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Back to Resource Manager"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to Resource Manager</TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-semibold text-foreground tracking-tight whitespace-nowrap">
              Floor 12 — Workspace Layout CAD
            </h1>
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Draft • Autosaved 2m ago</span>
            </Badge>
          </div>
        </div>

        {/* Center Section: Floor Switcher, Zoom, Snap, History, Mode */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          {/* Floor Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium gap-1.5 bg-background border-border shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="max-w-[170px] truncate">{currentFloor}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {AVAILABLE_FLOORS.map((floor) => (
                <DropdownMenuItem
                  key={floor}
                  onClick={() => onFloorChange(floor)}
                  className={`text-xs cursor-pointer ${
                    floor === currentFloor ? 'font-semibold bg-accent text-accent-foreground' : ''
                  }`}
                >
                  {floor}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border" />

          {/* Zoom controls pill */}
          <div className="flex items-center bg-muted/60 border border-border rounded-lg p-0.5 shadow-2xs">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background"
                  onClick={onZoomOut}
                  disabled={zoom <= 50}
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom Out (-)</TooltipContent>
            </Tooltip>

            <span className="text-[11px] font-mono font-medium px-2 text-foreground min-w-[42px] text-center">
              {zoom}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background"
                  onClick={onZoomIn}
                  disabled={zoom >= 200}
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom In (+)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background"
                  onClick={onZoomReset}
                  aria-label="Fit to Screen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Fit to Screen</TooltipContent>
            </Tooltip>
          </div>

          {/* Snap toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={snapToGrid ? 'secondary' : 'ghost'}
                size="sm"
                className={`h-8 px-2.5 text-xs gap-1.5 border ${
                  snapToGrid
                    ? 'border-primary/30 bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground'
                }`}
                onClick={onToggleSnap}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Snap 0.5m</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle grid snapping alignment</TooltipContent>
          </Tooltip>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  disabled={!canUndo}
                  onClick={onUndo}
                  aria-label="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  disabled={!canRedo}
                  onClick={onRedo}
                  aria-label="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Edit / Preview Mode Switcher */}
          <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => onViewModeChange('edit')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'edit'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'preview'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Right Section: Discard & Save/Publish */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Discard</span>
          </Button>

          <Button
            size="sm"
            onClick={onSavePublish}
            className="h-8 px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5 transition-all duration-200 active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Publish Layout</span>
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}

