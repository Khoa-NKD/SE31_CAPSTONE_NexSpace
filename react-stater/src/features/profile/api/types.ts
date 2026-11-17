import type { UserDto, UserGender } from '@/features/auth/api/types';

export type { UserDto, UserGender };

export interface UpdateProfileRequest {
  firstName: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  gender?: UserGender;
  avatar?: string;
}

export interface UpdateAvatarUrlRequest {
  avatarUrl: string;
  avatar?: string;
}

