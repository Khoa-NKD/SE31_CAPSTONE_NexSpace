import type { FloorLayout } from '../api/resources';
import { layoutGeometry, previewLayout } from './layout-placement.ts';
/** Reuse the manual editor's rotated-footprint rules, including legal room containment. */
export function aiPreviewGeometry(layout: FloorLayout) {
  const resource = layout.resources.find((item) => layoutGeometry(item));
  const object = !resource ? layout.decorations?.find((item) => layoutGeometry(item)) : undefined;
  const shape = resource ? layoutGeometry(resource) : object ? layoutGeometry(object) : undefined;
  if (!shape)
    return { valid: true, fits: true, collisions: new Set<string>(), collisionKeys: new Set<string>() };
  return previewLayout(
    layout,
    shape,
    resource
      ? {
          resourceId: resource.id,
          parentRoomId: resource.parentRoomId ?? undefined,
          category: resource.category
        }
      : { decoration: object }
  );
}
