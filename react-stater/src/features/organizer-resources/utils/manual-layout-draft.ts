import type { FloorLayout, FloorDecoration } from '../api/resources';
import { insideRoom, layoutGeometry } from './layout-placement.ts';
import { moveWithRoom, type PlacementFields } from './placement.ts';

/** Stage edits against the current scene, carrying room contents exactly once per movement. */
export function stageLayoutObject(
  layout: FloorLayout,
  key: string,
  fields: PlacementFields,
  object?: FloorDecoration
): FloorLayout {
  const pose = {
    x: Number(fields.posX),
    y: Number(fields.posY),
    width: Number(fields.width),
    height: Number(fields.height),
    rotation: Number(fields.rotation || 0)
  };
  const position = {
    posX: pose.x,
    posY: pose.y,
    width: pose.width,
    height: pose.height,
    rotation: pose.rotation
  };
  if (key.startsWith('decoration:'))
    return {
      ...layout,
      decorations: (layout.decorations ?? []).map((item) =>
        `decoration:${item.id}` === key ? { ...item, ...object, ...position } : item
      )
    };
  const resource = layout.resources.find((item) => `resource:${item.id}` === key);
  const before = resource && layoutGeometry(resource);
  if (!resource || !before) return layout;
  const movingRoom = resource.category === 'ROOM';
  const move = (
    item: NonNullable<FloorLayout['decorations']>[number] | FloorLayout['resources'][number]
  ) => {
    const original = layoutGeometry(item);
    if (!original) return item;
    const next = moveWithRoom(original, before, pose);
    return { ...item, posX: next.x, posY: next.y, rotation: next.rotation };
  };
  return {
    ...layout,
    resources: layout.resources.map((item) =>
      item.id === resource.id
        ? { ...item, ...position }
        : movingRoom && item.parentRoomId === resource.id
          ? (move(item) as typeof item)
          : item
    ),
    decorations: (layout.decorations ?? []).map((item) =>
      movingRoom && insideRoom(layoutGeometry(item)!, before)
        ? (move(item) as FloorDecoration)
        : item
    )
  };
}

export function changedLayoutResources(base: FloorLayout, draft: FloorLayout) {
  return draft.resources.filter((item) => {
    const before = base.resources.find((original) => original.id === item.id);
    return (
      before &&
      ['posX', 'posY', 'width', 'height', 'rotation'].some(
        (field) => before[field as keyof typeof before] !== item[field as keyof typeof item]
      )
    );
  });
}
