package base.api.feature.payment.service;

import base.api.shared.entity.booking.BookingModel;
import base.api.shared.exception.BadRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Converts the immutable booking currency, never the resource's current price or a guessed unit. */
public final class BookingPaymentAmount {
    private static final ObjectMapper JSON = new ObjectMapper();
    private BookingPaymentAmount() {}

    public static BigDecimal inVnd(BookingModel booking, long usdToVndRate) {
        String currency;
        try {
            currency = JSON.readTree(booking.getPricingSnapshot()).path("currency").asText();
        } catch (Exception ex) {
            throw new BadRequestException("Đơn đặt chỗ thiếu tiền tệ đã chốt; vui lòng tạo lại đơn hoặc liên hệ hỗ trợ");
        }
        BigDecimal amount = booking.getFinalPrice();
        if (amount == null || amount.signum() <= 0) throw new BadRequestException("Giá trị đơn đặt chỗ không hợp lệ");
        BigDecimal settled = switch (currency) {
            case "VND" -> amount.setScale(0, RoundingMode.HALF_UP);
            case "USD" -> {
                if (usdToVndRate <= 0) throw new BadRequestException("Tỷ giá thanh toán không hợp lệ");
                // Preserve the existing gateway rounding policy for USD payments.
                yield amount.multiply(BigDecimal.valueOf(usdToVndRate))
                        .divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1000));
            }
            default -> throw new BadRequestException("Tiền tệ của đơn đặt chỗ không được hỗ trợ");
        };
        // payment_transaction.amount is DECIMAL(18,2); reject before creating an external payment link.
        if (settled.signum() <= 0 || settled.compareTo(new BigDecimal("9999999999999999")) > 0) {
            throw new BadRequestException("Số tiền quy đổi nằm ngoài phạm vi thanh toán hỗ trợ");
        }
        return settled;
    }
}
