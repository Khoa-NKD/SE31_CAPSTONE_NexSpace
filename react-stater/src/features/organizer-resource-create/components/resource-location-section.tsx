import React from 'react';
import { Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { FLOOR_OPTIONS, ZONE_OPTIONS } from '../data/mock-create-resource';

interface ResourceLocationSectionProps {
  workspaceHub: string;
  floorLevel: string;
  zoneSection: string;
  onChangeFloor: (floor: string) => void;
  onChangeZone: (zone: string) => void;
}

export function ResourceLocationSection({
  workspaceHub,
  floorLevel,
  zoneSection,
  onChangeFloor,
  onChangeZone
}: ResourceLocationSectionProps) {
  return (
    <section className='border-t border-border pt-6 space-y-4'>
      <div>
        <h2 className='text-lg font-bold text-foreground'>
          Location &amp; Spatial Hierarchy
        </h2>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Assign spatial placement in the facility
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {/* Workspace Hub (Locked) */}
        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold text-foreground'>
            Workspace Hub
          </Label>
          <div className='w-full h-10 px-3 bg-muted/60 border border-border rounded-lg flex items-center justify-between text-xs text-muted-foreground cursor-not-allowed select-none'>
            <span className='truncate font-medium text-foreground/80'>{workspaceHub}</span>
            <Lock className='size-3.5 text-muted-foreground shrink-0' aria-hidden='true' />
          </div>
        </div>

        {/* Floor Level */}
        <div className='space-y-1.5'>
          <Label htmlFor='floor-level' className='text-xs font-semibold text-foreground flex items-center gap-1'>
            Floor Level <span className='text-destructive'>*</span>
          </Label>
          <select
            id='floor-level'
            value={floorLevel}
            onChange={(e) => onChangeFloor(e.target.value)}
            className='w-full h-10 px-3 bg-background border border-input rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer'
          >
            {FLOOR_OPTIONS.map((floor) => (
              <option key={floor} value={floor} className='bg-popover text-popover-foreground'>
                {floor}
              </option>
            ))}
          </select>
        </div>

        {/* Zone / Section */}
        <div className='space-y-1.5'>
          <Label htmlFor='zone-section' className='text-xs font-semibold text-foreground flex items-center gap-1'>
            Zone / Section <span className='text-destructive'>*</span>
          </Label>
          <select
            id='zone-section'
            value={zoneSection}
            onChange={(e) => onChangeZone(e.target.value)}
            className='w-full h-10 px-3 bg-background border border-input rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer'
          >
            {ZONE_OPTIONS.map((zone) => (
              <option key={zone} value={zone} className='bg-popover text-popover-foreground'>
                {zone}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

