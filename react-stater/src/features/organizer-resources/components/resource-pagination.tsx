import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface ResourcePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ResourcePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: ResourcePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers with ellipses
  const renderPageButtons = () => {
    const buttons = [];
    const maxButtons = 5;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }

    if (start > 1) {
      buttons.push(
        <button
          key={1}
          type='button'
          onClick={() => onPageChange(1)}
          className='size-8 rounded-md border border-border text-foreground hover:bg-muted text-xs font-medium transition-colors'
        >
          1
        </button>
      );
      if (start > 2) {
        buttons.push(
          <span key='dots-start' className='px-1 text-muted-foreground text-xs'>
            ...
          </span>
        );
      }
    }

    for (let i = start; i <= end; i++) {
      const isCurrent = i === currentPage;
      buttons.push(
        <button
          key={i}
          type='button'
          onClick={() => onPageChange(i)}
          className={`size-8 rounded-md text-xs font-semibold transition-all shadow-2xs ${
            isCurrent
              ? 'bg-primary text-primary-foreground font-bold shadow-xs'
              : 'border border-border text-foreground hover:bg-muted'
          }`}
          aria-current={isCurrent ? 'page' : undefined}
        >
          {i}
        </button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        buttons.push(
          <span key='dots-end' className='px-1 text-muted-foreground text-xs'>
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={totalPages}
          type='button'
          onClick={() => onPageChange(totalPages)}
          className='size-8 rounded-md border border-border text-foreground hover:bg-muted text-xs font-medium transition-colors'
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className='flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border bg-card gap-4 text-xs'>
      {/* Rows information & page select */}
      <div className='flex flex-wrap items-center gap-4 text-muted-foreground'>
        <span>
          Showing <strong className='text-foreground font-semibold'>{startItem}</strong> to{' '}
          <strong className='text-foreground font-semibold'>{endItem}</strong> of{' '}
          <strong className='text-foreground font-semibold'>{totalItems}</strong> resources
        </span>

        <div className='flex items-center gap-2 border-l border-border pl-4'>
          <span className='text-xs'>Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className='h-8 w-24 text-xs bg-muted/50 border-border'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='8' className='text-xs'>8 per page</SelectItem>
              <SelectItem value='16' className='text-xs'>16 per page</SelectItem>
              <SelectItem value='32' className='text-xs'>32 per page</SelectItem>
              <SelectItem value='48' className='text-xs'>All units</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page Navigation Buttons */}
      <div className='flex items-center gap-1.5'>
        <button
          type='button'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className='size-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none'
          aria-label='Previous page'
        >
          <ChevronLeft className='size-4' />
        </button>

        {renderPageButtons()}

        <button
          type='button'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className='size-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none'
          aria-label='Next page'
        >
          <ChevronRight className='size-4' />
        </button>
      </div>
    </div>
  );
}

