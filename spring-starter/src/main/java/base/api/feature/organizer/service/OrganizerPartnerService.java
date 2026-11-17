package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.organizer.dto.request.OrganizerLifecycleRequests.Reason;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizerPartnerService {
    private final IOrganizerProfileRepository profiles;
    private final IUserRepository users;
    private final IWorkspaceRepository workspaces;
    private final IBookingRepository bookings;
    private final OrganizerLifecycleAudit audit;
    private final ApplicationEventPublisher events;

    public Page<Partner> list(Long adminId, PageRequestDTO request, Boolean suspended) {
        requireAdmin(adminId);
        String search = request.normalizedSearch();
        return profiles.findPartners(suspended, search == null ? null : search.toLowerCase(Locale.ROOT),
                request.toPageable()).map(this::summary);
    }

    public Detail detail(Long adminId, Long organizerId) {
        requireAdmin(adminId);
        return detail(requirePartner(profiles.findByOrganizerId(organizerId)));
    }

    public OperationalStatus status(Long organizerId) {
        return profiles.findByOrganizerId(organizerId).map(this::status)
                .orElse(new OperationalStatus(false, null));
    }

    @Transactional
    public Detail change(Long adminId, Long organizerId, Reason request, boolean suspended) {
        var admin = requireAdmin(adminId);
        users.findByIdForApplication(organizerId).orElseThrow(() -> new NotFoundException("Organizer partner not found"));
        var profile = requirePartner(profiles.findByOrganizerIdForUpdate(organizerId));
        if (audit.revision(profile.getId()) != request.revision() || profile.isSuspended() == suspended) {
            throw new ConflictException("Organizer status changed. Refresh before trying again.");
        }

        profile.setSuspended(suspended);
        audit.write(admin, profile.getId(), suspended ? "Organizer.Suspend" : "Organizer.Restore",
                Map.of("suspended", !suspended), Map.of("suspended", suspended), request.reason());
        events.publishEvent(new StatusChanged(profile.getOrganizer().getEmail(), organizerId, suspended, request.reason()));
        return detail(profile);
    }

    private UserModel requireAdmin(Long id) {
        return users.findById(id).filter(user -> user.isActive() && user.getRole() == UserRole.ADMIN)
                .orElseThrow(() -> new ForbiddenException("Active administrator required"));
    }

    private OrganizerProfileModel requirePartner(Optional<OrganizerProfileModel> candidate) {
        return candidate.filter(profile -> profile.getStatus() == OrganizerProfileStatus.APPROVED
                        && profile.getOrganizer().getRole() == UserRole.ORGANIZER)
                .orElseThrow(() -> new NotFoundException("Organizer partner not found"));
    }

    private Partner summary(OrganizerProfileModel profile) {
        var organizer = profile.getOrganizer();
        return new Partner(organizer.getId(), profile.getId(), profile.getLegalName(),
                organizer.getUserName(), organizer.getEmail(), profile.isSuspended());
    }

    private OperationalStatus status(OrganizerProfileModel profile) {
        return new OperationalStatus(profile.isSuspended(),
                profile.isSuspended() ? audit.suspensionReason(profile.getId()) : null);
    }

    private Detail detail(OrganizerProfileModel profile) {
        Long organizerId = profile.getOrganizer().getId();
        var ownedWorkspaces = workspaces.findByOrganizerIdOrderByIdDesc(organizerId).stream()
                .map(w -> new Workspace(w.getId(), w.getName(), w.getStatus())).toList();
        long upcoming = bookings.countByWorkspaceOrganizerIdAndStatusInAndEndTimeAfter(
                organizerId, List.of(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN), LocalDateTime.now(ZoneOffset.UTC));
        return new Detail(summary(profile), audit.revision(profile.getId()), status(profile).reason(),
                ownedWorkspaces, upcoming);
    }

    public record Partner(Long organizerId, Long applicationId, String legalName, String username, String email,
            boolean suspended) {}
    public record Workspace(Long id, String name, WorkspaceStatus status) {}
    public record Detail(Partner partner, long revision, String reason, List<Workspace> workspaces, long upcomingBookings) {}
    public record OperationalStatus(boolean suspended, String reason) {}
    public record StatusChanged(String recipient, Long organizerId, boolean suspended, String reason) {}
}
