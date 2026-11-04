package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationResponse;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminOrganizerApplicationService {
    private static final Set<String> SORT_FIELDS = Set.of("id", "legalName", "submittedAt", "reviewedAt", "status");
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public Page<AdminOrganizerApplicationResponse> list(Long actorId, PageRequestDTO request, OrganizerProfileStatus status) {
        var actor = users.findById(actorId).orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!actor.isActive() || actor.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("An active Administrator account is required");
        }
        if (request.getPage() < 1 || request.getSize() < 1 || request.getSize() > PageRequestDTO.MAX_PAGE_SIZE) {
            throw new BadRequestException("page must be at least 1 and size must be between 1 and 100");
        }
        String sortField = request.getSortBy() == null || request.getSortBy().isBlank() ? "submittedAt" : request.getSortBy().trim();
        if (!SORT_FIELDS.contains(sortField)) throw new BadRequestException("Unsupported application sort field");
        String direction = request.getSortDir() == null ? "desc" : request.getSortDir().trim().toLowerCase(Locale.ROOT);
        if (!Set.of("asc", "desc").contains(direction)) throw new BadRequestException("sortDir must be asc or desc");
        String search = request.normalizedSearch();
        if (search != null && search.length() > 255) throw new BadRequestException("search must not exceed 255 characters");
        String pattern = search == null ? null : "%" + search.toLowerCase(Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortField);
        // A stable tie-breaker prevents equal timestamps/names from shuffling across pages.
        if (!sortField.equals("id")) sort = sort.and(Sort.by(Sort.Direction.DESC, "id"));
        return profiles.findSubmittedApplications(status, pattern,
                PageRequest.of(request.getPage() - 1, request.getSize(), sort));
    }
}
