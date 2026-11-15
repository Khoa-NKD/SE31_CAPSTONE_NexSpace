import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userProfileService } from './service';
import { profileKeys } from './queries';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { UpdateProfileRequest, UserDto } from './types';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => userProfileService.updateProfile(payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: profileKeys.me(), refetchType: 'none' });
      setUser(updatedUser);
    }
  });
}

export type UploadAvatarInput = File | { file: File; previewUrl?: string };

export function useUploadAvatarFileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (input: UploadAvatarInput) => {
      const file = input instanceof File ? input : input.file;
      return userProfileService.uploadAvatarFile(file);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.me() });
      const previousUser =
        queryClient.getQueryData<UserDto>(profileKeys.me()) ||
        useAuthStore.getState().user;

      const previewUrl = input instanceof File ? undefined : input.previewUrl;
      if (previousUser && previewUrl) {
        const optimisticUser: UserDto = {
          ...previousUser,
          avatar: previewUrl,
          avatarUrl: previewUrl
        };
        queryClient.setQueryData(profileKeys.me(), optimisticUser);
        setUser(optimisticUser);
      }

      return { previousUser };
    },
    onError: (_err, _input, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(profileKeys.me(), context.previousUser);
        setUser(context.previousUser);
      }
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: profileKeys.me(), refetchType: 'none' });
      setUser(updatedUser);
    }
  });
}

export function useUpdateAvatarUrlMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (avatarUrl: string) => userProfileService.updateAvatarUrl(avatarUrl),
    onMutate: async (avatarUrl) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.me() });
      const previousUser =
        queryClient.getQueryData<UserDto>(profileKeys.me()) ||
        useAuthStore.getState().user;

      if (previousUser && avatarUrl) {
        const optimisticUser: UserDto = {
          ...previousUser,
          avatar: avatarUrl,
          avatarUrl
        };
        queryClient.setQueryData(profileKeys.me(), optimisticUser);
        setUser(optimisticUser);
      }

      return { previousUser };
    },
    onError: (_err, _avatarUrl, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(profileKeys.me(), context.previousUser);
        setUser(context.previousUser);
      }
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: profileKeys.me(), refetchType: 'none' });
      setUser(updatedUser);
    }
  });
}

export function useDeleteAvatarMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: () => userProfileService.deleteAvatar(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: profileKeys.me() });
      const previousUser =
        queryClient.getQueryData<UserDto>(profileKeys.me()) ||
        useAuthStore.getState().user;

      if (previousUser) {
        const optimisticUser: UserDto = {
          ...previousUser,
          avatar: null,
          avatarUrl: null
        };
        queryClient.setQueryData(profileKeys.me(), optimisticUser);
        setUser(optimisticUser);
      }

      return { previousUser };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(profileKeys.me(), context.previousUser);
        setUser(context.previousUser);
      }
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.invalidateQueries({ queryKey: profileKeys.me(), refetchType: 'none' });
      setUser(updatedUser);
    }
  });
}
