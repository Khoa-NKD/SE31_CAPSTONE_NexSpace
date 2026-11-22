import { Spinner as Loader2 } from '@/components/ui/spinner';
import React, { useState } from 'react';
import { Users, Clock, AlertCircle, Sparkles } from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useRoomAvailability } from '../api/queries';
import { useRealtimeResourceStatus } from '../hooks/use-realtime-resource-status';
import { RoomAvailabilityCard } from './room-availability-card';
import type { RoomAvailabilityResponseDto } from '../api/types';

interface RoomTimeSlotPickerProps {
  workspaceId: number;
  floorPlanId?: number;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  selectedRoomId?: number | null;
  onRoomSelect?: (room: RoomAvailabilityResponseDto) => void;
  className?: string;
}

const CAPACITY_PRESETS = [
  { label: 'Tất cả sức chứa', value: undefined },
  { label: '2-4 người', value: 2 },
  { label: '6-8 người', value: 6 },
  { label: '10+ người', value: 10 }
];

export const RoomTimeSlotPicker: React.FC<RoomTimeSlotPickerProps> = ({
  workspaceId,
  floorPlanId,
  startTime,
  endTime,
  selectedRoomId,
  onRoomSelect,
  className
}) => {
  const [minCapacity, setMinCapacity] = useState<number | undefined>(undefined);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Lắng nghe luồng SSE cập nhật thời gian thực và tự động xử lý khi phòng đang chọn bị chiếm
  useRealtimeResourceStatus(workspaceId, {
    enabled: Boolean(workspaceId),
    onResourceChange: (payload) => {
      const isTargetRoomAffected =
        selectedRoomId &&
        (selectedRoomId === payload.resourceId || selectedRoomId === payload.parentRoomId);

      const isOccupiedByMe = payload.customerId && currentUserId && payload.customerId === currentUserId;

      const isOccupiedStatus =
        payload.newStatus === 'HOLDING' ||
        payload.newStatus === 'BOOKED' ||
        payload.newStatus === 'BLOCKED' ||
        payload.newStatus === 'DISABLED';

      if (isTargetRoomAffected && isOccupiedStatus && !isOccupiedByMe) {
        toast.warning(
          payload.parentRoomId === selectedRoomId
            ? 'Một ghế con trong phòng họp bạn đang chọn vừa được người khác giữ chỗ. Phòng hiện không còn khả dụng nguyên căn.'
            : 'Phòng họp bạn vừa chọn đã được người khác giữ chỗ hoặc đặt chỗ.'
        );
      }
    }
  });

  const { data: rooms, isLoading, isError, error, refetch } = useRoomAvailability({
    workspaceId,
    floorPlanId,
    startTime,
    endTime,
    minCapacity
  });

  const availableRoomsCount = rooms?.filter(r => r.status === 'AVAILABLE' && !r.hasConflictingDesks).length ?? 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Bộ lọc sức chứa và tóm tắt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Lọc theo sức chứa:</span>
          <div className="flex flex-wrap gap-1.5">
            {CAPACITY_PRESETS.map(preset => (
              <Button
                key={preset.label}
                size="sm"
                variant={minCapacity === preset.value ? 'default' : 'outline'}
                onClick={() => setMinCapacity(preset.value)}
                className="h-7 text-xs px-2.5 rounded-full"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Thống kê số phòng trống */}
        {rooms && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-end sm:self-auto">
            <Sparkles className="size-3.5 text-emerald-500" />
            <span>Còn <strong>{availableRoomsCount}</strong> / {rooms.length} phòng sẵn sàng</span>
          </div>
        )}
      </div>

      {/* Trạng thái tải dữ liệu */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-lg border border-dashed text-muted-foreground">
          <Loader2 className="size-6 text-primary" />
          <p className="text-sm">Đang kiểm tra tình trạng phòng và xung đột ghế con...</p>
        </div>
      )}

      {/* Trạng thái lỗi */}
      {isError && (
        <div className="flex flex-col items-center justify-center p-8 space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
          <AlertCircle className="size-6" />
          <p className="text-sm font-medium">Không thể tải danh sách phòng khả dụng</p>
          <p className="text-xs text-muted-foreground max-w-md text-center">
            {error instanceof Error ? error.message : 'Đã có lỗi xảy ra trong quá trình tra cứu. Vui lòng thử lại.'}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Danh sách phòng trống dạng lưới (Grid View) */}
      {!isLoading && !isError && rooms && rooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <RoomAvailabilityCard
              key={room.roomId}
              room={room}
              isSelected={selectedRoomId === room.roomId}
              onSelect={onRoomSelect}
            />
          ))}
        </div>
      )}

      {/* Trạng thái không có phòng phù hợp */}
      {!isLoading && !isError && rooms && rooms.length === 0 && (
        <div className="flex flex-col items-center justify-center p-10 space-y-2 rounded-lg border border-dashed text-center">
          <Clock className="size-8 text-muted-foreground/50 mb-1" />
          <p className="text-sm font-medium text-foreground">Không tìm thấy phòng phù hợp</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {minCapacity
              ? `Không có phòng nào đáp ứng sức chứa từ ${minCapacity} người trở lên trong khung giờ này.`
              : 'Hiện không có phòng họp nào trong không gian làm việc này.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomTimeSlotPicker;

