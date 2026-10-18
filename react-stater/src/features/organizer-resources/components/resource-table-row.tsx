import React from 'react';
import {
  User,
  Users,
  Edit,
  Coins,
  MoreVertical,
  Wrench,
  Trash2
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ResourceItem } from '../types';

interface ResourceTableRowProps {
  resource: ResourceItem;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onToggleStatus: (id: string) => void;
  onQuickEdit: (resource: ResourceItem) => void;
  onOpenPricing: (resource: ResourceItem) => void;
  onDelete: (id: string) => void;
}

export function ResourceTableRow({
  resource,
  isSelected,
  onSelect,
  onToggleStatus,
  onQuickEdit,
  onOpenPricing,
  onDelete
}: ResourceTableRowProps) {
  const isBookable = resource.status === 'BOOKABLE';

  // Zone dot color mapping
  const zoneDotColor =
    resource.zone === 'ZONE_A'
      ? 'bg-blue-500'
      : resource.zone === 'ZONE_B'
        ? 'bg-amber-500'
        : 'bg-purple-500';

  // Type badge styling
  const typeBadgeClass =
    resource.type === 'HOT_DESK'
      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      : resource.type === 'DEDICATED_DESK'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
        : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20';

  const typeLabel =
    resource.type === 'HOT_DESK'
      ? 'Hot Desk'
      : resource.type === 'DEDICATED_DESK'
        ? 'Dedicated Desk'
        : 'Meeting Room';

  return (
    <tr
      className={`hover:bg-muted/40 transition-colors group border-b border-border text-xs sm:text-sm ${
        !isBookable ? 'bg-muted/20' : ''
      } ${isSelected ? 'bg-primary/5' : ''}`}
    >
      {/* 1. Checkbox */}
      <td className='px-4 sm:px-5 py-3.5 text-center'>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(!!checked)}
          aria-label={`Select ${resource.code}`}
        />
      </td>

      {/* 2. Resource Code */}
      <td className='px-4 py-3.5'>
        <div className='flex flex-col'>
          <span className='font-mono font-bold text-foreground text-[13px] tracking-tight'>
            {resource.code}
          </span>
          {resource.warningNote ? (
            <span className='text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium'>
              {resource.warningNote}
            </span>
          ) : resource.subLabel ? (
            <span className='text-[11px] text-muted-foreground font-mono'>
              {resource.subLabel}
            </span>
          ) : null}
        </div>
      </td>

      {/* 3. Type & Specs */}
      <td className='px-4 py-3.5'>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeBadgeClass}`}
        >
          {typeLabel}
        </span>
      </td>

      {/* 4. Zone & Location */}
      <td className='px-4 py-3.5' aria-label={resource.zoneLabel}>
        <div className='flex items-center gap-2'>
          <span className={`size-2 rounded-full ${zoneDotColor} shrink-0`} aria-hidden='true' />
          <span className='text-foreground font-medium truncate max-w-[180px]'>
            {resource.zoneLabel}
          </span>
        </div>
      </td>

      {/* 5. Capacity */}
      <td className='px-4 py-3.5'>
        <div className='flex items-center gap-1.5 text-muted-foreground'>
          {resource.capacity > 1 ? (
            <Users className='size-4 text-muted-foreground shrink-0' aria-hidden='true' />
          ) : (
            <User className='size-4 text-muted-foreground shrink-0' aria-hidden='true' />
          )}
          <span className='font-medium text-foreground'>{resource.capacityLabel}</span>
        </div>
      </td>

      {/* 6. Hourly / Daily Rate */}
      <td className='px-4 py-3.5' aria-label={`Rates: $${resource.hourlyRate} per hour, $${resource.dailyRate} per day`}>
        <div className='flex flex-col'>
          <div className='flex items-baseline gap-1'>
            <span className={`font-semibold ${isBookable ? 'text-foreground' : 'text-muted-foreground'}`}>
              ${resource.hourlyRate.toFixed(2)}
            </span>
            <span className='text-[11px] text-muted-foreground font-normal'>/ hr</span>
          </div>
          <span className='text-[11px] text-muted-foreground'>
            ${resource.dailyRate.toFixed(2)} / day
          </span>
        </div>
      </td>

      {/* 7. Amenities & Hardware */}
      <td className='px-4 py-3.5'>
        <div className='flex flex-wrap gap-1 max-w-[240px]'>
          {resource.amenities.map((item, idx) => (
            <span
              key={idx}
              className={`px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[11px] border border-border/80 ${
                item.isUnavailable ? 'line-through opacity-70 text-amber-600 dark:text-amber-400' : ''
              }`}
            >
              {item.name}
            </span>
          ))}
        </div>
      </td>

      {/* 8. Status (Interactive Bookable Switch) */}
      <td className='px-4 py-3.5'>
        <div className='flex items-center gap-2.5'>
          <button
            type='button'
            role='switch'
            aria-checked={isBookable}
            onClick={() => onToggleStatus(resource.id)}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 relative flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isBookable ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            aria-label={`Toggle status for ${resource.code}`}
          >
            <div
              className={`size-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                isBookable ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span
            className={`text-xs font-semibold ${
              isBookable
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            }`}
          >
            {isBookable ? 'Bookable' : 'Disabled'}
          </span>
        </div>
      </td>

      {/* 9. Actions Column */}
      <td className='px-4 sm:px-5 py-3.5 text-right'>
        <div className='flex items-center justify-end gap-1 text-muted-foreground'>
          {/* Quick Edit */}
          <button
            type='button'
            onClick={() => onQuickEdit(resource)}
            className='p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors'
            title='Quick Edit'
            aria-label={`Edit ${resource.code}`}
          >
            <Edit className='size-4' />
          </button>

          {/* Custom Price Matrix */}
          <button
            type='button'
            onClick={() => onOpenPricing(resource)}
            className='p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors'
            title='Custom Price Matrix'
            aria-label={`Set pricing matrix for ${resource.code}`}
          >
            <Coins className='size-4' />
          </button>

          {/* More Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type='button'
                className='p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors'
                aria-label={`More options for ${resource.code}`}
              >
                <MoreVertical className='size-4' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuItem onClick={() => onQuickEdit(resource)} className='text-xs gap-2 py-2 cursor-pointer'>
                <Edit className='size-3.5' />
                <span>Edit Resource</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenPricing(resource)} className='text-xs gap-2 py-2 cursor-pointer'>
                <Coins className='size-3.5' />
                <span>Adjust Pricing</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(resource.id)} className='text-xs gap-2 py-2 cursor-pointer'>
                <Wrench className='size-3.5' />
                <span>{isBookable ? 'Flag Maintenance' : 'Set to Bookable'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(resource.id)}
                className='text-xs gap-2 py-2 text-destructive focus:text-destructive cursor-pointer'
              >
                <Trash2 className='size-3.5' />
                <span>Delete Resource</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

