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

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  dimension?: string;
  caption?: string;
  size?: number;
  isCover: boolean;
}

export interface MediaGalleryValues {
  items: MediaItem[];
  coverPhotoId: string;
}

export interface OnboardingDraftState {
  version: number;
  lastSavedAt: string | null;
  isDraftSynced: boolean;
  basicInfo: BasicInfoValues;
  location: LocationValues;
  operatingHours: OperatingHoursValues;
  amenities: string[];
  media: MediaGalleryValues;
  floorPlanHandoff?: FloorPlanHandoffContract;
}
