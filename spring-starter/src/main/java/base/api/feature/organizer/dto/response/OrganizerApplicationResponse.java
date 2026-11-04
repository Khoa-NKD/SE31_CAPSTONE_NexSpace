package base.api.feature.organizer.dto.response;

import base.api.shared.enums.OrganizerProfileStatus;
import java.time.LocalDateTime;

/** Submission receipt deliberately excludes private document paths and banking information. */
public record OrganizerApplicationResponse(Long id, OrganizerProfileStatus status, LocalDateTime submittedAt) {}
