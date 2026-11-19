import type { FloorLayout } from '../api/resources';
import { insideRoom, layoutGeometry, withSpatialParents } from './layout-placement.ts';
import { floorCornerRadius } from './floor-outline.ts';
import { placementFits, placementsOverlap, type Placement } from './placement.ts';
import { copyDisplayName, copyResourceCode } from './copy-names.ts';
import { decorationBelongsToRoom } from './room-door.ts';

export function selectableShapes(layout: FloorLayout) {
  return [
    ...layout.resources
      .filter((item) => item.status !== 'ARCHIVED')
      .map((item) => ({
        key: `resource:${item.id}`,
        shape: layoutGeometry(item),
        room: item.category === 'ROOM'
      })),
    ...(layout.decorations ?? []).map((item) => ({
      key: `decoration:${item.id}`,
      shape: layoutGeometry(item),
      room: false
    }))
  ].filter((item): item is { key: string; shape: Placement; room: boolean } => !!item.shape);
}

export function selectionBounds(shape: Placement) {
  const angle = (shape.rotation * Math.PI) / 180;
  const width = Math.abs(Math.cos(angle)) * shape.width + Math.abs(Math.sin(angle)) * shape.height;
  const height = Math.abs(Math.sin(angle)) * shape.width + Math.abs(Math.cos(angle)) * shape.height;
  return {
    x: shape.x + (shape.width - width) / 2,
    y: shape.y + (shape.height - height) / 2,
    width,
    height
  };
}

/** A room and its actual contents translate once, even when both are explicitly selected. */
export function expandCanvasSelection(layout: FloorLayout, keys: readonly string[]) {
  const shapes = selectableShapes(layout);
  const available = new Set(shapes.map((item) => item.key));
  const selected = new Set(keys.filter((key) => available.has(key)));
  const rooms = shapes.filter((item) => item.room && selected.has(item.key));
  for (const item of shapes)
    if (
      !item.room &&
      rooms.some((room) => {
        const decoration = layout.decorations?.find(
          (object) => `decoration:${object.id}` === item.key
        );
        return decoration
          ? decorationBelongsToRoom(decoration, room.shape, insideRoom)
          : insideRoom(item.shape, room.shape);
      })
    )
      selected.add(item.key);
  return [...selected];
}

export function translateCanvasSelection(
  layout: FloorLayout,
  keys: readonly string[],
  dx: number,
  dy: number
): FloorLayout | null {
  const selected = new Set(expandCanvasSelection(layout, keys));
  const canvas = {
    width: layout.width ?? 1200,
    height: layout.height ?? 800,
    cornerRadius: floorCornerRadius(
      layout.floor.location,
      layout.width ?? 1200,
      layout.height ?? 800
    )
  };
  const round = (value: number) => Math.round(value * 100) / 100;
  for (const item of selectableShapes(layout))
    if (
      selected.has(item.key) &&
      !placementFits(
        { ...item.shape, x: round(item.shape.x + dx), y: round(item.shape.y + dy) },
        canvas
      )
    )
      return null;
  return withSpatialParents({
    ...layout,
    resources: layout.resources.map((item) =>
      selected.has(`resource:${item.id}`) && item.posX != null && item.posY != null
        ? { ...item, posX: round(item.posX + dx), posY: round(item.posY + dy) }
        : item
    ),
    decorations: (layout.decorations ?? []).map((item) =>
      selected.has(`decoration:${item.id}`)
        ? { ...item, posX: round(item.posX + dx), posY: round(item.posY + dy) }
        : item
    )
  });
}

export type CanvasClipboard = { scene: FloorLayout; keys: string[]; includeContents?: boolean };

/** Copies preserve relative geometry and remap copied parent IDs; external parents remain spatial. */
export function pasteCanvasSelection(
  destination: FloorLayout,
  clipboard: CanvasClipboard,
  language: 'en' | 'vi'
) {
  if (destination.floor.id !== clipboard.scene.floor.id)
    throw new Error(
      language === 'vi' ? 'Chỉ dán trong cùng tầng.' : 'Paste within the same floor.'
    );
  const keys = new Set(
    clipboard.includeContents === false
      ? clipboard.keys
      : expandCanvasSelection(clipboard.scene, clipboard.keys)
  );
  const resources = clipboard.scene.resources.filter((item) => keys.has(`resource:${item.id}`));
  const decorations = (clipboard.scene.decorations ?? []).filter((item) =>
    keys.has(`decoration:${item.id}`)
  );
  if (!resources.length && !decorations.length) return null;
  if (
    destination.resources.filter((item) => item.id < 0).length + resources.length > 100 ||
    (destination.decorations?.length ?? 0) + decorations.length > 500
  )
    throw new Error(
      language === 'vi'
        ? 'Lưu bớt thay đổi trước khi thêm bản sao.'
        : 'Save changes before adding more copies.'
    );
  const selected = selectableShapes(clipboard.scene).filter((item) => keys.has(item.key));
  const bounds = selected.map((item) => selectionBounds(item.shape));
  const width =
    Math.max(...bounds.map((box) => box.x + box.width)) - Math.min(...bounds.map((box) => box.x));
  const height =
    Math.max(...bounds.map((box) => box.y + box.height)) - Math.min(...bounds.map((box) => box.y));
  const existing = selectableShapes(destination);
  const canvas = {
    width: destination.width ?? 1200,
    height: destination.height ?? 800,
    cornerRadius: floorCornerRadius(
      destination.floor.location,
      destination.width ?? 1200,
      destination.height ?? 800
    )
  };
  const gap = destination.geometryVersion === 2 ? 6 : 10;
  const offsets = [
    [width + gap, 0],
    [0, height + gap],
    [-width - gap, 0],
    [0, -height - gap],
    [width + gap, height + gap],
    [-width - gap, height + gap],
    [width + gap, -height - gap],
    [-width - gap, -height - gap]
  ];
  const offset = offsets.find(([dx, dy]) =>
    selected.every((item) => {
      const moved = { ...item.shape, x: item.shape.x + dx, y: item.shape.y + dy };
      return (
        placementFits(moved, canvas) &&
        existing.every(
          (other) =>
            !placementsOverlap(moved, other.shape) ||
            (!item.room && other.room && insideRoom(moved, other.shape))
        )
      );
    })
  );
  if (!offset)
    throw new Error(
      language === 'vi'
        ? 'Chưa có chỗ trống vừa cả nhóm. Di chuyển nhóm gốc hoặc chọn ít đối tượng hơn.'
        : 'No free position fits the entire group. Move the source or select fewer objects.'
    );
  const [dx, dy] = offset;
  let nextId = Math.min(0, ...destination.resources.map((item) => item.id)) - 1;
  const idMap = new Map(resources.map((item) => [item.id, nextId--]));
  const codes = destination.resources.map((item) => item.code);
  const names = destination.resources.map((item) => item.name);
  const objectNames = (destination.decorations ?? []).map((item) => item.label);
  const copies = resources.map((item) => {
    const code = copyResourceCode(item.code, codes),
      name = copyDisplayName(item.name, names, language);
    codes.push(code);
    names.push(name);
    return {
      ...item,
      id: idMap.get(item.id)!,
      name,
      code,
      posX: Number(((item.posX ?? 0) + dx).toFixed(2)),
      posY: Number(((item.posY ?? 0) + dy).toFixed(2)),
      parentRoomId: idMap.get(item.parentRoomId ?? 0) ?? item.parentRoomId,
      status: 'DRAFT' as const,
      revision: 'draft'
    };
  });
  const objects = decorations.map((item) => {
    const label = copyDisplayName(item.label, objectNames, language);
    objectNames.push(label);
    return {
      ...item,
      id: `decor-${crypto.randomUUID()}`,
      label,
      posX: Number((item.posX + dx).toFixed(2)),
      posY: Number((item.posY + dy).toFixed(2))
    };
  });
  return {
    layout: withSpatialParents({
      ...destination,
      resources: [...destination.resources, ...copies],
      decorations: [...(destination.decorations ?? []), ...objects]
    }),
    resources: copies,
    decorations: objects,
    sources: new Map(copies.map((item, index) => [item.id, resources[index].id]))
  };
}
