package base.api.shared.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum NoiseLevel {
    QUIET,
    MODERATE,
    LIVELY;

    @JsonCreator
    public static NoiseLevel fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        for (NoiseLevel level : values()) {
            if (level.name().equalsIgnoreCase(normalized)) {
                return level;
            }
        }
        throw new IllegalArgumentException("Mức độ yên tĩnh không hợp lệ: " + value + ". Các giá trị hợp lệ: QUIET, MODERATE, LIVELY");
    }
}
