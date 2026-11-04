package base.api.shared.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum WorkspaceCategory {
    COWORKING_HUB,
    BUSINESS_LOUNGE,
    CREATIVE_STUDIO,
    SERVICED_OFFICE,
    OTHER;

    @JsonCreator
    public static WorkspaceCategory fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase().replace("-", "_");
        for (WorkspaceCategory cat : values()) {
            if (cat.name().equalsIgnoreCase(normalized)) {
                return cat;
            }
        }
        throw new IllegalArgumentException("Unknown workspace category: " + value);
    }

    @JsonValue
    public String toJson() {
        return name();
    }
}
