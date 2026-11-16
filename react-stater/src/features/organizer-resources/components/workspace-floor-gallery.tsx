import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import { useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  Search,
  Layers3,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/features/landing/context/language-context';
import { canConfigureWorkspaceResources, type WorkspaceOption } from '../api/resources';

export function workspaceState(status: string, vi: boolean) {
  const labels: Record<string, [string, string]> = {
    DRAFT: ['Draft', 'Bản nháp'],
    ACTIVE: ['Active', 'Đang hoạt động'],
    INACTIVE: ['Inactive', 'Tạm ngưng'],
    PENDING_REVIEW: ['Pending review', 'Chờ duyệt'],
    REJECTED: ['Rejected', 'Bị từ chối'],
    ARCHIVED: ['Archived', 'Đã lưu trữ']
  };
  return labels[status]?.[vi ? 1 : 0] ?? status;
}

/** Architectural illustration only; actual floor counts are shown after opening a workspace. */
function WorkspaceIllustration({ index }: { index: number }) {
  return (
    <svg viewBox='0 0 320 185' className='h-44 w-full' aria-hidden='true'>
      <defs>
        <pattern
          id={`workspace-grid-${index}`}
          width='24'
          height='24'
          patternUnits='userSpaceOnUse'
        >
          <path d='M24 0H0V24' fill='none' stroke='currentColor' strokeOpacity='.08' />
        </pattern>
      </defs>
      <rect width='320' height='185' fill={`url(#workspace-grid-${index})`} />
      <ellipse cx='163' cy='162' rx='91' ry='12' fill='currentColor' opacity='.07' />
      <path d='M85 79 167 34 240 76 158 123Z' fill='currentColor' opacity='.13' />
      <path d='M85 79V135L158 177V123Z' fill='currentColor' opacity='.17' />
      <path d='M158 123 240 76V132L158 177Z' fill='currentColor' opacity='.25' />
      <path
        d='M85 60 167 15 240 57 158 104Z'
        fill='currentColor'
        opacity='.13'
        stroke='currentColor'
        strokeOpacity='.45'
      />
      <path d='M85 60V79L158 123V104Z' fill='currentColor' opacity='.18' />
      <path d='M158 104 240 57V76L158 123Z' fill='currentColor' opacity='.32' />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${100 + i * 12} ${94 + i * 7}v24m${76 - i * 24} ${-i * 14 + 12}v-20`}
          stroke='currentColor'
          strokeWidth='4'
          opacity='.38'
        />
      ))}
      <path
        d='m55 147 15-8m185-31 15-8M167 15V0'
        stroke='currentColor'
        strokeOpacity='.25'
        strokeDasharray='3 4'
      />
      <circle cx='55' cy='147' r='3' fill='currentColor' opacity='.5' />
      <circle cx='270' cy='100' r='3' fill='currentColor' opacity='.5' />
    </svg>
  );
}

export function WorkspaceFloorGallery({
  workspaces,
  onOpen
}: {
  workspaces: WorkspaceOption[];
  onOpen: (id: number) => void;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const c = (en: string, local: string) => (vi ? local : en);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = workspaces.filter(
    (workspace) =>
      (status === 'all' || workspace.status === status) &&
      (workspace.name ?? '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  return (
    <div className='space-y-6 pb-6'>
      <OrganizerPageHeader
        title={c('Floor Plans & Zones', 'Sơ đồ tầng & khu vực')}
        description={c('Choose a workspace to explore its floors and edit the layout.', 'Chọn workspace để xem tầng và chỉnh sửa sơ đồ.')}
        icon={<Layers3 aria-hidden='true' />}
      >
        <span className='text-xs text-muted-foreground'>
          <strong className='font-semibold tabular-nums text-foreground'>{workspaces.length}</strong>{' '}
          {c('workspaces', 'không gian')}
          <span className='mx-2 text-border' aria-hidden='true'>·</span>
          <strong className='font-semibold tabular-nums text-primary'>
            {workspaces.filter((item) => canConfigureWorkspaceResources(item.status)).length}
          </strong>{' '}
          {c('editable', 'có thể thiết kế')}
        </span>
      </OrganizerPageHeader>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-base font-semibold'>{c('Your workspaces', 'Không gian của bạn')}</h2>
        </div>
        <div className='flex w-full gap-2 sm:w-auto'>
          <div className='relative min-w-0 flex-1 sm:w-64'>
            <Search className='absolute left-3 top-3 size-4 text-muted-foreground' />
            <Input
              className='h-10 rounded-xl bg-card pl-9 text-xs'
              placeholder={c('Search workspace…', 'Tìm không gian…')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label={c('Workspace status', 'Trạng thái không gian')}
            className='h-10 max-w-44 rounded-xl border border-input bg-card px-3 text-xs'
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value='all'>{c('All statuses', 'Tất cả trạng thái')}</option>
            {[...new Set(workspaces.map((workspace) => workspace.status))].map((value) => (
              <option key={value} value={value}>
                {workspaceState(value, vi)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
        {filtered.map((workspace, index) => (
          <button
            key={workspace.id}
            type='button'
            onClick={() => onOpen(workspace.id)}
            className='group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none'
          >
            <div className='relative border-b border-border bg-gradient-to-br from-primary/[.09] via-primary/[.03] to-background text-primary'>
              <WorkspaceIllustration index={index} />
              <span className='absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-[10px] font-medium text-foreground backdrop-blur'>
                <span
                  className={`size-1.5 rounded-full ${workspace.status === 'ACTIVE' ? 'bg-emerald-500' : workspace.status === 'DRAFT' ? 'bg-amber-500' : 'bg-muted-foreground'}`}
                />
                {workspaceState(workspace.status, vi)}
              </span>
              <span className='absolute right-4 top-4 flex size-8 items-center justify-center rounded-xl border border-primary/15 bg-background/80 text-primary transition-transform group-hover:rotate-12'>
                <ArrowUpRight className='size-4' />
              </span>
            </div>
            <div className='p-5'>
              <h3 className='line-clamp-2 min-h-10 text-sm font-semibold leading-5'>
                {workspace.name || c('Untitled workspace', 'Không gian chưa đặt tên')}
              </h3>
              <p className='mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                {canConfigureWorkspaceResources(workspace.status) ? (
                  <SlidersHorizontal className='size-3.5' />
                ) : (
                  <Building2 className='size-3.5' />
                )}
                {canConfigureWorkspaceResources(workspace.status)
                  ? c('Explore & design floors', 'Khám phá & thiết kế tầng')
                  : c('View floor layouts', 'Xem sơ đồ tầng')}
              </p>
              <div className='mt-5 flex items-center justify-between border-t border-border pt-4 text-xs font-medium text-primary'>
                <span className='flex items-center gap-2'>
                  <Layers3 className='size-4' />
                  {c('Open 3D building', 'Khám phá tòa nhà 3D')}
                </span>
                <ArrowRight className='size-4 transition-transform group-hover:translate-x-1' />
              </div>
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div className='rounded-2xl border border-dashed border-border py-20 text-center'>
          <Building2 className='mx-auto mb-4 size-10 text-primary/40' />
          <h3 className='font-semibold'>
            {c('No matching workspace', 'Chưa có không gian phù hợp')}
          </h3>
          <p className='mt-2 text-xs text-muted-foreground'>
            {c(
              'Try a different search, or create a workspace from My Workspaces.',
              'Đổi bộ lọc hoặc tạo không gian tại mục Không gian của tôi.'
            )}
          </p>
        </div>
      )}
    </div>
  );
}
