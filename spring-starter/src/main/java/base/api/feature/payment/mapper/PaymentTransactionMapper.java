package base.api.feature.payment.mapper;

import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;

public final class PaymentTransactionMapper {

    private PaymentTransactionMapper() {
    }

    public static PaymentTransactionResponseDTO toDto(PaymentTransactionModel model) {
        if (model == null) {
            return null;
        }

        BookingModel booking = model.getBooking();
        String customerName = null;
        String customerEmail = null;
        Long workspaceId = null;
        String workspaceName = null;
        Long bookingId = null;
        String bookingCode = null;

        if (booking != null) {
            bookingId = booking.getId();
            bookingCode = booking.getBookingCode();
            if (booking.getCustomer() != null) {
                customerName = booking.getCustomer().getFullName();
                customerEmail = booking.getCustomer().getEmail();
            }
            if (booking.getWorkspace() != null) {
                workspaceId = booking.getWorkspace().getId();
                workspaceName = booking.getWorkspace().getName();
            }
        }

        return PaymentTransactionResponseDTO.builder()
                .id(model.getId())
                .orderCode(model.getOrderCode())
                .bookingId(bookingId)
                .bookingCode(bookingCode)
                .workspaceId(workspaceId)
                .workspaceName(workspaceName)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .amount(model.getAmount())
                .receivedAmount(model.getReceivedAmount())
                .currency("VND")
                .status(model.getStatus())
                .reconciliationStatus(model.getReconciliationStatus())
                .reconciliationNote(model.getReconciliationNote())
                .gatewayTransactionId(model.getGatewayTransactionId())
                .failureReason(model.getFailureReason())
                .invoiceUrl(model.getCheckoutUrl()) // Will be updated by invoice service if available
                .paidAt(model.getPaidAt())
                .expiresAt(model.getExpiresAt())
                .createdAt(model.getCreatedAt())
                .build();
    }
}

