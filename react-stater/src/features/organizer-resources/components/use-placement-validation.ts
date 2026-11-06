import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { floorLayoutOptions, type Category, type FloorDecoration } from '../api/resources';
import { previewLayout } from '../utils/layout-placement';
import type { PlacementFields } from '../utils/placement';

export function usePlacementValidation(
  workspaceId: number,
  floorId: number,
  fields: PlacementFields,
  candidate: {
    resourceId?: number;
    parentRoomId?: number;
    category?: Category;
    decoration?: FloorDecoration;
  }
) {
  const actorId = useAuthStore((state) => state.user?.id ?? 0);
  const query = useQuery({
    ...floorLayoutOptions(actorId, workspaceId, floorId),
    enabled: actorId > 0 && floorId > 0
  });
  const complete = [fields.posX, fields.posY, fields.width, fields.height].every(
    (value) => value.trim() !== ''
  );
  const result =
    complete && query.data
      ? previewLayout(
          query.data,
          {
            x: Number(fields.posX),
            y: Number(fields.posY),
            width: Number(fields.width),
            height: Number(fields.height),
            rotation: Number(fields.rotation || 0)
          },
          candidate
        )
      : undefined;
  return {
    blocked:
      complete && (!query.data || query.isError || !query.data.editableLayout || !result?.valid),
    result
  };
}
