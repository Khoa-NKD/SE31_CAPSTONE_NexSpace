package base.api.feature.analytics.service;

import base.api.feature.analytics.dto.AnalyticsFilter;
import base.api.feature.analytics.dto.OrganizerAnalyticsResponse;
import base.api.feature.analytics.dto.OrganizerAnalyticsResponse.*;
import base.api.feature.analytics.repository.OrganizerAnalyticsRepository;
import base.api.feature.analytics.repository.OrganizerAnalyticsRepository.Dimension;
import base.api.shared.exception.BadRequestException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class OrganizerAnalyticsService {
    private final OrganizerAnalyticsRepository repository;

    /** One consistent database snapshot keeps cards, trends and ranking totals reconcilable. */
    public OrganizerAnalyticsResponse report(long actor, AnalyticsFilter filter) {
        repository.requireOwnedWorkspace(actor, filter.workspaceId());
        var previousFilter=filter.previous();
        var summary = repository.summary(actor, filter);
        var notices = new ArrayList<Notice>();
        notices.add(new Notice("EVENT_DATE_BASIS", 0));
        notices.add(new Notice("CURRENT_RESOURCE_CLASSIFICATION", 0));
        notices.add(new Notice("PAYOUT_AND_PROFIT_UNAVAILABLE", 0));
        notices.add(new Notice("HISTORICAL_OCCUPANCY_UNAVAILABLE", 0));
        notices.add(new Notice("BOOKING_STATUS_IS_CURRENT", 0));
        long invalid = repository.invalidFinancialRecords(actor, filter);
        if (invalid > 0) notices.add(new Notice("EXCLUDED_FINANCIAL_RECORDS", invalid));
        var review=repository.paymentReview(actor,filter);
        if (review.unresolvedDuplicates() > 0) notices.add(new Notice("MULTIPLE_SUCCESSFUL_PAYMENTS", review.unresolvedDuplicates()));
        if (review.refundedDuplicates() > 0) notices.add(new Notice("DUPLICATE_PAYMENTS_REFUNDED", review.refundedDuplicates()));
        if (review.overRefundedPayments() > 0) notices.add(new Notice("REFUND_EXCEEDS_RECEIPT", review.overRefundedPayments()));
        if (summary.anomalousReceipts() > 0) notices.add(new Notice("RECEIPTS_NEED_RECONCILIATION", summary.anomalousReceipts()));
        return new OrganizerAnalyticsResponse(filter, "VND", ZoneId.systemDefault().getId(), LocalDateTime.now(),
                summary, repository.summary(actor, previousFilter), repository.trends(actor, filter),
                repository.rankings(actor, filter, Dimension.WORKSPACE),
                repository.rankings(actor, filter, Dimension.TYPE), repository.rankings(actor, filter, Dimension.RESOURCE),
                repository.statuses(actor, filter), repository.heatmap(actor, filter), List.copyOf(notices));
    }

    public Options options(long actor) { return repository.options(actor); }

    public String export(long actor, AnalyticsFilter filter, String kind) {
        repository.requireOwnedWorkspace(actor, filter.workspaceId());
        if (kind != null && !List.of("PAYMENT", "REFUND").contains(kind)) throw new BadRequestException("Loại giao dịch không hợp lệ");
        var ledger = repository.ledger(actor, filter, 1, 50_000, kind);
        if (ledger.total() > 50_000) throw new BadRequestException("Báo cáo vượt 50.000 dòng; hãy thu hẹp khoảng thời gian trước khi xuất");
        StringBuilder csv = new StringBuilder("\uFEFFEvent,Type,Date,Booking,Booking status,Workspace,Resource,Amount (VND),Reconciliation\r\n");
        for (var row : ledger.rows()) {
            csv.append(String.join(",", cell(row.eventId()), cell(row.kind()), cell(row.occurredAt().toString()),
                    cell(row.bookingCode()), cell(row.bookingStatus()), cell(row.workspaceName()), cell(row.resourceName()),
                    row.amount(), cell(row.reconciliationStatus()))).append("\r\n");
        }
        return csv.toString();
    }

    private static String cell(String value) {
        String text = value == null ? "" : value;
        // Spreadsheet programs can execute formulas even inside quoted CSV fields.
        String stripped = text.stripLeading();
        if (!stripped.isEmpty() && "=+@-".indexOf(stripped.charAt(0)) >= 0) text = "'" + text;
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    public Ledger ledger(long actor, AnalyticsFilter filter, int page, int size, String kind) {
        repository.requireOwnedWorkspace(actor, filter.workspaceId());
        if (page < 1 || page > 100_000 || size < 1 || size > 100
                || (kind != null && !List.of("PAYMENT", "REFUND").contains(kind))) {
            throw new BadRequestException("Bộ lọc giao dịch không hợp lệ; mỗi trang tối đa 100 dòng");
        }
        return repository.ledger(actor, filter, page, size, kind);
    }
}
