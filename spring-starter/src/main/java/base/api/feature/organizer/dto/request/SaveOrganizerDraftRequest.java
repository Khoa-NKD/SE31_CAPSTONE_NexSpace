package base.api.feature.organizer.dto.request;

import base.api.shared.enums.BusinessType;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Full draft snapshot: blank fields are cleared, while supplied values must be valid. */
public record SaveOrganizerDraftRequest(
        @Size(max = 255) String legalName,
        BusinessType businessType,
        @Size(max = 50) String taxId,
        @Size(max = 100) String representativeName,
        @Size(max = 500) String address,
        @Pattern(regexp = "[+0-9() .-]{8,20}") String contactPhone,
        @Email @Size(max = 255) String contactEmail,
        @Size(max = 2000) String registrationReason) {
    public SaveOrganizerDraftRequest(String legalName, BusinessType businessType, String taxId,
            String representativeName, String address, String contactPhone, String contactEmail) {
        this(legalName, businessType, taxId, representativeName, address, contactPhone, contactEmail, null);
    }
    public SaveOrganizerDraftRequest {
        legalName = normalize(legalName);
        taxId = normalize(taxId);
        representativeName = normalize(representativeName);
        address = normalize(address);
        contactPhone = normalize(contactPhone);
        contactEmail = normalize(contactEmail);
        registrationReason = normalize(registrationReason);
    }

    @JsonAnySetter
    public void rejectUnsupportedField(String name, Object value) {
        throw new IllegalArgumentException("Only business application fields can be saved");
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
