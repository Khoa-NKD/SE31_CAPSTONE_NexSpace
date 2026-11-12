export interface CreateBookingPayload {
  workspaceId: number;
  resourceId: number;
  startTime: string; // ISO 8601 string, e.g. "2026-11-25T09:00:00"
  endTime: string;   // ISO 8601 string, e.g. "2026-11-25T13:00:00"
  partySize?: number;
  priceType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
  notes?: string;
}

export interface CalculatePricePayload {
  workspaceId: number;
  resourceId: number;
  startTime: string;
  endTime: string;
  priceType?: 'HOURLY' | 'DAILY' | 'MONTHLY';
}

export interface PriceCalculationResult {
  resourceId: number;
  resourceName: string;
  resourceCode: string;
  priceType: 'HOURLY' | 'DAILY' | 'MONTHLY';
  unitPrice: number;
  durationHours: number;
  baseAmount: number;
  surchargeAmount: number;
  taxAmount: number;
  serviceFeeAmount: number;
  discountAmount: number;
  finalPrice: number;
  currency: string;
}

export interface BookingDto {
  id: number;
  bookingCode: string;
  status:
    | 'PENDING_APPROVAL'
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'CHECKED_IN'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'NO_SHOW';
  confirmationMode?: 'INSTANT' | 'MANUAL_APPROVAL';
  holdExpiresAt?: string | null;
  createdAt: string;

  // Workspace
  workspaceId: number;
  workspaceName: string;
  workspaceAddress: string;
  workspaceCity?: string;
  workspaceDistrict?: string;

  // Resource
  resourceId: number;
  resourceCode: string;
  resourceName: string;
  resourceCategory?: string;
  floorName?: string;
  floorNumber?: number;
  zoneName?: string;

  // Schedule
  startTime: string;
  endTime: string;
  durationHours: number;
  partySize: number;

  // Pricing
  priceType: 'HOURLY' | 'DAILY' | 'MONTHLY';
  unitPrice: number;
  baseAmount: number;
  surchargeAmount: number;
  addonAmount: number;
  discountAmount: number;
  taxAmount: number;
  serviceFeeAmount: number;
  finalPrice: number;

  // Customer
  customerId: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  // Snapshots & Security
  qrTokenHash?: string;
  cancellationPolicySnapshot?: string;
  pricingSnapshot?: string;
  cancelReason?: string;
  cancelSource?: string;
  cancelledAt?: string;
  refundPercent?: number;
  refundAmount?: number;
}

export interface CancellationRuleItemDto {
  minHoursBeforeStart: number;
  refundPercent: number;
  label?: string;
}

export interface BookingCancellationPreviewDto {
  bookingId: number;
  bookingCode: string;
  status: string;
  startTime: string;
  hoursBeforeStart: number;
  finalPrice: number;
  refundPercent: number;
  refundAmount: number;
  isHostCancellation: boolean;
  canCancel: boolean;
  cancellationPolicyExplanation: string;
  rules: CancellationRuleItemDto[];
}

export interface ResourceAvailabilityItem {
  resourceId: number;
  code: string;
  name: string;
  category?: string;
  capacity?: number;
  resourceTypeName?: string;
  zoneName?: string;
  pricePerHour?: number;
  selectable: boolean;
  state: 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'MAINTENANCE';
  flags?: string[];
}
