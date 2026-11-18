export interface WorkspaceLeaderboardItemDTO {
  rank: number;
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  totalBookings30d: number;
  grossRevenueUsd: number;
  grossRevenueVnd: number;
  grossRevenueDisplay: string;
  localCurrencyDisplay: string;
  averageOccupancyPercent: number;
  occupancyStatus: 'Optimal' | 'Steady' | 'Standard' | string;
  satisfactionRating: number;
  reviewsCount: number;
  coverImageUrl?: string;
  iconType: 'domain' | 'corporate' | 'apartment' | 'hub' | 'beach' | string;
}

export interface MacroTrendPointDTO {
  month: string;
  gmvVnd: number;
  netRevenueVnd: number;
  gmvUsd: number;
  netRevenueUsd: number;
}

export interface ResourceBreakdownPointDTO {
  week: string;
  hotDesks: number;
  meetingSuites: number;
  dedicatedPods: number;
}

export interface AdminPlatformAnalyticsResponseDTO {
  averageOccupancyPercent: number;
  occupancyChangePercent: string;
  grossRevenueVnd: number;
  grossRevenueUsd: number;
  grossRevenueChangePercent: string;
  netRevenueVnd: number;
  netRevenueUsd: number;
  totalBookings: number;
  totalBookingsChangePercent: string;
  activeWorkspacesCount: number;
  macroTrends: MacroTrendPointDTO[];
  resourceBreakdown: ResourceBreakdownPointDTO[];
  leaderboard: WorkspaceLeaderboardItemDTO[];
}
