package base.api.feature.payment.service;

import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.exception.ConflictException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;

/** Refunds are denominated in the settled VND charge, including its gateway rounding. */
public final class BookingRefundAmount {
    private BookingRefundAmount() {}

    public static PaymentTransactionModel settledTransaction(List<PaymentTransactionModel> transactions) {
        return transactions.stream().filter(tx -> tx.getStatus() == PaymentStatus.SUCCESS)
                .filter(tx -> tx.getAmount() != null && tx.getAmount().signum() > 0)
                .min(Comparator.comparing(PaymentTransactionModel::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElseThrow(() -> new ConflictException("Chưa xác định được giao dịch đã thanh toán. Vui lòng liên hệ hỗ trợ trước khi hủy."));
    }

    public static BigDecimal calculate(BigDecimal paidVnd, BigDecimal percent) {
        if (percent.signum() < 0 || percent.compareTo(BigDecimal.valueOf(100)) > 0)
            throw new IllegalArgumentException("Refund percentage must be between zero and one hundred");
        return paidVnd.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }
}
