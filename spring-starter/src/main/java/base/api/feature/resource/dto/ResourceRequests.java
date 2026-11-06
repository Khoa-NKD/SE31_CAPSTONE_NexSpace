package base.api.feature.resource.dto;

import base.api.shared.enums.*;

import com.fasterxml.jackson.annotation.JsonAnySetter;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Explicit write allowlists prevent clients from changing ownership, state or historical totals.
 */
public final class ResourceRequests {
    private ResourceRequests() {}

    public record Input(
            @NotNull @Positive Long floorPlanId,
            @NotNull @Positive Long resourceTypeId,
            @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{0,49}")
                    String code,
            @NotBlank @Size(max = 150) String name,
            @Size(max = 100) String zoneName,
            NoiseLevel noiseLevel,
            @Min(1) @Max(10000) Integer capacityOverride,
            @DecimalMin("0.01") @Digits(integer = 16, fraction = 2) BigDecimal pricePerHour,
            @Size(max = 1000) String description,
            @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal posX,
            @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal posY,
            @DecimalMin("0.01") @Digits(integer = 6, fraction = 2) BigDecimal width,
            @DecimalMin("0.01") @Digits(integer = 6, fraction = 2) BigDecimal height,
            @DecimalMin("0") @DecimalMax("359.99") @Digits(integer = 3, fraction = 2)
                    BigDecimal rotation,
            @Size(max = 100) String expectedRevision,
            @Positive Long parentRoomId) {
        public Input {
            code = trim(code);
            name = trim(name);
            zoneName = trim(zoneName);
            description = trim(description);
        }

        public Input(
                Long floorPlanId,
                Long resourceTypeId,
                String code,
                String name,
                String zoneName,
                NoiseLevel noiseLevel,
                Integer capacityOverride,
                BigDecimal pricePerHour,
                String description,
                BigDecimal posX,
                BigDecimal posY,
                BigDecimal width,
                BigDecimal height,
                BigDecimal rotation,
                String expectedRevision) {
            this(
                    floorPlanId,
                    resourceTypeId,
                    code,
                    name,
                    zoneName,
                    noiseLevel,
                    capacityOverride,
                    pricePerHour,
                    description,
                    posX,
                    posY,
                    width,
                    height,
                    rotation,
                    expectedRevision,
                    null);
        }

        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported resource field");
        }
    }

    public record Status(
            @NotNull BookableResourceStatus status,
            @NotBlank @Size(max = 100) String expectedRevision) {
        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported status field");
        }
    }

    public record Floor(
            @NotBlank @Size(max = 100) String name, @Min(-20) @Max(500) int floorNumber) {
        public Floor {
            name = trim(name);
        }

        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported floor field");
        }
    }

    public record Type(
            @NotBlank @Size(max = 100) String name,
            @NotNull ResourceCategory category,
            @NotNull ResourceCurrency currency,
            @Min(1) @Max(10000) int capacity,
            @DecimalMin("0.01") @Digits(integer = 16, fraction = 2) BigDecimal pricePerHour,
            @DecimalMin("0.01") @Digits(integer = 16, fraction = 2) BigDecimal pricePerDay,
            @DecimalMin("0.01") @Digits(integer = 16, fraction = 2) BigDecimal pricePerMonth,
            @Size(max = 100) String expectedRevision,
            boolean legacyCurrencyConfirmed) {
        public Type {
            name = trim(name);
        }

        public Type(
                String name,
                ResourceCategory category,
                ResourceCurrency currency,
                int capacity,
                BigDecimal pricePerHour,
                BigDecimal pricePerDay,
                BigDecimal pricePerMonth,
                String expectedRevision) {
            this(
                    name,
                    category,
                    currency,
                    capacity,
                    pricePerHour,
                    pricePerDay,
                    pricePerMonth,
                    expectedRevision,
                    false);
        }

        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported resource type field");
        }
    }

    public record Revision(@NotBlank @Size(max = 100) String expectedRevision) {}

    public record ResourceRevision(
            @NotNull @Positive Long id, @NotBlank @Size(max = 100) String revision) {}

    public record PublishFloor(
            @NotBlank @Size(max = 100) String expectedRevision,
            @NotNull @DecimalMin("1") @Digits(integer = 8, fraction = 2) BigDecimal width,
            @NotNull @DecimalMin("1") @Digits(integer = 8, fraction = 2) BigDecimal height,
            @AssertTrue boolean resourcesConfirmed,
            @NotNull @Size(max = 10000)
                    java.util.List<@NotNull @jakarta.validation.Valid ResourceRevision> resources) {
        public PublishFloor {
            resources = resources == null ? null : java.util.List.copyOf(resources);
        }

        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported floor publish field");
        }
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }
}
