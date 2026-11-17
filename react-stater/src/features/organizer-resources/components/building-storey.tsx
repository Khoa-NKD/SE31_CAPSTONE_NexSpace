import { FloorSlabSides } from './floor-slab-sides';
import type { CSSProperties } from 'react';
import { ArrowRight, X, LoaderCircle, Layers3, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import type { FloorOption, FloorLayout } from '../api/resources';
import { BuildingFloorPlate } from './building-floor-plate';

/** One persistent 3D node moves from the building stack to the inspection position. */
export function BuildingStorey({
  floor,
  label: customLabel,
  index,
  gap,
  camera,
  disabled = false,
  geometry,
  hovered,
  picked,
  roof = false,
  layout,
  loading,
  onHover,
  onPick,
  onReturn,
  onOpen
}: {
  floor: FloorOption;
  label?: string;
  index: number;
  gap: number;
  camera: { angle: number; tilt: number; zoom: number };
  disabled?: boolean;
  geometry: { width: number; height: number; radius: number };
  hovered: boolean;
  picked: boolean;
  roof?: boolean;
  layout?: FloorLayout;
  loading: boolean;
  onHover: (id: number | null) => void;
  onPick: () => void;
  onReturn: () => void;
  onOpen: () => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const label = customLabel ?? `${c('Floor', 'Tầng')} ${floor.floorNumber}`;
  const isPicked = picked && !disabled;
  const isHovered = hovered && !disabled;
  const transform = isPicked
    ? 'translate3d(var(--picked-x), var(--picked-y), 0) rotateX(34deg) rotateZ(-8deg) scale(var(--picked-scale))'
    : `rotateX(${camera.tilt}deg) rotateZ(${camera.angle}deg) scale(${camera.zoom}) translateZ(${index * gap}px) scale3d(${isHovered ? 1.025 : 1}, ${isHovered ? 1.025 : 1}, 1)`;
  return (
    <>
      <div
        className={`nexspace-building-storey ${isPicked ? 'is-picked' : ''} ${isHovered ? 'is-hovered' : ''} ${disabled ? 'is-muted' : ''}`}
        style={
          {
            transform,
            width: geometry.width,
            height: geometry.height,
            marginLeft: -geometry.width / 2,
            marginTop: -geometry.height / 2,
            '--floor-depth': `${Math.max(3, Math.min(29, gap - 4))}px`,
            zIndex: isPicked ? 1000 : index + 1
          } as CSSProperties
        }
        onMouseEnter={() => onHover(disabled ? null : floor.id)}
      >
        <button
          type='button'
          disabled={disabled}
          className='nexspace-storey-pick'
          title={
            disabled
              ? `${label} · ${c('Not linked to this workspace', 'Không thuộc workspace này')}`
              : label
          }
          aria-label={`${c('Floor', 'Tầng')} ${floor.floorNumber}: ${label}${disabled ? ` · ${c('Not linked to this workspace', 'Không thuộc workspace này')}` : ''}`}
          aria-pressed={isPicked}
          onFocus={() => {
            if (!disabled) onHover(floor.id);
          }}
          onClick={disabled ? undefined : onPick}
        >
          <span
            className='nexspace-building-floor-top'
            style={{
              borderRadius: geometry.radius,
              overflow: 'hidden'
            }}
          >
            {isPicked ? (
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
                    label={`${c('Floor layout', 'Bố trí tầng')}: ${label}`}
                  />
                ) : (
                  <span className='flex h-full items-center justify-center text-primary/50'>
                    <Layers3 className='size-10' />
                  </span>
                )}
              </span>
            ) : (
              <span
                className={roof ? 'nexspace-storey-roof-panels' : 'nexspace-building-floor-plan'}
              >
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            )}
          </span>
          <FloorSlabSides
            width={geometry.width}
            height={geometry.height}
            radius={geometry.radius}
            depth={Math.max(3, Math.min(29, gap - 4))}
            label={gap >= 18 || isHovered || isPicked ? label : undefined}
            angle={isPicked ? -8 : camera.angle}
          />
        </button>
      </div>
      {isPicked && (
        <>
          <div
            className='nexspace-storey-hologram'
            style={{ '--picked-height': `${geometry.height}px` } as CSSProperties}
            data-building-overlay
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
            <h3 className='truncate text-sm font-semibold text-foreground' title={label}>
              {label}
            </h3>
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
    </>
  );
}
