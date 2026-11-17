import { apiClient } from '@/lib/api-client';
import type { CustomerPreferenceDto, UpdateCustomerPreferencePayload } from './types';

export const customerPreferenceService = {
  /**
   * Lấy cấu hình sở thích không gian của khách hàng hiện tại (GET /api/customer-preferences/me)
   */
  async getMyPreferences(): Promise<CustomerPreferenceDto> {
    return apiClient.get<CustomerPreferenceDto>('/customer-preferences/me');
  },

  /**
   * Thiết lập sở thích lần đầu (POST /api/customer-preferences/me)
   */
  async createMyPreferences(
    payload: UpdateCustomerPreferencePayload
  ): Promise<CustomerPreferenceDto> {
    return apiClient.post<CustomerPreferenceDto>('/customer-preferences/me', payload);
  },

  /**
   * Cập nhật sở thích không gian (PUT /api/customer-preferences/me)
   */
  async updateMyPreferences(
    payload: UpdateCustomerPreferencePayload
  ): Promise<CustomerPreferenceDto> {
    return apiClient.put<CustomerPreferenceDto>('/customer-preferences/me', payload);
  },

  /**
   * Xóa / đặt lại cấu hình sở thích (DELETE /api/customer-preferences/me)
   */
  async deleteMyPreferences(): Promise<void> {
    return apiClient.delete<void>('/customer-preferences/me');
  }
};

