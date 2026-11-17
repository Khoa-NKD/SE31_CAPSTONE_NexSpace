package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.response.OrganizerBusinessProfileResponse;
import base.api.feature.organizer.dto.request.UpdateOrganizerBusinessProfileRequest;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrganizerBusinessProfileService {
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final OrganizerBankAccountCipher bankCipher;

    @Transactional(readOnly = true)
    public OrganizerBusinessProfileResponse getCurrentProfile(Long actorId) {
        requireOrganizer(actorId);
        var profile = profiles.findByOrganizerId(actorId)
                .orElseThrow(() -> new NotFoundException("Organizer business profile not found"));
        requireOwnedApprovedProfile(actorId, profile);
        return toResponse(profile);
    }

    @Transactional
    public OrganizerBusinessProfileResponse updateCurrentProfile(Long actorId, UpdateOrganizerBusinessProfileRequest request) {
        requireOrganizer(actorId);
        var profile = profiles.findByOrganizerIdForUpdate(actorId)
                .orElseThrow(() -> new NotFoundException("Organizer business profile not found"));
        requireOwnedApprovedProfile(actorId, profile);
        var bank = request.bankDetails();
        if (bank != null) {
            if (!bankCipher.isConfigured()) {
                throw new ConflictException("Bank account updates are temporarily unavailable");
            }
            String number = bank.bankAccountNumber();
            if (number != null && !number.isBlank()) {
                profile.setBankAccountNumber(bankCipher.encrypt(profile.getId(), number));
            } else if (bankCipher.lastFour(profile.getId(), profile.getBankAccountNumber()) == null) {
                throw new base.api.shared.exception.BadRequestException("Enter a new bank account number before saving bank details");
            }
            profile.setBankName(bank.bankName());
            profile.setBankAccountHolder(bank.bankAccountHolder());
        }
        profile.setAddress(request.address());
        profile.setContactEmail(request.contactEmail());
        profile.setContactPhone(request.contactPhone());
        profiles.saveAndFlush(profile);
        return toResponse(profile);
    }

    private void requireOrganizer(Long actorId) {
        var user = users.findById(actorId)
                .orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!user.isActive() || !user.isVerified() || user.getRole() != UserRole.ORGANIZER) {
            throw new ForbiddenException("An active, email-verified Organizer account is required");
        }
    }

    private void requireOwnedApprovedProfile(Long actorId, OrganizerProfileModel profile) {
        // Scope by principal and verify the relationship rather than accepting a client-supplied owner ID.
        if (!actorId.equals(profile.getOrganizer().getId())) {
            throw new ForbiddenException("This business profile belongs to another organizer");
        }
        if (profile.getStatus() != OrganizerProfileStatus.APPROVED) {
            throw new ConflictException("Business profile updates require an approved organizer profile");
        }
    }

    private OrganizerBusinessProfileResponse toResponse(OrganizerProfileModel profile) {
        return new OrganizerBusinessProfileResponse(profile.getId(), profile.getLegalName(),
                profile.getBusinessType(), profile.getTaxId(), profile.getRepresentativeName(),
                profile.getAddress(), profile.getContactEmail(), profile.getContactPhone(),
                profile.getBankName(), profile.getBankAccountHolder(),
                bankCipher.lastFour(profile.getId(), profile.getBankAccountNumber()),
                profile.getBankAccountNumber() != null && !profile.getBankAccountNumber().isBlank(), bankCipher.isConfigured());
    }
}
