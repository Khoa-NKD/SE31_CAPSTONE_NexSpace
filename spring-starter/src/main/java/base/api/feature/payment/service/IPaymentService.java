package base.api.feature.payment.service;

import base.api.feature.payment.dto.response.ExchangeRateResponseDTO;
import base.api.feature.payment.dto.response.PaymentCheckoutResponseDTO;
import base.api.feature.payment.dto.response.PaymentStatusResponseDTO;

public interface IPaymentService {

    ExchangeRateResponseDTO getExchangeRate();

    PaymentCheckoutResponseDTO createPaymentForBooking(Long bookingId, Long actorId);

    PaymentStatusResponseDTO getPaymentStatus(Long bookingId, Long actorId);

    void cancelPayment(Long orderCode, Long actorId, String reason);
}

