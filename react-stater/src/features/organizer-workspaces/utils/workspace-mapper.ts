import type { CanonicalWorkspace } from '@/features/workspaces/api/types';
import type { OrganizerWorkspace, WorkspaceStatus } from '../types';

/**
 * Maps a Canonical Workspace API entity into the presentation model
 * required by Organizer screens (O04 Dashboard, O16 Lifecycle).
 */
export function mapCanonicalToOrganizerWorkspace(cw: CanonicalWorkspace): OrganizerWorkspace {
  let status: WorkspaceStatus = 'ACTIVE';

  const rawStatus = (cw.status || '').toUpperCase();

  if (
    cw.moderationStatus === 'Suspended' ||
    rawStatus === 'SUSPENDED' ||
    cw.operatingStatus === 'Archived' ||
    rawStatus === 'ARCHIVED'
  ) {
    status = 'ARCHIVED';
  } else if (cw.operatingStatus === 'Holiday' || rawStatus === 'HOLIDAY') {
    status = 'HOLIDAY';
  } else if (cw.operatingStatus === 'Maintenance' || rawStatus === 'MAINTENANCE') {
    status = 'MAINTENANCE';
  } else if (
    cw.operatingStatus === 'Pending' ||
    rawStatus === 'PENDING' ||
    rawStatus === 'INACTIVE' ||
    rawStatus === 'PAUSED'
  ) {
    status = 'INACTIVE';
  } else if (cw.reviewStatus === 'Draft' || rawStatus === 'DRAFT') {
    status = cw.reviewedAt || cw.submittedAt ? 'INACTIVE' : 'DRAFT';
  } else {
    status = 'ACTIVE';
  }

  const isDraft = status === 'DRAFT';
  const bookingsCount = Number(cw.bookingCount ?? cw.totalBookings ?? cw.totalBookingsMtd ?? 0);

  return {
    id: String(cw.id),
    name: cw.name ?? '',
    address: cw.streetAddress || (cw as unknown as { address?: string }).address || '',
    district: cw.district ?? '',
    city: cw.city ?? '',
    status,
    version: cw.version ?? 1,
    bookingCount: bookingsCount,
    reviewFeedback: cw.reviewFeedback || undefined,
    draftProgress: isDraft ? cw.draftProgress : undefined,
    draftWarningMessage: isDraft ? (cw.draftWarningMessage ?? undefined) : undefined,
    imageUrl: cw.coverImageUrl,
    desksCount: cw.capacityDesks,
    meetingRoomsCount: cw.meetingRooms,
    rating: cw.rating,
    reviewsCount: cw.reviewsCount,
    occupancyRate: cw.occupancyRate,
    tier: cw.tier,
    publicUrl: cw.publicUrl,
    isLive: cw.isLive,
    turnstileOnline: cw.turnstileOnline,
    bookingMode: cw.bookingConfirmationMode === 'Manual_Approval' ? 'manual' : 'instant',
    lastStatusChange: cw.updatedAt,
    grossRevenueMtd: cw.grossRevenueMtd,
    totalBookingsMtd: bookingsCount
  };
}
