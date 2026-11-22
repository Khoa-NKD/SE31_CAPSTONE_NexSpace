import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import type { Building } from '../api/buildings';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move3D,
  ChevronRight,
  MousePointer2,
  LockKeyhole,
  Maximize2
} from '@/components/ui/hugeicons';
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
import { workspaceBuildingFloors } from '../utils/workspace-building-floors';
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
  const floorLabel = (floor: Pick<FloorOption, 'floorNumber'>) => `${c('Floor', 'Tầng')} ${floor.floorNumber}`;
  // Sort a copy to preserve query data and the project's pre-ES2023 browser target.
  const physicalEntries = workspaceBuildingFloors(building, floors, workspace.id);
  const openFloor = (id: number) => {
    const f = physicalEntries.find((v) => v.id === id);
    if (f?.linked && id > 0) onOpenFloor(id, workspace.id);
  };
  // oxlint-disable-next-line unicorn/no-array-sort
  const ordered = [...physicalEntries].sort((a, b) => a.floorNumber - b.floorNumber || a.id - b.id);
  // oxlint-disable-next-line unicorn/no-array-reverse
  const descendingFloors = [...ordered].reverse();
  const modelScale =
    300 /
    Math.max(
      1,
      ...ordered.flatMap((floor) => [floor.physicalWidth ?? 1200, floor.physicalHeight ?? 840])
    );
  const plate = (floor: (typeof ordered)[number] | undefined) => ({
    width: (floor?.physicalWidth ?? 1200) * modelScale,
    height: (floor?.physicalHeight ?? 840) * modelScale,
    radius: (floor?.cornerRadiusPx ?? 0) * modelScale
  });
  const foundation = plate(ordered[0]);
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
  const linkedFloors = ordered.filter((floor) => floor.linked);
  const selected = linkedFloors.find((floor) => floor.id === selectedId);
  const active = selected ?? linkedFloors.find((floor) => floor.id === hovered);
  const detail = useQuery({
    ...floorLayoutOptions(actorId, selected?.workspaceId ?? workspace.id, selected?.id ?? 0),
    enabled: !!selected && selected.id > 0
  });
  const writable = canConfigureWorkspaceResources(workspace.status);
  const gap = Math.max(4, Math.min(exploded ? 72 : 34, 260 / Math.max(1, ordered.length)));
  const hoverFloor = (id: number | null) => {
    setHovered(id !== null && linkedFloors.some((floor) => floor.id === id) ? id : null);
  };
  const selectFloor = (id: number) => {
    if (!linkedFloors.some((floor) => floor.id === id)) return;
    setSelectedId(id);
    setHovered(id);
  };
  const clearFloorFocus = () => {
    setSelectedId(null);
    setHovered(null);
  };
  useEffect(() => {
    if (selectedId === null) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"][data-state="open"]'))
        clearFloorFocus();
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
      <OrganizerPageHeader
        title={workspace.name}
        leading={
          <Button
            variant='outline'
            size='icon'
            className='size-9 shrink-0'
            aria-label={c('Back to workspaces', 'Về danh sách không gian')}
            onClick={onBack}
          >
            <ArrowLeft className='size-4' />
          </Button>
        }
      >
        <Badge variant='outline' className='rounded-full px-3 py-1'>
          {workspaceState(workspace.status, vi)}
        </Badge>
        <Button size='sm' disabled={!writable} onClick={onAddFloor}>
          {building ? <Pencil className='size-4' /> : <Plus className='size-4' />}
          {building
            ? c('Edit address & floor setup', 'Sửa địa chỉ & cấu hình tầng')
            : c('Set up location & floors', 'Thiết lập địa điểm & tầng')}
        </Button>
      </OrganizerPageHeader>
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
            style={{ perspective: '1400px' }}
            onPointerDown={(event) => {
              if (
                event.button !== 0 ||
                (event.target as Element).closest('button, [data-building-overlay]')
              )
                return;
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
            <div
              className={
                selected
                  ? 'hidden'
                  : 'pointer-events-none absolute right-5 top-5 z-10 w-48 rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-lg backdrop-blur-md'
              }
            >
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
                  <div
                    aria-hidden='true'
                    className='pointer-events-none absolute bg-foreground/10 blur-xl'
                    style={{
                      width: foundation.width,
                      height: foundation.height,
                      left: (300 - foundation.width) / 2,
                      top: (210 - foundation.height) / 2,
                      borderRadius: foundation.radius,
                      transform: 'translateZ(-36px)'
                    }}
                  />

                </div>
                {ordered.map((floor, index) => (
                  <BuildingStorey
                    key={floor.id}
                    floor={floor}
                    geometry={plate(floor)}
                    label={floorLabel(floor)}
                    index={index}
                    roof={index === ordered.length - 1}
                    gap={gap}
                    camera={camera}
                    disabled={!floor.linked}
                    hovered={hovered === floor.id && selected?.id !== floor.id}
                    picked={selected?.id === floor.id}
                    layout={selected?.id === floor.id ? detail.data : undefined}
                    loading={selected?.id === floor.id && floor.id > 0 && detail.isPending}
                    onHover={hoverFloor}
                    onPick={() => selectFloor(floor.id)}
                    onReturn={clearFloorFocus}
                    onOpen={() => openFloor(floor.id)}
                  />
                ))}
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
                  {c('Link the first floor', 'Liên kết tầng đầu tiên')}
                </Button>
              </div>
            )}
            <div
              role='toolbar'
              aria-label={c('Building view controls', 'Điều khiển mô hình tòa nhà')}
              data-building-overlay
              className='nexspace-building-controls absolute left-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border border-border/80 bg-background/95 p-1 shadow-md backdrop-blur'
            >
              <Button
                size='icon'
                variant='ghost'
                className='size-8 shrink-0 rounded-lg'
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
                className='size-8 shrink-0 rounded-lg'
                aria-label={c('Rotate right', 'Xoay phải')}
                onClick={() =>
                  setCamera((previous) => ({ ...previous, angle: previous.angle + 15 }))
                }
              >
                <RotateCw className='size-3.5' />
              </Button>
              <span className='my-0.5 w-7 border-t border-border' />
              <Button
                size='icon'
                variant='ghost'
                className='size-8 shrink-0 rounded-lg'
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
                className='size-8 shrink-0 rounded-lg'
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
              <span className='my-0.5 w-7 border-t border-border' />
              <button
                type='button'
                className='w-14 whitespace-nowrap rounded-lg px-1 py-2 text-[10px] text-muted-foreground hover:bg-muted'
                onClick={() => setCamera((previous) => ({ ...previous, angle: -32, tilt: 58 }))}
              >
                {c('Isometric', 'Đẳng cự')}
              </button>
              <button
                type='button'
                className='w-14 whitespace-nowrap rounded-lg px-1 py-2 text-[10px] text-muted-foreground hover:bg-muted'
                onClick={() => setCamera((previous) => ({ ...previous, angle: 0, tilt: 38 }))}
              >
                {c('Front', 'Mặt trước')}
              </button>
              <button
                type='button'
                className='w-14 whitespace-nowrap rounded-lg px-1 py-2 text-[10px] text-muted-foreground hover:bg-muted'
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
              {c('Location overview', 'Tổng quan địa điểm')}
            </p>
              <dl className='space-y-3 text-sm'>
                <div className='flex items-start gap-2'>
                  <MapPin className='mt-0.5 size-4 shrink-0 text-primary' />
                  <div className='min-w-0'>
                    <dt className='text-xs text-muted-foreground'>{c('Address', 'Địa chỉ')}</dt>
                    <dd className='mt-1 break-words font-medium'>
                      {building?.address || c('No address set', 'Chưa thiết lập địa chỉ')}
                    </dd>
                  </div>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <dt className='text-muted-foreground'>{c('Workspace floors', 'Số tầng sử dụng')}</dt>
                  <dd className='font-semibold tabular-nums'>{linkedFloorCount}</dd>
                </div>
                {building && building.floors.length !== linkedFloorCount && (
                  <div className='flex items-center justify-between gap-2'>
                    <dt className='text-muted-foreground'>{c('Building total', 'Tổng số tầng')}</dt>
                    <dd className='font-semibold tabular-nums'>{building.floors.length}</dd>
                  </div>
                )}
              </dl>
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
                <div key={floor.id} className='flex min-w-0 items-center gap-1 rounded-xl p-1 hover:bg-muted/50'>
                  <button
                    type='button'
                    disabled={!floor.linked}
                    onMouseEnter={() => hoverFloor(floor.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => hoverFloor(floor.id)}
                    aria-pressed={selected?.id === floor.id}
                    onClick={() => selectFloor(floor.id)}
                    className={`flex w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${!floor.linked ? 'cursor-default border-transparent bg-muted/40 opacity-45' : active?.id === floor.id ? 'border-primary/20 bg-primary/5' : 'border-transparent hover:bg-muted'}`}
                  >
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-primary'>
                      {floor.floorNumber.toString().padStart(2, '0')}
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span
                        className='block truncate text-xs font-medium'
                        title={floorLabel(floor)}
                      >
                        {floorLabel(floor)}
                      </span>
                      <span className='mt-1 block text-[10px] text-muted-foreground'>
                        {!floor.linked
                          ? c('Not linked to this workspace', 'Không thuộc workspace này')
                          : floor.status === 'PUBLISHED'
                            ? c('Published', 'Đã xuất bản')
                            : c('Draft', 'Bản nháp')}
                      </span>
                    </span>
                  </button>
                  {floor.linked && floor.id > 0 && (
                    <div className='flex shrink-0 items-center gap-0.5'>
                      <FloorActions
                      compact
                      workspaceId={workspace.id}
                      floor={floors.find((item) => item.id === floor.id) ?? floor}
                      floors={floors}
                      disabled={!writable}
                      onSaved={onSaved}
                      onDeleted={clearFloorFocus}
                      onCopied={(copy) => selectFloor(copy.id)}
                      />
                      <Button variant='ghost' size='icon' className='size-8 shrink-0 rounded-lg'
                        aria-label={c('Open layout', 'Mở sơ đồ') + ' · ' + floorLabel(floor)}
                        title={c('Open layout', 'Mở sơ đồ')}
                        onClick={() => openFloor(floor.id)}>
                        <ArrowRight className='size-4' />
                      </Button>
                    </div>
                  )}
                </div>
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
