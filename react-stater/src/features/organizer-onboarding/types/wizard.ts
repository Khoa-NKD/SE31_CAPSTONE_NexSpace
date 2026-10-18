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

export interface OnboardingDraftState {
  version: number;
  lastSavedAt: string | null;
  isDraftSynced: boolean;
  basicInfo: BasicInfoValues;
  location: LocationValues;
  // Extensible integration points for future steps (O07-O10, O15)
  operatingHours?: Record<string, unknown>;
  amenities?: string[];
  media?: {
    coverImageUrl?: string;
    galleryUrls?: string[];
  };
  floorPlanHandoff?: FloorPlanHandoffContract;
}
