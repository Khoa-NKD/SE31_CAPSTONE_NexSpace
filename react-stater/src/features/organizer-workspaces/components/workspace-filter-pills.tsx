import React from 'react';
import type { WorkspaceFilter } from '../types';

interface WorkspaceFilterPillsProps {
  filter: WorkspaceFilter;
  onFilterChange: (filter: WorkspaceFilter) => void;
  counts: {
    all: number;
    active: number;
    pending: number;
    maintenance: number;
    draft: number;
  };
}

export function WorkspaceFilterPills({
  filter,
  onFilterChange,
  counts
}: WorkspaceFilterPillsProps) {
  return (
    <div
      role='tablist'
      aria-label='Filter workspaces by status'
      className='flex flex-wrap items-center gap-1.5 bg-card p-1 rounded-full border border-border shadow-2xs'
    >
      <button
        type='button'
        role='tab'
        aria-selected={filter === 'all'}
        onClick={() => onFilterChange('all')}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
          filter === 'all'
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
        }`}
      >
        All ({counts.all})
      </button>

      <button
        type='button'
        role='tab'
        aria-selected={filter === 'active'}
        onClick={() => onFilterChange('active')}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
          filter === 'active'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
        }`}
      >
        Active ({counts.active})
      </button>

      <button
        type='button'
        role='tab'
        aria-selected={filter === 'pending'}
        onClick={() => onFilterChange('pending')}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
          filter === 'pending'
            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
        }`}
      >
        Pending ({counts.pending})
      </button>

      <button
        type='button'
        role='tab'
        aria-selected={filter === 'maintenance'}
        onClick={() => onFilterChange('maintenance')}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
          filter === 'maintenance'
            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
        }`}
      >
        Maintenance ({counts.maintenance})
      </button>

      <button
        type='button'
        role='tab'
        aria-selected={filter === 'draft'}
        onClick={() => onFilterChange('draft')}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
          filter === 'draft'
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
        }`}
      >
        Draft ({counts.draft})
      </button>
    </div>
  );
}
