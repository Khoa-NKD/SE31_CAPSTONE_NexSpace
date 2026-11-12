package base.api.feature.resource.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Non-bookable layout data. No resource ID, availability, price or parent relationship is accepted.
 */
public final class FloorDecorations {
    private FloorDecorations() {}

    public enum Kind {
        TABLE,
        PLANT,
        PARTITION,
        OTHER
    }
    public enum Icon { TABLE, PLANT, PARTITION, BOX, LOCKER, SOFA, SHELF, PRINTER, SCREEN, COFFEE, WHITEBOARD, LAMP, FAN, AIR_CONDITIONER, TRASH, SPEAKER, CLOCK, REFRIGERATOR, WATER_DISPENSER, ROUTER, TOILET, SINK, PROJECTOR, VIDEO_CONFERENCE, STAIRS, ELEVATOR, FIRE_EXTINGUISHER, DOOR, ACCESSIBILITY, MICROWAVE, SHOWER, BED, CAMERA, PHONE }

    public record Item(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{1,64}") String id,
            @NotNull Kind kind,
            @NotBlank @Size(max = 100) String label,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal posX,
            @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal posY,
            @NotNull @DecimalMin("0.01") @Digits(integer = 6, fraction = 2) BigDecimal width,
            @NotNull @DecimalMin("0.01") @Digits(integer = 6, fraction = 2) BigDecimal height,
            @NotNull @DecimalMin("0") @DecimalMax("359.99") @Digits(integer = 3, fraction = 2)
                    BigDecimal rotation,
            @NotNull @Pattern(regexp = "#[0-9A-Fa-f]{6}") String color, Icon icon) {
        public Item(String id, Kind kind, String label, BigDecimal posX, BigDecimal posY, BigDecimal width, BigDecimal height, BigDecimal rotation, String color) {
            this(id, kind, label, posX, posY, width, height, rotation, color, null);
        }
        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported decoration field");
        }
    }

    public record Save(
            @NotBlank @Size(max = 100) String expectedRevision,
            @NotNull @DecimalMin("1") @Digits(integer = 8, fraction = 2) BigDecimal width,
            @NotNull @DecimalMin("1") @Digits(integer = 8, fraction = 2) BigDecimal height,
            @NotNull @Size(max = 500) List<@NotNull @Valid Item> decorations) {
        public Save {
            decorations = decorations == null ? null : List.copyOf(decorations);
        }

        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported decoration layout field");
        }
    }
}
