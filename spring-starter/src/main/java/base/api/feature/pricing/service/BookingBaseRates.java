package base.api.feature.pricing.service;

import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.enums.PriceType;
import base.api.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

/** Shared base-rate calculation for price previews, direct bookings and resource holds. */
public final class BookingBaseRates {
    private BookingBaseRates() {}
    public record Quote(PriceType priceType, BigDecimal unitPrice, BigDecimal durationHours, BigDecimal baseAmount) {}

    public static PriceType supported(PriceType requested) {
        if (requested == PriceType.MONTHLY)
            throw new BadRequestException("Chưa hỗ trợ đặt theo tháng. Vui lòng chọn giá giờ hoặc giá ngày.");
        return requested == null ? PriceType.HOURLY : requested;
    }

    public static Quote quote(BookableResourceModel resource, LocalDateTime start, LocalDateTime end, PriceType requested) {
        var priceType = supported(requested);
        if (start == null || end == null || !start.isBefore(end))
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        var type = resource.getResourceType();
        var unitPrice = priceType == PriceType.DAILY
                ? type == null ? null : type.getPricePerDay()
                : resource.getPricePerHour() != null ? resource.getPricePerHour()
                    : type == null ? null : type.getPricePerHour();
        if (unitPrice == null || unitPrice.signum() <= 0)
            throw new BadRequestException(priceType == PriceType.DAILY
                    ? "Ghế/phòng này chưa có giá ngày hợp lệ. Vui lòng chọn giá giờ."
                    : "Ghế/phòng này chưa có giá giờ hợp lệ. Vui lòng chọn loại giá khác.");
        var duration = Duration.between(start, end);
        var seconds = BigDecimal.valueOf(duration.getSeconds()).add(BigDecimal.valueOf(duration.getNano(), 9));
        var hours = seconds.divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP);
        BigDecimal base;
        if (priceType == PriceType.DAILY) {
            long days = duration.toDays();
            // Compare the whole Duration so even one nanosecond beyond 24h starts the next day.
            if (!duration.equals(Duration.ofDays(days))) days++;
            base = unitPrice.multiply(BigDecimal.valueOf(days)).setScale(2, RoundingMode.HALF_UP);
        } else {
            // Round the monetary amount once instead of multiplying a rounded display duration.
            base = unitPrice.multiply(seconds).divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP);
        }
        return new Quote(priceType, unitPrice, hours, base);
    }
}
