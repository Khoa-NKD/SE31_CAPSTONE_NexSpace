package base.api.feature.organizer.dto.response;

import base.api.shared.entity.organizer.OrganizerContractAddendumModel;
import java.time.LocalDateTime;

/** Storage references, OTP hashes and full email addresses remain server-side. */
public record OrganizerContractAddendumResponse(Long id, String number, String contractNumber, String status,
        String content, String contentHash, LocalDateTime issuedAt, LocalDateTime signedAt,
        LocalDateTime otpExpiresAt, LocalDateTime resendAvailableAt, String maskedEmail, boolean canSign) {
    public static OrganizerContractAddendumResponse from(OrganizerContractAddendumModel item, boolean canSign) {
        String email = item.getSigningEmail();
        int separator = email.indexOf('@');
        String masked = separator > 0 ? email.substring(0, 1) + "***" + email.substring(separator) : "***";
        return new OrganizerContractAddendumResponse(item.getId(), item.getAddendumNumber(), item.getContract().getContractNumber(),
                item.getStatus(), item.getContentSnapshot(), item.getContentHash(), item.getIssuedAt(), item.getSignedAt(),
                item.getOtpExpiresAt(), item.getOtpSentAt() == null ? null : item.getOtpSentAt().plusSeconds(60), masked, canSign);
    }
}
