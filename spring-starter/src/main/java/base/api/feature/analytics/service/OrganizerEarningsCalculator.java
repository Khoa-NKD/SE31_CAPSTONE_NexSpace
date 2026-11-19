package base.api.feature.analytics.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Allocates recorded VND cash using immutable booking fees, never current tax or commission settings. */
public final class OrganizerEarningsCalculator {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private OrganizerEarningsCalculator() {}

    public record Basis(long bookingId, String currency, BigDecimal gross, BigDecimal vat,
                        BigDecimal fee, BigDecimal serviceFee) {}
    public record Event(long bookingId, String id, String kind, LocalDateTime at,
                        BigDecimal amount, BigDecimal expectedAmount, String reconciliation,
                        boolean bookingIssue, long paymentId) {}
    public record Allocation(BigDecimal rental, BigDecimal vat, BigDecimal fee,
                             BigDecimal organizer, BigDecimal rentalEarnings, long excludedBookings) {}

    private static final class Balance {
        final Map<Long, PaymentBalance> payments = new HashMap<>();
        Long principalPayment;
        boolean invalid;
    }
    private static final class PaymentBalance {
        BigDecimal received = ZERO;
        BigDecimal refunded = ZERO;
    }

    /**
     * Only the first complete payment funds a booking. Refunds follow their actual payment link;
     * surplus on that payment is returned before its principal. Duplicate payments never fund it again.
     * Rounding cumulative balances before taking differences prevents partial-refund rounding drift.
     */
    public static Allocation calculate(List<Basis> bases, List<Event> events,
                                       LocalDateTime start, LocalDateTime end) {
        Map<Long, List<Event>> grouped = new HashMap<>();
        for (var event : events) if (event.at() != null && event.at().isBefore(end))
            grouped.computeIfAbsent(event.bookingId(), ignored -> new ArrayList<>()).add(event);
        BigDecimal rental = ZERO, vat = ZERO, fee = ZERO, organizer = ZERO;
        long excluded = 0;
        for (var basis : bases) {
            var history = grouped.getOrDefault(basis.bookingId(), List.of());
            if (history.stream().noneMatch(e -> !e.at().isBefore(start))) continue;
            if (!valid(basis)) { excluded++; continue; }
            var ordered = new ArrayList<>(history);
            ordered.sort(Comparator.comparing(Event::at).thenComparing(e -> "PAYMENT".equals(e.kind()) ? 0 : 1)
                    .thenComparingLong(e -> Long.parseLong(e.id().substring(e.id().lastIndexOf('-') + 1))));
            var balance = new Balance();
            BigDecimal[] before = empty(), after = empty();
            for (var event : ordered) {
                apply(balance, basis, event);
                if (event.at().isBefore(start)) before = amounts(basis, balance);
                after = amounts(basis, balance);
            }
            if (balance.invalid) { excluded++; continue; }
            rental = rental.add(after[0].subtract(before[0]));
            vat = vat.add(after[1].subtract(before[1]));
            fee = fee.add(after[2].subtract(before[2]));
            organizer = organizer.add(after[3].subtract(before[3]));
        }
        return new Allocation(rental, vat, fee, organizer, rental.subtract(fee), excluded);
    }

    private static boolean valid(Basis b) {
        return "VND".equals(b.currency()) && b.gross() != null && b.gross().signum() > 0
                && b.gross().setScale(0, RoundingMode.HALF_UP).signum() > 0
                && b.vat() != null && b.vat().signum() >= 0 && b.fee() != null && b.fee().signum() >= 0
                // Allocation of a separate customer service charge has not been agreed. Do not guess its owner.
                && b.serviceFee() != null && b.serviceFee().signum() == 0
                && b.fee().add(b.vat()).compareTo(b.gross().setScale(0, RoundingMode.HALF_UP)) <= 0;
    }

    private static void apply(Balance balance, Basis basis, Event event) {
        if (event.amount() == null || event.amount().signum() < 0 || event.bookingIssue()) {
            balance.invalid = true;
            return;
        }
        if ("PAYMENT".equals(event.kind())) {
            BigDecimal settled = basis.gross().setScale(0, RoundingMode.HALF_UP);
            if (event.expectedAmount() == null || event.expectedAmount().compareTo(settled) != 0
                    || !"MATCHED".equals(event.reconciliation())) balance.invalid = true;
            var payment = balance.payments.computeIfAbsent(event.paymentId(), ignored -> new PaymentBalance());
            payment.received = payment.received.add(event.amount());
            if (balance.principalPayment == null && event.expectedAmount() != null
                    && event.amount().compareTo(event.expectedAmount()) >= 0)
                balance.principalPayment = event.paymentId();
        } else {
            var payment = balance.payments.get(event.paymentId());
            if (payment == null) { balance.invalid = true; return; }
            payment.refunded = payment.refunded.add(event.amount());
            if (payment.refunded.compareTo(payment.received) > 0) balance.invalid = true;
        }
    }

    private static BigDecimal[] empty() { return new BigDecimal[] {ZERO, ZERO, ZERO, ZERO}; }

    private static BigDecimal[] amounts(Basis basis, Balance balance) {
        if (balance.principalPayment == null) return empty();
        BigDecimal settled = basis.gross().setScale(0, RoundingMode.HALF_UP);
        var payment = balance.payments.get(balance.principalPayment);
        BigDecimal surplus = payment.received.subtract(settled).max(ZERO);
        BigDecimal principalRefund = payment.refunded.subtract(surplus).max(ZERO);
        BigDecimal retained = settled.subtract(principalRefund).max(ZERO);
        BigDecimal tax = basis.vat().multiply(retained).divide(settled, 2, RoundingMode.HALF_UP);
        BigDecimal fee = basis.fee().multiply(retained).divide(settled, 2, RoundingMode.HALF_UP);
        // A rounding cent cannot make tax plus commission exceed the retained customer funds.
        fee = fee.min(retained.subtract(tax));
        return new BigDecimal[] {retained.subtract(tax), tax, fee, retained.subtract(fee)};
    }
}
