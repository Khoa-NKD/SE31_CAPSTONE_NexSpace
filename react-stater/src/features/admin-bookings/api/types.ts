import type { PageResponse } from '@/features/payments/api/types';

export interface AdminBookingApiItem {
  id: number;
  bookingCode: string;
  customerId: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  workspaceId: number | null;
  workspaceName: string;
  workspaceAddress: string;
  resourceId: number | null;
  resourceName: string;
  resourceCategory: string;
  resourceZone: string;
  startTime: string;
  endTime: string;
  amount: number;
  platformFee: number;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  qrTokenHash: string | null;
  pinCode: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
}

export interface AdminBookingKpiResponse {
  totalCount: number;
  confirmedCount: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

export type { PageResponse };
