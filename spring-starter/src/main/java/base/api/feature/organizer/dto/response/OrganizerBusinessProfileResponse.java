package base.api.feature.organizer.dto.response;

import base.api.shared.enums.BusinessType;

/** Business information owned by the authenticated organizer, excluding verification evidence and banking data. */
public record OrganizerBusinessProfileResponse(
        Long id,
        String legalName,
        BusinessType businessType,
        String taxId,
        String representativeName,
        String address,
        String contactEmail,
        String contactPhone) {
}
