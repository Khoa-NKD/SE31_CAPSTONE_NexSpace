import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { AssetStatus, MaintenanceStatus, MaintenanceType } from '@/features/workspaces/api/types';
import { CheckCircle2, AlertTriangle, Wrench, XCircle, Clock } from 'lucide-react';

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  switch (status) {
    case 'IN_USE':
      return (
        <Badge variant='outline' className='bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 font-medium'>
          <CheckCircle2 className='w-3 h-3 text-emerald-600 dark:text-emerald-400' />
          <span>Đang sử dụng</span>
        </Badge>
      );
    case 'UNDER_MAINTENANCE':
      return (
        <Badge variant='outline' className='bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 font-medium'>
          <Wrench className='w-3 h-3 text-amber-600 dark:text-amber-400' />
          <span>Đang bảo trì</span>
        </Badge>
      );
    case 'BROKEN':
      return (
        <Badge variant='outline' className='bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-1 font-medium'>
          <AlertTriangle className='w-3 h-3 text-rose-600 dark:text-rose-400' />
          <span>Báo hỏng</span>
        </Badge>
      );
    case 'RETIRED':
      return (
        <Badge variant='outline' className='bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 flex items-center gap-1 font-medium'>
          <XCircle className='w-3 h-3 text-zinc-500' />
          <span>Ngừng sử dụng</span>
        </Badge>
      );
    default:
      return <Badge variant='secondary'>{status}</Badge>;
  }
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  switch (status) {
    case 'SCHEDULED':
      return (
        <Badge variant='outline' className='bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 flex items-center gap-1 font-medium'>
          <Clock className='w-3 h-3 text-sky-600 dark:text-sky-400' />
          <span>Đã lên lịch</span>
        </Badge>
      );
    case 'IN_PROGRESS':
      return (
        <Badge variant='outline' className='bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 font-medium'>
          <Wrench className='w-3 h-3 text-amber-600 dark:text-amber-400' />
          <span>Đang sửa chữa</span>
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant='outline' className='bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 font-medium'>
          <CheckCircle2 className='w-3 h-3 text-emerald-600 dark:text-emerald-400' />
          <span>Hoàn thành</span>
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant='outline' className='bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 flex items-center gap-1 font-medium'>
          <XCircle className='w-3 h-3 text-zinc-500' />
          <span>Đã hủy</span>
        </Badge>
      );
    default:
      return <Badge variant='secondary'>{status}</Badge>;
  }
}

export function MaintenanceTypeBadge({ type }: { type: MaintenanceType }) {
  const map: Record<MaintenanceType, { label: string; color: string }> = {
    INSPECTION: { label: 'Kiểm tra', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' },
    REPAIR: { label: 'Sửa chữa', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300' },
    REPLACEMENT: { label: 'Thay mới', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' },
    CLEANING: { label: 'Vệ sinh', color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300' }
  };
  const config = map[type] || { label: type, color: '' };
  return (
    <Badge variant='outline' className={`${config.color} font-medium text-xs`}>
      {config.label}
    </Badge>
  );
}

