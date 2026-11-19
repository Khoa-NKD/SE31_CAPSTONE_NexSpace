import type {
  KpiMetric,
  TriageItem,
  OperationalTrendPoint,
  LiveSystemAlert
} from '../data/mock-overview';

export interface AdminVolumeSummaryDTO {
  totalVolume: string;
  slaSuccessRate: string;
  peakDay: string;
  peakCount: number;
  peakHub: string;
}

export interface AdminDashboardOverviewResponseDTO {
  timeframe: string;
  kpis: KpiMetric[];
  triageItems: TriageItem[];
  trendPoints: OperationalTrendPoint[];
  volumeSummary: AdminVolumeSummaryDTO;
  alerts: LiveSystemAlert[];
}
