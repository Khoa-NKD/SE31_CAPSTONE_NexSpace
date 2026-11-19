package base.api.feature.operations.dto;

import base.api.shared.enums.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public final class OperationsDtos {
    private OperationsDtos() {}

    public record Resource(Long id, String code, String name, Long typeId, String typeName,
            ResourceCategory category, int floorNumber, BookableResourceStatus status,
            Long parentRoomId, ResourceCurrency currency, String hourlyPrice, String dailyPrice) {}
    public record RateType(Long id, String name, ResourceCategory category, ResourceCurrency currency,
            String hourlyPrice, String dailyPrice, String monthlyPrice, boolean active) {}
    public record Pricing(List<RateType> types, List<Resource> resources, List<Rule> rules) {}
    public record Rule(Long id, String name, Long resourceTypeId, Long resourceId,
            PricingModifierType modifierType, LocalDate startDate, LocalDate endDate,
            LocalTime startTime, LocalTime endTime, String multiplier, String fixedAmount,
            int priority, boolean active) {}
    public record RuleInput(@NotBlank @Size(max=100) String name, @Positive Long resourceTypeId,
            @Positive Long resourceId, @NotNull PricingModifierType modifierType,
            LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime,
            @NotNull @DecimalMin("1.00") @DecimalMax("999.99") @Digits(integer=3,fraction=2) BigDecimal multiplier,
            @NotNull @DecimalMin("0") @Digits(integer=16,fraction=2) BigDecimal fixedAmount,
            @Min(0) @Max(10000) int priority, boolean active) {}
    public record Block(Long id, Long resourceId, String resourceName, int floorNumber,
            Long parentRoomId, ResourceBlockType blockType, LocalDateTime startTime,
            LocalDateTime endTime, String reason) {}
    public record BlockInput(@NotEmpty @Size(max=200) List<@NotNull @Positive Long> resourceIds,
            @NotNull LocalDateTime startTime, @NotNull LocalDateTime endTime,
            @NotNull ResourceBlockType blockType, @NotBlank @Size(max=255) String reason) {}
}
