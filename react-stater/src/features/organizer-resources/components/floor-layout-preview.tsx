import { useId, useRef, useState, type PointerEvent } from 'react';
import { ZoomIn, ZoomOut, Focus, Maximize2, Hand, Layers3, Armchair, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import type { FloorLayout, LayoutItem, AvailabilityState } from '../api/resources';
import { availabilityColors, availabilityLabel } from '../utils/availability';
import { DecorationLayer } from './decoration-visual';
import { ResourceMapSymbol } from './resource-map-symbol';
import { useCanvasWheel } from './use-canvas-wheel';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
function bounds(item: {
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
}): Box {
  const angle = (item.rotation * Math.PI) / 180;
  const width = Math.abs(Math.cos(angle)) * item.width + Math.abs(Math.sin(angle)) * item.height;
  const height = Math.abs(Math.sin(angle)) * item.width + Math.abs(Math.cos(angle)) * item.height;
  return {
    x: item.posX + item.width / 2 - width / 2,
    y: item.posY + item.height / 2 - height / 2,
    width,
    height
  };
}
function frame(boxes: Box[], fallback: Box): Box {
  if (!boxes.length) return fallback;
  const x = Math.min(...boxes.map((box) => box.x)) - 45;
  const y = Math.min(...boxes.map((box) => box.y)) - 45;
  return {
    x,
    y,
    width: Math.max(120, Math.max(...boxes.map((box) => box.x + box.width)) - x + 45),
    height: Math.max(100, Math.max(...boxes.map((box) => box.y + box.height)) - y + 45)
  };
}

/** Viewing controls only: camera changes never update resource or decoration coordinates. */
export function FloorLayoutPreview({
  layout,
  width: requestedWidth,
  height: requestedHeight,
  focus,
  onFocus,
  presentation = 'card',
  availability
}: {
  layout: FloorLayout;
  width: number;
  height: number;
  focus: { key: string | null; sequence: number };
  onFocus: (key: string | null) => void;
  presentation?: 'card' | 'workspace';
  availability?: Record<number, AvailabilityState>;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const width = Number.isFinite(requestedWidth) && requestedWidth > 0 ? requestedWidth : 1200;
  const height = Number.isFinite(requestedHeight) && requestedHeight > 0 ? requestedHeight : 800;
  const id = useId().replaceAll(':', '');
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    pointerId: number;
    start: DOMPoint;
    inverse: DOMMatrix;
    camera: Box;
    moved: boolean;
    target: string | null;
  } | null>(null);
  const moved = useRef(false);
  const [cameraState, setCameraState] = useState<{ sequence: number; box: Box } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [panning, setPanning] = useState(false);
  const floor = { x: 0, y: 0, width, height };
  const resources = layout.resources.filter(
    (item): item is LayoutItem & { posX: number; posY: number; width: number; height: number } =>
      item.posX !== null && item.posY !== null && !!item.width && !!item.height
  );
  const objects = [
    ...resources.map((item) => ({
      key: `resource:${item.id}`,
      box: bounds(item),
      name: item.name
    })),
    ...(layout.decorations ?? []).map((item) => ({
      key: `decoration:${item.id}`,
      box: bounds(item),
      name: item.label
    }))
  ];
  const selected = objects.find((object) => object.key === focus.key);
  const cameraSequence = availability ? 0 : focus.sequence;
  const initial = frame(
    !availability && selected ? [selected.box] : objects.map((object) => object.box),
    floor
  );
  const camera = cameraState?.sequence === cameraSequence ? cameraState.box : initial;
  const zoom = width / camera.width;
  const setCamera = (box: Box) => setCameraState({ sequence: cameraSequence, box });
  const zoomBy = (factor: number) => {
    const nextZoom = Math.max(0.5, Math.min(12, zoom * factor));
    const nextWidth = width / nextZoom,
      nextHeight = (camera.height * nextWidth) / camera.width;
    setCamera({
      x: camera.x + (camera.width - nextWidth) / 2,
      y: camera.y + (camera.height - nextHeight) / 2,
      width: nextWidth,
      height: nextHeight
    });
  };
  useCanvasWheel(svg, zoomBy, true);
  function stop() {
    const pointerId = drag.current?.pointerId;
    drag.current = null;
    setPanning(false);
    if (pointerId !== undefined && svg.current?.hasPointerCapture(pointerId))
      svg.current.releasePointerCapture(pointerId);
  }
  function point(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || drag.current) return;
    const inverse = svg.current?.getScreenCTM()?.inverse();
    if (!inverse) return;
    event.preventDefault();
    moved.current = false;
    const target =
      (event.target as Element).closest('[data-preview-key]')?.getAttribute('data-preview-key') ??
      null;
    drag.current = {
      pointerId: event.pointerId,
      start: new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse),
      inverse,
      camera,
      moved: false,
      target
    };
    svg.current?.setPointerCapture(event.pointerId);
    setPanning(true);
  }
  function resource(item: (typeof resources)[number]) {
    const active = focus.key === `resource:${item.id}`;
    const state = availability?.[item.id];
    const color = state ? availabilityColors[state] : undefined;
    const select = () => {
      if (!moved.current) onFocus(`resource:${item.id}`);
    };
    return (
      <g
        key={item.id}
        data-preview-key={`resource:${item.id}`}
        transform={`rotate(${item.rotation || 0} ${item.posX + item.width / 2} ${item.posY + item.height / 2})`}
        role='button'
        tabIndex={0}
        aria-label={`${c('Focus', 'Phóng tới')} ${item.name}`}
        className='cursor-pointer outline-none focus:opacity-60'
        style={color ? { color } : undefined}
        onClick={select}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onFocus(`resource:${item.id}`);
          }
        }}
      >
        <title>
          {item.name}
          {state ? ` · ${availabilityLabel(state, language === 'vi')}` : ''}
        </title>
        <rect
          x={item.posX}
          y={item.posY}
          width={item.width}
          height={item.height}
          rx={item.category === 'ROOM' ? 6 : 4}
          className={
            active
              ? 'fill-primary/15 stroke-primary'
              : item.category === 'ROOM'
                ? 'fill-muted/20 stroke-muted-foreground/70'
                : 'fill-primary/5 stroke-primary/60'
          }
          strokeWidth={active ? 2.5 : 1.3}
          vectorEffect='non-scaling-stroke'
          strokeDasharray={item.category === 'ROOM' ? undefined : '3 3'}
          style={
            color ? { fill: color, fillOpacity: active ? 0.28 : 0.13, stroke: color } : undefined
          }
        />
        {item.category !== 'ROOM' && (
          <ResourceMapSymbol
            category={item.category ?? 'DESK'}
            x={item.posX}
            y={item.posY}
            width={item.width}
            height={item.height}
            className={color ? 'text-inherit' : undefined}
          />
        )}
        <text
          x={item.posX + item.width / 2}
          y={
            item.category === 'ROOM'
              ? item.posY + Math.min(16, item.height / 4)
              : item.posY + item.height * 0.88
          }
          textAnchor='middle'
          dominantBaseline='central'
          fontSize={Math.max(6, Math.min(13, item.height / 4))}
          className='pointer-events-none fill-foreground'
        >
          {item.code}
        </text>
      </g>
    );
  }
  return (
    <div
      className={
        presentation === 'workspace'
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-background'
          : 'overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm'
      }
    >
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-br from-primary/[0.07] to-background p-4'>
        <div>
          <p className='flex items-center gap-2 text-sm font-semibold'>
            <span className='flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Layers3 className='size-4' />
            </span>
            {c('Floor overview', 'Toàn cảnh tầng')}
          </p>
          <p className='mt-1.5 text-[11px] text-muted-foreground'>
            {c(
              'Drag to pan. Select an object or use the list to focus.',
              'Kéo để xem xung quanh. Chọn đối tượng hoặc bấm Xem trong danh sách để phóng tới.'
            )}
          </p>
        </div>
        <div
          role='group'
          aria-label={c('Map view controls', 'Điều khiển xem sơ đồ')}
          className='flex items-center gap-1 rounded-xl border border-border/70 bg-background/80 p-1'
        >
          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='size-8 rounded-lg'
            aria-label={c('Zoom out', 'Thu nhỏ')}
            title={c('Zoom out', 'Thu nhỏ')}
            disabled={zoom <= 0.5}
            onClick={() => zoomBy(1 / 1.25)}
          >
            <ZoomOut className='size-4' />
          </Button>
          <span className='min-w-12 text-center text-xs font-medium tabular-nums'>
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='size-8 rounded-lg'
            aria-label={c('Zoom in', 'Phóng to')}
            title={c('Zoom in', 'Phóng to')}
            disabled={zoom >= 12}
            onClick={() => zoomBy(1.25)}
          >
            <ZoomIn className='size-4' />
          </Button>
          <span className='mx-1 h-4 border-l border-border' />
          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='size-8 rounded-lg'
            aria-label={c('Fit all objects', 'Vừa toàn bộ đối tượng')}
            title={c('Fit all objects', 'Vừa toàn bộ đối tượng')}
            onClick={() =>
              setCamera(
                frame(
                  objects.map((object) => object.box),
                  floor
                )
              )
            }
          >
            <Focus className='size-4' />
          </Button>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='size-8 rounded-lg'
            aria-label={c('Expand preview', 'Mở rộng sơ đồ')}
            title={c('Expand preview', 'Mở rộng sơ đồ')}
            aria-pressed={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            <Maximize2 className='size-4' />
          </Button>
        </div>
      </div>
      <div
        className={`relative overflow-hidden bg-muted/30 ${presentation === 'workspace' ? 'flex min-h-0 flex-1' : ''}`}
      >
        <div className='pointer-events-none absolute left-3 top-3 z-10 flex gap-2'>
          <span className='flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/90 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur'>
            <Hand className='size-3' />
            {c('Pan view', 'Kéo để xem')}
          </span>
        </div>
        <svg
          data-floor-canvas='true'
          ref={svg}
          viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
          className={`block w-full touch-none select-none ${presentation === 'workspace' ? 'h-full min-h-0 flex-1' : expanded ? 'h-[34rem]' : 'h-[25rem]'} ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
          aria-label={c('Zoomable floor preview', 'Sơ đồ tầng có thể phóng to thu nhỏ')}
          onPointerDown={point}
          onPointerUp={() => {
            const current = drag.current;
            stop();
            if (current?.target && !current.moved) onFocus(current.target);
          }}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current || event.pointerId !== current.pointerId) return;
            const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(
              current.inverse
            );
            const dx = cursor.x - current.start.x,
              dy = cursor.y - current.start.y;
            if (Math.abs(dx) + Math.abs(dy) > current.camera.width / 250) {
              current.moved = true;
              moved.current = true;
            }
            if (current.moved)
              setCamera({ ...current.camera, x: current.camera.x - dx, y: current.camera.y - dy });
          }}
        >
          <defs>
            <pattern id={id} width='25' height='25' patternUnits='userSpaceOnUse'>
              <path d='M25 0H0V25' fill='none' className='stroke-border/45' strokeWidth='.6' />
            </pattern>
          </defs>
          <rect
            width={width}
            height={height}
            className='fill-background stroke-border'
            strokeWidth='1'
            vectorEffect='non-scaling-stroke'
          />
          <rect width={width} height={height} fill={`url(#${id})`} />
          {resources.filter((item) => item.category === 'ROOM').map(resource)}
          <DecorationLayer items={layout.decorations ?? []} />
          {(layout.decorations ?? []).map((item) => (
            <rect
              key={`target-${item.id}`}
              data-preview-key={`decoration:${item.id}`}
              x={item.posX}
              y={item.posY}
              width={item.width}
              height={item.height}
              transform={`rotate(${item.rotation} ${item.posX + item.width / 2} ${item.posY + item.height / 2})`}
              fill='transparent'
              role='button'
              tabIndex={0}
              className='cursor-pointer outline-none focus:stroke-primary'
              aria-label={`${c('Focus', 'Phóng tới')} ${item.label}`}
              onClick={() => {
                if (!moved.current) onFocus(`decoration:${item.id}`);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onFocus(`decoration:${item.id}`);
                }
              }}
            />
          ))}
          {selected?.key.startsWith('decoration:') && (
            <rect
              x={selected.box.x - 3}
              y={selected.box.y - 3}
              width={selected.box.width + 6}
              height={selected.box.height + 6}
              rx='5'
              fill='none'
              className='stroke-primary'
              strokeWidth='2'
              strokeDasharray='4 3'
              vectorEffect='non-scaling-stroke'
            />
          )}
          {resources.filter((item) => item.category !== 'ROOM').map(resource)}
        </svg>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-xs'>
        <div className='flex flex-wrap gap-3 text-muted-foreground'>
          <span className='flex items-center gap-1.5'>
            <DoorOpen className='size-3.5' />
            {c('Room', 'Phòng')}
          </span>
          <span className='flex items-center gap-1.5'>
            <Armchair className='size-3.5 text-primary' />
            {c('Seat', 'Ghế')}
          </span>
          <span>
            {width} × {height} px
          </span>
        </div>
        <div className='flex gap-2'>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='h-7 rounded-lg text-xs'
            onClick={() => setCamera(floor)}
          >
            {c('Entire floor', 'Toàn tầng')}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='secondary'
            className='h-7 rounded-lg text-xs'
            onClick={() =>
              setCamera(
                frame(
                  objects.map((object) => object.box),
                  floor
                )
              )
            }
          >
            {c('Fit layout', 'Vừa bố trí')}
          </Button>
        </div>
      </div>
      {selected && (
        <p className='border-t border-border bg-primary/5 px-4 py-2 text-xs font-medium text-primary'>
          {c('Viewing', 'Đang xem')}: {selected.name}
        </p>
      )}
    </div>
  );
}
