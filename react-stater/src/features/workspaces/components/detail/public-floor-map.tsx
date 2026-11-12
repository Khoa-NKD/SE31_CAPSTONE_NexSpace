import type { FloorLocation } from '@/features/organizer-resources/api/buildings';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers3, Users, Armchair, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import { backendRequest } from '@/features/auth/api/session';
import { DecorationLayer } from '@/features/organizer-resources/components/decoration-visual';
import { ResourceMapSymbol } from '@/features/organizer-resources/components/resource-map-symbol';
import type { FloorDecoration, Category } from '@/features/organizer-resources/api/resources';
import type { ResourceAvailabilityItem } from '../../api/booking-types';
import {
  type SpaceFilterType,
  isResourceOffice,
  matchesSpaceCategory
} from '../../utils/seat-room-utils';

export { type SpaceFilterType, isResourceOffice, matchesSpaceCategory };

export interface MapResource {
  id: number;
  code: string;
  name: string;
  category: Category;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  selectable: boolean;
  capacity?: number;
  typeName?: string;
  pricePerHour?: number;
  zoneName?: string;
}

export interface CustomerFloor {
  location?: FloorLocation | null;
  id: number;
  name: string;
  width: number;
  height: number;
  resources: MapResource[];
  decorations: FloorDecoration[];
}

export interface PublicFloorMapProps {
  workspaceId: number;
  onSelect?: (resource: MapResource) => void;
  selectedResourceId?: number | null;
  availabilityMap?: Map<number, ResourceAvailabilityItem>;
  onFloorChange?: (floorId: number) => void;
  filterCategory?: SpaceFilterType;
  onFloorListLoaded?: (floors: CustomerFloor[]) => void;
}

/** Only bookable-resource nodes expose selection; decoration nodes have no booking interactions. */
export function PublicFloorMap({
  workspaceId,
  onSelect,
  selectedResourceId,
  availabilityMap,
  onFloorChange,
  filterCategory = 'ALL',
  onFloorListLoaded
}: PublicFloorMapProps) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);

  const query = useQuery({
    queryKey: ['public-floor-maps', workspaceId],
    enabled: Number.isSafeInteger(workspaceId) && workspaceId > 0,
    queryFn: ({ signal }) =>
      backendRequest<CustomerFloor[]>(
        `/public/workspaces/${workspaceId}/floor-maps`,
        'GET',
        undefined,
        false,
        signal
      ),
    retry: false,
    refetchOnWindowFocus: false
  });

  const [floorId, setFloorId] = useState<number | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<number | null>(null);
  const activeSelectedId = selectedResourceId !== undefined ? selectedResourceId : internalSelectedId;

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      onFloorListLoaded?.(query.data);
    }
  }, [query.data, onFloorListLoaded]);

  const floor = useMemo(() => {
    return query.data?.find((item) => item.id === floorId) ?? query.data?.[0];
  }, [query.data, floorId]);

  useEffect(() => {
    if (floor?.id) {
      onFloorChange?.(floor.id);
    }
  }, [floor?.id, onFloorChange]);

  const selected = useMemo(() => {
    return floor?.resources.find((resource) => resource.id === activeSelectedId);
  }, [floor?.resources, activeSelectedId]);

  function shape(resource: MapResource) {
    const avail = availabilityMap?.get(resource.id);
    const isBooked = avail?.state === 'BOOKED' || avail?.state === 'LOCKED';
    const isMaintenance = avail?.state === 'MAINTENANCE';
    const isAvailable = (!avail || avail.state === 'AVAILABLE') && resource.selectable && !isBooked && !isMaintenance;
    const isCurrentSelected = activeSelectedId === resource.id;
    const matchesCurrentFilter = matchesSpaceCategory(resource, filterCategory);

    const isOffice = isResourceOffice(resource);
    const capacityText = resource.capacity ? `${resource.capacity}` : (isOffice ? '4' : '6');

    const select = () => {
      if (isAvailable && matchesCurrentFilter) {
        setInternalSelectedId(resource.id);
        onSelect?.(resource);
      }
    };

    let fillColor = 'fill-primary/5 stroke-primary';
    if (isCurrentSelected) {
      fillColor = 'fill-primary/25 stroke-primary stroke-[3px] shadow-lg';
    } else if (isBooked) {
      fillColor = 'fill-amber-500/15 stroke-amber-500/70 [stroke-dasharray:3_3]';
    } else if (isMaintenance) {
      fillColor = 'fill-muted/30 stroke-muted-foreground/40';
    } else if (isAvailable) {
      fillColor = resource.category === 'ROOM'
        ? 'fill-emerald-500/15 stroke-emerald-600 dark:stroke-emerald-400 hover:fill-emerald-500/25 transition-colors'
        : 'fill-emerald-500/10 stroke-emerald-600 dark:stroke-emerald-400 hover:fill-emerald-500/20 transition-colors';
    }

    const typeLabel = resource.category === 'ROOM'
      ? (isOffice ? c('Private Office', 'Văn phòng riêng') : c('Meeting Room', 'Phòng họp'))
      : c('Desk', 'Bàn làm việc');

    const titleText = isBooked
      ? `${resource.name} · ${resource.code} (${c('Booked / Reserved', 'Đã có người đặt / Đang giữ')})`
      : isMaintenance
        ? `${resource.name} · ${resource.code} (${c('Maintenance', 'Bảo trì')})`
        : `${resource.name} · ${resource.code} (${typeLabel} • ${capacityText} ${c('seats', 'chỗ')} • ${c('Available', 'Còn trống')})`;

    const opacityClass = matchesCurrentFilter
      ? 'opacity-100'
      : 'opacity-25 grayscale pointer-events-none transition-opacity duration-200';

    return (
      <g
        key={resource.id}
        transform={`rotate(${resource.rotation} ${resource.posX + resource.width / 2} ${resource.posY + resource.height / 2})`}
        role={isAvailable && matchesCurrentFilter ? 'button' : 'img'}
        tabIndex={isAvailable && matchesCurrentFilter ? 0 : undefined}
        aria-label={`${resource.name} · ${resource.code}`}
        onClick={isAvailable && matchesCurrentFilter ? select : undefined}
        onKeyDown={
          isAvailable && matchesCurrentFilter
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select();
                }
              }
            : undefined
        }
        className={`${opacityClass} ${
          isAvailable && matchesCurrentFilter
            ? 'cursor-pointer outline-none transition-all duration-150 focus:opacity-80'
            : 'cursor-not-allowed'
        }`}
      >
        <title>{titleText}</title>

        {/* Main Base Shape Rectangle */}
        <rect
          x={resource.posX}
          y={resource.posY}
          width={resource.width}
          height={resource.height}
          rx='6'
          strokeWidth={isCurrentSelected ? 3 : 1.5}
          vectorEffect='non-scaling-stroke'
          className={fillColor}
        />

        {/* Desk Symbol */}
        {resource.category === 'DESK' && (
          <ResourceMapSymbol
            category='DESK'
            x={resource.posX}
            y={resource.posY}
            width={resource.width}
            height={resource.height}
          />
        )}

        {/* Room Header Strip & Capacity Badge */}
        {resource.category === 'ROOM' && (
          <g className='pointer-events-none select-none'>
            <rect
              x={resource.posX + 1}
              y={resource.posY + 1}
              width={Math.max(0, resource.width - 2)}
              height={Math.min(20, resource.height * 0.28)}
              rx='5'
              className={isCurrentSelected ? 'fill-primary/20' : 'fill-muted/50'}
            />
            <text
              x={resource.posX + 8}
              y={resource.posY + 13}
              fontSize={Math.min(9, resource.height / 6)}
              className='fill-muted-foreground font-semibold'
            >
              {isOffice ? 'OFFICE' : 'ROOM'} • {capacityText}P
            </text>
          </g>
        )}

        {/* Resource Code Label */}
        <text
          x={resource.posX + resource.width / 2}
          y={
            resource.category === 'ROOM'
              ? resource.posY + resource.height / 2 + 5
              : resource.posY + resource.height * 0.88
          }
          textAnchor='middle'
          fontSize={Math.min(12, resource.height / 3.8)}
          className={`pointer-events-none font-bold select-none ${
            isCurrentSelected ? 'fill-primary' : 'fill-foreground'
          }`}
        >
          {resource.code}
        </text>
      </g>
    );
  }

  return (
    <section
      aria-label={c('Floor map', 'Sơ đồ tầng')}
      className='my-6 rounded-2xl border border-border bg-card p-5 shadow-sm'
    >
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='flex items-center gap-2 text-lg font-semibold text-foreground'>
            <Layers3 className='size-5 text-primary' />
            {c('Floor map', 'Sơ đồ mặt bằng')}
          </h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            {c(
              'Interactive architectural layout. Click any green desk or room to inspect specifications.',
              'Bản vẽ kiến trúc tương tác. Nhấp vào bàn làm việc hoặc phòng màu xanh để xem chi tiết.'
            )}
          </p>
        </div>
        {floor && (
          <div className='flex items-center gap-2'>
            <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              {c('Select Floor:', 'Tầng:')}
            </span>
            <select
              aria-label={c('Floor', 'Tầng')}
              className='h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium cursor-pointer transition-colors hover:border-primary focus:border-primary outline-none'
              value={floor.id}
              onChange={(event) => {
                const newId = Number(event.target.value);
                setFloorId(newId);
                setInternalSelectedId(null);
                onFloorChange?.(newId);
              }}
            >
              {query.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.location ? `${item.location.physicalFloorName} · ${item.name}` : item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {query.isPending ? (
        <div className='flex h-80 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/20'>
          <p className='text-sm font-medium text-muted-foreground animate-pulse'>
            {c('Loading floor map layout…', 'Đang tải bố cục sơ đồ tầng…')}
          </p>
        </div>
      ) : query.isError ? (
        <div className='flex h-80 flex-col items-center justify-center space-y-2 rounded-xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground'>
          <p>{c('The floor map is currently unavailable.', 'Hiện chưa có sơ đồ tầng khả dụng.')}</p>
          <Button type='button' size='sm' variant='outline' onClick={() => query.refetch()}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      ) : !floor ? (
        <div className='flex h-80 flex-col items-center justify-center rounded-xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground'>
          <p>{c('No published floor map yet.', 'Chưa có sơ đồ tầng được publish.')}</p>
        </div>
      ) : (
        <>
          <div className='relative overflow-hidden rounded-xl border border-border bg-background shadow-inner'>
            <svg
              viewBox={`0 0 ${floor.width} ${floor.height}`}
              className='h-[360px] sm:h-[440px] w-full transition-all duration-300'
              aria-label={c('Published floor layout', 'Bố trí tầng đã publish')}
            >
              {/* 1. Rooms layer (Meeting rooms & Private offices) */}
              {floor.resources.filter((item) => item.category === 'ROOM').map(shape)}

              {/* 2. Architectural Decorations (walls, doors, plants, dividers) */}
              <DecorationLayer items={floor.decorations} blockSelection />

              {/* 3. Desks layer (Individual desks) */}
              {floor.resources.filter((item) => item.category === 'DESK').map(shape)}
            </svg>
          </div>

          {/* Quick Selection Summary Footer inside Map */}
          {selected && (
            <div className='mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3.5 animate-in fade-in duration-200'>
              <div className='flex items-center gap-3'>
                <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  {selected.category === 'ROOM' ? (
                    isResourceOffice(selected) ? (
                      <Building className='size-5' />
                    ) : (
                      <Users className='size-5' />
                    )
                  ) : (
                    <Armchair className='size-5' />
                  )}
                </div>
                <div>
                  <p className='text-sm font-semibold text-foreground'>
                    {c('Selected', 'Đang chọn')}: {selected.name} · {selected.code}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {selected.category === 'ROOM'
                      ? isResourceOffice(selected)
                        ? c('Private office suite for dedicated team privacy', 'Văn phòng riêng tư chuyên dụng cho nhóm')
                        : c('Conference meeting space with collaborative tools', 'Phòng họp đầy đủ trang thiết bị hội nghị')
                      : c('Dedicated individual ergonomic workstation', 'Bàn làm việc cá nhân công thái học')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
