import type { FloorLayout, AvailabilityState } from '../api/resources';
import type { MaintenanceSchedule } from '../../organizer-blockout/api';

/** The maintenance API uses local date-time values, unlike the floor calendar's UTC interval. */
export function maintenanceLocalTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}

export function maintainedResourceIds(schedules: MaintenanceSchedule[]) {
  return new Set(
    schedules
      .filter((s) => s.targetKey.startsWith('RESOURCE:'))
      .map((s) => Number(s.targetKey.slice('RESOURCE:'.length)))
      .filter(Number.isSafeInteger)
  );
}

/** Merge the schedule overlay without changing manual activation or booking state in storage. */
export function maintenanceAvailability(
  layout: FloorLayout | undefined,
  base: Record<number, AvailabilityState>,
  schedules: MaintenanceSchedule[]
) {
  const states = { ...base };
  const maintained = maintainedResourceIds(schedules);
  // Resolve parent maintenance before children, regardless of API ordering.
  for (const item of layout?.resources ?? []) {
    if (states[item.id] === 'MAINTENANCE') maintained.add(item.id);
  }
  for (const item of layout?.resources ?? []) {
    if (
      maintained.has(item.id) ||
      (item.parentRoomId != null && maintained.has(item.parentRoomId))
    ) {
      states[item.id] = 'MAINTENANCE';
    }
  }
  for (const item of layout?.resources ?? []) {
    if (item.category !== 'DESK' || item.parentRoomId == null || states[item.id] === 'MAINTENANCE')
      continue;
    const parent = states[item.parentRoomId];
    if (parent && (parent !== 'AVAILABLE' || states[item.id] == null)) states[item.id] = parent;
  }
  const decorations: Record<string, AvailabilityState> = {};
  const prefix = 'DECORATION:' + layout?.floor.id + ':';
  for (const schedule of schedules)
    if (schedule.targetKey.startsWith(prefix)) {
      decorations[schedule.targetKey.slice(prefix.length)] = 'MAINTENANCE';
    }
  const rooms = (layout?.resources ?? []).filter((r) => r.category === 'ROOM');
  for (const item of layout?.decorations ?? []) {
    // Use the same center containment and rotated coordinates as the maintenance catalog.
    const containing = rooms
      .filter((room) => {
        if (room.posX == null || room.posY == null || room.width == null || room.height == null)
          return false;
        const dx = item.posX + item.width / 2 - room.posX - room.width / 2;
        const dy = item.posY + item.height / 2 - room.posY - room.height / 2;
        const a = ((room.rotation ?? 0) * Math.PI) / 180;
        return (
          Math.abs(dx * Math.cos(a) + dy * Math.sin(a)) <= room.width / 2 + 0.01 &&
          Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) <= room.height / 2 + 0.01
        );
      })
      .sort((a, b) => (a.width ?? 0) * (a.height ?? 0) - (b.width ?? 0) * (b.height ?? 0))[0];
    if (containing && states[containing.id] === 'MAINTENANCE') decorations[item.id] = 'MAINTENANCE';
  }
  return { states, decorations };
}
