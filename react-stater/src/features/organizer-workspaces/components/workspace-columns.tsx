import { WorkspaceStatusBadge } from './workspace-status-badge';
import { WorkspaceFacts } from './workspace-facts';
import { useWizardStore } from '@/features/organizer-onboarding/store/wizard-store';
import { useOrganizerCopy, type OrganizerCopy } from '@/hooks/use-organizer-copy';
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
  Wrench,
  ExternalLink,
  MapPin,
  Building2,
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
            <DropdownMenuItem asChild onSelect={() => useWizardStore.getState().resetDraft()}>
              <Link
                to={resumeRoute}
                search={{ id: workspace.id }}
                className='cursor-pointer flex items-center text-amber-600 font-medium'
              >
                <PlayCircle className='mr-2 h-4 w-4 text-amber-600' />
                <span>{c('Resume Setup', 'Tiếp tục thiết lập')}</span>
              </Link>
            </DropdownMenuItem>
          ) : (
            workspace.status !== 'ARCHIVED' && (
              <DropdownMenuItem asChild onSelect={() => useWizardStore.getState().resetDraft()}>
                <Link
                  to='/dashboard/organizer/workspaces/create'
                  search={{ id: workspace.id, mode: 'edit' }}
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
  return [
    {
      id: 'workspace',
      size: 460,
      accessorKey: 'name',
      header: ({ column }: { column: Column<OrganizerWorkspace, unknown> }) => (
        <DataTableColumnHeader column={column} title={c('Workspace', 'Không gian')} />
      ),
      cell: ({ row }) => {
        const ws = row.original;
        const address = ws.address || [ws.district, ws.city].filter(Boolean).join(', ');
        return (
          <div className='flex min-w-0 items-center gap-2.5'>
            {ws.imageUrl ? (
              <img
                src={ws.imageUrl}
                alt={ws.name}
                loading='lazy'
                className='h-12 w-16 shrink-0 rounded-lg border object-cover'
              />
            ) : (
              <div className='flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/5 text-primary/45'>
                <Building2 className='size-5' />
              </div>
            )}
            <div className='min-w-0'>
              <Link
                to='/dashboard/organizer/workspaces/lifecycle'
                search={{ id: ws.id }}
                title={ws.name}
                className='block truncate text-sm font-semibold leading-tight tracking-tight transition-colors hover:text-primary'
              >
                {ws.name}
              </Link>
              {ws.description && (
                <p
                  className='mt-0.5 line-clamp-1 text-[11px] leading-tight text-muted-foreground'
                  title={ws.description}
                >
                  {ws.description}
                </p>
              )}
              <p className='mt-1 flex items-start gap-1 text-[11px] leading-tight text-muted-foreground'>
                <MapPin className='mt-0.5 size-3 shrink-0' />
                <span className='line-clamp-1' title={address}>
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
      id: 'details',
      size: 290,
      header: c('Basic information', 'Thông tin cơ bản'),
      cell: ({ row }) => <WorkspaceFacts workspace={row.original} />,
      enableSorting: false
    },
    {
      id: 'status',
      size: 180,
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
      id: 'actions',
      size: 105,
      header: c('Actions', 'Thao tác'),
      cell: ({ row }) => (
        <div className='flex items-center justify-end gap-1'>
          <Button
            asChild
            variant='outline'
            size='icon'
            className='size-8 rounded-lg'
            title={c('View details', 'Xem chi tiết')}
          >
            <Link
              to='/dashboard/organizer/workspaces/lifecycle'
              search={{ id: row.original.id }}
              aria-label={c('View workspace details', 'Xem chi tiết không gian')}
            >
              <Eye className='size-4' />
            </Link>
          </Button>
          <WorkspaceCellAction workspace={row.original} onStatusChange={onStatusChange} />
        </div>
      ),
      enableSorting: false
    }
  ];
}
