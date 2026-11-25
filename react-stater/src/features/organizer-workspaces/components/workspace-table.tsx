import { flexRender, type Table as TableInstance } from '@tanstack/react-table';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Building2, Clock } from '@/components/ui/hugeicons';
import { formatDateTime } from '@/lib/format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { WorkspaceFacts } from './workspace-facts';
import type { OrganizerWorkspace } from '../types';

export function WorkspaceTable({ table }: { table: TableInstance<OrganizerWorkspace> }) {
  const c = useOrganizerCopy();
  const nameColumn = table.getColumn('workspace');
  const statusColumn = table.getColumn('status');
  return (
    <div className='min-w-0 space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
        <p className='text-sm font-semibold'>{c('Workspace directory', 'Danh sách không gian')}</p>
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <span className='hidden sm:inline'>{c('Sort by', 'Sắp xếp')}</span>
          {nameColumn && <DataTableColumnHeader column={nameColumn} title={c('Name', 'Tên')} />}
          {statusColumn && (
            <DataTableColumnHeader column={statusColumn} title={c('Status', 'Trạng thái')} />
          )}
        </div>
      </div>
      <div className='space-y-2'>
        {table.getRowModel().rows.map((row) => {
          const workspace = row.original;
          const cells = row.getVisibleCells();
          const identity = cells.find((cell) => cell.column.id === 'workspace');
          const status = cells.find((cell) => cell.column.id === 'status');
          const actions = cells.find((cell) => cell.column.id === 'actions');
          return (
            <article
              key={row.id}
              className='group min-w-0 overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/35'
            >
              <div className='grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)_auto] md:px-4'>
                <div className='min-w-0'>
                  {identity && flexRender(identity.column.columnDef.cell, identity.getContext())}
                </div>
                <div className='col-span-2 min-w-0 border-t pt-2 md:order-2 md:col-span-1 md:border-0 md:pt-0'>
                  <WorkspaceFacts workspace={workspace} compact />
                  {workspace.lastStatusChange && (
                    <p className='mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground'>
                      <Clock className='size-2.5' />
                      {formatDateTime(workspace.lastStatusChange)}
                    </p>
                  )}
                </div>
                <div className='col-start-2 row-start-1 flex shrink-0 flex-col items-end gap-1.5 md:order-3 md:col-start-auto md:row-start-auto'>
                  {status && flexRender(status.column.columnDef.cell, status.getContext())}
                  {actions && flexRender(actions.column.columnDef.cell, actions.getContext())}
                </div>
              </div>
            </article>
          );
        })}
        {!table.getRowModel().rows.length && (
          <div className='rounded-2xl border bg-card px-5 py-14 text-center'>
            <Building2 className='mx-auto mb-3 size-7 text-muted-foreground/50' />
            <p className='text-sm text-muted-foreground'>
              {c('No workspaces match your filters.', 'Không có không gian phù hợp với bộ lọc.')}
            </p>
          </div>
        )}
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
