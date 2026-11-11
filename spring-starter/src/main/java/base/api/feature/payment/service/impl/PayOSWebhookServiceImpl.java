package base.api.feature.payment.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.dto.response.WebhookProcessResultDTO;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.service.IPayOSWebhookService;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.CancelSource;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import vn.payos.PayOS;
import vn.payos.exception.WebhookException;
import vn.payos.model.webhooks.Webhook;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayOSWebhookServiceImpl implements IPayOSWebhookService {

    private final IPaymentTransactionRepository paymentTransactionRepository;
    private final IBookingRepository bookingRepository;
    private final IAuditService auditService;
    private final PayOS payOS;

    @Override
    @Transactional
    public WebhookProcessResultDTO processWebhook(Webhook webhook, String rawPayload) {
        if (webhook == null) {
            log.warn("Received empty webhook payload");
            return WebhookProcessResultDTO.builder()
                    .status("IGNORED")
                    .message("Payload rỗng")
                    .build();
        }

        // 1. Verify HMAC-SHA256 signature using PayOS SDK
        WebhookData verifiedData;
        try {
            if (payOS != null) {
                if (!StringUtils.hasText(webhook.getSignature())) {
                    throw new BadRequestException("Chữ ký số webhook không hợp lệ: signature không được để trống");
                }
                verifiedData = payOS.webhooks().verify(webhook);
            } else {
                log.warn("PayOS bean is not configured, skipping HMAC verification in fallback mode");
                verifiedData = webhook.getData();
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (WebhookException e) {
            log.error("PayOS webhook signature verification failed: {}", e.getMessage());
            Long orderCode = (webhook.getData() != null) ? webhook.getData().getOrderCode() : null;
            auditService.log(
                    null,
                    AuditActorType.PAYMENT_WEBHOOK,
                    "PAYMENT",
                    "PAYMENT_WEBHOOK_INVALID_SIGNATURE",
                    "PaymentTransaction",
                    orderCode,
                    null,
                    null,
                    "Chữ ký webhook PayOS không hợp lệ: " + e.getMessage(),
                    null
            );
            throw new BadRequestException("Chữ ký số webhook không hợp lệ: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error verifying PayOS webhook: {}", e.getMessage(), e);
            throw new BadRequestException("Lỗi xác minh webhook: " + e.getMessage());
        }

        if (verifiedData == null || verifiedData.getOrderCode() == null) {
            log.warn("Webhook data or orderCode is null, ignoring webhook call");
            return WebhookProcessResultDTO.builder()
                    .status("IGNORED")
                    .message("Không có thông tin orderCode trong webhook")
                    .build();
        }

        Long orderCode = verifiedData.getOrderCode();
        log.info("Processing verified PayOS webhook for orderCode={}", orderCode);

        // 2. Query transaction with PESSIMISTIC_WRITE lock
        PaymentTransactionModel tx = paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)
                .orElse(null);

        if (tx == null) {
            log.warn("Payment transaction not found for orderCode={}. Likely a test webhook or external order.", orderCode);
            return WebhookProcessResultDTO.builder()
                    .orderCode(orderCode)
                    .status("IGNORED")
                    .message("Không tìm thấy giao dịch với orderCode=" + orderCode)
                    .build();
        }

        // 3. Idempotency check: if already SUCCESS, do not re-process
        if (tx.getStatus() == PaymentStatus.SUCCESS) {
            log.info("OrderCode={} is already marked as SUCCESS. Skipping duplicate webhook.", orderCode);
            return WebhookProcessResultDTO.builder()
                    .orderCode(orderCode)
                    .status("ALREADY_PROCESSED")
                    .message("Giao dịch đã được ghi nhận thành công trước đó")
                    .build();
        }

        boolean isSuccess = "00".equals(webhook.getCode())
                || (verifiedData.getCode() != null && "00".equals(verifiedData.getCode()))
                || Boolean.TRUE.equals(webhook.getSuccess());

        return applyPaymentOutcome(
                tx,
                orderCode,
                verifiedData.getAmount(),
                verifiedData.getReference(),
                webhook.getCode(),
                webhook.getDesc(),
                isSuccess,
                rawPayload
        );
    }

    @Override
    public void confirmWebhook(String webhookUrl) {
        if (!StringUtils.hasText(webhookUrl)) {
            throw new BadRequestException("Webhook URL không được để trống");
        }
        if (payOS == null) {
            throw new BadRequestException("PayOS chưa được cấu hình credentials");
        }
        try {
            log.info("Confirming webhook URL with PayOS: {}", webhookUrl);
            payOS.webhooks().confirm(webhookUrl);
            log.info("Successfully confirmed webhook URL with PayOS: {}", webhookUrl);
        } catch (Exception e) {
            log.error("Failed to confirm webhook URL with PayOS: {}", e.getMessage(), e);
            throw new BadRequestException("Xác nhận Webhook URL với PayOS thất bại: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public WebhookProcessResultDTO simulateWebhook(Long orderCode, Long amount, boolean success) {
        PaymentTransactionModel tx = paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giao dịch với orderCode: " + orderCode));

        long finalAmount = (amount != null && amount > 0) ? amount : tx.getAmount().longValue();
        String reference = "SIMULATED-" + System.currentTimeMillis();
        String code = success ? "00" : "01";
        String desc = success ? "success" : "failed";
        String simulatedPayload = String.format(
                "{\"simulated\":true,\"orderCode\":%d,\"amount\":%d,\"code\":\"%s\",\"desc\":\"%s\"}",
                orderCode, finalAmount, code, desc
        );

        return applyPaymentOutcome(
                tx,
                orderCode,
                finalAmount,
                reference,
                code,
                desc,
                success,
                simulatedPayload
        );
    }

    private WebhookProcessResultDTO applyPaymentOutcome(
            PaymentTransactionModel tx,
            Long orderCode,
            Long amount,
            String reference,
            String code,
            String desc,
            boolean isSuccess,
            String rawPayload) {

        // Save raw webhook payload for audit and dispute resolution
        tx.setWebhookPayload(rawPayload);
        if (StringUtils.hasText(reference)) {
            tx.setGatewayTransactionId(reference);
        }

        BookingModel booking = tx.getBooking();
        if (booking != null) {
            booking = bookingRepository.findByIdForUpdate(booking.getId()).orElse(booking);
        }

        if (isSuccess) {
            long received = (amount != null) ? amount : 0L;
            BigDecimal expected = tx.getAmount();

            if (expected != null && received < expected.longValue()) {
                log.warn("Underpayment detected for orderCode={}: received={}, expected={}", orderCode, received, expected);
                tx.setStatus(PaymentStatus.FAILED);
                tx.setReceivedAmount(BigDecimal.valueOf(received));
                tx.setReconciliationStatus(ReconciliationStatus.MISMATCH);
                tx.setReconciliationNote("Thanh toán thiếu: nhận " + received + " VND, yêu cầu " + expected + " VND");
                tx.setFailureReason("Số tiền thanh toán không đủ");
                paymentTransactionRepository.save(tx);

                auditService.log(
                        booking != null ? booking.getCustomer() : null,
                        AuditActorType.PAYMENT_WEBHOOK,
                        "PAYMENT",
                        "PAYMENT_UNDERPAID",
                        "PaymentTransaction",
                        tx.getId(),
                        PaymentStatus.PENDING.name(),
                        PaymentStatus.FAILED.name(),
                        "Số tiền nhận được không đủ",
                        null
                );

                return WebhookProcessResultDTO.builder()
                        .orderCode(orderCode)
                        .status("FAILED")
                        .message("Số tiền thanh toán không đủ (" + received + " < " + expected + ")")
                        .build();
            }

            // Valid payment confirmation
            tx.setStatus(PaymentStatus.SUCCESS);
            tx.setReceivedAmount(BigDecimal.valueOf(received));
            tx.setPaidAt(LocalDateTime.now());
            tx.setReconciliationStatus(ReconciliationStatus.MATCHED);
            paymentTransactionRepository.save(tx);

            if (booking != null) {
                if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                    booking.setStatus(BookingStatus.CONFIRMED);
                    booking.setHoldExpiresAt(null);

                    // Generate unique QR access token
                    String qrToken = "NXQR-" + booking.getBookingCode() + "-"
                            + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
                    booking.setQrTokenHash(qrToken);
                    bookingRepository.save(booking);

                    auditService.log(
                            booking.getCustomer(),
                            AuditActorType.PAYMENT_WEBHOOK,
                            "PAYMENT",
                            "BOOKING_CONFIRMED",
                            "Booking",
                            booking.getId(),
                            BookingStatus.PENDING_PAYMENT.name(),
                            BookingStatus.CONFIRMED.name(),
                            "Thanh toán thành công qua PayOS (orderCode=" + orderCode + ")",
                            null
                    );
                } else {
                    // Late payment after cancellation/expiration
                    tx.setReconciliationStatus(ReconciliationStatus.MISMATCH);
                    tx.setReconciliationNote("Nhận tiền thành công nhưng đơn đặt chỗ đã ở trạng thái " + booking.getStatus());
                    paymentTransactionRepository.save(tx);
                    log.warn("Payment succeeded for orderCode={} but booking is in status {}", orderCode, booking.getStatus());
                }
            }

            return WebhookProcessResultDTO.builder()
                    .orderCode(orderCode)
                    .status("SUCCESS")
                    .message("Xử lý thanh toán thành công, đơn đặt chỗ đã được xác nhận")
                    .build();

        } else {
            // Payment failed or cancelled
            tx.setStatus(PaymentStatus.FAILED);
            tx.setFailureReason(StringUtils.hasText(desc) ? desc : "PayOS báo thanh toán thất bại (code=" + code + ")");
            tx.setReconciliationStatus(ReconciliationStatus.MISMATCH);
            paymentTransactionRepository.save(tx);

            if (booking != null && booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                booking.setStatus(BookingStatus.CANCELLED);
                booking.setCancelledAt(LocalDateTime.now());
                booking.setCancelSource(CancelSource.SYSTEM);
                booking.setCancelReason("Thanh toán thất bại qua cổng PayOS: " + desc);
                bookingRepository.save(booking);

                auditService.log(
                        booking.getCustomer(),
                        AuditActorType.PAYMENT_WEBHOOK,
                        "PAYMENT",
                        "PAYMENT_FAILED",
                        "Booking",
                        booking.getId(),
                        BookingStatus.PENDING_PAYMENT.name(),
                        BookingStatus.CANCELLED.name(),
                        "Thanh toán thất bại qua cổng PayOS: " + desc,
                        null
                );
            }

            return WebhookProcessResultDTO.builder()
                    .orderCode(orderCode)
                    .status("FAILED")
                    .message("Giao dịch thanh toán thất bại: " + desc)
                    .build();
        }
    }
}

