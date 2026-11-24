package base.api.feature.payment.service;

import base.api.feature.payment.repository.IOrganizerPayoutRepository;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.OrganizerPayoutModel;
import base.api.shared.enums.*;
import base.api.shared.exception.ConflictException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Keeps an unpaid organizer balance consistent with settled customer refunds. */
@Service @RequiredArgsConstructor @Transactional
public class RefundPayoutService {
    private final IOrganizerPayoutRepository payouts;
    private final IRefundRequestRepository refunds;

    public void reserve(BookingModel booking) {
        payouts.findByBookingIdForUpdate(booking.getId()).ifPresent(payout -> {
            requireUnpaid(payout);
            if (payout.getStatus() == PayoutStatus.RELEASED) payout.setStatus(PayoutStatus.HELD);
        });
    }

    public void reconcile(BookingModel booking) {
        payouts.findByBookingIdForUpdate(booking.getId()).ifPresent(payout -> {
            requireUnpaid(payout);
            var rows = refunds.findByBookingId(booking.getId());
            var paidRefunds = rows.stream().filter(r -> r.getStatus() == RefundStatus.PROCESSED)
                    .filter(r -> r.getSource() != RefundSource.PAYMENT_DISCREPANCY).toList();
            BigDecimal refundedVnd = paidRefunds.stream().map(r -> r.getApprovedAmount())
                    .filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add);
            if (refundedVnd.signum() > 0) {
                BigDecimal chargeVnd = paidRefunds.get(0).getPaymentTransaction().getAmount();
                if (refundedVnd.compareTo(chargeVnd) > 0) throw new ConflictException("Tổng hoàn vượt số tiền đã thanh toán.");
                BigDecimal ratio = refundedVnd.divide(chargeVnd,16,RoundingMode.HALF_UP);
                BigDecimal payable = payout.getGrossAmount().add(zero(booking.getTaxAmount())).subtract(zero(booking.getDiscountAmount()));
                BigDecimal deduction = payable.multiply(ratio).setScale(2,RoundingMode.HALF_UP);
                BigDecimal fee = zero(booking.getPlatformFeeAmount()).multiply(BigDecimal.ONE.subtract(ratio)).setScale(2,RoundingMode.HALF_UP);
                payout.setRefundDeductionAmount(deduction);
                payout.setPlatformFeeAmount(fee);
                payout.setPayoutAmount(payable.subtract(deduction).subtract(fee).max(BigDecimal.ZERO));
            }
            if (rows.stream().anyMatch(r -> r.getStatus() == RefundStatus.PENDING)
                    && payout.getStatus() == PayoutStatus.RELEASED) payout.setStatus(PayoutStatus.HELD);
            payouts.save(payout);
        });
    }

    private static BigDecimal zero(BigDecimal amount) { return amount == null ? BigDecimal.ZERO : amount; }
    private static void requireUnpaid(OrganizerPayoutModel payout) {
        if (payout.getStatus() == PayoutStatus.PAID || payout.getWithdrawalBatch() != null)
            throw new ConflictException("Khoản chi cho đối tác đã được xử lý. Vui lòng chuyển quản trị viên đối soát trước khi hoàn tiền.");
    }
}
