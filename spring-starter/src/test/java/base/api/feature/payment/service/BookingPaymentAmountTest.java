package base.api.feature.payment.service;

import base.api.shared.entity.booking.BookingModel;
import base.api.shared.exception.BadRequestException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class BookingPaymentAmountTest {
    @Test void lowVndPriceIsNotMistakenForUsd() {
        assertThat(BookingPaymentAmount.inVnd(booking("500","VND"),25450)).isEqualByComparingTo("500");
    }
    @Test void largeUsdPriceIsStillConvertedUsingFrozenCurrency() {
        assertThat(BookingPaymentAmount.inVnd(booking("1500","USD"),25450)).isEqualByComparingTo("38175000");
        assertThat(BookingPaymentAmount.inVnd(booking("10","USD"),25450)).isEqualByComparingTo("255000");
    }
    @Test void missingCurrencyCannotSilentlyChargeInTheWrongUnit() {
        var missing = booking("10","VND"); missing.setPricingSnapshot("{}");
        assertThatThrownBy(() -> BookingPaymentAmount.inVnd(missing,25450)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> BookingPaymentAmount.inVnd(booking("10","EUR"),25450)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> BookingPaymentAmount.inVnd(booking("10","USD"),0)).isInstanceOf(BadRequestException.class);
    }
    @Test void convertedAmountsMustFitTheSettlementColumnAndRemainPositive() {
        assertThatThrownBy(() -> BookingPaymentAmount.inVnd(booking("0.001","USD"),25450)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> BookingPaymentAmount.inVnd(booking("9999999999999999","USD"),25450)).isInstanceOf(BadRequestException.class);
    }
    private BookingModel booking(String price,String currency) {
        var b = new BookingModel(); b.setFinalPrice(new BigDecimal(price)); b.setPricingSnapshot("{\"currency\":\""+currency+"\"}"); return b;
    }
}
