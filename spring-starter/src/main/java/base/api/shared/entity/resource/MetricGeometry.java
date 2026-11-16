package base.api.shared.entity.resource;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Stable model pixels preserve the existing wire contract; metres own persisted geometry. */
public final class MetricGeometry {
    public static final BigDecimal PIXELS_PER_METRE = new BigDecimal("60");
    private MetricGeometry() {}

    public static BigDecimal metres(BigDecimal pixels) {
        return pixels == null ? null : pixels.divide(PIXELS_PER_METRE, 6, RoundingMode.HALF_UP);
    }

    public static BigDecimal pixels(BigDecimal metres) {
        return metres == null ? null : metres.multiply(PIXELS_PER_METRE).setScale(2, RoundingMode.HALF_UP);
    }
}
