import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { amenityService } from './service';
import { amenityQueries } from './queries';
import type { CreateAmenityPayload, UpdateAmenityPayload, AssignWorkspaceAmenitiesPayload } from './types';

export function useCreateAmenityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAmenityPayload) =>
      amenityService.createAmenity(payload),
    onSuccess: (data) => {
      toast.success('Amenity created successfully', {
        description: `Amenity "${data.name}" has been added to the catalog.`
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error('Failed to create amenity', {
        description: error.message || 'An error occurred while creating the amenity.'
      });
    }
  });
}

export function useUpdateAmenityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAmenityPayload }) =>
      amenityService.updateAmenity(id, payload),
    onSuccess: (data) => {
      toast.success('Amenity updated successfully', {
        description: `Amenity "${data.name}" has been updated.`
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error('Failed to update amenity', {
        description: error.message || 'Unable to update the amenity.'
      });
    }
  });
}

export function useToggleAmenityStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      amenityService.toggleAmenityStatus(id, active),
    onSuccess: (_, variables) => {
      const msg = variables.active ? 'Amenity activated' : 'Amenity deactivated';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error('Failed to update status', {
        description: error.message || 'Unable to change amenity status.'
      });
    }
  });
}

export function useDeleteAmenityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => amenityService.deleteAmenity(id),
    onSuccess: () => {
      toast.success('Amenity deleted successfully', {
        description: 'The amenity has been removed from the platform catalog.'
      });
      queryClient.invalidateQueries({ queryKey: amenityQueries.all });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete amenity', {
        description: error.message || 'Unable to delete the amenity.'
      });
    }
  });
}

export function useSyncWorkspaceAmenitiesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      payload
    }: {
      workspaceId: number | string;
      payload: AssignWorkspaceAmenitiesPayload;
    }) => amenityService.syncWorkspaceAmenities(workspaceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...amenityQueries.all, 'workspace', String(variables.workspaceId)]
      });
    }
  });
}

