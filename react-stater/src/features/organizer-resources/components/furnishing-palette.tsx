import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw, ArrowUpRight, PackageOpen, Plus, Pencil } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  templateOptions,
  designMetricsOptions,
  type LayoutTemplate,
  type LayoutTemplateInput
} from '../api/floor-design';
import type { FloorLayout, FloorDecoration } from '../api/resources';
import { decorationPresets } from '../utils/decoration-presets';
import { furnishingPresetKey } from '../utils/furnishing-preset-key';
import { DecorationIcon, furnishingIcon } from './decoration-visual';
import { FurnishingPresetEditor } from './furnishing-preset-editor';
import { pixelsToMetres } from '../utils/metric-units';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');

/** Built-in categories have one palette entry; custom furnishings retain their reusable type. */
const paletteKey = (kind: FloorDecoration['kind'], name: string, icon?: FloorDecoration['icon']) =>
  furnishingPresetKey(kind, name, icon);

/** Saved presets are shared across workspaces; placed instances remain separate objects. */
export function FurnishingPalette({
  actorId,
  workspaceId,
  floorId,
  layout,
  disabled,
  onPlace
}: {
  actorId: number;
  workspaceId: number;
  floorId: number;
  layout: FloorLayout | undefined;
  disabled: boolean;
  onPlace: (object: FloorDecoration) => void;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<{
    current?: LayoutTemplate;
    initial: LayoutTemplateInput;
  } | null>(null);
  const library = useQuery(templateOptions(actorId));
  const metrics = useQuery({
    ...designMetricsOptions(actorId, workspaceId, floorId),
    enabled: floorId > 0
  });
  type Entry = {
    key: string;
    object: Omit<FloorDecoration, 'id' | 'posX' | 'posY'>;
    saved?: boolean;
    measured?: boolean;
    template?: LayoutTemplate;
  };
  const canvasWidth = layout?.width ?? 0;
  const canvasHeight = layout?.height ?? 0;
  const entries = new Map<string, Entry>();
  for (const [kind, preset] of Object.entries(decorationPresets)) {
    const category = kind as FloorDecoration['kind'];
    const key = paletteKey(category, c(preset.en, preset.vi));
    entries.set(key, {
      key,
      object: {
        kind: category,
        label: c(preset.en, preset.vi),
        width: preset.width,
        height: preset.height,
        rotation: 0,
        color: preset.color
      }
    });
  }
  for (const item of library.data ?? []) {
    if (!item.active) continue;
    const icon = furnishingIcon(item.kind, item.name, item.icon);
    const key = paletteKey(item.kind, item.name, icon);
    const measured = !!metrics.data?.widthM && !!metrics.data.lengthM && !!layout;
    if (entries.get(key)?.saved) continue;
    entries.set(key, {
      key,
      saved: true,
      template: item,
      measured,
      object: {
        kind: item.kind,
        label: item.name,
        icon,
        color: item.color,
        visual3d: item.visual3d,
        rotation: 0,
        width: measured ? (item.widthM / metrics.data!.widthM!) * canvasWidth : 0,
        height: measured ? (item.lengthM / metrics.data!.lengthM!) * canvasHeight : 0
      }
    });
  }
  for (const item of layout?.decorations ?? []) {
    const icon = furnishingIcon(item.kind, item.label, item.icon);
    const key = paletteKey(item.kind, item.label, icon);
    if (!entries.has(key)) entries.set(key, { key, object: { ...item, icon } });
  }
  const visible = [...entries.values()].filter((item) =>
    normalize(item.object.label).includes(normalize(search))
  );
  function place(entry: Entry) {
    if (disabled || !layout || canvasWidth <= 0 || canvasHeight <= 0) return;
    if (entry.saved && !entry.measured) {
      toast.error(
        c(
          'Configure this floor’s real dimensions in the workspace location and floor setup first.',
          'Cần cấu hình kích thước thực của tầng tại phần Địa điểm & tầng của workspace trước.'
        )
      );
      return;
    }
    const width = Number(entry.object.width.toFixed(2));
    const height = Number(entry.object.height.toFixed(2));
    if (width <= 0 || height <= 0 || width > canvasWidth || height > canvasHeight) {
      toast.error(
        c('This object is larger than the workspace area.', 'Vật dụng lớn hơn vùng workspace.')
      );
      return;
    }
    setOpen(false);
    onPlace({
      ...entry.object,
      id: 'decor-' + crypto.randomUUID(),
      width,
      height,
      posX: Number(((canvasWidth - width) / 2).toFixed(2)),
      posY: Number(((canvasHeight - height) / 2).toFixed(2))
    });
  }
  function edit(entry: Entry) {
    setEditor({
      current: entry.template,
      initial: entry.template ?? {
        name: entry.object.label,
        kind: entry.object.kind,
        icon: entry.object.icon,
        color: entry.object.color,
        visual3d: entry.object.visual3d,
        widthM: Number(pixelsToMetres(entry.object.width).toFixed(2)),
        lengthM: Number(pixelsToMetres(entry.object.height).toFixed(2))
      }
    });
  }
  function tile(entry: Entry, compact = false) {
    return (
      <button
        key={entry.key}
        type='button'
        disabled={disabled}
        title={entry.object.label}
        onClick={() => place(entry)}
        className={
          compact
            ? 'flex h-10 min-w-0 items-center justify-center rounded-xl border border-border bg-background/70 text-primary transition hover:border-primary/50 hover:bg-primary/10 disabled:opacity-40'
            : 'group flex min-h-48 w-full shrink-0 flex-col items-start gap-3 bg-card p-4 text-left transition hover:bg-primary/5 disabled:opacity-40'
        }
      >
        <span
          className={
            compact
              ? ''
              : 'flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'
          }
        >
          <DecorationIcon
            kind={entry.object.kind}
            icon={entry.object.icon}
            className={compact ? 'size-4' : 'size-6'}
          />
        </span>
        {!compact && (
          <>
            <span className='line-clamp-2 text-sm font-semibold'>{entry.object.label}</span>
            <span className='text-[11px] tabular-nums text-muted-foreground'>
              {c('L × W', 'Dài × Rộng')}:{' '}
              {(entry.template?.widthM ?? pixelsToMetres(entry.object.width)).toFixed(2)} ×{' '}
              {(entry.template?.lengthM ?? pixelsToMetres(entry.object.height)).toFixed(2)} m
            </span>
            <span className='mt-auto text-xs text-muted-foreground'>
              {c('Add to floor', 'Đặt vào sơ đồ')} ↗
            </span>
          </>
        )}
      </button>
    );
  }
  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-4 gap-1.5'>
        {[...entries.values()].slice(0, 4).map((entry) => tile(entry, true))}
      </div>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-xs font-medium text-primary hover:bg-primary/5'
      >
        <span>
          {c('Browse all furnishings', 'Xem tất cả vật dụng')} · {entries.size}
        </span>
        <ArrowUpRight className='size-3.5' />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='flex max-h-[85dvh] flex-col overflow-hidden rounded-2xl border-border bg-background sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <PackageOpen className='size-5 text-primary' />
              {c('Furnishing library', 'Kho vật dụng bố trí')}
            </DialogTitle>
            <DialogDescription>
              {c(
                'Choose an item to place on your floor. Position and size can be adjusted afterwards.',
                'Chọn vật dụng để thêm vào sơ đồ. Bạn có thể kéo thả và đổi kích thước sau khi đặt.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end'>
            <Button
              size='sm'
              disabled={disabled || library.isPending || library.isError}
              onClick={() =>
                setEditor({
                  initial: { name: '', kind: 'OTHER', widthM: 1, lengthM: 1, color: '#94a3b8' }
                })
              }
            >
              <Plus className='size-4' />
              {c('Create furnishing', 'Tạo vật dụng')}
            </Button>
          </div>
          <div className='relative shrink-0'>
            <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={c('Search all furnishings…', 'Tìm trong tất cả vật dụng…')}
              className='h-10 rounded-xl pl-10'
              aria-label={c('Search furnishings', 'Tìm vật dụng bố trí')}
            />
          </div>
          <div className='flex items-center justify-between text-xs text-muted-foreground'>
            <span>
              {visible.length} {c('furnishings', 'vật dụng')}
            </span>
            {disabled && <span>{c('View only', 'Chỉ xem')}</span>}
          </div>
          {library.isPending && (
            <p role='status' className='text-xs text-muted-foreground'>
              {c('Loading library…', 'Đang tải kho đồ…')}
            </p>
          )}
          {library.isError && (
            <Button variant='outline' onClick={() => void library.refetch()}>
              <RefreshCw className='size-4' />
              {c('Retry library', 'Tải lại kho đồ')}
            </Button>
          )}
          <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1'>
            <div className='grid auto-rows-max grid-cols-2 content-start items-start gap-3 p-1 sm:grid-cols-3 lg:grid-cols-4'>
              {visible.map((entry) => (
                <div
                  key={entry.key}
                  className='flex min-w-0 flex-col rounded-2xl border border-border bg-card'
                >
                  {tile(entry)}
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    className='mx-2 mb-2 justify-start text-xs'
                    disabled={disabled || library.isPending || library.isError}
                    onClick={() => edit(entry)}
                  >
                    <Pencil className='size-3.5' />
                    {entry.template
                      ? c('Edit preset', 'Sửa mẫu')
                      : c('Save as preset', 'Lưu thành mẫu')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          {!visible.length && (
            <p className='py-12 text-center text-sm text-muted-foreground'>
              {c('No matching furnishings.', 'Không tìm thấy vật dụng.')}
            </p>
          )}
        </DialogContent>
      </Dialog>
      {editor && (
        <FurnishingPresetEditor
          actorId={actorId}
          current={editor.current}
          initial={editor.initial}
          library={library.data ?? []}
          disabled={disabled}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
