export type BookingStatus =
  | 'CONFIRMED'
  | 'PENDING_PAYMENT'
  | 'COMPLETED'
  | 'CANCELLED';

export type CheckInState =
  | 'CHECKED_IN'
  | 'UPCOMING'
  | 'AWAITING_PAYMENT'
  | 'CHECKED_OUT'
  | 'RELEASED';

export type PaymentGateway =
  | 'PAYOS_QR'
  | 'PAYOS_CARD'
  | 'PAYOS_MOMO'
  | 'MANUAL_CASH';

export type BookingResourceType =
  | 'HOT_DESK'
  | 'DEDICATED_DESK'
  | 'MEETING_ROOM'
  | 'BOOTH'
  | 'EVENT_STAGE';

export interface BookingItem {
  id: string;
  bookingCode: string; // e.g. "#NX-9821"
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerInitials: string;
  customerAvatarColor?: string;
  resourceCode: string; // e.g. "DESK-A12", "CONF-C01", "POD-02"
  resourceName: string;
  resourceCategory: BookingResourceType;
  resourceZone: string; // e.g. "Zone A Quiet Focus", "Level 12 East"
  reservedDate: string; // "Jan 25, 2026"
  reservedTimeWindow: string; // "09:00 - 13:00 (4 hours)"
  durationHours: number;
  amount: number;
  paymentGateway: PaymentGateway;
  paymentGatewayLabel: string;
  status: BookingStatus;
  statusReason?: string; // "Auto-expired hold", etc.
  checkInState: CheckInState;
  checkInTime?: string; // "09:05 AM"
  pendingTimeRemaining?: string; // "06:42 remaining"
  createdAt: string;
  notes?: string;
}

export interface BookingsKpiSummary {
  totalReservations: number;
  growthMoM: number;
  confirmedCount: number;
  confirmedVolume: number;
  pendingCount: number;
  pendingVolume: number;
  cancelledCount: number;
  cancellationRatePercent: number;
}

