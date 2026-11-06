import type { Category, FloorDecoration, FloorLayout } from '../api/resources';
import { moveWithRoom, placementFits, placementsOverlap, type Placement } from './placement.ts';

export function layoutGeometry(value: {
  posX: number | null;
  posY: number | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
}): Placement | undefined {
  if (value.posX == null || value.posY == null || !value.width || !value.height) return;
  return {
    x: value.posX,
    y: value.posY,
    width: value.width,
    height: value.height,
    rotation: value.rotation ?? 0
  };
}

/** Spatial containment does not establish a booking parent for furniture. */
export function insideRoom(item: Placement, room: Placement): boolean {
  return placementFits(
    item,
    { width: Number.MAX_SAFE_INTEGER, height: Number.MAX_SAFE_INTEGER },
    room
  );
}

export function previewLayout(
  layout: FloorLayout,
  item: Placement,
  candidate: {
    resourceId?: number;
    parentRoomId?: number;
    category?: Category;
    decoration?: FloorDecoration;
  }
) {
  const old = layout.resources.find((resource) => resource.id === candidate.resourceId);
  const before = old && layoutGeometry(old);
  const movingRoom = candidate.category === 'ROOM' && before;
  const decorations = (layout.decorations ?? [])
    .filter((object) => object.id !== candidate.decoration?.id)
    .map((object) => {
      const shape = layoutGeometry(object)!;
      if (!movingRoom || !insideRoom(shape, before)) return object;
      const moved = moveWithRoom(shape, before, item);
      return { ...object, posX: moved.x, posY: moved.y, rotation: moved.rotation };
    });
  if (candidate.decoration)
    decorations.push({
      ...candidate.decoration,
      posX: item.x,
      posY: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation
    });
  const resources = layout.resources
    .filter((resource) => resource.id !== candidate.resourceId)
    .map((resource) => {
      const shape = layoutGeometry(resource);
      return {
        key: `resource-${resource.id}`,
        id: resource.id,
        parentId: resource.parentRoomId,
        room: resource.category === 'ROOM',
        decoration: false,
        label: resource.code,
        shape:
          movingRoom && resource.parentRoomId === candidate.resourceId && shape
            ? moveWithRoom(shape, before, item)
            : shape
      };
    });
  if (!candidate.decoration)
    resources.push({
      key: 'candidate',
      id: candidate.resourceId ?? -1,
      parentId: candidate.parentRoomId ?? null,
      room: candidate.category === 'ROOM',
      decoration: false,
      label: old?.code ?? 'New',
      shape: item
    });
  const shapes = [
    ...resources,
    ...decorations.map((object) => ({
      key: object.id,
      id: -2,
      parentId: null,
      room: false,
      decoration: true,
      label: object.label,
      shape: layoutGeometry(object)
    }))
  ];
  const collisions = new Set<string>();
  let fits = true;
  for (let i = 0; i < shapes.length; i++) {
    const a = shapes[i];
    if (!a.shape) continue;
    if (!placementFits(a.shape, { width: layout.width ?? 1200, height: layout.height ?? 800 }))
      fits = false;
    const parent =
      !a.decoration && a.parentId
        ? resources.find((resource) => resource.id === a.parentId)?.shape
        : undefined;
    if (parent && !insideRoom(a.shape, parent)) fits = false;
    // Furniture already inside a room must remain there after a group resize.
    if (movingRoom && a.decoration) {
      const original = layout.decorations?.find((object) => object.id === a.key);
      if (original && insideRoom(layoutGeometry(original)!, before) && !insideRoom(a.shape, item))
        fits = false;
    }
    for (let j = i + 1; j < shapes.length; j++) {
      const b = shapes[j];
      if (!b.shape || !placementsOverlap(a.shape, b.shape)) continue;
      const allowed =
        (a.room && (b.decoration || b.parentId === a.id) && insideRoom(b.shape, a.shape)) ||
        (b.room && (a.decoration || a.parentId === b.id) && insideRoom(a.shape, b.shape));
      if (!allowed) {
        collisions.add(a.label);
        collisions.add(b.label);
      }
    }
  }
  return { fits, collisions, decorations, valid: fits && collisions.size === 0 };
}
