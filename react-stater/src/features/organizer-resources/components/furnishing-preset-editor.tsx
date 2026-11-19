import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import {
  saveLayoutTemplate,
  templateOptions,
  type LayoutTemplate,
  type LayoutTemplateInput
} from '../api/floor-design';
import { furnishingIconCatalog } from '../utils/furnishing-icon-catalog';
import { furnishingPresetKey } from '../utils/furnishing-preset-key';
import { DecorationIcon, furnishingIcon } from './decoration-visual';

/** Manual preset management uses the same ownership, duplicate and revision checks as AI presets. */
export function FurnishingPresetEditor({
  actorId,
  current,
  initial,
  library,
  onClose,
  disabled
}: {
  actorId: number;
  current?: LayoutTemplate;
  initial: LayoutTemplateInput;
  library: LayoutTemplate[];
  onClose: () => void;
  disabled: boolean;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const client = useQueryClient();
  const [value, setValue] = useState<LayoutTemplateInput>(() => ({
    ...initial,
    icon: furnishingIcon(initial.kind, initial.name, initial.icon) ?? 'BOX'
  }));
  const [width, setWidth] = useState(String(initial.widthM));
  const [length, setLength] = useState(String(initial.lengthM));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || busy) return;
    const name = value.name.trim(),
      w = Number(width),
      d = Number(length);
    if (
      !name ||
      !width ||
      !length ||
      ![w, d].every(
        (n) =>
          Number.isFinite(n) &&
          n >= 0.01 &&
          n <= 1000 &&
          Math.abs(n * 100 - Math.round(n * 100)) < 0.000001
      )
    ) {
      setError(
        c(
          'Enter a name and dimensions from 0.01 to 1000 m, with at most two decimals.',
          'Nhập tên và kích thước từ 0,01 đến 1000 m, tối đa hai chữ số thập phân.'
        )
      );
      return;
    }
    if (
      library.some(
        (item) =>
          item.id !== current?.id &&
          (item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase() ||
            furnishingPresetKey(item.kind, item.name) === furnishingPresetKey(value.kind, name))
      )
    ) {
      setError(
        c(
          'This furnishing already exists. Edit the existing preset.',
          'Vật dụng này đã có trong kho. Hãy sửa mẫu hiện có.'
        )
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveLayoutTemplate({ ...value, name, widthM: w, lengthM: d }, current);
      await client.invalidateQueries({ queryKey: templateOptions(actorId).queryKey });
      toast.success(c('Preset saved.', 'Đã lưu mẫu vật dụng.'));
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : c('Could not save preset.', 'Không lưu được mẫu.')
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {current
              ? c('Edit furnishing preset', 'Sửa mẫu vật dụng')
              : c('Create furnishing preset', 'Tạo mẫu vật dụng')}
          </DialogTitle>
          <DialogDescription>
            {c(
              'Reusable across your workspaces. Editing this preset does not change objects already placed.',
              'Dùng lại cho các workspace của bạn. Sửa mẫu không thay đổi đồ đã đặt trên sơ đồ.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className='space-y-4'>
          {error && (
            <p role='alert' className='rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
              {error}
            </p>
          )}
          <fieldset disabled={disabled || busy} className='space-y-4 disabled:opacity-60'>
            <label className='block space-y-1 text-sm'>
              <span>{c('Name', 'Tên vật dụng')} *</span>
              <Input
                autoFocus
                required
                maxLength={100}
                value={value.name}
                onChange={(event) => setValue({ ...value, name: event.target.value })}
              />
            </label>
            <label className='block space-y-1 text-sm'>
              <span>{c('Object style', 'Kiểu vật dụng')} *</span>
              <select
                required
                className='organizer-control w-full'
                value={value.icon ?? 'BOX'}
                onChange={(event) => {
                  const icon = event.target.value as NonNullable<LayoutTemplateInput['icon']>;
                  const kind =
                    icon === 'TABLE' || icon === 'PLANT' || icon === 'PARTITION' ? icon : 'OTHER';
                  setValue({
                    ...value,
                    icon,
                    kind,
                    visual3d: value.visual3d
                      ? { version: 1, label: value.name || 'Furnishing', parts: [] }
                      : null
                  });
                }}
              >
                <option value='TABLE'>{c('Table', 'Bàn')}</option>
                <option value='PLANT'>{c('Plant', 'Cây xanh')}</option>
                <option value='PARTITION'>{c('Partition', 'Vách ngăn')}</option>
                {furnishingIconCatalog.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {c(icon.en, icon.vi)}
                  </option>
                ))}
                <option value='BOX'>
                  {c('Custom / other furnishing', 'Vật dụng tùy chỉnh / khác')}
                </option>
              </select>
              <p className='text-xs text-muted-foreground'>
                {c(
                  'Each preset keeps its own name, dimensions, color and 3D design.',
                  'Mỗi mẫu có tên, kích thước, màu và thiết kế 3D riêng.'
                )}
              </p>
            </label>
            <div className='grid grid-cols-2 gap-3'>
              <label className='block space-y-1 text-sm'>
                <span>{c('Length · horizontal (m)', 'Dài · ngang (m)')} *</span>
                <Input
                  type='number'
                  min='.01'
                  max='1000'
                  step='.01'
                  required
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                />
              </label>
              <label className='block space-y-1 text-sm'>
                <span>{c('Width · vertical (m)', 'Rộng · dọc (m)')} *</span>
                <Input
                  type='number'
                  min='.01'
                  max='1000'
                  step='.01'
                  required
                  value={length}
                  onChange={(event) => setLength(event.target.value)}
                />
              </label>
            </div>
            <label className='flex items-center justify-between text-sm'>
              <span>{c('Color', 'Màu sắc')}</span>
              <input
                type='color'
                value={value.color}
                onChange={(event) => setValue({ ...value, color: event.target.value })}
                className='h-9 w-14 cursor-pointer rounded border'
              />
            </label>
            <div className='flex items-center gap-3 rounded-xl border bg-muted/30 p-3'>
              <span style={{ color: value.color }}>
                <DecorationIcon kind={value.kind} icon={value.icon} className='size-8' />
              </span>
              <p className='text-xs text-muted-foreground'>
                {value.visual3d
                  ? c(
                      'Saved custom 3D design is preserved.',
                      'Giữ nguyên thiết kế 3D riêng đã lưu.'
                    )
                  : c(
                      '3D uses the selected object style and these floor dimensions.',
                      '3D dùng kiểu vật dụng đã chọn và kích thước mặt bằng này.'
                    )}
              </p>
            </div>
          </fieldset>
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' disabled={busy} onClick={onClose}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button type='submit' disabled={disabled || busy}>
              {busy ? c('Saving…', 'Đang lưu…') : c('Save preset', 'Lưu mẫu')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
