import {
  useId,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
  type ReactNode
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Move,
  Hand,
  Focus,
  LoaderCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Undo2,
  Redo2,
  RotateCcwSquare,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResourceMapSymbol } from './resource-map-symbol';
import { DecorationLayer, DecorationVisual } from './decoration-visual';
import { useCanvasWheel } from './use-canvas-wheel';
import type { FloorDecoration } from '../api/resources';
import { decorationPresets } from '../utils/decoration-presets';
import { previewLayout } from '../utils/layout-placement';
import { useLanguage } from '@/features/landing/context/language-context';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { floorLayoutOptions, type Category, type LayoutItem } from '../api/resources';
import {
  constrainPlacement,
  placementFits,
  moveWithRoom,
  selectPlacementFields,
  type Placement,
  type PlacementFields
} from '../utils/placement';

function geometry(item: LayoutItem): Placement | undefined {
  if (item.posX === null || item.posY === null || !item.width || !item.height) return;
  return {
    x: item.posX,
    y: item.posY,
    width: item.width,
    height: item.height,
    rotation: item.rotation || 0
  };
}
const numberOr = (value: string, fallback: number) =>
  value.trim() && Number.isFinite(Number(value)) ? Number(value) : fallback;
const angleOf = (value: number) => (Math.round((((value % 360) + 360) % 360) * 100) / 100) % 360;
function Tool({
  label,
  children,
  onClick,
  disabled,
  pressed
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <Button
      type='button'
      size='icon'
      variant={pressed ? 'default' : 'ghost'}
      className='size-8 shrink-0 rounded-lg shadow-none'
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

type Gesture = {
  kind: 'move' | 'resize' | 'rotate' | 'pan';
  pointerId: number;
  start: DOMPoint;
  inverse: DOMMatrix;
  initial: Placement;
  fields: PlacementFields;
  pan: { x: number; y: number };
};

export function ResourcePlacementEditor({
  decoration,
  workspaceId,
  floorId,
  resourceId,
  parentRoomId,
  category,
  value,
  disabled,
  onBegin,
  onChange,
  onUndo,
  onRedo,
  onReset,
  canUndo,
  canRedo,
  presentation = 'form',
  onSelect
}: {
  decoration?: FloorDecoration;
  workspaceId: number;
  floorId: number;
  resourceId?: number;
  parentRoomId?: number;
  category?: Category;
  value: PlacementFields;
  disabled: boolean;
  onBegin: () => void;
  onChange: (value: PlacementFields, record?: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  presentation?: 'form' | 'workspace';
  onSelect?: (key: string) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const actorId = useAuthStore((state) => state.user?.id ?? 0);
  const query = useQuery({
    ...floorLayoutOptions(actorId, workspaceId, floorId),
    enabled: floorId > 0 && actorId > 0
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<'move' | 'pan'>('move');
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(10);
  const [roomView, setRoomView] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  useCanvasWheel(
    svgRef,
    (factor) => setZoom((current) => Math.max(0.5, Math.min(12, current * factor))),
    query.isSuccess
  );
  const gridId = useId().replaceAll(':', '');
  const visibleGrid = Math.max(10, grid);
  const canvas = { width: query.data?.width ?? 1200, height: query.data?.height ?? 800 };
  const item: Placement = {
    x: numberOr(value.posX, 0),
    y: numberOr(value.posY, 0),
    width: numberOr(
      value.width,
      decoration ? decorationPresets[decoration.kind].width : category === 'ROOM' ? 240 : 60
    ),
    height: numberOr(
      value.height,
      decoration ? decorationPresets[decoration.kind].height : category === 'ROOM' ? 180 : 60
    ),
    rotation: numberOr(value.rotation, 0)
  };
  const original = query.data?.resources.find((resource) => resource.id === resourceId);
  const originalRoom = original ? geometry(original) : undefined;
  const parent = query.data?.resources.find((resource) => resource.id === parentRoomId);
  const room = parent ? geometry(parent) : undefined;
  const ready =
    !!query.data?.editableLayout &&
    !query.isFetching &&
    (!!category || !!decoration) &&
    !disabled &&
    item.width > 0 &&
    item.height > 0 &&
    (!parentRoomId || !!room);
  const locked = disabled || dragging;
  const peers = query.data?.resources.filter((peer) => peer.id !== resourceId) ?? [];
  const rendered = peers.map((peer) => {
    const position = geometry(peer);
    const child = category === 'ROOM' && peer.parentRoomId === resourceId && !!resourceId;
    return {
      peer,
      child,
      position:
        child && position && originalRoom ? moveWithRoom(position, originalRoom, item) : position
    };
  });
  const children = rendered.filter((peer) => peer.child);
  const childOutside = children.some(
    (child) => child.position && !placementFits(child.position, canvas, item)
  );
  const staticPeers = rendered.filter((peer) => !peer.child);
  const preview = query.data
    ? previewLayout(query.data, item, { resourceId, parentRoomId, category, decoration })
    : undefined;
  const collisions = preview?.collisions ?? new Set<string>();
  const fits = placementFits(item, canvas, room) && (preview?.fits ?? true);
  const roomAngle = ((room?.rotation ?? 0) * Math.PI) / 180;
  const focusedWidth = room
    ? Math.abs(Math.cos(roomAngle)) * room.width + Math.abs(Math.sin(roomAngle)) * room.height + 60
    : canvas.width;
  const focusedHeight = room
    ? Math.abs(Math.sin(roomAngle)) * room.width + Math.abs(Math.cos(roomAngle)) * room.height + 60
    : canvas.height;
  const baseWidth = roomView && room ? focusedWidth : canvas.width;
  const baseHeight = roomView && room ? focusedHeight : canvas.height;
  const viewWidth = baseWidth / zoom,
    viewHeight = baseHeight / zoom;
  const centerX = (roomView && room ? room.x + room.width / 2 : canvas.width / 2) + pan.x;
  const centerY = (roomView && room ? room.y + room.height / 2 : canvas.height / 2) + pan.y;
  const viewBox = `${centerX - viewWidth / 2} ${centerY - viewHeight / 2} ${viewWidth} ${viewHeight}`;
  const handleRadius = viewWidth / 95;
  const transform = `rotate(${item.rotation} ${item.x + item.width / 2} ${item.y + item.height / 2})`;

  function place(next: Placement, record = true) {
    if (!ready) return;
    const constrained = constrainPlacement(next, canvas, room);
    if (!constrained) return;
    onChange(
      {
        posX: String(constrained.x),
        posY: String(constrained.y),
        width: String(constrained.width),
        height: String(constrained.height),
        rotation: String(constrained.rotation)
      },
      record
    );
  }
  function begin(event: PointerEvent<SVGElement>, kind: Gesture['kind']) {
    if (gesture.current || event.button !== 0 || (kind !== 'pan' && !ready) || disabled) return;
    if (kind !== 'pan' && mode === 'pan') return;
    const inverse = svgRef.current?.getScreenCTM()?.inverse();
    if (!inverse) return;
    event.preventDefault();
    event.stopPropagation();
    if (kind !== 'pan') {
      event.currentTarget.focus();
      onBegin();
    }
    gesture.current = {
      kind,
      pointerId: event.pointerId,
      start: new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse),
      inverse,
      initial: item,
      fields: selectPlacementFields(value),
      pan
    };
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function stop(cancel = false) {
    const current = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (cancel && current) {
      if (current.kind === 'pan') setPan(current.pan);
      else onChange(current.fields, false);
    }
    if (current && svgRef.current?.hasPointerCapture(current.pointerId))
      svgRef.current.releasePointerCapture(current.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(current.inverse);
    const dx = cursor.x - current.start.x,
      dy = cursor.y - current.start.y;
    const quantize = (number: number) => (snap ? Math.round(number / grid) * grid : number);
    if (current.kind === 'pan') {
      setPan({ x: current.pan.x - dx, y: current.pan.y - dy });
      return;
    }
    if (current.kind === 'move') {
      place(
        {
          ...current.initial,
          x: quantize(current.initial.x + dx),
          y: quantize(current.initial.y + dy)
        },
        false
      );
    } else if (current.kind === 'rotate') {
      const cx = current.initial.x + current.initial.width / 2,
        cy = current.initial.y + current.initial.height / 2;
      const delta =
        ((Math.atan2(cursor.y - cy, cursor.x - cx) -
          Math.atan2(current.start.y - cy, current.start.x - cx)) *
          180) /
        Math.PI;
      const angle = current.initial.rotation + delta;
      place(
        { ...current.initial, rotation: angleOf(snap ? Math.round(angle / 15) * 15 : angle) },
        false
      );
    } else {
      const angle = (current.initial.rotation * Math.PI) / 180;
      const width = Math.min(
        999999.99,
        Math.max(1, quantize(current.initial.width + Math.cos(angle) * dx + Math.sin(angle) * dy))
      );
      const height = Math.min(
        999999.99,
        Math.max(1, quantize(current.initial.height - Math.sin(angle) * dx + Math.cos(angle) * dy))
      );
      const anchorX =
        current.initial.x +
        current.initial.width / 2 -
        (Math.cos(angle) * current.initial.width) / 2 +
        (Math.sin(angle) * current.initial.height) / 2;
      const anchorY =
        current.initial.y +
        current.initial.height / 2 -
        (Math.sin(angle) * current.initial.width) / 2 -
        (Math.cos(angle) * current.initial.height) / 2;
      place(
        {
          ...current.initial,
          width,
          height,
          x: anchorX + (Math.cos(angle) * width) / 2 - (Math.sin(angle) * height) / 2 - width / 2,
          y: anchorY + (Math.sin(angle) * width) / 2 + (Math.cos(angle) * height) / 2 - height / 2
        },
        false
      );
    }
  }
  function fitView() {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }
  function command(event: KeyboardEvent<SVGElement>): boolean {
    if (gesture.current && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      stop(true);
      return true;
    }
    if (!locked && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) onRedo();
      else onUndo();
      return true;
    }
    return false;
  }

  function drawPeer(entry: (typeof rendered)[number]) {
    const shape = entry.position;
    if (!shape) return null;
    const invalid = entry.child && !placementFits(shape, canvas, item);
    return (
      <g
        key={entry.peer.id}
        transform={`rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`}
        className={
          onSelect ? 'cursor-pointer outline-none focus:opacity-60' : 'pointer-events-none'
        }
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-label={onSelect ? entry.peer.name : undefined}
        onClick={
          onSelect
            ? (event) => {
                if (!dragging && mode !== 'pan') {
                  event.stopPropagation();
                  onSelect(`resource:${entry.peer.id}`);
                }
              }
            : undefined
        }
        onKeyDown={
          onSelect
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(`resource:${entry.peer.id}`);
                }
              }
            : undefined
        }
      >
        <title>
          {entry.peer.name}
          {entry.child ? ` — ${c('moves with this room', 'di chuyển cùng phòng')}` : ''}
        </title>
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx='3'
          vectorEffect='non-scaling-stroke'
          strokeWidth={entry.child || entry.peer.id === parentRoomId ? 2 : 1}
          strokeDasharray={entry.peer.category === 'ROOM' ? undefined : '3 3'}
          className={
            invalid
              ? 'fill-destructive/25 stroke-destructive'
              : entry.child
                ? 'fill-primary/25 stroke-primary'
                : entry.peer.id === parentRoomId
                  ? 'fill-primary/5 stroke-primary'
                  : 'fill-muted/60 stroke-muted-foreground/40'
          }
        />
        {entry.peer.category !== 'ROOM' && (
          <ResourceMapSymbol
            category={entry.peer.category ?? 'DESK'}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            className={
              invalid ? 'text-destructive' : entry.child ? 'text-primary' : 'text-muted-foreground'
            }
          />
        )}
        <text
          x={shape.x + shape.width / 2}
          y={
            entry.peer.category === 'ROOM'
              ? shape.y + Math.min(14, shape.height / 3)
              : shape.y + shape.height * 0.86
          }
          textAnchor='middle'
          dominantBaseline='central'
          fontSize={Math.min(12, shape.height / 3)}
          className='fill-muted-foreground'
        >
          {entry.peer.code}
        </text>
      </g>
    );
  }

  return (
    <div
      role='region'
      aria-label={c('Resource placement controls', 'Điều khiển bố trí ghế/phòng')}
      className={
        presentation === 'workspace'
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-background'
          : 'mt-5 overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm'
      }
    >
      <div className='space-y-3 border-b border-border bg-gradient-to-br from-primary/[0.06] via-background to-background px-4 py-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <p className='flex items-center gap-2 text-sm font-semibold'>
              <span className='flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <Move className='size-4' />
              </span>
              {decoration
                ? c('Layout object placement', 'Bố trí đồ vật')
                : c('Visual placement editor', 'Bố trí trực quan')}
            </p>
            <p className='mt-1.5 text-[11px] text-muted-foreground'>
              {c(
                'Arrange your floor visually. Save when ready.',
                'Sắp xếp không gian trực quan. Bấm Lưu khi hoàn tất.'
              )}
            </p>
          </div>
          <div
            role='group'
            aria-label={c('Edit tools', 'Công cụ chỉnh sửa')}
            className='flex items-center gap-1 rounded-xl border border-border/70 bg-background/80 p-1 shadow-sm'
          >
            <Tool
              label={c('Move resource', 'Di chuyển ghế/phòng')}
              pressed={mode === 'move'}
              disabled={locked}
              onClick={() => setMode('move')}
            >
              <Move className='size-4' />
            </Tool>
            <Tool
              label={c('Pan canvas', 'Di chuyển vùng xem')}
              pressed={mode === 'pan'}
              disabled={locked}
              onClick={() => setMode('pan')}
            >
              <Hand className='size-4' />
            </Tool>
            <span className='mx-1 h-4 border-l border-border' />
            <Tool
              label={c('Undo position', 'Hoàn tác vị trí')}
              disabled={locked || !canUndo}
              onClick={onUndo}
            >
              <Undo2 className='size-4' />
            </Tool>
            <Tool
              label={c('Redo position', 'Làm lại vị trí')}
              disabled={locked || !canRedo}
              onClick={onRedo}
            >
              <Redo2 className='size-4' />
            </Tool>
            <Tool
              label={c('Reset position to when the form opened', 'Đặt lại vị trí lúc mở form')}
              disabled={locked}
              onClick={onReset}
            >
              <RotateCcwSquare className='size-4' />
            </Tool>
          </div>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <label className='flex h-8 items-center gap-2 rounded-lg bg-muted/60 px-2.5 text-xs'>
              <input
                type='checkbox'
                checked={snap}
                disabled={locked}
                onChange={(event) => setSnap(event.target.checked)}
              />
              {c('Snap', 'Bám lưới')}
            </label>
            <select
              aria-label={c('Grid size', 'Kích thước lưới')}
              className='h-8 rounded-lg border border-input bg-background px-2 text-xs'
              value={grid}
              disabled={locked}
              onChange={(event) => setGrid(Number(event.target.value))}
            >
              {[1, 5, 10, 20].map((size) => (
                <option key={size} value={size}>
                  {size} px
                </option>
              ))}
            </select>
            <Tool
              label={c('Rotate left 15°', 'Xoay trái 15°')}
              disabled={!ready || dragging}
              onClick={() => place({ ...item, rotation: angleOf(item.rotation - 15) })}
            >
              <RotateCcw className='size-4' />
            </Tool>
            <Tool
              label={c('Rotate right 15°', 'Xoay phải 15°')}
              disabled={!ready || dragging}
              onClick={() => place({ ...item, rotation: angleOf(item.rotation + 15) })}
            >
              <RotateCw className='size-4' />
            </Tool>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              disabled={!ready || dragging}
              onClick={() =>
                place({
                  ...item,
                  x: (room ? room.x + room.width / 2 : canvas.width / 2) - item.width / 2,
                  y: (room ? room.y + room.height / 2 : canvas.height / 2) - item.height / 2
                })
              }
            >
              {room ? c('Center in room', 'Đặt giữa phòng') : c('Center on floor', 'Đặt giữa tầng')}
            </Button>
          </div>
          <div
            role='group'
            aria-label={c('View controls', 'Điều khiển vùng xem')}
            className='flex items-center gap-0.5 rounded-xl border border-border/70 bg-background/80 p-1'
          >
            <Tool
              label={c('Zoom out', 'Thu nhỏ')}
              disabled={locked || zoom <= 0.5}
              onClick={() => setZoom((value) => Math.max(0.5, value / 1.25))}
            >
              <ZoomOut className='size-4' />
            </Tool>
            <span className='min-w-10 text-center text-xs tabular-nums'>
              {Math.round(zoom * 100)}%
            </span>
            <Tool
              label={c('Zoom in', 'Phóng to')}
              disabled={locked || zoom >= 12}
              onClick={() => setZoom((value) => Math.min(12, value * 1.25))}
            >
              <ZoomIn className='size-4' />
            </Tool>
            <Tool label={c('Fit canvas', 'Vừa khung xem')} disabled={locked} onClick={fitView}>
              <Focus className='size-4' />
            </Tool>
            <Tool
              label={c('Expand/collapse preview', 'Mở rộng/thu gọn sơ đồ')}
              pressed={expanded}
              disabled={locked}
              onClick={() => setExpanded(!expanded)}
            >
              <Maximize2 className='size-4' />
            </Tool>
          </div>
        </div>
        {room && (
          <Button
            type='button'
            size='sm'
            variant='secondary'
            className='h-8 rounded-lg border border-primary/20 bg-primary/10 px-3 text-xs text-primary hover:bg-primary/15'
            disabled={locked}
            onClick={() => {
              setRoomView(!roomView);
              fitView();
            }}
          >
            {roomView
              ? c('Show entire floor', 'Xem toàn tầng')
              : c('Focus containing room', 'Phóng tới phòng chứa ghế')}
          </Button>
        )}
      </div>
      {!floorId ? (
        <p className='p-4 text-sm text-muted-foreground'>
          {c('Choose a floor to start.', 'Chọn tầng để bắt đầu.')}
        </p>
      ) : query.isPending ? (
        <div className='flex items-center gap-2 p-6 text-sm text-muted-foreground'>
          <LoaderCircle className='size-4 animate-spin' />
          {c('Loading floor…', 'Đang tải sơ đồ…')}
        </div>
      ) : query.isError ? (
        <div className='p-4 text-sm text-destructive'>
          {c('Could not load the floor preview.', 'Không thể tải sơ đồ tầng.')}{' '}
          <Button type='button' variant='outline' size='sm' onClick={() => query.refetch()}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      ) : (
        <>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            data-floor-canvas='true'
            className={`block w-full touch-none select-none bg-muted/20 ${presentation === 'workspace' ? 'min-h-[380px] flex-1' : expanded ? 'h-[30rem]' : 'h-72 sm:h-80'} ${mode === 'pan' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            aria-label={c(
              'Interactive resource positioning canvas',
              'Sơ đồ kéo thả vị trí ghế/phòng'
            )}
            onPointerDown={(event) => {
              if (mode === 'pan') begin(event, 'pan');
            }}
            onPointerMove={move}
            onPointerUp={() => stop()}
            onPointerCancel={() => stop(true)}
            onLostPointerCapture={() => stop()}
          >
            <defs>
              <pattern
                id={gridId}
                width={visibleGrid}
                height={visibleGrid}
                patternUnits='userSpaceOnUse'
              >
                <path
                  d={`M ${visibleGrid} 0 L 0 0 0 ${visibleGrid}`}
                  fill='none'
                  className='stroke-border/40'
                  strokeWidth='0.5'
                />
              </pattern>
            </defs>
            <rect width={canvas.width} height={canvas.height} className='fill-background' />
            <rect
              width={canvas.width}
              height={canvas.height}
              fill={`url(#${gridId})`}
              className='stroke-border'
              strokeWidth='1'
            />
            {staticPeers.filter((entry) => entry.peer.category === 'ROOM').map(drawPeer)}
            <DecorationLayer
              onSelect={
                onSelect && mode !== 'pan' && !dragging
                  ? (id) => onSelect(`decoration:${id}`)
                  : undefined
              }
              items={(preview?.decorations ?? query.data?.decorations ?? []).filter(
                (item) => item.id !== decoration?.id
              )}
            />
            {staticPeers.filter((entry) => entry.peer.category !== 'ROOM').map(drawPeer)}
            <g
              role='button'
              tabIndex={ready ? 0 : -1}
              aria-disabled={!ready}
              aria-label={c(
                'Move selected resource with arrow keys',
                'Di chuyển ghế/phòng đang chọn bằng phím mũi tên'
              )}
              transform={transform}
              className={
                ready && mode === 'move'
                  ? 'cursor-grab outline-none focus:opacity-75 active:cursor-grabbing'
                  : 'opacity-60'
              }
              onPointerDown={(event) => begin(event, 'move')}
              onKeyDown={(event) => {
                if (command(event)) return;
                if (!ready || dragging) return;
                if (event.key === 'Escape') {
                  stop(true);
                  return;
                }
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
                  return;
                event.preventDefault();
                const step = event.shiftKey ? 10 : 1;
                if (mode === 'pan') {
                  setPan((value) => ({
                    x:
                      value.x +
                      (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
                    y:
                      value.y +
                      (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
                  }));
                  return;
                }
                place({
                  ...item,
                  x:
                    item.x +
                    (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
                  y:
                    item.y +
                    (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
                });
              }}
            >
              <rect
                x={item.x}
                y={item.y}
                width={Math.max(1, item.width)}
                height={Math.max(1, item.height)}
                rx='4'
                vectorEffect='non-scaling-stroke'
                strokeWidth='2'
                strokeDasharray={category === 'ROOM' ? undefined : '4 3'}
                className={
                  !fits || collisions.size
                    ? 'fill-destructive/20 stroke-destructive'
                    : decoration
                      ? 'fill-transparent stroke-primary'
                      : category === 'ROOM'
                        ? 'fill-primary/10 stroke-primary'
                        : 'fill-primary/35 stroke-primary'
                }
              />
              {decoration && (
                <DecorationVisual
                  item={{
                    ...decoration,
                    posX: item.x,
                    posY: item.y,
                    width: item.width,
                    height: item.height,
                    rotation: item.rotation
                  }}
                />
              )}
              {!decoration && category !== 'ROOM' && (
                <ResourceMapSymbol
                  category={category ?? 'DESK'}
                  x={item.x}
                  y={item.y}
                  width={item.width}
                  height={item.height}
                  className={!fits || collisions.size ? 'text-destructive' : 'text-primary'}
                />
              )}
              <text
                x={item.x + item.width / 2}
                y={
                  category !== 'ROOM'
                    ? item.y + item.height * 0.88
                    : children.length
                      ? item.y + Math.min(14, item.height / 3)
                      : item.y + item.height / 2
                }
                textAnchor='middle'
                dominantBaseline='central'
                fontSize={Math.max(6, Math.min(13, item.height / 3))}
                className='pointer-events-none fill-foreground'
              >
                {decoration
                  ? ''
                  : category !== 'ROOM'
                    ? c('Selected', 'Đang chọn')
                    : children.length
                      ? c('Room group', 'Nhóm phòng')
                      : c('Room', 'Phòng')}
              </text>
            </g>
            {children.map(drawPeer)}
            {onSelect && category === 'ROOM' && (
              <DecorationLayer
                items={(preview?.decorations ?? []).filter((object) => {
                  const original = query.data?.decorations?.find((entry) => entry.id === object.id);
                  return (
                    original &&
                    originalRoom &&
                    placementFits(
                      {
                        x: original.posX,
                        y: original.posY,
                        width: original.width,
                        height: original.height,
                        rotation: original.rotation
                      },
                      canvas,
                      originalRoom
                    )
                  );
                })}
                onSelect={
                  mode !== 'pan' && !dragging ? (id) => onSelect(`decoration:${id}`) : undefined
                }
              />
            )}
            {ready && mode === 'move' && (
              <g transform={transform}>
                <line
                  x1={item.x + item.width / 2}
                  y1={item.y}
                  x2={item.x + item.width / 2}
                  y2={item.y - handleRadius * 4}
                  className='stroke-primary'
                  vectorEffect='non-scaling-stroke'
                />
                <circle
                  role='button'
                  tabIndex={0}
                  aria-label={c(
                    'Drag to rotate; arrow keys rotate 1 degree',
                    'Kéo để xoay; phím mũi tên xoay 1 độ'
                  )}
                  cx={item.x + item.width / 2}
                  cy={item.y - handleRadius * 4}
                  r={handleRadius}
                  className='cursor-crosshair fill-background stroke-primary'
                  vectorEffect='non-scaling-stroke'
                  strokeWidth='2'
                  onPointerDown={(event) => begin(event, 'rotate')}
                  onKeyDown={(event) => {
                    if (command(event)) return;
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                      event.preventDefault();
                      place({
                        ...item,
                        rotation: angleOf(
                          item.rotation +
                            (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 15 : 1)
                        )
                      });
                    }
                  }}
                />
                <rect
                  role='button'
                  tabIndex={0}
                  aria-label={c(
                    'Drag to resize; arrow keys change size',
                    'Kéo để đổi kích thước; phím mũi tên chỉnh kích thước'
                  )}
                  x={item.x + item.width - handleRadius}
                  y={item.y + item.height - handleRadius}
                  width={handleRadius * 2}
                  height={handleRadius * 2}
                  rx={handleRadius / 3}
                  className='cursor-nwse-resize fill-primary stroke-background'
                  vectorEffect='non-scaling-stroke'
                  strokeWidth='2'
                  onPointerDown={(event) => begin(event, 'resize')}
                  onKeyDown={(event) => {
                    if (command(event)) return;
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
                      event.preventDefault();
                      const step = event.shiftKey ? 10 : 1;
                      place({
                        ...item,
                        width: Math.max(
                          1,
                          item.width +
                            (event.key === 'ArrowRight'
                              ? step
                              : event.key === 'ArrowLeft'
                                ? -step
                                : 0)
                        ),
                        height: Math.max(
                          1,
                          item.height +
                            (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
                        )
                      });
                    }
                  }}
                />
              </g>
            )}
          </svg>
          <div
            className='space-y-1.5 border-t border-border px-4 py-3 text-xs text-muted-foreground'
            aria-live='polite'
          >
            <p className='font-mono tabular-nums'>
              {canvas.width} × {canvas.height} px · X: {value.posX || '—'} · Y: {value.posY || '—'}{' '}
              · {value.width || '—'} × {value.height || '—'} · {value.rotation || 0}°
            </p>
            {children.length > 0 && (
              <p className='font-medium text-primary'>
                {children.length}{' '}
                {c(
                  'assigned desks move and rotate with this room. Their sizes remain unchanged.',
                  'ghế đã gán sẽ di chuyển và xoay cùng phòng. Kích thước ghế giữ nguyên.'
                )}
              </p>
            )}
            {!fits && (
              <p className='text-destructive'>
                {childOutside
                  ? c(
                      'The resized room cannot contain all its desks. Increase the room size or reposition the desks first.',
                      'Phòng sau khi chỉnh không chứa đủ các ghế. Hãy tăng kích thước phòng hoặc bố trí lại ghế trước.'
                    )
                  : c(
                      'The current position is outside the floor or containing room.',
                      'Vị trí hiện tại nằm ngoài tầng hoặc phòng chứa ghế.'
                    )}
              </p>
            )}
            {collisions.size > 0 && (
              <p className='text-destructive'>
                {c('Overlaps with: ', 'Đang chồng lấn với: ')}
                {[...collisions].slice(0, 5).join(', ')}
              </p>
            )}
            {parentRoomId && !room && (
              <p className='text-destructive'>
                {c(
                  'The containing room needs complete geometry first.',
                  'Phòng chứa ghế cần có đầy đủ tọa độ và kích thước trước.'
                )}
              </p>
            )}
            {!query.data?.width && (
              <p>
                {c(
                  'Draft preview uses a 1200 × 800 canvas until floor dimensions are published.',
                  'Bản xem trước dùng khung 1200 × 800 khi tầng chưa có kích thước được publish.'
                )}
              </p>
            )}
            {!query.data?.editableLayout && (
              <p>
                {c(
                  'Use the dedicated Floor Plan editor for this layout.',
                  'Sử dụng công cụ Sơ đồ tầng riêng để chỉnh định dạng sơ đồ này.'
                )}
              </p>
            )}
            <p>
              {c(
                'Drag the shape to move, the square handle to resize, or the round handle to rotate. Arrow keys: 1 px; Shift: 10 px. Ctrl/Cmd+Z: undo; Shift+Ctrl/Cmd+Z: redo. Changes are saved only when you press Save.',
                'Kéo khối để di chuyển, nút vuông để đổi kích thước, nút tròn để xoay. Phím mũi tên: 1 px; Shift: 10 px. Ctrl/Cmd+Z: hoàn tác; Shift+Ctrl/Cmd+Z: làm lại. Chỉ ghi dữ liệu khi bấm Lưu.'
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
