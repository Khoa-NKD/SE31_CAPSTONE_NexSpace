import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userProfileService } from './service';
import { profileKeys } from './queries';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { UpdateProfileRequest } from './types';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => userProfileService.updateProfile(payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      setUser(updatedUser);
    }
  });
}

export function useUploadAvatarFileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (file: File) => userProfileService.uploadAvatarFile(file),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      setUser(updatedUser);
    }
  });
}

export function useUpdateAvatarUrlMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (avatarUrl: string) => userProfileService.updateAvatarUrl(avatarUrl),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      setUser(updatedUser);
    }
  });
}

export function useDeleteAvatarMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: () => userProfileService.deleteAvatar(),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      setUser(updatedUser);
    }
  });
}

