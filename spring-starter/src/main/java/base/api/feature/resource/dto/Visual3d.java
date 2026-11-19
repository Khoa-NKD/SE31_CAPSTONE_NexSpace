package base.api.feature.resource.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

/** Declarative geometry only: no URLs, scripts, arbitrary meshes or executable content. */
public record Visual3d(
        @NotNull @Min(1) @Max(1) Integer version,
        @NotBlank @Size(max = 160) String label,
        @Pattern(regexp = "#[0-9a-fA-F]{6}") String floorColor,
        @Pattern(regexp = "#[0-9a-fA-F]{6}") String wallColor,
        @DecimalMin("2.12") @DecimalMax("6") BigDecimal wallHeightM,
        @NotNull @Size(max = 48) List<@NotNull @Valid Part> parts) {
    public enum Shape { BOX, CYLINDER, ELLIPSOID }

    /** X/Z and width/depth are normalized to the saved 2D footprint; Y/height are metres. */
    public record Part(
            @NotNull Shape shape,
            @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal x,
            @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal z,
            @NotNull @DecimalMin("0") @DecimalMax("6") BigDecimal yM,
            @NotNull @DecimalMin("0.001") @DecimalMax("1") BigDecimal width,
            @NotNull @DecimalMin("0.001") @DecimalMax("1") BigDecimal depth,
            @NotNull @DecimalMin("0.001") @DecimalMax("6") BigDecimal heightM,
            @NotBlank @Pattern(regexp = "#[0-9a-fA-F]{6}") String color) {
        @AssertTrue(message = "3D parts must stay inside their saved footprint and height limits")
        @com.fasterxml.jackson.annotation.JsonIgnore
        public boolean isWithinBounds() {
            return x == null || z == null || width == null || depth == null || yM == null || heightM == null
                    || x.add(width).compareTo(BigDecimal.ONE) <= 0 && z.add(depth).compareTo(BigDecimal.ONE) <= 0
                    && yM.add(heightM).compareTo(BigDecimal.valueOf(6)) <= 0;
        }
    }
}
