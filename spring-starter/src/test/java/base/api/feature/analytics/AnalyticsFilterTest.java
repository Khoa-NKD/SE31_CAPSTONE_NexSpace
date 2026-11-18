package base.api.feature.analytics;

import base.api.feature.analytics.dto.AnalyticsFilter;
import base.api.shared.exception.BadRequestException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class AnalyticsFilterTest {
    @Test void comparisonAtEarliestSupportedBoundaryDoesNotRejectAValidPriorPeriod() {
        var filter=new AnalyticsFilter(LocalDate.of(1001,1,1),LocalDate.of(1001,1,1),null,null,null,null);
        assertThat(filter.previous().from()).isEqualTo(LocalDate.of(1000,12,31));
        assertThatThrownBy(()->new AnalyticsFilter(LocalDate.of(1000,1,1),LocalDate.of(1000,1,1),null,null,null,null).previous()).isInstanceOf(BadRequestException.class);
    }
    @Test void wholeLeapYearIsAllowedButOneExtraDayIsNot() {
        var leap=new AnalyticsFilter(LocalDate.of(2024,1,1),LocalDate.of(2024,12,31),null,null,null,null);
        assertThat(java.time.temporal.ChronoUnit.DAYS.between(leap.start(),leap.end())).isEqualTo(366);
        assertThat(java.time.temporal.ChronoUnit.DAYS.between(leap.previous().start(),leap.previous().end())).isEqualTo(366);
        assertThatThrownBy(()->new AnalyticsFilter(leap.from(),leap.to().plusDays(1),null,null,null,null)).isInstanceOf(BadRequestException.class);
    }
    @Test void previousPeriodHasSameLengthAcrossLeapDay() {
        var filter = new AnalyticsFilter(LocalDate.of(2024,3,1),LocalDate.of(2024,3,31),null,null,null,null);
        assertThat(filter.previous().from()).isEqualTo(LocalDate.of(2024,1,30));
        assertThat(filter.previous().to()).isEqualTo(LocalDate.of(2024,2,29));
        assertThat(filter.end()).isEqualTo(LocalDate.of(2024,4,1).atStartOfDay());
    }
    @Test void rejectsInvertedOversizedOrUnscopedFloorFilters() {
        LocalDate start = LocalDate.of(2026,1,1);
        assertThatThrownBy(() -> new AnalyticsFilter(start,start.minusDays(1),null,null,null,null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> new AnalyticsFilter(start,start.plusDays(366),null,null,null,null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> new AnalyticsFilter(start,start,null,1,null,null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> new AnalyticsFilter(start,start,-1L,null,null,null)).isInstanceOf(BadRequestException.class);
    }
}
