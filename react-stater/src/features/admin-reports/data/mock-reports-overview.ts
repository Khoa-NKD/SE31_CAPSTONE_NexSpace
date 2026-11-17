export interface ReportsKpis {
  openCasesCount: number;
  pendingTriageCount: number;
  urgentEscalationsCount: number;
  avgResolutionHours: number;
  resolutionTrendMoM: number;
  resolvedCasesCount: number;
  satisfactionRate: number;
  restoredGoodwillUsd: number;
}

export interface CategoryBreakdownItem {
  id: string;
  name: string;
  percentage: number;
  casesCount: number;
  color: string;
}

export interface SlaTierItem {
  tier: string;
  title: string;
  slaTarget: string;
  compliancePercentage: number;
  avgRealized: string;
  statusColor: 'emerald' | 'indigo' | 'amber';
}

export interface RecentDisputeItem {
  id: string; // e.g. "#DIS-401"
  caseCode: string; // e.g. "CASE-401" -> matches A12
  subject: string;
  hubLocation: string;
  reporterName: string;
  reporterRole: string;
  reporterAvatarUrl: string;
  severity: 'URGENT' | 'HIGH' | 'MEDIUM';
  loggedTimeAgo: string;
  triageStatus: 'Pending Triage' | 'Under Review' | 'Evidence Attached';
  triageBadgeColor: 'amber' | 'indigo';
}

export const MOCK_REPORTS_KPIS: ReportsKpis = {
  openCasesCount: 5,
  pendingTriageCount: 3,
  urgentEscalationsCount: 2,
  avgResolutionHours: 3.4,
  resolutionTrendMoM: -18,
  resolvedCasesCount: 38,
  satisfactionRate: 94.8,
  restoredGoodwillUsd: 1840
};

export const MOCK_CATEGORY_BREAKDOWN: CategoryBreakdownItem[] = [
  {
    id: 'facility',
    name: 'Facility / Cleanliness & Maintenance',
    percentage: 45,
    casesCount: 19,
    color: '#4F46E5'
  },
  {
    id: 'noise',
    name: 'Noise / Member Disruptive Behavior',
    percentage: 30,
    casesCount: 13,
    color: '#0284C7'
  },
  {
    id: 'billing',
    name: 'Billing, Overstay & Keycard Disputes',
    percentage: 25,
    casesCount: 11,
    color: '#F59E0B'
  }
];

export const MOCK_SLA_TIERS: SlaTierItem[] = [
  {
    tier: 'Level 1',
    title: 'Critical / Safety Violations',
    slaTarget: '2 Hours',
    compliancePercentage: 100,
    avgRealized: 'Avg 42 mins',
    statusColor: 'emerald'
  },
  {
    tier: 'Level 2',
    title: 'Facility Defects & AC Failures',
    slaTarget: '6 Hours',
    compliancePercentage: 92,
    avgRealized: 'Avg 3.4 hrs',
    statusColor: 'indigo'
  },
  {
    tier: 'Level 3',
    title: 'Noise & Amenities Grievance',
    slaTarget: '12 Hours',
    compliancePercentage: 88,
    avgRealized: 'Avg 7.1 hrs',
    statusColor: 'amber'
  },
  {
    tier: 'Level 4',
    title: 'Billing & Deposit Clarification',
    slaTarget: '24 Hours',
    compliancePercentage: 98,
    avgRealized: 'Avg 11.2 hrs',
    statusColor: 'emerald'
  }
];

export const MOCK_RECENT_DISPUTES: RecentDisputeItem[] = [
  {
    id: '#DIS-401',
    caseCode: 'CASE-401',
    subject: 'HVAC Condensation & Room Flooding',
    hubLocation: 'NexSpace Saigon Prime Hub • Suite 4B',
    reporterName: 'David Pham',
    reporterRole: 'Verified Nomad',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    severity: 'URGENT',
    loggedTimeAgo: '18 mins ago',
    triageStatus: 'Pending Triage',
    triageBadgeColor: 'amber'
  },
  {
    id: '#DIS-402',
    caseCode: 'CASE-402',
    subject: 'Unauthorized Party & Excessive Noise',
    hubLocation: 'Westlake Executive Suites • Zone A',
    reporterName: 'Elena Rostova',
    reporterRole: 'Team Lead (Fintech)',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    severity: 'URGENT',
    loggedTimeAgo: '1.2 hours ago',
    triageStatus: 'Under Review',
    triageBadgeColor: 'indigo'
  },
  {
    id: '#DIS-403',
    caseCode: 'CASE-403',
    subject: 'Access Turnstile NFC Failure & Lockout',
    hubLocation: 'Landmark 81 Innovation Center • 46F',
    reporterName: 'Alex Nguyen',
    reporterRole: 'Enterprise Member',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    severity: 'HIGH',
    loggedTimeAgo: '2.8 hours ago',
    triageStatus: 'Evidence Attached',
    triageBadgeColor: 'amber'
  },
  {
    id: '#DIS-404',
    caseCode: 'CASE-404',
    subject: 'Meeting Pod Booking Conflict & Double Charge',
    hubLocation: 'Da Nang Coastal Innovation Hub • Pod 02',
    reporterName: 'Sarah Jenkins',
    reporterRole: 'Pro Member',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    severity: 'MEDIUM',
    loggedTimeAgo: '3.6 hours ago',
    triageStatus: 'Pending Triage',
    triageBadgeColor: 'amber'
  },
  {
    id: '#DIS-405',
    caseCode: 'CASE-405',
    subject: 'Damaged Ergonomic Task Chair • Desk 18',
    hubLocation: 'NexSpace Saigon Prime Hub • Floor 3',
    reporterName: 'Michael Chen',
    reporterRole: 'Resident Dedicated Desk',
    reporterAvatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    severity: 'MEDIUM',
    loggedTimeAgo: '5.1 hours ago',
    triageStatus: 'Under Review',
    triageBadgeColor: 'indigo'
  }
];
