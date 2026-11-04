package base.api.feature.organizer.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Contact-only updates preserve the approved legal identity and verification state. */
public record UpdateOrganizerBusinessProfileRequest(
        @NotBlank @Size(max = 500) String address,
        @NotBlank @Email @Size(max = 255) String contactEmail,
        @NotBlank @Pattern(regexp = "[+0-9() .-]{8,20}") String contactPhone) {
    public UpdateOrganizerBusinessProfileRequest {
        address = trim(address);
        contactEmail = trim(contactEmail);
        contactPhone = trim(contactPhone);
    }

    @JsonAnySetter
    public void rejectUnsupportedField(String name, Object value) {
        throw new IllegalArgumentException("Only address, contactEmail and contactPhone can be updated");
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }
}
