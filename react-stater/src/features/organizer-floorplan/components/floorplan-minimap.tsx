import React from 'react';
import { Minus, MapPin } from 'lucide-react';
import { FloorplanNode, ZoneBoundary } from '../types';

interface FloorplanMinimapProps {
  nodes: FloorplanNode[];
  zones: ZoneBoundary[];
  selectedNodeId: string | null;
  zoom: number;
  onClose: () => void;
}

export function FloorplanMinimap({
  nodes,
  zones,
  selectedNodeId,
  zoom,
  onClose
}: FloorplanMinimapProps) {
  // Minimap dimensions: 176px × 120px (scale ratio 1:5 of the 880×600 canvas)
  const mapScale = 176 / 880;

  return (
    <div className="absolute bottom-5 right-5 z-20 w-44 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden select-none">
      {/* Minimap Header */}
      <div className="h-7 px-2.5 bg-muted/50 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="w-3 h-3 text-primary" />
          <span>Radar View</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize radar view"
          className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
      </div>

      {/* Scaled Mini Canvas */}
      <div className="relative w-44 h-[120px] bg-background/80 p-1 overflow-hidden">
        {/* Zones silhouetted */}
        {zones.map((zone) => (
          <div
            key={zone.id}
            style={{
              left: `${zone.x * mapScale}px`,
              top: `${zone.y * mapScale}px`,
              width: `${zone.width * mapScale}px`,
              height: `${zone.height * mapScale}px`
            }}
            className={`absolute rounded-xs border border-dashed pointer-events-none ${
              zone.colorTheme === 'blue'
                ? 'border-blue-500/40 bg-blue-500/10'
                : zone.colorTheme === 'amber'
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-border bg-muted/40'
            }`}
          />
        ))}

        {/* Elevators core */}
        <div
          style={{
            left: `${360 * mapScale}px`,
            top: `${16 * mapScale}px`,
            width: `${160 * mapScale}px`,
            height: `${68 * mapScale}px`
          }}
          className="absolute rounded-xs bg-muted border border-border pointer-events-none"
        />

        {/* Scaled node dots */}
        {nodes.map((n) => {
          const isSelected = n.id === selectedNodeId;
          return (
            <div
              key={n.id}
              style={{
                left: `${n.x * mapScale}px`,
                top: `${n.y * mapScale}px`,
                width: `${Math.max(3, n.width * mapScale)}px`,
                height: `${Math.max(2, n.height * mapScale)}px`
              }}
              className={`absolute rounded-[1px] pointer-events-none ${
                isSelected ? 'bg-primary ring-1 ring-primary' : 'bg-muted-foreground/60'
              }`}
            />
          );
        })}

        {/* Viewport Indicator Rectangle */}
        <div
          style={{
            left: '10px',
            top: '8px',
            width: `${Math.min(156, (176 * 100) / zoom)}px`,
            height: `${Math.min(104, (120 * 100) / zoom)}px`
          }}
          className="absolute border border-primary/70 bg-primary/5 rounded pointer-events-none transition-all"
        />
      </div>
    </div>
  );
}

