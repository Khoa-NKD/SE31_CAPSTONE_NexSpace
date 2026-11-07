import type { FloorLocation } from '@/features/organizer-resources/api/buildings';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import { backendRequest } from '@/features/auth/api/session';
import { DecorationLayer } from '@/features/organizer-resources/components/decoration-visual';
import { ResourceMapSymbol } from '@/features/organizer-resources/components/resource-map-symbol';
import type { FloorDecoration, Category } from '@/features/organizer-resources/api/resources';

interface MapResource {
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
}
interface CustomerFloor {
  location?: FloorLocation | null;
  id: number;
  name: string;
  width: number;
  height: number;
  resources: MapResource[];
  decorations: FloorDecoration[];
}

/** Only bookable-resource nodes expose selection; decoration nodes have no booking interactions. */
export function PublicFloorMap({
  workspaceId,
  onSelect
}: {
  workspaceId: number;
  onSelect?: (resourceId: number) => void;
}) {
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const floor = query.data?.find((item) => item.id === floorId) ?? query.data?.[0];
  const selected = floor?.resources.find(
    (resource) => resource.id === selectedId && resource.selectable
  );
  function shape(resource: MapResource) {
    const select = () => {
      if (resource.selectable) {
        setSelectedId(resource.id);
        onSelect?.(resource.id);
      }
    };
    return (
      <g
        key={resource.id}
        transform={`rotate(${resource.rotation} ${resource.posX + resource.width / 2} ${resource.posY + resource.height / 2})`}
        role={resource.selectable ? 'button' : 'img'}
        tabIndex={resource.selectable ? 0 : undefined}
        aria-label={`${resource.name} · ${resource.code}`}
        onClick={resource.selectable ? select : undefined}
        onKeyDown={
          resource.selectable
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select();
                }
              }
            : undefined
        }
        className={
          resource.selectable ? 'cursor-pointer outline-none focus:opacity-60' : 'opacity-50'
        }
      >
        <title>{resource.name}</title>
        <rect
          x={resource.posX}
          y={resource.posY}
          width={resource.width}
          height={resource.height}
          rx='4'
          strokeWidth={selectedId === resource.id ? 3 : 1.5}
          vectorEffect='non-scaling-stroke'
          className={
            selectedId === resource.id
              ? 'fill-primary/25 stroke-primary'
              : resource.category === 'ROOM'
                ? 'fill-muted/20 stroke-muted-foreground'
                : 'fill-primary/5 stroke-primary'
          }
        />
        {resource.category === 'DESK' && (
          <ResourceMapSymbol
            category='DESK'
            x={resource.posX}
            y={resource.posY}
            width={resource.width}
            height={resource.height}
          />
        )}
        <text
          x={resource.posX + resource.width / 2}
          y={
            resource.category === 'ROOM'
              ? resource.posY + 14
              : resource.posY + resource.height * 0.88
          }
          textAnchor='middle'
          fontSize={Math.min(12, resource.height / 4)}
          className='pointer-events-none fill-foreground'
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
          <h2 className='flex items-center gap-2 text-lg font-semibold'>
            <Layers3 className='size-5 text-primary' />
            {c('Floor map', 'Sơ đồ tầng')}
          </h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            {c(
              'Select a seat or room. Tables, plants and partitions are display-only.',
              'Chọn ghế hoặc phòng. Bàn, cây xanh và vách ngăn chỉ hiển thị bố cục.'
            )}
          </p>
        </div>
        {floor && (
          <select
            aria-label={c('Floor', 'Tầng')}
            className='h-9 rounded-lg border border-input bg-background px-3 text-sm'
            value={floor.id}
            onChange={(event) => {
              setFloorId(Number(event.target.value));
              setSelectedId(null);
            }}
          >
            {query.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.location ? `${item.location.physicalFloorName} · ${item.name}` : item.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {query.isPending ? (
        <p className='py-6 text-sm text-muted-foreground'>
          {c('Loading floor map…', 'Đang tải sơ đồ…')}
        </p>
      ) : query.isError ? (
        <div className='space-y-2 text-sm text-muted-foreground'>
          <p>{c('The floor map is currently unavailable.', 'Hiện chưa có sơ đồ tầng khả dụng.')}</p>
          <Button type='button' size='sm' variant='outline' onClick={() => query.refetch()}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      ) : !floor ? (
        <p className='py-6 text-sm text-muted-foreground'>
          {c('No published floor map yet.', 'Chưa có sơ đồ tầng được publish.')}
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${floor.width} ${floor.height}`}
            className='h-80 w-full rounded-xl border border-border bg-background'
            aria-label={c('Published floor layout', 'Bố trí tầng đã publish')}
          >
            {floor.resources.filter((item) => item.category === 'ROOM').map(shape)}
            <DecorationLayer items={floor.decorations} blockSelection />
            {floor.resources.filter((item) => item.category === 'DESK').map(shape)}
          </svg>
          {selected && (
            <div className='mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3'>
              <p className='text-sm font-semibold'>
                {c('Selected', 'Đã chọn')}: {selected.name} · {selected.code}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {c(
                  'Selecting a map object does not hold a reservation. Check the requested time before confirming.',
                  'Chọn trên sơ đồ chưa giữ chỗ. Cần kiểm tra khung giờ trước khi xác nhận đặt chỗ.'
                )}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
