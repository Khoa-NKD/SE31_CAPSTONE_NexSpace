package base.api.feature.payment.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.notification.service.INotificationService;
import base.api.feature.payment.dto.response.WebhookProcessResultDTO;
import base.api.feature.payment.repository.IOrganizerPayoutRepository;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.service.IInvoiceService;
import base.api.feature.payment.service.IPayOSWebhookService;
import base.api.feature.payment.service.IRefundService;
import base.api.feature.resource.service.IResourceStateSyncService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.OrganizerPayoutModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.CancelSource;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.PayoutStatus;
import base.api.shared.enums.ReconciliationStatus;
import base.api.shared.enums.RefundStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import vn.payos.PayOS;
import vn.payos.exception.WebhookException;
import vn.payos.model.webhooks.Webhook;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class PayOSWebhookServiceImpl implements IPayOSWebhookService {

    private final IPaymentTransactionRepository paymentTransactionRepository;
    private final IBookingRepository bookingRepository;
    private final IAuditService auditService;
    private final PayOS payOS;
    private final IInvoiceService invoiceService;
    private final INotificationService notificationService;
    private final IResourceStateSyncService resourceStateSyncService;
    private final IUserRepository userRepository;
    private final IOrganizerPayoutRepository payoutRepository;

    @Autowired(required = false)
    private IRefundService refundService;

    public PayOSWebhookServiceImpl(
            IPaymentTransactionRepository paymentTransactionRepository,
            IBookingRepository bookingRepository,
            IAuditService auditService,
            PayOS payOS,
            IInvoiceService invoiceService,
            INotificationService notificationService,
            IResourceStateSyncService resourceStateSyncService,
            IUserRepository userRepository,
            IOrganizerPayoutRepository payoutRepository) {
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.bookingRepository = bookingRepository;
        this.auditService = auditService;
        this.payOS = payOS;
        this.invoiceService = invoiceService;
        this.notificationService = notificationService;
        this.resourceStateSyncService = resourceStateSyncService;
        this.userRepository = userRepository;
        this.payoutRepository = payoutRepository;
    }

    public void setRefundService(IRefundService refundService) {
        this.refundService = refundService;
    }

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
                rawPayload,
                verifiedData.getCounterAccountBankId(),
                verifiedData.getCounterAccountBankName(),
                verifiedData.getCounterAccountNumber(),
                verifiedData.getCounterAccountName()
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
                simulatedPayload,
                null,
                null,
                null,
                null
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
            String rawPayload,
            String counterBankId,
            String counterBankName,
            String counterAccountNumber,
            String counterAccountName) {

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

                notificationService.sendPaymentFailedNotification(tx, booking, "Số tiền thanh toán không đủ (" + received + " < " + expected + ")");

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

            // Valid payment received by PayOS
            tx.setStatus(PaymentStatus.SUCCESS);
            tx.setReceivedAmount(BigDecimal.valueOf(received));
            tx.setPaidAt(LocalDateTime.now());
            tx.setReconciliationStatus(ReconciliationStatus.MATCHED);
            paymentTransactionRepository.save(tx);

            if (booking != null) {
                LocalDateTime now = LocalDateTime.now();
                boolean isHoldExpired = booking.getStatus() == BookingStatus.EXPIRED
                        || booking.getStatus() == BookingStatus.CANCELLED
                        || (booking.getStatus() == BookingStatus.PENDING_PAYMENT
                            && booking.getHoldExpiresAt() != null
                            && booking.getHoldExpiresAt().isBefore(now));

                if (isHoldExpired) {
                    log.warn("Payment received AFTER hold expiry for bookingId={}, code={}, currentStatus={}. Initiating 100% auto-refund instead of confirming booking!",
                            booking.getId(), booking.getBookingCode(), booking.getStatus());

                    BookingStatus previousStatus = booking.getStatus();
                    if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                        booking.setStatus(BookingStatus.EXPIRED);
                    }
                    booking.setHoldExpiresAt(null);
                    booking.setCancelReason("Thanh toán sau khi đã hết thời gian giữ chỗ (Hold Expired). Hệ thống không xác nhận đặt chỗ để tránh trùng lặp và tự động hoàn tiền 100%.");
                    bookingRepository.save(booking);

                    tx.setReconciliationNote("Thanh toán sau khi hết thời gian giữ chỗ — Chuyển sang hoàn tiền tự động 100%");
                    paymentTransactionRepository.save(tx);

                    RefundRequestModel refund = null;
                    if (refundService != null) {
                        refund = refundService.processPostExpiryAutoRefund(
                                booking,
                                tx,
                                counterBankId,
                                counterBankName,
                                counterAccountNumber,
                                counterAccountName,
                                "Tự động hoàn tiền 100% do khách hàng chuyển khoản sau khi đã hết thời gian giữ chỗ (Hold Expired)"
                        );
                    }

                    boolean autoRefundDone = refund != null && refund.getStatus() == RefundStatus.PROCESSED;
                    String auditMsg = autoRefundDone
                            ? "Thanh toán sau khi hết hạn giữ chỗ (orderCode=" + orderCode + "). Đã tự động hoàn tiền 100% về tài khoản " + refund.getBankName() + " (" + refund.getBankAccountNumber() + ")."
                            : "Thanh toán sau khi hết hạn giữ chỗ (orderCode=" + orderCode + "). Đã tạo yêu cầu hoàn tiền 100% chờ bổ sung/xử lý tài khoản nhận hoàn.";

                    auditService.log(
                            booking.getCustomer(),
                            AuditActorType.PAYMENT_WEBHOOK,
                            "PAYMENT",
                            "EXPIRED_HOLD_AUTO_REFUND",
                            "Booking",
                            booking.getId(),
                            previousStatus.name(),
                            booking.getStatus().name(),
                            auditMsg,
                            null
                    );

                    return WebhookProcessResultDTO.builder()
                            .orderCode(orderCode)
                            .status(autoRefundDone ? "EXPIRED_HOLD_AUTO_REFUNDED" : "EXPIRED_HOLD_REFUND_PENDING_BANK_INFO")
                            .message(auditMsg)
                            .build();
                }

                if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                    BookingStatus previousStatus = booking.getStatus();
                    // Phòng vệ đa tầng cuối cùng (Last-mile Defense): Kiểm tra xem vị trí này đã bị đơn khác CONFIRMED trong cùng khung giờ chưa
                    boolean alreadyBooked = false;
                    if (booking.getResource() != null) {
                        alreadyBooked = !bookingRepository.findOverlappingBookingsForUpdate(
                                List.of(booking.getResource().getId()),
                                List.of(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN),
                                BookingStatus.CONFIRMED,
                                now,
                                booking.getStartTime(),
                                booking.getEndTime(),
                                booking.getId()
                        ).isEmpty();
                    }

                    if (alreadyBooked) {
                        log.error("CRITICAL: Double booking detected on webhook confirmation for bookingId={}, code={}. Resource already booked by another confirmed booking!",
                                booking.getId(), booking.getBookingCode());
                        booking.setStatus(BookingStatus.CANCELLED);
                        booking.setCancelReason("Hệ thống phát hiện xung đột thanh toán đồng thời (Đã có khách hàng thanh toán thành công trước đó). Yêu cầu hoàn tiền tự động 100%.");
                        booking.setCancelledAt(now);
                        booking.setHoldExpiresAt(null);
                        bookingRepository.save(booking);

                        if (refundService != null) {
                            refundService.processPostExpiryAutoRefund(
                                    booking,
                                    tx,
                                    counterBankId,
                                    counterBankName,
                                    counterAccountNumber,
                                    counterAccountName,
                                    "Hoàn tiền tự động 100% do xung đột đặt trùng chỗ (Đã có khách hàng khác thanh toán xác nhận trước)"
                            );
                        }

                        auditService.log(
                                booking.getCustomer(),
                                AuditActorType.PAYMENT_WEBHOOK,
                                "PAYMENT",
                                "DOUBLE_BOOKING_PREVENTED",
                                "Booking",
                                booking.getId(),
                                null,
                                null,
                                "Ngăn chặn thành công xung đột thanh toán trùng chỗ. Đơn được chuyển sang diện hoàn tiền 100%.",
                                null
                        );

                        return WebhookProcessResultDTO.builder()
                                .orderCode(orderCode)
                                .status("DOUBLE_BOOKING_PREVENTED")
                                .message("Phát hiện xung đột đặt trùng chỗ. Đơn hàng đã được đánh dấu hủy để hoàn tiền 100%.")
                                .build();
                    }

                    // Gửi thông báo thanh toán thành công (In-app + Email) khi đơn thực sự được xác nhận trong thời gian hold
                    notificationService.sendPaymentSuccessNotification(tx, booking);

                    booking.setStatus(BookingStatus.CONFIRMED);
                    booking.setHoldExpiresAt(null);
                    booking.setCancelledAt(null);
                    booking.setCancelReason(null);

                    // Generate unique QR access token
                    String qrToken = "NXQR-" + booking.getBookingCode() + "-"
                            + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
                    booking.setQrTokenHash(qrToken);
                    bookingRepository.save(booking);

                    // Tự động gỡ bỏ trạng thái tạm khóa đặt chỗ khi khách hàng thanh toán thành công
                    if (booking.getCustomer() != null && booking.getCustomer().getBookingSuspendedUntil() != null) {
                        UserModel customer = booking.getCustomer();
                        customer.setBookingSuspendedUntil(null);
                        userRepository.save(customer);
                        log.info("Reset bookingSuspendedUntil to null for customerId={} upon successful payment", customer.getId());
                    }

                    auditService.log(
                            booking.getCustomer(),
                            AuditActorType.PAYMENT_WEBHOOK,
                            "PAYMENT",
                            "BOOKING_CONFIRMED",
                            "Booking",
                            booking.getId(),
                            previousStatus.name(),
                            BookingStatus.CONFIRMED.name(),
                            "Thanh toán thành công qua PayOS (orderCode=" + orderCode + ")",
                            null
                    );

                    // Gửi hóa đơn điện tử đính kèm file PDF qua email của khách hàng
                    invoiceService.sendInvoiceEmail(booking.getId());

                    // Đồng bộ trạng thái khả dụng sang BOOKED cho tài nguyên và các chỗ trực thuộc
                    if (resourceStateSyncService != null) {
                        resourceStateSyncService.syncOnBookingConfirmed(booking);
                    }

                    // Gửi thông báo đặt chỗ thành công (In-app + Email)
                    notificationService.sendBookingConfirmedNotification(booking);

                    // Gửi thông báo booking mới cho Organizer của không gian làm việc
                    notificationService.sendNewBookingToOrganizerNotification(booking);

                    // Khởi tạo bản ghi OrganizerPayout ở trạng thái HELD
                    createHeldPayoutForBooking(booking);
                } else {
                    // Late payment after other status
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

            // Gửi thông báo thanh toán thất bại / hủy (In-app + Email)
            notificationService.sendPaymentFailedNotification(tx, booking, tx.getFailureReason());

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

    private void createHeldPayoutForBooking(BookingModel booking) {
        try {
            if (booking.getWorkspace() == null || booking.getWorkspace().getOrganizer() == null) {
                return;
            }
            if (payoutRepository.findByBookingId(booking.getId()).isPresent()) {
                return;
            }
            OrganizerPayoutModel payout = new OrganizerPayoutModel();
            payout.setOrganizer(booking.getWorkspace().getOrganizer());
            payout.setBooking(booking);

            BigDecimal base = booking.getBaseAmount() != null ? booking.getBaseAmount() : BigDecimal.ZERO;
            BigDecimal surcharge = booking.getSurchargeAmount() != null ? booking.getSurchargeAmount() : BigDecimal.ZERO;
            BigDecimal addon = booking.getAddonAmount() != null ? booking.getAddonAmount() : BigDecimal.ZERO;
            BigDecimal vat = booking.getTaxAmount() != null ? booking.getTaxAmount() : BigDecimal.ZERO;
            BigDecimal platformFee = booking.getPlatformFeeAmount() != null ? booking.getPlatformFeeAmount() : BigDecimal.ZERO;

            BigDecimal gross = base.add(surcharge).add(addon);
            BigDecimal payoutAmount = gross.add(vat).subtract(platformFee);

            payout.setGrossAmount(gross);
            payout.setPlatformFeeAmount(platformFee);
            payout.setRefundDeductionAmount(BigDecimal.ZERO);
            payout.setPayoutAmount(payoutAmount);

            LocalDateTime eligibleAt = booking.getEndTime() != null ? booking.getEndTime().plusDays(1) : LocalDateTime.now().plusDays(1);
            payout.setEligibleAt(eligibleAt);
            payout.setStatus(PayoutStatus.HELD);

            payoutRepository.save(payout);
            log.info("Created HELD OrganizerPayout for booking {}, eligibleAt={}", booking.getBookingCode(), eligibleAt);
        } catch (Exception e) {
            log.error("Failed to create OrganizerPayout for booking {}: {}", booking.getBookingCode(), e.getMessage(), e);
        }
    }
}
