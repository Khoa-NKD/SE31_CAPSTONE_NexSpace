import { CalendarCheck } from '@/components/ui/hugeicons';
import type { CancellationRule } from '@/features/workspaces/api/types';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { cancellationPolicyError } from '@/features/workspaces/utils/cancellation-policy';

export function CancellationPolicyCard({
  snapshot,
  rules
}: {
  snapshot?: string;
  rules?: CancellationRule[];
}) {
  const c = useOrganizerCopy();
  let applied = rules;
  if (snapshot != null) {
    try {
      const parsed: unknown = JSON.parse(snapshot);
      applied =
        Array.isArray(parsed) && (!parsed.length || !cancellationPolicyError(parsed, c))
          ? parsed
          : undefined;
    } catch {
      applied = undefined;
    }
  }
  return (
    <section className='flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs'>
      <CalendarCheck className='mt-0.5 size-5 shrink-0 text-primary' />
      <div className='min-w-0 flex-1 space-y-2 text-xs leading-relaxed sm:text-sm'>
        <h2 className='font-semibold'>
          {snapshot != null
            ? c('Your booking cancellation policy', 'Chính sách hủy đã chốt của đơn')
            : c('Workspace cancellation policy', 'Chính sách hủy của workspace')}
        </h2>
        {applied ? (
          applied.length ? (
            <ul className='space-y-1'>
              {applied.map((rule) => (
                <li key={rule.minHoursBeforeStart} className='flex flex-wrap justify-between gap-2'>
                  <span>
                    {c('At least', 'Trước ít nhất')} {rule.minHoursBeforeStart}{' '}
                    {c('hours before start', 'giờ')}
                  </span>
                  <strong>
                    {c('Refund', 'Hoàn')} {rule.refundPercent}%
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {c(
                'This existing booking has no customer refund tiers in its saved policy.',
                'Chính sách đã lưu của đơn này không có mốc hoàn tiền khi khách chủ động hủy.'
              )}
            </p>
          )
        ) : (
          <p role='status' className='text-muted-foreground'>
            {c(
              'Policy unavailable. Reload or contact support before paying.',
              'Chưa tải được chính sách. Vui lòng tải lại hoặc liên hệ hỗ trợ trước khi thanh toán.'
            )}
          </p>
        )}
        <p className='text-muted-foreground'>
          {c(
            'The highest matching threshold applies. After the start or a no-show: no automatic customer-cancellation refund. Refund processing is separate from submitting a cancellation.',
            'Áp dụng mốc giờ cao nhất đáp ứng điều kiện. Sau giờ bắt đầu hoặc không đến: không tự động hoàn qua luồng khách hủy. Gửi yêu cầu hủy chưa có nghĩa tiền đã được hoàn.'
          )}
        </p>
      </div>
    </section>
  );
}
