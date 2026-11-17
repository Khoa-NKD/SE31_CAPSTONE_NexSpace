package base.api.feature.resource.service;

import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.ResourceOccupancyStatus;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Hàm thuần túy (pure function) phân giải trạng thái hiển thị và cờ sở hữu của tài nguyên đặt chỗ
 * theo ngữ cảnh thời gian (Contextual Time-based State Resolver).
 */
public final class ResourceStateResolver {

    private static final Set<BookingStatus> OCCUPIED_BOOKING_STATUSES = Set.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.PENDING_APPROVAL
    );

    private ResourceStateResolver() {
        // Utility class
    }

    public record ResourceResolutionResult(
            ResourceOccupancyStatus status,
            LocalDateTime holdExpiresAt,
            boolean isOccupiedByMe
    ) {
        public static ResourceResolutionResult available() {
            return new ResourceResolutionResult(ResourceOccupancyStatus.AVAILABLE, null, false);
        }

        public static ResourceResolutionResult disabled() {
            return new ResourceResolutionResult(ResourceOccupancyStatus.DISABLED, null, false);
        }

        public static ResourceResolutionResult blocked() {
            return new ResourceResolutionResult(ResourceOccupancyStatus.BLOCKED, null, false);
        }

        public static ResourceResolutionResult booked(boolean isOccupiedByMe) {
            return new ResourceResolutionResult(ResourceOccupancyStatus.BOOKED, null, isOccupiedByMe);
        }

        public static ResourceResolutionResult holding(LocalDateTime holdExpiresAt, boolean isOccupiedByMe) {
            return new ResourceResolutionResult(ResourceOccupancyStatus.HOLDING, holdExpiresAt, isOccupiedByMe);
        }
    }

    /**
     * Phân giải trạng thái khả dụng của tài nguyên.
     *
     * @param resource Tài nguyên cần kiểm tra
     * @param overlappingBookings Danh sách các booking trùng khoảng thời gian yêu cầu
     * @param overlappingBlockedSlots Danh sách các khung giờ bị chặn trùng khoảng thời gian yêu cầu
     * @param now Thời điểm hiện tại của hệ thống
     * @param currentUserId ID người dùng đang đăng nhập (hoặc null nếu chưa đăng nhập)
     * @return Kết quả phân giải trạng thái
     */
    public static ResourceResolutionResult resolve(
            BookableResourceModel resource,
            List<BookingModel> overlappingBookings,
            List<ResourceBlockedSlotModel> overlappingBlockedSlots,
            LocalDateTime now,
            Long currentUserId
    ) {
        if (resource == null || resource.getStatus() != BookableResourceStatus.ACTIVE) {
            return ResourceResolutionResult.disabled();
        }

        List<ResourceBlockedSlotModel> safeBlockedSlots = overlappingBlockedSlots == null ? Collections.emptyList() : overlappingBlockedSlots;
        if (!safeBlockedSlots.isEmpty()) {
            return ResourceResolutionResult.blocked();
        }

        List<BookingModel> safeBookings = overlappingBookings == null ? Collections.emptyList() : overlappingBookings;
        LocalDateTime safeNow = now != null ? now : LocalDateTime.now();

        // 1. Kiểm tra các booking đã được xác nhận hoặc chờ duyệt (BOOKED)
        for (BookingModel booking : safeBookings) {
            if (OCCUPIED_BOOKING_STATUSES.contains(booking.getStatus())) {
                boolean isMine = isBookingOwnedByUser(booking, currentUserId);
                return ResourceResolutionResult.booked(isMine);
            }
        }

        // 2. Kiểm tra các booking đang giữ chỗ chờ thanh toán còn hạn (HOLDING)
        // Nếu có nhiều hold active (hiếm gặp), ưu tiên lấy hold có hạn hết muộn nhất
        BookingModel activeHold = safeBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.PENDING_PAYMENT)
                .filter(b -> b.getHoldExpiresAt() != null && b.getHoldExpiresAt().isAfter(safeNow))
                .max(Comparator.comparing(BookingModel::getHoldExpiresAt))
                .orElse(null);

        if (activeHold != null) {
            boolean isMine = isBookingOwnedByUser(activeHold, currentUserId);
            return ResourceResolutionResult.holding(activeHold.getHoldExpiresAt(), isMine);
        }

        // 3. Mặc định là còn trống (AVAILABLE)
        return ResourceResolutionResult.available();
    }

    private static boolean isBookingOwnedByUser(BookingModel booking, Long currentUserId) {
        if (currentUserId == null || booking == null || booking.getCustomer() == null) {
            return false;
        }
        return Objects.equals(booking.getCustomer().getId(), currentUserId);
    }
}

