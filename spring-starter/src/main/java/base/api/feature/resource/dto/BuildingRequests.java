package base.api.feature.resource.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public final class BuildingRequests {
    private BuildingRequests() {}
    public record WorkspaceSite(
            @NotBlank @Size(max = 500) String address,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 100) String ward,
            @NotNull @DecimalMin("-90") @DecimalMax("90") @Digits(integer = 2, fraction = 8) BigDecimal latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") @Digits(integer = 3, fraction = 8) BigDecimal longitude,
            @Size(max = 100) String expectedRevision,
            @NotNull @Size(min = 1, max = 100) java.util.List<@NotNull @jakarta.validation.Valid SiteFloor> floors) {}
    public record SiteFloor(
            @NotNull @Min(-20) @Max(500) Integer floorNumber,
            @NotNull @DecimalMin("0.01") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal widthM,
            @NotNull @DecimalMin("0.01") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal lengthM,
            @NotNull base.api.shared.entity.resource.BuildingFloorModel.Outline outline,
            @DecimalMin("0") @DecimalMax("5000") @Digits(integer = 4, fraction = 2) BigDecimal cornerRadiusM) {
        public SiteFloor(Integer floorNumber, BigDecimal widthM, BigDecimal lengthM,
                base.api.shared.entity.resource.BuildingFloorModel.Outline outline) {
            this(floorNumber, widthM, lengthM, outline, null);
        }
    }
    public record BatchAllocation(
            @NotNull @Size(min = 1, max = 100)
            java.util.List<@NotNull @jakarta.validation.Valid Allocation> allocations) {
        @JsonAnySetter public void unsupported(String key, Object value) { reject(); }
    }
    public record Building(@NotBlank @Size(max = 150) String name,
                           @NotBlank @Size(max = 500) String address,
                           @Size(max = 100) String expectedRevision,
                           @DecimalMin("-90") @DecimalMax("90") @Digits(integer = 2, fraction = 8) BigDecimal latitude,
                           @DecimalMin("-180") @DecimalMax("180") @Digits(integer = 3, fraction = 8) BigDecimal longitude,
                           @Min(0) @Max(100) Integer floorCount,
                           @Size(max = 100) String city,
                           @Size(max = 100) String ward) {
        public Building { name = trim(name); address = trim(address); city = trim(city); ward = trim(ward); }
        public Building(String name, String address, String expectedRevision, BigDecimal latitude, BigDecimal longitude, Integer floorCount) {
            this(name, address, expectedRevision, latitude, longitude, floorCount, null, null);
        }
        public Building(String name, String address, String expectedRevision) {
            this(name, address, expectedRevision, null, null, null);
        }
        public Building(String name, String address, String expectedRevision, BigDecimal latitude, BigDecimal longitude) {
            this(name, address, expectedRevision, latitude, longitude, null);
        }
        @AssertTrue(message = "Latitude and longitude must be supplied together")
        public boolean isCoordinatePairValid() { return (latitude == null) == (longitude == null); }
        @JsonAnySetter public void unsupported(String key, Object value) { reject(); }
    }
    public record PhysicalFloor(@NotBlank @Size(max = 100) String name,
                                @NotNull @Min(-20) @Max(500) Integer floorNumber,
                                @NotNull @DecimalMin("0.01") @DecimalMax("600000") @Digits(integer = 6, fraction = 2) BigDecimal width,
                                @NotNull @DecimalMin("0.01") @DecimalMax("600000") @Digits(integer = 6, fraction = 2) BigDecimal height,
                                @Size(max = 100) String expectedRevision,
                                @DecimalMin("0.01") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal widthM,
                                @DecimalMin("0.01") @DecimalMax("10000") @Digits(integer = 5, fraction = 2) BigDecimal lengthM) {
        public PhysicalFloor { name = trim(name); }
        public PhysicalFloor(String name, Integer floorNumber, BigDecimal width, BigDecimal height, String expectedRevision) {
            this(name, floorNumber, width, height, expectedRevision, null, null);
        }
        @AssertTrue(message = "Supply both real dimensions together")
        public boolean isRealSizePairValid() { return (widthM == null) == (lengthM == null); }
        @JsonAnySetter public void unsupported(String key, Object value) { reject(); }
    }
    public record Allocation(@NotNull @Positive Long buildingFloorId,
                             @NotNull @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal x,
                             @NotNull @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal y,
                             @NotNull @DecimalMin("0.01") @DecimalMax("600000") @Digits(integer = 6, fraction = 2) BigDecimal width,
                             @NotNull @DecimalMin("0.01") @DecimalMax("600000") @Digits(integer = 6, fraction = 2) BigDecimal height,
                             @NotBlank @Size(max = 100) String name,
                             @Size(max = 100) String expectedRevision) {
        public Allocation { name = trim(name); }
        @JsonAnySetter public void unsupported(String key, Object value) { reject(); }
    }
    private static String trim(String value) { return value == null ? null : value.trim(); }
    private static void reject() { throw new IllegalArgumentException("Unsupported building field"); }
}
