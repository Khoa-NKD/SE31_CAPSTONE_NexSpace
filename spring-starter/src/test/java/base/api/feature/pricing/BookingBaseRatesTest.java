package base.api.feature.pricing;

import base.api.feature.pricing.service.BookingBaseRates;
import base.api.shared.entity.resource.*;
import base.api.shared.enums.PriceType;
import base.api.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.time.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;

class BookingBaseRatesTest {
    private final LocalDateTime start=LocalDateTime.of(2026,11,20,10,0);
    private BookableResourceModel resource() {
        var r=new BookableResourceModel();var type=new ResourceTypeModel();
        type.setPricePerDay(new BigDecimal("200000.00"));type.setPricePerHour(new BigDecimal("60000.00"));
        r.setResourceType(type);r.setPricePerHour(new BigDecimal("90000.00"));return r;
    }
    static Stream<Arguments> dailyBoundaries() {return Stream.of(
            Arguments.of(Duration.ofMinutes(30),"200000.00"),
            Arguments.of(Duration.ofHours(23),"200000.00"),
            Arguments.of(Duration.ofHours(24),"200000.00"),
            Arguments.of(Duration.ofHours(24).plusNanos(1),"400000.00"),
            Arguments.of(Duration.ofHours(48),"400000.00"),
            Arguments.of(Duration.ofHours(48).plusNanos(1),"600000.00"));}
    @ParameterizedTest @MethodSource("dailyBoundaries")
    void dailyRatesUseCeilingOfExactTwentyFourHourUnits(Duration duration,String expected) {
        var quote=BookingBaseRates.quote(resource(),start,start.plus(duration),PriceType.DAILY);
        assertThat(quote.baseAmount()).isEqualByComparingTo(expected);
        assertThat(quote.unitPrice()).isEqualByComparingTo("200000.00");
        assertThat(quote.priceType()).isEqualTo(PriceType.DAILY);
    }
    @Test void hourlyRateUsesOverrideAndRoundsMoneyOnlyOnce() {
        var quote=BookingBaseRates.quote(resource(),start,start.plusMinutes(35),PriceType.HOURLY);
        assertThat(quote.baseAmount()).isEqualByComparingTo("52500.00");
        assertThat(quote.unitPrice()).isEqualByComparingTo("90000.00");
    }
    @Test void hourlyFallbackAndSecondsUseActualDuration() {
        var r=resource();r.setPricePerHour(null);
        assertThat(BookingBaseRates.quote(r,start,start.plusMinutes(30).plusSeconds(30),null).baseAmount()).isEqualByComparingTo("30500.00");
    }
    @Test void missingDailyRateCannotCreateFreeBookings() {
        var r=resource();r.getResourceType().setPricePerDay(null);
        assertThatThrownBy(()->BookingBaseRates.quote(r,start,start.plusHours(1),PriceType.DAILY)).isInstanceOf(BadRequestException.class);
        r.getResourceType().setPricePerDay(BigDecimal.ZERO);
        assertThatThrownBy(()->BookingBaseRates.quote(r,start,start.plusHours(1),PriceType.DAILY)).isInstanceOf(BadRequestException.class);
    }
    @Test void monthlyAndInvalidIntervalsAreRejected() {
        assertThatThrownBy(()->BookingBaseRates.quote(resource(),start,start.plusDays(30),PriceType.MONTHLY)).isInstanceOf(BadRequestException.class).hasMessageContaining("tháng");
        assertThatThrownBy(()->BookingBaseRates.quote(resource(),start,start,PriceType.DAILY)).isInstanceOf(BadRequestException.class);
    }
}
