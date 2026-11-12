package base.api.feature.payment.dto.response;

import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

/**
 * Immutable response payload for real-time payment and booking lifecycle verification.
 */
@Value
@Builder
public class PaymentStatusResponseDTO {
    Long orderCode;
    Long bookingId;
    PaymentStatus paymentStatus;
    BookingStatus bookingStatus;
    LocalDateTime paidAt;
    String qrTokenHash;
    String pinCode;
}

