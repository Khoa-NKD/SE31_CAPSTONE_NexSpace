import React from 'react';
import { Users, AlertTriangle, ArrowRight, Building2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DeskAvailabilityBadge } from './desk-availability-badge';
import { notifyRoomUnavailable } from '../utils/availability-feedback';
import type { RoomAvailabilityResponseDto } from '../api/types';

interface RoomAvailabilityCardProps {
  room: RoomAvailabilityResponseDto;
  isSelected?: boolean;
  onSelect?: (room: RoomAvailabilityResponseDto) => void;
  className?: string;
}

export const RoomAvailabilityCard: React.FC<RoomAvailabilityCardProps> = ({
  room,
  isSelected = false,
  onSelect,
  className
}) => {
  const isAvailable = room.status === 'AVAILABLE' && !room.hasConflictingDesks;
  const isSelectable = isAvailable || room.isOccupiedByMe;

  const formattedPrice = room.pricePerHour != null
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.pricePerHour)
    : 'Chưa cấu hình giá';

  const handleClick = () => {
    if (isSelectable && onSelect) {
      onSelect(room);
    } else {
      notifyRoomUnavailable(room);
    }
  };

  return (
    <Card
      onClick={handleClick}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden transition-all duration-200 cursor-pointer border',
        isSelected
          ? 'border-primary ring-2 ring-primary/20 shadow-md bg-primary/5'
          : isAvailable
            ? 'hover:border-primary/50 hover:shadow-sm bg-card'
            : 'bg-muted/30 border-muted opacity-80 cursor-not-allowed hover:border-destructive/30',
        className
      )}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base text-foreground tracking-tight">
                {room.name || room.label}
              </span>
              {room.name && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {room.label}
                </span>
              )}
            </div>
            {room.zoneName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="size-3 text-muted-foreground/70" />
                {room.zoneName}
              </p>
            )}
          </div>
          <DeskAvailabilityBadge
            status={room.status}
            isOccupiedByMe={room.isOccupiedByMe}
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 pb-3 space-y-3">
        {/* Thông báo khoảng đệm dọn dẹp vệ sinh */}
        {room.isCleaningInProgress && room.nextAvailableAt && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs">
            <Sparkles className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>
              Đang dọn dẹp vệ sinh. Khả dụng từ <strong>{new Date(room.nextAvailableAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong> (sau {room.cleaningBufferMinutes ?? 15} phút nữa).
            </span>
          </div>
        )}

        {/* Cảnh báo xung đột hai chiều ROOM-DESK */}
        {room.hasConflictingDesks && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Có <strong>{room.occupiedChildDeskCount}</strong> ghế bên trong đang được sử dụng. Không thể đặt nguyên phòng.</span>
          </div>
        )}

        {/* Thông tin sức chứa và giá */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-4 text-primary/70" />
            <span>Tối đa {room.capacity} người</span>
          </div>
          <div className="font-semibold text-primary">
            {formattedPrice}<span className="text-xs font-normal text-muted-foreground">/giờ</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          size="sm"
          variant={isSelected ? 'default' : isAvailable ? 'outline' : 'ghost'}
          disabled={!isSelectable}
          className={cn(
            'w-full text-xs font-medium justify-center transition-colors',
            isSelected && 'bg-primary text-primary-foreground',
            !isSelectable && 'text-muted-foreground pointer-events-none'
          )}
        >
          {isSelected ? (
            'Đang chọn'
          ) : isAvailable ? (
            <>
              Chọn phòng này
              <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : room.isOccupiedByMe ? (
            'Phòng của bạn'
          ) : (
            'Không khả dụng'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RoomAvailabilityCard;

