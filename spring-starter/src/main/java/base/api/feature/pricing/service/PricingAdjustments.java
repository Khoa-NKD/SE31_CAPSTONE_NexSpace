package base.api.feature.pricing.service;

import base.api.shared.entity.pricing.PricingRuleModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.enums.PricingModifierType;
import java.math.*;
import java.time.*;
import java.util.*;

/** Apply one most-specific rule per time segment; equal scopes resolve by priority, then stable ID. */
public final class PricingAdjustments {
    private PricingAdjustments() {}
    public static BigDecimal surcharge(List<PricingRuleModel> rules, BookableResourceModel resource,
            LocalDateTime start, LocalDateTime end, BigDecimal baseAmount) {
        if (!start.isBefore(end)) return BigDecimal.ZERO.setScale(2);
        var eligible = rules.stream().filter(PricingRuleModel::isActive).filter(r -> inScope(r, resource)).toList();
        var boundaries = new TreeSet<LocalDateTime>();
        boundaries.add(start); boundaries.add(end);
        for (var date=start.toLocalDate(); !date.isAfter(end.toLocalDate()); date=date.plusDays(1)) {
            add(boundaries, date.atStartOfDay(), start, end);
            for (var r : eligible) {
                if (r.getStartTime()!=null) add(boundaries, date.atTime(r.getStartTime()), start, end);
                if (r.getEndTime()!=null) add(boundaries, date.atTime(r.getEndTime()), start, end);
            }
        }
        var points = new ArrayList<>(boundaries);
        BigDecimal result = BigDecimal.ZERO;
        var totalSeconds = BigDecimal.valueOf(Duration.between(start,end).getSeconds());
        if (totalSeconds.signum() <= 0) return BigDecimal.ZERO.setScale(2);
        for (int i=0;i<points.size()-1;i++) {
            var a=points.get(i); var b=points.get(i+1);
            var chosen=eligible.stream().filter(r -> matches(r,a))
                    .max(Comparator.comparingInt(PricingAdjustments::specificity)
                            .thenComparingInt(PricingRuleModel::getPriority)
                            .thenComparing(r -> r.getId()==null ? 0L : -r.getId())).orElse(null);
            if (chosen==null) continue;
            var seconds=BigDecimal.valueOf(Duration.between(a,b).getSeconds());
            var multiplier=chosen.getMultiplier()==null ? BigDecimal.ONE : chosen.getMultiplier();
            var fixed=chosen.getFixedAmount()==null ? BigDecimal.ZERO : chosen.getFixedAmount();
            result=result.add(baseAmount.multiply(seconds).divide(totalSeconds,12,RoundingMode.HALF_UP)
                    .multiply(multiplier.subtract(BigDecimal.ONE)))
                    .add(fixed.multiply(seconds).divide(BigDecimal.valueOf(3600),12,RoundingMode.HALF_UP));
        }
        return result.setScale(2,RoundingMode.HALF_UP);
    }
    private static void add(Set<LocalDateTime> points, LocalDateTime point, LocalDateTime start, LocalDateTime end) {
        if (point.isAfter(start) && point.isBefore(end)) points.add(point);
    }
    private static int specificity(PricingRuleModel r) { return r.getResource()!=null ? 2 : r.getResourceType()!=null ? 1 : 0; }
    private static boolean inScope(PricingRuleModel r, BookableResourceModel resource) {
        if (r.getResource()!=null) return Objects.equals(r.getResource().getId(),resource.getId());
        return r.getResourceType()==null || resource.getResourceType()!=null
                && Objects.equals(r.getResourceType().getId(),resource.getResourceType().getId());
    }
    private static boolean matches(PricingRuleModel r, LocalDateTime time) {
        var day=time.toLocalDate(); var hour=time.toLocalTime();
        if (r.getStartDate()!=null && day.isBefore(r.getStartDate())) return false;
        if (r.getEndDate()!=null && day.isAfter(r.getEndDate())) return false;
        if (r.getStartTime()!=null && hour.isBefore(r.getStartTime())) return false;
        if (r.getEndTime()!=null && !hour.isBefore(r.getEndTime())) return false;
        if (r.getModifierType()==PricingModifierType.WEEKEND
                && day.getDayOfWeek()!=DayOfWeek.SATURDAY && day.getDayOfWeek()!=DayOfWeek.SUNDAY) return false;
        // Holidays use explicit dates; never guess a country's holiday calendar.
        return r.getModifierType()!=PricingModifierType.HOLIDAY || r.getStartDate()!=null && r.getEndDate()!=null;
    }
}
