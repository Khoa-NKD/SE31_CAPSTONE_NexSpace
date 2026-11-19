import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import {
  operationsApi,
  type PricingConfig,
  type PricingRule,
  type PricingRuleInput
} from '@/features/organizer-operations/api';
import { selectClass } from '@/features/organizer-operations/components/operations-shared';
import { saveResourceType, type TypeOption } from '@/features/organizer-resources/api/resources';

interface EditorProps {
  workspaceId: number;
  close: () => void;
  saved: () => Promise<void>;
}
export function PricingRuleEditor({
  workspaceId,
  config,
  current,
  close,
  saved
}: EditorProps & { config: PricingConfig; current?: PricingRule }) {
  const c = useOrganizerCopy();
  const [input, setInput] = useState<PricingRuleInput>(
    current ?? {
      name: '',
      resourceTypeId: null,
      resourceId: null,
      modifierType: 'CUSTOM',
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      multiplier: '1.00',
      fixedAmount: '0',
      priority: 0,
      active: true
    }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field = <K extends keyof PricingRuleInput>(key: K, value: PricingRuleInput[K]) =>
    setInput((p) => ({ ...p, [key]: value }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {current
              ? c('Edit surcharge rule', 'Chỉnh quy tắc phụ thu')
              : c('Add surcharge rule', 'Thêm quy tắc phụ thu')}
          </DialogTitle>
          <DialogDescription>
            {c(
              'Fixed amounts are charged per matching hour in the target currency. A multiplier of 1.2 means a 20% surcharge.',
              'Tiền cộng thêm tính cho mỗi giờ đáp ứng điều kiện, theo tiền tệ của phạm vi đã chọn. Hệ số 1,2 nghĩa là phụ thu 20%.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className='space-y-4'
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setBusy(true);
            try {
              await operationsApi.saveRule(workspaceId, input, current?.id);
              await saved();
              toast.success(c('Rule saved', 'Đã lưu quy tắc'));
              close();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className='block space-y-1 text-sm'>
            <span>{c('Rule name', 'Tên quy tắc')} *</span>
            <Input
              required
              maxLength={100}
              value={input.name}
              onChange={(e) => field('name', e.target.value)}
            />
          </label>
          <label className='block space-y-1 text-sm'>
            <span>{c('Scope', 'Phạm vi')}</span>
            <select
              className={`${selectClass} w-full`}
              value={
                input.resourceId
                  ? `r:${input.resourceId}`
                  : input.resourceTypeId
                    ? `t:${input.resourceTypeId}`
                    : 'all'
              }
              onChange={(e) => {
                const [kind, id] = e.target.value.split(':');
                setInput((p) => ({
                  ...p,
                  resourceId: kind === 'r' ? Number(id) : null,
                  resourceTypeId: kind === 't' ? Number(id) : null
                }));
              }}
            >
              <option value='all'>{c('Entire workspace', 'Toàn workspace')}</option>
              <optgroup label={c('Resource types', 'Loại chỗ')}>
                {config.types.map((t) => (
                  <option key={t.id} value={`t:${t.id}`}>
                    {t.name} · {t.currency}
                  </option>
                ))}
              </optgroup>
              <optgroup label={c('Individual seats / rooms', 'Từng ghế / phòng')}>
                {config.resources.map((r) => (
                  <option key={r.id} value={`r:${r.id}`}>
                    {r.name || r.code} · {c('Floor', 'Tầng')} {r.floorNumber} · {r.currency}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className='block space-y-1 text-sm'>
            <span>{c('Applies on', 'Áp dụng khi')}</span>
            <select
              className={`${selectClass} w-full`}
              value={input.modifierType}
              onChange={(e) =>
                field('modifierType', e.target.value as PricingRuleInput['modifierType'])
              }
            >
              <option value='CUSTOM'>{c('Every selected day', 'Mọi ngày trong phạm vi')}</option>
              <option value='WEEKEND'>{c('Saturday and Sunday', 'Thứ Bảy và Chủ Nhật')}</option>
              <option value='PEAK_HOUR'>{c('Peak hours', 'Giờ cao điểm')}</option>
              <option value='HOLIDAY'>{c('Specific holiday dates', 'Ngày lễ cụ thể')}</option>
            </select>
          </label>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='space-y-1 text-sm'>
              {c('Start date (optional)', 'Từ ngày (tùy chọn)')}
              <DateInput
                value={input.startDate || ''}
                onValueChange={(v) => field('startDate', v || null)}
              />
            </label>
            <label className='space-y-1 text-sm'>
              {c('End date (optional)', 'Đến ngày (tùy chọn)')}
              <DateInput
                value={input.endDate || ''}
                onValueChange={(v) => field('endDate', v || null)}
              />
            </label>
            <label className='space-y-1 text-sm'>
              {c('Start time (optional)', 'Từ giờ (tùy chọn)')}
              <Input
                type='time'
                value={input.startTime?.slice(0, 5) || ''}
                onChange={(e) => field('startTime', e.target.value || null)}
              />
            </label>
            <label className='space-y-1 text-sm'>
              {c('End time (optional)', 'Đến giờ (tùy chọn)')}
              <Input
                type='time'
                value={input.endTime?.slice(0, 5) || ''}
                onChange={(e) => field('endTime', e.target.value || null)}
              />
            </label>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='space-y-1 text-sm'>
              {c('Rate multiplier', 'Hệ số giá')}
              <Input
                required
                type='number'
                min={1}
                max={999.99}
                step={0.01}
                value={input.multiplier}
                onChange={(e) => field('multiplier', e.target.value)}
              />
            </label>
            <label className='space-y-1 text-sm'>
              {c('Extra amount per hour', 'Tiền cộng thêm mỗi giờ')}
              <Input
                required
                type='number'
                min={0}
                step={0.01}
                value={input.fixedAmount}
                onChange={(e) => field('fixedAmount', e.target.value)}
              />
            </label>
            <label className='space-y-1 text-sm'>
              {c('Priority (higher wins)', 'Ưu tiên (số lớn ưu tiên)')}
              <Input
                required
                type='number'
                min={0}
                max={10000}
                step={1}
                value={input.priority}
                onChange={(e) => field('priority', Number(e.target.value))}
              />
            </label>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={input.active}
                onChange={(e) => field('active', e.target.checked)}
              />
              {c('Enable rule', 'Bật quy tắc')}
            </label>
          </div>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type='button' variant='outline' disabled={busy} onClick={close}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button type='submit' disabled={busy}>
              {busy ? c('Saving…', 'Đang lưu…') : c('Save rule', 'Lưu quy tắc')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function BaseRateEditor({
  workspaceId,
  current,
  close,
  saved
}: EditorProps & { current: TypeOption }) {
  const c = useOrganizerCopy();
  const [prices, setPrices] = useState({
    pricePerHour: current.pricePerHour || '',
    pricePerDay: current.pricePerDay || '',
    pricePerMonth: current.pricePerMonth || ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {c('Edit base rates', 'Chỉnh giá cơ bản')} · {current.name}
          </DialogTitle>
          <DialogDescription>
            {c(
              'New bookings only. Individual hourly overrides remain unchanged.',
              'Chỉ áp dụng cho booking mới. Giá giờ riêng của từng ghế/phòng vẫn giữ nguyên.'
            )}{' '}
            {current.currency}
          </DialogDescription>
        </DialogHeader>
        <form
          className='space-y-4'
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              if (!current.currency)
                throw new Error(
                  c(
                    'Configure the resource type currency first.',
                    'Cần cấu hình tiền tệ của loại chỗ trước.'
                  )
                );
              await saveResourceType(
                workspaceId,
                {
                  name: current.name,
                  category: current.category,
                  currency: current.currency,
                  capacity: current.capacity,
                  usageKind: current.usageKind,
                  standardWidthM:
                    current.standardWidthM == null ? null : Number(current.standardWidthM),
                  standardLengthM:
                    current.standardLengthM == null ? null : Number(current.standardLengthM),
                  pricePerHour: prices.pricePerHour || null,
                  pricePerDay: prices.pricePerDay || null,
                  pricePerMonth: prices.pricePerMonth || null
                },
                current
              );
              await saved();
              close();
              toast.success(c('Rates saved', 'Đã lưu giá'));
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className='rounded-lg bg-muted p-3 text-xs leading-relaxed'>
            {c(
              'Daily rate: up to 24 continuous hours counts as one day; each additional started day is charged in full. Monthly rates can be configured, but monthly bookings are not supported yet.',
              'Giá ngày: tối đa 24 giờ liên tục tính 1 ngày; vượt mốc thì tính thêm trọn ngày tiếp theo. Giá tháng được cấu hình nhưng chưa hỗ trợ đặt theo tháng.'
            )}
          </p>
          {(['pricePerHour', 'pricePerDay', 'pricePerMonth'] as const).map((key, index) => (
            <label key={key} className='block space-y-1 text-sm'>
              {
                [c('Hourly', 'Theo giờ'), c('Daily', 'Theo ngày'), c('Monthly', 'Theo tháng')][
                  index
                ]
              }
              <Input
                type='number'
                min='0.01'
                step='0.01'
                value={prices[key]}
                onChange={(e) => setPrices((p) => ({ ...p, [key]: e.target.value }))}
              />
            </label>
          ))}
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type='button' variant='outline' disabled={busy} onClick={close}>
              {c('Cancel', 'Hủy')}
            </Button>
            <Button disabled={busy}>{c('Save rates', 'Lưu giá')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
