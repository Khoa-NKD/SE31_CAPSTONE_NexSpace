package base.api.feature.payment.scheduler;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentExpiryScheduler {

    private final IBookingRepository bookingRepository;
    private final IPaymentTransactionRepository paymentTransactionRepository;
    private final IAuditService auditService;
    private final PayOS payOS;

    /**
     * Chạy định kỳ mỗi 60 giây để quét các giao dịch và đơn đặt chỗ giữ chỗ quá hạn 10 phút.
     */
    @Scheduled(fixedDelay = 60000, initialDelay = 10000)
    @Transactional
    public void expirePendingPaymentsAndBookings() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Quét các giao dịch thanh toán quá hạn
        List<PaymentTransactionModel> expiredTxs = paymentTransactionRepository
                .findExpiredTransactions(PaymentStatus.PENDING, now);

        for (PaymentTransactionModel tx : expiredTxs) {
            try {
                tx.setStatus(PaymentStatus.EXPIRED);
                tx.setFailureReason("Giao dịch hết hạn thanh toán (quá 10 phút)");
                paymentTransactionRepository.save(tx);

                // Hủy link thanh toán trên PayOS nếu cổng hỗ trợ
                if (payOS != null && tx.getOrderCode() != null) {
                    try {
                        payOS.paymentRequests().cancel(tx.getOrderCode(), "Hết hạn thanh toán");
                    } catch (Exception e) {
                        log.debug("PayOS link cancel note for orderCode {}: {}", tx.getOrderCode(), e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.error("Lỗi khi xử lý hết hạn giao dịch orderCode={}: {}", tx.getOrderCode(), e.getMessage(), e);
            }
        }

        // 2. Quét các đơn đặt chỗ giữ chỗ quá hạn
        List<BookingModel> expiredBookings = bookingRepository
                .findExpiredHoldBookings(BookingStatus.PENDING_PAYMENT, now);

        for (BookingModel booking : expiredBookings) {
            try {
                booking.setStatus(BookingStatus.EXPIRED);
                booking.setHoldExpiresAt(null);
                bookingRepository.save(booking);

                auditService.log(
                        booking.getCustomer(),
                        AuditActorType.SYSTEM,
                        "BOOKING",
                        "BOOKING_EXPIRED",
                        "Booking",
                        booking.getId(),
                        BookingStatus.PENDING_PAYMENT.name(),
                        BookingStatus.EXPIRED.name(),
                        "Hết thời gian giữ chỗ 10 phút",
                        null
                );
                log.info("Booking {} marked as EXPIRED and held slot released", booking.getBookingCode());
            } catch (Exception e) {
                log.error("Lỗi khi xử lý hết hạn đặt chỗ bookingId={}: {}", booking.getId(), e.getMessage(), e);
            }
        }
    }
}

