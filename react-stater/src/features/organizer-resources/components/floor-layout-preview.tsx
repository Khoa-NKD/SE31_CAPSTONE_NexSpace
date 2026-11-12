import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Focus,
  Maximize2,
  Minimize2,
  Hand,
  Layers3,
  Armchair,
  DoorOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import type { FloorLayout, LayoutItem, AvailabilityState } from '../api/resources';
import { availabilityColors, availabilityLabel } from '../utils/availability';
import { DecorationLayer } from './decoration-visual';
import { ResourceMapSymbol } from './resource-map-symbol';
import type { PlacementFields } from '../utils/placement';

import { useCanvasWheel } from './use-canvas-wheel';
import {
  SharedFloorLayer,
  SharedFloorTooltip,
  useSharedFloorContext
} from './shared-floor-context';

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
  availability,
  previewChanges,
  collisionKeys,
  onObjectDrag,
  actions
}: {
  layout: FloorLayout;
  width: number;
  height: number;
  focus: { key: string | null; sequence: number };
  onFocus: (key: string | null) => void;
  presentation?: 'card' | 'workspace';
  availability?: Record<number, AvailabilityState>;
  previewChanges?: Record<string, 'ADD' | 'UPDATE'>;
  collisionKeys?: ReadonlySet<string>;
  actions?: ReactNode;
  onObjectDrag?: (
    key: string,
    fields: PlacementFields,
    phase: 'start' | 'move' | 'end' | 'cancel'
  ) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const shared = useSharedFloorContext(layout, presentation === 'workspace');
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
    editing: boolean;
    initial?: PlacementFields;
    fields?: PlacementFields;
  } | null>(null);
  const moved = useRef(false);
  const [objectHover, setObjectHover] = useState<{ key: string; left: number; top: number } | null>(
    null
  );
  const [cameraState, setCameraState] = useState<{ sequence: number; box: Box } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === container.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.fullscreenElement !== container.current)
        setExpanded(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', escape);
    };
  }, [expanded]);
  async function toggleFullscreen() {
    shared.clearHover();
    if (expanded) {
      try {
        if (document.fullscreenElement === container.current) await document.exitFullscreen();
        else setExpanded(false);
      } catch {
        toast.error(c('Press Esc to exit fullscreen.', 'Nhấn Esc để thoát toàn màn hình.'));
      }
      return;
    }
    try {
      if (document.fullscreenEnabled && container.current?.requestFullscreen)
        await container.current.requestFullscreen();
      else setExpanded(true);
    } catch {
      setExpanded(true);
    }
  }
  const [panning, setPanning] = useState(false);
  const floor = shared.bounds ?? { x: 0, y: 0, width, height };
  const originalResources = layout.resources.filter(
    (item): item is LayoutItem & { posX: number; posY: number; width: number; height: number } =>
      item.posX !== null && item.posY !== null && !!item.width && !!item.height
  );
  const resources = originalResources;
  const decorations = layout.decorations ?? [];
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
    !availability && selected
      ? [selected.box]
      : shared.bounds
        ? [shared.bounds]
        : objects.map((object) => object.box),
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
    setObjectHover(null);
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
      target,
      editing: !!target && !!onObjectDrag,
      initial: target ? dragFields(target, 0, 0) : undefined
    };
    setCamera(camera);
    svg.current?.setPointerCapture(event.pointerId);
    setPanning(true);
  }
  function dragFields(key: string, dx: number, dy: number): PlacementFields | undefined {
    const initial = drag.current?.target === key ? drag.current.initial : undefined;
    const item = initial
      ? {
          posX: Number(initial.posX),
          posY: Number(initial.posY),
          width: Number(initial.width),
          height: Number(initial.height),
          rotation: Number(initial.rotation)
        }
      : key.startsWith('resource:')
        ? originalResources.find((r) => `resource:${r.id}` === key)
        : layout.decorations?.find((d) => `decoration:${d.id}` === key);
    if (
      !item ||
      item.posX == null ||
      item.posY == null ||
      item.width == null ||
      item.height == null
    )
      return;
    return {
      posX: String(Math.round((item.posX + dx) * 100) / 100),
      posY: String(Math.round((item.posY + dy) * 100) / 100),
      width: String(item.width),
      height: String(item.height),
      rotation: String(item.rotation ?? 0)
    };
  }
  const hoveredResource = originalResources.find((r) => `resource:${r.id}` === objectHover?.key);
  const hoveredObject = layout.decorations?.find((d) => `decoration:${d.id}` === objectHover?.key);
  function resource(item: (typeof resources)[number]) {
    const active = focus.key === `resource:${item.id}`;
    const state = availability?.[item.id];
    const change = previewChanges?.[`resource:${item.id}`];
    const collision = collisionKeys?.has(`resource:${item.id}`);
    const color = collision
      ? '#ef4444'
      : change
        ? change === 'ADD'
          ? '#10b981'
          : '#f59e0b'
        : state
          ? availabilityColors[state]
          : undefined;
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
          {change
            ? ` · ${change === 'ADD' ? c('New', 'Thêm mới') : c('Updated', 'Chỉnh sửa')}`
            : ''}
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
          strokeWidth={active || collision ? 2.5 : 1.3}
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
      ref={container}
      className={
        expanded
          ? 'fixed inset-0 z-[80] flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-background'
          : presentation === 'workspace'
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-background'
            : 'overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm'
      }
    >
      {!objectHover && <SharedFloorTooltip context={shared} />}
      {actions && (
        <div className='flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2'>
          {actions}
        </div>
      )}
      {objectHover && (hoveredResource || hoveredObject) && (
        <div
          role='tooltip'
          className='pointer-events-none fixed z-[110] w-64 rounded-xl border border-primary/20 bg-popover p-3 text-popover-foreground shadow-xl'
          style={{ left: objectHover.left, top: objectHover.top }}
        >
          <p className='text-sm font-semibold'>{hoveredResource?.name ?? hoveredObject?.label}</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {hoveredResource
              ? `${hoveredResource.code} · ${hoveredResource.category === 'ROOM' ? c('Room', 'Phòng') : c('Seat', 'Ghế')}`
              : c('Layout object · Not bookable', 'Đồ bố trí · Không đặt chỗ')}
          </p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {hoveredResource?.width ?? hoveredObject?.width} ×{' '}
            {hoveredResource?.height ?? hoveredObject?.height} px
            {hoveredResource?.capacity
              ? ` · ${hoveredResource.capacity} ${c('people', 'người')}`
              : ''}
          </p>
          <p className='mt-2 text-xs font-medium text-primary'>
            {onObjectDrag
              ? c('Drag to move · Click for properties', 'Kéo để di chuyển · Click xem thuộc tính')
              : c('Click for properties', 'Click xem thuộc tính')}
          </p>
        </div>
      )}
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-br from-primary/[0.07] to-background px-4 py-2.5'>
        <div>
          <p className='flex items-center gap-2 text-sm font-semibold'>
            <span className='flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Layers3 className='size-4' />
            </span>
            {c('Floor overview', 'Toàn cảnh tầng')}
          </p>
          <p
            className={
              presentation === 'workspace' ? 'sr-only' : 'mt-1.5 text-[11px] text-muted-foreground'
            }
          >
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
            aria-label={
              expanded
                ? c('Exit fullscreen (Esc)', 'Thoát toàn màn hình (Esc)')
                : c('Fullscreen preview', 'Xem sơ đồ toàn màn hình')
            }
            title={
              expanded
                ? c('Exit fullscreen (Esc)', 'Thoát toàn màn hình (Esc)')
                : c('Fullscreen preview', 'Xem sơ đồ toàn màn hình')
            }
            aria-pressed={expanded}
            onClick={() => void toggleFullscreen()}
          >
            {expanded ? <Minimize2 className='size-4' /> : <Maximize2 className='size-4' />}
          </Button>
          {expanded && (
            <span className='px-2 text-xs text-muted-foreground'>
              {c('Esc to exit', 'Esc để thu gọn')}
            </span>
          )}
        </div>
      </div>
      <div
        className={`relative overflow-hidden bg-muted/30 ${presentation === 'workspace' || expanded ? 'flex min-h-0 flex-1' : ''}`}
      >
        <div className='pointer-events-none absolute left-3 top-3 z-10 flex gap-2'>
          <span className='flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/90 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur'>
            <Hand className='size-3' />
            {onObjectDrag
              ? c(
                  'Drag objects to move · Drag background to pan',
                  'Kéo đồ vật để di chuyển · Kéo nền để xem'
                )
              : c('Pan view', 'Kéo để xem')}
          </span>
        </div>
        <svg
          data-floor-canvas='true'
          ref={svg}
          viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
          className={`block w-full touch-none select-none ${presentation === 'workspace' || expanded ? 'absolute inset-0 h-full' : 'h-[25rem]'} ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
          aria-label={c('Zoomable floor preview', 'Sơ đồ tầng có thể phóng to thu nhỏ')}
          onPointerDown={(event) => {
            shared.clearHover();
            point(event);
          }}
          onPointerLeave={() => {
            shared.clearHover();
            setObjectHover(null);
          }}
          onWheel={shared.clearHover}
          onPointerUp={() => {
            const current = drag.current;
            stop();
            if (current?.editing && current.moved && current.target) {
              const fields = current.fields ?? current.initial;
              if (fields) onObjectDrag?.(current.target, fields, 'end');
            } else if (current?.target && !current.moved) onFocus(current.target);
          }}
          onPointerCancel={() => {
            const current = drag.current;
            if (current?.editing && current.moved && current.target) {
              const fields = dragFields(current.target, 0, 0);
              if (fields) onObjectDrag?.(current.target, fields, 'cancel');
            }
            stop();
          }}
          onLostPointerCapture={() => {
            const current = drag.current;
            if (current?.editing && current.moved && current.target) {
              const fields = dragFields(current.target, 0, 0);
              if (fields) onObjectDrag?.(current.target, fields, 'cancel');
            }
            stop();
          }}
          onPointerMove={(event) => {
            shared.inspectArea(event);
            const current = drag.current;
            if (!current) {
              const key = (event.target as Element)
                .closest('[data-preview-key]')
                ?.getAttribute('data-preview-key');
              setObjectHover(
                key
                  ? {
                      key,
                      left: Math.max(8, Math.min(event.clientX + 16, window.innerWidth - 280)),
                      top: Math.max(8, Math.min(event.clientY + 16, window.innerHeight - 160))
                    }
                  : null
              );
            }
            if (!current || event.pointerId !== current.pointerId) return;
            const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(
              current.inverse
            );
            const dx = cursor.x - current.start.x,
              dy = cursor.y - current.start.y;
            if (Math.abs(dx) + Math.abs(dy) > current.camera.width / 250) {
              if (!current.moved && current.editing && current.target) {
                const fields = dragFields(current.target, 0, 0);
                if (fields) onObjectDrag?.(current.target, fields, 'start');
              }
              current.moved = true;
              moved.current = true;
            }
            if (current.moved && current.editing && current.target) {
              const fields = dragFields(current.target, dx, dy);
              if (fields) {
                current.fields = fields;
                onObjectDrag?.(current.target, fields, 'move');
              }
            } else if (current.moved)
              setCamera({ ...current.camera, x: current.camera.x - dx, y: current.camera.y - dy });
          }}
        >
          <defs>
            <pattern id={id} width='25' height='25' patternUnits='userSpaceOnUse'>
              <path d='M25 0H0V25' fill='none' className='stroke-border/45' strokeWidth='.6' />
            </pattern>
          </defs>
          <SharedFloorLayer context={shared} />
          <rect
            width={width}
            height={height}
            className={
              shared.bounds ? 'fill-background stroke-primary' : 'fill-background stroke-border'
            }
            strokeWidth='1'
            vectorEffect='non-scaling-stroke'
          />
          <rect width={width} height={height} fill={`url(#${id})`} />
          {resources.filter((item) => item.category === 'ROOM').map(resource)}
          <DecorationLayer items={decorations} />
          {decorations.map((item) => (
            <rect
              key={`target-${item.id}`}
              data-preview-key={`decoration:${item.id}`}
              x={item.posX}
              y={item.posY}
              width={item.width}
              height={item.height}
              transform={`rotate(${item.rotation} ${item.posX + item.width / 2} ${item.posY + item.height / 2})`}
              fill='transparent'
              stroke={
                collisionKeys?.has(`decoration:${item.id}`)
                  ? '#ef4444'
                  : previewChanges?.[`decoration:${item.id}`] === 'ADD'
                    ? '#10b981'
                    : previewChanges?.[`decoration:${item.id}`] === 'UPDATE'
                      ? '#f59e0b'
                      : undefined
              }
              strokeWidth={
                collisionKeys?.has(`decoration:${item.id}`) ||
                previewChanges?.[`decoration:${item.id}`]
                  ? 2
                  : undefined
              }
              strokeDasharray={previewChanges?.[`decoration:${item.id}`] ? '5 3' : undefined}
              vectorEffect='non-scaling-stroke'
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
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-xs'>
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
