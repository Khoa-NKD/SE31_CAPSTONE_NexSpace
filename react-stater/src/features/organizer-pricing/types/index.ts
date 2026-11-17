export type PricingScope = 'RESOURCE_TYPE' | 'SPECIFIC_RESOURCE';

export type ResourceTypeCategory =
  | 'HOT_DESK'
  | 'DEDICATED_DESK'
  | 'MEETING_ROOM'
  | 'BOOTH'
  | 'EVENT_SPACE';

export interface PricingTierRule {
  id: string;
  name: string;
  scope: PricingScope;
  targetCategory: ResourceTypeCategory;
  targetCategoryLabel: string;
  targetCount: number;
  targetResourceId?: string;
  targetResourceCode?: string;
  hourlyRate: number;
  dailyRate: number;
  monthlyRate: number;
  minBookingHours: number;
  durationDiscountEnabled: boolean;
  durationThresholdHours: number;
  durationDiscountPercent: number;
  weekendSurchargeEnabled: boolean;
  weekendSurchargePerHour: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  updatedAt: string;
}

export interface PricingKpiSummary {
  avgHourlyRate: number;
  avgHourlyGrowth: number;
  weeklyBookingsHours: number;
  activeDiscountRuleLabel: string;
  occupancyForecastPercent: number;
}

export interface PricingResourceRow {
  id: string;
  code: string;
  name: string;
  category: ResourceTypeCategory;
  categoryLabel: string;
  baseHourly: number;
  dailyPass: number;
  monthlyPass: number;
  status: 'ACTIVE' | 'CUSTOM' | 'DEFAULT';
  hasCustomOverwrite: boolean;
  appliedRuleName: string;
}

export interface LiveDiscountPreview {
  testDurationHours: number;
  baseTotal: number;
  discountAmount: number;
  netTotal: number;
  appliedDiscountPercent: number;
}

