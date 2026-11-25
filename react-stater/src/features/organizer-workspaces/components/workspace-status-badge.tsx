import type { WorkspaceStatus } from '../types';
const states: Record<WorkspaceStatus, { label: string; style: string }> = {
  HOLIDAY: {
    label: 'Nghỉ lễ',
    style: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  ACTIVE: {
    label: 'Đang hoạt động',
    style: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  },
  MAINTENANCE: {
    label: 'Đang bảo trì',
    style: 'border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400'
  },
  DRAFT: { label: 'Bản nháp', style: 'border-border bg-muted/50 text-muted-foreground' },
  INACTIVE: { label: 'Ngưng hoạt động', style: 'border-border bg-muted/50 text-muted-foreground' },
  PENDING: { label: 'Ngưng hoạt động', style: 'border-border bg-muted/50 text-muted-foreground' },
  ARCHIVED: { label: 'Không hoạt động', style: 'border-border bg-muted/50 text-muted-foreground' }
};
export function WorkspaceStatusBadge({ status }: { status: WorkspaceStatus }) {
  const state = states[status];
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium ' +
        state.style
      }
    >
      <span className='size-1.5 rounded-full bg-current' aria-hidden='true' />
      {state.label}
    </span>
  );
}
