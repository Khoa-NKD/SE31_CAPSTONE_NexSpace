import { useId, useState, type PointerEvent } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLanguage } from '@/features/landing/context/language-context';
import { buildingsOptions } from '../api/buildings';
import { floorLayoutOptions, type FloorLayout } from '../api/resources';
import { DecorationLayer } from './decoration-visual';
import { ResourceMapSymbol } from './resource-map-symbol';

/** Neighbor layouts are read-only context. All coordinates remain local to the active area. */
export function useSharedFloorContext(layout?: FloorLayout, enabled = true) {
  const actorId = useAuthStore((state) => state.user?.id ?? 0);
  const [hover, setHover] = useState<{
    name: string;
    workspace: string | null;
    readOnly: boolean;
    left: number;
    top: number;
  } | null>(null);
  const location = enabled ? layout?.floor.location : undefined;
  const buildings = useQuery({
    ...buildingsOptions(actorId),
    enabled: !!location && actorId > 0
  });
  const floor = buildings.data
    ?.find((building) => building.id === location?.buildingId)
    ?.floors.find((floor) => floor.id === location?.buildingFloorId);
  const neighbors = floor?.occupants.filter((area) => area.floorPlanId !== layout?.floor.id) ?? [];
  const queries = useQueries({
    queries: neighbors.map((area) => ({
      ...floorLayoutOptions(actorId, area.workspaceId, area.floorPlanId),
      enabled: actorId > 0
    }))
  });
  const clearHover = () => setHover(null);
  const inspectArea = (event: PointerEvent<SVGSVGElement>) => {
    const inverse = event.currentTarget.getScreenCTM()?.inverse();
    if (!location || !floor || !inverse || event.buttons || event.pointerType === 'touch') {
      clearHover();
      return;
    }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse);
    const x = point.x + location.x;
    const y = point.y + location.y;
    const area = floor.occupants.find(
      (area) => x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
    );
    setHover(
      area
        ? {
            name: area.layoutName,
            workspace: area.workspaceName,
            readOnly: area.floorPlanId !== layout?.floor.id,
            left: Math.max(8, Math.min(event.clientX + 16, window.innerWidth - 288)),
            top: Math.max(8, Math.min(event.clientY + 16, window.innerHeight - 128))
          }
        : null
    );
  };
  return {
    hover,
    clearHover,
    inspectArea,
    location,
    floor,
    bounds:
      location && floor
        ? { x: -location.x, y: -location.y, width: floor.width, height: floor.height }
        : undefined,
    areas: neighbors.map((area, index) => ({ area, query: queries[index] })),
    error: buildings.isError
  };
}

/** Render outside the SVG so the annotation stays readable at every camera zoom. */
export function SharedFloorTooltip({
  context
}: {
  context: ReturnType<typeof useSharedFloorContext>;
}) {
  const { language } = useLanguage();
  const hover = context.hover;
  if (!hover) return null;
  return (
    <div
      role='tooltip'
      className='pointer-events-none fixed z-[100] w-64 max-w-[calc(100vw-16px)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl'
      style={{ left: hover.left, top: hover.top }}
    >
      <p className='break-words text-sm font-semibold'>{hover.name}</p>
      <p className='mt-1 break-words text-xs text-muted-foreground'>{hover.workspace}</p>
      <p
        className={`mt-2 text-xs font-medium ${hover.readOnly ? 'text-muted-foreground' : 'text-primary'}`}
      >
        {hover.readOnly
          ? language === 'vi'
            ? 'Workspace khác · Chỉ xem'
            : 'Other workspace · Read only'
          : language === 'vi'
            ? 'Workspace đang chọn'
            : 'Current workspace'}
      </p>
    </div>
  );
}

export function SharedFloorLayer({
  context
}: {
  context: ReturnType<typeof useSharedFloorContext>;
}) {
  const id = useId().replaceAll(':', '');
  const { language } = useLanguage();
  const vi = language === 'vi';
  const { location, bounds, areas } = context;
  if (!location) return null;
  if (!bounds)
    return (
      <text x='8' y='-12' fontSize='13' className='fill-muted-foreground' pointerEvents='none'>
        {context.error
          ? vi
            ? 'Không tải được các vùng cùng tầng'
            : 'Shared floor areas unavailable'
          : vi
            ? 'Đang tải các vùng cùng tầng…'
            : 'Loading shared floor areas…'}
      </text>
    );
  return (
    <g pointerEvents='none' aria-hidden='true'>
      <rect {...bounds} className='fill-muted/20 stroke-border' strokeWidth='2' />
      {areas.map(({ area, query }) => (
        <g
          key={area.floorPlanId}
          transform={`translate(${area.x - location.x} ${area.y - location.y})`}
        >
          <defs>
            <clipPath id={`${id}-${area.floorPlanId}`}>
              <rect width={area.width} height={area.height} />
            </clipPath>
          </defs>
          <rect
            width={area.width}
            height={area.height}
            className='fill-muted/40 stroke-muted-foreground/60'
            strokeDasharray='8 5'
            vectorEffect='non-scaling-stroke'
          />
          <g clipPath={`url(#${id}-${area.floorPlanId})`} opacity='.65'>
            {query.data?.resources
              .filter(
                (item) => item.posX !== null && item.posY !== null && item.width && item.height
              )
              .map((item) => (
                <g
                  key={item.id}
                  transform={`rotate(${item.rotation} ${item.posX! + item.width! / 2} ${item.posY! + item.height! / 2})`}
                >
                  <rect
                    x={item.posX!}
                    y={item.posY!}
                    width={item.width!}
                    height={item.height!}
                    rx='4'
                    className='fill-muted stroke-muted-foreground'
                    vectorEffect='non-scaling-stroke'
                  />
                  {item.category !== 'ROOM' && (
                    <ResourceMapSymbol
                      category={item.category ?? 'DESK'}
                      x={item.posX!}
                      y={item.posY!}
                      width={item.width!}
                      height={item.height!}
                      className='text-muted-foreground'
                    />
                  )}
                  <text
                    x={item.posX! + item.width! / 2}
                    y={item.posY! + item.height! - 6}
                    textAnchor='middle'
                    fontSize='11'
                    className='fill-muted-foreground'
                  >
                    {item.code}
                  </text>
                </g>
              ))}
            <DecorationLayer items={query.data?.decorations ?? []} />
            {(query.isPending || query.isError) && (
              <text x='12' y='54' fontSize='12' className='fill-muted-foreground'>
                {query.isError
                  ? vi
                    ? 'Không tải được sơ đồ'
                    : 'Layout unavailable'
                  : vi
                    ? 'Đang tải sơ đồ…'
                    : 'Loading layout…'}
              </text>
            )}
          </g>
        </g>
      ))}
    </g>
  );
}
