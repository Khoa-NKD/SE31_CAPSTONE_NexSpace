package base.api.feature.pricing;

import base.api.feature.pricing.service.PricingAdjustments;
import base.api.shared.entity.pricing.PricingRuleModel;
import base.api.shared.entity.resource.*;
import base.api.shared.enums.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PricingAdjustmentsTest {
    private final LocalDateTime monday=LocalDateTime.of(2026,11,23,9,0);
    private BookableResourceModel resource() {var r=new BookableResourceModel();r.setId(1L);var t=new ResourceTypeModel();t.setId(2L);r.setResourceType(t);return r;}
    private PricingRuleModel rule(long id,String multiplier,String extra){var r=new PricingRuleModel();r.setId(id);r.setActive(true);r.setModifierType(PricingModifierType.CUSTOM);r.setMultiplier(new BigDecimal(multiplier));r.setFixedAmount(new BigDecimal(extra));return r;}
    @Test void peakRuleOnlyChargesTheMatchingPortion() {
        var rule=rule(1,"1.50","10000");rule.setStartTime(LocalTime.of(10,0));rule.setEndTime(LocalTime.of(11,0));
        // A 4-hour base of 400,000 contains one matching hour: +50,000 +10,000.
        assertThat(PricingAdjustments.surcharge(List.of(rule),resource(),monday,monday.plusHours(4),new BigDecimal("400000"))).isEqualByComparingTo("60000.00");
    }
    @Test void outsideScopeWeekendAndInactiveRulesDoNotLeak() {
        var weekend=rule(1,"2","0");weekend.setModifierType(PricingModifierType.WEEKEND);
        var foreign=rule(2,"4","0");var other=new ResourceTypeModel();other.setId(99L);foreign.setResourceType(other);
        var inactive=rule(3,"5","0");inactive.setActive(false);
        assertThat(PricingAdjustments.surcharge(List.of(weekend,foreign,inactive),resource(),monday,monday.plusHours(1),new BigDecimal("100000"))).isEqualByComparingTo("0.00");
    }
    @Test void specificityWinsThenPriorityWithoutStacking() {
        var broad=rule(1,"2","0");broad.setPriority(100);
        var type=rule(2,"1.50","0");type.setResourceType(resource().getResourceType());
        var exact=rule(3,"1.10","0");exact.setResource(resource());
        var later=rule(4,"1.20","0");later.setResource(resource());later.setPriority(2);
        assertThat(PricingAdjustments.surcharge(List.of(broad,type,exact,later),resource(),monday,monday.plusHours(1),new BigDecimal("100000"))).isEqualByComparingTo("20000.00");
    }
    @Test void overnightWeekendBoundaryIsSplitAndEndIsExclusive() {
        var weekend=rule(1,"2","0");weekend.setModifierType(PricingModifierType.WEEKEND);
        var friday=LocalDateTime.of(2026,11,20,23,0);
        assertThat(PricingAdjustments.surcharge(List.of(weekend),resource(),friday,friday.plusHours(2),new BigDecimal("200000"))).isEqualByComparingTo("100000.00");
        assertThat(PricingAdjustments.surcharge(List.of(weekend),resource(),friday,friday.plusHours(1),new BigDecimal("100000"))).isEqualByComparingTo("0.00");
    }
    @Test void holidayRequiresExplicitDatesAndFinalRoundingOccursOnce() {
        var holiday=rule(1,"1","1");holiday.setModifierType(PricingModifierType.HOLIDAY);
        assertThat(PricingAdjustments.surcharge(List.of(holiday),resource(),monday,monday.plusMinutes(10),BigDecimal.TEN)).isEqualByComparingTo("0");
        holiday.setStartDate(monday.toLocalDate());holiday.setEndDate(monday.toLocalDate());
        assertThat(PricingAdjustments.surcharge(List.of(holiday),resource(),monday,monday.plusMinutes(10),BigDecimal.TEN)).isEqualByComparingTo("0.17");
    }
}
