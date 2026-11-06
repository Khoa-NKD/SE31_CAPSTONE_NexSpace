/** Floors above ground start at one; basement and ground-floor numbers remain selectable. */
export function nextFloorNumber(floors: ReadonlyArray<{ floorNumber: number }>): number | null {
  const next = Math.max(0, ...floors.map((floor) => floor.floorNumber)) + 1;
  return next <= 500 ? next : null;
}

export function isDuplicateFloorNumber(
  floors: ReadonlyArray<{ floorNumber: number }>,
  value: string
): boolean {
  return /^-?\d+$/.test(value) && floors.some((floor) => floor.floorNumber === Number(value));
}
