package base.api.feature.organizer.dto.response;

import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.BusinessType;
import base.api.shared.enums.OrganizerProfileStatus;
import java.time.LocalDateTime;

/** Owner-facing application fields; private storage references and review internals are omitted. */
public record OrganizerApplicationDetailsResponse(
        Long id, OrganizerProfileStatus status, LocalDateTime submittedAt,
        String legalName, BusinessType businessType, String taxId, String representativeName,
        String address, String contactPhone, String contactEmail) {
    public static OrganizerApplicationDetailsResponse from(OrganizerProfileModel profile) {
        return new OrganizerApplicationDetailsResponse(profile.getId(), profile.getStatus(), profile.getSubmittedAt(),
                profile.getLegalName(), profile.getBusinessType(), profile.getTaxId(), profile.getRepresentativeName(),
                profile.getAddress(), profile.getContactPhone(), profile.getContactEmail());
    }
}
