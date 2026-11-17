import React from 'react';
import {
  Layers,
  Laptop,
  Users,
  Maximize2,
  Presentation,
  PhoneCall,
  Minus,
  DoorOpen,
  GripVertical,
  Info
} from 'lucide-react';
import { ASSET_TEMPLATES } from '../data/mock-floorplan';
import { AssetCategory, AssetTemplate } from '../types';

interface FloorplanAssetPaletteProps {
  onAddAsset: (template: AssetTemplate) => void;
  onDragStart?: (e: React.DragEvent, template: AssetTemplate) => void;
}

function getAssetIcon(type: string) {
  switch (type) {
    case 'HOT_DESK':
      return <Laptop className="w-3.5 h-3.5 text-blue-500" />;
    case 'DEDICATED_DESK':
      return <Users className="w-3.5 h-3.5 text-indigo-500" />;
    case 'MEETING_ROOM':
      return <Presentation className="w-3.5 h-3.5 text-amber-500" />;
    case 'BOOTH':
      return <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />;
    case 'WALL':
      return <Minus className="w-3.5 h-3.5 text-slate-500" />;
    case 'DOOR':
      return <DoorOpen className="w-3.5 h-3.5 text-purple-500" />;
    default:
      return <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

export function FloorplanAssetPalette({ onAddAsset, onDragStart }: FloorplanAssetPaletteProps) {

  const categories: { key: AssetCategory; label: string }[] = [
    { key: 'desks', label: 'Desks & Workstations' },
    { key: 'meeting', label: 'Meeting & Lounge' },
    { key: 'spatial', label: 'Spatial Elements' }
  ];

  return (
    <aside className="w-[230px] shrink-0 border-r border-border bg-card/60 backdrop-blur-xs flex flex-col h-full select-none">
      {/* Header */}
      <div className="h-10 px-3.5 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Asset Library
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {ASSET_TEMPLATES.length}
        </span>
      </div>

      {/* Asset Categories list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {categories.map((cat) => {
          const items = ASSET_TEMPLATES.filter((t) => t.category === cat.key);
          return (
            <div key={cat.key} className="space-y-1.5">
              <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                {cat.label}
              </h2>
              <div className="space-y-1">
                {items.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    draggable
                    onDragStart={(e) => onDragStart?.(e, asset)}
                    onClick={() => onAddAsset(asset)}
                    className="w-full group flex items-center justify-between p-2 rounded-lg border border-border/60 bg-background/80 hover:bg-accent/60 hover:border-border transition-all duration-150 cursor-grab active:cursor-grabbing text-left shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {getAssetIcon(asset.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate leading-tight">
                          {asset.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {asset.dimensions}
                        </p>
                      </div>
                    </div>
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/80 shrink-0 ml-1 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pro Tip Footer */}
      <div className="p-3 border-t border-border/80 bg-muted/30">
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p>
            <strong className="text-foreground font-medium">Pro Tip:</strong> Click or drag cards
            onto canvas. Shift+Click to clone.
          </p>
        </div>
      </div>
    </aside>
  );
}
