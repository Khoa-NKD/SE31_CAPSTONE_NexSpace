import type { WorkspaceFilter } from '../types';
interface Props {
  filter: WorkspaceFilter;
  onFilterChange: (value: WorkspaceFilter) => void;
  counts: {
    all: number;
    active: number;
    pending?: number;
    inactive: number;
    maintenance: number;
    draft: number;
  };
}
export function WorkspaceFilterPills({ filter, onFilterChange }: Props) {
  const items = [
    ['all', 'Tất cả'],
    ['active', 'Hoạt động'],
    ['inactive', 'Ngưng hoạt động'],
    ['maintenance', 'Bảo trì'],
    ['holiday', 'Nghỉ lễ'],
    ['draft', 'Bản nháp']
  ] as const;
  return (
    <div
      role='tablist'
      aria-label='Lọc không gian theo trạng thái'
      className='flex flex-wrap gap-1 rounded-2xl border bg-card p-1'
    >
      {items.map(([value, label]) => (
        <button
          type='button'
          role='tab'
          key={value}
          aria-selected={filter === value}
          onClick={() => onFilterChange(value)}
          className={
            'rounded-xl px-4 py-2 text-xs font-medium transition-colors ' +
            (filter === value
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted')
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
