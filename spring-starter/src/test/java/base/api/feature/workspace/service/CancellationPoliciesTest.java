package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.response.CancellationRuleDto;
import base.api.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class CancellationPoliciesTest {
    private static CancellationRuleDto rule(String hour, String percent) { return new CancellationRuleDto(new BigDecimal(hour),new BigDecimal(percent)); }
    private final LocalDateTime start = LocalDateTime.parse("2030-01-02T12:00:00");

    @Test void agreedDefaultsCoverAllPreStartIntervalsWithoutRoundingHours() {
        var rules=CancellationPolicies.defaults();
        assertThat(rules).hasSize(3);
        assertThat(CancellationPolicies.refundPercent(rules,start.minusHours(24),start)).isEqualByComparingTo("100");
        assertThat(CancellationPolicies.refundPercent(rules,start.minusHours(24).plusNanos(1),start)).isEqualByComparingTo("50");
        assertThat(CancellationPolicies.refundPercent(rules,start.minusHours(12),start)).isEqualByComparingTo("50");
        assertThat(CancellationPolicies.refundPercent(rules,start.minusHours(12).plusNanos(1),start)).isEqualByComparingTo("50");
        assertThat(CancellationPolicies.refundPercent(rules,start.minusHours(2),start)).isEqualByComparingTo("50");
        assertThat(CancellationPolicies.refundPercent(rules,start.minusHours(2).plusNanos(1),start)).isZero();
        assertThat(CancellationPolicies.refundPercent(rules,start,start)).isZero();
        assertThat(CancellationPolicies.refundPercent(rules,start.plusMinutes(1),start)).isZero();
    }
    @Test void rejectsEmptyDuplicateFractionalNegativeAndNonMonotonicTiers() {
        assertThatThrownBy(()->CancellationPolicies.validate(null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(()->CancellationPolicies.validate(List.of())).isInstanceOf(BadRequestException.class);
        for(var rows:List.of(List.of(rule("1","50"),rule("1","75")),List.of(rule("1.5","50")),
                List.of(rule("-1","50")),List.of(rule("24","50"),rule("12","100")),
                List.of(rule("2","101")),List.of(rule("2","-1")),List.of(rule("2","50.001"))))
            assertThatThrownBy(()->CancellationPolicies.validate(rows)).isInstanceOf(BadRequestException.class);
    }
    @Test void validatesCanonicalOrderWithoutMutatingTheCallerOrLosingRatePrecision() {
        var input=new ArrayList<>(List.of(rule("0","0"),rule("12","33.33"),rule("24","100")));
        var output=CancellationPolicies.validate(input);
        assertThat(input.get(0).minHoursBeforeStart()).isZero();
        assertThat(output.get(0).minHoursBeforeStart()).isEqualByComparingTo("24");
        assertThat(output.get(1).refundPercent()).isEqualByComparingTo("33.33");
    }
    @Test void legacyEmptySnapshotIsNotReplacedWithNewDefaultsAndMissingSnapshotsAreNotGuessed() {
        assertThat(CancellationPolicies.readSnapshot("[]")).isEmpty();
        assertThat(CancellationPolicies.refundPercent(CancellationPolicies.readSnapshot("[]"),start.minusDays(2),start)).isZero();
        for(String value:new String[]{"", "invalid", "null", "{}", "[{\"minHoursBeforeStart\":1.5,\"refundPercent\":50}]"})
            assertThatThrownBy(()->CancellationPolicies.readSnapshot(value)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(()->CancellationPolicies.readSnapshot(null)).isInstanceOf(BadRequestException.class);
    }
    @Test void aSavedSnapshotKeepsItsOriginalRateAfterWorkspaceSettingsChange() {
        var snapshot=CancellationPolicies.readSnapshot("[{\"minHoursBeforeStart\":12,\"refundPercent\":75}]");
        var changed=CancellationPolicies.validate(List.of(rule("12","25")));
        assertThat(CancellationPolicies.refundPercent(snapshot,start.minusHours(18),start)).isEqualByComparingTo("75");
        assertThat(CancellationPolicies.refundPercent(changed,start.minusHours(18),start)).isEqualByComparingTo("25");
    }
    @Test void explicitlyConfiguredZeroHourTierWorksBeforeButNeverAfterTheStart() {
        var rules=CancellationPolicies.validate(List.of(rule("0","50")));
        assertThat(CancellationPolicies.refundPercent(rules,start.minusSeconds(1),start)).isEqualByComparingTo("50");
        assertThat(CancellationPolicies.refundPercent(rules,start,start)).isZero();
    }
}
