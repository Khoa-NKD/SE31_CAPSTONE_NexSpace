import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface BookingsPaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  selectedCount?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function BookingsPagination({
  currentPage,
  pageSize,
  totalItems,
  selectedCount = 0,
  onPageChange,
  onPageSizeChange
}: BookingsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers with a sliding window
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3.5 bg-card border border-border border-t-0 rounded-b-xl select-none">
      {/* Left: Counts and Selection state */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <p>
          Showing <span className="font-semibold text-foreground">{startItem}</span> to{' '}
          <span className="font-semibold text-foreground">{endItem}</span> of{' '}
          <span className="font-semibold text-foreground">{totalItems}</span> reservations
        </p>

        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 animate-in fade-in">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            <span>{selectedCount} selected</span>
          </div>
        )}
      </div>

      {/* Right: Page size selector and page navigation */}
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
        {/* Page size dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs bg-background">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="8">8</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Navigation pagination buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (typeof p === 'string') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 text-center text-xs text-muted-foreground"
                  >
                    …
                  </span>
                );
              }
              const isActive = p === currentPage;
              return (
                <Button
                  key={`page-${p}`}
                  variant={isActive ? 'default' : 'ghost'}
                  size="icon"
                  className={`h-8 w-8 text-xs font-medium ${
                    isActive ? 'shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {p}
                </Button>
              );
            })}
          </div>

          <span className="sm:hidden text-xs text-muted-foreground px-2">
            {currentPage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

