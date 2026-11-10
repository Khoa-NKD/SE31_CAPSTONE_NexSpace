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
export type WorkspaceOperatingStatus = 'Active' | 'Pending' | 'Maintenance' | 'Inactive' | 'Archived';
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
  distanceKm?: number | null;
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
  featuredOrder?: number | null;
  featuredUntil?: string | null;
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
  bookingCount?: number;
  totalBookings?: number;
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
  listObjects?: CanonicalWorkspace[];
  totalElements?: number;
  totalRecords?: number;
  totalPages?: number;
  page?: number;
  size?: number;
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
  distanceKm?: number;
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

export interface NearbyWorkspacesParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
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

export type WorkspaceLifecycleAction =
  | 'draft'
  | 'pending'
  | 'activate'
  | 'pause'
  | 'resume'
  | 'maintenance'
  | 'archive'
  | 'DRAFT'
  | 'PENDING'
  | 'ACTIVATE'
  | 'PAUSE'
  | 'RESUME'
  | 'MAINTENANCE'
  | 'ARCHIVE';

export interface WorkspaceLifecycleDto {
  action: WorkspaceLifecycleAction;
  expectedVersion?: number;
  reason?: string;
}

export interface SubmitWorkspaceDto {
  expectedVersion?: number;
  agreementConfirmed?: boolean;
}

export interface AdminModerationWorkspaceDto {
  moderationStatus: WorkspaceModerationStatus;
  suspendedBy?: string;
  suspendReason?: string;
  expectedVersion: number;
}

export interface AdminFeaturedWorkspaceDto {
  isFeatured: boolean;
  featuredOrder?: number;
  featuredUntil?: string;
  expectedVersion?: number;
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

export interface AdminWorkspaceKpisDto {
  totalPlatformUsers?: number;
  activeOrganizers?: number;
  activeWorkspaces?: number;
  totalBookings?: number;
  totalWorkspaces: number;
  activeCount?: number;
  pendingCount?: number;
  maintenanceCount?: number;
  draftCount?: number;
  suspendedCount: number;
  totalPublishedSpaces?: number;
  publishedMonthlyGrowth?: number | null;
  metroHubsCount?: number;
  pendingModerationCount?: number;
  pendingOldestHours?: number;
  suspendedGrievanceDetails?: string;
  partnerDraftsCount?: number;
}

export interface WorkspaceMediaDto {
  id: number;
  workspaceId: number;
  resourceId?: number | null;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
  cover: boolean;
  isCover?: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddWorkspaceMediaPayload {
  url: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  isCover?: boolean;
  displayOrder?: number;
  resourceId?: number | null;
}

export interface ReorderMediaItemPayload {
  mediaId: number;
  displayOrder: number;
}

export interface ReorderWorkspaceMediaPayload {
  items: ReorderMediaItemPayload[];
}

export interface SyncWorkspaceMediaPayload {
  items: AddWorkspaceMediaPayload[];
}

// ==========================================
// Workspace Assets & Maintenance Log Types
// ==========================================

export type AssetStatus = 'IN_USE' | 'UNDER_MAINTENANCE' | 'BROKEN' | 'RETIRED';

export type MaintenanceType = 'INSPECTION' | 'REPAIR' | 'REPLACEMENT' | 'CLEANING';

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface WorkspaceAssetDto {
  id: number;
  workspaceId: number;
  assetCode: string;
  name: string;
  quantity: number;
  status: AssetStatus;
  resourceId?: number | null;
  resourceName?: string | null;
  amenityId?: number | null;
  amenityName?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  warrantyUntil?: string | null;
  nextMaintenanceDate?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkspaceAssetPayload {
  assetCode: string;
  name: string;
  quantity?: number;
  status?: AssetStatus;
  resourceId?: number | null;
  amenityId?: number | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  warrantyUntil?: string | null;
  nextMaintenanceDate?: string | null;
  note?: string | null;
}

export interface UpdateWorkspaceAssetPayload {
  assetCode: string;
  name: string;
  quantity: number;
  status?: AssetStatus;
  resourceId?: number | null;
  amenityId?: number | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  warrantyUntil?: string | null;
  nextMaintenanceDate?: string | null;
  note?: string | null;
}

export interface MaintenanceLogDto {
  id: number;
  assetId: number;
  assetCode?: string;
  assetName?: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  reportedById?: number | null;
  reportedByName?: string | null;
  performedBy?: string | null;
  cost?: number | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  resultNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMaintenanceLogPayload {
  maintenanceType: MaintenanceType;
  status?: MaintenanceStatus;
  description: string;
  performedBy?: string | null;
  cost?: number | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  resultNote?: string | null;
}

export interface UpdateMaintenanceLogPayload {
  status?: MaintenanceStatus;
  performedBy?: string | null;
  cost?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  resultNote?: string | null;
}

export interface WorkspaceAssetFilterParams {
  status?: AssetStatus;
  search?: string;
  all?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedAssetResponse {
  listObjects: WorkspaceAssetDto[];
  content?: WorkspaceAssetDto[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type AmenityCategoryType =
  | 'TECH'
  | 'COMFORT'
  | 'SPACE'
  | 'SERVICE'
  | 'ACCESSIBILITY'
  | string;

export interface WorkspaceAmenityDto {
  id: number;
  workspaceId: number;
  amenityId: number;
  name: string;
  category: AmenityCategoryType;
  icon?: string;
  description?: string;
  addonPricePerHour?: number;
  isComplimentary?: boolean;
  complimentary?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignWorkspaceAmenitiesPayload {
  amenityIds: number[];
}



