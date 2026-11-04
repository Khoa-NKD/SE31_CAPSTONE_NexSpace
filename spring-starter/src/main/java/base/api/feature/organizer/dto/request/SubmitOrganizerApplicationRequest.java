package base.api.feature.organizer.dto.request;

import base.api.shared.enums.BusinessType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Business details for an initial application; the actor is supplied by Spring Security. */
public record SubmitOrganizerApplicationRequest(
        @NotBlank @Size(max = 255) String legalName,
        @NotNull BusinessType businessType,
        @NotBlank @Size(max = 50) String taxId,
        @NotBlank @Size(max = 100) String representativeName,
        @NotBlank @Size(max = 500) String address,
        @NotBlank @Size(max = 20) @Pattern(regexp = "[+0-9() .-]{8,20}") String contactPhone,
        @NotBlank @Email @Size(max = 255) String contactEmail) {
    public SubmitOrganizerApplicationRequest {
        legalName = trim(legalName);
        taxId = trim(taxId);
        representativeName = trim(representativeName);
        address = trim(address);
        contactPhone = trim(contactPhone);
        contactEmail = trim(contactEmail);
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }
}
