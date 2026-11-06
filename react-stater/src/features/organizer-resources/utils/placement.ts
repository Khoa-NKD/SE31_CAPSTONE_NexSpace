export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
export type PlacementFields = Record<'posX' | 'posY' | 'width' | 'height' | 'rotation', string>;
export function selectPlacementFields(value: PlacementFields): PlacementFields {
  return {
    posX: value.posX,
    posY: value.posY,
    width: value.width,
    height: value.height,
    rotation: value.rotation
  };
}

const radians = (angle: number) => (angle * Math.PI) / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;

/** Retain the child's room-local position and angle; resizing never scales the child. */
export function moveWithRoom(child: Placement, before: Placement, after: Placement): Placement {
  const oldAngle = radians(before.rotation),
    newAngle = radians(after.rotation);
  const dx = child.x + child.width / 2 - before.x - before.width / 2;
  const dy = child.y + child.height / 2 - before.y - before.height / 2;
  const localX =
    Math.cos(oldAngle) * dx + Math.sin(oldAngle) * dy + before.width / 2 - after.width / 2;
  const localY =
    -Math.sin(oldAngle) * dx + Math.cos(oldAngle) * dy + before.height / 2 - after.height / 2;
  return {
    ...child,
    x: round(
      after.x +
        after.width / 2 +
        Math.cos(newAngle) * localX -
        Math.sin(newAngle) * localY -
        child.width / 2
    ),
    y: round(
      after.y +
        after.height / 2 +
        Math.sin(newAngle) * localX +
        Math.cos(newAngle) * localY -
        child.height / 2
    ),
    rotation: round((((child.rotation + after.rotation - before.rotation) % 360) + 360) % 360) % 360
  };
}

export function placementsOverlap(a: Placement, b: Placement): boolean {
  const corners = (item: Placement) => {
    const angle = radians(item.rotation),
      cx = item.x + item.width / 2,
      cy = item.y + item.height / 2;
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1]
    ].map(([sx, sy]) => {
      const dx = (sx * item.width) / 2,
        dy = (sy * item.height) / 2;
      return [
        cx + Math.cos(angle) * dx - Math.sin(angle) * dy,
        cy + Math.sin(angle) * dx + Math.cos(angle) * dy
      ];
    });
  };
  const first = corners(a),
    second = corners(b);
  for (const polygon of [first, second])
    for (let i = 0; i < 2; i++) {
      const dx = polygon[i + 1][0] - polygon[i][0],
        dy = polygon[i + 1][1] - polygon[i][1];
      const length = Math.hypot(dx, dy);
      if (!length) return false;
      const project = (points: number[][]) => points.map(([x, y]) => (-dy * x + dx * y) / length);
      const left = project(first),
        right = project(second);
      if (
        Math.max(...left) <= Math.min(...right) + 0.000001 ||
        Math.max(...right) <= Math.min(...left) + 0.000001
      )
        return false;
    }
  return true;
}

function extent(width: number, height: number, angle: number) {
  return {
    x: (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height) / 2,
    y: (Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height) / 2
  };
}

/** Clamp a floor-absolute position, preserving the complete rotated rectangle in its bounds. */
export function constrainPlacement(
  item: Placement,
  canvas: { width: number; height: number },
  room?: Placement
): Placement | null {
  if (
    ![item.x, item.y, item.width, item.height, item.rotation, canvas.width, canvas.height].every(
      Number.isFinite
    ) ||
    item.width <= 0 ||
    item.height <= 0
  )
    return null;
  let cx = item.x + item.width / 2;
  let cy = item.y + item.height / 2;
  if (room) {
    const angle = radians(room.rotation);
    const half = extent(item.width, item.height, radians(item.rotation - room.rotation));
    const slackX = room.width / 2 - half.x;
    const slackY = room.height / 2 - half.y;
    if (slackX < -0.000001 || slackY < -0.000001) return null;
    const dx = cx - (room.x + room.width / 2);
    const dy = cy - (room.y + room.height / 2);
    // A small interior margin keeps two-decimal coordinates valid after rounding a rotated room.
    const limitX = Math.max(0, slackX - 0.02);
    const limitY = Math.max(0, slackY - 0.02);
    const localX = clamp(Math.cos(angle) * dx + Math.sin(angle) * dy, -limitX, limitX);
    const localY = clamp(-Math.sin(angle) * dx + Math.cos(angle) * dy, -limitY, limitY);
    cx = room.x + room.width / 2 + Math.cos(angle) * localX - Math.sin(angle) * localY;
    cy = room.y + room.height / 2 + Math.sin(angle) * localX + Math.cos(angle) * localY;
  }
  const half = extent(item.width, item.height, radians(item.rotation));
  if (half.x * 2 > canvas.width + 0.000001 || half.y * 2 > canvas.height + 0.000001) return null;
  const result = {
    ...item,
    x: round(clamp(cx, Math.max(half.x, item.width / 2), canvas.width - half.x) - item.width / 2),
    y: round(clamp(cy, Math.max(half.y, item.height / 2), canvas.height - half.y) - item.height / 2)
  };
  return placementFits(result, canvas, room) ? result : null;
}

/** Preview validation is advisory; server validation remains authoritative on save. */
export function placementFits(
  item: Placement,
  canvas: { width: number; height: number },
  room?: Placement
) {
  if (
    ![item.x, item.y, item.width, item.height, item.rotation, canvas.width, canvas.height].every(
      Number.isFinite
    )
  )
    return false;
  const half = extent(item.width, item.height, radians(item.rotation));
  const cx = item.x + item.width / 2,
    cy = item.y + item.height / 2;
  const epsilon = 0.000001;
  if (
    item.x < 0 ||
    item.y < 0 ||
    item.width <= 0 ||
    item.height <= 0 ||
    cx - half.x < -epsilon ||
    cy - half.y < -epsilon ||
    cx + half.x > canvas.width + epsilon ||
    cy + half.y > canvas.height + epsilon
  )
    return false;
  if (!room) return true;
  const angle = radians(room.rotation);
  const dx = cx - room.x - room.width / 2,
    dy = cy - room.y - room.height / 2;
  const localX = Math.cos(angle) * dx + Math.sin(angle) * dy;
  const localY = -Math.sin(angle) * dx + Math.cos(angle) * dy;
  const relative = extent(item.width, item.height, radians(item.rotation - room.rotation));
  return (
    Math.abs(localX) + relative.x <= room.width / 2 + epsilon &&
    Math.abs(localY) + relative.y <= room.height / 2 + epsilon
  );
}
