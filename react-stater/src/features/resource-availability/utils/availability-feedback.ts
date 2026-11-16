import { toast } from 'sonner';
import type { DeskAvailabilityResponseDto, RoomAvailabilityResponseDto } from '../api/types';

/**
 * Tính số phút giữ chỗ còn lại dựa trên thời điểm hết hạn holdExpiresAt
 */
function getRemainingHoldMinutes(holdExpiresAt: string | null): number | null {
  if (!holdExpiresAt) return null;
  const diffMs = new Date(holdExpiresAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  return Math.max(1, Math.ceil(diffMs / (60 * 1000)));
}

/**
 * Hiển thị thông báo Toast giải thích lý do ghế không khả dụng và hướng dẫn thao tác tiếp theo.
 *
 * @param resource Thông tin khả dụng của chỗ ngồi
 * @param onContinuePayment Callback tùy chọn khi người dùng bấm 'Thanh toán ngay' (nếu là chỗ của chính họ)
 */
export function notifyResourceUnavailable(
  resource: DeskAvailabilityResponseDto,
  onContinuePayment?: () => void
): void {
  const remainingMinutes = getRemainingHoldMinutes(resource.holdExpiresAt);
  const resourceLabel = resource.name ? `${resource.label} (${resource.name})` : resource.label;

  // 1. Trường hợp chính tài khoản hiện tại đang giữ chỗ này
  if (resource.isOccupiedByMe) {
    if (resource.status === 'HOLDING') {
      const timeText = remainingMinutes ? `còn khoảng ${remainingMinutes} phút` : 'sắp hết hạn';
      toast.info(`Bạn đang giữ chỗ ${resourceLabel}`, {
        description: `Bạn đang có phiên giữ chỗ cho vị trí này (${timeText}). Hãy hoàn tất thanh toán trước khi hết hạn giữ chỗ!`,
        action: onContinuePayment
          ? {
              label: 'Thanh toán ngay',
              onClick: onContinuePayment
            }
          : undefined,
        duration: 5000
      });
      return;
    }

    if (resource.status === 'BOOKED') {
      toast.info(`Bạn đã đặt trước chỗ ${resourceLabel}`, {
        description: 'Chỗ ngồi này đã được bạn đặt thành công trong khung giờ này. Bạn có thể xem chi tiết trong mục Đặt chỗ của tôi.',
        duration: 5000
      });
      return;
    }
  }

  // 2. Trường hợp ghế đã có người khác đặt thành công
  if (resource.status === 'BOOKED') {
    toast.error(`Chỗ ngồi ${resourceLabel} đã có người đặt`, {
      description: 'Chỗ này đã được khách hàng khác đặt trước trong khung giờ bạn chọn. Vui lòng chọn ghế còn trống (màu xanh lá) hoặc đổi khung giờ tìm kiếm khác.',
      duration: 5000
    });
    return;
  }

  // 3. Trường hợp đang có người khác giữ chỗ tạm thời chờ thanh toán
  if (resource.status === 'HOLDING') {
    const timeText = remainingMinutes ? `còn khoảng ${remainingMinutes} phút` : 'vài phút';
    toast.warning(`Chỗ ngồi ${resourceLabel} đang được giữ tạm thời`, {
      description: `Một khách hàng khác đang tiến hành thanh toán cho chỗ này (${timeText}). Nếu khách không hoàn tất thanh toán, chỗ sẽ tự động mở lại. Bạn có thể chọn ghế khác hoặc quay lại sau ít phút.`,
      duration: 6000
    });
    return;
  }

  // 4. Trường hợp bị khóa bảo trì hoặc dành riêng cho sự kiện
  if (resource.status === 'BLOCKED') {
    toast.warning(`Chỗ ngồi ${resourceLabel} tạm khóa`, {
      description: 'Vị trí này tạm thời bị khóa do lịch bảo trì kỹ thuật hoặc ban quản lý dành riêng cho sự kiện trong khung giờ này. Vui lòng chọn vị trí khác xung quanh.',
      duration: 5000
    });
    return;
  }

  // 5. Trường hợp ngừng phục vụ hoặc bị vô hiệu hóa
  if (resource.status === 'DISABLED') {
    toast.warning(`Chỗ ngồi ${resourceLabel} ngừng phục vụ`, {
      description: 'Vị trí này hiện đang ngừng phục vụ hoặc chưa sẵn sàng đón khách. Vui lòng chọn các vị trí khác trên sơ đồ.',
      duration: 5000
    });
  }
}

/**
 * Hiển thị thông báo Toast giải thích lý do phòng không khả dụng và chi tiết xung đột ghế con (nếu có).
 */
export function notifyRoomUnavailable(
  room: RoomAvailabilityResponseDto,
  onContinuePayment?: () => void
): void {
  const remainingMinutes = getRemainingHoldMinutes(room.holdExpiresAt);
  const roomLabel = room.name ? `${room.label} (${room.name})` : room.label;

  // 1. Trường hợp phòng đang trong khoảng đệm dọn dẹp vệ sinh
  if (room.isCleaningInProgress && room.nextAvailableAt) {
    const availableDate = new Date(room.nextAvailableAt);
    const availableTimeStr = availableDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const diffMs = availableDate.getTime() - Date.now();
    const minutesLeft = Math.max(1, Math.ceil(diffMs / (60 * 1000)));

    toast.info(`Phòng ${roomLabel} đang dọn dẹp vệ sinh`, {
      description: `Phòng cần khoảng đệm ${room.cleaningBufferMinutes ?? 15} phút để dọn dẹp và khử khuẩn sau ca sử dụng trước. Dự kiến sẽ sẵn sàng vào lúc ${availableTimeStr} (sau khoảng ${minutesLeft} phút). Bạn có thể đổi khung giờ bắt đầu từ ${availableTimeStr} để đặt phòng này!`,
      duration: 6500
    });
    return;
  }

  // 2. Trường hợp chính tài khoản hiện tại đang giữ phòng này
  if (room.isOccupiedByMe) {
    if (room.status === 'HOLDING') {
      const timeText = remainingMinutes ? `còn khoảng ${remainingMinutes} phút` : 'sắp hết hạn';
      toast.info(`Bạn đang giữ phòng ${roomLabel}`, {
        description: `Bạn đang có phiên giữ chỗ cho phòng này (${timeText}). Hãy hoàn tất thanh toán trước khi hết hạn!`,
        action: onContinuePayment
          ? {
              label: 'Thanh toán ngay',
              onClick: onContinuePayment
            }
          : undefined,
        duration: 5000
      });
      return;
    }

    if (room.status === 'BOOKED') {
      toast.info(`Bạn đã đặt trước phòng ${roomLabel}`, {
        description: 'Phòng này đã được bạn đặt thành công trong khung giờ này. Bạn có thể xem chi tiết trong mục Đặt chỗ của tôi.',
        duration: 5000
      });
      return;
    }
  }

  // 2. Trường hợp phòng không thể đặt do có ghế con bên trong đang bị đặt/giữ
  if (room.hasConflictingDesks) {
    toast.error(`Phòng ${roomLabel} không khả dụng do xung đột chỗ ngồi`, {
      description: `Hiện có ${room.occupiedChildDeskCount} bàn/ghế làm việc bên trong phòng đang có khách đặt hoặc giữ chỗ. Để đảm bảo tính riêng tư, phòng không thể đặt nguyên căn trong khung giờ này. Vui lòng chọn phòng khác hoặc khung giờ khác.`,
      duration: 6000
    });
    return;
  }

  // 3. Trường hợp phòng đã có người đặt nguyên căn
  if (room.status === 'BOOKED') {
    toast.error(`Phòng ${roomLabel} đã có người đặt`, {
      description: 'Phòng này đã được khách hàng khác đặt trọn gói trong khung giờ bạn chọn. Vui lòng chọn phòng còn trống hoặc đổi khung giờ tìm kiếm khác.',
      duration: 5000
    });
    return;
  }

  // 4. Trường hợp phòng đang được giữ tạm thời chờ thanh toán
  if (room.status === 'HOLDING') {
    const timeText = remainingMinutes ? `còn khoảng ${remainingMinutes} phút` : 'vài phút';
    toast.warning(`Phòng ${roomLabel} đang được giữ tạm thời`, {
      description: `Một khách hàng khác đang tiến hành thanh toán cho phòng này (${timeText}). Bạn có thể chọn phòng khác hoặc quay lại sau ít phút.`,
      duration: 6000
    });
    return;
  }

  // 5. Trường hợp phòng tạm khóa bảo trì
  if (room.status === 'BLOCKED') {
    toast.warning(`Phòng ${roomLabel} tạm khóa`, {
      description: 'Phòng này tạm thời bị khóa do lịch bảo trì kỹ thuật hoặc ban quản lý dành riêng cho sự kiện trong khung giờ này.',
      duration: 5000
    });
    return;
  }

  // 6. Ngừng phục vụ
  if (room.status === 'DISABLED') {
    toast.warning(`Phòng ${roomLabel} ngừng phục vụ`, {
      description: 'Phòng này hiện đang ngừng phục vụ hoặc chưa sẵn sàng đón khách.',
      duration: 5000
    });
  }
}


