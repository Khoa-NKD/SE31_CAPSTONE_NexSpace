import type { CanonicalWorkspace } from '@/features/workspaces/api/types';
import type { OrganizerWorkspace, WorkspaceStatus } from '../types';

/**
 * Maps a Canonical Workspace API entity into the presentation model
 * required by Organizer screens (O04 Dashboard, O16 Lifecycle).
 */
export function mapCanonicalToOrganizerWorkspace(cw: CanonicalWorkspace): OrganizerWorkspace {
  let status: WorkspaceStatus = 'ACTIVE';

  if (cw.moderationStatus === 'Suspended') {
    status = 'ARCHIVED';
  } else if (cw.reviewStatus === 'Draft') {
    status = 'DRAFT';
  } else if (cw.reviewStatus === 'Pending') {
    status = 'UNDER_REVIEW';
  } else if (cw.reviewStatus === 'Approved') {
    if (cw.operatingStatus === 'Active') {
      status = 'ACTIVE';
    } else if (cw.operatingStatus === 'Inactive') {
      status = 'PAUSED';
    } else if (cw.operatingStatus === 'Archived') {
      status = 'ARCHIVED';
    }
  }

  return {
    id: cw.id,
    name: cw.name,
    address: cw.streetAddress,
    district: cw.district,
    city: cw.city,
    status,
    draftProgress: cw.draftProgress ?? (cw.reviewStatus === 'Draft' ? 80 : undefined),
    draftWarningMessage:
      cw.draftWarningMessage ??
      (cw.reviewStatus === 'Draft'
        ? 'Floor Plan & Pricing pending review. Complete setup to publish.'
        : undefined),
    imageUrl: cw.coverImageUrl,
    desksCount: cw.capacityDesks,
    meetingRoomsCount: cw.meetingRooms,
    rating: cw.rating,
    reviewsCount: cw.reviewsCount,
    occupancyRate: cw.occupancyRate ?? (status === 'ACTIVE' ? 75 : 0),
    tier: cw.tier ?? 'Standard Tier',
    publicUrl: cw.publicUrl,
    isLive: cw.isLive,
    turnstileOnline: cw.turnstileOnline ?? true,
    bookingMode: cw.bookingConfirmationMode === 'Manual_Approval' ? 'manual' : 'instant',
    lastStatusChange: cw.updatedAt,
    grossRevenueMtd: cw.grossRevenueMtd ?? 0,
    totalBookingsMtd: cw.totalBookingsMtd ?? 0
  };
}
