/**
 * Strictly deterministic mock data aligned with Stitch Project 6390451165421541093.
 * Screen: A06: Workspace Administration Overview (Screen ID: e4047dc13f1c46cb9952dc34e5ab15a5)
 */
import type { CanonicalWorkspace } from '../../workspaces/api/types.ts';
import { isWorkspacePubliclyEligible } from '../../workspaces/api/types.ts';

export interface WorkspaceKpis {
  totalPlatformUsers?: number;
  activeOrganizers?: number;
  activeWorkspaces?: number;
  totalBookings?: number;
  totalWorkspaces?: number;
  activeCount?: number;
  pendingCount?: number;
  maintenanceCount?: number;
  draftCount?: number;
  totalPublishedSpaces?: number;
  publishedMonthlyGrowth?: number | null;
  metroHubsCount?: number;
  pendingModerationCount?: number;
  pendingOldestHours?: number;
  suspendedCount: number;
  suspendedGrievanceDetails?: string;
  partnerDraftsCount?: number;
}

export const ZERO_WORKSPACE_KPIS: WorkspaceKpis = {
  totalPlatformUsers: 0,
  activeOrganizers: 0,
  activeWorkspaces: 0,
  totalBookings: 0,
  totalWorkspaces: 0,
  activeCount: 0,
  pendingCount: 0,
  maintenanceCount: 0,
  draftCount: 0,
  totalPublishedSpaces: 0,
  publishedMonthlyGrowth: null,
  metroHubsCount: 0,
  pendingModerationCount: 0,
  pendingOldestHours: 0,
  suspendedCount: 0,
  suspendedGrievanceDetails: 'No active suspensions',
  partnerDraftsCount: 0
};

export interface ModerationWorkloadItem {
  id: string;
  workspaceId?: string;
  title: string;
  description: string;
  priorityLabel: 'Priority 1' | 'Standard' | 'Low';
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
}

export interface QualityHealthMetrics {
  nomadRating: string | number;
  totalRatingsCount: string;
  hygieneFlags: string | number;
  hygieneCleanPeriod: string;
  mysteryAuditsPercentage: number;
  verifiedHubsCount: number;
  gradeBadge: string;
  standardsEngineNote: string;
}

export interface ModerationDecisionRecord {
  id: string;
  workspaceId: string;
  workspaceName: string;
  unit: string;
  metroZone: string;
  shortCode: string;
  organizerLegalEntity: string;
  bookingCount?: number;
  action: 'Approved' | 'Suspended' | 'Pending Processing' | 'Under Maintenance' | 'Draft' | 'Approved & Published' | 'Suspended (Safety Audit)' | 'Re-activated' | 'Flags Resolved';
  actionStatus: 'approved' | 'suspended' | 'pending' | 'maintenance' | 'draft' | 'reactivated' | 'resolved';
  adminHandler: {
    name: string;
    initials: string;
    avatarBgClass: string;
    role?: string;
  };
  timestamp: string;
  timestampExact: string;
  auditTrailNotes: string;
}

export const MOCK_WORKSPACE_KPIS: WorkspaceKpis = {
  totalPlatformUsers: 1240,
  activeOrganizers: 48,
  activeWorkspaces: 618,
  totalBookings: 3420,
  totalWorkspaces: 668,
  totalPublishedSpaces: 618,
  publishedMonthlyGrowth: 12,
  metroHubsCount: 14,
  pendingModerationCount: 8,
  pendingOldestHours: 14,
  suspendedCount: 3,
  suspendedGrievanceDetails: '2 noise grievances, 1 unverified lease document',
  partnerDraftsCount: 42
};

export const MOCK_MODERATION_WORKLOAD_ITEMS: ModerationWorkloadItem[] = [
  {
    id: 'workload-1',
    title: '5 New Workspace Onboardings',
    description: 'Initial space specs, operational details, and organizer profile review.',
    priorityLabel: 'Priority 1',
    icon: 'add_business',
    iconBgClass: 'bg-amber-100 dark:bg-amber-950/50',
    iconColorClass: 'text-amber-800 dark:text-amber-400'
  },
  {
    id: 'workload-2',
    title: '3 Floor Plan & Capacity Overhauls',
    description: 'Desk density increases and shift in hourly pricing tiers awaiting sign-off.',
    priorityLabel: 'Standard',
    icon: 'architecture',
    iconBgClass: 'bg-indigo-100 dark:bg-indigo-950/50',
    iconColorClass: 'text-primary dark:text-indigo-400'
  }
];

export const MOCK_QUALITY_HEALTH_METRICS: QualityHealthMetrics = {
  nomadRating: '—',
  totalRatingsCount: 'Rating telemetry unavailable',
  hygieneFlags: '—',
  hygieneCleanPeriod: 'Hygiene telemetry unavailable',
  mysteryAuditsPercentage: 0,
  verifiedHubsCount: 0,
  gradeBadge: 'Telemetry Pending',
  standardsEngineNote: 'Awaiting Audit Integration'
};

export const INITIAL_MODERATION_RECORDS: ModerationDecisionRecord[] = [
  {
    id: 'rec-1',
    workspaceId: 'WS-VN-9082',
    workspaceName: 'WorkHub Central — Dedicated Suite 402',
    unit: 'Dedicated Suite 402',
    metroZone: 'District 1, HCMC',
    shortCode: 'HC',
    organizerLegalEntity: 'Saigon Co-Working JSC',
    action: 'Approved & Published',
    actionStatus: 'approved',
    adminHandler: {
      name: 'Marcus Vance',
      initials: 'MV',
      avatarBgClass: 'bg-primary text-white',
      role: 'CPTO'
    },
    timestamp: '25m ago',
    timestampExact: 'Oct 24, 2025 15:15 UTC',
    auditTrailNotes: 'Initial administrative review completed; capacity set to 24 seats.'
  },
  {
    id: 'rec-2',
    workspaceId: 'WS-VN-7719',
    workspaceName: 'D1 TechSpace — Creative Pod B',
    unit: 'Creative Pod B',
    metroZone: 'Binh Thanh, HCMC',
    shortCode: 'D1',
    organizerLegalEntity: 'District 1 Creative Spaces Ltd',
    action: 'Suspended (Safety Audit)',
    actionStatus: 'suspended',
    adminHandler: {
      name: 'Elena Rostova',
      initials: 'ER',
      avatarBgClass: 'bg-slate-700 text-white',
      role: 'Compliance Lead'
    },
    timestamp: '2h ago',
    timestampExact: 'Oct 24, 2025 13:30 UTC',
    auditTrailNotes: 'Temporary hold placed following 2 noise grievances from adjacent residential tenancies.'
  },
  {
    id: 'rec-3',
    workspaceId: 'WS-VN-4401',
    workspaceName: 'Da Nang SeaView — Hot Desk Area',
    unit: 'Hot Desk Area',
    metroZone: 'My Khe Beach, Da Nang',
    shortCode: 'SV',
    organizerLegalEntity: 'VietCoast Properties JSC',
    action: 'Re-activated',
    actionStatus: 'reactivated',
    adminHandler: {
      name: 'David Kim',
      initials: 'DK',
      avatarBgClass: 'bg-indigo-700 text-white',
      role: 'SecOps Officer'
    },
    timestamp: '5h ago',
    timestampExact: 'Oct 24, 2025 10:45 UTC',
    auditTrailNotes: 'Updated documentation submitted by operator; listing restored to active status.'
  },
  {
    id: 'rec-4',
    workspaceId: 'WS-VN-2311',
    workspaceName: 'Old Town Heritage — Private Office 3A',
    unit: 'Private Office 3A',
    metroZone: 'Hoi An Ancient City',
    shortCode: 'OT',
    organizerLegalEntity: 'An Bang Heritage Workspaces',
    action: 'Approved & Published',
    actionStatus: 'approved',
    adminHandler: {
      name: 'Marcus Vance',
      initials: 'MV',
      avatarBgClass: 'bg-primary text-white',
      role: 'CPTO'
    },
    timestamp: 'Yesterday',
    timestampExact: 'Oct 23, 2025 17:20 UTC',
    auditTrailNotes: 'Initial space onboarding review completed.'
  },
  {
    id: 'rec-5',
    workspaceId: 'WS-VN-1109',
    workspaceName: 'Toong Trang Thi — Event & Flex Hall',
    unit: 'Event & Flex Hall',
    metroZone: 'Hoan Kiem, Hanoi',
    shortCode: 'TT',
    organizerLegalEntity: 'Toong Co-working Network VN',
    action: 'Flags Resolved',
    actionStatus: 'resolved',
    adminHandler: {
      name: 'Elena Rostova',
      initials: 'ER',
      avatarBgClass: 'bg-slate-700 text-white',
      role: 'Compliance Lead'
    },
    timestamp: 'Yesterday',
    timestampExact: 'Oct 23, 2025 14:10 UTC',
    auditTrailNotes: 'Operator submitted updated facility maintenance confirmation.'
  },
  {
    id: 'rec-6',
    workspaceId: 'WS-VN-6620',
    workspaceName: 'Dreamplex Nguyen Trung Ngan — Studio 12',
    unit: 'Studio 12',
    metroZone: 'District 1, HCMC',
    shortCode: 'DP',
    organizerLegalEntity: 'Dreamplex Hospitality JSC',
    action: 'Approved & Published',
    actionStatus: 'approved',
    adminHandler: {
      name: 'Marcus Vance',
      initials: 'MV',
      avatarBgClass: 'bg-primary text-white',
      role: 'CPTO'
    },
    timestamp: '2 days ago',
    timestampExact: 'Oct 22, 2025 11:00 UTC',
    auditTrailNotes: 'Floor plan review passed; amenity tags synchronized with customer booking portal.'
  }
];

/**
 * Pure calculation of A06 workspace status KPIs based strictly on canonical workspaces.
 * Valid empty API response or null produces zero actual counts.
 */
export function computeWorkspaceKpis(
  workspaces?: CanonicalWorkspace[] | null,
  now: number = Date.now()
): WorkspaceKpis {
  if (!workspaces || workspaces.length === 0) {
    return ZERO_WORKSPACE_KPIS;
  }

  // Authoritative public eligibility predicate
  const published = workspaces.filter(isWorkspacePubliclyEligible).length;
  const pending = workspaces.filter((w) => w.status === 'pending' || w.operatingStatus === 'Pending').length;
  const maintenance = workspaces.filter((w) => w.status === 'maintenance' || w.operatingStatus === 'Maintenance').length;
  const suspended = workspaces.filter((w) => w.moderationStatus === 'Suspended' || w.status === 'suspended').length;
  const drafts = workspaces.filter((w) => w.status === 'draft' || w.reviewStatus === 'Draft').length;
  const uniqueOrganizers = new Set(workspaces.map((w) => w.organizerId).filter(Boolean)).size;
  const totalBookings = workspaces.reduce(
    (sum, w) => sum + Number(w.bookingCount ?? w.totalBookings ?? w.totalBookingsMtd ?? 0),
    0
  );

  let oldestHours = 0;
  const pendingSpaces = workspaces.filter((w) => w.status === 'pending' || w.operatingStatus === 'Pending');
  if (pendingSpaces.length > 0) {
    const timestamps = pendingSpaces
      .map((w) => (w.submittedAt ? new Date(w.submittedAt).getTime() : 0))
      .filter((t) => t > 0);
    if (timestamps.length > 0) {
      const earliest = Math.min(...timestamps);
      oldestHours = Math.max(0, Math.floor((now - earliest) / (1000 * 60 * 60)));
    }
  }

  const cities = new Set(workspaces.map((w) => w.city).filter(Boolean));
  const metroCount = cities.size;

  return {
    totalPlatformUsers: uniqueOrganizers,
    activeOrganizers: uniqueOrganizers,
    activeWorkspaces: published,
    totalBookings,
    totalWorkspaces: workspaces.length,
    activeCount: published,
    pendingCount: pending,
    maintenanceCount: maintenance,
    draftCount: drafts,
    totalPublishedSpaces: published,
    publishedMonthlyGrowth: null,
    metroHubsCount: metroCount,
    pendingModerationCount: pending + maintenance,
    pendingOldestHours: oldestHours,
    suspendedCount: suspended,
    suspendedGrievanceDetails:
      suspended > 0
        ? `${suspended} workspace(s) currently suspended by admin action`
        : 'No active suspensions',
    partnerDraftsCount: drafts
  };
}

/**
 * Derive operational workload items strictly from canonical workspaces (Pending Activation & Maintenance).
 */
export function deriveModerationWorkloadItems(
  workspaces?: CanonicalWorkspace[] | null
): ModerationWorkloadItem[] {
  if (!workspaces) return [];

  const items: ModerationWorkloadItem[] = [];
  const pendingWorkspaces = workspaces.filter(
    (w) => w.status === 'pending' || w.operatingStatus === 'Pending'
  );
  if (pendingWorkspaces.length > 0) {
    items.push({
      id: 'workload-pending-activation',
      title: `${pendingWorkspaces.length} Workspace${pendingWorkspaces.length === 1 ? '' : 's'} in Pending Activation`,
      description: 'Organizer workspaces currently in pending transition while being activated on the platform.',
      priorityLabel: 'Priority 1',
      icon: 'add_business',
      iconBgClass: 'bg-amber-100 dark:bg-amber-950/50',
      iconColorClass: 'text-amber-800 dark:text-amber-400'
    });
  }

  const maintenanceWorkspaces = workspaces.filter(
    (w) => w.status === 'maintenance' || w.operatingStatus === 'Maintenance'
  );
  if (maintenanceWorkspaces.length > 0) {
    items.push({
      id: 'workload-maintenance',
      title: `${maintenanceWorkspaces.length} Workspace${maintenanceWorkspaces.length === 1 ? '' : 's'} Under Maintenance`,
      description: 'Workspaces temporarily placed in maintenance mode by organizers.',
      priorityLabel: 'Standard',
      icon: 'architecture',
      iconBgClass: 'bg-indigo-100 dark:bg-indigo-950/50',
      iconColorClass: 'text-primary dark:text-indigo-400'
    });
  }

  return items;
}

/**
 * Derive workspace status and booking activity records from canonical workspaces.
 */
export function deriveModerationDecisionRecords(
  workspaces?: CanonicalWorkspace[] | null
): ModerationDecisionRecord[] {
  if (!workspaces || workspaces.length === 0) return [];

  return workspaces.map((w) => {
    const isSuspended = w.moderationStatus === 'Suspended' || w.status === 'suspended';
    const isMaintenance = w.status === 'maintenance' || w.operatingStatus === 'Maintenance';
    const isPending = w.status === 'pending' || w.operatingStatus === 'Pending';
    const isDraft = w.status === 'draft' || w.reviewStatus === 'Draft';

    const action: ModerationDecisionRecord['action'] = isSuspended
      ? 'Suspended'
      : isMaintenance
      ? 'Under Maintenance'
      : isPending
      ? 'Pending Processing'
      : isDraft
      ? 'Draft'
      : 'Approved & Published';

    const actionStatus: ModerationDecisionRecord['actionStatus'] = isSuspended
      ? 'suspended'
      : isMaintenance
      ? 'maintenance'
      : isPending
      ? 'pending'
      : isDraft
      ? 'draft'
      : 'approved';

    const dateStr = isSuspended ? w.suspendedAt : (w.reviewedAt || w.updatedAt || w.createdAt || null);
    let displayTime = 'Recorded';
    let exactTime = 'Historical decision metadata';
    if (dateStr) {
      try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          displayTime = parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          exactTime = parsed.toUTCString();
        }
      } catch {
        // Keep fallback
      }
    }

    const adminName = isSuspended
      ? (w.suspendedBy || 'Administrator')
      : 'Auto-Approved (System)';

    const initials = isSuspended ? 'AD' : 'SYS';

    const auditTrailNotes = isSuspended
      ? (w.suspendReason || 'Workspace suspended by administrative policy.')
      : isMaintenance
      ? (w.reviewFeedback || 'Workspace is currently in maintenance mode.')
      : isPending
      ? 'Workspace is currently being processed for activation on the platform.'
      : 'Workspace automatically approved and published upon organizer submission.';

    const bookingCount = Number(w.bookingCount ?? w.totalBookings ?? w.totalBookingsMtd ?? 0);

    return {
      id: `rec-dyn-${w.id}`,
      workspaceId: w.workspaceCode || w.id,
      workspaceName: w.name,
      unit: w.facilitySubtitle || w.streetAddress || 'Main Unit',
      metroZone: `${w.district ? `${w.district}, ` : ''}${w.city || 'HCMC'}`,
      shortCode: (w.name || 'WS').slice(0, 2).toUpperCase(),
      organizerLegalEntity: w.organizerLegalName || 'Organizer Partner',
      bookingCount,
      action,
      actionStatus,
      adminHandler: {
        name: adminName,
        initials,
        avatarBgClass: isSuspended ? 'bg-slate-700 text-white' : 'bg-primary text-white',
        role: isSuspended ? 'Administrator' : 'Auto-Approval Engine'
      },
      timestamp: displayTime,
      timestampExact: exactTime,
      auditTrailNotes
    };
  });
}

