import { Info, Plus, RotateCcw, ShieldCheck, Trash2 } from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import type { CancellationRule } from '@/features/workspaces/api/types';
import {
  cancellationPolicyError,
  defaultCancellationRules
} from '@/features/workspaces/utils/cancellation-policy';

export function CancellationPolicyEditor({
  value,
  onChange
}: {
  value: CancellationRule[];
  onChange: (rules: CancellationRule[]) => void;
}) {
  const c = useOrganizerCopy();
  const error = cancellationPolicyError(value, c);
  const isDefault = JSON.stringify(value) === JSON.stringify(defaultCancellationRules());
  const update = (index: number, field: keyof CancellationRule, text: string) =>
    onChange(
      value.map((rule, i) =>
        i === index ? { ...rule, [field]: text === '' ? Number.NaN : Number(text) } : rule
      )
    );
  function addTier() {
    const hours = value.some((rule) => rule.minHoursBeforeStart === 6)
      ? Math.max(
          0,
          ...value.map((rule) =>
            Number.isFinite(rule.minHoursBeforeStart) ? rule.minHoursBeforeStart : 0
          )
        ) + 1
      : 6;
    // Adding a row preserves the current refund at that threshold until the organizer edits it.
    const applicable = value
      .filter((rule) => rule.minHoursBeforeStart <= hours)
      .reduce<CancellationRule | undefined>(
        (found, rule) =>
          !found || rule.minHoursBeforeStart > found.minHoursBeforeStart ? rule : found,
        undefined
      );
    onChange([
      ...value,
      { minHoursBeforeStart: hours, refundPercent: applicable?.refundPercent ?? 0 }
    ]);
  }
  return (
    <section
      className='mt-6 space-y-4 rounded-xl border bg-card p-4 sm:p-6'
      aria-labelledby='cancellation-policy-title'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2
          id='cancellation-policy-title'
          className='flex items-center gap-2 text-base font-semibold'
        >
          <ShieldCheck className='size-5 text-primary' />
          {c('Cancellation & refund policy', 'Chính sách hủy & hoàn tiền')}
        </h2>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onChange(defaultCancellationRules())}
        >
          <RotateCcw className='size-3.5' />
          {c('Restore default', 'Khôi phục mặc định')}
        </Button>
      </div>
      <div className='flex gap-2 rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm leading-relaxed'>
        <Info className='mt-0.5 size-4 shrink-0 text-primary' />
        <p>
          {isDefault
            ? c(
                'This workspace uses the default refund policy. You can edit the hours and refund percentages below, but the policy cannot be empty.',
                'Workspace đang áp dụng chính sách mặc định. Bạn có thể chỉnh các mốc thời gian và tỷ lệ hoàn bên dưới, nhưng không được để trống chính sách.'
              )
            : c(
                'You are editing a custom refund policy. Keep at least one tier or restore the default policy.',
                'Bạn đang chỉnh chính sách riêng. Cần giữ ít nhất một mốc hoàn tiền hoặc khôi phục chính sách mặc định.'
              )}{' '}
          <span className='text-muted-foreground'>
            {c('Changes apply to new bookings only.', 'Thay đổi chỉ áp dụng cho booking mới.')}
          </span>
        </p>
      </div>
      <div className='space-y-2'>
        <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] gap-2 text-xs font-medium text-muted-foreground'>
          <span>{c('Cancel at least (hours before start)', 'Hủy trước ít nhất (giờ)')}</span>
          <span>{c('Refund (%)', 'Hoàn tiền (%)')}</span>
          <span />
        </div>
        {value.map((rule, index) => (
          <div
            key={index}
            className='grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2'
          >
            <Input
              type='number'
              min={0}
              step={1}
              value={Number.isFinite(rule.minHoursBeforeStart) ? rule.minHoursBeforeStart : ''}
              onChange={(event) => update(index, 'minHoursBeforeStart', event.target.value)}
              aria-label={`${c('Hour threshold', 'Mốc giờ')} ${index + 1}`}
            />
            <Input
              type='number'
              min={0}
              max={100}
              step={0.01}
              value={Number.isFinite(rule.refundPercent) ? rule.refundPercent : ''}
              onChange={(event) => update(index, 'refundPercent', event.target.value)}
              aria-label={`${c('Refund percentage', 'Tỷ lệ hoàn')} ${index + 1}`}
            />
            <Button
              type='button'
              size='icon'
              variant='ghost'
              disabled={value.length === 1}
              aria-label={`${c('Remove tier', 'Xóa mốc')} ${index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 className='size-4 text-destructive' />
            </Button>
          </div>
        ))}
      </div>
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Button type='button' variant='outline' size='sm' onClick={addTier}>
          <Plus className='size-4' />
          {c('Add tier', 'Thêm mốc')}
        </Button>
        <p className='text-xs text-muted-foreground'>
          {c(
            'The highest matching hour threshold applies.',
            'Áp dụng mốc giờ cao nhất đáp ứng điều kiện.'
          )}
        </p>
      </div>
      <p className='border-t pt-3 text-xs leading-relaxed text-muted-foreground'>
        {c(
          'These tiers cover customer cancellations before the start time. After the start or a no-show, there is no automatic customer-cancellation refund. Organizer cancellations and service complaints follow the platform rules.',
          'Các mốc áp dụng khi khách chủ động hủy trước giờ bắt đầu. Sau giờ bắt đầu hoặc không đến: không tự động hoàn qua luồng khách hủy. Organizer hủy và khiếu nại dịch vụ được xử lý theo quy định nền tảng.'
        )}
      </p>
    </section>
  );
}
