package base.api.feature.analytics.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Money is serialized as decimal text to preserve precision in JavaScript clients. */
public record OrganizerAnalyticsResponse(
        AnalyticsFilter filter, String currency, String timestampZone, LocalDateTime generatedAt,
        Summary current, Summary previous, List<Trend> trends,
        List<Ranking> workspaces, List<Ranking> resourceTypes, List<Ranking> resources,
        List<StatusCount> statuses, List<HeatCell> heatmap, List<Notice> notices,
        Earnings earnings, Earnings previousEarnings) {
    /** Period allocations are not proof of a completed bank transfer. Unknown totals remain null. */
    public record Earnings(String rentalAmount, String vatAmount, String platformFeeAmount,
                           String organizerAmount, String rentalEarningsAmount, String unallocatedAmount,
                           String transferredAmount, boolean transferTrackingAvailable, long validationIssues) {}
    public record Summary(long createdBookings, long paidBookings, long payingCustomers,
                          long returningCustomers, long completedBookings, long cancelledBookings,
                          long expiredBookings, long noShowBookings, String receivedAmount,
                          String refundedAmount, String netAmount, String averagePaidBookingValue,
                          String bookedHours, long receiptCount, long refundCount, long anomalousReceipts) {}
    public record Trend(LocalDate date, long createdBookings, long paidBookings,
                        String receivedAmount, String refundedAmount, String netAmount) {}
    public record Ranking(long id, String name, long paidBookings,
                          String receivedAmount, String refundedAmount, String netAmount) {}
    public record StatusCount(String status, long count) {}
    /** These are booked minutes overlapping each calendar-hour cell, not check-in observations. */
    public record HeatCell(int dayOfWeek, int hour, String bookedHours) {}
    public record Notice(String code, long count) {}
    public record Option(long id, String name) {}
    public record FloorOption(long workspaceId, int floorNumber) {}
    public record TypeOption(long id, long workspaceId, String name, String category) {}
    public record Options(List<Option> workspaces, List<FloorOption> floors, List<TypeOption> resourceTypes) {}
    public record LedgerRow(String eventId, String kind, LocalDateTime occurredAt, long bookingId,
                            String bookingCode, String bookingStatus, String workspaceName,
                            String resourceName, String amount, String reconciliationStatus) {}
    public record Ledger(List<LedgerRow> rows, long total, int page, int size) {}
}
