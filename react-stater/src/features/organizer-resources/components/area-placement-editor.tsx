import { useRef, useState, type PointerEvent } from 'react';
import { Move, Scaling } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import type { PhysicalFloor } from '../api/buildings';
import { placeArea, type AreaRect, type AreaHandle } from '../utils/area-placement';

export function AreaPlacementEditor({
  floor,
  value,
  onChange,
  invalid = false,
  fixedSize = false,
  disabled = false,
  currentLayoutId
}: {
  floor: PhysicalFloor;
  value: AreaRect;
  onChange: (value: AreaRect) => void;
  invalid?: boolean;
  fixedSize?: boolean;
  disabled?: boolean;
  currentLayoutId?: number;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [snap, setSnap] = useState(true);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    pointer: number;
    handle: AreaHandle;
    x: number;
    y: number;
    initial: AreaRect;
  } | null>(null);
  const valid =
    [value.x, value.y, value.width, value.height].every(Number.isFinite) &&
    value.width > 0 &&
    value.height > 0;
  const widthM = floor.realWidthM && floor.width > 0 ? value.width / floor.width * floor.realWidthM : null;
  const lengthM = floor.realLengthM && floor.height > 0 ? value.height / floor.height * floor.realLengthM : null;
  const percentage = valid && floor.width > 0 && floor.height > 0
    ? 100 * value.width * value.height / (floor.width * floor.height) : null;
  const scale = Math.max(floor.width, floor.height);
  const padding = scale * 0.045,
    handleSize = scale * 0.04;
  const color = invalid ? '#ef4444' : '#10b981';
  const point = (event: PointerEvent<SVGElement>) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix || !svg.current) return null;
    const p = svg.current.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(matrix.inverse());
  };
  const start = (event: PointerEvent<SVGElement>, handle: AreaHandle) => {
    if (disabled || !valid || event.button !== 0) return;
    const p = point(event);
    if (!p || !svg.current) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = { pointer: event.pointerId, handle, x: p.x, y: p.y, initial: { ...value } };
    svg.current.setPointerCapture(event.pointerId);
  };
  const stop = (event: PointerEvent<SVGElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    if (svg.current?.hasPointerCapture(event.pointerId))
      svg.current.releasePointerCapture(event.pointerId);
  };
  return (
    <div className='space-y-2'>
      {valid && <div className='flex flex-wrap gap-x-4 gap-y-1 rounded-xl border bg-primary/5 px-3 py-2 text-xs' aria-live='polite'>
        {widthM != null && lengthM != null
          ? <><span>{c('Length (horizontal)', 'Dài (ngang)')}: <strong>{widthM.toFixed(2)} m</strong> · {c('Width (vertical)', 'Rộng (dọc)')}: <strong>{lengthM.toFixed(2)} m</strong></span>
              <span>{c('Area', 'Diện tích')}: <strong>{(widthM * lengthM).toFixed(2)} m²</strong></span></>
          : <span>{c('Set the floor’s real dimensions to calculate metres.', 'Cần thiết lập số đo thực của tầng để quy đổi ra mét.')}</span>}
        {percentage != null && <span>{c('Share of floor area', 'Chiếm diện tích tầng')}: <strong>{percentage.toFixed(2)}%</strong></span>}
      </div>}
      <div className='flex flex-wrap items-center justify-between gap-2 text-[11px]'>
        <label className='flex items-center gap-1.5 text-muted-foreground'>
          <input
            type='checkbox'
            checked={snap}
            disabled={disabled}
            onChange={(e) => setSnap(e.target.checked)}
          />
          {floor.geometryVersion === 2 ? c('Snap 0.1 m', 'Bám lưới 0,1 m') : c('Snap 10 px', 'Bám lưới 10 px')}
        </label>
        {!fixedSize && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-7 rounded-lg px-2 text-[10px]'
            disabled={disabled || floor.width < 2}
            onClick={() =>
              onChange({
                x: 0,
                y: 0,
                width: Math.floor(floor.width * 50) / 100,
                height: floor.height
              })
            }
          >
            {c('Half floor', 'Nửa tầng')}
          </Button>
        )}
      </div>
      <svg
        ref={svg}
        className={`h-64 w-full touch-none select-none rounded-xl border bg-background ${invalid ? 'border-destructive/30' : 'border-border'}`}
        viewBox={`${-padding} ${-padding} ${floor.width + 2 * padding} ${floor.height + 2 * padding}`}
        role='group'
        aria-label={c(
          'Drag and resize workspace area',
          'Kéo thả và đổi kích thước khu vực workspace'
        )}
        onPointerMove={(event) => {
          const current = drag.current;
          if (disabled || !current || current.pointer !== event.pointerId) return;
          const p = point(event);
          if (p)
            onChange(
              placeArea(
                current.initial,
                current.handle,
                p.x - current.x,
                p.y - current.y,
                floor,
                snap ? floor.geometryVersion === 2 ? 6 : 10 : 0.01,
                floor.geometryVersion === 2 ? 0.6 : 1
              )
            );
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      >
        <rect
          width={floor.width}
          height={floor.height}
          fill='var(--muted)'
          fillOpacity='.25'
          stroke='var(--border)'
          strokeWidth={scale * 0.003}
        />
        {floor.occupants
          .filter((o) => o.floorPlanId !== currentLayoutId)
          .map((o) => (
            <g key={o.floorPlanId} pointerEvents='none'>
              <rect
                x={o.x}
                y={o.y}
                width={o.width}
                height={o.height}
                fill='#64748b'
                fillOpacity='.35'
                stroke='#64748b'
                strokeWidth={scale * 0.003}
              />
              <text
                x={o.x + o.width / 2}
                y={o.y + o.height / 2}
                textAnchor='middle'
                fill='currentColor'
                fontSize={Math.min(scale * 0.035, o.width * 0.09)}
              >
                {o.workspaceName}
              </text>
            </g>
          ))}
        {valid && (
          <g>
            <rect
              x={value.x}
              y={value.y}
              width={value.width}
              height={value.height}
              rx={scale * 0.006}
              fill={color}
              fillOpacity='.3'
              stroke={color}
              strokeWidth={scale * 0.006}
              className={disabled ? '' : 'cursor-move'}
              onPointerDown={(e) => start(e, 'move')}
              tabIndex={disabled ? -1 : 0}
              role='button'
              aria-label={c(
                'Move selected area. Arrow keys move it; Shift moves ten pixels.',
                'Di chuyển khu vực. Phím mũi tên dịch chuyển; Shift dịch chuyển nhanh hơn.'
              )}
              onKeyDown={(e) => {
                if (
                  disabled ||
                  !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
                )
                  return;
                e.preventDefault();
                const step = floor.geometryVersion === 2 ? e.shiftKey ? 6 : 0.6 : e.shiftKey ? 10 : 1;
                onChange(
                  placeArea(
                    value,
                    'move',
                    e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0,
                    e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0,
                    floor,
                    0.01
                  )
                );
              }}
            />
            {!fixedSize &&
              (['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                <rect
                  key={handle}
                  x={(handle.includes('w') ? value.x : value.x + value.width) - handleSize / 2}
                  y={(handle.includes('n') ? value.y : value.y + value.height) - handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  rx={handleSize * 0.2}
                  fill='var(--background)'
                  stroke={color}
                  strokeWidth={scale * 0.006}
                  className={
                    disabled
                      ? ''
                      : handle === 'nw' || handle === 'se'
                        ? 'cursor-nwse-resize'
                        : 'cursor-nesw-resize'
                  }
                  onPointerDown={(e) => start(e, handle)}
                >
                  <title>{c('Drag corner to resize', 'Kéo góc để thay đổi diện tích')}</title>
                </rect>
              ))}
          </g>
        )}
      </svg>
      <p className='flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground'>
        {fixedSize ? (
          <Move className='mt-0.5 size-3.5 shrink-0' />
        ) : (
          <Scaling className='mt-0.5 size-3.5 shrink-0' />
        )}
        {fixedSize
          ? c(
              'Drag the area to position it; existing layout dimensions stay fixed.',
              'Kéo vùng để đặt vị trí; giữ nguyên kích thước sơ đồ đã có.'
            )
          : c(
              'Drag the green area to move. Drag a corner to resize. Red overlaps cannot be saved.',
              'Kéo vùng xanh để di chuyển. Kéo góc để đổi diện tích. Vùng đỏ chồng lấn sẽ không được lưu.'
            )}
      </p>
    </div>
  );
}
