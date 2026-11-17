import React from 'react';
import { ArrowUpDown, Inbox, RefreshCw, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ResourceItem } from '../types';
import { ResourceTableRow } from './resource-table-row';

interface ResourceTableProps {
  resources: ResourceItem[];
  selectedIds: string[];
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectRow: (id: string, checked: boolean) => void;
  onToggleStatus: (id: string) => void;
  onQuickEdit: (resource: ResourceItem) => void;
  onOpenPricing: (resource: ResourceItem) => void;
  onDelete: (id: string) => void;
  onResetFilters: () => void;
  onOpenAddResource: () => void;
  sortDirection: 'asc' | 'desc';
  onToggleSort: () => void;
}

export function ResourceTable({
  resources,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onToggleStatus,
  onQuickEdit,
  onOpenPricing,
  onDelete,
  onResetFilters,
  onOpenAddResource,
  sortDirection,
  onToggleSort
}: ResourceTableProps) {
  const isAllSelected =
    resources.length > 0 && resources.every((r) => selectedIds.includes(r.id));
  const isSomeSelected =
    resources.some((r) => selectedIds.includes(r.id)) && !isAllSelected;

  return (
    <section
      aria-label='Resource Table Grid'
      className='bg-card rounded-xl border border-border shadow-2xs overflow-hidden flex flex-col'
    >
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse min-w-[1100px]'>
          {/* Table Header */}
          <thead>
            <tr className='bg-muted/50 border-b border-border text-muted-foreground font-semibold text-[11px] sm:text-xs uppercase tracking-wider h-11 select-none'>
              <th className='w-12 px-4 sm:px-5 py-3 text-center' scope='col' aria-label='Select all items'>
                <span className='sr-only'>Select all resources</span>
                <Checkbox
                  checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onToggleSelectAll(!!checked)}
                  aria-label='Select all resources on this page'
                />
              </th>
              <th className='px-4 py-3' scope='col'>
                <button
                  type='button'
                  onClick={onToggleSort}
                  className='flex items-center gap-1.5 hover:text-foreground transition-colors font-semibold'
                  aria-label={`Sort by Resource Code, currently ${sortDirection}`}
                >
                  <span>Resource Code</span>
                  <ArrowUpDown className='size-3.5' aria-hidden='true' />
                </button>
              </th>
              <th className='px-4 py-3' scope='col'>Type &amp; Specs</th>
              <th className='px-4 py-3' scope='col'>Zone &amp; Location</th>
              <th className='px-4 py-3' scope='col'>Capacity</th>
              <th className='px-4 py-3' scope='col'>Hourly / Daily Rate</th>
              <th className='px-4 py-3' scope='col'>Amenities &amp; Hardware</th>
              <th className='px-4 py-3' scope='col'>Status (Bookable)</th>
              <th className='w-28 px-4 sm:px-5 py-3 text-right' scope='col'>Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className='divide-y divide-border'>
            {resources.length > 0 ? (
              resources.map((resource) => (
                <ResourceTableRow
                  key={resource.id}
                  resource={resource}
                  isSelected={selectedIds.includes(resource.id)}
                  onSelect={(checked) => onToggleSelectRow(resource.id, checked)}
                  onToggleStatus={onToggleStatus}
                  onQuickEdit={onQuickEdit}
                  onOpenPricing={onOpenPricing}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <tr>
                <td colSpan={9} className='py-16 text-center' aria-label='No resources found'>
                  <div className='flex flex-col items-center justify-center gap-3 max-w-sm mx-auto'>
                    <div className='size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground'>
                      <Inbox className='size-6' />
                    </div>
                    <div className='flex flex-col gap-1'>
                      <h3 className='text-base font-semibold text-foreground'>
                        No resources found
                      </h3>
                      <p className='text-xs text-muted-foreground'>
                        No inventory matching your selected filters or search keyword.
                      </p>
                    </div>
                    <div className='flex items-center gap-2 mt-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={onResetFilters}
                        className='gap-1.5 text-xs'
                      >
                        <RefreshCw className='size-3.5' />
                        <span>Reset Filters</span>
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        onClick={onOpenAddResource}
                        className='gap-1.5 text-xs'
                      >
                        <Plus className='size-3.5' />
                        <span>Add Resource</span>
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

