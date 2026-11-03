import { apiClient } from '@/lib/api-client';
import type {
  AmenityDto,
  CreateAmenityPayload,
  UpdateAmenityPayload,
  AmenityFilterParams,
  AmenityPageResponse
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
  }
};
