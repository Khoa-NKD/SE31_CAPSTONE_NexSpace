import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw, ArrowUpRight, PackageOpen } from 'lucide-react';
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
import { templateOptions, designMetricsOptions } from '../api/floor-design';
import type { FloorLayout, FloorDecoration } from '../api/resources';
import { decorationPresets } from '../utils/decoration-presets';
import { furnishingPresetKey } from '../utils/furnishing-preset-key';
import { DecorationIcon, furnishingIcon } from './decoration-visual';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');

/** Built-in categories have one palette entry; custom furnishings retain their reusable type. */
const paletteKey = (kind: FloorDecoration['kind'], name: string, icon?: FloorDecoration['icon']) =>
  kind === 'OTHER' ? furnishingPresetKey(kind, name, icon) : 'default:' + kind;

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
  };
  const canvasWidth = layout?.width ?? 0;
  const canvasHeight = layout?.height ?? 0;
  const entries = new Map<string, Entry>();
  for (const [kind, preset] of Object.entries(decorationPresets)) {
    const category = kind as FloorDecoration['kind'];
    entries.set('default:' + kind, {
      key: 'default:' + kind,
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
      measured,
      object: {
        kind: item.kind,
        label: item.name,
        icon,
        color: item.color,
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
          'Set floor dimensions in AI assistant → Dimensions first.',
          'Cần cấu hình kích thước tầng ở Trợ lý AI → Kích thước trước.'
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
            : 'group flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40'
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
          <div className='grid min-h-0 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-4'>
            {visible.map((entry) => tile(entry))}
          </div>
          {!visible.length && (
            <p className='py-12 text-center text-sm text-muted-foreground'>
              {c('No matching furnishings.', 'Không tìm thấy vật dụng.')}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
