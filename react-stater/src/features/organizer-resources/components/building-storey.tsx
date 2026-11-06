import type { CSSProperties } from 'react';
import { ArrowRight, X, LoaderCircle, Layers3, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import type { FloorOption, FloorLayout } from '../api/resources';
import { BuildingFloorPlate } from './building-floor-plate';

/** One persistent 3D node moves from the building stack to the inspection position. */
export function BuildingStorey({
  floor,
  index,
  gap,
  camera,
  hovered,
  picked,
  layout,
  loading,
  onHover,
  onPick,
  onReturn,
  onOpen
}: {
  floor: FloorOption;
  index: number;
  gap: number;
  camera: { angle: number; tilt: number; zoom: number };
  hovered: boolean;
  picked: boolean;
  layout?: FloorLayout;
  loading: boolean;
  onHover: (id: number | null) => void;
  onPick: () => void;
  onReturn: () => void;
  onOpen: () => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const transform = picked
    ? 'translate3d(var(--picked-x), var(--picked-y), var(--picked-z)) rotateX(34deg) rotateZ(-8deg) scale(var(--picked-scale))'
    : `rotateX(${camera.tilt}deg) rotateZ(${camera.angle}deg) scale(${camera.zoom}) translateZ(${index * gap}px) scale3d(${hovered ? 1.025 : 1}, ${hovered ? 1.025 : 1}, 1)`;
  return (
    <div
      className={`nexspace-building-storey ${picked ? 'is-picked' : ''} ${hovered ? 'is-hovered' : ''}`}
      style={
        {
          transform,
          '--floor-depth': `${Math.max(3, Math.min(29, gap - 4))}px`,
          zIndex: picked ? 1000 : index + 1
        } as CSSProperties
      }
      onMouseEnter={() => onHover(floor.id)}
    >
      <button
        type='button'
        className='nexspace-storey-pick'
        aria-label={`${c('Inspect floor', 'Xem thông tin tầng')} ${floor.name}, ${c('Floor', 'Tầng')} ${floor.floorNumber}`}
        aria-pressed={picked}
        onFocus={() => onHover(floor.id)}
        onClick={onPick}
      >
        <span className='nexspace-building-floor-top'>
          {picked ? (
            <span className='nexspace-storey-real-layout'>
              {loading ? (
                <span
                  role='status'
                  className='flex h-full items-center justify-center gap-2 text-xs text-muted-foreground'
                >
                  <LoaderCircle className='size-5 animate-spin' />
                  {c('Loading floor…', 'Đang tải tầng…')}
                </span>
              ) : layout ? (
                <BuildingFloorPlate
                  layout={layout}
                  label={`${c('Floor layout', 'Bố trí tầng')}: ${floor.name}`}
                />
              ) : (
                <span className='flex h-full items-center justify-center text-primary/50'>
                  <Layers3 className='size-10' />
                </span>
              )}
            </span>
          ) : (
            <span className='nexspace-building-floor-plan'>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          )}
        </span>
        <span className='nexspace-building-floor-front'>
          <span className='nexspace-building-windows' />
          {(gap >= 18 || hovered || picked) && (
            <span className='nexspace-building-floor-tag'>{floor.name}</span>
          )}
        </span>
        <span className='nexspace-building-floor-side'>
          <span className='nexspace-building-windows' />
        </span>
      </button>
      {picked && (
        <>
          <div
            className='nexspace-storey-hologram'
            role='region'
            aria-label={c('3D floor information', 'Thông tin tầng 3D')}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-[9px] font-semibold uppercase tracking-widest text-primary'>
                {c('Floor', 'Tầng')} {floor.floorNumber.toString().padStart(2, '0')}
              </span>
              <button
                type='button'
                className='rounded-full p-1 text-muted-foreground hover:bg-muted'
                aria-label={c('Return floor to building', 'Đưa tầng về tòa nhà')}
                onClick={onReturn}
              >
                <X className='size-3.5' />
              </button>
            </div>
            <h3 className='truncate text-sm font-semibold text-foreground'>{floor.name}</h3>
            <p className='mt-1 text-[9px] text-muted-foreground'>
              {floor.status === 'PUBLISHED'
                ? c('Published layout', 'Sơ đồ đã xuất bản')
                : c('Draft floor', 'Tầng bản nháp')}
              {layout?.width && layout.height ? ` · ${layout.width} × ${layout.height} px` : ''}
            </p>
            {layout && (
              <div className='mt-2 flex gap-3 border-t border-border/70 pt-2 text-[9px] text-muted-foreground'>
                <span>
                  <strong className='text-foreground'>
                    {layout.resources.filter((item) => item.category === 'ROOM').length}
                  </strong>{' '}
                  {c('rooms', 'phòng')}
                </span>
                <span>
                  <strong className='text-foreground'>
                    {layout.resources.filter((item) => item.category === 'DESK').length}
                  </strong>{' '}
                  {c('seats', 'ghế')}
                </span>
                <span>
                  <strong className='text-foreground'>{layout.decorations?.length ?? 0}</strong>{' '}
                  {c('objects', 'đồ vật')}
                </span>
              </div>
            )}
            <div className='nexspace-storey-open'>
              <Button
                className='w-full rounded-xl shadow-lg shadow-primary/15'
                size='sm'
                onClick={onOpen}
              >
                <Scan className='size-3.5' />
                {c('View floor plan', 'Xem sơ đồ')}
                <ArrowRight className='ml-auto size-3.5' />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
