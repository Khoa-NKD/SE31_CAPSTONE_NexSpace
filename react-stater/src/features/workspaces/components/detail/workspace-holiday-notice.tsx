import type { CanonicalWorkspace, PublicWorkspaceSummary } from '../../api/types';
import { Calendar } from '@/components/ui/hugeicons';
import { formatHolidayOpening } from '../../utils/workspace-holidays';
export function WorkspaceHolidayNotice({
  workspace
}: {
  workspace: Pick<CanonicalWorkspace | PublicWorkspaceSummary, 'holidayClosure'>;
}) {
  const closure = workspace.holidayClosure;
  if (!closure) return null;
  return (
    <div
      role='status'
      className='my-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4'
    >
      <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
        <Calendar className='size-4' />
      </span>
      <div>
        <p className='text-sm font-semibold'>
          Không gian đang nghỉ lễ · {closure.names.join(', ')}
        </p>
        <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
          {closure.reopensAt
            ? `Dự kiến hoạt động lại lúc ${formatHolidayOpening(closure.reopensAt)} (giờ Việt Nam).`
            : 'Chưa có giờ hoạt động phù hợp sau kỳ nghỉ. Vui lòng kiểm tra lại lịch mở cửa.'}{' '}
          Bạn vẫn có thể xem thông tin và chọn thời gian ngoài ngày nghỉ.
        </p>
      </div>
    </div>
  );
}
