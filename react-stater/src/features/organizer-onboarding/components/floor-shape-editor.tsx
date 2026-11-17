import { useRef, useState, type PointerEvent } from 'react';
import { CornerDownRight, MoveDiagonal2, Ruler } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import {
  floorArea,
  validFloorShape,
  type FloorShapeDraft
} from '@/features/organizer-resources/utils/floor-outline';

const format = (number: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number);

const centimetres = (value: number) => Math.round(value * 100) / 100;
type Handle = 'width' | 'length' | 'both' | 'radius';

/** The projection stays fixed during a drag so resizing cannot move the pointer's scale. */
export function FloorShapeEditor({
  value,
  disabled,
  onChange
}: {
  value: FloorShapeDraft;
  disabled: boolean;
  onChange: (patch: Partial<FloorShapeDraft>) => void;
}) {
  const c = useOrganizerCopy();
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<{
    pointer: number;
    handle: Handle;
    x: number;
    y: number;
    width: number;
    length: number;
    radius: number;
    scale: number;
  } | null>(null);
  const [dragScale, setDragScale] = useState<number | null>(null);
  const width = Number(value.widthM),
    length = Number(value.lengthM),
    radius = Number(value.cornerRadiusM);
  const valid = validFloorShape(value);
  const displayWidth = Number.isFinite(width) && width > 0 ? width : 20;
  const displayLength = Number.isFinite(length) && length > 0 ? length : 15;
  const scale = dragScale ?? Math.min(620 / displayWidth, 360 / displayLength);
  const w = displayWidth * scale,
    h = displayLength * scale;
  const r =
    Math.min(
      Math.max(Number.isFinite(radius) ? radius : 0, 0),
      Math.min(displayWidth, displayLength) / 2
    ) * scale;
  const left = 105,
    top = 90;
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = svg.current?.getScreenCTM()?.inverse();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix) : null;
  };
  function start(event: PointerEvent<SVGElement>, handle: Handle) {
    if (disabled || !valid || !svg.current || event.button !== 0) return;
    const matrix = svg.current.getScreenCTM()?.inverse();
    if (!matrix) return;
    const origin = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    svg.current.setPointerCapture(event.pointerId);
    gesture.current = {
      pointer: event.pointerId,
      handle,
      x: origin.x,
      y: origin.y,
      width,
      length,
      radius,
      scale
    };
    setDragScale(scale);
    event.preventDefault();
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const drag = gesture.current,
      current = point(event);
    if (!drag || drag.pointer !== event.pointerId || !current) return;
    const dx = (current.x - drag.x) / drag.scale,
      dy = (current.y - drag.y) / drag.scale;
    const nextWidth = centimetres(
      Math.min(
        10000,
        Math.max(0.01, drag.width + (drag.handle === 'width' || drag.handle === 'both' ? dx : 0))
      )
    );
    const nextLength = centimetres(
      Math.min(
        10000,
        Math.max(0.01, drag.length + (drag.handle === 'length' || drag.handle === 'both' ? dy : 0))
      )
    );
    const nextRadius = centimetres(
      Math.max(
        0,
        Math.min(
          drag.radius + (drag.handle === 'radius' ? dx : 0),
          Math.floor(Math.min(nextWidth, nextLength) * 50) / 100
        )
      )
    );
    onChange({
      widthM: String(nextWidth),
      lengthM: String(nextLength),
      cornerRadiusM: String(nextRadius)
    });
  }
  function end(event: PointerEvent<SVGSVGElement>, cancel = false) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    gesture.current = null;
    setDragScale(null);
    if (cancel)
      onChange({
        widthM: String(drag.width),
        lengthM: String(drag.length),
        cornerRadiusM: String(drag.radius)
      });
    if (svg.current?.hasPointerCapture(event.pointerId))
      svg.current.releasePointerCapture(event.pointerId);
  }
  const maxRadius = Math.max(0, Math.floor(Math.min(displayWidth, displayLength) * 50) / 100);
  function dimension(field: 'widthM' | 'lengthM', text: string) {
    const next = Number(text);
    const other = Number(field === 'widthM' ? value.lengthM : value.widthM);
    const patch: Partial<FloorShapeDraft> = { [field]: text };
    if (next > 0 && other > 0 && radius > Math.min(next, other) / 2)
      patch.cornerRadiusM = String(Math.floor(Math.min(next, other) * 50) / 100);
    onChange(patch);
  }
  const handle = (name: Handle, x: number, y: number) => (
    <rect
      key={name}
      x={x - 7}
      y={y - 7}
      width={14}
      height={14}
      rx={4}
      className='fill-background stroke-primary stroke-2'
      style={{
        cursor: disabled
          ? 'default'
          : name === 'radius'
            ? 'ew-resize'
            : name === 'width'
              ? 'ew-resize'
              : name === 'length'
                ? 'ns-resize'
                : 'nwse-resize'
      }}
      onPointerDown={(event) => start(event, name)}
    >
      <title>
        {name === 'radius'
          ? c('Drag to adjust corner radius', 'Kéo để chỉnh bán kính bo góc')
          : c('Drag to resize', 'Kéo để đổi kích thước')}
      </title>
    </rect>
  );

  return (
    <section className='overflow-hidden rounded-2xl border bg-card shadow-sm'>
      <div className='grid gap-4 border-b p-5 sm:grid-cols-2'>
        <label className='space-y-2 text-sm font-medium'>
          {c('Horizontal length (m)', 'Dài ngang (m)')}
          <Input
            type='number'
            min='.01'
            max='10000'
            step='.01'
            required
            value={value.widthM}
            disabled={disabled}
            onChange={(event) => dimension('widthM', event.target.value)}
          />
        </label>
        <label className='space-y-2 text-sm font-medium'>
          {c('Vertical width (m)', 'Rộng dọc (m)')}
          <Input
            type='number'
            min='.01'
            max='10000'
            step='.01'
            required
            value={value.lengthM}
            disabled={disabled}
            onChange={(event) => dimension('lengthM', event.target.value)}
          />
        </label>
        <div className='space-y-2 sm:col-span-2'>
          <span className='text-sm font-medium'>{c('Corner shape', 'Kiểu góc tầng')}</span>
          <div className='flex gap-2'>
            {(['RECTANGULAR', 'ROUNDED'] as const).map((outline) => (
              <button
                key={outline}
                type='button'
                disabled={disabled}
                aria-pressed={value.outline === outline}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${value.outline === outline ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'}`}
                onClick={() =>
                  onChange({
                    outline,
                    cornerRadiusM:
                      outline === 'RECTANGULAR'
                        ? '0'
                        : String(centimetres(Math.min(displayWidth, displayLength) * 0.12))
                  })
                }
              >
                {outline === 'RECTANGULAR' ? (
                  <span className='size-4 border-2 border-current' />
                ) : (
                  <span className='size-4 rounded-md border-2 border-current' />
                )}
                {outline === 'RECTANGULAR'
                  ? c('Square corners', 'Góc vuông')
                  : c('Rounded corners', 'Bo tròn')}
              </button>
            ))}
          </div>
        </div>
        {value.outline === 'ROUNDED' && (
          <div className='space-y-3 rounded-xl bg-muted/50 p-4 sm:col-span-2'>
            <label className='flex items-center justify-between gap-4 text-sm font-medium'>
              <span className='flex items-center gap-2'>
                <CornerDownRight className='size-4 text-primary' />
                {c('Corner radius (m)', 'Bán kính bo góc (m)')}
              </span>
              <Input
                className='w-28'
                type='number'
                min='0'
                max={maxRadius}
                step='.01'
                value={value.cornerRadiusM}
                disabled={disabled}
                required
                onChange={(event) => onChange({ cornerRadiusM: event.target.value })}
              />
            </label>
            <input
              className='w-full accent-primary'
              type='range'
              min='0'
              max={maxRadius}
              step='.01'
              value={Math.min(radius || 0, maxRadius)}
              disabled={disabled}
              aria-label={c('Corner radius', 'Bán kính bo góc')}
              onChange={(event) => onChange({ cornerRadiusM: event.target.value })}
            />
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>0 m</span>
              <span>
                {c('Maximum', 'Tối đa')} {format(maxRadius)} m
              </span>
            </div>
          </div>
        )}
      </div>
      <div className='flex items-center justify-between gap-3 px-5 pt-5'>
        <h3 className='flex items-center gap-2 text-sm font-semibold'>
          <Ruler className='size-4 text-primary' />
          {c('Floor plan preview', 'Mặt bằng tầng')}
        </h3>
        <span className='rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary'>
          1 m × 1 m
        </span>
      </div>
      <svg
        ref={svg}
        viewBox='0 0 850 560'
        role='img'
        aria-label={c('Interactive floor dimensions', 'Mặt bằng tầng có thể chỉnh kích thước')}
        className='block aspect-[850/560] w-full select-none touch-none'
        onPointerMove={move}
        onPointerUp={(event) => end(event)}
        onPointerCancel={(event) => end(event, true)}
        onLostPointerCapture={(event) => end(event, true)}
      >
        <defs>
          <pattern
            id={`floor-grid-${value.floorNumber}`}
            width={scale}
            height={scale}
            patternUnits='userSpaceOnUse'
          >
            <path
              d={`M ${scale} 0 L 0 0 0 ${scale}`}
              fill='none'
              className='stroke-primary/15'
              strokeWidth='.7'
            />
          </pattern>
        </defs>
        <rect
          x={left}
          y={top}
          width={w}
          height={h}
          rx={r}
          className='fill-primary/5 stroke-primary'
          strokeWidth='2'
        />
        <rect
          x={left}
          y={top}
          width={w}
          height={h}
          rx={r}
          fill={`url(#floor-grid-${value.floorNumber})`}
        />
        <path
          d={`M ${left} ${top - 22} V ${top - 40} H ${left + w} V ${top - 22}`}
          fill='none'
          className='stroke-muted-foreground/50'
        />
        <text
          x={left + w / 2}
          y={top - 49}
          textAnchor='middle'
          className='fill-foreground text-[15px] font-medium'
        >
          {c('Horizontal length', 'Dài ngang')} · {format(displayWidth)} m
        </text>
        <path
          d={`M ${left + w + 18} ${top} H ${left + w + 36} V ${top + h} H ${left + w + 18}`}
          fill='none'
          className='stroke-muted-foreground/50'
        />
        <text
          x={left + w + 58}
          y={top + h / 2}
          textAnchor='middle'
          transform={`rotate(90 ${left + w + 58} ${top + h / 2})`}
          className='fill-foreground text-[15px] font-medium'
        >
          {c('Vertical width', 'Rộng dọc')} · {format(displayLength)} m
        </text>
        {w > 130 && h > 80 && (
          <g pointerEvents='none'>
            <text
              x={left + w / 2}
              y={top + h / 2 - 6}
              textAnchor='middle'
              className='fill-primary text-[24px] font-semibold'
            >
              {valid ? `${format(floorArea(width, length, radius))} m²` : '—'}
            </text>
            <text
              x={left + w / 2}
              y={top + h / 2 + 20}
              textAnchor='middle'
              className='fill-muted-foreground text-[13px]'
            >
              {c('Floor', 'Tầng')} {value.floorNumber}
            </text>
          </g>
        )}
        {!disabled && valid && (
          <>
            {handle('width', left + w, top + h / 2)}
            {handle('length', left + w / 2, top + h)}
            {handle('both', left + w - r * (1 - Math.SQRT1_2), top + h - r * (1 - Math.SQRT1_2))}
            {value.outline === 'ROUNDED' && (
              <>
                <path
                  d={`M ${left + r} ${top + r} V ${top}`}
                  className='stroke-primary/60'
                  strokeDasharray='4 3'
                />
                {handle('radius', left + r, top)}
              </>
            )}
          </>
        )}
      </svg>
      <div className='flex items-center gap-2 border-t bg-muted/25 px-5 py-3 text-xs text-muted-foreground'>
        <MoveDiagonal2 className='size-4 shrink-0' />
        {c(
          'Drag the edge handles to resize. The top corner handle changes the radius.',
          'Kéo tay nắm ở cạnh để đổi kích thước. Tay nắm góc trên chỉnh mức bo tròn.'
        )}
      </div>
      {!valid && (
        <p role='alert' className='px-5 py-3 text-sm text-destructive'>
          {c(
            'Use positive dimensions with at most 2 decimal places. The radius cannot exceed half the shorter side.',
            'Nhập kích thước lớn hơn 0, tối đa 2 số lẻ. Bán kính bo không vượt quá nửa cạnh ngắn.'
          )}
        </p>
      )}
    </section>
  );
}
