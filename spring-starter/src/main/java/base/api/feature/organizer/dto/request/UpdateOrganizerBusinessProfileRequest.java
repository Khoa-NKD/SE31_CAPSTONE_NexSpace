package base.api.feature.organizer.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Owner contact and banking updates preserve approved legal identity and verification state. */
public record UpdateOrganizerBusinessProfileRequest(
        @NotBlank @Size(max = 500) String address,
        @NotBlank @Email @Size(max = 255) String contactEmail,
        @NotBlank @Pattern(regexp = "[+0-9() .-]{8,20}") String contactPhone,
        @Valid BankDetails bankDetails) {
    public UpdateOrganizerBusinessProfileRequest {
        address = trim(address);
        contactEmail = trim(contactEmail);
        contactPhone = trim(contactPhone);
    }

    public UpdateOrganizerBusinessProfileRequest(String address, String contactEmail, String contactPhone) {
        this(address, contactEmail, contactPhone, null);
    }

    /** A blank account number preserves the stored value; banking values are excluded from logs. */
    public record BankDetails(
            @NotBlank @Size(max = 100) String bankName,
            @NotBlank @Size(max = 100) String bankAccountHolder,
            @Pattern(regexp = "(?:[0-9]{6,34})?", message = "Enter an account number containing 6–34 digits") String bankAccountNumber) {
        public BankDetails {
            bankName = trim(bankName);
            bankAccountHolder = trim(bankAccountHolder);
            bankAccountNumber = trim(bankAccountNumber);
        }
        @Override public String toString() { return "BankDetails[REDACTED]"; }
        @JsonAnySetter public void rejectUnsupportedField(String name, Object value) {
            throw new IllegalArgumentException("Unsupported bank detail field");
        }
    }

    @JsonAnySetter
    public void rejectUnsupportedField(String name, Object value) {
        throw new IllegalArgumentException("Only contact and bank details can be updated");
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }
}
