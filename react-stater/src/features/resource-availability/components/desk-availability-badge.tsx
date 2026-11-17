import React from 'react';
import { CheckCircle2, Clock, Ban, Lock, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ResourceOccupancyStatus } from '../api/types';

interface DeskAvailabilityBadgeProps {
  status: ResourceOccupancyStatus;
  isOccupiedByMe?: boolean;
  className?: string;
  showIcon?: boolean;
}

export const DeskAvailabilityBadge: React.FC<DeskAvailabilityBadgeProps> = ({
  status,
  isOccupiedByMe = false,
  className,
  showIcon = true
}) => {
  switch (status) {
    case 'AVAILABLE':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
            className
          )}
        >
          {showIcon && <CheckCircle2 className="mr-1 size-3.5 text-emerald-600 dark:text-emerald-400" />}
          Còn trống
        </Badge>
      );

    case 'HOLDING':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
            className
          )}
        >
          {showIcon && <Clock className="mr-1 size-3.5 text-amber-600 dark:text-amber-400" />}
          {isOccupiedByMe ? 'Bạn đang giữ chỗ' : 'Đang giữ chỗ'}
        </Badge>
      );

    case 'BOOKED':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400',
            className
          )}
        >
          {showIcon && <Ban className="mr-1 size-3.5 text-rose-600 dark:text-rose-400" />}
          {isOccupiedByMe ? 'Chỗ của bạn' : 'Đã có người đặt'}
        </Badge>
      );

    case 'BLOCKED':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
            className
          )}
        >
          {showIcon && <Lock className="mr-1 size-3.5 text-zinc-500" />}
          Tạm khóa bảo trì
        </Badge>
      );

    case 'DISABLED':
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500',
            className
          )}
        >
          {showIcon && <MinusCircle className="mr-1 size-3.5 text-zinc-400" />}
          Ngừng phục vụ
        </Badge>
      );
  }
};

export default DeskAvailabilityBadge;

