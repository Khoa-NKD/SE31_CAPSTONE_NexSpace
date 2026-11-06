import { useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Armchair,
  DoorOpen,
  Layers3,
  Plus,
  Search,
  SlidersHorizontal,
  Save,
  Upload,
  Download,
  Maximize2,
  RefreshCw,
  MousePointer2,
  LockKeyhole,
  Trash2,
  Copy,
  CheckCircle2,
  LoaderCircle,
  X,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  floorLayoutOptions,
  getResource,
  saveResource,
  saveFloorDecorations,
  publishResourceFloor,
  resourceFormSchema,
  type FloorDecoration,
  type ResourceDetail,
  type ResourceOptions,
  type WorkspaceOption,
  type DecorationKind
} from '../api/resources';
import { canvasPosition, canvasResourceForm } from '../utils/canvas-resource-form';
import { decorationPresets } from '../utils/decoration-presets';
import { selectPlacementFields, type PlacementFields } from '../utils/placement';
import { FloorLayoutPreview } from './floor-layout-preview';
import { ResourcePlacementEditor } from './resource-placement-editor';
import { DecorationIcon } from './decoration-visual';
import { usePlacementValidation } from './use-placement-validation';
import { FloorActions } from './floor-actions';
import {
  FloorAvailabilityPanel,
  FloorAvailabilityInspector,
  useFloorAvailability
} from './floor-availability-panel';
import { availabilityColors, availabilityLabel } from '../utils/availability';

type Selection = {
  key: string;
  resource?: ResourceDetail;
  object?: FloorDecoration;
  initial: PlacementFields;
  fields: PlacementFields;
  originalObject?: FloorDecoration;
};
const samePosition = (a: PlacementFields, b: PlacementFields) =>
  Object.keys(a).every(
    (key) => Number(a[key as keyof PlacementFields]) === Number(b[key as keyof PlacementFields])
  );

/** A single-resource editor backed by the same persisted geometry as Seats & Rooms. */
export function FloorCanvasWorkspace({
  actorId,
  workspaceId,
  workspaces,
  options,
  writable,
  onWorkspaceChange,
  onSaved,
  onAdd,
  onEditResource,
  initialFloorId,
  onFloorChange,
  onBack
}: {
  actorId: number;
  workspaceId: number;
  workspaces: WorkspaceOption[];
  options: ResourceOptions;
  writable: boolean;
  onWorkspaceChange: (id: number) => void;
  onSaved: () => Promise<void>;
  onAdd: (kind: 'floor' | 'type' | 'resource', floorId: number) => void;
  onEditResource: (resource: ResourceDetail) => void;
  initialFloorId: number;
  onFloorChange: (id: number) => void;
  onBack: () => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const container = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  const floorId = initialFloorId;
  const query = useQuery({
    ...floorLayoutOptions(actorId, workspaceId, floorId),
    enabled: floorId > 0
  });
  const layout = query.data;
  const [selection, setSelection] = useState<Selection | null>(null);
  const [availabilityMode, setAvailabilityMode] = useState(false);
  const [calendarFocus, setCalendarFocus] = useState({ key: null as string | null, sequence: 0 });
  const calendar = useFloorAvailability(actorId, workspaceId, floorId, availabilityMode);
  const calendarState = (key: string) => calendar.states[Number(key.slice('resource:'.length))];
  const focusCalendar = (key: string | null) =>
    setCalendarFocus((previous) => ({ key, sequence: previous.sequence + 1 }));
  const [undo, setUndo] = useState<PlacementFields[]>([]);
  const [redo, setRedo] = useState<PlacementFields[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'resources' | 'objects'>('all');
  const [settings, setSettings] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: string; height: string } | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [remove, setRemove] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState({ key: null as string | null, sequence: 0 });
  const dirtySelection =
    !!selection &&
    (!samePosition(selection.fields, selection.initial) ||
      (!!selection.object &&
        JSON.stringify(selection.object) !== JSON.stringify(selection.originalObject)));
  const dirtyDimensions =
    !!dimensions &&
    (Number(dimensions.width) !== layout?.width || Number(dimensions.height) !== layout?.height);
  const dirty = dirtySelection || dirtyDimensions;
  const navigation = useBlocker({
    shouldBlockFn: () => dirty || busy,
    enableBeforeUnload: () => dirty || busy,
    withResolver: true
  });
  const validation = usePlacementValidation(
    workspaceId,
    floorId,
    selection?.fields ?? { posX: '', posY: '', width: '', height: '', rotation: '0' },
    {
      resourceId: selection?.resource?.id,
      parentRoomId: selection?.resource?.parentRoomId ?? undefined,
      category: selection?.resource?.category,
      decoration: selection?.object
    }
  );
  const editable = writable && !!layout?.editableLayout && !availabilityMode;
  const width = dimensions?.width ?? String(layout?.width ?? 1200);
  const height = dimensions?.height ?? String(layout?.height ?? 800);
  const act = (action: () => void) => {
    if (busy || loadingSelection) return;
    if (dirty) setPending(() => action);
    else action();
  };
  const clearSelection = () => {
    request.current++;
    setLoadingSelection(false);
    setSelection(null);
    setUndo([]);
    setRedo([]);
    setError('');
  };
  const checkpoint = () => {
    if (selection)
      setUndo((previous) => [...previous.slice(-99), selectPlacementFields(selection.fields)]);
    setRedo([]);
  };
  const change = (fields: PlacementFields, record = true) => {
    if (record) checkpoint();
    setSelection((previous) => (previous ? { ...previous, fields } : previous));
    setError('');
  };
  const history = (direction: 'undo' | 'redo') => {
    if (!selection) return;
    const stack = direction === 'undo' ? undo : redo;
    const next = stack.at(-1);
    if (!next) return;
    if (direction === 'undo') {
      setUndo(stack.slice(0, -1));
      setRedo((previous) => [...previous, selection.fields]);
    } else {
      setRedo(stack.slice(0, -1));
      setUndo((previous) => [...previous, selection.fields]);
    }
    setSelection({ ...selection, fields: next });
    setError('');
  };
  async function choose(key: string) {
    const serial = ++request.current;
    setError('');
    const object = layout?.decorations?.find((item) => `decoration:${item.id}` === key);
    if (object) {
      const fields = canvasPosition(object);
      setSelection({ key, object, originalObject: object, initial: fields, fields });
      setUndo([]);
      setRedo([]);
      setSettings(false);
      return;
    }
    const resource = layout?.resources.find((item) => `resource:${item.id}` === key);
    if (!resource) return;
    setLoadingSelection(true);
    try {
      const detail = await getResource(resource.id);
      if (request.current !== serial) return;
      if (detail.revision !== resource.revision) {
        await query.refetch();
        throw new Error(
          c(
            'The layout changed. Select the object again.',
            'Sơ đồ đã thay đổi. Vui lòng chọn lại đối tượng.'
          )
        );
      }
      const fields = canvasPosition(detail);
      setSelection({ key, resource: detail, initial: fields, fields });
      setUndo([]);
      setRedo([]);
      setSettings(false);
    } catch (failure) {
      if (serial === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : c('Cannot load object.', 'Không thể tải đối tượng.')
        );
    } finally {
      if (serial === request.current) setLoadingSelection(false);
    }
  }
  const select = (key: string) => {
    if (availabilityMode) {
      focusCalendar(key);
      return;
    }
    if (key !== selection?.key)
      act(() => {
        setDimensions(null);
        void choose(key);
      });
  };
  function addObject(kind: DecorationKind, copy?: FloorDecoration) {
    act(() => {
      const preset = decorationPresets[kind];
      const object: FloorDecoration = copy
        ? {
            ...copy,
            id: `decor-${crypto.randomUUID()}`,
            label: `${copy.label} (${c('copy', 'bản sao')})`.slice(0, 100),
            posX: copy.posX + 20,
            posY: copy.posY + 20
          }
        : {
            id: `decor-${crypto.randomUUID()}`,
            kind,
            label: c(preset.en, preset.vi),
            posX: Math.max(0, Math.round(((layout?.width ?? 1200) - preset.width) / 2)),
            posY: Math.max(0, Math.round(((layout?.height ?? 800) - preset.height) / 2)),
            width: preset.width,
            height: preset.height,
            rotation: 0,
            color: preset.color
          };
      const fields = canvasPosition(object);
      setSelection({ key: `decoration:${object.id}`, object, initial: fields, fields });
      setUndo([]);
      setRedo([]);
      setSettings(false);
      setDimensions(null);
      setError('');
    });
  }
  async function save() {
    if (!selection || !layout || busy || loadingSelection || !editable || validation.blocked)
      return;
    setBusy(true);
    setError('');
    try {
      if (selection.resource) {
        const form = resourceFormSchema.parse(
          canvasResourceForm(selection.resource, selection.fields)
        );
        await saveResource(workspaceId, form, selection.resource);
      } else if (selection.object) {
        const object = {
          ...selection.object,
          posX: Number(selection.fields.posX),
          posY: Number(selection.fields.posY),
          width: Number(selection.fields.width),
          height: Number(selection.fields.height),
          rotation: Number(selection.fields.rotation)
        };
        if (
          !object.label.trim() ||
          object.label.length > 100 ||
          !/^#[0-9a-fA-F]{6}$/.test(object.color)
        )
          throw new Error(c('Enter a valid name and color.', 'Nhập tên và màu hợp lệ.'));
        await saveFloorDecorations(
          workspaceId,
          layout,
          [...(layout.decorations ?? []).filter((item) => item.id !== object.id), object],
          width,
          height
        );
      }
      clearSelection();
      setDimensions(null);
      await onSaved();
      toast.success(
        c(
          'Saved. Seats & Rooms now uses these coordinates.',
          'Đã lưu. Quản lý ghế & phòng đã cập nhật cùng tọa độ.'
        )
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : c('Cannot save layout.', 'Không thể lưu sơ đồ.')
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveCanvas() {
    if (!layout || busy || !editable) return;
    if (
      ![width, height].every((value) => /^\d{1,8}(?:\.\d{1,2})?$/.test(value) && Number(value) >= 1)
    ) {
      setError(
        c(
          'Enter positive canvas dimensions, up to two decimals.',
          'Nhập kích thước canvas dương, tối đa 2 số thập phân.'
        )
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveFloorDecorations(workspaceId, layout, layout.decorations ?? [], width, height);
      setDimensions(null);
      await onSaved();
      toast.success(c('Canvas draft saved.', 'Đã lưu kích thước canvas nháp.'));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save canvas');
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!layout || busy || dirty || !confirmed || !editable) return;
    setBusy(true);
    setError('');
    try {
      await publishResourceFloor(workspaceId, layout, width, height);
      await onSaved();
      setPublishing(false);
      setConfirmed(false);
      toast.success(
        c(
          'Floor published. Availability is managed separately.',
          'Đã xuất bản tầng. Trạng thái nhận đặt vẫn quản lý riêng.'
        )
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not publish');
    } finally {
      setBusy(false);
    }
  }
  async function removeObject() {
    if (!selection?.object || !layout || busy || !editable) return;
    setBusy(true);
    setError('');
    try {
      await saveFloorDecorations(
        workspaceId,
        layout,
        (layout.decorations ?? []).filter((item) => item.id !== selection.object!.id),
        width,
        height
      );
      clearSelection();
      setRemove(false);
      await onSaved();
      toast.success(c('Layout object removed from the draft.', 'Đã xóa đồ bố trí khỏi bản nháp.'));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not remove object');
    } finally {
      setBusy(false);
    }
  }
  function exportSvg() {
    const source = container.current?.querySelector<SVGSVGElement>('svg[data-floor-canvas]');
    if (!source) return;
    const clone = source.cloneNode(true) as SVGSVGElement;
    const originals = [source, ...source.querySelectorAll('*')],
      clones = [clone, ...clone.querySelectorAll('*')];
    originals.forEach((node, i) => {
      const style = getComputedStyle(node);
      for (const property of [
        'fill',
        'stroke',
        'stroke-width',
        'opacity',
        'font-size',
        'font-family',
        'font-weight',
        'color'
      ])
        (clones[i] as SVGElement).style.setProperty(property, style.getPropertyValue(property));
    });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '1600');
    clone.setAttribute('height', '1000');
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexspace-floor-${floorId}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const resources = layout?.resources ?? [],
    objects = layout?.decorations ?? [];
  const entries = [
    ...resources.map((item) => ({
      key: `resource:${item.id}`,
      label: item.name,
      sub: item.code,
      category: item.category,
      object: undefined as FloorDecoration | undefined
    })),
    ...objects.map((object) => ({
      key: `decoration:${object.id}`,
      label: object.label,
      sub: object.kind,
      category: undefined,
      object
    }))
  ];
  const visible = entries.filter(
    (item) =>
      (filter === 'all' || (filter === 'objects' ? !!item.object : !item.object)) &&
      `${item.label} ${item.sub}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  const missing = resources.filter(
    (item) => item.posX === null || item.posY === null || !item.width || !item.height
  ).length;
  const name = selection?.resource?.name ?? selection?.object?.label;
  const palette: DecorationKind[] = ['TABLE', 'PLANT', 'PARTITION', 'OTHER'];
  return (
    <div
      ref={container}
      className='flex min-h-[720px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm xl:h-[calc(100dvh-8.5rem)] [&:fullscreen]:h-screen [&:fullscreen]:rounded-none'
    >
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary/[0.07] to-card px-4 py-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 shrink-0 rounded-xl'
            aria-label={c('Back to 3D building', 'Về tòa nhà 3D')}
            title={c('Back to 3D building', 'Về tòa nhà 3D')}
            disabled={busy || loadingSelection}
            onClick={() => act(onBack)}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary'>
            <Layers3 className='size-5' />
          </span>
          <div>
            <h1 className='text-lg font-semibold tracking-tight'>
              {c('Floor Studio', 'Thiết kế sơ đồ tầng')}
            </h1>
            <p className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
              <span
                className={`size-1.5 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
              {dirty
                ? c('Unsaved changes', 'Có thay đổi chưa lưu')
                : c('Shared with Seats & Rooms', 'Đồng bộ với Quản lý ghế & phòng')}
            </p>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex rounded-xl border border-border bg-muted/40 p-1'>
            {[false, true].map((value) => (
              <button
                key={String(value)}
                type='button'
                className={`rounded-lg px-2.5 py-1.5 text-[11px] ${availabilityMode === value ? 'bg-background font-semibold text-primary shadow-sm' : 'text-muted-foreground'}`}
                disabled={busy || loadingSelection}
                onClick={() =>
                  act(() => {
                    clearSelection();
                    setDimensions(null);
                    setSettings(false);
                    setAvailabilityMode(value);
                  })
                }
              >
                {value ? c('Availability', 'Theo lịch') : c('Design', 'Thiết kế')}
              </button>
            ))}
          </div>
          {layout && (
            <FloorActions
              workspaceId={workspaceId}
              floor={layout.floor}
              floors={options.floors}
              disabled={!writable || dirty || busy || loadingSelection}
              onSaved={onSaved}
              onDeleted={onBack}
              onCopied={(floor) => onFloorChange(floor.id)}
            />
          )}
          <Button
            size='icon'
            variant='ghost'
            title={c('Refresh layout', 'Tải lại sơ đồ')}
            aria-label={c('Refresh layout', 'Tải lại sơ đồ')}
            disabled={busy || loadingSelection}
            onClick={() =>
              act(() => {
                clearSelection();
                setDimensions(null);
                void onSaved();
              })
            }
          >
            <RefreshCw className='size-4' />
          </Button>
          <Button
            size='icon'
            variant='ghost'
            title={c('Export current view as SVG', 'Xuất vùng xem dạng SVG')}
            aria-label={c('Export SVG', 'Xuất SVG')}
            disabled={!layout}
            onClick={exportSvg}
          >
            <Download className='size-4' />
          </Button>
          <Button
            size='icon'
            variant='ghost'
            title={c('Fullscreen', 'Toàn màn hình')}
            aria-label={c('Fullscreen', 'Toàn màn hình')}
            onClick={() => {
              const operation = document.fullscreenElement
                ? document.exitFullscreen()
                : container.current?.requestFullscreen();
              operation?.catch(() =>
                toast.error(
                  c('Fullscreen is unavailable.', 'Trình duyệt không hỗ trợ toàn màn hình.')
                )
              );
            }}
          >
            <Maximize2 className='size-4' />
          </Button>
          <Button
            size='sm'
            variant='outline'
            disabled={!layout || busy}
            onClick={() =>
              act(() => {
                clearSelection();
                setDimensions(null);
                setSettings(!settings);
              })
            }
          >
            <SlidersHorizontal className='size-4' />
            {c('Canvas', 'Canvas')}
          </Button>
          <Button
            size='sm'
            disabled={busy || !editable || dirty || !!missing || loadingSelection}
            onClick={() => {
              setConfirmed(false);
              setPublishing(true);
            }}
          >
            <Upload className='size-4' />
            {c('Publish', 'Xuất bản')}
          </Button>
        </div>
      </header>
      <div className='flex flex-wrap items-center gap-2 border-b border-border/80 bg-muted/20 px-4 py-2.5'>
        <select
          aria-label={c('Workspace', 'Không gian')}
          value={workspaceId}
          disabled={busy || loadingSelection}
          className='h-9 min-w-0 max-w-full flex-1 rounded-lg border border-input bg-background px-3 text-xs sm:max-w-[320px]'
          onChange={(event) => {
            const id = Number(event.target.value);
            act(() => onWorkspaceChange(id));
          }}
        >
          {workspaces.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.status}
            </option>
          ))}
        </select>
        <span className='hidden h-4 border-l border-border sm:block' />
        <select
          aria-label={c('Floor', 'Tầng')}
          value={floorId}
          disabled={busy || loadingSelection}
          className='h-9 min-w-0 max-w-full rounded-lg border border-input bg-background px-3 text-xs'
          onChange={(event) => {
            const id = Number(event.target.value);
            act(() => {
              clearSelection();
              setDimensions(null);
              onFloorChange(id);
              setFocus({ key: null, sequence: 0 });
            });
          }}
        >
          {options.floors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.status}
            </option>
          ))}
        </select>
        <Button
          size='sm'
          variant='ghost'
          disabled={!writable || busy}
          onClick={() => act(() => onAdd('floor', floorId))}
        >
          <Plus className='size-3.5' />
          {c('Floor', 'Tầng')}
        </Button>
        <div className='ml-auto flex items-center gap-2'>
          <Badge variant='secondary' className='text-[10px]'>
            {layout?.draftChanges
              ? c('Unpublished layout', 'Bố trí chưa xuất bản')
              : (layout?.floor.status ?? '—')}
          </Badge>
          {!writable && (
            <Badge variant='outline'>
              <LockKeyhole className='mr-1 size-3' />
              {c('Read only', 'Chỉ xem')}
            </Badge>
          )}
        </div>
      </div>
      {error && (
        <div
          role='alert'
          className='flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive'
        >
          <AlertTriangle className='mt-0.5 size-4 shrink-0' />
          <span className='flex-1'>{error}</span>
          <button
            type='button'
            aria-label={c('Dismiss error', 'Đóng lỗi')}
            onClick={() => setError('')}
          >
            <X className='size-4' />
          </button>
        </div>
      )}
      <div className='grid min-h-0 flex-1 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_250px] 2xl:grid-cols-[210px_minmax(0,1fr)_270px]'>
        <aside className='flex min-h-0 flex-col border-b border-border bg-muted/10 lg:border-b-0 lg:border-r'>
          <div className='space-y-3 p-3'>
            <div className='flex items-center justify-between text-xs font-semibold'>
              <span>{c('Layers & objects', 'Lớp & đối tượng')}</span>
              <span className='rounded-md bg-muted px-1.5 py-0.5 text-[10px] tabular-nums'>
                {entries.length}
              </span>
            </div>
            <div className='relative'>
              <Search className='absolute left-2.5 top-2.5 size-3.5 text-muted-foreground' />
              <Input
                className='h-8 rounded-lg pl-8 text-xs'
                placeholder={c('Search objects…', 'Tìm đối tượng…')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className='flex rounded-lg bg-muted p-1'>
              {(['all', 'resources', 'objects'] as const).map((value) => (
                <button
                  key={value}
                  type='button'
                  className={`flex-1 rounded-md py-1 text-[10px] transition-colors ${filter === value ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'}`}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all'
                    ? c('All', 'Tất cả')
                    : value === 'resources'
                      ? c('Seats', 'Chỗ')
                      : c('Objects', 'Đồ vật')}
                </button>
              ))}
            </div>
          </div>
          <div className='flex max-h-40 min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3 lg:max-h-none'>
            {visible.map((entry) => (
              <button
                type='button'
                key={entry.key}
                disabled={busy || loadingSelection}
                onClick={() => select(entry.key)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-3 text-left transition-colors ${(availabilityMode ? calendarFocus.key : selection?.key) === entry.key ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent hover:bg-muted'}`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${entry.object ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}
                >
                  {entry.object ? (
                    <DecorationIcon kind={entry.object.kind} className='size-4' />
                  ) : entry.category === 'ROOM' ? (
                    <DoorOpen className='size-4' />
                  ) : (
                    <Armchair className='size-4' />
                  )}
                </span>
                <span className='min-w-0'>
                  <span className='block truncate text-xs font-medium'>{entry.label}</span>
                  <span className='block truncate text-[10px] text-muted-foreground'>
                    {entry.sub}
                  </span>
                  {availabilityMode && !entry.object && (
                    <span
                      className='mt-1 block text-[10px] font-semibold'
                      style={{ color: availabilityColors[calendarState(entry.key)] }}
                    >
                      {calendarState(entry.key)
                        ? availabilityLabel(calendarState(entry.key), language === 'vi')
                        : calendar.query.isError
                          ? c('Status unavailable', 'Chưa tải được trạng thái')
                          : c('Loading status…', 'Đang tải trạng thái…')}
                    </span>
                  )}
                </span>
              </button>
            ))}
            {!visible.length && (
              <p className='p-4 text-center text-xs text-muted-foreground'>
                {c('No matching objects.', 'Chưa có đối tượng phù hợp.')}
              </p>
            )}
          </div>
          <div className='space-y-2 border-t border-border p-3'>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
              {c('Add to floor', 'Thêm vào sơ đồ')}
            </p>
            <div className='grid grid-cols-4 gap-1'>
              {palette.map((kind) => (
                <Button
                  key={kind}
                  size='icon'
                  variant='outline'
                  className='size-9 rounded-lg'
                  disabled={!editable || busy || loadingSelection}
                  aria-label={c(decorationPresets[kind].en, decorationPresets[kind].vi)}
                  title={c(decorationPresets[kind].en, decorationPresets[kind].vi)}
                  onClick={() => addObject(kind)}
                >
                  <DecorationIcon kind={kind} className='size-4' />
                </Button>
              ))}
            </div>
            <Button
              className='w-full rounded-lg text-xs'
              size='sm'
              variant='outline'
              disabled={!editable || busy || loadingSelection}
              onClick={() =>
                act(() =>
                  onAdd(
                    options.types.some((type) => type.active && type.currency)
                      ? 'resource'
                      : 'type',
                    floorId
                  )
                )
              }
            >
              <Plus className='size-3.5' />
              {c('Seat / room', 'Ghế / phòng')}
            </Button>
          </div>
        </aside>
        <section
          aria-label={c('Floor canvas', 'Canvas sơ đồ tầng')}
          className='relative flex min-h-[550px] min-w-0 flex-col overflow-hidden bg-muted/20'
        >
          {loadingSelection && (
            <div
              role='status'
              className='absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm'
            >
              <LoaderCircle className='size-6 animate-spin text-primary' />
            </div>
          )}
          {!floorId ? (
            <div className='m-auto space-y-3 p-10 text-center'>
              <Layers3 className='mx-auto size-10 text-primary/50' />
              <h2 className='font-semibold'>{c('Start with a floor', 'Bắt đầu với một tầng')}</h2>
              <Button disabled={!writable} onClick={() => onAdd('floor', 0)}>
                <Plus className='size-4' />
                {c('Add floor', 'Thêm tầng')}
              </Button>
            </div>
          ) : query.isPending ? (
            <div className='m-auto flex items-center gap-2 text-sm text-muted-foreground'>
              <LoaderCircle className='size-4 animate-spin' />
              {c('Loading floor…', 'Đang tải sơ đồ…')}
            </div>
          ) : query.isError ? (
            <div className='m-auto p-8 text-center'>
              <p role='alert' className='mb-3 text-sm text-destructive'>
                {query.error.message}
              </p>
              <Button variant='outline' onClick={() => void query.refetch()}>
                {c('Retry', 'Thử lại')}
              </Button>
            </div>
          ) : (
            layout &&
            (availabilityMode ? (
              <FloorAvailabilityPanel
                calendar={calendar}
                layout={layout}
                focus={calendarFocus}
                onFocus={focusCalendar}
              />
            ) : selection && editable ? (
              <ResourcePlacementEditor
                presentation='workspace'
                workspaceId={workspaceId}
                floorId={floorId}
                resourceId={selection.resource?.id}
                parentRoomId={selection.resource?.parentRoomId ?? undefined}
                category={selection.resource?.category}
                decoration={selection.object}
                value={selection.fields}
                disabled={busy || !editable}
                onBegin={checkpoint}
                onChange={change}
                onUndo={() => history('undo')}
                onRedo={() => history('redo')}
                onReset={() => change(selection.initial)}
                canUndo={!!undo.length}
                canRedo={!!redo.length}
                onSelect={select}
              />
            ) : (
              <FloorLayoutPreview
                presentation='workspace'
                layout={layout}
                width={layout.width ?? 1200}
                height={layout.height ?? 800}
                focus={{ ...focus, key: selection?.key ?? focus.key }}
                onFocus={(key) => {
                  if (key) select(key);
                  else setFocus((previous) => ({ key: null, sequence: previous.sequence + 1 }));
                }}
              />
            ))
          )}
        </section>
        <aside className='flex min-h-0 flex-col border-t border-border bg-card p-4 lg:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xs font-semibold'>
              {availabilityMode
                ? c('Availability & calendar', 'Trạng thái & lịch đặt')
                : settings
                  ? c('Canvas settings', 'Thiết lập canvas')
                  : selection
                    ? c('Object properties', 'Thuộc tính đối tượng')
                    : c('Floor inspector', 'Thông tin sơ đồ')}
            </h2>
            {selection && (
              <Button
                size='icon'
                variant='ghost'
                className='size-7'
                aria-label={c('Deselect', 'Bỏ chọn')}
                disabled={busy}
                onClick={() => act(clearSelection)}
              >
                <X className='size-3.5' />
              </Button>
            )}
          </div>
          <div className='min-h-0 flex-1 space-y-5 overflow-y-auto pr-1'>
            {availabilityMode && layout ? (
              <FloorAvailabilityInspector
                calendar={calendar}
                layout={layout}
                focus={calendarFocus}
                workspaceStatus={options.workspaceStatus}
              />
            ) : selection ? (
              <>
                <div className='rounded-xl border border-primary/15 bg-primary/5 p-3'>
                  <p className='text-sm font-semibold'>{name}</p>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    {selection.resource?.code ??
                      c('Layout only · not bookable', 'Chỉ bố trí · không đặt chỗ')}
                  </p>
                </div>
                {selection.object && (
                  <>
                    <label className='block space-y-1.5 text-[11px] font-medium'>
                      {c('Name', 'Tên đồ vật')}
                      <Input
                        maxLength={100}
                        value={selection.object.label}
                        disabled={!editable || busy || loadingSelection}
                        onChange={(event) =>
                          setSelection((previous) =>
                            previous?.object
                              ? {
                                  ...previous,
                                  object: { ...previous.object, label: event.target.value }
                                }
                              : previous
                          )
                        }
                        className='h-9 text-xs'
                      />
                    </label>
                    <label className='flex items-center justify-between text-[11px] font-medium'>
                      {c('Display color', 'Màu hiển thị')}
                      <input
                        type='color'
                        aria-label={c('Display color', 'Màu hiển thị')}
                        value={selection.object.color}
                        disabled={!editable || busy || loadingSelection}
                        onChange={(event) =>
                          setSelection((previous) =>
                            previous?.object
                              ? {
                                  ...previous,
                                  object: { ...previous.object, color: event.target.value }
                                }
                              : previous
                          )
                        }
                        className='h-8 w-12 cursor-pointer rounded-lg border border-input bg-background p-1'
                      />
                    </label>
                  </>
                )}
                <div>
                  <p className='mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                    {c('Position & dimensions', 'Vị trí & kích thước')}
                  </p>
                  <div className='grid grid-cols-2 gap-3'>
                    {(['posX', 'posY', 'width', 'height', 'rotation'] as const).map((key) => (
                      <label
                        key={key}
                        className={`space-y-1.5 text-[11px] text-muted-foreground ${key === 'rotation' ? 'col-span-2' : ''}`}
                      >
                        <span>
                          {key === 'posX'
                            ? 'X (px)'
                            : key === 'posY'
                              ? 'Y (px)'
                              : key === 'width'
                                ? c('Width (px)', 'Rộng (px)')
                                : key === 'height'
                                  ? c('Height (px)', 'Cao (px)')
                                  : c('Rotation (°)', 'Góc xoay (°)')}
                        </span>
                        <Input
                          type='number'
                          step='0.01'
                          min='0'
                          max={key === 'rotation' ? 359.99 : undefined}
                          className='h-9 text-xs tabular-nums'
                          value={selection.fields[key]}
                          disabled={!editable || busy || loadingSelection}
                          onChange={(event) =>
                            change({ ...selection.fields, [key]: event.target.value })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
                {selection.resource?.category === 'ROOM' && (
                  <p className='rounded-lg bg-muted p-2.5 text-[11px] leading-relaxed text-muted-foreground'>
                    {c(
                      'Moving this room carries its assigned seats and fully contained furniture. Prices and availability do not change.',
                      'Di chuyển phòng kéo theo ghế thuộc phòng và đồ bố trí nằm trọn bên trong. Không đổi giá hay trạng thái nhận đặt.'
                    )}
                  </p>
                )}
                {validation.result && !validation.result.valid && (
                  <p
                    role='alert'
                    className='rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive'
                  >
                    {validation.result.collisions.size
                      ? `${c('Overlapping objects', 'Đối tượng chồng lấn')}: ${[...validation.result.collisions].join(', ')}`
                      : c(
                          'Objects must fit inside the floor and their room.',
                          'Đối tượng phải nằm trọn trong tầng/phòng.'
                        )}
                  </p>
                )}
                {selection.resource && (
                  <Button
                    variant='outline'
                    className='w-full text-xs'
                    size='sm'
                    disabled={busy || !editable}
                    onClick={() =>
                      act(() => {
                        const resource = selection.resource!;
                        clearSelection();
                        onEditResource(resource);
                      })
                    }
                  >
                    <SlidersHorizontal className='size-3.5' />
                    {c('Business properties', 'Thông tin ghế/phòng')}
                  </Button>
                )}
                {selection.object && (
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      className='flex-1 text-xs'
                      disabled={busy || !editable}
                      onClick={() =>
                        addObject(selection.object!.kind, {
                          ...selection.object!,
                          posX: Number(selection.fields.posX),
                          posY: Number(selection.fields.posY),
                          width: Number(selection.fields.width),
                          height: Number(selection.fields.height),
                          rotation: Number(selection.fields.rotation)
                        })
                      }
                    >
                      <Copy className='size-3.5' />
                      {c('Duplicate', 'Nhân bản')}
                    </Button>
                    <Button
                      size='icon'
                      variant='outline'
                      className='size-8 text-destructive'
                      aria-label={c('Remove decoration', 'Xóa đồ bố trí')}
                      disabled={busy || !editable}
                      onClick={() => setRemove(true)}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                )}
              </>
            ) : settings ? (
              <>
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  {c(
                    'Canvas dimensions are in pixels. Resizing never scales your objects. All objects must stay inside.',
                    'Kích thước theo pixel. Đổi kích thước không tự co giãn đồ vật. Mọi đối tượng phải nằm trong canvas.'
                  )}
                </p>
                {(['width', 'height'] as const).map((key) => (
                  <label key={key} className='block space-y-2 text-xs'>
                    {key === 'width' ? c('Width (px)', 'Rộng (px)') : c('Height (px)', 'Cao (px)')}
                    <Input
                      inputMode='decimal'
                      value={key === 'width' ? width : height}
                      disabled={busy || !editable}
                      onChange={(event) =>
                        setDimensions({ width, height, [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <Button
                  className='w-full text-xs'
                  size='sm'
                  disabled={busy || !editable || !dirtyDimensions}
                  onClick={() => void saveCanvas()}
                >
                  {busy ? (
                    <LoaderCircle className='size-4 animate-spin' />
                  ) : (
                    <Save className='size-4' />
                  )}
                  {c('Save canvas draft', 'Lưu canvas nháp')}
                </Button>
              </>
            ) : (
              <>
                <div className='rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center'>
                  <MousePointer2 className='mx-auto mb-3 size-7 text-primary/60' />
                  <h3 className='text-xs font-semibold'>
                    {c('Select an object', 'Chọn một đối tượng')}
                  </h3>
                  <p className='mt-2 text-[11px] leading-relaxed text-muted-foreground'>
                    {c(
                      'Click the map or choose a layer to move, resize and rotate it directly.',
                      'Bấm trên sơ đồ hoặc chọn trong danh sách để kéo thả, đổi kích thước và xoay trực tiếp.'
                    )}
                  </p>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  {[
                    [
                      c('Rooms', 'Phòng'),
                      resources.filter((item) => item.category === 'ROOM').length
                    ],
                    [
                      c('Seats', 'Ghế'),
                      resources.filter((item) => item.category !== 'ROOM').length
                    ],
                    [c('Furniture', 'Đồ bố trí'), objects.length],
                    ['Canvas', `${layout?.width ?? 1200} × ${layout?.height ?? 800}`]
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className='rounded-xl border border-border bg-muted/10 p-3'
                    >
                      <p className='text-[10px] text-muted-foreground'>{label}</p>
                      <p className='mt-1 text-sm font-semibold tabular-nums'>{value}</p>
                    </div>
                  ))}
                </div>
                <div className='space-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground'>
                  <p className='font-medium text-foreground'>
                    {c('Keyboard & navigation', 'Phím tắt & điều hướng')}
                  </p>
                  <p>
                    Ctrl / ⌘ + {c('scroll', 'cuộn chuột')} · {c('Zoom', 'Thu/phóng')}
                  </p>
                  <p>↑ ↓ ← → · 1 px / Shift · 10 px</p>
                  <p>Ctrl / ⌘ + Z · {c('Undo', 'Hoàn tác')}</p>
                  <p>
                    {c('Drag handles · Resize & rotate', 'Kéo tay nắm · Đổi kích thước & xoay')}
                  </p>
                </div>
                {!!missing && (
                  <p
                    role='alert'
                    className='rounded-lg bg-destructive/5 p-2.5 text-xs text-destructive'
                  >
                    {missing}{' '}
                    {c(
                      'resources need geometry before publishing.',
                      'chỗ cần tọa độ/kích thước trước khi xuất bản.'
                    )}
                  </p>
                )}
              </>
            )}
          </div>
          {selection && (
            <div className='mt-4 space-y-2 border-t border-border pt-4'>
              <Button
                className='w-full rounded-xl'
                size='sm'
                disabled={
                  busy || !editable || !dirtySelection || validation.blocked || loadingSelection
                }
                onClick={() => void save()}
              >
                {busy ? (
                  <LoaderCircle className='size-4 animate-spin' />
                ) : (
                  <Save className='size-4' />
                )}
                {c('Save changes', 'Lưu thay đổi')}
              </Button>
              <Button
                variant='ghost'
                className='w-full text-xs'
                size='sm'
                disabled={busy}
                onClick={() => act(clearSelection)}
              >
                <ChevronLeft className='size-3.5' />
                {c('Back to overview', 'Về toàn cảnh')}
              </Button>
            </div>
          )}
        </aside>
      </div>
      <footer className='flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground'>
        <span className='flex items-center gap-1.5'>
          <CheckCircle2 className='size-3.5 text-primary' />
          {c(
            'Same resources. Same coordinates. No duplicate layout data.',
            'Chung dữ liệu ghế/phòng và tọa độ với trang quản lý.'
          )}
        </span>
        <span>
          {c(
            'Furniture changes reach customers after publishing.',
            'Đồ bố trí cập nhật cho khách sau khi xuất bản.'
          )}
        </span>
      </footer>
      <Dialog
        open={!!pending || navigation.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPending(null);
            navigation.reset?.();
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{c('Discard unsaved changes?', 'Bỏ thay đổi chưa lưu?')}</DialogTitle>
            <DialogDescription>
              {c(
                'Your changes have not been saved. Stay to save them, or discard and continue.',
                'Thay đổi chưa được lưu. Ở lại để lưu hoặc bỏ thay đổi và tiếp tục.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              disabled={busy}
              onClick={() => {
                setPending(null);
                navigation.reset?.();
              }}
            >
              {c('Stay', 'Ở lại')}
            </Button>
            <Button
              variant='destructive'
              disabled={busy}
              onClick={() => {
                const action = pending;
                setPending(null);
                clearSelection();
                setDimensions(null);
                if (navigation.status === 'blocked') navigation.proceed();
                else action?.();
              }}
            >
              {c('Discard & continue', 'Bỏ thay đổi & tiếp tục')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={remove}
        onOpenChange={(open) => {
          if (!busy) setRemove(open);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{c('Remove layout object?', 'Xóa đồ bố trí?')}</DialogTitle>
            <DialogDescription>
              {c(
                'This removes furniture from the draft only. Seats and bookings are preserved. Publish to update the customer map.',
                'Xóa đồ vật khỏi bản nháp, không xóa ghế hay booking. Xuất bản để cập nhật bản đồ khách hàng.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' disabled={busy} onClick={() => setRemove(false)}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button variant='destructive' disabled={busy} onClick={() => void removeObject()}>
              {busy && <LoaderCircle className='size-4 animate-spin' />}
              {c('Remove', 'Xóa đồ vật')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={publishing}
        onOpenChange={(open) => {
          if (!busy) setPublishing(open);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{c('Publish this floor?', 'Xuất bản sơ đồ tầng?')}</DialogTitle>
            <DialogDescription>
              {c(
                'The saved furniture layout becomes visible to customers. This does not activate resources or change bookings or pricing.',
                'Bố trí đã lưu sẽ hiển thị cho khách hàng. Không tự bật nhận đặt, không thay đổi booking hoặc giá.'
              )}
            </DialogDescription>
          </DialogHeader>
          <label className='flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3 text-xs'>
            <input
              type='checkbox'
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
              className='mt-0.5 accent-primary'
            />
            {c(
              'I reviewed all current positions and confirm that the floor is ready.',
              'Tôi đã kiểm tra vị trí các đối tượng và xác nhận sơ đồ đã sẵn sàng.'
            )}
          </label>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' disabled={busy} onClick={() => setPublishing(false)}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button disabled={!confirmed || busy || dirty} onClick={() => void publish()}>
              {busy ? (
                <LoaderCircle className='size-4 animate-spin' />
              ) : (
                <Upload className='size-4' />
              )}
              {c('Publish floor', 'Xuất bản tầng')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
