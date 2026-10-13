/**
 * Strictly deterministic mock data aligned with Stitch Project 6390451165421541093.
 * Screen: A06: Workspace Administration Overview (Screen ID: e4047dc13f1c46cb9952dc34e5ab15a5)
 */

export interface WorkspaceKpis {
  totalPublishedSpaces: number;
  publishedMonthlyGrowth: number;
  metroHubsCount: number;
  pendingModerationCount: number;
  pendingOldestHours: number;
  suspendedCount: number;
  suspendedGrievanceDetails: string;
  partnerDraftsCount: number;
}

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
  nomadRating: number;
  totalRatingsCount: string;
  hygieneFlags: number;
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
  action: 'Approved & Published' | 'Suspended (Safety Audit)' | 'Re-activated' | 'Flags Resolved';
  actionStatus: 'approved' | 'suspended' | 'reactivated' | 'resolved';
  adminHandler: {
    name: string;
    initials: string;
    avatarBgClass: string;
    role: string;
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
    description: 'Initial space specs, electrical load safety check, and lease title review.',
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
  nomadRating: 4.85,
  totalRatingsCount: '14.2k user ratings',
  hygieneFlags: 0,
  hygieneCleanPeriod: 'Past 7 days clean',
  mysteryAuditsPercentage: 98.2,
  verifiedHubsCount: 45,
  gradeBadge: 'Grade: Exceptional (A+)',
  standardsEngineNote: 'ISO-27001 & OSHA compliant'
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
    auditTrailNotes: 'Electrical safety load verification approved; capacity set to 24 seats.'
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
    auditTrailNotes: 'Updated fire safety compliance certificate submitted and verified with Da Nang municipal authorities.'
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
    auditTrailNotes: 'Initial onboarding audit completed. Noise baseline measured at 38dB (Class A quiet space).'
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
    auditTrailNotes: 'Air quality HVAC filter maintenance verified by on-site third-party audit.'
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
