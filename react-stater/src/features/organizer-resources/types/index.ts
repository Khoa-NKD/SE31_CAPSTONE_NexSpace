export type ResourceType = 'HOT_DESK' | 'DEDICATED_DESK' | 'MEETING_ROOM';
export type ResourceStatus = 'BOOKABLE' | 'DISABLED';
export type ZoneId = 'ZONE_A' | 'ZONE_B' | 'ZONE_C';

export interface AmenityTag {
  name: string;
  isUnavailable?: boolean;
}

export interface ResourceItem {
  id: string;
  code: string;
  subLabel?: string;
  type: ResourceType;
  zone: ZoneId;
  zoneLabel: string;
  capacity: number;
  capacityLabel: string;
  hourlyRate: number;
  dailyRate: number;
  amenities: AmenityTag[];
  status: ResourceStatus;
  warningNote?: string;
  rfidCode?: string;
}

export interface ResourceKpiSummary {
  totalUnits: number;
  activeBookable: number;
  uptimePercent: number;
  maintenanceCount: number;
  maintenanceNote: string;
  averageHourlyRate: number;
  occupancyPercent: number;
}

export type ResourceTypeFilter = 'all' | ResourceType;
export type ResourceZoneFilter = 'all' | ZoneId;
export type ResourceStatusFilter = 'all' | ResourceStatus;

export interface ResourceFilterState {
  search: string;
  type: ResourceTypeFilter;
  zone: ResourceZoneFilter;
  status: ResourceStatusFilter;
  page: number;
  pageSize: number;
}

