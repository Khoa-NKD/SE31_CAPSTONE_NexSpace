/**
 * Canonical Workspace Entity & DTOs
 * Based on NexSpace Database Specification v3.3 (Table: Workspace, Sheet 15)
 * and SRS Requirements M04 / M17.
 */

export type WorkspaceCategory =
  | 'coworking_hub'
  | 'business_lounge'
  | 'creative_studio'
  | 'serviced_office'
  | 'other';

export type WorkspaceReviewStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';
export type WorkspaceOperatingStatus = 'Active' | 'Inactive' | 'Archived';
export type WorkspaceModerationStatus = 'Normal' | 'Suspended';
export type BookingConfirmationMode = 'Instant' | 'Manual_Approval';

export interface WorkspaceOperatingHour {
  id?: string;
  dayOfWeek: number; // 1 (Mon) - 7 (Sun)
  openTime: string;  // e.g. "07:00"
  closeTime: string; // e.g. "22:00"
  isClosed: boolean;
  is24Hours: boolean;
  closesNextDay?: boolean;
}

export interface WorkspaceMediaItem {
  id: string;
  url: string;
  caption?: string;
  isCover: boolean;
  displayOrder: number;
  mediaType: 'image' | '360_degree';
  fileSizeKb?: number;
  mimeType?: string;
  pixelWidth?: number;
  pixelHeight?: number;
  originalFileName?: string;
}

export interface WorkspaceFloorSummary {
  id: string;
  name: string;
  floorNumber: number;
  status?: 'Draft' | 'Published';
  totalDesks?: number;
  totalRooms?: number;
}

export interface CanonicalWorkspace {
  // 1. Identity & Ownership
  id: string;
  workspaceCode: string;
  organizerId: string;
  organizerLegalName: string;
  organizerTaxId: string;
  organizerVerified: boolean;
  legacyAliases?: string[];

  // 2. General Information
  name: string;
  category: WorkspaceCategory;
  description: string;
  shortDescription?: string;
  usableAreaSqm: number;
  supportPhone?: string;
  supportEmail?: string;
  operatorContactName?: string;
  operatorContactPhone?: string;

  // 3. Location & Address
  streetAddress: string;
  buildingName?: string;
  facilitySubtitle?: string;
  district: string;
  city: string;
  postalCode?: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  entryInstructions?: string;

  // 4. Operating Hours
  operatingHours: WorkspaceOperatingHour[];
  receptionHours?: string;
  autoBlockPublicHolidays?: boolean;
  checkInLeadMinutes?: number;
  checkInLateMinutes?: number;

  // 5. Amenities & Highlights
  amenities: string[];
  tags: string[];

  // 6. Media Metadata
  coverImageUrl: string;
  images: WorkspaceMediaItem[];

  // 7. Floor Plans & Capacity
  capacityDesks: number;
  meetingRooms: number;
  focusPods: number;
  capacityLabel: string;
  totalFloors: number;
  floors?: WorkspaceFloorSummary[];

  // 8. Onboarding Progress
  onboardingStep?: number;
  onboardingCompleted?: boolean;
  draftProgress?: number;
  draftWarningMessage?: string | null;

  // 9. Submission & Review Governance (Administrator)
  reviewStatus: WorkspaceReviewStatus;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewFeedback?: string | null;
  submissionNotes?: string | null;

  // 10. Admin Moderation Status
  moderationStatus: WorkspaceModerationStatus;
  suspendedBy?: string | null;
  suspendedAt?: string | null;
  suspendReason?: string | null;

  // 11. Operational & Lifecycle Status (Organizer)
  operatingStatus: WorkspaceOperatingStatus;
  status: 'active' | 'pending' | 'suspended' | 'draft' | 'archived' | 'paused' | 'maintenance';
  isLive: boolean;
  turnstileOnline?: boolean;
  accessMethod?: string;

  // 12. Marketplace Visibility, Pricing & Analytics
  isListingVisible: boolean;
  featuredPosition?: number | null;
  featuredFrom?: string | null;
  featuredTo?: string | null;
  bookingConfirmationMode: BookingConfirmationMode;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth?: number | null;
  rating: number;
  reviewsCount: number;
  occupancyRate?: number;
  grossRevenueMtd?: number;
  totalBookingsMtd?: number;
  tier?: string;
  publicUrl?: string;

  // Audit timestamps & concurrency control
  clientDraftKey?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface WorkspacePaginationMeta {
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
}

export interface WorkspaceListResponse {
  content: CanonicalWorkspace[];
  pagination: WorkspacePaginationMeta;
}

export interface PublicWorkspaceSummary {
  id: string;
  workspaceCode: string;
  name: string;
  category: WorkspaceCategory;
  description: string;
  shortDescription?: string;
  streetAddress: string;
  buildingName?: string;
  facilitySubtitle?: string;
  district: string;
  city: string;
  latitude: number;
  longitude: number;
  coverImageUrl: string;
  images: WorkspaceMediaItem[];
  capacityDesks: number;
  meetingRooms: number;
  focusPods: number;
  capacityLabel: string;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth?: number | null;
  rating: number;
  reviewsCount: number;
  amenities: string[];
  tags: string[];
  operatingHours: WorkspaceOperatingHour[];
  bookingConfirmationMode: BookingConfirmationMode;
  featuredPosition?: number | null;
  publicUrl?: string;
}

export interface PublicWorkspaceDetail extends PublicWorkspaceSummary {
  usableAreaSqm: number;
  supportPhone?: string;
  supportEmail?: string;
  organizerLegalName: string;
  organizerVerified: boolean;
  receptionHours?: string;
  autoBlockPublicHolidays?: boolean;
  entryInstructions?: string;
  totalFloors: number;
  floors?: WorkspaceFloorSummary[];
}

export interface PublicWorkspaceListResponse {
  content: PublicWorkspaceSummary[];
  pagination: WorkspacePaginationMeta;
}

export interface WorkspaceFilterParams {
  search?: string;
  city?: string;
  district?: string;
  category?: WorkspaceCategory | string;
  organizerId?: string;
  status?: string;
  reviewStatus?: WorkspaceReviewStatus | string;
  operatingStatus?: WorkspaceOperatingStatus | string;
  moderationStatus?: WorkspaceModerationStatus | string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'rating' | 'featuredPosition' | 'usableAreaSqm';
  sortOrder?: 'asc' | 'desc';
  role?: string;
}

export interface PublicWorkspaceFilterParams {
  search?: string;
  city?: string;
  district?: string;
  category?: WorkspaceCategory | string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rating' | 'pricePerHour' | 'featuredPosition';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateWorkspaceDto {
  name: string;
  category: WorkspaceCategory;
  streetAddress: string;
  city: string;
  district: string;
  buildingName?: string;
  facilitySubtitle?: string;
  description?: string;
  shortDescription?: string;
  usableAreaSqm?: number;
  supportPhone?: string;
  supportEmail?: string;
  organizerId?: string;
  organizerLegalName?: string;
  organizerTaxId?: string;
  organizerVerified?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerMonth?: number | null;
  capacityDesks?: number;
  meetingRooms?: number;
  focusPods?: number;
  bookingConfirmationMode?: BookingConfirmationMode;
  amenities?: string[];
  tags?: string[];
  operatingHours?: WorkspaceOperatingHour[];
  receptionHours?: string;
  clientDraftKey?: string;
}

/**
 * Owner-editable fields for workspace PATCH.
 * Privileged fields (id, organizerId, reviewStatus, moderationStatus, financial metrics)
 * are excluded and rejected by the server allowlist.
 */
export interface UpdateWorkspaceDto {
  name?: string;
  category?: WorkspaceCategory;
  streetAddress?: string;
  city?: string;
  district?: string;
  buildingName?: string;
  facilitySubtitle?: string;
  description?: string;
  shortDescription?: string;
  usableAreaSqm?: number;
  supportPhone?: string;
  supportEmail?: string;
  operatorContactName?: string;
  operatorContactPhone?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  entryInstructions?: string;
  operatingHours?: WorkspaceOperatingHour[];
  receptionHours?: string;
  autoBlockPublicHolidays?: boolean;
  checkInLeadMinutes?: number;
  checkInLateMinutes?: number;
  amenities?: string[];
  tags?: string[];
  coverImageUrl?: string;
  images?: WorkspaceMediaItem[];
  capacityDesks?: number;
  meetingRooms?: number;
  focusPods?: number;
  capacityLabel?: string;
  totalFloors?: number;
  floors?: WorkspaceFloorSummary[];
  onboardingStep?: number;
  onboardingCompleted?: boolean;
  draftProgress?: number;
  draftWarningMessage?: string | null;
  turnstileOnline?: boolean;
  accessMethod?: string;
  isListingVisible?: boolean;
  bookingConfirmationMode?: BookingConfirmationMode;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerMonth?: number | null;
  expectedVersion?: number;
  version?: number;
}

export type WorkspaceLifecycleAction = 'pause' | 'resume' | 'maintenance' | 'archive';

export interface WorkspaceLifecycleDto {
  action: WorkspaceLifecycleAction;
  expectedVersion?: number;
  reason?: string;
}

export interface SubmitWorkspaceDto {
  expectedVersion?: number;
  agreementConfirmed?: boolean;
}

export interface AdminReviewWorkspaceDto {
  reviewStatus: WorkspaceReviewStatus;
  reviewedBy: string;
  reviewFeedback?: string;
  expectedVersion: number;
}

export interface AdminModerationWorkspaceDto {
  moderationStatus: WorkspaceModerationStatus;
  suspendedBy?: string;
  suspendReason?: string;
  expectedVersion: number;
}

/**
 * Pure predicate evaluating canonical public marketplace eligibility.
 * Authoritative contract:
 * 1. reviewStatus === 'Approved'
 * 2. operatingStatus === 'Active'
 * 3. moderationStatus === 'Normal'
 * 4. isListingVisible === true
 */
export function isWorkspacePubliclyEligible(
  w: Pick<CanonicalWorkspace, 'reviewStatus' | 'operatingStatus' | 'moderationStatus' | 'isListingVisible'>
): boolean {
  return (
    w.reviewStatus === 'Approved' &&
    w.operatingStatus === 'Active' &&
    w.moderationStatus === 'Normal' &&
    w.isListingVisible === true
  );
}
