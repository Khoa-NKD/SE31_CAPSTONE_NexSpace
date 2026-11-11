package base.api.feature.payment.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.dto.response.BatchReconciliationResponseDTO;
import base.api.feature.payment.dto.response.ReconciliationResultDTO;
import base.api.feature.payment.dto.response.ReconciliationSummaryDTO;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.service.IPaymentReconciliationService;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentReconciliationServiceImpl implements IPaymentReconciliationService {

    private final IPaymentTransactionRepository paymentTransactionRepository;
    private final IBookingRepository bookingRepository;
    private final IAuditService auditService;
    private final PayOS payOS;

    @Override
    @Transactional
    public ReconciliationResultDTO reconcileTransaction(Long orderCode) {
        if (orderCode == null) {
            throw new BadRequestException("Mã đơn hàng không được để trống");
        }

        PaymentTransactionModel tx = paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giao dịch với orderCode=" + orderCode));

        if (payOS == null) {
            log.warn("PayOS credentials not configured; cannot fetch live status for orderCode={}", orderCode);
            return ReconciliationResultDTO.builder()
                    .orderCode(orderCode)
                    .localStatus(tx.getStatus())
                    .gatewayStatus("UNAVAILABLE")
                    .localAmount(tx.getAmount())
                    .gatewayAmount(BigDecimal.ZERO)
                    .reconciliationStatus(tx.getReconciliationStatus())
                    .note("Cổng PayOS chưa được cấu hình, không thể đối soát trực tiếp")
                    .reconciledAt(LocalDateTime.now())
                    .build();
        }

        PaymentLink paymentLink = null;
        try {
            paymentLink = payOS.paymentRequests().get(orderCode);
        } catch (Exception e) {
            log.error("Failed to query PayOS payment link for orderCode={}: {}", orderCode, e.getMessage());
        }

        LocalDateTime now = LocalDateTime.now();

        if (paymentLink == null) {
            tx.setReconciliationStatus(ReconciliationStatus.MISMATCH);
            tx.setReconciliationNote("Không tìm thấy giao dịch trên cổng PayOS");
            paymentTransactionRepository.save(tx);

            return ReconciliationResultDTO.builder()
                    .orderCode(orderCode)
                    .localStatus(tx.getStatus())
                    .gatewayStatus("NOT_FOUND")
                    .localAmount(tx.getAmount())
                    .gatewayAmount(BigDecimal.ZERO)
                    .reconciliationStatus(ReconciliationStatus.MISMATCH)
                    .note("Không tìm thấy giao dịch trên cổng PayOS")
                    .reconciledAt(now)
                    .build();
        }

        PaymentLinkStatus gatewayStatus = paymentLink.getStatus();
        Long gatewayPaid = paymentLink.getAmountPaid() != null ? paymentLink.getAmountPaid() : 0L;
        String gatewayStatusStr = (gatewayStatus != null) ? gatewayStatus.name() : "UNKNOWN";

        boolean statusMatched = false;
        String note = "";

        if (gatewayStatus == PaymentLinkStatus.PAID) {
            if (tx.getStatus() == PaymentStatus.SUCCESS) {
                if (tx.getAmount() != null && tx.getAmount().longValue() == gatewayPaid) {
                    tx.setReconciliationStatus(ReconciliationStatus.MATCHED);
                    note = "Đã khớp hoàn toàn (Số tiền: " + gatewayPaid + " VND)";
                    statusMatched = true;
                } else {
                    tx.setReconciliationStatus(ReconciliationStatus.MISMATCH);
                    note = "Lệch số tiền: PayOS nhận " + gatewayPaid + " VND, nội bộ " + tx.getAmount() + " VND";
                }
            } else if (tx.getStatus() == PaymentStatus.PENDING) {
                // Auto-healing: webhook was missed, but payment is confirmed on gateway
                log.info("Auto-healing missed webhook for orderCode={}", orderCode);
                tx.setStatus(PaymentStatus.SUCCESS);
                tx.setReceivedAmount(BigDecimal.valueOf(gatewayPaid));
                tx.setPaidAt(now);
                tx.setReconciliationStatus(ReconciliationStatus.MATCHED);
                note = "Tự động đồng bộ và xác nhận từ cổng PayOS (bù đắp webhook)";
                statusMatched = true;

                BookingModel booking = tx.getBooking();
                if (booking != null) {
                    booking = bookingRepository.findByIdForUpdate(booking.getId()).orElse(booking);
                    if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                        booking.setStatus(BookingStatus.CONFIRMED);
                        booking.setHoldExpiresAt(null);
                        booking.setQrTokenHash("NXQR-" + booking.getBookingCode() + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase());
                        bookingRepository.save(booking);
                    }
                }
            } else {
                tx.setReconciliationStatus(ReconciliationStatus.MISMATCH);
                note = "Lệch trạng thái: PayOS báo PAID nhưng hệ thống nội bộ đang là " + tx.getStatus();
            }
        } else if (gatewayStatus == PaymentLinkStatus.CANCELLED || gatewayStatus == PaymentLinkStatus.EXPIRED) {
            if (tx.getStatus() == PaymentStatus.CANCELLED || tx.getStatus() == PaymentStatus.EXPIRED) {
                tx.setReconciliationStatus(ReconciliationStatus.MATCHED);
                note = "Khớp trạng thái hủy/hết hạn (" + gatewayStatusStr + ")";
                statusMatched = true;
            } else {
                tx.setReconciliationStatus(ReconciliationStatus.MISMATCH);
                note = "Lệch trạng thái: PayOS=" + gatewayStatusStr + ", nội bộ=" + tx.getStatus();
            }
        } else {
            tx.setReconciliationStatus(ReconciliationStatus.UNRECONCILED);
            note = "Giao dịch vẫn đang ở trạng thái PayOS=" + gatewayStatusStr;
        }

        tx.setReconciliationNote(note);
        paymentTransactionRepository.save(tx);

        auditService.log(
                null,
                AuditActorType.SYSTEM,
                "PAYMENT",
                "PAYMENT_RECONCILED",
                "PaymentTransaction",
                tx.getId(),
                null,
                tx.getReconciliationStatus().name(),
                note,
                null
        );

        return ReconciliationResultDTO.builder()
                .orderCode(orderCode)
                .localStatus(tx.getStatus())
                .gatewayStatus(gatewayStatusStr)
                .localAmount(tx.getAmount())
                .gatewayAmount(BigDecimal.valueOf(gatewayPaid))
                .reconciliationStatus(tx.getReconciliationStatus())
                .note(note)
                .reconciledAt(now)
                .build();
    }

    @Override
    @Transactional
    public BatchReconciliationResponseDTO batchReconcile() {
        List<PaymentTransactionModel> candidates = new ArrayList<>();
        candidates.addAll(paymentTransactionRepository.findByReconciliationStatus(ReconciliationStatus.UNRECONCILED));
        candidates.addAll(paymentTransactionRepository.findByReconciliationStatus(ReconciliationStatus.MISMATCH));

        int total = 0;
        int matched = 0;
        int mismatch = 0;
        int autoHealed = 0;
        int errors = 0;

        for (PaymentTransactionModel tx : candidates) {
            total++;
            try {
                PaymentStatus beforeStatus = tx.getStatus();
                ReconciliationResultDTO result = reconcileTransaction(tx.getOrderCode());
                if (result.getReconciliationStatus() == ReconciliationStatus.MATCHED) {
                    matched++;
                    if (beforeStatus == PaymentStatus.PENDING && result.getLocalStatus() == PaymentStatus.SUCCESS) {
                        autoHealed++;
                    }
                } else if (result.getReconciliationStatus() == ReconciliationStatus.MISMATCH) {
                    mismatch++;
                }
            } catch (Exception e) {
                log.error("Batch reconcile error for orderCode={}: {}", tx.getOrderCode(), e.getMessage());
                errors++;
            }
        }

        return BatchReconciliationResponseDTO.builder()
                .totalProcessed(total)
                .matchedCount(matched)
                .mismatchCount(mismatch)
                .autoHealedCount(autoHealed)
                .errorCount(errors)
                .completedAt(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ReconciliationSummaryDTO getReconciliationSummary() {
        long total = paymentTransactionRepository.count();
        long matched = paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.MATCHED);
        long mismatch = paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.MISMATCH);
        long unreconciled = paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.UNRECONCILED);
        long resolved = paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.RESOLVED);

        return ReconciliationSummaryDTO.builder()
                .totalTransactions(total)
                .matchedCount(matched)
                .mismatchCount(mismatch)
                .unreconciledCount(unreconciled)
                .resolvedCount(resolved)
                .build();
    }
}

