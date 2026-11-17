import {
  PricingKpiSummary,
  PricingTierRule,
  PricingResourceRow
} from '../types';

export const INITIAL_PRICING_KPIS: PricingKpiSummary = {
  avgHourlyRate: 4.2,
  avgHourlyGrowth: 4.2,
  weeklyBookingsHours: 314,
  activeDiscountRuleLabel: '15% ≥ 5hrs',
  occupancyForecastPercent: 82.4
};

export const INITIAL_PRICING_RULES: PricingTierRule[] = [
  {
    id: 'rule-hot-desks',
    name: 'Standard Hot Desk Tier',
    scope: 'RESOURCE_TYPE',
    targetCategory: 'HOT_DESK',
    targetCategoryLabel: 'All Hot Desks',
    targetCount: 28,
    hourlyRate: 2.5,
    dailyRate: 18.0,
    monthlyRate: 250.0,
    minBookingHours: 1,
    durationDiscountEnabled: true,
    durationThresholdHours: 5,
    durationDiscountPercent: 15,
    weekendSurchargeEnabled: false,
    weekendSurchargePerHour: 0.5,
    status: 'ACTIVE',
    updatedAt: '2 hours ago'
  },
  {
    id: 'rule-dedicated-workstations',
    name: 'Dedicated Private Workstations',
    scope: 'RESOURCE_TYPE',
    targetCategory: 'DEDICATED_DESK',
    targetCategoryLabel: 'Dedicated Desks',
    targetCount: 20,
    hourlyRate: 3.5,
    dailyRate: 24.0,
    monthlyRate: 340.0,
    minBookingHours: 2,
    durationDiscountEnabled: true,
    durationThresholdHours: 6,
    durationDiscountPercent: 10,
    weekendSurchargeEnabled: true,
    weekendSurchargePerHour: 1.0,
    status: 'ACTIVE',
    updatedAt: 'Yesterday'
  },
  {
    id: 'rule-meeting-suites',
    name: 'Conference & Meeting Suites',
    scope: 'RESOURCE_TYPE',
    targetCategory: 'MEETING_ROOM',
    targetCategoryLabel: 'Meeting Hubs',
    targetCount: 6,
    hourlyRate: 18.0,
    dailyRate: 120.0,
    monthlyRate: 1800.0,
    minBookingHours: 1,
    durationDiscountEnabled: true,
    durationThresholdHours: 4,
    durationDiscountPercent: 20,
    weekendSurchargeEnabled: false,
    weekendSurchargePerHour: 2.5,
    status: 'ACTIVE',
    updatedAt: '3 days ago'
  },
  {
    id: 'rule-acoustic-booths',
    name: 'Acoustic Solo Booths',
    scope: 'RESOURCE_TYPE',
    targetCategory: 'BOOTH',
    targetCategoryLabel: 'Phone Booths',
    targetCount: 8,
    hourlyRate: 4.0,
    dailyRate: 28.0,
    monthlyRate: 380.0,
    minBookingHours: 0.5,
    durationDiscountEnabled: false,
    durationThresholdHours: 3,
    durationDiscountPercent: 10,
    weekendSurchargeEnabled: false,
    weekendSurchargePerHour: 0.5,
    status: 'ACTIVE',
    updatedAt: '1 week ago'
  }
];

export const MOCK_PRICING_RESOURCES: PricingResourceRow[] = [
  {
    id: 'res-desk-a01',
    code: 'DESK-A01',
    name: 'Flexible Workstation A01',
    category: 'HOT_DESK',
    categoryLabel: 'Hot Desk Flexible',
    baseHourly: 2.5,
    dailyPass: 18.0,
    monthlyPass: 250.0,
    status: 'ACTIVE',
    hasCustomOverwrite: false,
    appliedRuleName: 'Standard Hot Desk Tier'
  },
  {
    id: 'res-desk-a02',
    code: 'DESK-A02',
    name: 'Flexible Workstation A02',
    category: 'HOT_DESK',
    categoryLabel: 'Hot Desk Flexible',
    baseHourly: 2.5,
    dailyPass: 18.0,
    monthlyPass: 250.0,
    status: 'ACTIVE',
    hasCustomOverwrite: false,
    appliedRuleName: 'Standard Hot Desk Tier'
  },
  {
    id: 'res-desk-a03',
    code: 'DESK-A03',
    name: 'Flexible Workstation A03',
    category: 'HOT_DESK',
    categoryLabel: 'Hot Desk Flexible',
    baseHourly: 2.5,
    dailyPass: 18.0,
    monthlyPass: 250.0,
    status: 'ACTIVE',
    hasCustomOverwrite: false,
    appliedRuleName: 'Standard Hot Desk Tier'
  },
  {
    id: 'res-desk-a12',
    code: 'DESK-A12',
    name: 'Window-side Ergonomic Pod 12',
    category: 'HOT_DESK',
    categoryLabel: 'Hot Desk Premium',
    baseHourly: 2.8,
    dailyPass: 20.0,
    monthlyPass: 275.0,
    status: 'CUSTOM',
    hasCustomOverwrite: true,
    appliedRuleName: 'Custom Node Overwrite'
  },
  {
    id: 'res-meet-b01',
    code: 'MEET-B01',
    name: 'Conference Suite Alpha',
    category: 'MEETING_ROOM',
    categoryLabel: 'Conference Suite',
    baseHourly: 18.0,
    dailyPass: 120.0,
    monthlyPass: 1800.0,
    status: 'ACTIVE',
    hasCustomOverwrite: false,
    appliedRuleName: 'Conference & Meeting Suites'
  },
  {
    id: 'res-meet-b02',
    code: 'MEET-B02',
    name: 'Executive Boardroom Alpha',
    category: 'MEETING_ROOM',
    categoryLabel: 'Boardroom Suite',
    baseHourly: 25.0,
    dailyPass: 160.0,
    monthlyPass: 2400.0,
    status: 'ACTIVE',
    hasCustomOverwrite: false,
    appliedRuleName: 'Conference & Meeting Suites'
  },
  {
    id: 'res-pod-01',
    code: 'POD-01',
    name: 'Acoustic Solo Booth 01',
    category: 'BOOTH',
    categoryLabel: 'Phone Booth Solo',
    baseHourly: 4.0,
    dailyPass: 28.0,
    monthlyPass: 380.0,
    status: 'ACTIVE',
    hasCustomOverwrite: false,
    appliedRuleName: 'Acoustic Solo Booths'
  },
  {
    id: 'res-pod-02',
    code: 'POD-02',
    name: 'Acoustic Solo Booth 02',
    category: 'BOOTH',
    categoryLabel: 'Phone Booth Solo',
    baseHourly: 4.0,
    dailyPass: 28.0,
    monthlyPass: 380.0,
    status: 'ACTIVE',
    hasCustomOverwrite: false,
    appliedRuleName: 'Acoustic Solo Booths'
  }
];

