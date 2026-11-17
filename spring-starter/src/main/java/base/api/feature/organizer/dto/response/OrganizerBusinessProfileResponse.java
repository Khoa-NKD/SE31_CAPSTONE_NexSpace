package base.api.feature.organizer.dto.response;

import base.api.shared.enums.BusinessType;

/** Owned business information excluding verification evidence and full bank account numbers. */
public record OrganizerBusinessProfileResponse(
        Long id,
        String legalName,
        BusinessType businessType,
        String taxId,
        String representativeName,
        String address,
        String contactEmail,
        String contactPhone,
        String bankName,
        String bankAccountHolder,
        String bankAccountLastFour,
        boolean bankAccountConfigured,
        boolean bankingAvailable) {
}
