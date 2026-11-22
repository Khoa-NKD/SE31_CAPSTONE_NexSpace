import { useMemo, useRef, useState } from 'react';
import Floor3dPreview from '@/features/organizer-resources/components/floor-3d-preview';
import type { FloorLayout, AvailabilityState } from '@/features/organizer-resources/api/resources';
import type { CustomerFloor, MapResource, SpaceFilterType } from './public-floor-map';
import type { ResourceAvailabilityItem } from '../../api/booking-types';
import { customerResourceStatus } from '../../utils/customer-resource-status';
import { matchesSpaceCategory } from '../../utils/seat-room-utils';

export default function CustomerFloor3d({
  floor,
  availabilityMap,
  selectedId,
  filterCategory,
  onSelect
}: {
  floor: CustomerFloor;
  availabilityMap?: Map<number, ResourceAvailabilityItem>;
  selectedId: number | null;
  filterCategory: SpaceFilterType;
  onSelect: (resource: MapResource) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const layout = useMemo<FloorLayout>(
    () => ({
      floor: {
        id: floor.id,
        name: floor.name,
        floorNumber: 0,
        status: 'PUBLISHED',
        revision: 'public'
      },
      width: floor.width,
      height: floor.height,
      editableLayout: false,
      pixelsPerMetre: floor.pixelsPerMetre,
      decorations: floor.decorations,
      resources: floor.resources.map((r) => ({ ...r, status: 'ACTIVE', revision: 'public' }))
    }),
    [floor]
  );
  const states = useMemo<Record<number, AvailabilityState>>(
    () =>
      Object.fromEntries(
        floor.resources.map((r) => [
          r.id,
          customerResourceStatus(
            r,
            availabilityMap?.get(r.id),
            Boolean(availabilityMap?.get(r.id)?.isOccupiedByMe)
          ).state
        ])
      ),
    [floor.resources, availabilityMap]
  );
  return (
    <div
      ref={host}
      className={
        expanded
          ? 'fixed inset-0 z-[80] flex flex-col bg-background'
          : 'overflow-hidden rounded-xl border'
      }
    >
      <Floor3dPreview
        layout={layout}
        width={floor.width}
        height={floor.height}
        radius={(floor.location?.cornerRadiusM ?? 0) * (floor.pixelsPerMetre ?? 60)}
        availability={states}
        selectedResourceId={selectedId}
        expanded={expanded}
        stretch={expanded}
        onFullscreen={() => setExpanded((value) => !value)}
        onResourceSelect={(id) => {
          const item = floor.resources.find((r) => r.id === id);
          if (item && matchesSpaceCategory(item, filterCategory)) onSelect(item);
        }}
      />
      <div
        className='flex flex-wrap gap-2 border-t bg-card p-2'
        aria-label='Chọn chỗ trên sơ đồ 3D'
      >
        {floor.resources
          .filter((r) => matchesSpaceCategory(r, filterCategory))
          .map((r) => (
            <button
              key={r.id}
              type='button'
              aria-pressed={selectedId === r.id}
              className='rounded-md border px-2 py-1 text-xs hover:bg-muted'
              onClick={() => onSelect(r)}
            >
              {r.name}
            </button>
          ))}
      </div>
    </div>
  );
}
