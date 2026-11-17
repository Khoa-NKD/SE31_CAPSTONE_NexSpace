export type CreateResourceType =
  | 'HOT_DESK'
  | 'DEDICATED_DESK'
  | 'PODCAST_BOOTH'
  | 'MEETING_ROOM'
  | 'PRIVATE_OFFICE'
  | 'EVENT_HALL';

export interface ResourceTypeConfig {
  type: CreateResourceType;
  label: string;
  badge: string;
  badgeClass?: string;
  icon: string;
  defaultCapacity: number;
  description: string;
}

export interface ResourcePhoto {
  id: string;
  url: string;
  label: string;
  isPrimary: boolean;
}

export interface AmenityItem {
  id: string;
  label: string;
  iconName: string;
}

export interface FloorOption {
  id: string;
  label: string;
  code: string;
}

export interface ZoneOption {
  id: string;
  label: string;
  floorId: string;
  quietZone?: boolean;
}

export interface CreateResourceFormData {
  resourceCode: string;
  displayName: string;
  resourceType: CreateResourceType;
  workspaceHub: string;
  floorLevel: string;
  zoneSection: string;
  photos: ResourcePhoto[];
  capacity: number;
  specifications: string;
  amenities: string[];
  hourlyRate: string;
  dailyRate: string;
  instantBooking: boolean;
  publishLive: boolean;
}

