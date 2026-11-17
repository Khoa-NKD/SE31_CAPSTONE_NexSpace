package base.api.feature.organizer.dto.response;

import base.api.shared.entity.organizer.OrganizerContractModel;
import java.time.LocalDateTime;

/** Never expose storage paths, OTP hashes, or signing-email addresses in API responses. */
public record OrganizerContractResponse(Long id, String contractNumber, String templateVersion,
        String status, boolean demo, String content, String contentHash, LocalDateTime issuedAt,
        LocalDateTime signedAt, LocalDateTime otpExpiresAt, LocalDateTime resendAvailableAt,
        String maskedEmail, boolean canSign) {
    public static OrganizerContractResponse from(OrganizerContractModel c, boolean canSign) {
        String email = c.getSigningEmail();
        int at = email.indexOf('@');
        String masked = at > 0 ? email.substring(0, 1) + "***" + email.substring(at) : "***";
        return new OrganizerContractResponse(c.getId(), c.getContractNumber(), c.getTemplateVersion(),
                c.getStatus(), c.isDemo(), c.getContentSnapshot(), c.getContentHash(), c.getIssuedAt(),
                c.getSignedAt(), c.getOtpExpiresAt(), c.getOtpSentAt() == null ? null : c.getOtpSentAt().plusSeconds(60),
                masked, canSign);
    }
}
