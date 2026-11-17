package base.api.feature.resource.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;

import jakarta.validation.constraints.*;

import java.time.OffsetDateTime;
import java.util.List;

public final class FloorManagement {
    private FloorManagement() {}

    public record Rename(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 100) String expectedRevision) {
        public Rename {
            name = name == null ? null : name.trim();
        }

        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported floor rename field");
        }
    }

    public record Copy(
            @NotBlank @Size(max = 100) String name,
            @NotNull @Min(-20) @Max(500) Integer floorNumber,
            @NotBlank @Size(max = 100) String expectedRevision,
            @jakarta.validation.Valid BuildingRequests.Allocation allocation) {
        public Copy(String name, Integer floorNumber, String expectedRevision) { this(name, floorNumber, expectedRevision, null); }
        public Copy {
            name = name == null ? null : name.trim();
        }

        @JsonAnySetter
        public void unsupported(String name, Object value) {
            throw new IllegalArgumentException("Unsupported floor copy field");
        }
    }

    public enum AvailabilityState {
        AVAILABLE,
        LOCKED,
        BOOKED,
        DISABLED,
        MAINTENANCE
    }

    public record AvailabilityItem(Long id, AvailabilityState state, String reason) {}

    public record Availability(
            OffsetDateTime from,
            OffsetDateTime to,
            OffsetDateTime asOf,
            List<AvailabilityItem> resources) {}
}
