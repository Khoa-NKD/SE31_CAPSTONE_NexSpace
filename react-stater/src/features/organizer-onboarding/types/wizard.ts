export type SpaceCategory = 'coworking_hub' | 'business_lounge' | 'creative_studio';

export interface BasicInfoValues {
  name: string;
  category: SpaceCategory;
  description: string;
  totalArea: number;
  contactPhone: string;
  contactEmail: string;
}

export interface LocationValues {
  streetAddress: string;
  district: string;
  city: string;
  floorSuite: string;
  latitude: number;
  longitude: number;
  entryNotes: string;
}

export interface ZoneHandoffItem {
  id: string;
  name: string;
  floor: number;
  code?: string;
}

export interface FloorPlanHandoffContract {
  workspaceId: string;
  totalFloors: number;
  zones: ZoneHandoffItem[];
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DaySchedule {
  day: DayOfWeek;
  label: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface OperatingHoursValues {
  is247: boolean;
  schedule: DaySchedule[];
  blockHolidays: boolean;
  allowGracePeriod: boolean;
}

export interface AmenityItem {
  id: string;
  name: string;
  description: string;
  category: 'technology' | 'facilities' | 'hospitality' | 'security';
  icon: string;
  isCommon?: boolean;
}

export type MediaUploadStatus = 'uploaded' | 'uploading' | 'error';

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  dimension?: string;
  caption?: string;
  size?: number;
  isCover: boolean;
  uploadStatus?: MediaUploadStatus;
  uploadError?: string;
}

export interface MediaGalleryValues {
  items: MediaItem[];
  coverPhotoId: string;
}

export interface ZoneItem {
  id: string;
  name: string;
  code: string;
  floorId: string;
  type: 'quiet_focus' | 'team_hub' | 'meeting_suite' | 'open_desk' | 'custom';
  color: string;
  baseHourlyRate: number;
  areaSqm: number;
  capacity: number;
  occupiedCount?: number;
  amenities: string[];
  polygonPoints?: string;
}

export interface FloorItem {
  id: string;
  number: number;
  name: string;
  subtitle?: string;
  usableAreaSqm: number;
  capacity: number;
  status: 'active' | 'draft' | 'maintenance';
}

export interface FloorPlanValues {
  selectedFloorId: string;
  floors: FloorItem[];
  zones: ZoneItem[];
  gridSnap: boolean;
  showDimensions: boolean;
  zoomLevel: number;
}

export interface OnboardingDraftState {
  version: number;
  lastSavedAt: string | null;
  isDraftSynced: boolean;
  canonicalWorkspaceId?: string;
  clientDraftKey?: string;
  serverVersion?: number;
  isSavingToServer?: boolean;
  syncError?: string | null;
  basicInfo: BasicInfoValues;
  location: LocationValues;
  operatingHours: OperatingHoursValues;
  amenities: string[];
  media: MediaGalleryValues;
  floorPlan: FloorPlanValues;
  floorPlanHandoff?: FloorPlanHandoffContract;
  submissionStatus?: 'draft' | 'under_review' | 'published';
}
