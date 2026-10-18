import React from 'react';
import {
  MousePointer2,
  Hand,
  SquareDashed,
  Ruler,
  Grid3X3,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FloorplanTool } from '../types';

interface FloorplanToolbeltProps {
  activeTool: FloorplanTool;
  onSelectTool: (tool: FloorplanTool) => void;
  isGridVisible: boolean;
  onToggleGrid: () => void;
  isMinimapVisible: boolean;
  onToggleMinimap: () => void;
}

export function FloorplanToolbelt({
  activeTool,
  onSelectTool,
  isGridVisible,
  onToggleGrid,
  isMinimapVisible,
  onToggleMinimap
}: FloorplanToolbeltProps) {
  const tools: { id: FloorplanTool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    {
      id: 'select',
      label: 'Select / Move',
      icon: <MousePointer2 className="w-4 h-4" />,
      shortcut: 'V'
    },
    {
      id: 'pan',
      label: 'Pan Canvas',
      icon: <Hand className="w-4 h-4" />,
      shortcut: 'H'
    },
    {
      id: 'box_select',
      label: 'Box Select',
      icon: <SquareDashed className="w-4 h-4" />,
      shortcut: 'B'
    },
    {
      id: 'measure',
      label: 'Measure Distance',
      icon: <Ruler className="w-4 h-4" />,
      shortcut: 'M'
    }
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <nav aria-label="Floorplan tools" className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-card/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl p-1 select-none">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSelectTool(t.id)}
                  aria-label={`${t.label} (${t.shortcut})`}
                  className={`h-8 w-8 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                >
                  {t.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t.label} <span className="opacity-60 text-[10px]">({t.shortcut})</span>
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="h-4 w-px bg-border mx-1" />

        {/* Toggle Grid */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleGrid}
              aria-label="Toggle CAD Grid (G)"
              className={`h-8 w-8 rounded-lg transition-all ${
                isGridVisible
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Toggle CAD Grid (G)</TooltipContent>
        </Tooltip>

        {/* Toggle Minimap */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMinimap}
              aria-label="Toggle Radar Minimap"
              className={`h-8 w-8 rounded-lg transition-all ${
                isMinimapVisible
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <MapPin className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Toggle Radar Minimap</TooltipContent>
        </Tooltip>
      </nav>
    </TooltipProvider>
  );
}

