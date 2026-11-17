package base.api.shared.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum BookingPurpose {
    STUDY,
    FREELANCE,
    TEAM_WORK,
    MEETING,
    EVENT,
    OTHER;

    @JsonCreator
    public static BookingPurpose fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        if ("WORK".equals(normalized)) {
            return FREELANCE;
        }
        for (BookingPurpose purpose : values()) {
            if (purpose.name().equalsIgnoreCase(normalized)) {
                return purpose;
            }
        }
        throw new IllegalArgumentException("Mục đích sử dụng không hợp lệ: " + value + ". Các giá trị hợp lệ: STUDY, FREELANCE, TEAM_WORK, MEETING, EVENT, OTHER");
    }
}
