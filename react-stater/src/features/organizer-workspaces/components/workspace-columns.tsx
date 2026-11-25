import { WorkspaceStatusBadge } from './workspace-status-badge';
import { useWizardStore } from '@/features/organizer-onboarding/store/wizard-store';
import { useOrganizerCopy, type OrganizerCopy } from '@/hooks/use-organizer-copy';
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
  Wrench,
  Archive,
  ExternalLink,
  MapPin,
  Building2,
  Users,
  Star,
  Edit
} from '@/components/ui/hugeicons';
import type { OrganizerWorkspace, WorkspaceStatus } from '../types';
import { getWorkspaceResumeRoute } from '../utils/workspace-routing';

interface WorkspaceCellActionProps {
  workspace: OrganizerWorkspace;
  onStatusChange?: (id: string, status: WorkspaceStatus) => void;
}

export function WorkspaceCellAction({ workspace, onStatusChange }: WorkspaceCellActionProps) {
  const c = useOrganizerCopy();
  const isDraft = workspace.status === 'DRAFT';
  const isActive = workspace.status === 'ACTIVE' || workspace.status === 'HOLIDAY';
  const isInactive = workspace.status === 'INACTIVE' || workspace.status === 'PENDING';
  const isMaintenance = workspace.status === 'MAINTENANCE';
  const resumeRoute = isDraft
    ? getWorkspaceResumeRoute(workspace)
    : '/dashboard/organizer/workspaces/create';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='h-8 w-8 p-0'
          aria-label={c('Open action menu', 'Mở menu thao tác')}
        >
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{c('Actions', 'Thao tác')}</DropdownMenuLabel>
          {isDraft ? (
            <DropdownMenuItem asChild>
              <Link
                to={resumeRoute}
                search={{ id: workspace.id }}
                onClick={() => useWizardStore.getState().resetDraft()}
                className='cursor-pointer flex items-center text-amber-600 font-medium'
              >
                <PlayCircle className='mr-2 h-4 w-4 text-amber-600' />
                <span>{c('Resume Setup', 'Tiếp tục thiết lập')}</span>
              </Link>
            </DropdownMenuItem>
          ) : (
            workspace.status !== 'ARCHIVED' && (
              <DropdownMenuItem asChild>
                <Link
                  to='/dashboard/organizer/workspaces/create'
                  search={{ id: workspace.id, mode: 'edit' }}
                  onClick={() => useWizardStore.getState().resetDraft()}
                  className='cursor-pointer flex items-center text-indigo-600 dark:text-indigo-400 font-medium'
                >
                  <Edit className='mr-2 h-4 w-4' />
                  <span>{c('Edit workspace profile', 'Chỉnh sửa hồ sơ')}</span>
                </Link>
              </DropdownMenuItem>
            )
          )}
          <DropdownMenuItem asChild>
            <Link
              to='/dashboard/organizer/workspaces/lifecycle'
              search={{ id: workspace.id }}
              className='cursor-pointer flex items-center'
            >
              <Eye className='mr-2 h-4 w-4 text-muted-foreground' />
              <span>{c('Manage Status & Details', 'Quản lý trạng thái và chi tiết')}</span>
            </Link>
          </DropdownMenuItem>

          {!isDraft && (
            <DropdownMenuItem asChild>
              <Link
                to='/workspaces/$workspaceId'
                params={{ workspaceId: workspace.id }}
                className='cursor-pointer flex items-center'
              >
                <ExternalLink className='mr-2 h-4 w-4 text-muted-foreground' />
                <span>{c('View Public Page', 'Xem trang công khai')}</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        {onStatusChange && workspace.status !== 'ARCHIVED' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className='text-[10px] uppercase tracking-wider text-muted-foreground'>
                {c('Status Transition', 'Chuyển trạng thái')}
              </DropdownMenuLabel>
              {!isActive && !isMaintenance && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(workspace.id, 'ACTIVE')}
                  className='cursor-pointer text-emerald-600 font-medium'
                >
                  <PlayCircle className='mr-2 h-4 w-4' />
                  <span>{c('Activate (Active)', 'Bật hoạt động')}</span>
                </DropdownMenuItem>
              )}
              {!isMaintenance && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(workspace.id, 'MAINTENANCE')}
                  className='cursor-pointer text-purple-600'
                >
                  <Wrench className='mr-2 h-4 w-4' />
                  <span>{c('Set Maintenance (Bảo trì)', 'Chuyển sang bảo trì')}</span>
                </DropdownMenuItem>
              )}
              {!isDraft && !isInactive && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(workspace.id, 'INACTIVE')}
                  className='cursor-pointer text-muted-foreground'
                >
                  <Edit className='mr-2 h-4 w-4' />
                  <span>{c('Deactivate', 'Ngưng hoạt động')}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getWorkspaceColumns(
  c: OrganizerCopy,
  onStatusChange?: (id: string, status: WorkspaceStatus) => void
): ColumnDef<OrganizerWorkspace>[] {
  const statusLabels: Record<WorkspaceStatus, string> = {
    HOLIDAY: 'Nghỉ lễ',
    ACTIVE: c('Active', 'Đang hoạt động'),
    INACTIVE: c('Inactive', 'Ngưng hoạt động'),
    PENDING: c('Pending', 'Đang xử lý'),
    MAINTENANCE: c('Maintenance', 'Đang bảo trì'),
    DRAFT: c('Draft', 'Bản nháp'),
    ARCHIVED: c('Archived', 'Đã lưu trữ')
  };
  return [
    {
      id: 'workspace',
      accessorKey: 'name',
      header: ({ column }: { column: Column<OrganizerWorkspace, unknown> }) => (
        <DataTableColumnHeader column={column} title={c('Workspace', 'Không gian')} />
      ),
      cell: ({ row }) => {
        const ws = row.original;
        const address = ws.address || [ws.district, ws.city].filter(Boolean).join(', ');
        return (
          <div className='flex min-w-0 items-center gap-3 py-2'>
            {ws.imageUrl ? (
              <img
                src={ws.imageUrl}
                alt={ws.name}
                loading='lazy'
                className='h-14 w-20 shrink-0 rounded-xl border object-cover'
              />
            ) : (
              <div className='flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border bg-muted/25 text-muted-foreground/60'>
                <Building2 className='size-6' />
              </div>
            )}
            <div className='min-w-0'>
              <Link
                to='/dashboard/organizer/workspaces/lifecycle'
                search={{ id: ws.id }}
                className='block truncate text-sm font-semibold hover:text-primary'
              >
                {ws.name}
              </Link>
              <p className='mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground'>
                <MapPin className='mt-0.5 size-3 shrink-0' />
                <span className='line-clamp-2'>
                  {address || c('Address not set', 'Chưa thiết lập địa chỉ')}
                </span>
              </p>
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
        <DataTableColumnHeader column={column} title={c('Status', 'Trạng thái')} />
      ),
      cell: ({ row }) => {
        return <WorkspaceStatusBadge status={row.original.status} />;
      },
      enableSorting: true
    },
    {
      id: 'capacity',
      header: c('Capacity & Units', 'Sức chứa và số chỗ'),
      cell: ({ row }) => {
        const ws = row.original;
        return (
          <div className='flex flex-col text-xs text-muted-foreground gap-0.5'>
            <span className='text-foreground font-medium flex items-center gap-1'>
              <Users className='size-3 text-muted-foreground' />
              {ws.desksCount != null ? (
                <>
                  {ws.desksCount} {c('desks', 'ghế')}
                </>
              ) : (
                '—'
              )}
            </span>
            <span>
              {ws.meetingRoomsCount != null ? (
                <>
                  {ws.meetingRoomsCount} {c('meeting rooms', 'phòng họp')}
                </>
              ) : null}
            </span>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: c('Actions', 'Thao tác'),
      cell: ({ row }) => (
        <WorkspaceCellAction workspace={row.original} onStatusChange={onStatusChange} />
      ),
      enableSorting: false
    }
  ];
}
