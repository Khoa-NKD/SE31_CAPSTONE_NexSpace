package base.api.feature.payment.service;

import base.api.feature.payment.repository.IOrganizerPayoutRepository;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.*;
import base.api.shared.enums.*;
import base.api.shared.exception.ConflictException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class RefundPayoutServiceTest {
    private final IOrganizerPayoutRepository payouts = mock(IOrganizerPayoutRepository.class);
    private final IRefundRequestRepository refunds = mock(IRefundRequestRepository.class);
    private final RefundPayoutService service = new RefundPayoutService(payouts,refunds);
    private BookingModel booking() {
        var booking = new BookingModel(); booking.setId(1L); booking.setTaxAmount(new BigDecimal("8"));
        booking.setPlatformFeeAmount(new BigDecimal("10")); booking.setDiscountAmount(BigDecimal.ZERO); return booking;
    }
    private OrganizerPayoutModel payout(BookingModel booking) {
        var payout = new OrganizerPayoutModel(); payout.setBooking(booking); payout.setGrossAmount(new BigDecimal("100"));
        payout.setPayoutAmount(new BigDecimal("98")); payout.setStatus(PayoutStatus.RELEASED);
        when(payouts.findByBookingIdForUpdate(1L)).thenReturn(Optional.of(payout)); return payout;
    }
    private RefundRequestModel refund(String amount) {
        var charge = new PaymentTransactionModel(); charge.setAmount(new BigDecimal("108"));
        var refund = new RefundRequestModel(); refund.setStatus(RefundStatus.PROCESSED); refund.setSource(RefundSource.CUSTOMER_CANCEL);
        refund.setPaymentTransaction(charge); refund.setApprovedAmount(new BigDecimal(amount)); return refund;
    }
    @Test void partialRefundReducesBothOrganizerBalanceAndCommissionProportionally() {
        var booking = booking(); var payout = payout(booking);
        when(refunds.findByBookingId(1L)).thenReturn(List.of(refund("54")));
        service.reconcile(booking);
        assertThat(payout.getRefundDeductionAmount()).isEqualByComparingTo("54");
        assertThat(payout.getPlatformFeeAmount()).isEqualByComparingTo("5");
        assertThat(payout.getPayoutAmount()).isEqualByComparingTo("49");
    }
    @Test void fullRefundLeavesNoWithdrawableAmountAndRepeatedReconciliationDoesNotDoubleDeduct() {
        var booking = booking(); var payout = payout(booking);
        when(refunds.findByBookingId(1L)).thenReturn(List.of(refund("108")));
        service.reconcile(booking); service.reconcile(booking);
        assertThat(payout.getPayoutAmount()).isZero(); assertThat(payout.getPlatformFeeAmount()).isZero();
        assertThat(payout.getRefundDeductionAmount()).isEqualByComparingTo("108");
    }
    @Test void pendingRefundCannotBeWithdrawnAndPaidPayoutNeedsManualReconciliation() {
        var booking = booking(); var payout = payout(booking); service.reserve(booking);
        assertThat(payout.getStatus()).isEqualTo(PayoutStatus.HELD);
        payout.setStatus(PayoutStatus.PAID);
        assertThatThrownBy(() -> service.reserve(booking)).isInstanceOf(ConflictException.class);
    }
}
