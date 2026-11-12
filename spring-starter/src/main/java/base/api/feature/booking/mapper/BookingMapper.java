package base.api.feature.booking.mapper;

import base.api.feature.booking.dto.response.BookingResponseDto;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceModel;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;

public final class BookingMapper {

    private BookingMapper() {}

    public static BookingResponseDto toDto(BookingModel model) {
        if (model == null) {
            return null;
        }

        WorkspaceModel ws = model.getWorkspace();
        BookableResourceModel res = model.getResource();

        long minutes = Duration.between(model.getStartTime(), model.getEndTime()).toMinutes();
        BigDecimal durationHours = BigDecimal.valueOf(minutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

        BigDecimal unitPrice = BigDecimal.ZERO;
        if (res != null) {
            if (res.getPricePerHour() != null) {
                unitPrice = res.getPricePerHour();
            } else if (res.getResourceType() != null && res.getResourceType().getPricePerHour() != null) {
                unitPrice = res.getResourceType().getPricePerHour();
            }
        }

        return BookingResponseDto.builder()
                .id(model.getId())
                .bookingCode(model.getBookingCode())
                .status(model.getStatus())
                .confirmationMode(ws != null ? ws.getBookingConfirmationMode() : null)
                .holdExpiresAt(model.getHoldExpiresAt())
                .createdAt(model.getCreatedAt())
                // Workspace
                .workspaceId(ws != null ? ws.getId() : null)
                .workspaceName(ws != null ? ws.getName() : null)
                .workspaceAddress(ws != null ? ws.getAddress() : null)
                .workspaceCity(ws != null ? ws.getCity() : null)
                .workspaceDistrict(ws != null ? ws.getDistrict() : null)
                // Resource
                .resourceId(res != null ? res.getId() : null)
                .resourceCode(res != null ? res.getLabel() : null)
                .resourceName(res != null ? (res.getName() != null ? res.getName() : res.getLabel()) : null)
                .resourceCategory(res != null && res.getResourceType() != null ? res.getResourceType().getCategory() : null)
                .floorName(res != null && res.getFloorPlan() != null ? res.getFloorPlan().getName() : null)
                .floorNumber(res != null && res.getFloorPlan() != null ? res.getFloorPlan().getFloorNumber() : null)
                .zoneName(res != null ? res.getZoneName() : null)
                // Schedule
                .startTime(model.getStartTime())
                .endTime(model.getEndTime())
                .durationHours(durationHours)
                .partySize(model.getPartySize())
                // Pricing
                .priceType(model.getPriceType())
                .unitPrice(unitPrice)
                .baseAmount(model.getBaseAmount())
                .surchargeAmount(model.getSurchargeAmount())
                .addonAmount(model.getAddonAmount())
                .discountAmount(model.getDiscountAmount())
                .taxAmount(model.getTaxAmount())
                .serviceFeeAmount(model.getServiceFeeAmount())
                .finalPrice(model.getFinalPrice())
                // Customer
                .customerId(model.getCustomer() != null ? model.getCustomer().getId() : null)
                .customerName(model.getCustomer() != null ? model.getCustomer().getFirstName() + " " + model.getCustomer().getLastName() : null)
                .customerEmail(model.getCustomer() != null ? model.getCustomer().getEmail() : null)
                .customerPhone(model.getCustomer() != null ? model.getCustomer().getPhone() : null)
                // Snapshots & Security
                .qrTokenHash(model.getQrTokenHash())
                .cancellationPolicySnapshot(model.getCancellationPolicySnapshot())
                .pricingSnapshot(model.getPricingSnapshot())
                .cancelReason(model.getCancelReason())
                .cancelSource(model.getCancelSource() != null ? model.getCancelSource().name() : null)
                .cancelledAt(model.getCancelledAt())
                .build();
    }

    public static BookingResponseDto toDto(BookingModel model, BigDecimal refundPercent, BigDecimal refundAmount) {
        if (model == null) {
            return null;
        }
        BookingResponseDto base = toDto(model);
        return BookingResponseDto.builder()
                .id(base.getId())
                .bookingCode(base.getBookingCode())
                .status(base.getStatus())
                .confirmationMode(base.getConfirmationMode())
                .holdExpiresAt(base.getHoldExpiresAt())
                .createdAt(base.getCreatedAt())
                .workspaceId(base.getWorkspaceId())
                .workspaceName(base.getWorkspaceName())
                .workspaceAddress(base.getWorkspaceAddress())
                .workspaceCity(base.getWorkspaceCity())
                .workspaceDistrict(base.getWorkspaceDistrict())
                .resourceId(base.getResourceId())
                .resourceCode(base.getResourceCode())
                .resourceName(base.getResourceName())
                .resourceCategory(base.getResourceCategory())
                .floorName(base.getFloorName())
                .floorNumber(base.getFloorNumber())
                .zoneName(base.getZoneName())
                .startTime(base.getStartTime())
                .endTime(base.getEndTime())
                .durationHours(base.getDurationHours())
                .partySize(base.getPartySize())
                .priceType(base.getPriceType())
                .unitPrice(base.getUnitPrice())
                .baseAmount(base.getBaseAmount())
                .surchargeAmount(base.getSurchargeAmount())
                .addonAmount(base.getAddonAmount())
                .discountAmount(base.getDiscountAmount())
                .taxAmount(base.getTaxAmount())
                .serviceFeeAmount(base.getServiceFeeAmount())
                .finalPrice(base.getFinalPrice())
                .customerId(base.getCustomerId())
                .customerName(base.getCustomerName())
                .customerEmail(base.getCustomerEmail())
                .customerPhone(base.getCustomerPhone())
                .qrTokenHash(base.getQrTokenHash())
                .cancellationPolicySnapshot(base.getCancellationPolicySnapshot())
                .pricingSnapshot(base.getPricingSnapshot())
                .cancelReason(base.getCancelReason())
                .cancelSource(base.getCancelSource())
                .cancelledAt(base.getCancelledAt())
                .refundPercent(refundPercent)
                .refundAmount(refundAmount)
                .build();
    }
}
