export type WorkspaceStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'PAUSED'
  | 'MAINTENANCE'
  | 'ARCHIVED'
  | 'UNDER_REVIEW';

export interface OrganizerWorkspace {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  status: WorkspaceStatus;
  draftProgress?: number;
  draftWarningMessage?: string;
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
  | 'draft'
  | 'paused'
  | 'maintenance'
  | 'archived';
