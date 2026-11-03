export type AmenityCategory = 'TECH' | 'COMFORT' | 'SPACE';

export interface AmenityDto {
  id: number;
  name: string;
  category: AmenityCategory;
  icon?: string;
  description?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAmenityPayload {
  name: string;
  category: AmenityCategory;
  icon?: string;
  description?: string;
}

export interface UpdateAmenityPayload {
  name: string;
  category: AmenityCategory;
  icon?: string;
  description?: string;
  active?: boolean;
}

export interface AmenityFilterParams {
  [key: string]: string | number | boolean | undefined | null;
  category?: AmenityCategory;
  active?: boolean;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AmenityPageResponse {
  listObjects: AmenityDto[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface WorkspaceAmenityDto {
  id: number;
  workspaceId: number;
  amenityId: number;
  name: string;
  category: AmenityCategory;
  icon?: string;
  description?: string;
  addonPricePerHour: number;
  isComplimentary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignAmenityItemPayload {
  amenityId: number;
  addonPricePerHour?: number;
}

export interface AssignWorkspaceAmenitiesPayload {
  amenities: AssignAmenityItemPayload[];
}

