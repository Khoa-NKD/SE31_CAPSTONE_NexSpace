import type { FloorDecoration } from '../api/resources';
import type { Placement } from './placement';

export interface DoorBoundary {
  side: 'top' | 'bottom' | 'left' | 'right';
  start: number;
  end: number;
}

/** Only a thin DOOR parallel to, and centered across, one wall may straddle a room boundary. */
export function doorRoomBoundary(
  door: Pick<FloorDecoration, 'icon'>,
  pose: Placement,
  room: Placement
): DoorBoundary | undefined {
  if (
    door.icon !== 'DOOR' ||
    ![
      pose.x,
      pose.y,
      pose.width,
      pose.height,
      pose.rotation,
      room.x,
      room.y,
      room.width,
      room.height,
      room.rotation
    ].every(Number.isFinite)
  )
    return;
  if (pose.width <= 0 || pose.height <= 0) return;
  const relative = ((pose.rotation - room.rotation) * Math.PI) / 180;
  if (Math.min(Math.abs(Math.sin(relative)), Math.abs(Math.cos(relative))) > 0.0001) return;
  const angle = (room.rotation * Math.PI) / 180;
  const dx = pose.x + pose.width / 2 - room.x - room.width / 2,
    dy = pose.y + pose.height / 2 - room.y - room.height / 2;
  const x = Math.cos(angle) * dx + Math.sin(angle) * dy + room.width / 2;
  const y = -Math.sin(angle) * dx + Math.cos(angle) * dy + room.height / 2;
  const w = Math.abs(Math.cos(relative)) * pose.width + Math.abs(Math.sin(relative)) * pose.height;
  const h = Math.abs(Math.sin(relative)) * pose.width + Math.abs(Math.cos(relative)) * pose.height;
  const epsilon = 0.02;
  if (h <= w / 3 && x - w / 2 >= epsilon && x + w / 2 <= room.width - epsilon) {
    if (Math.abs(y) <= h / 2 + epsilon) return { side: 'top', start: x - w / 2, end: x + w / 2 };
    if (Math.abs(y - room.height) <= h / 2 + epsilon)
      return { side: 'bottom', start: x - w / 2, end: x + w / 2 };
  }
  if (w <= h / 3 && y - h / 2 >= epsilon && y + h / 2 <= room.height - epsilon) {
    if (Math.abs(x) <= w / 2 + epsilon) return { side: 'left', start: y - h / 2, end: y + h / 2 };
    if (Math.abs(x - room.width) <= w / 2 + epsilon)
      return { side: 'right', start: y - h / 2, end: y + h / 2 };
  }
}

export function decorationBelongsToRoom(
  item: FloorDecoration,
  room: Placement,
  contained: (pose: Placement, room: Placement) => boolean
) {
  const pose = {
    x: item.posX,
    y: item.posY,
    width: item.width,
    height: item.height,
    rotation: item.rotation
  };
  return contained(pose, room) || !!doorRoomBoundary(item, pose, room);
}

/** Segments are room-local; openings are shared by the 2D wall lines and 3D wall mesh. */
export function roomWallSegments(room: Placement, decorations: readonly FloorDecoration[]) {
  const openings = decorations.flatMap((item) => {
    const boundary = doorRoomBoundary(
      item,
      {
        x: item.posX,
        y: item.posY,
        width: item.width,
        height: item.height,
        rotation: item.rotation
      },
      room
    );
    return boundary ? [boundary] : [];
  });
  const segments: Array<DoorBoundary & { opening: boolean }> = [];
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    const length = side === 'top' || side === 'bottom' ? room.width : room.height;
    let cursor = 0;
    for (const opening of openings
      .filter((slot) => slot.side === side)
      // oxlint-disable-next-line unicorn/no-array-sort -- filter creates a fresh array; source data remains unchanged.
      .sort((a, b) => a.start - b.start)) {
      if (opening.start > cursor)
        segments.push({ side, start: cursor, end: opening.start, opening: false });
      if (opening.end > cursor)
        segments.push({
          side,
          start: Math.max(cursor, opening.start),
          end: opening.end,
          opening: true
        });
      cursor = Math.max(cursor, opening.end);
    }
    if (cursor < length) segments.push({ side, start: cursor, end: length, opening: false });
  }
  return segments;
}
