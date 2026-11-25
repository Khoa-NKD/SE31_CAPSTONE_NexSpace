export interface AdminOverviewKpiDTO {
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

export interface AdminTriageItemDTO {
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

export interface AdminOperationalTrendPointDTO {
  day: string;
  date?: string;
  formattedDate?: string;
  fullDateLabel?: string;
  bookings: number;
  settlements: number; // in VND
  isPeak?: boolean;
}

export interface AdminVolumeSummaryDTO {
  totalVolume: string;
  slaSuccessRate: string;
  peakDay: string;
  peakCount: number;
  peakHub: string;
}

export interface AdminLiveSystemAlertDTO {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  acknowledged: boolean;
}

export interface AdminDashboardOverviewResponseDTO {
  timeframe: string;
  kpis: AdminOverviewKpiDTO[];
  triageItems: AdminTriageItemDTO[];
  trendPoints: AdminOperationalTrendPointDTO[];
  volumeSummary: AdminVolumeSummaryDTO;
  alerts: AdminLiveSystemAlertDTO[];
}

export interface MacroTrendPointDTO {
  month: string;
  gmvUsd: number;
  netRevenueUsd: number;
  gmvVnd: number;
  netRevenueVnd: number;
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
}
