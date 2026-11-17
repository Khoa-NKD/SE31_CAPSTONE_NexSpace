package base.api.feature.organizer.dto.response;

import base.api.shared.enums.OrganizerProfileStatus;
import java.util.List;

/** Capability flags describe current eligibility; every mutation enforces it again under locks. */
public record OrganizerLifecycleContext(Long id, OrganizerProfileStatus status, long revision,
        boolean suspended, String suspensionReason, boolean canApprove, boolean canReject,
        boolean canSuspend, boolean canCorrect, List<Long> currentDocumentIds) {}
