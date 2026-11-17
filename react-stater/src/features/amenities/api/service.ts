import { apiClient } from '@/lib/api-client';
import type {
  AmenityDto,
  CreateAmenityPayload,
  UpdateAmenityPayload,
  AmenityFilterParams,
  AmenityPageResponse,
  WorkspaceAmenityDto,
  AssignAmenityItemPayload,
  AssignWorkspaceAmenitiesPayload
} from './types';

export const amenityService = {
  /**
   * Fetch platform active amenities for public marketplace and onboarding
   */
  async getAvailableAmenities(): Promise<AmenityDto[]> {
    return apiClient.get<AmenityDto[]>('/amenities');
  },

  /**
   * Get single amenity details by ID
   */
  async getAmenityById(id: number): Promise<AmenityDto> {
    return apiClient.get<AmenityDto>(`/amenities/${id}`);
  },

  /**
   * Create a new amenity definition
   */
  async createAmenity(payload: CreateAmenityPayload): Promise<AmenityDto> {
    return apiClient.post<AmenityDto>('/amenities', payload);
  },

  /**
   * Update an existing amenity definition
   */
  async updateAmenity(id: number, payload: UpdateAmenityPayload): Promise<AmenityDto> {
    return apiClient.put<AmenityDto>(`/amenities/${id}`, payload);
  },

  /**
   * Admin paginated search and filter for amenities catalog
   */
  async listAmenities(params?: AmenityFilterParams): Promise<AmenityPageResponse> {
    return apiClient.get<AmenityPageResponse>('/admin/amenities', { params });
  },

  /**
   * Admin toggle amenity active/inactive status
   */
  async toggleAmenityStatus(id: number, active: boolean): Promise<void> {
    return apiClient.patch<void>(`/admin/amenities/${id}/status`, undefined, {
      params: { active }
    });
  },

  /**
   * Admin delete an amenity from catalog
   */
  async deleteAmenity(id: number): Promise<void> {
    return apiClient.delete<void>(`/admin/amenities/${id}`);
  },

  /**
   * Organizer paginated list of custom amenities
   */
  async listOrganizerAmenities(params?: AmenityFilterParams): Promise<AmenityPageResponse> {
    return apiClient.get<AmenityPageResponse>('/organizer/amenities', { params });
  },

  /**
   * Organizer available amenities (system standard + organizer custom)
   */
  async getOrganizerAvailableAmenities(): Promise<AmenityDto[]> {
    return apiClient.get<AmenityDto[]>('/organizer/amenities/available');
  },

  /**
   * Organizer create custom amenity
   */
  async createOrganizerAmenity(payload: CreateAmenityPayload): Promise<AmenityDto> {
    return apiClient.post<AmenityDto>('/organizer/amenities', payload);
  },

  /**
   * Organizer update custom amenity
   */
  async updateOrganizerAmenity(id: number, payload: UpdateAmenityPayload): Promise<AmenityDto> {
    return apiClient.put<AmenityDto>(`/organizer/amenities/${id}`, payload);
  },

  /**
   * Organizer toggle custom amenity status
   */
  async toggleOrganizerAmenityStatus(id: number, active: boolean): Promise<void> {
    return apiClient.patch<void>(`/organizer/amenities/${id}/status`, undefined, {
      params: { active }
    });
  },

  /**
   * Organizer delete custom amenity
   */
  async deleteOrganizerAmenity(id: number): Promise<void> {
    return apiClient.delete<void>(`/organizer/amenities/${id}`);
  },

  /**
   * Get all amenities assigned to a workspace
   */
  async getWorkspaceAmenities(workspaceId: number | string): Promise<WorkspaceAmenityDto[]> {
    return apiClient.get<WorkspaceAmenityDto[]>(`/workspaces/${workspaceId}/amenities`);
  },

  /**
   * Sync / bulk assign amenities to a workspace
   */
  async syncWorkspaceAmenities(
    workspaceId: number | string,
    payload: AssignWorkspaceAmenitiesPayload
  ): Promise<WorkspaceAmenityDto[]> {
    return apiClient.put<WorkspaceAmenityDto[]>(`/workspaces/${workspaceId}/amenities`, payload);
  },

  /**
   * Add a single amenity to workspace
   */
  async addAmenityToWorkspace(
    workspaceId: number | string,
    payload: AssignAmenityItemPayload
  ): Promise<WorkspaceAmenityDto> {
    return apiClient.post<WorkspaceAmenityDto>(`/workspaces/${workspaceId}/amenities`, payload);
  },

  /**
   * Remove an amenity from workspace
   */
  async removeAmenityFromWorkspace(
    workspaceId: number | string,
    amenityId: number | string
  ): Promise<void> {
    return apiClient.delete<void>(`/workspaces/${workspaceId}/amenities/${amenityId}`);
  }
};

