type Area = { x: number; y: number; width: number; height: number };
type PhysicalArea = {
  width: number;
  height: number;
  occupants: Array<Area & { floorPlanId: number; workspaceId: number }>;
};
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
