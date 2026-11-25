package base.api.feature.payment.service;

import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.exception.ConflictException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class BookingRefundAmountTest {
    private PaymentTransactionModel transaction(long id, PaymentStatus status, String amount) {
        var tx = new PaymentTransactionModel(); tx.setId(id); tx.setStatus(status); tx.setAmount(new BigDecimal(amount)); return tx;
    }
    @Test void usesTheSuccessfulSettledChargeInsteadOfAnUnpaidSessionOrLaterDuplicate() {
        var paid = transaction(2, PaymentStatus.SUCCESS, "10801");
        assertThat(BookingRefundAmount.settledTransaction(List.of(transaction(1,PaymentStatus.PENDING,"9000"),
                transaction(3,PaymentStatus.SUCCESS,"10801"),paid))).isSameAs(paid);
        assertThat(BookingRefundAmount.calculate(paid.getAmount(),new BigDecimal("50"))).isEqualByComparingTo("5401");
        assertThat(BookingRefundAmount.calculate(paid.getAmount(),new BigDecimal("100"))).isEqualByComparingTo("10801");
        assertThat(BookingRefundAmount.calculate(paid.getAmount(),BigDecimal.ZERO)).isZero();
    }
    @Test void refusesToInventAPaidAmountWhenNoSuccessfulTransactionExists() {
        assertThatThrownBy(() -> BookingRefundAmount.settledTransaction(List.of(transaction(1,PaymentStatus.PENDING,"10800"))))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> BookingRefundAmount.calculate(BigDecimal.TEN,new BigDecimal("101")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
