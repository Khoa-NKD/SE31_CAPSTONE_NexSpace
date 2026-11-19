package base.api.feature.payment.mapper;

import base.api.feature.payment.dto.refund.RefundRequestResponseDto;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceModel;

import java.math.BigDecimal;

public final class RefundRequestMapper {

    private RefundRequestMapper() {
    }

    public static RefundRequestResponseDto toDto(RefundRequestModel model) {
        if (model == null) {
            return null;
        }

        BookingModel booking = model.getBooking();
        Long bookingId = null;
        String bookingCode = null;
        Long customerId = null;
        String customerName = null;
        String customerEmail = null;
        Long workspaceId = null;
        String workspaceName = null;
        String resourceName = null;

        if (booking != null) {
            bookingId = booking.getId();
            bookingCode = booking.getBookingCode();
            UserModel customer = booking.getCustomer();
            if (customer != null) {
                customerId = customer.getId();
                customerName = customer.getFullName();
                customerEmail = customer.getEmail();
            }
            WorkspaceModel workspace = booking.getWorkspace();
            if (workspace != null) {
                workspaceId = workspace.getId();
                workspaceName = workspace.getName();
            }
            BookableResourceModel resource = booking.getResource();
            if (resource != null) {
                resourceName = resource.getName();
            }
        }

        PaymentTransactionModel tx = model.getPaymentTransaction();
        BigDecimal originalPaid = null;
        if (tx != null) {
            originalPaid = tx.getReceivedAmount() != null ? tx.getReceivedAmount() : tx.getAmount();
        }

        Long reviewedById = null;
        String reviewedByName = null;
        UserModel reviewedBy = model.getReviewedBy();
        if (reviewedBy != null) {
            reviewedById = reviewedBy.getId();
            reviewedByName = reviewedBy.getFullName();
        }

        return RefundRequestResponseDto.builder()
                .id(model.getId())
                .bookingId(bookingId)
                .bookingCode(bookingCode)
                .customerId(customerId)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .workspaceId(workspaceId)
                .workspaceName(workspaceName)
                .resourceName(resourceName)
                .originalPaidAmount(originalPaid)
                .requestedAmount(model.getRequestedAmount())
                .approvedAmount(model.getApprovedAmount())
                .status(model.getStatus())
                .source(model.getSource())
                .reason(model.getReason())
                .bankName(model.getBankName())
                .bankBin(model.getBankBin())
                .bankAccountNumber(model.getBankAccountNumber())
                .bankAccountName(model.getBankAccountName())
                .adminNote(model.getAdminNote())
                .refundReference(model.getRefundReference())
                .reviewedById(reviewedById)
                .reviewedByName(reviewedByName)
                .reviewedAt(model.getReviewedAt())
                .processedAt(model.getProcessedAt())
                .createdAt(model.getCreatedAt())
                .build();
    }
}
