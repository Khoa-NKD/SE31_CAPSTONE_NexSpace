export interface CommissionRule {
  id: string;
  ruleCode: string;
  name: string;
  subtitle: string;
  scope: string;
  scopeType: 'marketplace' | 'enterprise' | 'gateway';
  effectiveRate: number; // percentage (e.g. 12.0)
  fixedFeeVnd?: number; // e.g. 2000
  effectiveFrom: string;
  effectiveTo: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'DEPRECATED';
  description: string;
  applicableSpaces: string;
  calculationType: 'PERCENTAGE' | 'FLAT_VARIABLE' | 'TIERED';
  version: string;
}

export interface GtvMonthlyData {
  month: string;
  gtvAmountUsd: number;
  gtvDisplay: string;
  netRevenueUsd: number;
  netDisplay: string;
  gtvPercent: number; // For relative bar widths
  revenuePercent: number;
}

export interface ActiveFeeTile {
  id: string;
  title: string;
  category: string;
  rateDisplay: string;
  subRateLabel: string;
  description: string;
  retained30d: string;
  volumeLabel: string;
  statusBadge: string;
  statusColor: 'emerald' | 'indigo' | 'blue' | 'amber';
  icon: string;
}

export const MOCK_ACTIVE_FEE_TILES: ActiveFeeTile[] = [
  {
    id: 'tile-mkt',
    title: 'Marketplace Take-Rate',
    category: 'MARKETPLACE TAKE-RATE',
    rateDisplay: '12.0%',
    subRateLabel: 'per confirmed booking',
    description:
      'Applies to all on-demand hot desks, quiet booths, and hourly meeting rooms across Southeast Asia nodes.',
    retained30d: '$17,100.00',
    volumeLabel: '3,842 transactions',
    statusBadge: 'Active',
    statusColor: 'emerald',
    icon: 'storefront'
  },
  {
    id: 'tile-enterprise',
    title: 'Enterprise Private Suites',
    category: 'ENTERPRISE PRIVATE SUITES',
    rateDisplay: '8.0%',
    subRateLabel: 'recurring monthly billing',
    description:
      'Long-term month-to-month contracts & dedicated team wings (Tier-1 Enterprise partners with negotiated SLA).',
    retained30d: '$8,450.00',
    volumeLabel: '42 monthly accounts',
    statusBadge: 'Tier-1 Partner',
    statusColor: 'indigo',
    icon: 'building'
  },
  {
    id: 'tile-gateway',
    title: 'Gateway Pass-Through (PayOS)',
    category: 'GATEWAY PASS-THROUGH (PAYOS)',
    rateDisplay: '1.5% + 2,000 VND',
    subRateLabel: 'direct pass-through fee',
    description:
      'Direct pass-through gateway fee via VietQR NAPAS247 & domestic card rails (Zero platform markup applied).',
    retained30d: '100% matched',
    volumeLabel: 'Reconciled',
    statusBadge: 'Pass-through',
    statusColor: 'blue',
    icon: 'qrCode'
  }
];

export const MOCK_GTV_MONTHLY_HISTORY: GtvMonthlyData[] = [
  {
    month: 'Aug 2025',
    gtvAmountUsd: 98000,
    gtvDisplay: '$98.0k',
    netRevenueUsd: 11800,
    netDisplay: '$11.8k net',
    gtvPercent: 68,
    revenuePercent: 28
  },
  {
    month: 'Sep 2025',
    gtvAmountUsd: 108000,
    gtvDisplay: '$108.0k',
    netRevenueUsd: 13000,
    netDisplay: '$13.0k net',
    gtvPercent: 74,
    revenuePercent: 31
  },
  {
    month: 'Oct 2025',
    gtvAmountUsd: 120000,
    gtvDisplay: '$120.0k',
    netRevenueUsd: 14400,
    netDisplay: '$14.4k net',
    gtvPercent: 82,
    revenuePercent: 34
  },
  {
    month: 'Nov 2025',
    gtvAmountUsd: 128000,
    gtvDisplay: '$128.0k',
    netRevenueUsd: 15300,
    netDisplay: '$15.3k net',
    gtvPercent: 88,
    revenuePercent: 36
  },
  {
    month: 'Dec 2025',
    gtvAmountUsd: 135000,
    gtvDisplay: '$135.0k',
    netRevenueUsd: 16200,
    netDisplay: '$16.2k net',
    gtvPercent: 93,
    revenuePercent: 38
  },
  {
    month: 'Jan 2026',
    gtvAmountUsd: 142500,
    gtvDisplay: '$142.5k',
    netRevenueUsd: 17100,
    netDisplay: '$17.1k net',
    gtvPercent: 100,
    revenuePercent: 41
  }
];

export const MOCK_COMMISSION_RULES: CommissionRule[] = [
  {
    id: 'rule-01',
    ruleCode: 'NX_COMM_MKT_ST_01',
    name: 'Standard Marketplace Hot Desk Fee',
    subtitle: 'Base transaction commission',
    scope: 'Global Marketplace (All Spaces)',
    scopeType: 'marketplace',
    effectiveRate: 12.0,
    effectiveFrom: 'Jan 01, 2025',
    effectiveTo: 'Indefinite',
    status: 'ACTIVE',
    description:
      'Applies platform-wide to hot desks, flexible pods, and hourly meeting rooms in Vietnam and Singapore hubs.',
    applicableSpaces: 'All Hot Desks & Hourly Meeting Rooms',
    calculationType: 'PERCENTAGE',
    version: 'v2.4.1'
  },
  {
    id: 'rule-02',
    ruleCode: 'NX_COMM_ENT_PR_02',
    name: 'Dedicated Enterprise Suite Rate',
    subtitle: 'Long-term corporate tenant agreement',
    scope: 'Tier-1 Enterprise Accounts',
    scopeType: 'enterprise',
    effectiveRate: 8.0,
    effectiveFrom: 'Nov 15, 2025',
    effectiveTo: 'Dec 31, 2026',
    status: 'ACTIVE',
    description:
      'Volume-based corporate retainer applied to month-to-month contracts and private team suites.',
    applicableSpaces: 'Enterprise Suites & Private Wings',
    calculationType: 'PERCENTAGE',
    version: 'v2.4.1'
  },
  {
    id: 'rule-03',
    ruleCode: 'NX_COMM_GW_PAYOS_03',
    name: 'Instant PayOS VietQR Pass-through',
    subtitle: 'Domestic rails direct pass-through',
    scope: 'All VietQR & Domestic Rails',
    scopeType: 'gateway',
    effectiveRate: 1.5,
    fixedFeeVnd: 2000,
    effectiveFrom: 'Launch Date',
    effectiveTo: 'Indefinite',
    status: 'ACTIVE',
    description:
      'Direct pass-through gateway rail charges via VietQR NAPAS247 and domestic credit/debit cards.',
    applicableSpaces: 'Domestic checkout transactions',
    calculationType: 'FLAT_VARIABLE',
    version: 'v2.4.1'
  },
  {
    id: 'rule-04',
    ruleCode: 'NX_COMM_EVT_SUR_04',
    name: 'Weekend Event Auditorium Surcharge',
    subtitle: 'After-hours & large venue surcharge',
    scope: 'After-hours & Auditorium',
    scopeType: 'marketplace',
    effectiveRate: 15.0,
    effectiveFrom: 'Oct 01, 2025',
    effectiveTo: 'Indefinite',
    status: 'ACTIVE',
    description:
      'Additional platform facilitation and technical support fee for weekend corporate hackathons and summits.',
    applicableSpaces: 'Auditoriums & Event Halls',
    calculationType: 'PERCENTAGE',
    version: 'v2.4.1'
  },
  {
    id: 'rule-05',
    ruleCode: 'NX_COMM_CNL_PEN_05',
    name: 'Late Cancellation Penalty Share',
    subtitle: 'Short-notice cancellation split',
    scope: 'Short-notice Cancellations',
    scopeType: 'marketplace',
    effectiveRate: 20.0,
    effectiveFrom: 'Launch Date',
    effectiveTo: 'Indefinite',
    status: 'ACTIVE',
    description:
      'Platform mediation fee retained from non-refundable late cancellation fees paid by customers.',
    applicableSpaces: 'All cancellations < 24h prior to check-in',
    calculationType: 'PERCENTAGE',
    version: 'v2.4.1'
  }
];
