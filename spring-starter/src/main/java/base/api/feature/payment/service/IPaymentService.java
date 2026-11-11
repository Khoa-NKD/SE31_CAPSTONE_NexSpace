package base.api.feature.payment.service;

import base.api.feature.payment.dto.response.ExchangeRateResponseDTO;
import base.api.feature.payment.dto.response.PaymentCheckoutResponseDTO;
import base.api.feature.payment.dto.response.PaymentStatusResponseDTO;
import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import org.springframework.data.domain.Page;

public interface IPaymentService {

    ExchangeRateResponseDTO getExchangeRate();

    PaymentCheckoutResponseDTO createPaymentForBooking(Long bookingId, Long actorId);

    PaymentStatusResponseDTO getPaymentStatus(Long bookingId, Long actorId);

    void cancelPayment(Long orderCode, Long actorId, String reason);

    Page<PaymentTransactionResponseDTO> getCustomerPaymentHistory(Long actorId, PaymentStatus status, PageRequestDTO pageRequest);

    Page<PaymentTransactionResponseDTO> getOrganizerPaymentHistory(Long workspaceId, Long actorId, PaymentStatus status, PageRequestDTO pageRequest);

    Page<PaymentTransactionResponseDTO> getAdminPaymentHistory(PaymentStatus status, ReconciliationStatus reconciliationStatus, PageRequestDTO pageRequest);

    PaymentTransactionResponseDTO getTransactionDetail(Long orderCode);
}
