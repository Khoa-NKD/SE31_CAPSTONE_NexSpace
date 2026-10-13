/**
 * Mock Data for Screen A01 — Administrator Dashboard
 * Strictly deterministic sample data aligned with Stitch Project 6390451165421541093.
 * Separated from presentation components for future API integration.
 */

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  changePercent?: string;
  changeType?: 'positive' | 'negative' | 'neutral' | 'warning';
  subtext: string;
  badgeText?: string;
  icon: string;
}

export interface TriageItem {
  id: string;
  title: string;
  targetScreenCode: string;
  targetScreenTitle: string;
  category: 'action' | 'verification' | 'dispute';
  statusBadge: string;
  count: number;
  countLabel: string;
  breakdown: string[];
  waitingNotice: string;
  actionLabel: string;
}

export interface OperationalTrendPoint {
  day: string;
  bookings: number;
  settlements: number;
  isPeak?: boolean;
}

export interface LiveSystemAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  acknowledged: boolean;
}

export interface OverviewDataSet {
  timeframe: string;
  kpis: KpiMetric[];
  triageItems: TriageItem[];
  trendPoints: OperationalTrendPoint[];
  alerts: LiveSystemAlert[];
  volumeSummary: {
    totalVolume: string;
    slaSuccessRate: string;
    peakDay: string;
    peakCount: number;
    peakHub: string;
  };
}

export const MOCK_OVERVIEW_DATA: Record<string, OverviewDataSet> = {
  '7d': {
    timeframe: 'Last 7 Days',
    kpis: [
      {
        id: 'total-users',
        label: 'Total Platform Users',
        value: '18,420',
        numericValue: 18420,
        changePercent: '+8% MoM',
        changeType: 'positive',
        subtext: '1,240 new signups this week',
        icon: 'users'
      },
      {
        id: 'active-organizers',
        label: 'Active Organizers',
        value: '342',
        numericValue: 342,
        badgeText: '12 pending',
        changeType: 'warning',
        subtext: '96.4% compliance verified',
        icon: 'building'
      },
      {
        id: 'active-workspaces',
        label: 'Active Workspaces',
        value: '618',
        numericValue: 618,
        badgeText: '8 under review',
        changeType: 'warning',
        subtext: 'Across 14 metro zones',
        icon: 'store'
      },
      {
        id: 'total-bookings',
        label: 'Total Bookings',
        value: '4,890',
        numericValue: 4890,
        badgeText: '$142.5K GMV',
        changePercent: '+14.2% vs previous',
        changeType: 'positive',
        subtext: 'Monthly booking velocity',
        icon: 'calendar'
      },
      {
        id: 'net-fees',
        label: 'Net Take Rate / Fees',
        value: '$17,100',
        numericValue: 17100,
        badgeText: '12% avg yield',
        changeType: 'neutral',
        subtext: 'Net platform yield captured',
        icon: 'creditCard'
      }
    ],
    triageItems: [
      {
        id: 'triage-organizers',
        title: 'Pending Organizer Applications',
        targetScreenCode: 'A05',
        targetScreenTitle: 'Verification Requests Queue',
        category: 'action',
        statusBadge: 'Action Required',
        count: 12,
        countLabel: '12 Requests',
        breakdown: ['8 Commercial Fleets', '4 Boutique Studios'],
        waitingNotice: 'Oldest waiting: 18h ago',
        actionLabel: 'Review Applications'
      },
      {
        id: 'triage-workspaces',
        title: 'Pending Workspace Approvals',
        targetScreenCode: 'A07',
        targetScreenTitle: 'Workspace Moderation List',
        category: 'verification',
        statusBadge: 'Verification',
        count: 8,
        countLabel: '8 Workspaces',
        breakdown: ['5 Safety Audits', '3 Rate Changes'],
        waitingNotice: '3 location updates, 5 new hubs',
        actionLabel: 'Moderate Workspaces'
      },
      {
        id: 'triage-disputes',
        title: 'Urgent Disputes & Refunds',
        targetScreenCode: 'A10',
        targetScreenTitle: 'Refund Management & Claims',
        category: 'dispute',
        statusBadge: 'Needs resolution < 4h',
        count: 5,
        countLabel: '5 Open Cases',
        breakdown: ['Payout Holds: $4,210', '1 Escalated'],
        waitingNotice: '3 Refunds, 2 Damage Reports',
        actionLabel: 'Triage Cases Immediately'
      }
    ],
    trendPoints: [
      { day: 'Mon', bookings: 135, settlements: 140 },
      { day: 'Tue', bookings: 118, settlements: 120 },
      { day: 'Wed', bookings: 120, settlements: 124 },
      { day: 'Thu', bookings: 85, settlements: 90 },
      { day: 'Fri', bookings: 264, settlements: 250, isPeak: true },
      { day: 'Sat', bookings: 35, settlements: 40 },
      { day: 'Sun', bookings: 70, settlements: 74 }
    ],
    alerts: [
      {
        id: 'alert-1',
        title: 'PayOS Webhook Latency Spike',
        description: 'Settlement confirmation delay exceeds 1200ms in cluster AP-Southeast-1.',
        severity: 'critical',
        timestamp: '12m ago',
        acknowledged: false
      },
      {
        id: 'alert-2',
        title: 'Escalated Safety Audit Required',
        description: 'Workspace WS-8812 (Saigon Hub) submitted modified mezzanine fire layout.',
        severity: 'warning',
        timestamp: '45m ago',
        acknowledged: false
      },
      {
        id: 'alert-3',
        title: 'Unusual Cancellation Velocity',
        description: 'District 1 boutique studio registered 6 cancellations in 60 minutes.',
        severity: 'warning',
        timestamp: '2h ago',
        acknowledged: false
      },
      {
        id: 'alert-4',
        title: 'SOC2 Immutable Audit Snapshot',
        description: 'Daily SHA-256 access ledger cryptographically sealed to secure vault.',
        severity: 'info',
        timestamp: '4h ago',
        acknowledged: true
      }
    ],
    volumeSummary: {
      totalVolume: '1,420 bookings',
      slaSuccessRate: '99.4% SLA',
      peakDay: 'Fri',
      peakCount: 264,
      peakHub: 'District 1 Hub'
    }
  },
  'today': {
    timeframe: 'Today',
    kpis: [
      {
        id: 'total-users',
        label: 'Total Platform Users',
        value: '18,420',
        numericValue: 18420,
        changePercent: '+124 today',
        changeType: 'positive',
        subtext: 'Intraday registrations',
        icon: 'users'
      },
      {
        id: 'active-organizers',
        label: 'Active Organizers',
        value: '342',
        numericValue: 342,
        badgeText: '3 pending',
        changeType: 'warning',
        subtext: '96.4% compliance verified',
        icon: 'building'
      },
      {
        id: 'active-workspaces',
        label: 'Active Workspaces',
        value: '618',
        numericValue: 618,
        badgeText: '2 under review',
        changeType: 'neutral',
        subtext: 'Across 14 metro zones',
        icon: 'store'
      },
      {
        id: 'total-bookings',
        label: 'Total Bookings',
        value: '184',
        numericValue: 184,
        badgeText: '$5.4K GMV',
        changePercent: '+4.2% vs yesterday',
        changeType: 'positive',
        subtext: 'Today booking velocity',
        icon: 'calendar'
      },
      {
        id: 'net-fees',
        label: 'Net Take Rate / Fees',
        value: '$648',
        numericValue: 648,
        badgeText: '12% avg yield',
        changeType: 'neutral',
        subtext: 'Intraday captured yield',
        icon: 'creditCard'
      }
    ],
    triageItems: [
      {
        id: 'triage-organizers',
        title: 'Pending Organizer Applications',
        targetScreenCode: 'A05',
        targetScreenTitle: 'Verification Requests Queue',
        category: 'action',
        statusBadge: 'Action Required',
        count: 3,
        countLabel: '3 Requests',
        breakdown: ['2 Commercial Fleets', '1 Boutique Studio'],
        waitingNotice: 'Oldest waiting: 4h ago',
        actionLabel: 'Review Applications'
      },
      {
        id: 'triage-workspaces',
        title: 'Pending Workspace Approvals',
        targetScreenCode: 'A07',
        targetScreenTitle: 'Workspace Moderation List',
        category: 'verification',
        statusBadge: 'Verification',
        count: 2,
        countLabel: '2 Workspaces',
        breakdown: ['2 Safety Audits', '0 Rate Changes'],
        waitingNotice: '2 location updates',
        actionLabel: 'Moderate Workspaces'
      },
      {
        id: 'triage-disputes',
        title: 'Urgent Disputes & Refunds',
        targetScreenCode: 'A10',
        targetScreenTitle: 'Refund Management & Claims',
        category: 'dispute',
        statusBadge: 'Needs resolution < 4h',
        count: 1,
        countLabel: '1 Open Case',
        breakdown: ['Payout Holds: $420', '0 Escalated'],
        waitingNotice: '1 Refund Case',
        actionLabel: 'Triage Cases Immediately'
      }
    ],
    trendPoints: [
      { day: '00:00', bookings: 8, settlements: 8 },
      { day: '04:00', bookings: 4, settlements: 4 },
      { day: '08:00', bookings: 42, settlements: 40 },
      { day: '12:00', bookings: 68, settlements: 65, isPeak: true },
      { day: '16:00', bookings: 44, settlements: 45 },
      { day: '20:00', bookings: 18, settlements: 18 }
    ],
    alerts: [
      {
        id: 'alert-1',
        title: 'PayOS Webhook Latency Normalizing',
        description: 'Latency recovered to 18ms across all instances.',
        severity: 'info',
        timestamp: '5m ago',
        acknowledged: false
      }
    ],
    volumeSummary: {
      totalVolume: '184 bookings',
      slaSuccessRate: '99.8% SLA',
      peakDay: '12:00',
      peakCount: 68,
      peakHub: 'District 1 Hub'
    }
  },
  '30d': {
    timeframe: 'Last 30 Days',
    kpis: [
      {
        id: 'total-users',
        label: 'Total Platform Users',
        value: '18,420',
        numericValue: 18420,
        changePercent: '+18% QoQ',
        changeType: 'positive',
        subtext: '4,890 active monthly users',
        icon: 'users'
      },
      {
        id: 'active-organizers',
        label: 'Active Organizers',
        value: '342',
        numericValue: 342,
        badgeText: '12 pending',
        changeType: 'warning',
        subtext: '96.4% compliance verified',
        icon: 'building'
      },
      {
        id: 'active-workspaces',
        label: 'Active Workspaces',
        value: '618',
        numericValue: 618,
        badgeText: '8 under review',
        changeType: 'neutral',
        subtext: 'Across 14 metro zones',
        icon: 'store'
      },
      {
        id: 'total-bookings',
        label: 'Total Bookings',
        value: '4,890',
        numericValue: 4890,
        badgeText: '$142.5K GMV',
        changePercent: '+14.2% vs previous period',
        changeType: 'positive',
        subtext: 'Gross merchandise value',
        icon: 'calendar'
      },
      {
        id: 'net-fees',
        label: 'Net Take Rate / Fees',
        value: '$17,100',
        numericValue: 17100,
        badgeText: '12% avg yield',
        changeType: 'neutral',
        subtext: '12% take rate on $142.5K GMV',
        icon: 'creditCard'
      }
    ],
    triageItems: [
      {
        id: 'triage-organizers',
        title: 'Pending Organizer Applications',
        targetScreenCode: 'A05',
        targetScreenTitle: 'Verification Requests Queue',
        category: 'action',
        statusBadge: 'Action Required',
        count: 12,
        countLabel: '12 Requests',
        breakdown: ['8 Commercial Fleets', '4 Boutique Studios'],
        waitingNotice: 'Oldest waiting: 18h ago',
        actionLabel: 'Review Applications'
      },
      {
        id: 'triage-workspaces',
        title: 'Pending Workspace Approvals',
        targetScreenCode: 'A07',
        targetScreenTitle: 'Workspace Moderation List',
        category: 'verification',
        statusBadge: 'Verification',
        count: 8,
        countLabel: '8 Workspaces',
        breakdown: ['5 Safety Audits', '3 Rate Changes'],
        waitingNotice: '3 location updates, 5 new hubs',
        actionLabel: 'Moderate Workspaces'
      },
      {
        id: 'triage-disputes',
        title: 'Urgent Disputes & Refunds',
        targetScreenCode: 'A10',
        targetScreenTitle: 'Refund Management & Claims',
        category: 'dispute',
        statusBadge: 'Needs resolution < 4h',
        count: 5,
        countLabel: '5 Open Cases',
        breakdown: ['Payout Holds: $4,210', '1 Escalated'],
        waitingNotice: '3 Refunds, 2 Damage Reports',
        actionLabel: 'Triage Cases Immediately'
      }
    ],
    trendPoints: [
      { day: 'Week 1', bookings: 1100, settlements: 1080 },
      { day: 'Week 2', bookings: 1180, settlements: 1160 },
      { day: 'Week 3', bookings: 1250, settlements: 1230 },
      { day: 'Week 4', bookings: 1360, settlements: 1340, isPeak: true }
    ],
    alerts: [
      {
        id: 'alert-1',
        title: 'Monthly Security Review Passed',
        description: 'Zero high severity findings in SOC2 automated run.',
        severity: 'info',
        timestamp: '3d ago',
        acknowledged: true
      }
    ],
    volumeSummary: {
      totalVolume: '4,890 bookings',
      slaSuccessRate: '99.6% SLA',
      peakDay: 'Week 4',
      peakCount: 1360,
      peakHub: 'All Hubs'
    }
  }
};
