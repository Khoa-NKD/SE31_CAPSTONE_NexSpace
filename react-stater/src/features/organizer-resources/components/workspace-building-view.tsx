import type { Building } from '../api/buildings';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Layers3,
  Plus,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move3D,
  ChevronRight,
  MousePointer2,
  CheckCircle2,
  LockKeyhole,
  Armchair,
  DoorOpen,
  Shapes,
  Scan,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  canConfigureWorkspaceResources,
  floorLayoutOptions,
  type WorkspaceOption,
  type FloorOption
} from '../api/resources';
import { workspaceState } from './workspace-floor-gallery';
import { BuildingStorey } from './building-storey';
import { FloorActions } from './floor-actions';
import './workspace-building.css';

export function WorkspaceBuildingView({
  workspace,
  building,
  actorId,
  floors,
  onBack,
  onOpenFloor,
  onAddFloor,
  onSaved
}: {
  workspace: WorkspaceOption;
  building?: Building;
  actorId: number;
  floors: FloorOption[];
  onBack: () => void;
  onOpenFloor: (id: number, workspaceId?: number) => void;
  onAddFloor: () => void;
  onSaved: () => Promise<void>;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const c = (en: string, local: string) => (vi ? local : en);
  // Sort a copy to preserve query data and the project's pre-ES2023 browser target.
  const physicalEntries: Array<FloorOption & { workspaceId?: number; displayName?: string }> =
    building
      ? building.floors.map((f) => {
          const occupant =
            f.occupants.find((o) => o.workspaceId === workspace.id) ?? f.occupants[0];
          const own = floors.find((l) => l.location?.buildingFloorId === f.id);
          const linkedNames = [
            ...new Set(
              f.occupants
                .map((o) =>
                  o.layoutName.trim().replace(new RegExp(` – (?:Tầng|Floor) ${f.floorNumber}$`), '')
                )
                .filter(Boolean)
            )
          ];
          return {
            ...(own ?? {
              id: occupant?.floorPlanId ?? -f.id,
              name: f.name,
              floorNumber: f.floorNumber,
              status: occupant?.status ?? 'DRAFT',
              revision: ''
            }),
            workspaceId: occupant?.workspaceId,
            name: f.name,
            displayName: linkedNames.length ? `${f.name} (${linkedNames.join(', ')})` : f.name
          };
        })
      : floors;
  const openFloor = (id: number) => {
    const f = physicalEntries.find((v) => v.id === id);
    if (id > 0) onOpenFloor(id, f?.workspaceId);
    else onAddFloor();
  };
  // oxlint-disable-next-line unicorn/no-array-sort
  const ordered = [...physicalEntries].sort((a, b) => a.floorNumber - b.floorNumber || a.id - b.id);
  // oxlint-disable-next-line unicorn/no-array-reverse
  const descendingFloors = [...ordered].reverse();
  const linkedFloorCount = building
    ? building.floors.filter((floor) =>
        floor.occupants.some((area) => area.workspaceId === workspace.id)
      ).length
    : floors.length;
  const [hovered, setHovered] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [camera, setCamera] = useState({ angle: -32, tilt: 58, zoom: 1 });
  const [exploded, setExploded] = useState(false);
  const scene = useRef<HTMLElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; angle: number; tilt: number } | null>(
    null
  );
  const selected = ordered.find((floor) => floor.id === selectedId);
  const active = selected ?? ordered.find((floor) => floor.id === hovered) ?? ordered.at(-1);
  const detail = useQuery({
    ...floorLayoutOptions(actorId, selected?.workspaceId ?? workspace.id, selected?.id ?? 0),
    enabled: !!selected && selected.id > 0
  });
  const writable = canConfigureWorkspaceResources(workspace.status);
  const gap = Math.max(4, Math.min(exploded ? 72 : 34, 260 / Math.max(1, ordered.length)));
  const selectFloor = (id: number) => {
    setSelectedId(id);
    setHovered(id);
  };
  useEffect(() => {
    if (selectedId === null) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"][data-state="open"]'))
        setSelectedId(null);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [selectedId]);
  return (
    <div className='space-y-5 pb-5'>
      <nav
        aria-label={c('Floor navigation', 'Điều hướng sơ đồ tầng')}
        className='flex items-center gap-2 text-xs text-muted-foreground'
      >
        <button type='button' onClick={onBack} className='transition-colors hover:text-primary'>
          {c('Workspaces', 'Không gian')}
        </button>
        <ChevronRight className='size-3.5' />
        <span className='truncate font-medium text-foreground'>{workspace.name}</span>
      </nav>
      <header className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            size='icon'
            className='size-10 rounded-xl'
            aria-label={c('Back to workspaces', 'Về danh sách không gian')}
            onClick={onBack}
          >
            <ArrowLeft className='size-4' />
          </Button>
          <div>
            <p className='mb-1 text-[10px] font-semibold uppercase tracking-[.17em] text-primary'>
              NexSpace · Building Explorer
            </p>
            <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>{workspace.name}</h1>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='rounded-full px-3 py-1.5'>
            {workspaceState(workspace.status, vi)}
          </Badge>
          <Button className='rounded-xl' size='sm' disabled={!writable} onClick={onAddFloor}>
            <Plus className='size-4' />
            {c('Add floor', 'Thêm tầng')}
          </Button>
        </div>
      </header>
      <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]'>
        <section
          ref={scene}
          aria-label={c('Interactive 3D building', 'Tòa nhà 3D tương tác')}
          className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'
        >
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary/[.06] to-card px-5 py-4'>
            <div>
              <h2 className='flex items-center gap-2 text-sm font-semibold'>
                <Move3D className='size-4 text-primary' />
                {building?.name ??
                  c(
                    'Workspace layouts awaiting location mapping',
                    'Sơ đồ workspace chưa liên kết vị trí'
                  )}
              </h2>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                {c(
                  'Select a floor to pull it out. Inspect its details, then open the floor plan.',
                  'Chọn tầng để rút ra khỏi tòa nhà. Xem thông tin rồi bấm Xem sơ đồ.'
                )}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                size='icon'
                variant='ghost'
                aria-label={c('Fullscreen building', 'Tòa nhà toàn màn hình')}
                onClick={() => {
                  const operation = document.fullscreenElement
                    ? document.exitFullscreen()
                    : scene.current?.requestFullscreen();
                  operation?.catch(() => {});
                }}
              >
                <Maximize2 className='size-4' />
              </Button>
              <button
                type='button'
                aria-pressed={exploded}
                onClick={() => setExploded(!exploded)}
                className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${exploded ? 'border-primary/25 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'}`}
              >
                <Layers3 className='mr-1.5 inline size-3.5' />
                {c('Separate floors', 'Tách lớp tầng')}
              </button>
            </div>
          </div>
          <div
            className={`nexspace-building-scene relative h-[560px] overflow-hidden bg-gradient-to-b from-muted/10 via-primary/[.025] to-muted/30 sm:h-[620px] ${selected ? 'has-selected-floor' : ''}`}
            style={
              {
                perspective: '1400px',
                '--picked-z': `${Math.max(200, ordered.length * gap + 60)}px`
              } as CSSProperties
            }
            onPointerDown={(event) => {
              if (event.button !== 0 || (event.target as Element).closest('button')) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              pointer.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                angle: camera.angle,
                tilt: camera.tilt
              };
            }}
            onPointerMove={(event) => {
              const drag = pointer.current;
              // Keep hover stable while the storey itself moves away from the cursor.
              if (
                !drag &&
                (event.movementX || event.movementY) &&
                !(event.target as Element).closest('.nexspace-building-storey')
              )
                setHovered(null);
              if (drag?.id !== event.pointerId) return;
              setCamera((previous) => ({
                ...previous,
                angle: drag.angle + (event.clientX - drag.x) * 0.3,
                tilt: Math.min(72, Math.max(30, drag.tilt - (event.clientY - drag.y) * 0.2))
              }));
            }}
            onPointerUp={(event) => {
              pointer.current = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              pointer.current = null;
            }}
            onPointerLeave={() => setHovered(null)}
          >
            <div className='pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur'>
              <MousePointer2 className='size-3' />
              {selected
                ? c('Floor extracted · Esc to return', 'Đã rút tầng · Esc để đưa về')
                : c('Drag background to orbit', 'Kéo nền để xoay góc nhìn')}
            </div>
            <div className='pointer-events-none absolute right-5 top-5 z-10 w-48 rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-lg backdrop-blur-md'>
              <div className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
                <span className='flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  <Layers3 className='size-4' />
                </span>
                {c('Workspace uses', 'Workspace sử dụng')}
              </div>
              <p className='mt-3 flex items-baseline gap-2'>
                <span className='text-4xl font-semibold tabular-nums tracking-tight text-primary'>
                  {linkedFloorCount}
                </span>
                <span className='text-sm font-medium text-foreground'>
                  {c(linkedFloorCount === 1 ? 'floor' : 'floors', 'tầng')}
                </span>
              </p>
              {building && (
                <div className='mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs'>
                  <span className='flex items-center gap-1.5 text-muted-foreground'>
                    <Building2 className='size-3.5' />
                    {c('Building total', 'Tổng tòa nhà')}
                  </span>
                  <span className='whitespace-nowrap font-semibold text-foreground'>
                    {building.floors.length}{' '}
                    {c(building.floors.length === 1 ? 'floor' : 'floors', 'tầng')}
                  </span>
                </div>
              )}
            </div>
            {floors.length ? (
              <>
                <div
                  className='nexspace-building-rig'
                  style={
                    {
                      transform: `rotateX(${camera.tilt}deg) rotateZ(${camera.angle}deg) scale(${camera.zoom})`,
                      '--floor-depth': `${Math.max(3, Math.min(29, gap - 4))}px`
                    } as CSSProperties
                  }
                >
                  <div className='nexspace-building-ground' />
                  <div className='nexspace-building-foundation' />
                  {selected && (
                    <div
                      aria-hidden='true'
                      className='nexspace-building-vacancy'
                      style={{
                        transform: `translateZ(${ordered.findIndex((floor) => floor.id === selected.id) * gap}px)`
                      }}
                    />
                  )}
                </div>
                {ordered.map((floor, index) => (
                  <BuildingStorey
                    key={floor.id}
                    floor={floor}
                    label={floor.displayName ?? floor.name}
                    index={index}
                    gap={gap}
                    camera={camera}
                    hovered={hovered === floor.id && selectedId !== floor.id}
                    picked={selectedId === floor.id}
                    layout={selectedId === floor.id ? detail.data : undefined}
                    loading={selectedId === floor.id && floor.id > 0 && detail.isPending}
                    onHover={setHovered}
                    onPick={() => selectFloor(floor.id)}
                    onReturn={() => setSelectedId(null)}
                    onOpen={() => openFloor(floor.id)}
                  />
                ))}
                <div
                  aria-hidden='true'
                  className='nexspace-building-rig nexspace-building-cap'
                  style={
                    {
                      transform: `rotateX(${camera.tilt}deg) rotateZ(${camera.angle}deg) scale(${camera.zoom})`,
                      zIndex: ordered.length + 1
                    } as CSSProperties
                  }
                >
                  <div
                    className='nexspace-building-roof'
                    style={{
                      transform: `translateZ(${Math.max(0, ordered.length - 1) * gap + 10}px)`
                    }}
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </>
            ) : (
              <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center'>
                <Building2 className='size-16 text-primary/25' />
                <h3 className='text-lg font-semibold'>
                  {c('Your building starts here', 'Bắt đầu tòa nhà của bạn')}
                </h3>
                <p className='max-w-xs text-xs leading-relaxed text-muted-foreground'>
                  {c(
                    'Add your first floor to start arranging resources.',
                    'Thêm tầng đầu tiên để bắt đầu bố trí ghế/phòng.'
                  )}
                </p>
                <Button disabled={!writable} onClick={onAddFloor}>
                  <Plus className='size-4' />
                  {c('Add the first floor', 'Thêm tầng đầu tiên')}
                </Button>
              </div>
            )}
            <div className='absolute bottom-5 left-1/2 z-10 flex max-w-[calc(100%-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border border-border/80 bg-background/90 p-1.5 shadow-lg shadow-black/5 backdrop-blur'>
              <Button
                size='icon'
                variant='ghost'
                className='size-8 rounded-xl'
                aria-label={c('Rotate left', 'Xoay trái')}
                onClick={() =>
                  setCamera((previous) => ({ ...previous, angle: previous.angle - 15 }))
                }
              >
                <RotateCcw className='size-3.5' />
              </Button>
              <Button
                size='icon'
                variant='ghost'
                className='size-8 rounded-xl'
                aria-label={c('Rotate right', 'Xoay phải')}
                onClick={() =>
                  setCamera((previous) => ({ ...previous, angle: previous.angle + 15 }))
                }
              >
                <RotateCw className='size-3.5' />
              </Button>
              <span className='mx-1 h-4 border-l border-border' />
              <Button
                size='icon'
                variant='ghost'
                className='size-8 rounded-xl'
                disabled={camera.zoom <= 0.5}
                aria-label={c('Zoom out', 'Thu nhỏ')}
                onClick={() =>
                  setCamera((previous) => ({
                    ...previous,
                    zoom: Math.max(0.5, previous.zoom - 0.1)
                  }))
                }
              >
                <ZoomOut className='size-3.5' />
              </Button>
              <button
                type='button'
                className='min-w-12 text-[11px] tabular-nums text-muted-foreground'
                title={c('Reset view', 'Đặt lại góc nhìn')}
                onClick={() => setCamera({ angle: -32, tilt: 58, zoom: 1 })}
              >
                {Math.round(camera.zoom * 100)}%
              </button>
              <Button
                size='icon'
                variant='ghost'
                className='size-8 rounded-xl'
                disabled={camera.zoom >= 1.8}
                aria-label={c('Zoom in', 'Phóng to')}
                onClick={() =>
                  setCamera((previous) => ({
                    ...previous,
                    zoom: Math.min(1.8, previous.zoom + 0.1)
                  }))
                }
              >
                <ZoomIn className='size-3.5' />
              </Button>
              <span className='mx-1 h-4 border-l border-border' />
              <button
                type='button'
                className='rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted'
                onClick={() => setCamera((previous) => ({ ...previous, angle: -32, tilt: 58 }))}
              >
                {c('Isometric', 'Đẳng cự')}
              </button>
              <button
                type='button'
                className='rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted'
                onClick={() => setCamera((previous) => ({ ...previous, angle: 0, tilt: 38 }))}
              >
                {c('Front', 'Mặt trước')}
              </button>
              <button
                type='button'
                className='rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted'
                onClick={() => setCamera((previous) => ({ ...previous, angle: -12, tilt: 72 }))}
              >
                {c('Top', 'Từ trên')}
              </button>
            </div>
          </div>
          <div className='flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[10px] text-muted-foreground'>
            <span className='flex items-center gap-2'>
              <span className='size-1.5 rounded-full bg-primary' />
              {c(
                'Schematic building · actual workspace floors',
                'Mô hình minh họa · dùng các tầng thật của không gian'
              )}
            </span>
            <span>
              {floors.filter((floor) => floor.status === 'PUBLISHED').length}{' '}
              {c('published', 'tầng đã xuất bản')}
            </span>
          </div>
        </section>
        <aside className='flex flex-col gap-4'>
          <section className='rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[.06] to-card p-5'>
            <p className='mb-4 text-[10px] font-semibold uppercase tracking-[.17em] text-primary'>
              {c('Floor spotlight', 'Thông tin tầng')}
            </p>
            {active ? (
              <>
                <div className='mb-4 flex justify-end'>
                  <FloorActions
                    workspaceId={workspace.id}
                    floor={
                      detail.data?.floor.id === active.id
                        ? detail.data.floor
                        : (floors.find((f) => f.id === active.id) ?? active)
                    }
                    floors={floors}
                    disabled={
                      !writable ||
                      active.id <= 0 ||
                      (!!active.workspaceId && active.workspaceId !== workspace.id)
                    }
                    onSaved={onSaved}
                    onDeleted={() => {
                      setSelectedId(null);
                      setHovered(null);
                    }}
                    onCopied={(floor) => selectFloor(floor.id)}
                  />
                </div>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-[11px] text-muted-foreground'>
                      {c('Floor', 'Tầng')} {active.floorNumber}
                    </p>
                    <h2 className='mt-1 break-words text-xl font-semibold tracking-tight'>
                      {active.displayName ?? active.name}
                    </h2>
                    {building && (
                      <div className='mt-3 space-y-2'>
                        {building.floors
                          .find((f) => f.floorNumber === active.floorNumber)
                          ?.occupants.map((o) => (
                            <button
                              key={o.floorPlanId}
                              type='button'
                              onClick={() => onOpenFloor(o.floorPlanId, o.workspaceId)}
                              className='block w-full rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-left text-xs'
                            >
                              <strong>{o.workspaceName ?? `Workspace #${o.workspaceId}`}</strong>
                              <span className='mt-1 block text-muted-foreground'>
                                {o.layoutName} · {o.width} × {o.height} px
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <span className='flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary'>
                    <Layers3 className='size-5' />
                  </span>
                </div>
                <Badge variant='secondary' className='mt-4 gap-1.5 rounded-full text-[10px]'>
                  {active.status === 'PUBLISHED' && <CheckCircle2 className='size-3' />}
                  {active.status === 'PUBLISHED'
                    ? c('Published layout', 'Sơ đồ đã xuất bản')
                    : c('Draft layout', 'Sơ đồ bản nháp')}
                </Badge>
                {selected && detail.data && (
                  <div className='mt-4 grid grid-cols-2 gap-2'>
                    {[
                      [
                        c('Rooms', 'Phòng'),
                        detail.data.resources.filter((item) => item.category === 'ROOM').length,
                        DoorOpen
                      ],
                      [
                        c('Seats', 'Ghế'),
                        detail.data.resources.filter((item) => item.category === 'DESK').length,
                        Armchair
                      ],
                      [c('Furnishings', 'Đồ bố trí'), detail.data.decorations?.length ?? 0, Shapes],
                      [
                        'Canvas',
                        detail.data.width && detail.data.height
                          ? `${detail.data.width} × ${detail.data.height}`
                          : c('Not set', 'Chưa thiết lập'),
                        Scan
                      ]
                    ].map(([label, value, Icon]) => {
                      const Symbol = Icon as typeof DoorOpen;
                      return (
                        <div
                          key={String(label)}
                          className='rounded-xl border border-border/70 bg-background/60 p-3'
                        >
                          <p className='flex items-center gap-1.5 text-[10px] text-muted-foreground'>
                            <Symbol className='size-3' />
                            {String(label)}
                          </p>
                          <p className='mt-1.5 text-sm font-semibold tabular-nums'>
                            {String(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className='mt-4 text-xs leading-relaxed text-muted-foreground'>
                  {c(
                    'Select this floor to bring it forward and inspect its saved layout.',
                    'Chọn tầng để đưa ra phía trước và xem bố trí đã lưu của tầng.'
                  )}
                </p>
                <Button
                  className='mt-5 w-full rounded-xl'
                  size='sm'
                  onClick={() => (selected ? openFloor(selected.id) : selectFloor(active.id))}
                >
                  {selected
                    ? c('View floor plan', 'Xem sơ đồ')
                    : c('Inspect this floor', 'Khám phá tầng này')}
                  <ArrowRight className='size-4' />
                </Button>
              </>
            ) : (
              <p className='text-xs text-muted-foreground'>
                {c('Create a floor to get started.', 'Thêm tầng để bắt đầu thiết kế.')}
              </p>
            )}
          </section>
          <section className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card'>
            <div className='flex items-center justify-between border-b border-border px-4 py-3'>
              <h2 className='text-xs font-semibold'>
                {building
                  ? c('Building floors', 'Các tầng của tòa nhà')
                  : c('Floor directory', 'Danh sách tầng')}
              </h2>
              <span className='text-[10px] tabular-nums text-muted-foreground'>
                {descendingFloors.length}
              </span>
            </div>
            <div className='max-h-[350px] space-y-1 overflow-y-auto p-2'>
              {descendingFloors.map((floor) => (
                <button
                  type='button'
                  key={floor.id}
                  onMouseEnter={() => setHovered(floor.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(floor.id)}
                  aria-pressed={selected?.id === floor.id}
                  onClick={() => selectFloor(floor.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${active?.id === floor.id ? 'border-primary/20 bg-primary/5' : 'border-transparent hover:bg-muted'}`}
                >
                  <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-primary'>
                    {floor.floorNumber.toString().padStart(2, '0')}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span
                      className='block truncate text-xs font-medium'
                      title={floor.displayName ?? floor.name}
                    >
                      {floor.displayName ?? floor.name}
                    </span>
                    <span className='mt-1 block text-[10px] text-muted-foreground'>
                      {floor.status === 'PUBLISHED'
                        ? c('Published', 'Đã xuất bản')
                        : c('Draft', 'Bản nháp')}
                    </span>
                  </span>
                  <ArrowRight className='size-3.5 text-muted-foreground' />
                </button>
              ))}
            </div>
          </section>
          {!writable && (
            <p className='flex items-start gap-2 rounded-xl bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground'>
              <LockKeyhole className='mt-0.5 size-3.5 shrink-0' />
              {c(
                'This workspace is read-only in its current state.',
                'Không gian đang ở trạng thái chỉ xem, chưa thể chỉnh sửa bố trí.'
              )}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
