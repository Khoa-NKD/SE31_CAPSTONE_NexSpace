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
    public record DocumentFeedback(@NotNull @Positive Long documentId, @NotBlank @Size(max = 500) String feedback) {
        public DocumentFeedback { feedback = feedback == null ? null : feedback.trim(); }
        @JsonAnySetter public void rejectUnsupportedField(String name, Object value) { throw new IllegalArgumentException("Unsupported document feedback field"); }
    }
    public record Rejection(@NotNull @Min(0) Long revision, @NotBlank @Size(max = 500) String reason,
            @Size(max = 100) List<@NotNull @Valid DocumentFeedback> documentFeedbacks) {
        public Rejection {
            reason = reason == null ? null : reason.trim();
            documentFeedbacks = documentFeedbacks == null ? List.of() : List.copyOf(documentFeedbacks);
        }
        public Rejection(Long revision, String reason) { this(revision, reason, List.of()); }
        @JsonAnySetter public void rejectUnsupportedField(String name, Object value) { throw new IllegalArgumentException("Unsupported rejection field"); }
    }
    public record Correction(@NotNull @Min(0) Long revision, @NotNull @Valid SubmitOrganizerApplicationRequest application) {
        @JsonAnySetter public void rejectUnsupportedField(String name, Object value) { throw new IllegalArgumentException("Unsupported lifecycle field"); }
    }
}
