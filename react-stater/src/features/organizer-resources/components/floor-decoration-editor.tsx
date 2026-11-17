import { useState } from 'react';
import { z } from 'zod';
import { Save, LoaderCircle, Check, Shapes, Ruler, RotateCcw } from 'lucide-react';
import { DecorationIcon } from './decoration-visual';
import { decorationPresets, changeDecorationKind } from '../utils/decoration-presets';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/features/landing/context/language-context';
import type { FloorDecoration, DecorationKind } from '../api/resources';
import { ResourcePlacementEditor } from './resource-placement-editor';
import { usePlacementValidation } from './use-placement-validation';
import type { PlacementFields } from '../utils/placement';

const decimal = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const schema = z.object({
  label: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  posX: decimal,
  posY: decimal,
  width: decimal.refine((value) => Number(value) > 0 && Number(value) <= 999999.99),
  height: decimal.refine((value) => Number(value) > 0 && Number(value) <= 999999.99),
  rotation: decimal.refine((value) => Number(value) < 360)
});

export function FloorDecorationEditor({
  workspaceId,
  floorId,
  item,
  onClose,
  onSave
}: {
  workspaceId: number;
  floorId: number;
  item: FloorDecoration;
  onClose: () => void;
  onSave: (item: FloorDecoration) => Promise<void>;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [kind, setKind] = useState<DecorationKind>(item.kind);
  const [label, setLabel] = useState(item.label);
  const [color, setColor] = useState(item.color);
  const [edited, setEdited] = useState({ label: false, dimensions: false, color: false });
  const [initial] = useState<PlacementFields>(() => ({
    posX: String(item.posX),
    posY: String(item.posY),
    width: String(item.width),
    height: String(item.height),
    rotation: String(item.rotation)
  }));
  const [position, setPosition] = useState(initial);
  const [undo, setUndo] = useState<PlacementFields[]>([]);
  const [redo, setRedo] = useState<PlacementFields[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const checkpoint = () => {
    setUndo((previous) => [...previous.slice(-99), position]);
    setRedo([]);
  };
  const change = (value: PlacementFields, record = true) => {
    if (record) checkpoint();
    if (value.width !== position.width || value.height !== position.height)
      setEdited((previous) => ({ ...previous, dimensions: true }));
    setPosition(value);
  };
  const chooseKind = (nextKind: DecorationKind) => {
    const next = changeDecorationKind(
      { kind, label, color, width: position.width, height: position.height },
      nextKind,
      language === 'vi',
      edited
    );
    checkpoint();
    setKind(next.kind);
    setLabel(next.label);
    setColor(next.color);
    setPosition((previous) => ({ ...previous, width: next.width, height: next.height }));
    setError('');
  };
  const preset = decorationPresets[kind];
  const current = { ...item, kind, label, color };
  const placement = usePlacementValidation(workspaceId, floorId, position, { decoration: current });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className='max-h-[94dvh] overflow-y-auto rounded-2xl sm:max-w-5xl'>
        <DialogHeader className='border-b border-border/70 pb-4'>
          <DialogTitle className='flex items-center gap-3'>
            <span className='flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Shapes className='size-5' />
            </span>
            {c('Layout object', 'Đồ bố trí')}
          </DialogTitle>
          <DialogDescription>
            {c(
              'Choose a furnishing, set its appearance and arrange it on the floor. These objects are display-only and are not bookable.',
              'Chọn vật dụng, chỉnh hình thức và bố trí trên tầng. Các đối tượng này chỉ hiển thị, không dùng để đặt chỗ.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className='space-y-4'
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || placement.blocked) return;
            const parsed = schema.safeParse({ label, color, ...position });
            if (!parsed.success) {
              setError(
                c(
                  'Enter a name and valid geometry (up to two decimal places).',
                  'Nhập tên và tọa độ, kích thước hợp lệ (tối đa 2 số thập phân).'
                )
              );
              return;
            }
            setBusy(true);
            setError('');
            try {
              await onSave({
                ...current,
                label: parsed.data.label,
                posX: Number(position.posX),
                posY: Number(position.posY),
                width: Number(position.width),
                height: Number(position.height),
                rotation: Number(position.rotation)
              });
              onClose();
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : c('Could not save layout.', 'Không thể lưu bố trí.')
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && (
            <p
              role='alert'
              className='rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive'
            >
              {error}
            </p>
          )}
          <div
            role='group'
            aria-label={c('Layout object type', 'Loại đồ bố trí')}
            className='grid grid-cols-2 gap-3 sm:grid-cols-4'
          >
            {(
              [
                {
                  kind: 'TABLE',
                  title: c('Table', 'Bàn'),
                  description: c('Work surface', 'Mặt bàn')
                },
                {
                  kind: 'PLANT',
                  title: c('Plant', 'Cây xanh'),
                  description: c('Planter', 'Chậu cây')
                },
                {
                  kind: 'PARTITION',
                  title: c('Partition', 'Vách ngăn'),
                  description: c('Space divider', 'Phân chia khu vực')
                },
                {
                  kind: 'OTHER',
                  title: c('Other furnishing', 'Vật dụng khác'),
                  description: c('Generic object', 'Khối vật dụng')
                }
              ] as const
            ).map((option) => (
              <Button
                key={option.kind}
                type='button'
                variant='outline'
                aria-pressed={kind === option.kind}
                disabled={busy}
                className={`relative h-28 flex-col gap-2 rounded-2xl whitespace-normal px-3 shadow-none transition-colors ${kind === option.kind ? 'border-primary/50 bg-primary/[0.06] text-primary ring-1 ring-primary/20 hover:bg-primary/10' : 'border-border/80 bg-card text-foreground hover:border-primary/30'}`}
                onClick={() => chooseKind(option.kind)}
              >
                {kind === option.kind && <Check className='absolute right-2.5 top-2.5 size-3.5' />}
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${kind === option.kind ? 'bg-primary/10' : 'bg-muted/70 text-muted-foreground'}`}
                >
                  <DecorationIcon kind={option.kind} className='size-6' />
                </span>
                <span className='text-sm font-semibold'>{option.title}</span>
                <span className='text-[10px] font-normal leading-none text-muted-foreground'>
                  {option.description}
                </span>
              </Button>
            ))}
          </div>
          <div className='grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-[1fr_160px]'>
            <label className='space-y-1.5 text-sm'>
              <span>{c('Label', 'Tên hiển thị')}</span>
              <Input
                value={label}
                maxLength={100}
                disabled={busy}
                onChange={(event) => {
                  setEdited((previous) => ({ ...previous, label: true }));
                  setLabel(event.target.value);
                }}
              />
            </label>
            <label className='space-y-1.5 text-sm'>
              <span>{c('Color', 'Màu hiển thị')}</span>
              <input
                type='color'
                aria-label={c('Display color', 'Màu hiển thị')}
                value={color}
                disabled={busy}
                onChange={(event) => {
                  setEdited((previous) => ({ ...previous, color: true }));
                  setColor(event.target.value);
                }}
                className='block h-10 w-full cursor-pointer rounded-lg border border-input bg-background p-1'
              />
            </label>
          </div>
          <div className='space-y-3 rounded-xl border border-border/70 p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p className='flex items-center gap-2 text-sm font-medium'>
                <Ruler className='size-4 text-muted-foreground' />
                {c('Position & footprint', 'Vị trí & kích thước')}
              </p>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-7 text-xs'
                disabled={busy}
                onClick={() => {
                  checkpoint();
                  setPosition((previous) => ({
                    ...previous,
                    width: String(preset.width),
                    height: String(preset.height)
                  }));
                  setEdited((previous) => ({ ...previous, dimensions: false }));
                }}
              >
                <RotateCcw className='mr-1 size-3' />
                {c('Use suggested size', 'Dùng kích thước gợi ý')} {preset.width} × {preset.height}
              </Button>
            </div>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
              {(['posX', 'posY', 'width', 'height', 'rotation'] as const).map((key) => (
                <label key={key} className='space-y-1.5 text-xs'>
                  <span>
                    {
                      {
                        posX: 'X',
                        posY: 'Y',
                        width: c('Width', 'Rộng'),
                        height: c('Height', 'Cao'),
                        rotation: c('Rotation', 'Góc xoay')
                      }[key]
                    }
                  </span>
                  <Input
                    inputMode='decimal'
                    value={position[key]}
                    disabled={busy}
                    onChange={(event) => change({ ...position, [key]: event.target.value })}
                  />
                </label>
              ))}
            </div>
            <p className='text-[11px] text-muted-foreground'>
              {c(
                'Dimensions are canvas pixels, not real-world measurements. Resizing does not move or resize other objects.',
                'Kích thước tính bằng pixel trên sơ đồ, không phải số đo thực. Đổi kích thước không di chuyển hay thay đổi vật dụng khác.'
              )}
            </p>
          </div>
          <ResourcePlacementEditor
            workspaceId={workspaceId}
            floorId={floorId}
            decoration={current}
            value={position}
            disabled={busy}
            onBegin={checkpoint}
            onChange={change}
            canUndo={undo.length > 0}
            canRedo={redo.length > 0}
            onReset={() => change(initial)}
            onUndo={() => {
              const next = undo.at(-1);
              if (next) {
                setRedo((previous) => [...previous, position]);
                setUndo((previous) => previous.slice(0, -1));
                setPosition(next);
              }
            }}
            onRedo={() => {
              const next = redo.at(-1);
              if (next) {
                setUndo((previous) => [...previous, position]);
                setRedo((previous) => previous.slice(0, -1));
                setPosition(next);
              }
            }}
          />
          {placement.result && !placement.result.valid && (
            <p
              role='alert'
              className='rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive'
            >
              {c(
                'Cannot save: objects overlap or extend outside their floor/room. Adjust the layout.',
                'Không thể lưu: các đối tượng chồng lấn hoặc vượt khỏi tầng/phòng. Vui lòng chỉnh lại vị trí.'
              )}
            </p>
          )}
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' disabled={busy} onClick={onClose}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button type='submit' disabled={busy || placement.blocked}>
              {busy ? (
                <LoaderCircle className='size-4 animate-spin' />
              ) : (
                <Save className='size-4' />
              )}
              {c('Save layout draft', 'Lưu bố trí nháp')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
