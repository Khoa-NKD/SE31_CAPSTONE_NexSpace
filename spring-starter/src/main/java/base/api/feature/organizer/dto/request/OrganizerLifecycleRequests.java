package base.api.feature.organizer.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonAnySetter;

/** Clients submit an action and the revision they actually reviewed, never a role or target status. */
public final class OrganizerLifecycleRequests {
    private OrganizerLifecycleRequests() {}
    public record Revision(@NotNull @Min(0) Long revision) {
        @JsonAnySetter public void rejectUnsupportedField(String name, Object value) { throw new IllegalArgumentException("Unsupported lifecycle field"); }
    }
    public record Reason(@NotNull @Min(0) Long revision, @NotBlank @Size(max = 500) String reason) {
        public Reason { reason = reason == null ? null : reason.trim(); }
        @JsonAnySetter public void rejectUnsupportedField(String name, Object value) { throw new IllegalArgumentException("Unsupported lifecycle field"); }
    }
    public record Approval(@NotNull @Min(0) Long revision, boolean documentsConfirmed,
            @NotNull List<@NotNull @Positive Long> documentIds, @Size(max = 500) String note) {
        public Approval { note = note == null || note.isBlank() ? null : note.trim(); }
        @JsonAnySetter public void rejectUnsupportedField(String name, Object value) { throw new IllegalArgumentException("Unsupported lifecycle field"); }
    }
    public record Correction(@NotNull @Min(0) Long revision, @NotNull @Valid SubmitOrganizerApplicationRequest application) {
        @JsonAnySetter public void rejectUnsupportedField(String name, Object value) { throw new IllegalArgumentException("Unsupported lifecycle field"); }
    }
}
