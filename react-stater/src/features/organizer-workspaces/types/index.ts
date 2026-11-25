export type WorkspaceStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'INACTIVE'
  | 'ACTIVE'
  | 'MAINTENANCE'
  | 'HOLIDAY'
  | 'ARCHIVED';

export interface OrganizerWorkspace {
  id: string;
  name: string;
  description?: string;
  areaSqm?: number;
  startingPricePerHour?: number;
  address: string;
  district: string;
  city: string;
  status: WorkspaceStatus;
  version?: number;
  bookingCount?: number;
  draftProgress?: number;
  draftWarningMessage?: string;
  reviewFeedback?: string;
  imageUrl?: string;
  desksCount: number;
  meetingRoomsCount: number;
  rating: number;
  reviewsCount?: number;
  occupancyRate?: number;
  tier?: string;
  publicUrl?: string;
  isLive?: boolean;
  turnstileOnline?: boolean;
  bookingMode?: 'instant' | 'manual';
  lastStatusChange?: string;
  grossRevenueMtd?: number;
  totalBookingsMtd?: number;
}

export type WorkspaceFilter =
  | 'all'
  | 'active'
  | 'pending'
  | 'inactive'
  | 'maintenance'
  | 'holiday'
  | 'draft'
  | 'archived';
