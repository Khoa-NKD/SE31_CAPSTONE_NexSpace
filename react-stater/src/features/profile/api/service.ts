import { apiClient } from '@/lib/api-client';
import type { UserDto, UpdateProfileRequest, UpdateAvatarUrlRequest } from './types';

export const userProfileService = {
  /**
   * Lấy toàn bộ thông tin hồ sơ của tài khoản đang đăng nhập từ JWT.
   * Endpoint: GET /api/users/me
   */
  getMyProfile: async (): Promise<UserDto> => {
    return apiClient.get<UserDto>('/users/me');
  },

  /**
   * Cập nhật thông tin hồ sơ cá nhân (JSON).
   * Endpoint: PUT /api/users/me
   */
  updateProfile: async (payload: UpdateProfileRequest): Promise<UserDto> => {
    return apiClient.put<UserDto>('/users/me', payload);
  },

  /**
   * Cập nhật ảnh đại diện bằng cách upload file ảnh từ máy tính.
   * Endpoint: PUT /api/users/me/avatar (multipart/form-data)
   */
  uploadAvatarFile: async (file: File): Promise<UserDto> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.put<UserDto>('/users/me/avatar', formData);
  },

  /**
   * Cập nhật ảnh đại diện bằng đường dẫn mạng (JSON).
   * Endpoint: PUT /api/users/me/avatar (application/json)
   */
  updateAvatarUrl: async (avatarUrl: string): Promise<UserDto> => {
    const payload: UpdateAvatarUrlRequest = { avatarUrl };
    return apiClient.put<UserDto>('/users/me/avatar', payload);
  },

  /**
   * Xóa ảnh đại diện hiện tại và đưa về trạng thái mặc định.
   * Endpoint: DELETE /api/users/me/avatar
   */
  deleteAvatar: async (): Promise<UserDto> => {
    return apiClient.delete<UserDto>('/users/me/avatar');
  }
};

export default userProfileService;

