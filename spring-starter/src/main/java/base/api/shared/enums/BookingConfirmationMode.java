package base.api.shared.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum BookingConfirmationMode {
    INSTANT,
    MANUAL_APPROVAL;

    @JsonCreator
    public static BookingConfirmationMode fromString(String value) {
        if (value == null || value.isBlank()) {
            return INSTANT;
        }
        String normalized = value.trim().toUpperCase().replace("-", "_");
        for (BookingConfirmationMode mode : values()) {
            if (mode.name().equalsIgnoreCase(normalized)) {
                return mode;
            }
        }
        return INSTANT;
    }

    @JsonValue
    public String toJson() {
        return name();
    }
}
