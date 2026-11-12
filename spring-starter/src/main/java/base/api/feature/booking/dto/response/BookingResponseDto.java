package base.api.feature.booking.dto.response;

import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PriceType;
import base.api.shared.enums.ResourceCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
@Schema(description = "Thông tin chi tiết đơn đặt chỗ trả về cho khách hàng")
public class BookingResponseDto {
    Long id;
    String bookingCode;
    BookingStatus status;
    BookingConfirmationMode confirmationMode;
    LocalDateTime holdExpiresAt;
    LocalDateTime createdAt;

    // Workspace info
    Long workspaceId;
    String workspaceName;
    String workspaceAddress;
    String workspaceCity;
    String workspaceDistrict;

    // Resource info
    Long resourceId;
    String resourceCode;
    String resourceName;
    ResourceCategory resourceCategory;
    String floorName;
    Integer floorNumber;
    String zoneName;

    // Time schedule
    LocalDateTime startTime;
    LocalDateTime endTime;
    BigDecimal durationHours;
    int partySize;

    // Pricing breakdown
    PriceType priceType;
    BigDecimal unitPrice;
    BigDecimal baseAmount;
    BigDecimal surchargeAmount;
    BigDecimal addonAmount;
    BigDecimal discountAmount;
    BigDecimal taxAmount;
    BigDecimal serviceFeeAmount;
    BigDecimal finalPrice;

    // Booker snapshot
    Long customerId;
    String customerName;
    String customerEmail;
    String customerPhone;

    // Security & Check-in
    String qrTokenHash;
    String cancellationPolicySnapshot;
    String pricingSnapshot;

    // Cancellation & Rejection Info
    String cancelReason;
    String cancelSource;
    LocalDateTime cancelledAt;
    BigDecimal refundPercent;
    BigDecimal refundAmount;
}
