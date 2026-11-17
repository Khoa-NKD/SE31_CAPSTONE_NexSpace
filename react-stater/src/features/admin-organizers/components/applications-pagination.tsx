import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminOrganizerApplicationsPage } from '../api/applications';

export function ApplicationsPagination({
  data,
  loading,
  onPageChange,
  pageSize,
  onSizeChange
}: {
  data: AdminOrganizerApplicationsPage;
  loading: boolean;
  onPageChange: (page: number) => void;
  pageSize: number;
  onSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, data.totalPages);
  const current = data.pageNumber;
  const start = data.listObjects.length ? (current - 1) * data.pageSize + 1 : 0;
  const end = data.listObjects.length
    ? Math.min(start + data.listObjects.length - 1, data.totalRecords)
    : 0;
  const pages = (
    totalPages <= 7
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : [...new Set([1, current - 1, current, current + 1, totalPages])]
  ).filter((page) => page >= 1 && page <= totalPages);
  return (
    <div className='flex flex-col gap-4 border-t bg-muted/10 px-4 py-4 text-xs sm:px-5 xl:flex-row xl:items-center xl:justify-between'>
      <p className='text-muted-foreground' aria-live='polite'>
        Showing{' '}
        <span className='font-semibold text-foreground tabular-nums'>
          {start}–{end}
        </span>{' '}
        of{' '}
        <span className='font-semibold text-foreground tabular-nums'>
          {data.totalRecords.toLocaleString()}
        </span>{' '}
        applications
      </p>
      <div className='flex flex-wrap items-center justify-between gap-4 sm:justify-end'>
        <label
          htmlFor='application-page-size'
          className='flex items-center gap-2 text-muted-foreground'
        >
          Rows per page
          <select
            id='application-page-size'
            value={pageSize}
            disabled={loading}
            onChange={(event) => onSizeChange(Number(event.target.value))}
            className='h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label='Organizer applications pagination' className='flex items-center gap-1'>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='size-8 rounded-lg text-muted-foreground'
            aria-label='First page'
            title='First page'
            disabled={!data.hasPrevious || loading}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className='size-4' aria-hidden='true' />
          </Button>
          <Button
            type='button'
            size='icon'
            variant='outline'
            className='size-8 rounded-lg shadow-none'
            aria-label='Previous page'
            title='Previous page'
            disabled={!data.hasPrevious || loading}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft className='size-4' aria-hidden='true' />
          </Button>
          {pages.map((page, index) => (
            <span key={page} className='flex items-center gap-1'>
              {index > 0 && page - pages[index - 1] > 1 && (
                <span className='px-1 text-muted-foreground' aria-hidden='true'>
                  …
                </span>
              )}
              <Button
                type='button'
                size='icon'
                variant={page === current ? 'default' : 'ghost'}
                className={`size-8 rounded-lg text-xs font-semibold shadow-none tabular-nums ${page === current ? 'disabled:opacity-100' : ''}`}
                aria-label={`Page ${page}`}
                aria-current={page === current ? 'page' : undefined}
                disabled={loading || page === current}
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            </span>
          ))}
          <Button
            type='button'
            size='icon'
            variant='outline'
            className='size-8 rounded-lg shadow-none'
            aria-label='Next page'
            title='Next page'
            disabled={!data.hasNext || loading}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight className='size-4' aria-hidden='true' />
          </Button>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='size-8 rounded-lg text-muted-foreground'
            aria-label='Last page'
            title='Last page'
            disabled={!data.hasNext || loading}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight className='size-4' aria-hidden='true' />
          </Button>
        </nav>
      </div>
    </div>
  );
}
