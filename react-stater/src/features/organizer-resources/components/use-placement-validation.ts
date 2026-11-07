import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  floorLayoutOptions,
  type Category,
  type FloorDecoration,
  type FloorLayout
} from '../api/resources';
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
  },
  draftLayout?: FloorLayout
) {
  const actorId = useAuthStore((state) => state.user?.id ?? 0);
  const query = useQuery({
    ...floorLayoutOptions(actorId, workspaceId, floorId),
    enabled: actorId > 0 && floorId > 0
  });
  const complete = [fields.posX, fields.posY, fields.width, fields.height].every(
    (value) => value.trim() !== ''
  );
  const layout = draftLayout ?? query.data;
  const result =
    complete && layout
      ? previewLayout(
          layout,
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
    blocked: complete && (!layout || query.isError || !layout.editableLayout || !result?.valid),
    result
  };
}
