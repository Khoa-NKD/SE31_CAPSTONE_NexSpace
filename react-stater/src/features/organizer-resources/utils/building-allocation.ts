type Area = { x: number; y: number; width: number; height: number };
type PhysicalArea = {
  width: number;
  height: number;
  occupants: Array<Area & { floorPlanId: number; workspaceId: number }>;
};

/** Find a free rectangle using the vertical edges of existing allocations. */
export function suggestAllocation(floor: PhysicalArea): Area {
  const right = new Set([0, floor.width]);
  for (const area of floor.occupants) {
    right.add(Math.floor(area.x));
    right.add(Math.ceil(area.x + area.width));
  }
  // oxlint-disable-next-line unicorn/no-array-sort
  const edges = [...right].sort((a, b) => a - b);
  const full = { x: 0, y: 0, width: floor.width, height: floor.height };
  let best: Area | undefined;
  for (let i = 1; i < edges.length; i++) {
    const x = edges[i - 1];
    const width = edges[i] - x;
    if (width < 1) continue;
    const blocked = floor.occupants.filter((area) => area.x < x + width && area.x + area.width > x);
    // oxlint-disable-next-line unicorn/no-array-sort
    blocked.sort((a, b) => a.y - b.y);
    let y = 0;
    for (const area of [...blocked, { y: floor.height, height: 0 }]) {
      const height = Math.floor(area.y) - y;
      if (height >= 1 && (!best || width * height > best.width * best.height))
        best = { x, y, width, height };
      y = Math.max(y, Math.ceil(area.y + area.height));
    }
  }
  return best ?? full;
}
/** Edge contact is allowed. A workspace area cannot overlap another allocation. */
export function allocationError(
  area: Area,
  floor: PhysicalArea,
  workspaceId: number,
  currentLayoutId?: number
): 'bounds' | 'duplicate' | 'overlap' | null {
  if (
    ![area.x, area.y, area.width, area.height].every(Number.isFinite) ||
    area.x < 0 ||
    area.y < 0 ||
    area.width < 1 ||
    area.height < 1 ||
    area.x + area.width > floor.width ||
    area.y + area.height > floor.height
  )
    return 'bounds';
  const others = floor.occupants.filter((o) => o.floorPlanId !== currentLayoutId);
  if (others.some((o) => o.workspaceId === workspaceId)) return 'duplicate';
  return others.some(
    (o) =>
      area.x < o.x + o.width &&
      area.x + area.width > o.x &&
      area.y < o.y + o.height &&
      area.y + area.height > o.y
  )
    ? 'overlap'
    : null;
}
