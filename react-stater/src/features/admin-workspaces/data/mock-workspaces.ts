/**
 * Strictly deterministic mock data aligned with Stitch Project 6390451165421541093.
 * Screen: A06: Workspace Administration Overview (Screen ID: e4047dc13f1c46cb9952dc34e5ab15a5)
 */
import type { CanonicalWorkspace } from '../../workspaces/api/types.ts';
import { isWorkspacePubliclyEligible } from '../../workspaces/api/types.ts';

export interface WorkspaceKpis {
  totalPublishedSpaces: number;
  publishedMonthlyGrowth?: number | null;
  metroHubsCount: number;
  pendingModerationCount: number;
  pendingOldestHours: number;
  suspendedCount: number;
  suspendedGrievanceDetails: string;
  partnerDraftsCount: number;
}

export const ZERO_WORKSPACE_KPIS: WorkspaceKpis = {
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
  action: 'Approved' | 'Suspended' | 'Rejected' | 'Approved & Published' | 'Suspended (Safety Audit)' | 'Re-activated' | 'Flags Resolved';
  actionStatus: 'approved' | 'suspended' | 'rejected' | 'reactivated' | 'resolved';
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
  const pending = workspaces.filter((w) => w.reviewStatus === 'Pending').length;
  const suspended = workspaces.filter((w) => w.moderationStatus === 'Suspended').length;
  const drafts = workspaces.filter((w) => w.reviewStatus === 'Draft').length;

  let oldestHours = 0;
  const pendingSpaces = workspaces.filter((w) => w.reviewStatus === 'Pending');
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
    totalPublishedSpaces: published,
    publishedMonthlyGrowth: null,
    metroHubsCount: metroCount,
    pendingModerationCount: pending,
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
 * Derive operational moderation workload items strictly from canonical workspaces.
 */
export function deriveModerationWorkloadItems(
  workspaces?: CanonicalWorkspace[] | null
): ModerationWorkloadItem[] {
  if (!workspaces) return [];

  const pendingWorkspaces = workspaces.filter((w) => w.reviewStatus === 'Pending');
  if (pendingWorkspaces.length === 0) return [];

  return [
    {
      id: 'workload-pending-review',
      title: `${pendingWorkspaces.length} Pending Workspace Review${pendingWorkspaces.length === 1 ? '' : 's'}`,
      description: 'New workspace registrations and onboarding submissions awaiting administrative compliance sign-off.',
      priorityLabel: 'Priority 1',
      icon: 'add_business',
      iconBgClass: 'bg-amber-100 dark:bg-amber-950/50',
      iconColorClass: 'text-amber-800 dark:text-amber-400'
    }
  ];
}

/**
 * Derive latest administrative decisions strictly from genuine persisted review/moderation metadata.
 * Never appends static mock records.
 */
export function deriveModerationDecisionRecords(
  workspaces?: CanonicalWorkspace[] | null
): ModerationDecisionRecord[] {
  if (!workspaces || workspaces.length === 0) return [];

  return workspaces
    .filter((w) => {
      const hasSuspension = w.moderationStatus === 'Suspended' && Boolean(w.suspendedAt || w.suspendedBy || w.suspendReason);
      const hasReviewDecision = (w.reviewStatus === 'Approved' || w.reviewStatus === 'Rejected') && Boolean(w.reviewedAt || w.reviewedBy);
      return hasSuspension || hasReviewDecision;
    })
    .map((w) => {
      const isSuspended = w.moderationStatus === 'Suspended';
      const isApproved = w.reviewStatus === 'Approved';
      const isRejected = w.reviewStatus === 'Rejected';

      const action: ModerationDecisionRecord['action'] = isSuspended
        ? 'Suspended'
        : isApproved
        ? 'Approved'
        : isRejected
        ? 'Rejected'
        : 'Flags Resolved';

      const actionStatus: ModerationDecisionRecord['actionStatus'] = isSuspended
        ? 'suspended'
        : isApproved
        ? 'approved'
        : isRejected
        ? 'rejected'
        : 'resolved';

      const dateStr = isSuspended ? w.suspendedAt : (w.reviewedAt || null);
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
        : (w.reviewedBy || 'Administrator');

      const initials =
        adminName
          .split(' ')
          .map((s) => s[0])
          .filter(Boolean)
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'AD';

      const auditTrailNotes = isSuspended
        ? (w.suspendReason || 'Workspace suspended by administrative policy.')
        : isApproved
        ? (w.reviewFeedback || 'Workspace approved by administrator.')
        : (w.reviewFeedback || 'Workspace rejected during administrative review.');

      return {
        id: `rec-dyn-${w.id}`,
        workspaceId: w.workspaceCode || w.id,
        workspaceName: w.name,
        unit: w.facilitySubtitle || w.streetAddress || 'Main Unit',
        metroZone: `${w.district ? `${w.district}, ` : ''}${w.city || 'HCMC'}`,
        shortCode: (w.name || 'WS').slice(0, 2).toUpperCase(),
        organizerLegalEntity: w.organizerLegalName || 'Organizer Partner',
        action,
        actionStatus,
        adminHandler: {
          name: adminName,
          initials,
          avatarBgClass: isSuspended ? 'bg-slate-700 text-white' : 'bg-primary text-white',
          role: 'Administrator'
        },
        timestamp: displayTime,
        timestampExact: exactTime,
        auditTrailNotes
      };
    });
}

