import { Link } from '@tanstack/react-router';
import { Building2, MapPin, ArrowUpRight, Users, DoorOpen } from '@/components/ui/hugeicons';
import { WorkspaceCellAction } from './workspace-columns';
import { WorkspaceStatusBadge } from './workspace-status-badge';
import type { OrganizerWorkspace, WorkspaceStatus } from '../types';
export function WorkspaceCard({
  workspace,
  onStatusChange
}: {
  workspace: OrganizerWorkspace;
  onStatusChange?: (id: string, status: WorkspaceStatus) => void;
}) {
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
          <span className='truncate'>{workspace.name}</span>
          <ArrowUpRight className='size-4 shrink-0 text-muted-foreground group-hover:text-primary' />
        </Link>
        <p className='flex min-h-9 items-start gap-1.5 text-xs leading-relaxed text-muted-foreground'>
          <MapPin className='mt-0.5 size-3.5 shrink-0' />
          <span className='line-clamp-2'>{address || 'Chưa thiết lập địa chỉ'}</span>
        </p>
        {(workspace.desksCount != null || workspace.meetingRoomsCount != null) && (
          <div className='flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground'>
            {workspace.desksCount != null && (
              <span className='inline-flex items-center gap-1.5'>
                <Users className='size-3.5' />
                {workspace.desksCount} ghế
              </span>
            )}
            {workspace.meetingRoomsCount != null && (
              <span className='inline-flex items-center gap-1.5'>
                <DoorOpen className='size-3.5' />
                {workspace.meetingRoomsCount} phòng họp
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
