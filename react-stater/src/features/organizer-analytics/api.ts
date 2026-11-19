import { apiClient } from '@/lib/api-client';

export interface AnalyticsFilter {
  from: string;
  to: string;
  workspaceId?: number;
  floorNumber?: number;
  resourceTypeId?: number;
  category?: 'DESK' | 'ROOM';
}
export interface AnalyticsSummary {
  createdBookings: number;
  paidBookings: number;
  payingCustomers: number;
  returningCustomers: number;
  completedBookings: number;
  cancelledBookings: number;
  expiredBookings: number;
  noShowBookings: number;
  receivedAmount: string;
  refundedAmount: string;
  netAmount: string;
  averagePaidBookingValue: string;
  bookedHours: string;
  receiptCount: number;
  refundCount: number;
  anomalousReceipts: number;
}
export interface Trend {
  date: string;
  createdBookings: number;
  paidBookings: number;
  receivedAmount: string;
  refundedAmount: string;
  netAmount: string;
}
export interface Ranking {
  id: number;
  name: string;
  paidBookings: number;
  receivedAmount: string;
  refundedAmount: string;
  netAmount: string;
}
export interface AnalyticsReport {
  filter: AnalyticsFilter;
  currency: 'VND';
  timestampZone: string;
  generatedAt: string;
  current: AnalyticsSummary;
  previous: AnalyticsSummary;
  trends: Trend[];
  workspaces: Ranking[];
  resourceTypes: Ranking[];
  resources: Ranking[];
  statuses: { status: string; count: number }[];
  heatmap: { dayOfWeek: number; hour: number; bookedHours: string }[];
  notices: { code: string; count: number }[];
  earnings?: OrganizerEarnings;
  previousEarnings?: OrganizerEarnings;
}
export interface OrganizerEarnings {
  rentalAmount: string | null;
  vatAmount: string | null;
  platformFeeAmount: string | null;
  organizerAmount: string | null;
  rentalEarningsAmount: string | null;
  unallocatedAmount: string | null;
  transferredAmount: string | null;
  transferTrackingAvailable: boolean;
  validationIssues: number;
}
export interface AnalyticsOptions {
  workspaces: { id: number; name: string }[];
  floors: { workspaceId: number; floorNumber: number }[];
  resourceTypes: { id: number; workspaceId: number; name: string; category: 'DESK' | 'ROOM' }[];
}
export interface LedgerRow {
  eventId: string;
  kind: 'PAYMENT' | 'REFUND';
  occurredAt: string;
  bookingId: number;
  bookingCode: string;
  bookingStatus: string;
  workspaceName: string;
  resourceName: string;
  amount: string;
  reconciliationStatus: string | null;
}
export interface Ledger {
  rows: LedgerRow[];
  total: number;
  page: number;
  size: number;
}

export const analyticsApi = {
  options: (signal?: AbortSignal) =>
    apiClient.get<AnalyticsOptions>('/organizer/analytics/options', { signal }),
  report: (filter: AnalyticsFilter, signal?: AbortSignal) =>
    apiClient.get<AnalyticsReport>('/organizer/analytics', { params: { ...filter }, signal }),
  ledger: (filter: AnalyticsFilter, page: number, kind?: string, signal?: AbortSignal) =>
    apiClient.get<Ledger>('/organizer/analytics/ledger', {
      params: { ...filter, page, size: 20, kind },
      signal
    }),
  export: (filter: AnalyticsFilter, kind?: string) =>
    apiClient.get<string>('/organizer/analytics/export', {
      params: { ...filter, kind },
      headers: { Accept: 'text/csv, application/json' }
    })
};
