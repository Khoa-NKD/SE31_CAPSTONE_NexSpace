import React from 'react';
import { Building2, CheckCircle2, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceDirectoryItem } from '../data/mock-workspaces-directory';

interface WorkspaceDirectoryTableProps {
  items: WorkspaceDirectoryItem[];
  selectedWorkspaceId?: string;
  onSelectWorkspace: (item: WorkspaceDirectoryItem) => void;
}

function getStatusBadge(status: WorkspaceDirectoryItem['status']) {
  switch (status) {
    case 'pending':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'>
          <span className='w-1.5 h-1.5 rounded-full bg-amber-500' aria-hidden='true'></span>
          Pending Review
        </span>
      );
    case 'active':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'>
          <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' aria-hidden='true'></span>
          Active &amp; Bookable
        </span>
      );
    case 'suspended':
      return (
        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'>
          <span className='w-1.5 h-1.5 rounded-full bg-rose-500' aria-hidden='true'></span>
          Suspended
        </span>
      );
  }
}

export function WorkspaceDirectoryTable({
  items,
  selectedWorkspaceId,
  onSelectWorkspace
}: WorkspaceDirectoryTableProps) {
  if (items.length === 0) {
    return (
      <div className='p-12 text-center bg-card rounded-xl border border-border shadow-2xs'>
        <Building2 className='size-10 text-muted-foreground mx-auto mb-3 opacity-60' aria-hidden='true' />
        <h3 className='text-sm font-semibold text-foreground'>No workspaces found</h3>
        <p className='text-xs text-muted-foreground mt-1'>
          Try adjusting your search criteria or changing the selected status filter.
        </p>
      </div>
    );
  }

  return (
    <div className='bg-card rounded-xl border border-border shadow-2xs overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse text-xs' aria-label='Workspaces directory inventory table'>
          <thead>
            <tr className='border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              <th scope='col' className='px-4 py-3.5'>Hub ID</th>
              <th scope='col' className='px-4 py-3.5'>Workspace &amp; Facility</th>
              <th scope='col' className='px-4 py-3.5'>Organizer Legal Entity</th>
              <th scope='col' className='px-4 py-3.5'>Location</th>
              <th scope='col' className='px-4 py-3.5'>Capacity</th>
              <th scope='col' className='px-4 py-3.5'>Status</th>
              <th scope='col' className='px-4 py-3.5'>Submitted</th>
              <th scope='col' className='px-4 py-3.5 text-right'>Action</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {items.map((workspace) => {
              const isSelected = selectedWorkspaceId === workspace.id;

              return (
                <tr
                  key={workspace.id}
                  onClick={() => onSelectWorkspace(workspace)}
                  className={`group cursor-pointer transition-colors hover:bg-muted/50 ${
                    isSelected ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : ''
                  }`}
                >
                  {/* Hub ID */}
                  <td className='px-4 py-4 font-mono font-semibold text-primary'>
                    #{workspace.id}
                  </td>

                  {/* Workspace & Facility */}
                  <td className='px-4 py-4' aria-label={workspace.name}>
                    <div className='flex items-center gap-3'>
                      <div className='w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0'>
                        <Building2 className='size-5' aria-hidden='true' />
                      </div>
                      <div>
                        <div className='font-bold text-foreground text-xs sm:text-sm group-hover:text-primary transition-colors'>
                          {workspace.name}
                        </div>
                        <div className='text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2'>
                          <span>{workspace.facilitySubtitle}</span>
                          <span className='inline-flex items-center gap-0.5 font-semibold text-amber-700 dark:text-amber-400'>
                            <Star className='size-3 fill-amber-500 text-amber-500' aria-hidden='true' />
                            {workspace.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Organizer */}
                  <td className='px-4 py-4'>
                    <div className='flex items-center gap-1.5'>
                      <span className='font-medium text-foreground'>{workspace.organizerLegalName}</span>
                      {workspace.organizerVerified && (
                        <CheckCircle2 className='size-3.5 text-primary shrink-0' aria-hidden='true' />
                      )}
                    </div>
                    <div className='text-[10px] font-mono text-muted-foreground mt-0.5'>
                      Tax ID: {workspace.organizerTaxId}
                    </div>
                  </td>

                  {/* Location */}
                  <td className='px-4 py-4 text-foreground'>
                    <span>{workspace.metroZone}</span>
                  </td>

                  {/* Capacity */}
                  <td className='px-4 py-4 font-medium text-foreground'>
                    <span>{workspace.capacityLabel}</span>
                  </td>

                  {/* Status */}
                  <td className='px-4 py-4'>
                    {getStatusBadge(workspace.status)}
                  </td>

                  {/* Submitted */}
                  <td className='px-4 py-4 text-muted-foreground text-[11px]'>
                    <div>{workspace.submittedAt}</div>
                    <div className='text-[10px] text-muted-foreground/80 font-mono'>{workspace.submittedTime}</div>
                  </td>

                  {/* Action */}
                  <td className='px-4 py-4 text-right'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWorkspace(workspace);
                      }}
                      className='h-8 px-3 text-xs gap-1 hover:border-primary hover:text-primary'
                      aria-label={`Inspect ${workspace.name}`}
                    >
                      <span>Review Details</span>
                      <ChevronRight className='size-3.5' aria-hidden='true' />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className='p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground'>
        <div>
          Showing <strong className='text-foreground font-semibold'>{items.length}</strong> of{' '}
          <strong className='text-foreground font-semibold'>618</strong> workspaces
        </div>
        <div className='inline-flex items-center gap-1.5'>
          <button
            type='button'
            disabled
            className='px-2.5 py-1 rounded border border-border bg-card text-muted-foreground opacity-50 cursor-not-allowed'
          >
            Previous
          </button>
          <span className='px-2.5 py-1 rounded bg-primary text-white font-semibold'>1</span>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            2
          </button>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            3
          </button>
          <span className='px-1 text-muted-foreground'>...</span>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            62
          </button>
          <button
            type='button'
            className='px-2.5 py-1 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors'
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
