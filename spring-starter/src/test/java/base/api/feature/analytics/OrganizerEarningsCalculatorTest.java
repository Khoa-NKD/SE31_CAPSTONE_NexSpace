package base.api.feature.analytics;

import base.api.feature.analytics.service.OrganizerEarningsCalculator;
import base.api.feature.analytics.service.OrganizerEarningsCalculator.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class OrganizerEarningsCalculatorTest {
    private static final LocalDateTime START = LocalDateTime.parse("2026-11-01T00:00:00");
    private static final LocalDateTime END = LocalDateTime.parse("2026-12-01T00:00:00");
    private static BigDecimal amount(String value) { return new BigDecimal(value); }
    private static Basis basis() { return new Basis(1,"VND",amount("108000"),amount("8000"),amount("10000"),BigDecimal.ZERO); }
    private static Event payment(String id, String at, String value) {
        return new Event(1,id,"PAYMENT",LocalDateTime.parse(at),amount(value),amount("108000"),"MATCHED",false,Long.parseLong(id));
    }
    private static Event refund(String id, String at, String value) {
        return new Event(1,id,"REFUND",LocalDateTime.parse(at),amount(value),null,null,false,1);
    }
    private static Allocation calculate(Event... events) {
        return OrganizerEarningsCalculator.calculate(List.of(basis()),List.of(events),START,END);
    }

    @Test void separatesOrganizerTaxCommissionAndRentalIncome() {
        var result=calculate(payment("1","2026-11-01T10:00:00","108000"));
        assertThat(result.organizer()).isEqualByComparingTo("98000");
        assertThat(result.rental()).isEqualByComparingTo("100000");
        assertThat(result.vat()).isEqualByComparingTo("8000");
        assertThat(result.fee()).isEqualByComparingTo("10000");
        assertThat(result.rentalEarnings()).isEqualByComparingTo("90000");
        assertThat(result.excludedBookings()).isZero();
    }

    @Test void tenPercentVatExampleReconcilesFullPartialAndCompleteRefunds() {
        var basis = new Basis(1, "VND", amount("1100000"), amount("100000"), amount("100000"), BigDecimal.ZERO);
        var paid = new Event(1, "1", "PAYMENT", START, amount("1100000"), amount("1100000"), "MATCHED", false, 1);
        var received = OrganizerEarningsCalculator.calculate(List.of(basis), List.of(paid), START, END);
        assertThat(received.organizer()).isEqualByComparingTo("1000000");
        assertThat(received.rentalEarnings()).isEqualByComparingTo("900000");
        assertThat(received.vat()).isEqualByComparingTo("100000");
        assertThat(received.organizer().add(received.fee())).isEqualByComparingTo("1100000");
        var partial = OrganizerEarningsCalculator.calculate(List.of(basis), List.of(paid,
                refund("2", "2026-11-02T10:00:00", "550000")), START, END);
        assertThat(partial.organizer()).isEqualByComparingTo("500000");
        assertThat(partial.vat()).isEqualByComparingTo("50000");
        assertThat(partial.fee()).isEqualByComparingTo("50000");
        assertThat(partial.organizer().add(partial.fee()).add(amount("550000"))).isEqualByComparingTo("1100000");
        var fullyRefunded = OrganizerEarningsCalculator.calculate(List.of(basis), List.of(paid,
                refund("2", "2026-11-02T10:00:00", "1100000")), START, END);
        assertThat(fullyRefunded.organizer()).isZero();
        assertThat(fullyRefunded.vat()).isZero();
        assertThat(fullyRefunded.fee()).isZero();
    }
    @Test void partialRefundReducesTaxAndFeeByTheSameProportion() {
        var result=calculate(payment("1","2026-11-01T10:00:00","108000"),refund("2","2026-11-02T10:00:00","54000"));
        assertThat(result.organizer()).isEqualByComparingTo("49000");
        assertThat(result.fee()).isEqualByComparingTo("5000");
        assertThat(result.vat()).isEqualByComparingTo("4000");
        assertThat(result.rentalEarnings()).isEqualByComparingTo("45000");
    }
    @Test void fullRefundReversesAllFeesAndTax() {
        var result=calculate(payment("1","2026-11-01T10:00:00","108000"),refund("2","2026-11-02T10:00:00","108000"));
        assertThat(result.organizer()).isZero(); assertThat(result.fee()).isZero(); assertThat(result.vat()).isZero();
    }
    @Test void refundInALaterPeriodReversesOriginalAllocationWithoutChargingFeesTwice() {
        var result=OrganizerEarningsCalculator.calculate(List.of(basis()),List.of(
                payment("1","2026-10-31T10:00:00","108000"), refund("2","2026-11-02T10:00:00","54000")),START,END);
        assertThat(result.organizer()).isEqualByComparingTo("-49000");
        assertThat(result.fee()).isEqualByComparingTo("-5000"); assertThat(result.vat()).isEqualByComparingTo("-4000");
    }
    @Test void duplicateReceiptsAndRefundsDoNotMultiplyOrganizerEarnings() {
        var result=calculate(payment("1","2026-11-01T10:00:00","108000"),payment("2","2026-11-02T10:00:00","108000"),
                new Event(1,"3","REFUND",LocalDateTime.parse("2026-11-03T10:00:00"),amount("108000"),null,null,false,2));
        assertThat(result.organizer()).isEqualByComparingTo("98000"); assertThat(result.fee()).isEqualByComparingTo("10000");
    }
    @Test void excessPaymentIsNotOrganizerIncomeAndUnderpaymentDoesNotEstablishSettlement() {
        assertThat(calculate(payment("1","2026-11-01T10:00:00","118000")).organizer()).isEqualByComparingTo("98000");
        assertThat(calculate(payment("1","2026-11-01T10:00:00","50000")).organizer()).isZero();
    }
    @Test void futureEventsAndExclusiveEndBoundaryCannotChangeThisPeriod() {
        var result=calculate(payment("1","2026-11-01T00:00:00","108000"),refund("2","2026-12-01T00:00:00","108000"));
        assertThat(result.organizer()).isEqualByComparingTo("98000");
    }
    @Test void incompleteOrUnsupportedSourcesAreExcludedInsteadOfInventingIncome() {
        var event=payment("1","2026-11-01T10:00:00","108000");
        for(var b:List.of(new Basis(1,"USD",amount("108000"),amount("8000"),amount("10000"),BigDecimal.ZERO),
                new Basis(1,"VND",amount("108000"),null,amount("10000"),BigDecimal.ZERO),
                new Basis(1,"VND",amount("108000"),amount("8000"),amount("10000"),amount("5000")))) {
            assertThat(OrganizerEarningsCalculator.calculate(List.of(b),List.of(event),START,END).excludedBookings()).isEqualTo(1);
        }
        var unmatched=new Event(1,"1","PAYMENT",START,amount("108000"),amount("108000"),"UNRECONCILED",false,1);
        assertThat(calculate(unmatched).excludedBookings()).isEqualTo(1);
        assertThat(calculate(event,refund("2","2026-11-02T10:00:00","108001")).excludedBookings()).isEqualTo(1);
    }
    @Test void repeatedPartialRefundRoundingReconcilesToZeroAtFullRefund() {
        var b=new Basis(1,"VND",amount("3"),amount("0.23"),amount("0.47"),BigDecimal.ZERO);
        var paid=new Event(1,"1","PAYMENT",START,amount("3"),amount("3"),"MATCHED",false,1);
        var result=OrganizerEarningsCalculator.calculate(List.of(b),List.of(paid,
                refund("2","2026-11-02T10:00:00","1"),refund("3","2026-11-03T10:00:00","1"),refund("4","2026-11-04T10:00:00","1")),START,END);
        assertThat(result.fee()).isZero(); assertThat(result.vat()).isZero(); assertThat(result.organizer()).isZero();
    }

    @Test void refundOfOriginalPaymentReversesIncomeEvenWhenDuplicateFundsRemain() {
        var result=calculate(payment("1","2026-11-01T10:00:00","108000"),payment("2","2026-11-02T10:00:00","108000"),
                refund("3","2026-11-03T10:00:00","108000"));
        assertThat(result.organizer()).isZero(); assertThat(result.fee()).isZero(); assertThat(result.vat()).isZero();
    }
    @Test void sameTimestampChoosesLowestNumericPaymentIdAndNeverUsesAFutureRefund() {
        var result=calculate(payment("10","2026-11-01T10:00:00","108000"),payment("2","2026-11-01T10:00:00","108000"),
                new Event(1,"20","REFUND",LocalDateTime.parse("2026-11-02T10:00:00"),amount("54000"),null,null,false,2));
        assertThat(result.organizer()).isEqualByComparingTo("49000");
    }
}
