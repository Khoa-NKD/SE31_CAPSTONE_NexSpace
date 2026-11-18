package base.api.feature.analytics.repository;

import base.api.feature.analytics.dto.AnalyticsFilter;
import base.api.feature.analytics.dto.OrganizerAnalyticsResponse.*;
import base.api.shared.exception.NotFoundException;
import base.api.feature.analytics.service.OrganizerEarningsCalculator;
import base.api.feature.analytics.service.OrganizerEarningsCalculator.Basis;
import base.api.feature.analytics.service.OrganizerEarningsCalculator.Event;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Aggregates each financial event independently. Joining raw payments to refunds would
 * multiply amounts for bookings with retries or multiple partial refunds.
 */
@Repository
@RequiredArgsConstructor
public class OrganizerAnalyticsRepository {
    private final NamedParameterJdbcTemplate jdbc;

    private static final String SCOPE = """
            WITH scope AS (
                SELECT b.*, w.name workspace_name, r.name resource_name,
                       rt.id type_id, rt.name type_name,
                       CASE WHEN JSON_VALID(b.pricing_snapshot) THEN
                           JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.currency')) ELSE NULL END booking_currency
                FROM booking b JOIN workspace w ON w.id = b.workspace_id
                JOIN bookable_resource r ON r.id = b.resource_id
                JOIN resource_type rt ON rt.id = r.resource_type_id
                JOIN floor_plan f ON f.id = r.floor_plan_id
                WHERE w.organizer_id = :actor
                  AND (:workspace IS NULL OR w.id = :workspace)
                  AND (:floor IS NULL OR f.floor_number = :floor)
                  AND (:type IS NULL OR rt.id = :type)
                  AND (:category IS NULL OR rt.category = :category)
            ), receipts AS (
                SELECT p.*, b.workspace_id, b.workspace_name, b.resource_id,
                       b.resource_name, b.type_id, b.type_name, b.customer_id,
                       b.booking_code, b.status booking_status, b.cancelled_at booking_cancelled_at
                FROM payment_transaction p JOIN scope b ON b.id = p.booking_id
                WHERE p.status = 'SUCCESS' AND p.paid_at IS NOT NULL
                  AND p.received_amount IS NOT NULL AND p.received_amount > 0
            ), first_paid AS (
                SELECT booking_id, paid_at, amount expected_amount FROM (
                    SELECT p.*, ROW_NUMBER() OVER (PARTITION BY booking_id ORDER BY paid_at,id) payment_rank
                    FROM receipts p WHERE p.amount > 0 AND p.received_amount >= p.amount
                ) ordered_payments WHERE payment_rank=1
            ), events AS (
                SELECT CONCAT('PAYMENT-', p.id) event_id, 'PAYMENT' kind, p.paid_at occurred_at,
                       p.booking_id, p.booking_code, p.booking_status,
                       p.workspace_id, p.workspace_name, p.resource_id, p.resource_name,
                       p.type_id, p.type_name, p.customer_id,
                       p.received_amount received, CAST(0 AS DECIMAL(18,2)) refunded,
                       0 created_count, 0 paid_count, p.reconciliation_status,
                       CASE WHEN p.amount IS NULL OR p.received_amount <> p.amount THEN 1 ELSE 0 END amount_mismatch,
                       CASE WHEN p.booking_status IN ('CANCELLED','EXPIRED')
                           AND (p.booking_cancelled_at IS NULL OR p.paid_at >= p.booking_cancelled_at)
                           THEN 1 WHEN p.booking_status IN ('PENDING_APPROVAL','PENDING_PAYMENT')
                           THEN 1 ELSE 0 END booking_issue
                FROM receipts p
                UNION ALL
                SELECT CONCAT('REFUND-', r.id), 'REFUND', r.processed_at,
                       b.id, b.booking_code, b.status, b.workspace_id, b.workspace_name,
                       b.resource_id, b.resource_name, b.type_id, b.type_name, b.customer_id,
                       0, r.approved_amount, 0, 0, NULL, 0, 0
                FROM refund_request r JOIN scope b ON b.id = r.booking_id
                JOIN payment_transaction p ON p.id = r.payment_transaction_id AND p.booking_id = b.id
                WHERE r.status = 'PROCESSED' AND r.processed_at IS NOT NULL
                  AND r.approved_amount IS NOT NULL AND r.approved_amount >= 0
                  AND b.booking_currency = 'VND'
                UNION ALL
                SELECT CONCAT('BOOKING-', b.id), 'CREATED', b.created_at,
                       b.id, b.booking_code, b.status, b.workspace_id, b.workspace_name,
                       b.resource_id, b.resource_name, b.type_id, b.type_name, b.customer_id,
                       0, 0, 1, 0, NULL, 0, 0 FROM scope b
                UNION ALL
                SELECT CONCAT('PAID-', b.id), 'FIRST_PAID', p.paid_at,
                       b.id, b.booking_code, b.status, b.workspace_id, b.workspace_name,
                       b.resource_id, b.resource_name, b.type_id, b.type_name, b.customer_id,
                       0, 0, 0, 1, NULL, 0, 0 FROM scope b JOIN first_paid p ON p.booking_id = b.id
            )
            """;
    private static final String PERIOD = " occurred_at >= :start AND occurred_at < :end ";

    private MapSqlParameterSource params(long actor, AnalyticsFilter f) {
        return new MapSqlParameterSource("actor", actor).addValue("workspace", f.workspaceId())
                .addValue("floor", f.floorNumber()).addValue("type", f.resourceTypeId())
                .addValue("category", f.category() == null ? null : f.category().name())
                .addValue("start", f.start()).addValue("end", f.end());
    }

    public void requireOwnedWorkspace(long actor, Long workspaceId) {
        if (workspaceId != null && !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT COUNT(*) > 0 FROM workspace WHERE id = :id AND organizer_id = :actor",
                new MapSqlParameterSource("id", workspaceId).addValue("actor", actor), Boolean.class))) {
            throw new NotFoundException("Workspace không tồn tại hoặc không thuộc quyền quản lý");
        }
    }

    public Summary summary(long actor, AnalyticsFilter f) {
        var p = params(actor, f);
        String sql = SCOPE + """
                SELECT COALESCE(SUM(created_count),0) created_count,
                       COALESCE(SUM(paid_count),0) paid_count,
                       COUNT(DISTINCT CASE WHEN kind = 'FIRST_PAID' THEN customer_id END) customers,
                       COUNT(DISTINCT CASE WHEN kind = 'FIRST_PAID' AND EXISTS (
                           SELECT 1 FROM receipts old WHERE old.customer_id = events.customer_id
                           AND old.paid_at < :start) THEN customer_id END) returning_customers,
                       COALESCE(SUM(received),0) received, COALESCE(SUM(refunded),0) refunded,
                       SUM(CASE WHEN kind = 'PAYMENT' THEN 1 ELSE 0 END) receipt_count,
                       SUM(CASE WHEN kind = 'REFUND' THEN 1 ELSE 0 END) refund_count,
                       SUM(CASE WHEN kind = 'PAYMENT' AND
                           (amount_mismatch = 1 OR reconciliation_status IS NULL OR reconciliation_status <> 'MATCHED'
                            OR booking_issue = 1) THEN 1 ELSE 0 END) anomalies
                FROM events WHERE
                """ + PERIOD;
        Totals t = jdbc.queryForObject(sql, p, (rs, row) -> new Totals(
                rs.getLong("created_count"), rs.getLong("paid_count"), rs.getLong("customers"),
                rs.getLong("returning_customers"), rs.getBigDecimal("received"), rs.getBigDecimal("refunded"),
                rs.getLong("receipt_count"), rs.getLong("refund_count"), rs.getLong("anomalies")));
        var statuses = statuses(actor, f);
        BigDecimal paidValue = jdbc.queryForObject(SCOPE + """
                SELECT COALESCE(SUM(expected_amount),0) FROM first_paid
                WHERE paid_at >= :start AND paid_at < :end
                """, p, BigDecimal.class);
        return new Summary(t.created, t.paid, t.customers, t.returningCustomers,
                count(statuses, "COMPLETED"), count(statuses, "CANCELLED"), count(statuses, "EXPIRED"),
                count(statuses, "NO_SHOW"), money(t.received), money(t.refunded), money(t.received.subtract(t.refunded)),
                t.paid == 0 ? "0.00" : money(paidValue.divide(BigDecimal.valueOf(t.paid), 2, RoundingMode.HALF_UP)),
                bookedHours(actor, f), t.receiptCount, t.refundCount, t.anomalies);
    }

    private record Totals(long created, long paid, long customers, long returningCustomers,
                          BigDecimal received, BigDecimal refunded, long receiptCount, long refundCount, long anomalies) {}

    /** Read all prior cash events for affected bookings so period refunds reverse the correct original fees. */
    public Earnings earnings(long actor, AnalyticsFilter filter) {
        var p = params(actor, filter);
        String candidates = " SELECT DISTINCT booking_id FROM events WHERE " + PERIOD
                + " AND kind IN ('PAYMENT','REFUND') ";
        var bases = jdbc.query(SCOPE + "SELECT id, booking_currency, final_price, tax_amount, platform_fee_amount, service_fee_amount FROM scope WHERE id IN ("
                + candidates + ")", p, (rs, row) -> new Basis(rs.getLong("id"), rs.getString("booking_currency"),
                rs.getBigDecimal("final_price"), rs.getBigDecimal("tax_amount"), rs.getBigDecimal("platform_fee_amount"), rs.getBigDecimal("service_fee_amount")));
        var events = jdbc.query(SCOPE + """
                SELECT e.booking_id,e.event_id,e.kind,e.occurred_at,e.received,e.refunded,e.reconciliation_status,e.booking_issue,
                       p.amount expected_amount, COALESCE(p.id,r.payment_transaction_id) payment_id
                FROM events e LEFT JOIN payment_transaction p ON e.event_id=CONCAT('PAYMENT-',p.id)
                LEFT JOIN refund_request r ON e.event_id=CONCAT('REFUND-',r.id)
                WHERE e.occurred_at < :end AND e.kind IN ('PAYMENT','REFUND') AND e.booking_id IN (
                """ + candidates + ")", p, (rs, row) -> new Event(rs.getLong("booking_id"), rs.getString("event_id"),
                rs.getString("kind"), rs.getTimestamp("occurred_at").toLocalDateTime(),
                rs.getBigDecimal("received").add(rs.getBigDecimal("refunded")), rs.getBigDecimal("expected_amount"),
                rs.getString("reconciliation_status"), rs.getInt("booking_issue") != 0, rs.getLong("payment_id")));
        var allocation = OrganizerEarningsCalculator.calculate(bases, events, filter.start(), filter.end());
        long issues = allocation.excludedBookings() + invalidFinancialRecords(actor, filter)
                + paymentReview(actor, filter).overRefundedPayments();
        var payouts = jdbc.query(SCOPE + """
                SELECT o.status,o.payout_amount,o.paid_at,o.payout_reference,b.booking_currency
                FROM organizer_payout o JOIN scope b ON b.id=o.booking_id
                WHERE o.organizer_id=:actor AND o.created_at < :end
                """, p, (rs, row) -> new Payout(rs.getString("status"), rs.getBigDecimal("payout_amount"),
                rs.getTimestamp("paid_at") == null ? null : rs.getTimestamp("paid_at").toLocalDateTime(),
                rs.getString("payout_reference"), rs.getString("booking_currency")));
        BigDecimal transferred = BigDecimal.ZERO;
        boolean invalidTransfer = false;
        for (var payout : payouts) {
            if (!"PAID".equals(payout.status())) continue;
            if (payout.at() == null) { invalidTransfer = true; continue; }
            if (payout.at().isBefore(filter.start()) || !payout.at().isBefore(filter.end())) continue;
            if (!"VND".equals(payout.currency()) || payout.amount() == null || payout.amount().signum() < 0
                    || payout.reference() == null || payout.reference().isBlank()) invalidTransfer = true;
            else transferred = transferred.add(payout.amount());
        }
        BigDecimal cash = events.stream().filter(e -> !e.at().isBefore(filter.start()))
                .map(e -> "REFUND".equals(e.kind()) ? e.amount().negate() : e.amount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal retainedGross = allocation.rental().add(allocation.vat());
        return new Earnings(issues == 0 ? money(allocation.rental()) : null,
                issues == 0 ? money(allocation.vat()) : null, issues == 0 ? money(allocation.fee()) : null,
                issues == 0 ? money(allocation.organizer()) : null, issues == 0 ? money(allocation.rentalEarnings()) : null,
                issues == 0 ? money(cash.subtract(retainedGross)) : null,
                payouts.isEmpty() || invalidTransfer ? null : money(transferred), !payouts.isEmpty(), issues);
    }

    private record Payout(String status, BigDecimal amount, java.time.LocalDateTime at, String reference, String currency) {}

    private long count(List<StatusCount> statuses, String status) {
        return statuses.stream().filter(s -> s.status().equals(status)).mapToLong(StatusCount::count).sum();
    }

    public List<StatusCount> statuses(long actor, AnalyticsFilter f) {
        return jdbc.query(SCOPE + "SELECT status, COUNT(*) n FROM scope WHERE created_at >= :start AND created_at < :end GROUP BY status",
                params(actor, f), (rs, row) -> new StatusCount(rs.getString("status"), rs.getLong("n")));
    }

    public List<Trend> trends(long actor, AnalyticsFilter f) {
        return jdbc.query(SCOPE + """
                SELECT CAST(occurred_at AS DATE) event_day, SUM(created_count) created_count, SUM(paid_count) paid_count,
                       SUM(received) received, SUM(refunded) refunded
                FROM events WHERE
                """ + PERIOD + " GROUP BY CAST(occurred_at AS DATE) ORDER BY event_day", params(actor, f),
                (rs, row) -> new Trend(rs.getDate("event_day").toLocalDate(), rs.getLong("created_count"), rs.getLong("paid_count"),
                        money(rs.getBigDecimal("received")), money(rs.getBigDecimal("refunded")),
                        money(rs.getBigDecimal("received").subtract(rs.getBigDecimal("refunded")))));
    }

    public enum Dimension { WORKSPACE, TYPE, RESOURCE }

    public List<Ranking> rankings(long actor, AnalyticsFilter f, Dimension dimension) {
        String id = switch (dimension) { case WORKSPACE -> "workspace_id"; case TYPE -> "type_id"; case RESOURCE -> "resource_id"; };
        String name = switch (dimension) { case WORKSPACE -> "workspace_name"; case TYPE -> "type_name"; case RESOURCE -> "resource_name"; };
        // Identifiers come exclusively from the enum above; filter values remain bound parameters.
        return jdbc.query(SCOPE + "SELECT " + id + " id, " + name + " name, SUM(paid_count) paid_count, "
                        + "SUM(received) received, SUM(refunded) refunded FROM events WHERE " + PERIOD
                        + " GROUP BY " + id + ", " + name
                        + " HAVING SUM(paid_count) > 0 OR SUM(received) <> 0 OR SUM(refunded) <> 0"
                        + " ORDER BY SUM(received)-SUM(refunded) DESC, " + id,
                params(actor, f), (rs, row) -> new Ranking(rs.getLong("id"), rs.getString("name"), rs.getLong("paid_count"),
                        money(rs.getBigDecimal("received")), money(rs.getBigDecimal("refunded")),
                        money(rs.getBigDecimal("received").subtract(rs.getBigDecimal("refunded")))));
    }

    /** Duration is clipped to the selected period and requires a received payment. */
    private static final String RENTALS = """
            SELECT GREATEST(b.start_time, :start) starts, LEAST(b.end_time, :end) ends
            FROM scope b JOIN first_paid p ON p.booking_id = b.id
            WHERE b.status IN ('CONFIRMED','CHECKED_IN','COMPLETED','NO_SHOW')
              AND b.start_time < :end AND b.end_time > :start
            """;

    public String bookedHours(long actor, AnalyticsFilter f) {
        BigDecimal microseconds = jdbc.queryForObject(SCOPE + " SELECT COALESCE(SUM(TIMESTAMPDIFF(MICROSECOND, starts, ends)),0) FROM ("
                + RENTALS + ") rentals", params(actor, f), BigDecimal.class);
        return microseconds.divide(BigDecimal.valueOf(3_600_000_000L), 4, RoundingMode.HALF_UP).toPlainString();
    }

    /** At most 8,784 hourly buckets; recursive CTE depth is avoided with a digit cross join. */
    public List<HeatCell> heatmap(long actor, AnalyticsFilter f) {
        return jdbc.query(SCOPE + """
                , digits AS (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9),
                hours AS (
                    SELECT TIMESTAMPADD(HOUR, a.n + 10*b.n + 100*c.n + 1000*d.n, CAST(:start AS DATETIME)) hour_start
                    FROM digits a CROSS JOIN digits b CROSS JOIN digits c CROSS JOIN digits d
                    WHERE a.n + 10*b.n + 100*c.n + 1000*d.n < TIMESTAMPDIFF(HOUR, CAST(:start AS DATETIME), CAST(:end AS DATETIME))
                ), rentals AS (
                """ + RENTALS + """
                ) SELECT WEEKDAY(h.hour_start)+1 weekday_no, HOUR(h.hour_start) hour_of_day,
                         SUM(TIMESTAMPDIFF(MICROSECOND, GREATEST(r.starts,h.hour_start),
                             LEAST(r.ends,TIMESTAMPADD(HOUR,1,h.hour_start)))) microseconds
                FROM hours h JOIN rentals r ON r.starts < TIMESTAMPADD(HOUR,1,h.hour_start) AND r.ends > h.hour_start
                GROUP BY WEEKDAY(h.hour_start)+1, HOUR(h.hour_start)
                """, params(actor, f), (rs, row) -> new HeatCell(rs.getInt("weekday_no"), rs.getInt("hour_of_day"),
                rs.getBigDecimal("microseconds").divide(BigDecimal.valueOf(3_600_000_000L), 4, RoundingMode.HALF_UP).toPlainString()));
    }

    public Ledger ledger(long actor, AnalyticsFilter f, int page, int size, String kind) {
        var p = params(actor, f).addValue("limit", size).addValue("offset", (page-1)*size).addValue("kind", kind);
        String where = " FROM events WHERE " + PERIOD
                + " AND kind IN ('PAYMENT','REFUND') AND (:kind IS NULL OR kind = :kind) ";
        long total = jdbc.queryForObject(SCOPE + " SELECT COUNT(*)" + where, p, Long.class);
        var rows = jdbc.query(SCOPE + " SELECT *" + where + " ORDER BY occurred_at DESC, event_id DESC LIMIT :limit OFFSET :offset",
                p, (rs, row) -> new LedgerRow(rs.getString("event_id"), rs.getString("kind"),
                        rs.getTimestamp("occurred_at").toLocalDateTime(), rs.getLong("booking_id"),
                        rs.getString("booking_code"), rs.getString("booking_status"), rs.getString("workspace_name"),
                        rs.getString("resource_name"), money(rs.getString("kind").equals("REFUND")
                                ? rs.getBigDecimal("refunded").negate() : rs.getBigDecimal("received")),
                        rs.getString("reconciliation_status")));
        return new Ledger(rows, total, page, size);
    }

    public Options options(long actor) {
        var p = new MapSqlParameterSource("actor", actor);
        return new Options(jdbc.query("SELECT id,name FROM workspace WHERE organizer_id=:actor ORDER BY name,id", p,
                (rs, row) -> new Option(rs.getLong("id"),rs.getString("name"))),
                jdbc.query("SELECT f.workspace_id,f.floor_number FROM floor_plan f JOIN workspace w ON w.id=f.workspace_id WHERE w.organizer_id=:actor ORDER BY f.workspace_id,f.floor_number", p,
                        (rs, row) -> new FloorOption(rs.getLong("workspace_id"),rs.getInt("floor_number"))),
                jdbc.query("SELECT t.id,t.workspace_id,t.name,t.category FROM resource_type t JOIN workspace w ON w.id=t.workspace_id WHERE w.organizer_id=:actor ORDER BY t.name,t.id", p,
                        (rs, row) -> new TypeOption(rs.getLong("id"),rs.getLong("workspace_id"),rs.getString("name"),rs.getString("category"))));
    }

    public long invalidFinancialRecords(long actor, AnalyticsFilter f) {
        // Invalid events cannot safely be assigned to a period, so flag them across the selected scope.
        return jdbc.queryForObject(SCOPE + """
                SELECT (SELECT COUNT(*) FROM payment_transaction p JOIN scope b ON b.id=p.booking_id
                    WHERE (p.status='SUCCESS' AND (p.paid_at IS NULL OR p.received_amount IS NULL OR p.received_amount <= 0))
                       OR (p.status <> 'SUCCESS' AND p.received_amount <> 0))
                     + (SELECT COUNT(*) FROM refund_request r JOIN scope b ON b.id=r.booking_id
                    WHERE r.status='PROCESSED' AND (r.processed_at IS NULL OR r.approved_amount IS NULL OR r.approved_amount < 0
                        OR b.booking_currency IS NULL OR b.booking_currency <> 'VND'
                        OR NOT EXISTS (SELECT 1 FROM payment_transaction p WHERE p.id=r.payment_transaction_id AND p.booking_id=b.id)))
                """, params(actor, f), Long.class);
    }

    public record PaymentReview(long unresolvedDuplicates, long refundedDuplicates, long overRefundedPayments) {}

    /** Uses only events before the report's end: later payments/refunds cannot resolve an earlier report. */
    public PaymentReview paymentReview(long actor, AnalyticsFilter f) {
        return jdbc.queryForObject(SCOPE + """
                , refund_totals AS (
                    SELECT p.id payment_id, p.booking_id, SUM(r.approved_amount) refunded,
                           MAX(r.processed_at) last_refunded
                    FROM refund_request r JOIN scope b ON b.id=r.booking_id
                    JOIN payment_transaction p ON p.id=r.payment_transaction_id AND p.booking_id=b.id
                    WHERE r.status='PROCESSED' AND r.approved_amount >= 0 AND r.processed_at < :end
                      AND b.booking_currency='VND'
                    GROUP BY p.id,p.booking_id
                ), payment_groups AS (
                    SELECT p.booking_id, COUNT(*) n, SUM(p.received_amount) received,
                           MIN(p.amount) min_expected, MAX(p.amount) expected,
                           SUM(COALESCE(r.refunded,0)) refunded,
                           SUM(CASE WHEN p.amount IS NULL OR p.amount <= 0
                                    OR p.received_amount <> p.amount
                                    OR p.reconciliation_status IS NULL OR p.reconciliation_status <> 'MATCHED'
                                    OR COALESCE(r.refunded,0) > p.received_amount THEN 1 ELSE 0 END) issues,
                           MAX(p.paid_at) last_paid, MAX(r.last_refunded) last_refunded
                    FROM receipts p LEFT JOIN refund_totals r ON r.payment_id=p.id
                    WHERE p.paid_at < :end GROUP BY p.booking_id
                ), duplicates AS (
                    SELECT CASE WHEN issues=0 AND min_expected=expected
                                AND refunded >= received-expected AND refunded <= received THEN 1 ELSE 0 END resolved
                    FROM payment_groups WHERE n>1 AND (last_paid >= :start OR last_refunded >= :start)
                )
                SELECT COALESCE(SUM(CASE WHEN resolved=0 THEN 1 ELSE 0 END),0) unresolved,
                       COALESCE(SUM(resolved),0) resolved,
                       (SELECT COUNT(*) FROM refund_totals r JOIN payment_transaction p ON p.id=r.payment_id
                        WHERE r.last_refunded >= :start AND p.received_amount IS NOT NULL
                          AND p.received_amount >= 0 AND r.refunded > p.received_amount) over_refunded
                FROM duplicates
                """, params(actor, f), (rs,row) -> new PaymentReview(rs.getLong("unresolved"),rs.getLong("resolved"),rs.getLong("over_refunded")));
    }

    public long duplicatePayments(long actor, AnalyticsFilter f) {
        return paymentReview(actor,f).unresolvedDuplicates();
    }

    public static String money(BigDecimal amount) { return amount.setScale(2, RoundingMode.HALF_UP).toPlainString(); }
}
