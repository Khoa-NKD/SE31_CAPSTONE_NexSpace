package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.response.CancellationRuleDto;
import base.api.shared.entity.workspace.WorkspaceCancellationRuleModel;
import base.api.shared.exception.BadRequestException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;

/** Shared policy definitions for workspace setup, new booking snapshots and cancellation execution. */
public final class CancellationPolicies {
    private static final ObjectMapper JSON = new ObjectMapper();
    private CancellationPolicies() {}

    public static List<CancellationRuleDto> defaults() {
        return List.of(rule(24,100),rule(2,50),rule(0,0));
    }
    public static String systemSnapshot() {
        try { return JSON.writeValueAsString(defaults()); }
        catch (com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalStateException("Cannot snapshot cancellation policy", ex); }
    }
    private static CancellationRuleDto rule(int hours, int percent) {
        return new CancellationRuleDto(BigDecimal.valueOf(hours), BigDecimal.valueOf(percent));
    }
    public static List<CancellationRuleDto> validate(List<CancellationRuleDto> input) {
        if (input == null || input.isEmpty()) throw new BadRequestException("Chính sách hoàn tiền không được để trống. Hãy thêm mốc hoặc khôi phục mặc định.");
        var seen = new HashSet<Integer>();
        var sorted = new ArrayList<CancellationRuleDto>();
        for (var item : input) {
            if (item == null || item.minHoursBeforeStart() == null || item.refundPercent() == null)
                throw new BadRequestException("Mỗi mốc cần có số giờ và tỷ lệ hoàn tiền.");
            int hours;
            try { hours = item.minHoursBeforeStart().intValueExact(); }
            catch (ArithmeticException ex) { throw new BadRequestException("Số giờ phải là số nguyên hợp lệ."); }
            if (hours < 0 || !seen.add(hours)) throw new BadRequestException("Mốc giờ phải không âm và không được trùng nhau.");
            var rate = item.refundPercent();
            if (rate.signum() < 0 || rate.compareTo(BigDecimal.valueOf(100)) > 0 || rate.stripTrailingZeros().scale() > 2)
                throw new BadRequestException("Tỷ lệ hoàn từ 0 đến 100%, tối đa 2 chữ số thập phân.");
            sorted.add(new CancellationRuleDto(BigDecimal.valueOf(hours), rate.stripTrailingZeros()));
        }
        sorted.sort(Comparator.comparing(CancellationRuleDto::minHoursBeforeStart));
        BigDecimal previous = BigDecimal.ZERO;
        for (var item : sorted) {
            if (item.refundPercent().compareTo(previous) < 0)
                throw new BadRequestException("Hủy càng sớm thì tỷ lệ hoàn không được thấp hơn hủy sát giờ.");
            previous = item.refundPercent();
        }
        sorted.sort(Comparator.comparing(CancellationRuleDto::minHoursBeforeStart).reversed());
        return List.copyOf(sorted);
    }
    public static List<CancellationRuleDto> effective(List<WorkspaceCancellationRuleModel> rows) {
        if (rows == null || rows.isEmpty()) return defaults();
        return validate(rows.stream().map(row -> new CancellationRuleDto(BigDecimal.valueOf(row.getMinHoursBeforeStart()),row.getRefundPercent())).toList());
    }
    public static String snapshot(List<WorkspaceCancellationRuleModel> rows) {
        try { return JSON.writeValueAsString(effective(rows)); }
        catch (com.fasterxml.jackson.core.JsonProcessingException ex) { throw new BadRequestException("Không thể chốt chính sách hoàn tiền cho đơn."); }
    }
    public static List<CancellationRuleDto> readSnapshot(String snapshot) {
        if (snapshot == null || snapshot.isBlank()) throw new BadRequestException("Đơn chưa có chính sách hoàn tiền đã chốt. Vui lòng liên hệ hỗ trợ.");
        try {
            var rows = JSON.readValue(snapshot, new TypeReference<List<CancellationRuleDto>>() {});
            // An existing empty snapshot means no customer refund tiers at booking time. Never replace it retroactively.
            if (rows != null && rows.isEmpty()) return List.of();
            return validate(rows);
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new BadRequestException("Chính sách đã chốt của đơn không hợp lệ. Vui lòng liên hệ hỗ trợ.");
        }
    }
    public static BigDecimal refundPercent(List<CancellationRuleDto> rows, LocalDateTime now, LocalDateTime start) {
        if (!now.isBefore(start)) return BigDecimal.ZERO;
        var remaining = Duration.between(now, start);
        return rows.stream().filter(row -> remaining.compareTo(Duration.ofHours(row.minHoursBeforeStart().longValueExact())) >= 0)
                .findFirst().map(CancellationRuleDto::refundPercent).orElse(BigDecimal.ZERO);
    }
}
