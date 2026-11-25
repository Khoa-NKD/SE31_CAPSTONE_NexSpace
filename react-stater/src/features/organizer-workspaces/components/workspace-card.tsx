import { Link } from '@tanstack/react-router';
import { Building2, MapPin, ArrowUpRight } from '@/components/ui/hugeicons';
import { WorkspaceCellAction } from './workspace-columns';
import { WorkspaceStatusBadge } from './workspace-status-badge';
import { WorkspaceFacts } from './workspace-facts';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import type { OrganizerWorkspace, WorkspaceStatus } from '../types';
export function WorkspaceCard({
  workspace,
  onStatusChange
}: {
  workspace: OrganizerWorkspace;
  onStatusChange?: (id: string, status: WorkspaceStatus) => void;
}) {
  const c = useOrganizerCopy();
  const address =
    workspace.address || [workspace.district, workspace.city].filter(Boolean).join(', ');
  return (
    <article className='group overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/35'>
      <div className='relative aspect-[16/8] overflow-hidden border-b bg-muted/25'>
        {workspace.imageUrl ? (
          <img
            src={workspace.imageUrl}
            alt={workspace.name}
            loading='lazy'
            className='h-full w-full object-cover'
          />
        ) : (
          <div className='flex h-full items-center justify-center text-muted-foreground/40'>
            <Building2 className='size-12' />
          </div>
        )}
        <span className='absolute bottom-3 left-3 rounded-full bg-card/95'>
          <WorkspaceStatusBadge status={workspace.status} />
        </span>
        <div className='absolute right-3 top-3 rounded-lg border bg-card/95'>
          <WorkspaceCellAction workspace={workspace} onStatusChange={onStatusChange} />
        </div>
      </div>
      <div className='space-y-3 p-4'>
        <Link
          to='/dashboard/organizer/workspaces/lifecycle'
          search={{ id: workspace.id }}
          className='flex items-center justify-between gap-3 text-sm font-semibold hover:text-primary'
        >
          <span className='truncate text-base'>{workspace.name}</span>
          <ArrowUpRight className='size-4 shrink-0 text-muted-foreground group-hover:text-primary' />
        </Link>
        {workspace.description && (
          <p className='line-clamp-2 text-xs leading-relaxed text-muted-foreground'>
            {workspace.description}
          </p>
        )}
        <p className='flex min-h-9 items-start gap-1.5 text-xs leading-relaxed text-muted-foreground'>
          <MapPin className='mt-0.5 size-3.5 shrink-0' />
          <span className='line-clamp-2'>
            {address || c('Address not set', 'Chưa thiết lập địa chỉ')}
          </span>
        </p>
        <div className='border-t pt-3'>
          <WorkspaceFacts workspace={workspace} />
        </div>
      </div>
    </article>
  );
}
