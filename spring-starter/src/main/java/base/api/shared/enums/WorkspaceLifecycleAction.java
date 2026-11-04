package base.api.shared.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum WorkspaceLifecycleAction {
    ARCHIVE,
    PAUSE,
    RESUME,
    MAINTENANCE;

    @JsonCreator
    public static WorkspaceLifecycleAction fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase().replace("-", "_");
        for (WorkspaceLifecycleAction action : values()) {
            if (action.name().equalsIgnoreCase(normalized)) {
                return action;
            }
        }
        throw new IllegalArgumentException("Unknown lifecycle action: " + value);
    }

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }
}
