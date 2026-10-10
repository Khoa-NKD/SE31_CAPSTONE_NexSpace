/**
 * Mock Data for Screen A02 — Users & Role Permissions
 * Strictly deterministic sample data aligned with Stitch Project 6390451165421541093.
 */

export interface RoleSummaryKpi {
  id: string;
  title: string;
  value: string;
  badge?: string;
  subtext: string;
  icon: string;
}

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  module: 'Workspaces' | 'Bookings' | 'Financials' | 'Moderation' | 'Governance';
  customer: boolean;
  organizer: boolean;
  administrator: boolean; // always locked to true by platform root policy
  organizerNotice?: string;
  icon: string;
}

export const MOCK_ROLE_KPIS: RoleSummaryKpi[] = [
  {
    id: 'total-accounts',
    title: 'Total Accounts',
    value: '18,420',
    subtext: 'Across all tiers',
    icon: 'users'
  },
  {
    id: 'customers',
    title: 'Customers',
    value: '18,040',
    badge: '97.9%',
    subtext: 'Nomads & enterprise teams',
    icon: 'userCheck'
  },
  {
    id: 'space-organizers',
    title: 'Space Organizers',
    value: '342',
    badge: '12 pending KYC',
    subtext: 'Verified legal entities',
    icon: 'building'
  },
  {
    id: 'administrators',
    title: 'Administrators',
    value: '38',
    badge: 'MFA 100%',
    subtext: 'SecOps, Support, Finance',
    icon: 'shieldCheck'
  }
];

export const MOCK_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'workspace:view_public',
    name: 'workspace:view_public',
    description: 'Allows querying publicly indexed workspace listings, capacity, and live pricing.',
    module: 'Workspaces',
    customer: true,
    organizer: true,
    administrator: true,
    icon: 'eye'
  },
  {
    key: 'workspace:create_draft',
    name: 'workspace:create_draft',
    description: 'Author new room configurations, physical access gates, and media packs in draft state.',
    module: 'Workspaces',
    customer: false,
    organizer: true,
    administrator: true,
    icon: 'fileEdit'
  },
  {
    key: 'workspace:publish',
    name: 'workspace:publish',
    description: 'Promote drafts directly to the live marketplace catalog without manual SecOps review.',
    module: 'Workspaces',
    customer: false,
    organizer: true,
    administrator: true,
    organizerNotice: 'KYC Req',
    icon: 'upload'
  },
  {
    key: 'booking:create',
    name: 'booking:create',
    description: 'Initiate checkout reservations, lock hourly slots, and trigger debit escrow requests.',
    module: 'Bookings',
    customer: true,
    organizer: false,
    administrator: true,
    icon: 'calendarPlus'
  },
  {
    key: 'booking:cancel',
    name: 'booking:cancel',
    description: 'Request automated booking refunds within standard cancellation windows.',
    module: 'Bookings',
    customer: true,
    organizer: true,
    administrator: true,
    icon: 'calendarX'
  },
  {
    key: 'financial:export_ledger',
    name: 'financial:export_ledger',
    description: 'Download monthly settlement statements and tax reconciliation summaries.',
    module: 'Financials',
    customer: false,
    organizer: true,
    administrator: true,
    icon: 'download'
  },
  {
    key: 'financial:payout_request',
    name: 'financial:payout_request',
    description: 'Trigger bank transfers to verified beneficiary accounts via PayOS rails.',
    module: 'Financials',
    customer: false,
    organizer: true,
    administrator: true,
    organizerNotice: 'KYC Req',
    icon: 'creditCard'
  },
  {
    key: 'refund:approve',
    name: 'refund:approve',
    description: 'Override cancellation policy to authorize immediate escrow disbursement to customer.',
    module: 'Financials',
    customer: false,
    organizer: true,
    administrator: true,
    icon: 'checkCircle'
  },
  {
    key: 'review:dispute_flag',
    name: 'review:dispute_flag',
    description: 'Flag reviews or damage reports for formal investigation by platform moderation triage.',
    module: 'Moderation',
    customer: true,
    organizer: true,
    administrator: true,
    icon: 'flag'
  },
  {
    key: 'moderation:ban_user',
    name: 'moderation:ban_user',
    description: 'Issue emergency suspension locks on suspect client or host credentials across tenancy.',
    module: 'Moderation',
    customer: false,
    organizer: false,
    administrator: true,
    icon: 'userX'
  },
  {
    key: 'audit_log:export',
    name: 'audit_log:export',
    description: 'Generate immutable SHA-256 sealed access records for external SOC2 compliance checks.',
    module: 'Governance',
    customer: false,
    organizer: false,
    administrator: true,
    icon: 'shieldAlert'
  }
];
