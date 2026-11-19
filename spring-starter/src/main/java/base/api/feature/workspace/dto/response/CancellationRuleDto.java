package base.api.feature.workspace.dto.response;

import java.math.BigDecimal;

/** Numeric fields stay exact until policy validation rejects fractional hour thresholds or invalid rates. */
public record CancellationRuleDto(BigDecimal minHoursBeforeStart, BigDecimal refundPercent) {}
