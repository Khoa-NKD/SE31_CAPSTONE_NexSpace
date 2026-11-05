import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Link } from '@tanstack/react-router';
import type { Column, ColumnDef } from '@tanstack/react-table';
import {
  MoreHorizontal,
  Eye,
  PlayCircle,
  PauseCircle,
  Archive,
  ExternalLink,
  MapPin,
  Building2,
  Users,
  Star
} from 'lucide-react';
import type { OrganizerWorkspace, WorkspaceStatus } from '../types';
import { getWorkspaceResumeRoute } from '../utils/workspace-routing';

interface WorkspaceCellActionProps {
  workspace: OrganizerWorkspace;
  onStatusChange?: (id: string, status: WorkspaceStatus) => void;
}

export function WorkspaceCellAction({ workspace, onStatusChange }: WorkspaceCellActionProps) {
  const isDraft = workspace.status === 'DRAFT';
  const isActive = workspace.status === 'ACTIVE';
  const isPaused = workspace.status === 'PAUSED';
  const resumeRoute = isDraft ? getWorkspaceResumeRoute(workspace) : '/dashboard/organizer/workspaces/create';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0' aria-label='Open action menu'>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {isDraft ? (
          // DRAFT status: ONLY provide Resume Setup / Tiếp tục chỉnh sửa action (resumes at ongoing step)
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link
                to={resumeRoute}
                search={{ id: workspace.id, mode: 'edit' }}
                className='cursor-pointer flex items-center text-amber-600 font-medium'
              >
                <PlayCircle className='mr-2 h-4 w-4 text-amber-600' />
                <span>Resume Setup</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : (
          // PUBLISHED / ACTIVE / OFFICIAL status: Manage Details, View Public Page, and Lifecycle actions
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  to='/dashboard/organizer/workspaces/lifecycle'
                  search={{ id: workspace.id }}
                  className='cursor-pointer flex items-center'
                >
                  <Eye className='mr-2 h-4 w-4 text-muted-foreground' />
                  <span>Manage Details</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  to='/workspaces/$workspaceId'
                  params={{ workspaceId: workspace.id }}
                  className='cursor-pointer flex items-center'
                >
                  <ExternalLink className='mr-2 h-4 w-4 text-muted-foreground' />
                  <span>View Public Page</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            {onStatusChange && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {isActive && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(workspace.id, 'PAUSED')}
                      className='cursor-pointer text-amber-600'
                    >
                      <PauseCircle className='mr-2 h-4 w-4' />
                      <span>Pause Workspace</span>
                    </DropdownMenuItem>
                  )}
                  {isPaused && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(workspace.id, 'ACTIVE')}
                      className='cursor-pointer text-emerald-600'
                    >
                      <PlayCircle className='mr-2 h-4 w-4' />
                      <span>Activate Workspace</span>
                    </DropdownMenuItem>
                  )}
                  {workspace.status !== 'ARCHIVED' && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(workspace.id, 'ARCHIVED')}
                      className='cursor-pointer text-destructive'
                    >
                      <Archive className='mr-2 h-4 w-4' />
                      <span>Archive</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const statusConfig: Record<
  WorkspaceStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }
> = {
  ACTIVE: {
    label: 'ACTIVE',
    variant: 'default',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  DRAFT: {
    label: 'DRAFT',
    variant: 'secondary',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  },
  UNDER_REVIEW: {
    label: 'UNDER REVIEW',
    variant: 'outline',
    className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
  },
  PAUSED: {
    label: 'PAUSED',
    variant: 'outline',
    className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
  },
  MAINTENANCE: {
    label: 'MAINTENANCE',
    variant: 'outline',
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  },
  ARCHIVED: {
    label: 'ARCHIVED',
    variant: 'destructive',
    className: 'bg-destructive/10 text-destructive border-destructive/20'
  }
};

export function getWorkspaceColumns(
  onStatusChange?: (id: string, status: WorkspaceStatus) => void
): ColumnDef<OrganizerWorkspace>[] {
  return [
    {
      id: 'workspace',
      accessorKey: 'name',
      header: ({ column }: { column: Column<OrganizerWorkspace, unknown> }) => (
        <DataTableColumnHeader column={column} title='Workspace' />
      ),
      cell: ({ row }) => {
        const ws = row.original;
        const isDraft = ws.status === 'DRAFT';
        return (
          <div className='flex items-center gap-3 py-1'>
            {ws.imageUrl ? (
              <img
                src={ws.imageUrl}
                alt={ws.name}
                className='size-12 rounded-lg object-cover border border-border shrink-0'
              />
            ) : (
              <div className='size-12 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0 text-muted-foreground'>
                <Building2 className='size-6' />
              </div>
            )}
            <div className='flex flex-col min-w-0'>
              {isDraft ? (
                <Link
                  to={getWorkspaceResumeRoute(ws)}
                  search={{ id: ws.id, mode: 'edit' }}
                  className='font-semibold text-sm hover:text-indigo-600 hover:underline truncate text-foreground'
                >
                  {ws.name}
                </Link>
              ) : (
                <Link
                  to='/dashboard/organizer/workspaces/lifecycle'
                  search={{ id: ws.id }}
                  className='font-semibold text-sm hover:text-indigo-600 hover:underline truncate text-foreground'
                >
                  {ws.name}
                </Link>
              )}
              <div className='flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5'>
                <MapPin className='size-3 shrink-0' />
                <span className='truncate'>{ws.address || `${ws.district}, ${ws.city}`}</span>
              </div>
            </div>
          </div>
        );
      },
      enableSorting: true
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }: { column: Column<OrganizerWorkspace, unknown> }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const config = statusConfig[status] || statusConfig.ACTIVE;
        return (
          <div className='flex flex-col gap-1 items-start'>
            <Badge variant={config.variant} className={`border font-semibold text-2xs ${config.className}`}>
              {config.label}
            </Badge>
            {status === 'DRAFT' && row.original.draftProgress !== undefined && (
              <span className='text-2xs text-muted-foreground'>
                {row.original.draftProgress}% complete
              </span>
            )}
          </div>
        );
      },
      enableSorting: true
    },
    {
      id: 'capacity',
      header: 'Capacity & Units',
      cell: ({ row }) => {
        const ws = row.original;
        return (
          <div className='flex flex-col text-xs text-muted-foreground gap-0.5'>
            <span className='text-foreground font-medium flex items-center gap-1'>
              <Users className='size-3 text-muted-foreground' />
              {ws.desksCount} desks
            </span>
            <span>{ws.meetingRoomsCount} meeting rooms</span>
          </div>
        );
      }
    },
    {
      id: 'performance',
      header: 'Occupancy & Rating',
      cell: ({ row }) => {
        const ws = row.original;
        return (
          <div className='flex flex-col text-xs gap-1'>
            <div className='flex items-center gap-1 font-medium'>
              <Star className='size-3.5 fill-amber-400 text-amber-400' />
              <span>{ws.rating > 0 ? ws.rating.toFixed(1) : 'New'}</span>
              {ws.reviewsCount ? (
                <span className='text-muted-foreground text-2xs'>({ws.reviewsCount})</span>
              ) : null}
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='w-16 h-1.5 bg-muted rounded-full overflow-hidden'>
                <div
                  className='h-full bg-emerald-500 rounded-full'
                  style={{ width: `${Math.min(100, Math.max(0, ws.occupancyRate ?? 0))}%` }}
                />
              </div>
              <span className='text-2xs text-muted-foreground'>{ws.occupancyRate ?? 0}%</span>
            </div>
          </div>
        );
      }
    },
    {
      id: 'tier',
      accessorKey: 'tier',
      header: 'Tier / Plan',
      cell: ({ row }) => {
        return (
          <span className='text-xs font-medium text-muted-foreground'>
            {row.original.tier || 'Standard Tier'}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <WorkspaceCellAction workspace={row.original} onStatusChange={onStatusChange} />
      ),
      enableSorting: false
    }
  ];
}

