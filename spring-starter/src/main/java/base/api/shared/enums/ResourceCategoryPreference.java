package base.api.shared.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ResourceCategoryPreference {
    DESK,
    ROOM,
    ANY;

    @JsonCreator
    public static ResourceCategoryPreference fromString(String value) {
        if (value == null || value.isBlank()) {
            return ANY;
        }
        String normalized = value.trim().toUpperCase();
        for (ResourceCategoryPreference category : values()) {
            if (category.name().equalsIgnoreCase(normalized)) {
                return category;
            }
        }
        throw new IllegalArgumentException("Loại hình không gian không hợp lệ: " + value + ". Các giá trị hợp lệ: DESK, ROOM, ANY");
    }
}
