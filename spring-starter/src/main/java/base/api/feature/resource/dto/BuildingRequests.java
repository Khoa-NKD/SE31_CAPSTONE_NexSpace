package base.api.feature.resource.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public final class BuildingRequests {
    private BuildingRequests() {}
    public record BatchAllocation(
            @NotNull @Size(min = 1, max = 100)
            java.util.List<@NotNull @jakarta.validation.Valid Allocation> allocations) {
        @JsonAnySetter public void unsupported(String key, Object value) { reject(); }
    }
    public record Building(@NotBlank @Size(max = 150) String name,
                           @NotBlank @Size(max = 500) String address,
                           @Size(max = 100) String expectedRevision) {
        public Building { name = trim(name); address = trim(address); }
        @JsonAnySetter public void unsupported(String key, Object value) { reject(); }
    }
    public record PhysicalFloor(@NotBlank @Size(max = 100) String name,
                                @NotNull @Min(-20) @Max(500) Integer floorNumber,
                                @NotNull @DecimalMin("1") @DecimalMax("100000") @Digits(integer = 6, fraction = 2) BigDecimal width,
                                @NotNull @DecimalMin("1") @DecimalMax("100000") @Digits(integer = 6, fraction = 2) BigDecimal height,
                                @Size(max = 100) String expectedRevision) {
        public PhysicalFloor { name = trim(name); }
        @JsonAnySetter public void unsupported(String key, Object value) { reject(); }
    }
    public record Allocation(@NotNull @Positive Long buildingFloorId,
                             @NotNull @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal x,
                             @NotNull @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal y,
                             @NotNull @DecimalMin("1") @DecimalMax("100000") @Digits(integer = 6, fraction = 2) BigDecimal width,
                             @NotNull @DecimalMin("1") @DecimalMax("100000") @Digits(integer = 6, fraction = 2) BigDecimal height,
                             @NotBlank @Size(max = 100) String name,
                             @Size(max = 100) String expectedRevision) {
        public Allocation { name = trim(name); }
        @JsonAnySetter public void unsupported(String key, Object value) { reject(); }
    }
    private static String trim(String value) { return value == null ? null : value.trim(); }
    private static void reject() { throw new IllegalArgumentException("Unsupported building field"); }
}
